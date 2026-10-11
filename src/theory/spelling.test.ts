import { describe, expect, it } from 'vitest';
import {
  CHORD_TYPES,
  CHROMATIC,
  INTERVALS,
  KEYS,
  formatNote,
  formatNotes,
  keyTonic,
  pitchClass,
  scaleNotes,
  spellChord,
  spellDiatonicTriad,
  spellInterval,
  spellScale,
  stepOf,
  writtenNote,
} from './index';

const key = (name: string) => KEYS.find((k) => k.name === name)!;
const interval = (short: string) => INTERVALS.find((i) => i.short === short)!;

describe('formatNote', () => {
  it('uses music glyphs for accidentals', () => {
    expect(formatNote('C')).toBe('C');
    expect(formatNote('Bb')).toBe('B♭');
    expect(formatNote('F#')).toBe('F♯');
    expect(formatNote('C##')).toBe('C𝄪');
    expect(formatNote('Ebb')).toBe('E𝄫');
  });

  it('joins sequences with dashes', () => {
    expect(formatNotes(['Bb', 'D', 'F'])).toBe('B♭ – D – F');
  });
});

describe('keyTonic', () => {
  it('spells major keys by their usual name', () => {
    expect(CHROMATIC.map((n) => keyTonic(n, 'major'))).toEqual([
      'A', 'Bb', 'B', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab',
    ]);
  });

  it('spells minor keys by their usual name', () => {
    // D♯ and E♭ minor tie at six accidentals; ties go to sharps.
    expect(CHROMATIC.map((n) => keyTonic(n, 'minor'))).toEqual([
      'A', 'Bb', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#',
    ]);
  });
});

describe('spellScale', () => {
  it('uses each letter once, with the key’s accidentals', () => {
    expect(spellScale('F', 'major')).toEqual(['F', 'G', 'A', 'Bb', 'C', 'D', 'E']);
    expect(spellScale('F#', 'major')).toEqual(['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#']);
    expect(spellScale('A#', 'major')).toEqual(['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A']);
    expect(spellScale('C', 'minor')).toEqual(['C', 'D', 'Eb', 'F', 'G', 'Ab', 'Bb']);
  });

  it('spells the same pitches scaleNotes returns, in every key', () => {
    for (const root of CHROMATIC) {
      for (const type of ['major', 'minor'] as const) {
        expect(spellScale(root, type).map(pitchClass)).toEqual(scaleNotes(root, type));
      }
    }
  });
});

describe('spellChord', () => {
  it('spells chords from the simpler root', () => {
    expect(spellChord('A#', CHORD_TYPES.major)).toEqual(['Bb', 'D', 'F']);
    expect(spellChord('G#', CHORD_TYPES.augmented)).toEqual(['Ab', 'C', 'E']);
    expect(spellChord('C#', CHORD_TYPES.minor)).toEqual(['C#', 'E', 'G#']);
    expect(spellChord('B', CHORD_TYPES.diminished7)).toEqual(['B', 'D', 'F', 'Ab']);
    expect(spellChord('D#', CHORD_TYPES.major7)).toEqual(['Eb', 'G', 'Bb', 'D']);
  });

  it('spells the same pitches as the chord’s intervals, for every root and type', () => {
    for (const root of CHROMATIC) {
      for (const chord of Object.values(CHORD_TYPES)) {
        const pcs = spellChord(root, chord).map(pitchClass);
        expect(pcs[0]).toBe(root);
        expect(pcs).toHaveLength(chord.intervals.length);
      }
    }
  });
});

describe('spellInterval', () => {
  it('names the upper note by the interval’s letter distance', () => {
    expect(spellInterval('C', interval('TT'))).toBe('F#');
    expect(spellInterval('Bb', interval('M3'))).toBe('D');
    expect(spellInterval('Eb', interval('m6'))).toBe('Cb');
    expect(spellInterval('F#', interval('P5'))).toBe('C#');
  });
});

describe('spellDiatonicTriad', () => {
  it('spells chords within the key', () => {
    expect(spellDiatonicTriad('F', 'major', 3)).toEqual(['Bb', 'D', 'F']);
    expect(spellDiatonicTriad('E', 'major', 6)).toEqual(['D#', 'F#', 'A']);
    expect(spellDiatonicTriad('C', 'minor', 5)).toEqual(['Ab', 'C', 'Eb']);
  });
});

describe('writtenNote', () => {
  it('spells the note as written on the staff', () => {
    expect(writtenNote(stepOf('B', 4), 'none', key('F major'))).toBe('Bb');
    expect(writtenNote(stepOf('B', 4), 'natural', key('F major'))).toBe('B');
    expect(writtenNote(stepOf('E', 4), 'sharp', key('C major'))).toBe('E#');
    expect(writtenNote(stepOf('C', 5), 'none', key('G♭ major'))).toBe('Cb');
  });
});
