// Core music-theory helpers shared by both trainers.

// Chromatic scale using sharps, anchored at A = 0.
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

// ---- Triads -------------------------------------------------------------

export type Quality = 'major' | 'minor' | 'diminished' | 'augmented';

export const QUALITY_LABEL: Record<Quality, string> = {
  major: 'major',
  minor: 'minor',
  diminished: 'diminished',
  augmented: 'augmented',
};

// Semitone offsets from the root for root / third / fifth.
export const TRIAD_INTERVALS: Record<Quality, [number, number, number]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
  augmented: [0, 4, 8],
};

/** The three notes of a triad, in root/third/fifth order. */
export function triadNotes(root: Note, quality: Quality): [Note, Note, Note] {
  const r = NOTE_INDEX[root];
  const [i1, i2, i3] = TRIAD_INTERVALS[quality];
  return [
    CHROMATIC[(r + i1) % 12],
    CHROMATIC[(r + i2) % 12],
    CHROMATIC[(r + i3) % 12],
  ];
}

// A general chord type (triad or seventh) as semitone offsets from the root.
// Kept separate from the 3-note Quality system so seventh chords can be added
// without affecting the triad-based trainers.
export interface ChordType {
  name: string;
  intervals: number[];
}

export const EAR_CHORDS_EASY: ChordType[] = [
  { name: 'major', intervals: [0, 4, 7] },
  { name: 'minor', intervals: [0, 3, 7] },
];

export const EAR_CHORDS_HARD: ChordType[] = [
  { name: 'major', intervals: [0, 4, 7] },
  { name: 'minor', intervals: [0, 3, 7] },
  { name: 'diminished', intervals: [0, 3, 6] },
  { name: 'augmented', intervals: [0, 4, 8] },
  { name: 'major 7th', intervals: [0, 4, 7, 11] },
  { name: 'dominant 7th', intervals: [0, 4, 7, 10] },
  { name: 'minor 7th', intervals: [0, 3, 7, 10] },
  { name: 'half-diminished 7th', intervals: [0, 3, 6, 10] },
  { name: 'diminished 7th', intervals: [0, 3, 6, 9] },
];

/** Notes of a chord from its root and interval offsets. */
export function chordNotes(root: Note, intervals: number[]): Note[] {
  const r = NOTE_INDEX[root];
  return intervals.map((i) => CHROMATIC[(r + i) % 12]);
}

// ---- Intervals -----------------------------------------------------------

export interface Interval {
  semitones: number;
  name: string;
  short: string;
}

export const INTERVALS: Interval[] = [
  { semitones: 1, name: 'Minor 2nd', short: 'm2' },
  { semitones: 2, name: 'Major 2nd', short: 'M2' },
  { semitones: 3, name: 'Minor 3rd', short: 'm3' },
  { semitones: 4, name: 'Major 3rd', short: 'M3' },
  { semitones: 5, name: 'Perfect 4th', short: 'P4' },
  { semitones: 6, name: 'Tritone', short: 'TT' },
  { semitones: 7, name: 'Perfect 5th', short: 'P5' },
  { semitones: 8, name: 'Minor 6th', short: 'm6' },
  { semitones: 9, name: 'Major 6th', short: 'M6' },
  { semitones: 10, name: 'Minor 7th', short: 'm7' },
  { semitones: 11, name: 'Major 7th', short: 'M7' },
  { semitones: 12, name: 'Octave', short: 'P8' },
];

/** Pitch class reached by going up `semitones` from a note. */
export function transpose(note: Note, semitones: number): Note {
  return CHROMATIC[(NOTE_INDEX[note] + semitones) % 12];
}

// ---- Scales --------------------------------------------------------------

export type ScaleType = 'major' | 'minor';

// Semitone offsets from the root for each scale degree.
// Major:         W-W-H-W-W-W-H
// Natural minor: W-H-W-W-H-W-W
export const SCALE_INTERVALS: Record<ScaleType, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
};

/** The seven notes of a scale, in degree order starting from the root. */
export function scaleNotes(root: Note, type: ScaleType): Note[] {
  const r = NOTE_INDEX[root];
  return SCALE_INTERVALS[type].map((i) => CHROMATIC[(r + i) % 12]);
}

