// Web Audio engine: note → frequency math and tone playback.
// Kept generic (sequences, chords) so future ear trainers can reuse it.

import { NOTE_INDEX, type Note } from './theory';
import clickWorkletUrl from './metronome/click.worklet.ts?worker&url';
import { createDisplayClock } from './metronome/display';
import type { BeatMessage, ClickCommand, ClickOptions } from './metronome/clickProtocol';
import type { Meter } from './metronome/timing';

let ctx: AudioContext | null = null;

function tryResume(audio: AudioContext) {
  // Stays pending, or fails, until the browser allows it, so just retry later.
  if (audio.state !== 'running') audio.resume().catch(() => {});
}

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    watchForInterruptions(ctx);
  }
  tryResume(ctx);
  return ctx;
}

// ---- Interruptions -------------------------------------------------------

let interrupted = false;
const interruptionListeners = new Set<() => void>();
const resumeListeners = new Set<() => void>();

/**
 * Phone calls, other apps, and locking the screen can suspend audio while
 * the app still thinks it's playing. Ask for it back as soon as that might
 * work: right away, on returning to the page, and on the next tap (which
 * some browsers insist on).
 */
function watchForInterruptions(audio: AudioContext) {
  function retry() {
    if (!document.hidden) tryResume(audio);
  }

  // The context starts out suspended, which isn't an interruption.
  let wasRunning = audio.state === 'running';

  audio.addEventListener('statechange', () => {
    const running = audio.state === 'running';
    if (running === wasRunning) return;
    wasRunning = running;
    interrupted = !running;
    for (const listener of interruptionListeners) listener();
    if (running) for (const listener of resumeListeners) listener();
    else retry();
  });

  document.addEventListener('visibilitychange', retry);
  window.addEventListener('pageshow', retry);
  window.addEventListener('pointerdown', retry, { capture: true, passive: true });
}

/** Whether audio was cut off and hasn't come back yet. */
export function isAudioInterrupted(): boolean {
  return interrupted;
}

/** Hear when audio is cut off or comes back. Returns the unsubscribe function. */
export function subscribeAudioInterrupted(listener: () => void): () => void {
  interruptionListeners.add(listener);
  return () => interruptionListeners.delete(listener);
}

/**
 * Create or resume the audio context. Call from inside a tap/click handler:
 * iOS only lets audio start from a user gesture, and React may start sound
 * in an effect that runs just after the gesture.
 */
export function unlockAudio() {
  getCtx();
}

/** MIDI number for a note in scientific pitch notation (A4 = 69). */
export function midiOf(note: Note, octave: number): number {
  // NOTE_INDEX is anchored at A = 0; convert to semitones-above-C.
  const fromC = (NOTE_INDEX[note] + 9) % 12;
  return (octave + 1) * 12 + fromC;
}

export function freqOfMidi(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

// Tone envelope: a quick swell, a settle to a sustained level that holds
// for the whole note, then a short fade. (A tone that decays from the start
// is audible for only a fraction of its nominal length.)
const ATTACK = 0.02;
const SETTLE_TIME_CONSTANT = 0.25;
const SUSTAIN = 0.65; // fraction of peak held after the settle
const RELEASE = 0.25;
// Peak level of a single tone; chords scale each voice down to avoid clipping.
const PEAK_GAIN = 0.3;

// A warm tone with gentle overtones, so pitch reads clearly even on phone
// speakers that barely reproduce the fundamental of low notes.
const TONE_PARTIALS = [0, 1, 0.5, 0.33, 0.22, 0.14, 0.09, 0.05];
const toneWaves = new WeakMap<AudioContext, PeriodicWave>();

function toneWave(audio: AudioContext): PeriodicWave {
  let wave = toneWaves.get(audio);
  if (!wave) {
    wave = audio.createPeriodicWave(
      new Float32Array(TONE_PARTIALS.length),
      Float32Array.from(TONE_PARTIALS),
    );
    toneWaves.set(audio, wave);
  }
  return wave;
}

/** Schedule a single sustained tone. It finishes fading RELEASE s after `duration`. */
function scheduleTone(
  audio: AudioContext,
  midi: number,
  start: number,
  duration: number,
  peak = PEAK_GAIN,
) {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.setPeriodicWave(toneWave(audio));
  osc.frequency.value = freqOfMidi(midi);

  const end = start + duration;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peak, start + ATTACK);
  gain.gain.setTargetAtTime(peak * SUSTAIN, start + ATTACK, SETTLE_TIME_CONSTANT);
  gain.gain.setValueAtTime(peak * SUSTAIN, end);
  gain.gain.linearRampToValueAtTime(0, end + RELEASE);

  osc.connect(gain).connect(audio.destination);
  osc.start(start);
  osc.stop(end + RELEASE + 0.05);
}

