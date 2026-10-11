// Notation: where notes sit on the treble staff, written accidentals, and
// durations. A staff position plus an accidental and key gives a spelled
// written note ("E♯"), and from that the pitch that sounds ("F").

import { keyAlter, LETTERS, type Alter, type KeyDef, type Letter } from './keys';
import { pitchClass, type Note } from './pitch';
import type { SpelledNote } from './spelling';

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

// Staff steps where each key-signature accidental is drawn (treble clef),
// in signature order: sharps F C G D A E B, flats B E A D G C F.
export const SHARP_SIG_STEPS = [38, 35, 39, 36, 33, 37, 34]; // F5 C5 G5 D5 A4 E5 B4
export const FLAT_SIG_STEPS = [34, 37, 33, 36, 32, 35, 31]; // B4 E5 A4 D5 G4 C5 F4

// ---- Accidentals & sounding pitch ----------------------------------------

export type Accidental = 'none' | 'sharp' | 'flat' | 'natural';

export const ACCIDENTAL_GLYPH: Record<Exclude<Accidental, 'none'>, string> = {
  sharp: '♯',
  flat: '♭',
  natural: '♮',
};

const ACCIDENTAL_ALTER: Record<Exclude<Accidental, 'none'>, Alter> = {
  sharp: 1,
  flat: -1,
  natural: 0,
};

/** The note as written: staff letter, altered by the accidental or else the key. */
export function writtenNote(
  step: number,
  accidental: Accidental,
  key: KeyDef,
): SpelledNote {
  const letter = letterOfStep(step);
  const alter =
    accidental === 'none' ? keyAlter(letter, key) : ACCIDENTAL_ALTER[accidental];
  return letter + (alter > 0 ? '#' : alter < 0 ? 'b' : '');
}

/** Pitch class actually sounding for a staff step + accidental in a key. */
export function soundingNote(
  step: number,
  accidental: Accidental,
  key: KeyDef,
): Note {
  return pitchClass(writtenNote(step, accidental, key));
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
