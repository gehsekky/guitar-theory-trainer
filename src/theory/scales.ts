// Scales the app teaches. Each entry names a scale in Tonal's dictionary, so
// spelling and intervals come from Tonal; adding a scale is one entry here.

import { get as getScale } from '@tonaljs/scale';
import { semitones } from '@tonaljs/interval';
import { pitchClass, type Note } from './pitch';
import { spellRoot, type SpelledNote } from './spelling';

interface ScaleDef {
  /** Scale name in Tonal's dictionary. */
  tonal: string;
  /** Mode name used to derive diatonic chords (see diatonic.ts). */
  mode: string;
}

export const SCALES = {
  major: { tonal: 'major', mode: 'ionian' },
  minor: { tonal: 'aeolian', mode: 'aeolian' }, // natural minor
} as const satisfies Record<string, ScaleDef>;

export type ScaleType = keyof typeof SCALES;

/** Semitone offsets from the root for each scale degree. */
export const SCALE_INTERVALS = Object.fromEntries(
  Object.entries(SCALES).map(([type, def]) => [
    type,
    getScale(`C ${def.tonal}`).intervals.map(semitones),
  ]),
) as Record<ScaleType, number[]>;

function scaleOn(tonic: SpelledNote, type: ScaleType): SpelledNote[] {
  return getScale(`${tonic} ${SCALES[type].tonal}`).notes;
}

/** The notes of a scale, in degree order starting from the root. */
export function scaleNotes(root: Note, type: ScaleType): Note[] {
  return scaleOn(root, type).map(pitchClass);
}

/** How to spell a key's tonic: the spelling whose scale needs the fewest
 * accidentals (A♯ major → B♭ major, D♭ major rather than C♯). */
export function keyTonic(root: Note, type: ScaleType): SpelledNote {
  return spellRoot(root, (tonic) => scaleOn(tonic, type));
}

/** A scale's notes as spelled in its key: F major → F G A B♭ C D E. */
export function spellScale(root: Note, type: ScaleType): SpelledNote[] {
  return scaleOn(keyTonic(root, type), type);
}
