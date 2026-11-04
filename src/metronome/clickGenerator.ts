// Renders metronome clicks into audio blocks, placing each beat by sample
// number. It has no browser dependencies: the worklet runs it on the audio
// thread, and tests run it directly.

import { accentOf, beatsIn, type Accent, type Meter } from './timing';

const CLICK_DECAY = 0.03;
const CLICK_END_LEVEL = 0.001;
/** Lead-in before the first beat, and after a restart. */
const START_DELAY = 0.05;

const CLICKS: Readonly<Record<Accent, { freq: number; peak: number }>> = {
  strong: { freq: 1760, peak: 1 },
  medium: { freq: 1320, peak: 0.75 },
  weak: { freq: 1000, peak: 0.6 },
};

/** Every click is this same waveform, so its attack never varies. */
function renderClick(accent: Accent, sampleRate: number): Float32Array {
  const { freq, peak } = CLICKS[accent];
  const samples = new Float32Array(Math.round(CLICK_DECAY * sampleRate));
  const decayPerSample = Math.pow(CLICK_END_LEVEL, 1 / samples.length);
  let level = peak;
  for (let i = 0; i < samples.length; i++) {
    samples[i] = level * Math.sin((2 * Math.PI * freq * i) / sampleRate);
    level *= decayPerSample;
  }
  return samples;
}

export interface ClickGenerator {
  /** Takes effect at once: the next beat lands one new interval after the last. */
  setBpm(bpm: number): void;
  /** The beat keeps its timing, and the next one becomes a downbeat. */
  setMeter(meter: Meter): void;
  /** Start again on a downbeat, shortly. */
  restart(): void;
  /**
   * Fill `output` with the next samples, replacing what's there, and report
   * each beat that starts in it. Its frame counts from `startFrame`.
   */
  render(output: Float32Array, onBeat: (beat: number, frame: number) => void): void;
}

export function createClickGenerator(
  sampleRate: number,
  bpm: number,
  meter: Meter,
  startFrame = 0,
): ClickGenerator {
  const waves: Readonly<Record<Accent, Float32Array>> = {
    strong: renderClick('strong', sampleRate),
    medium: renderClick('medium', sampleRate),
    weak: renderClick('weak', sampleRate),
  };
  const delay = Math.round(START_DELAY * sampleRate);

  let frame = startFrame;
  let currentMeter = meter;
  let interval = (60 * sampleRate) / bpm;
  let beat = 0;

  // Beats sit at anchor + count * interval, computed fresh each time rather
  // than added up, so rounding can never accumulate into drift.
  let anchor = startFrame + delay;
  let count = 0;
  let previous: number | null = null;

  let wave: Float32Array | null = null;
  let wavePosition = 0;

  return {
    setBpm(next) {
      interval = (60 * sampleRate) / next;
      // Before the first beat, nothing to measure from: keep the lead-in.
      if (previous === null) return;
      anchor = Math.max(frame, previous + interval);
      count = 0;
    },
    setMeter(next) {
      currentMeter = next;
      beat = 0;
    },
    restart() {
      anchor = frame + delay;
      count = 0;
      beat = 0;
      previous = null;
      wave = null;
    },
    render(output, onBeat) {
      for (let i = 0; i < output.length; i++, frame++) {
        const exact = anchor + count * interval;
        if (frame >= Math.round(exact)) {
          wave = waves[accentOf(currentMeter, beat)];
          wavePosition = 0;
          onBeat(beat, frame);
          previous = exact;
          count++;
          beat = (beat + 1) % beatsIn(currentMeter);
        }
        if (wave) {
          output[i] = wave[wavePosition++];
          if (wavePosition === wave.length) wave = null;
        } else {
          output[i] = 0;
        }
      }
    },
  };
}
