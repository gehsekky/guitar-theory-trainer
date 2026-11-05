// Guitar: tuning and fretboard. Kept free of app and UI code so it can grow
// into a standalone guitar-theory module (tunings, scale positions, shapes).

import { CHROMATIC, NOTE_INDEX, type Note } from './pitch';

// Standard guitar tuning, listed low string (6th) to high string (1st).
export interface GuitarString {
  /** Display label for the open note. */
  label: Note;
  /** Chromatic index of the open note. */
  open: number;
}

export const STRINGS: GuitarString[] = [
  { label: 'E', open: NOTE_INDEX['E'] }, // 6th (low E)
  { label: 'A', open: NOTE_INDEX['A'] }, // 5th
  { label: 'D', open: NOTE_INDEX['D'] }, // 4th
  { label: 'G', open: NOTE_INDEX['G'] }, // 3rd
  { label: 'B', open: NOTE_INDEX['B'] }, // 2nd
  { label: 'E', open: NOTE_INDEX['E'] }, // 1st (high E)
];

export const FRET_COUNT = 22;

/** Note sounding at a given string (index into STRINGS) and fret. */
export function noteAt(stringIndex: number, fret: number): Note {
  const open = STRINGS[stringIndex].open;
  return CHROMATIC[(open + fret) % 12];
}

/** One place to play a note: `tone` is its index in the notes asked for. */
export interface NotePosition {
  stringIndex: number;
  fret: number;
  tone: number;
}

/** Everywhere on the neck that `tones` can be played, open strings included. */
export function notePositions(tones: readonly Note[]): NotePosition[] {
  return STRINGS.flatMap((_string, stringIndex) =>
    Array.from({ length: FRET_COUNT + 1 }, (_fret, fret) => ({
      stringIndex,
      fret,
      tone: tones.indexOf(noteAt(stringIndex, fret)),
    })).filter((position) => position.tone !== -1),
  );
}
