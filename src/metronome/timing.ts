// Metronome timing, free of audio and React so it can be tested directly.

export const MIN_BPM = 30;
export const MAX_BPM = 240;

export const METERS = ['2/4', '3/4', '4/4', '6/8'] as const;
export type Meter = (typeof METERS)[number];

const BEATS: Readonly<Record<Meter, number>> = {
  '2/4': 2,
  '3/4': 3,
  '4/4': 4,
  '6/8': 6,
};

/** Clicks per bar. In 6/8 every eighth note clicks, so BPM counts eighths. */
export function beatsIn(meter: Meter): number {
  return BEATS[meter];
}

export type Accent = 'strong' | 'medium' | 'weak';

/** How hard a beat (0-based) clicks: the downbeat, then 6/8's second pulse. */
export function accentOf(meter: Meter, beat: number): Accent {
  if (beat === 0) return 'strong';
  return meter === '6/8' && beat === 3 ? 'medium' : 'weak';
}

export function clampBpm(bpm: number): number {
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(bpm)));
}

/** A gap this long starts a new tap; it's longer than one beat at MIN_BPM. */
const TAP_RESET_MS = 2500;
/** Average over this many taps, so tempo follows you without jumping around. */
const MAX_TAPS = 6;

/** Add a tap (ms) to the recent ones, dropping any that are stale. */
export function addTap(taps: readonly number[], now: number): number[] {
  const last = taps[taps.length - 1];
  const kept = last !== undefined && now - last > TAP_RESET_MS ? [] : taps;
  return [...kept, now].slice(-MAX_TAPS);
}

/** The tempo of a run of taps (ms), or null until there are two of them. */
export function bpmFromTaps(taps: readonly number[]): number | null {
  if (taps.length < 2) return null;
  const average = (taps[taps.length - 1] - taps[0]) / (taps.length - 1);
  return average > 0 ? clampBpm(60000 / average) : null;
}