/** One step of a phrase: notes that sound together, and for how long. */
export interface PhraseStep {
  midis: number[];
  duration: number;
}

/**
 * Play steps one after another, `gap` seconds apart; each step's notes sound
 * together. Returns the total duration in seconds (for UI "is playing" state).
 */
export function playMidiPhrase(steps: PhraseStep[], gap = 0.3): number {
  const audio = getCtx();
  let t = audio.currentTime + 0.05;
  const t0 = t;
  steps.forEach(({ midis, duration }, i) => {
    // Scale each voice so stacked notes stay clear of clipping.
    const peak = PEAK_GAIN / Math.sqrt(midis.length);
    for (const midi of midis) scheduleTone(audio, midi, t, duration, peak);
    t += duration + (i < steps.length - 1 ? gap : 0);
  });
  return t - t0 + RELEASE;
}

// ---- Drone ---------------------------------------------------------------

/**
 * MIDI notes for a root + fifth drone: a quiet low root for depth, then the
 * root and fifth in octave 3 so phone speakers (weak below ~150 Hz) still
 * carry the key.
 */
export function droneMidis(root: Note): number[] {
  const r = midiOf(root, 3);
  return [r - 12, r, r + 7];
}

export const DRONE_SOUNDS = ['tanpura', 'synth', 'organ'] as const;
export type DroneSound = (typeof DRONE_SOUNDS)[number];

export interface Drone {
  /** Move the drone to a new key. */
  setRoot(root: Note): void;
  /** Dip the volume for `seconds` (e.g. under an ear-training prompt). */
  duck(seconds: number): void;
  /** Fade out and release the oscillators. */
  stop(): void;
}

// Ducking: how far the drone dips under a prompt, and how fast it moves.
const DUCK_LEVEL = 0.25;
const DUCK_DOWN = 0.15;
const DUCK_UP = 0.4;

/** The sound-specific part of a drone, playing into a shared output. */
interface DroneVoice {
  setRoot(root: Note): void;
  /** Called once the output has faded; release everything by `at`. */
  stop(at: number): void;
}

// Relative level of each droneMidis voice.
const DRONE_VOICE_LEVELS = [0.6, 1, 0.7];
const DRONE_FADE_IN = 0.6;
const DRONE_FADE_OUT = 0.4;
const GLIDE_TIME_CONSTANT = 0.04;

/** Detuned sawtooth pairs through a slowly sweeping low-pass filter. */
function synthVoice(audio: AudioContext, out: AudioNode, root: Note): DroneVoice {
  const DETUNE_CENTS = 5;
  const now = audio.currentTime;

  // Soften the sawtooth buzz, and sweep the cutoff slowly so it breathes.
  const filter = audio.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  filter.Q.value = 0.7;
  const lfo = audio.createOscillator();
  lfo.frequency.value = 0.08;
  const lfoDepth = audio.createGain();
  lfoDepth.gain.value = 250;
  lfo.connect(lfoDepth).connect(filter.frequency);
  filter.connect(out);

  // Two slightly detuned oscillators per voice give a warm chorus.
  const voices = droneMidis(root).map((midi, v) => {
    const level = audio.createGain();
    level.gain.value = DRONE_VOICE_LEVELS[v] / 2;
    level.connect(filter);
    return [-DETUNE_CENTS, DETUNE_CENTS].map((detune) => {
      const osc = audio.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freqOfMidi(midi);
      osc.detune.value = detune;
      osc.connect(level);
      osc.start(now);
      return osc;
    });
  });
  lfo.start(now);

  return {
    setRoot(next) {
      const t = audio.currentTime;
      droneMidis(next).forEach((midi, v) => {
        for (const osc of voices[v]) {
          osc.frequency.setTargetAtTime(freqOfMidi(midi), t, GLIDE_TIME_CONSTANT);
        }
      });
    },
    stop(at) {
      for (const osc of [lfo, ...voices.flat()]) osc.stop(at);
    },
  };
}

