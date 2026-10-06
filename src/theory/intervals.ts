// Intervals offered by the ear trainer, minor 2nd through octave.

import { semitones } from '@tonaljs/interval';

export interface Interval {
  semitones: number;
  name: string;
  short: string;
}

/** An interval by its Tonal name ("3m", "4A"), with our display names. */
function interval(tonalName: string, name: string, short: string): Interval {
  return { semitones: semitones(tonalName), name, short };
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
