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

// Relative level of each droneMidis voice.
const DRONE_VOICE_LEVELS = [0.6, 1, 0.7];
const DRONE_GAIN = 0.18;
const DRONE_FADE_IN = 0.6;
const DRONE_FADE_OUT = 0.4;
const DRONE_DETUNE_CENTS = 5;

export interface Drone {
  /** Glide the drone to a new key. */
  setRoot(root: Note): void;
  /** Fade out and release the oscillators. */
  stop(): void;
}

/** Let Web Audio play with the iPhone ring/silent switch on (Safari 17+). */
function allowPlaybackWhenMuted() {
  const nav = navigator as Navigator & { audioSession?: { type: string } };
  if (nav.audioSession) nav.audioSession.type = 'playback';
}

/** Start a sustained root + fifth drone. Call stop() on the result to end it. */
export function startDrone(root: Note): Drone {
  allowPlaybackWhenMuted();
  const audio = getCtx();
  const now = audio.currentTime;

  const master = audio.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(DRONE_GAIN, now + DRONE_FADE_IN);

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
  filter.connect(master).connect(audio.destination);

  // Two slightly detuned oscillators per voice give a warm chorus.
  const voices = droneMidis(root).map((midi, v) => {
    const level = audio.createGain();
    level.gain.value = DRONE_VOICE_LEVELS[v] / 2;
    level.connect(filter);
    return [-DRONE_DETUNE_CENTS, DRONE_DETUNE_CENTS].map((detune) => {
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

  let stopped = false;
  return {
    setRoot(next) {
      if (stopped) return;
      const t = audio.currentTime;
      droneMidis(next).forEach((midi, v) => {
        for (const osc of voices[v]) {
          osc.frequency.setTargetAtTime(freqOfMidi(midi), t, 0.04);
        }
      });
    },
    stop() {
      if (stopped) return;
      stopped = true;
      const t = audio.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), t);
      master.gain.exponentialRampToValueAtTime(0.0001, t + DRONE_FADE_OUT);
      for (const osc of [lfo, ...voices.flat()]) osc.stop(t + DRONE_FADE_OUT + 0.05);
    },
  };
}
