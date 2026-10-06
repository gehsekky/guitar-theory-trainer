// Pitch classes: the twelve notes, independent of octave and spelling.
//
// Quiz answers are pitch classes (a note-picker button is "A♯/B♭", not one
// spelling), so the app's `Note` type names each pitch class by its sharp
// spelling. Spelled names from Tonal ("B♭", "E♯", "C𝄪") convert to it with
// `pitchClass`.

import { chroma } from '@tonaljs/note';

// Chromatic scale using sharps, anchored at A = 0 (the note-picker order).
export const CHROMATIC = [
  'A',
  'A#',
  'B',
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
] as const;

export type Note = (typeof CHROMATIC)[number];

/** The seven natural notes (no sharps/flats). */
export const NATURAL_NOTES: Note[] = CHROMATIC.filter((n) => !n.includes('#'));

export const NOTE_INDEX: Record<Note, number> = CHROMATIC.reduce(
  (acc, note, i) => {
    acc[note] = i;
    return acc;
  },
  {} as Record<Note, number>,
);

/**
 * Pitch class of any spelled note name, e.g. "Bb" → "A#", "E#" → "F",
 * "C##" → "D". Octave numbers are ignored.
 */
export function pitchClass(name: string): Note {
  const c = chroma(name); // C = 0
  if (Number.isNaN(c)) throw new Error(`Not a note name: "${name}"`);
  return CHROMATIC[(c + 3) % 12]; // CHROMATIC starts at A (chroma 9)
}

// Flat equivalents for the five accidental notes.
const FLAT_EQUIV: Partial<Record<Note, string>> = {
  'A#': 'B♭',
  'C#': 'D♭',
  'D#': 'E♭',
  'F#': 'G♭',
  'G#': 'A♭',
};

/** Display form of a note: naturals as-is, accidentals as "A♯/B♭". */
export function displayNote(note: Note): string {
  const flat = FLAT_EQUIV[note];
  return flat ? `${note.replace('#', '♯')}/${flat}` : note;
}

/** Pitch class reached by going up `semitones` from a note. */
export function transpose(note: Note, semitones: number): Note {
  return CHROMATIC[(((NOTE_INDEX[note] + semitones) % 12) + 12) % 12];
}

/** Compare two note sequences position by position. */
export function sameNoteOrder(a: Note[], b: Note[]): boolean {
  return a.length === b.length && a.every((n, i) => n === b[i]);
}

/** Compare two note sets for equality regardless of order. */
export function sameNoteSet(a: Note[], b: Note[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((n) => setB.has(n));
}
