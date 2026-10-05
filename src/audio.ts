// Web Audio engine: note → frequency math and tone playback.
// Kept generic (sequences, chords) so future ear trainers can reuse it.

import { NOTE_INDEX, type Note } from './music';

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
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

/**
 * Play MIDI notes one after another.
 * Returns the total duration in seconds (for UI "is playing" state).
 */
export function playMidiSequence(
  midis: number[],
  noteDuration = 1.2,
  gap = 0.3,
): number {
  const audio = getCtx();
  const t0 = audio.currentTime + 0.05;
  midis.forEach((midi, i) => {
    scheduleTone(audio, midi, t0 + i * (noteDuration + gap), noteDuration);
  });
  return midis.length * (noteDuration + gap) - gap + RELEASE;
}

/**
 * Play MIDI notes simultaneously as a chord.
 * Returns the total duration in seconds.
 */
export function playMidiChord(midis: number[], duration = 2.5): number {
  const audio = getCtx();
  const t0 = audio.currentTime + 0.05;
  // Scale each voice so the summed chord stays clear of clipping.
  const peak = PEAK_GAIN / Math.sqrt(midis.length);
  midis.forEach((midi) => scheduleTone(audio, midi, t0, duration, peak));
  return duration + RELEASE;
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

export type DroneSound = 'synth' | 'organ' | 'tanpura';

export interface Drone {
  /** Move the drone to a new key. */
  setRoot(root: Note): void;
  /** Fade out and release the oscillators. */
  stop(): void;
}

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
export function startDrone(root: Note, sound: DroneSound = 'synth'): Drone {
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