// Functional names for each scale degree (index 0 = degree 1 = tonic).
// Degrees 1-6 share names across qualities; the 7th differs: a half-step
// below the tonic is the "leading tone" (major), a whole-step below is
// the "subtonic" (natural minor).
export const DEGREE_NAMES: Record<ScaleType, string[]> = {
  major: [
    'tonic',
    'supertonic',
    'mediant',
    'subdominant',
    'dominant',
    'submediant',
    'leading tone',
  ],
  minor: [
    'tonic',
    'supertonic',
    'mediant',
    'subdominant',
    'dominant',
    'submediant',
    'subtonic',
  ],
};

// Short notes on each degree's harmonic function and compositional use.
// Shown after grading as an educational blurb.
export const DEGREE_INFO: Record<ScaleType, string[]> = {
  major: [
    'Home base — the tonal center every other note pulls toward. Pieces usually begin and end here, and it is the point of ultimate rest.',
    'A classic pre-dominant: the ii chord built on it sets up the dominant and pushes the music toward a cadence.',
    'Sits midway between tonic and dominant, sharing notes with both. It carries the key’s major color and can stand in for the tonic as a softer resting point.',
    'The "away" pole opposite the dominant. Its IV chord creates gentle departure from home and powers the plagal "Amen" cadence.',
    'The engine of tonal music: it generates the most tension and drives hardest back home. The V–I authentic cadence is built on it.',
    'Root of the relative minor (vi). Used for deceptive cadences (V–vi) that dodge the expected resolution and extend a phrase.',
    'Only a half step below the tonic, it strains upward to resolve home. That pull gives the dominant chord its drive and defines major-key tension.',
  ],
  minor: [
    'Home base — the tonal center every other note pulls toward. Pieces usually begin and end here, and it is the point of ultimate rest.',
    'A pre-dominant heading toward the dominant. In minor the chord here is diminished (ii°), lending extra instability.',
    'In minor this degree is the root of the relative major, and it gives the key much of its darker color.',
    'The "away" pole opposite the dominant. Its iv chord creates gentle departure from home and supports the plagal cadence.',
    'Still the strongest pull home. In natural minor the dominant is a weaker minor chord, so composers often raise the 7th (harmonic minor) to forge a true leading tone and a strong V–i.',
    'Root of the relative major region; it also enables deceptive motion away from the tonic.',
    'A whole step below the tonic, so it lacks the sharp upward pull of a leading tone. It gives natural-minor, modal, and rock progressions their relaxed ♭VII descent.',
  ],
};

// ---- Diatonic chords -----------------------------------------------------

export interface DiatonicChord {
  numeral: string;
  quality: Quality;
}

// The triad quality on each scale degree, built from scale notes only.
// Major:  I  ii  iii  IV  V  vi  vii°
// Minor:  i  ii°  III  iv  v  VI  VII
export const DIATONIC: Record<ScaleType, DiatonicChord[]> = {
  major: [
    { numeral: 'I', quality: 'major' },
    { numeral: 'ii', quality: 'minor' },
    { numeral: 'iii', quality: 'minor' },
    { numeral: 'IV', quality: 'major' },
    { numeral: 'V', quality: 'major' },
    { numeral: 'vi', quality: 'minor' },
    { numeral: 'vii°', quality: 'diminished' },
  ],
  minor: [
    { numeral: 'i', quality: 'minor' },
    { numeral: 'ii°', quality: 'diminished' },
    { numeral: 'III', quality: 'major' },
    { numeral: 'iv', quality: 'minor' },
    { numeral: 'v', quality: 'minor' },
    { numeral: 'VI', quality: 'major' },
    { numeral: 'VII', quality: 'major' },
  ],
};

/** The three notes of the diatonic triad on a scale degree (stacked thirds). */
export function diatonicTriad(
  root: Note,
  type: ScaleType,
  degree: number,
): [Note, Note, Note] {
  const notes = scaleNotes(root, type);
  return [notes[degree], notes[(degree + 2) % 7], notes[(degree + 4) % 7]];
}

// ---- Random helpers -----------------------------------------------------

export function randomInt(maxExclusive: number): number {
  return Math.floor(Math.random() * maxExclusive);
}

export function randomNote(): Note {
  return CHROMATIC[randomInt(CHROMATIC.length)];
}

export function pick<T>(items: T[]): T {
  return items[randomInt(items.length)];
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
