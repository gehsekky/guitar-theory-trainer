// Sheet-music helpers: key signatures, staff positions, durations.

import { CHROMATIC, NOTE_INDEX, type Note } from './theory';

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
export type Letter = (typeof LETTERS)[number];

// Semitone (chromatic index) of each natural letter.
export const LETTER_SEMITONE: Record<Letter, number> = {
  C: NOTE_INDEX['C'],
  D: NOTE_INDEX['D'],
  E: NOTE_INDEX['E'],
  F: NOTE_INDEX['F'],
  G: NOTE_INDEX['G'],
  A: NOTE_INDEX['A'],
  B: NOTE_INDEX['B'],
};

// ---- Key signatures ------------------------------------------------------

export interface KeyDef {
  name: string;
  /** Positive = number of sharps, negative = number of flats. */
  accidentals: number;
}

export const KEYS: KeyDef[] = [
  { name: 'C major', accidentals: 0 },
  { name: 'G major', accidentals: 1 },
  { name: 'D major', accidentals: 2 },
  { name: 'A major', accidentals: 3 },
  { name: 'E major', accidentals: 4 },
  { name: 'B major', accidentals: 5 },
  { name: 'F♯ major', accidentals: 6 },
  { name: 'F major', accidentals: -1 },
  { name: 'B♭ major', accidentals: -2 },
  { name: 'E♭ major', accidentals: -3 },
  { name: 'A♭ major', accidentals: -4 },
  { name: 'D♭ major', accidentals: -5 },
  { name: 'G♭ major', accidentals: -6 },
];

// Order in which sharps/flats appear in a key signature.
export const SHARP_ORDER: Letter[] = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
export const FLAT_ORDER: Letter[] = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

/** How the key signature alters a letter: +1 sharp, -1 flat, 0 natural. */
export function keyAlter(letter: Letter, key: KeyDef): -1 | 0 | 1 {
  if (key.accidentals > 0) {
    return SHARP_ORDER.slice(0, key.accidentals).includes(letter) ? 1 : 0;
  }
  if (key.accidentals < 0) {
    return FLAT_ORDER.slice(0, -key.accidentals).includes(letter) ? -1 : 0;
  }
  return 0;
}

// ---- Staff positions -----------------------------------------------------

// A "step" is a diatonic position: octave * 7 + letter index (C=0 .. B=6).
// Treble staff lines are E4 (step 30) up to F5 (step 38).
export const STEP_E4 = 30;
export const STEP_F5 = 38;
export const STEP_B4 = 34; // middle line — stem direction flips here

export function stepOf(letter: Letter, octave: number): number {
  return octave * 7 + LETTERS.indexOf(letter);
}

export function letterOfStep(step: number): Letter {
  return LETTERS[step % 7];
}

export function octaveOfStep(step: number): number {
  return Math.floor(step / 7);
}

// Staff steps where each key-signature accidental is drawn (treble clef).
export const SHARP_SIG_STEPS = [38, 35, 39, 36, 33, 37, 34]; // F5 C5 G5 D5 A4 E5 B4
export const FLAT_SIG_STEPS = [34, 37, 33, 36, 32, 35, 31]; // B4 E5 A4 D5 G4 C5 F4

// ---- Accidentals & sounding pitch ----------------------------------------

export type Accidental = 'none' | 'sharp' | 'flat' | 'natural';

export const ACCIDENTAL_GLYPH: Record<Exclude<Accidental, 'none'>, string> = {
  sharp: '♯',
  flat: '♭',
  natural: '♮',
};

/** Pitch class actually sounding for a staff step + accidental in a key. */
export function soundingNote(
  step: number,
  accidental: Accidental,
  key: KeyDef,
): Note {
  const letter = letterOfStep(step);
  let alter: number;
  switch (accidental) {
    case 'none':
      alter = keyAlter(letter, key);
      break;
    case 'natural':
      alter = 0;
      break;
    case 'sharp':
      alter = 1;
      break;
    case 'flat':
      alter = -1;
      break;
  }
  return CHROMATIC[(LETTER_SEMITONE[letter] + alter + 12) % 12];
}

// ---- Durations -----------------------------------------------------------

export type Duration = 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth';

export const DURATIONS: Duration[] = [
  'whole',
  'half',
  'quarter',
  'eighth',
  'sixteenth',
];

export const DURATION_LABEL: Record<Duration, string> = {
  whole: 'Whole',
  half: 'Half',
  quarter: 'Quarter',
  eighth: 'Eighth',
  sixteenth: 'Sixteenth',
};
