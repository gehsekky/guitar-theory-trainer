// Key signatures, derived from each key's spelled major scale: a letter is
// sharped or flatted in the signature exactly when it is in the scale.

import { get as getNote } from '@tonaljs/note';
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
  return { tonic, name: `${formatNote(tonic)} major`, accidentals, signature };
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