/** Steady sine partials, like organ drawbars (8', 4', 2⅔', 2', 1⅗'). */
function organVoice(audio: AudioContext, out: AudioNode, root: Note): DroneVoice {
  // Harmonic amplitudes, index = harmonic number.
  const partials = [0, 1, 0.55, 0.35, 0.25, 0.12, 0, 0, 0.08];
  const wave = audio.createPeriodicWave(
    new Float32Array(partials.length),
    Float32Array.from(partials),
  );
  const now = audio.currentTime;

  const oscs = droneMidis(root).map((midi, v) => {
    const level = audio.createGain();
    level.gain.value = DRONE_VOICE_LEVELS[v];
    level.connect(out);
    const osc = audio.createOscillator();
    osc.setPeriodicWave(wave);
    osc.frequency.value = freqOfMidi(midi);
    osc.connect(level);
    osc.start(now);
    return osc;
  });

  return {
    setRoot(next) {
      const t = audio.currentTime;
      droneMidis(next).forEach((midi, v) => {
        oscs[v].frequency.setTargetAtTime(freqOfMidi(midi), t, GLIDE_TIME_CONSTANT);
      });
    },
    stop(at) {
      for (const osc of oscs) osc.stop(at);
    },
  };
}

/**
 * Tanpura modeled on measurements of a real recording: four plucks (Pa, Sa,
 * Sa, low Sa, with Pa a fourth below Sa) spread across an 8 s cycle, notes
 * that ring until re-plucked, weak fundamentals with strong 4th-7th
 * harmonics and a resonance near 1.25 kHz, and a buzz that builds just
 * after each pluck, then mellows (the jawari "bloom").
 */
function tanpuraVoice(audio: AudioContext, out: AudioNode, root: Note): DroneVoice {
  const CYCLE = 8;
  const RING = 16; // seconds each pluck is kept alive
  const DECAY_TC = 12; // ~-6 dB by the next pluck of the same string
  // A soft swell, not a click: the recording's plucks take 80-490 ms to rise.
  const ATTACK = 0.06;
  // Humanize: each pluck lands up to this far early or late, like a player.
  const JITTER = 0.2;
  const LOOKAHEAD = 0.5;
  // [semitones from root, level, seconds into the cycle] in pluck order:
  // Pa, Sa, Sa, low Sa. The slightly uneven spacing is the recording's.
  const STRINGS: [number, number, number][] = [
    [-5, 0.8, 0],
    [0, 1, 2.3],
    [0, 1, 4.9],
    [-12, 0.9, 6.3],
  ];

  // Weak fundamental, a strong octave (the recording's main Sa sits an
  // octave above ours), then harmonics 4-7; integer harmonics give the pure
  // (just) 5th and 7th partials heard in the recording. The thin tail up to
  // the 64th harmonic adds the buzz's high "air".
  const low = [0, 0.45, 1, 0.75, 0.8, 0.7, 0.6, 0.5, 0.3];
  const harmonics = Array.from({ length: 64 }, (_, n) =>
    n < low.length ? low[n] : 0.3 * (8 / n) ** 1.3,
  );
  const wave = audio.createPeriodicWave(
    new Float32Array(harmonics.length),
    Float32Array.from(harmonics),
  );

  // Fixed body/jawari resonance shared by all strings.
  const resonance = audio.createBiquadFilter();
  resonance.type = 'peaking';
  resonance.frequency.value = 1250;
  resonance.Q.value = 1.2;
  resonance.gain.value = 8;
  resonance.connect(out);

  let rootMidi = midiOf(root, 3);
  let step = 0;
  let cycleStart = audio.currentTime + 0.05;
  const newJitter = () => (Math.random() * 2 - 1) * JITTER;
  // Drawn once per pluck, so re-running the scheduler doesn't re-roll it.
  let jitter = newJitter();
  const ringing = new Set<GainNode>();

  function pluck(midi: number, level: number, t: number) {
    const osc = audio.createOscillator();
    osc.setPeriodicWave(wave);
    osc.frequency.value = freqOfMidi(midi);

    // Bloom: the buzz builds for a moment after the pluck, then mellows.
    // A little jitter keeps repeats from sounding mechanical.
    const j = () => 1 + (Math.random() - 0.5) * 0.2;
    const filter = audio.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.9;
    filter.frequency.setValueAtTime(2200 * j(), t);
    filter.frequency.linearRampToValueAtTime(3400 * j(), t + 0.35);
    filter.frequency.exponentialRampToValueAtTime(1500 * j(), t + 1.5);
    filter.frequency.exponentialRampToValueAtTime(1000, t + RING);

    const gain = audio.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(level, t + ATTACK);
    gain.gain.setTargetAtTime(0, t + ATTACK, DECAY_TC);

    osc.connect(filter).connect(gain).connect(resonance);
    osc.start(t);
    osc.stop(t + RING);
    ringing.add(gain);
    osc.onended = () => ringing.delete(gain);
  }

  function schedule() {
    for (;;) {
      const [semitones, level, at] = STRINGS[step];
      const t = Math.max(cycleStart + at + jitter, audio.currentTime + 0.02);
      if (t >= audio.currentTime + LOOKAHEAD) break;
      pluck(rootMidi + semitones, level, t);
      jitter = newJitter();
      step += 1;
      if (step === STRINGS.length) {
        step = 0;
        cycleStart += CYCLE;
      }
    }
  }
  schedule();
  const timer = setInterval(schedule, 100);

  return {
    setRoot(next) {
      // Notes ring ~10 s, so fade the old key out and restart the cycle.
      const t = audio.currentTime;
      for (const gain of ringing) {
        gain.gain.cancelScheduledValues(t);
        gain.gain.setTargetAtTime(0, t, 0.1);
      }
      rootMidi = midiOf(next, 3);
      step = 0;
      cycleStart = t + 0.15;
      schedule();
    },
    stop() {
      // Plucks already scheduled ring out under the faded output.
      clearInterval(timer);
    },
  };
}

