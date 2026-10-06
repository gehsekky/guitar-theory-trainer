// Scales the app teaches. Each entry names a scale in Tonal's dictionary, so
// spelling and intervals come from Tonal; adding a scale is one entry here.

import { get as getScale } from '@tonaljs/scale';
import { semitones } from '@tonaljs/interval';
import { pitchClass, type Note } from './pitch';

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

/** The notes of a scale, in degree order starting from the root. */
export function scaleNotes(root: Note, type: ScaleType): Note[] {
  return getScale(`${root} ${SCALES[type].tonal}`).notes.map(pitchClass);
}
