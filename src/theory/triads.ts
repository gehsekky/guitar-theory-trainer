// Triad shapes on the guitar: a three-note chord played one note per string
// on three adjacent strings, in close position (each note the next chord
// tone up). Every root, quality, and inversion appears on every string set,
// so these shapes cover the neck.

import { CHORD_TYPES, chordNotes, type ChordType } from './chords';
import { FRET_COUNT, STRINGS, midiAt, noteAt, type FretPosition } from './guitar';
import type { Note } from './pitch';

/** Three adjacent strings, low to high (indices into STRINGS). */
export interface StringSet {
  strings: readonly [number, number, number];
  /** "D G B": low to high, high E written as e. */
  name: string;
}

export const STRING_SETS: readonly StringSet[] = [
  { strings: [0, 1, 2], name: 'E A D' },
  { strings: [1, 2, 3], name: 'A D G' },
  { strings: [2, 3, 4], name: 'D G B' },
  { strings: [3, 4, 5], name: 'G B e' },
];

// Augmented triads are left out: they are symmetric, so each inversion is
// also an augmented triad in root position on another root, and the shape
// can't say which one it is.
export const TRIAD_TYPES = {
  major: CHORD_TYPES.major,
  minor: CHORD_TYPES.minor,
  diminished: CHORD_TYPES.diminished,
} as const satisfies Record<string, ChordType>;

export type TriadQuality = keyof typeof TRIAD_TYPES;

/** 0 = root position (root in the bass), 1 = 1st inversion (3rd in the
 * bass), 2 = 2nd inversion (5th in the bass). */
export type Inversion = 0 | 1 | 2;

export const INVERSIONS: readonly Inversion[] = [0, 1, 2];

export const INVERSION_NAMES: Record<Inversion, string> = {
  0: 'root position',
  1: '1st inversion',
  2: '2nd inversion',
};

/** One playable triad shape. */
export interface TriadShape {
  /** Low string to high, one note each. */
  positions: [FretPosition, FretPosition, FretPosition];
  /** For each position, which chord tone it plays: 0 root, 1 third, 2 fifth. */
  tones: [number, number, number];
}

// The widest fret span a shape may need, the stretch of a normal hand.
const MAX_SPAN = 4;

/**
 * Every place to play a triad on a string set in a given inversion, low on
 * the neck first. The bass note is the inversion's chord tone; each string
 * above takes the next chord tone up.
 */
export function triadShapes(
  root: Note,
  quality: TriadQuality,
  inversion: Inversion,
  set: StringSet,
): TriadShape[] {
  const type = TRIAD_TYPES[quality];
  const notes = chordNotes(root, type.intervals);
  // Chord tones from the bass up: root position R 3 5, 1st 3 5 R, 2nd 5 R 3.
  const tones = [0, 1, 2].map((i) => (inversion + i) % 3) as [number, number, number];
  // Semitones from each voice up to the next (always less than an octave).
  const up = (from: number, to: number) =>
    (((type.intervals[to] - type.intervals[from]) % 12) + 12) % 12;
  const steps = [up(tones[0], tones[1]), up(tones[1], tones[2])];

  const [low, middle, high] = set.strings;
  const shapes: TriadShape[] = [];
  for (let fret = 0; fret <= FRET_COUNT; fret++) {
    if (noteAt(low, fret) !== notes[tones[0]]) continue;
    const bass = midiAt(low, fret);
    const fret1 = bass + steps[0] - STRINGS[middle].midi;
    const fret2 = bass + steps[0] + steps[1] - STRINGS[high].midi;
    const frets = [fret, fret1, fret2];
    if (frets.some((f) => f < 0 || f > FRET_COUNT)) continue;
    if (Math.max(...frets) - Math.min(...frets) > MAX_SPAN) continue;
    shapes.push({
      positions: [
        { stringIndex: low, fret },
        { stringIndex: middle, fret: fret1 },
        { stringIndex: high, fret: fret2 },
      ],
      tones,
    });
  }
  return shapes;
}