const DRONE_VOICES: Record<
  DroneSound,
  (audio: AudioContext, out: AudioNode, root: Note) => DroneVoice
> = {
  synth: synthVoice,
  organ: organVoice,
  tanpura: tanpuraVoice,
};

// Output level per sound, balanced by measured loudness.
const DRONE_GAIN: Record<DroneSound, number> = {
  synth: 0.18,
  organ: 0.09,
  tanpura: 0.12,
};

/** Let Web Audio play with the iPhone ring/silent switch on (Safari 17+). */
function allowPlaybackWhenMuted() {
  const nav = navigator as Navigator & { audioSession?: { type: string } };
  if (nav.audioSession) nav.audioSession.type = 'playback';
}

/** Start a sustained root + fifth drone. Call stop() on the result to end it. */
export function startDrone(root: Note, sound: DroneSound = 'tanpura'): Drone {
  allowPlaybackWhenMuted();
  const audio = getCtx();
  const now = audio.currentTime;

  const master = audio.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(DRONE_GAIN[sound], now + DRONE_FADE_IN);
  master.connect(audio.destination);
  const voice = DRONE_VOICES[sound](audio, master, root);

  let stopped = false;
  return {
    setRoot(next) {
      if (!stopped) voice.setRoot(next);
    },
    duck(seconds) {
      if (stopped) return;
      const t = audio.currentTime;
      const full = DRONE_GAIN[sound];
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), t);
      master.gain.linearRampToValueAtTime(full * DUCK_LEVEL, t + DUCK_DOWN);
      master.gain.setValueAtTime(full * DUCK_LEVEL, t + seconds);
      master.gain.linearRampToValueAtTime(full, t + seconds + DUCK_UP);
    },
    stop() {
      if (stopped) return;
      stopped = true;
      const t = audio.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), t);
      master.gain.exponentialRampToValueAtTime(0.0001, t + DRONE_FADE_OUT);
      voice.stop(t + DRONE_FADE_OUT + 0.05);
    },
  };
}

// ---- Metronome -----------------------------------------------------------

const METRONOME_GAIN = 0.5;
const METRONOME_MUTE_FADE = 0.02;

