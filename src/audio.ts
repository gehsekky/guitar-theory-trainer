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

const ATTACK = 0.015;
const PEAK_GAIN = 0.35;

/** Schedule a single plucked-style tone. Returns its end time. */
function scheduleTone(
  audio: AudioContext,
  midi: number,
  start: number,
  duration: number,
): number {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = 'triangle';
  osc.frequency.value = freqOfMidi(midi);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(PEAK_GAIN, start + ATTACK);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(gain).connect(audio.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
  return start + duration;
}

/**
 * Play MIDI notes one after another.
 * Returns the total duration in seconds (for UI "is playing" state).
 */
export function playMidiSequence(
  midis: number[],
  noteDuration = 0.9,
  gap = 0.2,
): number {
  const audio = getCtx();
  const t0 = audio.currentTime + 0.05;
  midis.forEach((midi, i) => {
    scheduleTone(audio, midi, t0 + i * (noteDuration + gap), noteDuration);
  });
  return midis.length * (noteDuration + gap);
}

/**
 * Play MIDI notes simultaneously as a chord.
 * Returns the total duration in seconds.
 */
export function playMidiChord(midis: number[], duration = 1.6): number {
  const audio = getCtx();
  const t0 = audio.currentTime + 0.05;
  midis.forEach((midi) => scheduleTone(audio, midi, t0, duration));
  return duration;
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
 * Tanpura modeled on measurements of a real recording: a burst of four
 * plucks (Pa, Sa, Sa, low Sa, with Pa a fourth below Sa) every 8 s, notes
 * that ring until re-plucked, weak fundamentals with strong 4th-7th
 * harmonics and a resonance near 1.25 kHz, and brightness that swells in
 * slow waves after each pluck (the jawari "bloom").
 */
function tanpuraVoice(audio: AudioContext, out: AudioNode, root: Note): DroneVoice {
  const CYCLE = 8;
  const PLUCK_GAP = 0.4;
  const RING = 16; // seconds each pluck is kept alive
  const DECAY_TC = 12; // ~-6 dB by the next pluck of the same string
  const LOOKAHEAD = 0.5;
  // [semitones from root, level] in pluck order: Pa, Sa, Sa, low Sa.
  const STRINGS: [number, number][] = [
    [-5, 0.8],
    [0, 1],
    [0, 1],
    [-12, 0.9],
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
  let nextTime = audio.currentTime + 0.05;
  const ringing = new Set<GainNode>();

  function pluck(midi: number, level: number, t: number) {
    const osc = audio.createOscillator();
    osc.setPeriodicWave(wave);
    osc.frequency.value = freqOfMidi(midi);

    // Bloom: brightness dips after the attack, then swells in slow waves.
    // A little jitter keeps repeats from sounding mechanical.
    const j = () => 1 + (Math.random() - 0.5) * 0.2;
    const filter = audio.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.9;
    filter.frequency.setValueAtTime(1800 * j(), t);
    filter.frequency.linearRampToValueAtTime(750 * j(), t + 1.2);
    filter.frequency.linearRampToValueAtTime(1900 * j(), t + 2.4);
    filter.frequency.linearRampToValueAtTime(950 * j(), t + 4);
    filter.frequency.linearRampToValueAtTime(2100 * j(), t + 6);
    filter.frequency.linearRampToValueAtTime(900 * j(), t + RING);

    const gain = audio.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(level, t + 0.005);
    gain.gain.setTargetAtTime(0, t + 0.005, DECAY_TC);

    osc.connect(filter).connect(gain).connect(resonance);
    osc.start(t);
    osc.stop(t + RING);
    ringing.add(gain);
    osc.onended = () => ringing.delete(gain);
  }

  function schedule() {
    while (nextTime < audio.currentTime + LOOKAHEAD) {
      const i = step % STRINGS.length;
      const [offset, level] = STRINGS[i];
      pluck(rootMidi + offset, level, nextTime);
      step += 1;
      nextTime += i === STRINGS.length - 1 ? CYCLE - PLUCK_GAP * (STRINGS.length - 1) : PLUCK_GAP;
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
      nextTime = t + 0.15;
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
