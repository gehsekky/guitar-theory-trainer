// Intervals offered by the ear trainer, minor 2nd through octave, and degree
// labels for chord and scale tones.

import { get as getInterval, semitones } from '@tonaljs/interval';
import { transpose } from '@tonaljs/note';
import type { SpelledNote } from './spelling';

export interface Interval {
  semitones: number;
  name: string;
  short: string;
  /** Interval name in Tonal ("3m", "4A"), used for spelling. */
  tonal: string;
}

/** An interval by its Tonal name ("3m", "4A"), with our display names. */
function interval(tonalName: string, name: string, short: string): Interval {
  return { semitones: semitones(tonalName), name, short, tonal: tonalName };
}

export const INTERVALS: Interval[] = [
  interval('2m', 'Minor 2nd', 'm2'),
  interval('2M', 'Major 2nd', 'M2'),
  interval('3m', 'Minor 3rd', 'm3'),
  interval('3M', 'Major 3rd', 'M3'),
  interval('4P', 'Perfect 4th', 'P4'),
  interval('4A', 'Tritone', 'TT'),
  interval('5P', 'Perfect 5th', 'P5'),
  interval('6m', 'Minor 6th', 'm6'),
  interval('6M', 'Major 6th', 'M6'),
  interval('7m', 'Minor 7th', 'm7'),
  interval('7M', 'Major 7th', 'M7'),
  interval('8P', 'Octave', 'P8'),
];

/** The note an interval above a spelled tonic: B♭ + major 3rd → D. */
export function spellInterval(tonic: SpelledNote, interval: Interval): SpelledNote {
  return transpose(tonic, interval.tonal);
}

const ORDINALS = ['root', '2nd', '3rd', '4th', '5th', '6th', '7th'];

/** A tone's degree relative to its root, from a Tonal interval name, with
 * the accidental it has against the major scale: "3M" → "3rd",
 * "3m" → "♭3rd", "5A" → "♯5th", "7d" → "𝄫7th". */
export function degreeLabel(interval: string): string {
  const { simple, alt } = getInterval(interval);
  const accidental =
    alt === -2 ? '𝄫' : alt === 2 ? '𝄪' : alt < 0 ? '♭' : alt > 0 ? '♯' : '';
  return accidental + ORDINALS[simple - 1];
}
