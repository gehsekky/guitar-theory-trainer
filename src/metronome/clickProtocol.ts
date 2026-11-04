// Messages between the app and the click worklet.

import type { Meter } from './timing';

export interface ClickOptions {
  bpm: number;
  meter: Meter;
}

export type ClickCommand =
  | { type: 'bpm'; bpm: number }
  | { type: 'meter'; meter: Meter }
  | { type: 'restart' }
  | { type: 'stop' };

export interface BeatMessage {
  /** Position in the bar, from 0. */
  beat: number;
  /** The audio frame the click starts on (seconds = frame / sampleRate). */
  frame: number;
}
