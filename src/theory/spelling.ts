// Spelled notes: a note name with its letter and accidental, e.g. "Bb" or
// "E#", as Tonal writes them. In a scale, key, or chord each note has one
// correct spelling (F major has B♭, not A♯); pitch classes (`Note`) don't.

import { enharmonic, get as getNote } from '@tonaljs/note';
import type { Note } from './pitch';

/** A note name in Tonal's ASCII spelling: "C", "Bb", "F#", "C##", "Ebb". */
export type SpelledNote = string;

/** Display form of a spelled note: "Bb" → "B♭", "C##" → "C𝄪", "Ebb" → "E𝄫". */
export function formatNote(name: SpelledNote): string {
  const { letter, acc } = getNote(name);
  const glyphs = acc
    .replace('##', '𝄪')
    .replace('bb', '𝄫')
    .replaceAll('#', '♯')
    .replaceAll('b', '♭');
  return letter + glyphs;
}

/** Display a sequence of spelled notes: "B♭ – C – D". */
export function formatNotes(names: SpelledNote[]): string {
  return names.map(formatNote).join(' – ');
}

/** Number of sharps and flats across some notes (a double counts as two). */
function accidentalCount(names: SpelledNote[]): number {
  return names.reduce((n, name) => n + Math.abs(getNote(name).alt), 0);
}

/**
 * Spell a pitch class as the root of something built on it (a scale or
 * chord): of its sharp and flat names, the one whose notes need the fewest
 * accidentals. A♯ major → B♭ major; ties go to the sharp name (F♯ major).
 */
export function spellRoot(
  note: Note,
  build: (root: SpelledNote) => SpelledNote[],
): SpelledNote {
  if (!note.includes('#')) return note;
  const flat = enharmonic(note);
  return accidentalCount(build(flat)) < accidentalCount(build(note)) ? flat : note;
}
