// Chord types, defined once and shared by every trainer. Intervals come from
// Tonal's chord dictionary; the names are how the app labels them.

import { get as getChordType } from '@tonaljs/chord-type';
import { semitones } from '@tonaljs/interval';
import { transpose, type Note } from './pitch';

// A chord type (triad or seventh) as semitone offsets from the root.
export interface ChordType {
  name: string;
  intervals: number[];
}

/** A chord type by its Tonal symbol ("m7b5"), with our display name. */
function chordType(symbol: string, name: string): ChordType {
  const { intervals, empty } = getChordType(symbol);
  if (empty) throw new Error(`Unknown chord type: "${symbol}"`);
  return { name, intervals: intervals.map(semitones) };
}

export const CHORD_TYPES = {
  major: chordType('M', 'major'),
  minor: chordType('m', 'minor'),
  diminished: chordType('dim', 'diminished'),
  augmented: chordType('aug', 'augmented'),
  major7: chordType('maj7', 'major 7th'),
  dominant7: chordType('7', 'dominant 7th'),
  minor7: chordType('m7', 'minor 7th'),
  halfDiminished7: chordType('m7b5', 'half-diminished 7th'),
  diminished7: chordType('dim7', 'diminished 7th'),
} as const satisfies Record<string, ChordType>;

/** Notes of a chord from its root and interval offsets. */
export function chordNotes(root: Note, intervals: readonly number[]): Note[] {
  return intervals.map((i) => transpose(root, i));
}

export const EAR_CHORDS_EASY: ChordType[] = [CHORD_TYPES.major, CHORD_TYPES.minor];

export const EAR_CHORDS_HARD: ChordType[] = [
  CHORD_TYPES.major,
  CHORD_TYPES.minor,
  CHORD_TYPES.diminished,
  CHORD_TYPES.augmented,
  CHORD_TYPES.major7,
  CHORD_TYPES.dominant7,
  CHORD_TYPES.minor7,
  CHORD_TYPES.halfDiminished7,
  CHORD_TYPES.diminished7,
];

// ---- Triads -------------------------------------------------------------

export type Quality = 'major' | 'minor' | 'diminished' | 'augmented';

export const QUALITY_LABEL: Record<Quality, string> = {
  major: 'major',
  minor: 'minor',
  diminished: 'diminished',
  augmented: 'augmented',
};

// Semitone offsets from the root for root / third / fifth.
export const TRIAD_INTERVALS: Record<Quality, number[]> = {
  major: CHORD_TYPES.major.intervals,
  minor: CHORD_TYPES.minor.intervals,
  diminished: CHORD_TYPES.diminished.intervals,
  augmented: CHORD_TYPES.augmented.intervals,
};

/** The three notes of a triad, in root/third/fifth order. */
export function triadNotes(root: Note, quality: Quality): [Note, Note, Note] {
  const [a, b, c] = chordNotes(root, TRIAD_INTERVALS[quality]);
  return [a, b, c];
}