let clickWorklet: Promise<void> | null = null;

/** Undefined `audioWorklet` means an insecure page (it needs HTTPS or localhost). */
function loadClickWorklet(audio: AudioContext): Promise<void> {
  if (!audio.audioWorklet) {
    return Promise.reject(new Error('AudioWorklet is unavailable'));
  }
  clickWorklet ??= audio.audioWorklet.addModule(clickWorkletUrl);
  return clickWorklet;
}

export interface Metronome {
  setBpm(bpm: number): void;
  setMeter(meter: Meter): void;
  /** Silence the clicks for `seconds` while the beat keeps counting. */
  mute(seconds: number): void;
  stop(): void;
}

export interface MetronomeCallbacks {
  /** A beat is reaching the speakers now. For visuals; skipped while hidden. */
  onBeat(beat: number): void;
  /** The metronome can't run here. */
  onError(): void;
}

/**
 * Start clicking. The clicks are generated on the audio thread, so a busy or
 * hidden page can't delay them. Call stop() on the result to end it.
 */
export function startMetronome(
  bpm: number,
  meter: Meter,
  { onBeat, onError }: MetronomeCallbacks,
): Metronome {
  allowPlaybackWhenMuted();
  const audio = getCtx();

  const master = audio.createGain();
  master.gain.value = METRONOME_GAIN;
  master.connect(audio.destination);

  let stopped = false;
  let node: AudioWorkletNode | null = null;
  let currentBpm = bpm;
  let currentMeter = meter;

  function send(command: ClickCommand) {
    node?.port.postMessage(command);
  }

  // Beats arrive as they're rendered, slightly before they're heard.
  const upcoming: { beat: number; at: number }[] = [];
  const displayClock = createDisplayClock();
  let frame = 0;

  // Back from an interruption, start again on a clean downbeat rather than
  // part-way through whatever bar was cut off.
  const restart = () => {
    upcoming.length = 0;
    displayClock.reset();
    send({ type: 'restart' });
  };
  resumeListeners.add(restart);

  function showBeats() {
    frame = requestAnimationFrame(showBeats);
    const now = performance.now();
    displayClock.sample({
      output: audio.getOutputTimestamp?.(),
      contextTime: audio.currentTime,
      latency: (audio.baseLatency ?? 0) + (audio.outputLatency ?? 0),
      now,
    });
    let latest: number | null = null;
    while (upcoming.length > 0 && upcoming[0].at <= now) {
      latest = upcoming.shift()!.beat;
    }
    if (latest !== null) onBeat(latest);
  }
  frame = requestAnimationFrame(showBeats);

  function queueBeat({ beat, frame: beatFrame }: BeatMessage) {
    if (document.hidden) return;
    upcoming.push({ beat, at: displayClock.beatTime(beatFrame / audio.sampleRate) });
  }

  function cleanUp() {
    stopped = true;
    resumeListeners.delete(restart);
    cancelAnimationFrame(frame);
    upcoming.length = 0;
    send({ type: 'stop' });
    node?.disconnect();
    master.disconnect();
  }

  loadClickWorklet(audio)
    .then(() => {
      if (stopped) return;
      const processorOptions: ClickOptions = { bpm: currentBpm, meter: currentMeter };
      node = new AudioWorkletNode(audio, 'click-processor', {
        numberOfInputs: 0,
        outputChannelCount: [1],
        processorOptions,
      });
      node.port.onmessage = (event: MessageEvent<BeatMessage>) => queueBeat(event.data);
      node.connect(master);
    })
    .catch(() => {
      if (stopped) return;
      cleanUp();
      onError();
    });

  return {
    setBpm(next) {
      currentBpm = next;
      send({ type: 'bpm', bpm: next });
    },
    setMeter(next) {
      currentMeter = next;
      send({ type: 'meter', meter: next });
    },
    mute(seconds) {
      if (stopped) return;
      const t = audio.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(0, t + METRONOME_MUTE_FADE);
      master.gain.setValueAtTime(0, t + seconds);
      master.gain.linearRampToValueAtTime(
        METRONOME_GAIN,
        t + seconds + METRONOME_MUTE_FADE,
      );
    },
    stop() {
      if (!stopped) cleanUp();
    },
  };
}
