// Scales the app teaches. Each entry names a scale in Tonal's dictionary, so
// spelling and intervals come from Tonal; adding a scale is one entry here.
// Key scales (major and natural minor) also have a mode, which gives them
// seven named degrees and diatonic chords; pentatonics are just spelled.

import { get as getScale } from '@tonaljs/scale';
import { semitones } from '@tonaljs/interval';
import { degreeLabel } from './intervals';
import { pitchClass, type Note } from './pitch';
import { spellRoot, type SpelledNote } from './spelling';

interface ScaleDef {
  /** Scale name in Tonal's dictionary. */
  tonal: string;
  /** Key scales only: mode name used to derive diatonic chords (see
   * diatonic.ts). */
  mode?: string;
}

export const SCALES = {
  major: { tonal: 'major', mode: 'ionian' },
  minor: { tonal: 'aeolian', mode: 'aeolian' }, // natural minor
  majorPentatonic: { tonal: 'major pentatonic' },
  minorPentatonic: { tonal: 'minor pentatonic' },
} as const satisfies Record<string, ScaleDef>;

export type ScaleType = keyof typeof SCALES;

/** Scales that define a key: seven degrees, each with a diatonic chord. */
export const KEY_TYPES = ['major', 'minor'] as const satisfies readonly ScaleType[];
export type KeyType = (typeof KEY_TYPES)[number];

/** Semitone offsets from the root for each scale degree. */
export const SCALE_INTERVALS = Object.fromEntries(
  Object.entries(SCALES).map(([type, def]) => [
    type,
    getScale(`C ${def.tonal}`).intervals.map(semitones),
  ]),
) as Record<ScaleType, number[]>;

/** Each note's degree against the major scale, e.g. minor pentatonic is
 * root ♭3rd 4th 5th ♭7th. */
export const SCALE_DEGREES = Object.fromEntries(
  Object.entries(SCALES).map(([type, def]) => [
    type,
    getScale(`C ${def.tonal}`).intervals.map(degreeLabel),
  ]),
) as Record<ScaleType, string[]>;

/** A step between neighboring scale notes: Whole, Half, or the augmented
 * second (W+H) that scales like harmonic minor need. */
export type Step = 'W' | 'H' | 'W+H';

const STEP_NAMES: Record<number, Step> = { 1: 'H', 2: 'W', 3: 'W+H' };

/** Each scale's step pattern, root up to the octave: major is
 * W-W-H-W-W-W-H. */
export const SCALE_STEPS = Object.fromEntries(
  Object.entries(SCALE_INTERVALS).map(([type, offsets]) => [
    type,
    offsets.map((offset, i) => STEP_NAMES[(offsets[i + 1] ?? 12) - offset]),
  ]),
) as Record<ScaleType, Step[]>;

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
