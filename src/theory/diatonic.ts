// Diatonic chords: the triad built on each degree of a scale, with its Roman
// numeral. Derived from the scale's mode in Tonal rather than a hand-written
// table, so any scale added to SCALES gets its chords automatically.

import { get as getChord } from '@tonaljs/chord';
import { triads } from '@tonaljs/mode';
import { scaleNotes, SCALES, type ScaleType } from './scales';
import type { Quality } from './chords';
import type { Note } from './pitch';

export interface DiatonicChord {
  numeral: string;
  quality: Quality;
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

/** Roman numeral for a triad: upper case for major/augmented, ° for dim, + for aug. */
function numeral(degree: number, quality: Quality): string {
  const roman = ROMAN[degree];
  switch (quality) {
    case 'major':
      return roman;
    case 'minor':
      return roman.toLowerCase();
    case 'diminished':
      return `${roman.toLowerCase()}°`;
    case 'augmented':
      return `${roman}+`;
  }
}

function diatonicChords(type: ScaleType): DiatonicChord[] {
  return triads(SCALES[type].mode, 'C').map((symbol, degree) => {
    const quality = getChord(symbol).quality.toLowerCase() as Quality;
    return { numeral: numeral(degree, quality), quality };
  });
}

// Major:  I  ii  iii  IV  V  vi  vii°
// Minor:  i  ii°  III  iv  v  VI  VII
export const DIATONIC = Object.fromEntries(
  Object.keys(SCALES).map((type) => [type, diatonicChords(type as ScaleType)]),
) as Record<ScaleType, DiatonicChord[]>;

/** The three notes of the diatonic triad on a scale degree (stacked thirds). */
export function diatonicTriad(
  root: Note,
  type: ScaleType,
  degree: number,
): [Note, Note, Note] {
  const notes = scaleNotes(root, type);
  const at = (i: number) => notes[(degree + i) % notes.length];
  return [at(0), at(2), at(4)];
}
