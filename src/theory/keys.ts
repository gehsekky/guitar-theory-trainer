// Key signatures, derived from each key's spelled major scale: a letter is
// sharped or flatted in the signature exactly when it is in the scale.

import { get as getNote, transpose } from '@tonaljs/note';
import { get as getScale } from '@tonaljs/scale';
import { formatNote, type SpelledNote } from './spelling';

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
export type Letter = (typeof LETTERS)[number];

/** How a key alters a letter: +1 sharp, -1 flat, 0 natural. */
export type Alter = -1 | 0 | 1;

export interface KeyDef {
  /** Spelled tonic, e.g. "Bb". */
  tonic: SpelledNote;
  /** Display name, e.g. "B♭ major". */
  name: string;
  /** The relative minor's spelled tonic, a minor 3rd below: "G". */
  minorTonic: SpelledNote;
  /** The relative minor's display name, e.g. "G minor". */
  minorName: string;
  /** Positive = number of sharps, negative = number of flats. */
  accidentals: number;
  /** The signature's alteration of each letter. */
  signature: Record<Letter, Alter>;
}

function majorKey(tonic: SpelledNote): KeyDef {
  const signature = {} as Record<Letter, Alter>;
  for (const name of getScale(`${tonic} major`).notes) {
    const { letter, alt } = getNote(name);
    signature[letter as Letter] = alt as Alter;
  }
  const accidentals = LETTERS.reduce((n, l) => n + signature[l], 0);
  const minorTonic = transpose(tonic, '-3m');
  return {
    tonic,
    name: `${formatNote(tonic)} major`,
    minorTonic,
    minorName: `${formatNote(minorTonic)} minor`,
    accidentals,
    signature,
  };
}

// Every major key signature, sharps then flats (F♯ and G♭ are both listed).
export const KEYS: KeyDef[] = [
  'C', 'G', 'D', 'A', 'E', 'B', 'F#',
  'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb',
].map(majorKey);

/** How the key signature alters a letter: +1 sharp, -1 flat, 0 natural. */
export function keyAlter(letter: Letter, key: KeyDef): Alter {
  return key.signature[letter];
}

// The order accidentals are written in a signature.
export const SHARP_ORDER: readonly Letter[] = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
export const FLAT_ORDER: readonly Letter[] = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

/** The accidentals in a key signature, in the order they're written:
 * D major → F♯ C♯. */
export function signatureNotes(key: KeyDef): SpelledNote[] {
  const count = Math.abs(key.accidentals);
  return key.accidentals >= 0
    ? SHARP_ORDER.slice(0, count).map((l) => `${l}#`)
    : FLAT_ORDER.slice(0, count).map((l) => `${l}b`);
}

/** How to read the major key from its signature, the way it's taught:
 * the last sharp is a half step below the key; the second-to-last flat is
 * the key; no accidentals and one flat are memorized. */
export function signatureRule(key: KeyDef): string {
  const notes = signatureNotes(key).map(formatNote);
  const major = key.name;
  if (notes.length === 0) return `No sharps or flats is ${major}.`;
  if (key.accidentals > 0) {
    return `The last sharp is ${notes.at(-1)}; a half step up is ${major}.`;
  }
  if (notes.length === 1) return `One flat (${notes[0]}) is ${major}, the one to memorize.`;
  return `The second-to-last flat, ${notes.at(-2)}, names the key: ${major}.`;
}
