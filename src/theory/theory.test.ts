import { describe, expect, it } from 'vitest';
import {
  CHORD_TYPES,
  CHROMATIC,
  DEGREE_INFO,
  DEGREE_NAMES,
  DIATONIC,
  EAR_CHORDS_EASY,
  EAR_CHORDS_HARD,
  FRET_COUNT,
  INTERVALS,
  NATURAL_NOTES,
  NOTE_INDEX,
  QUALITY_LABEL,
  KEY_TYPES,
  SCALE_DEGREES,
  SCALE_STEPS,
  STRINGS,
  TRIAD_INTERVALS,
  chordNotes,
  diatonicTriad,
  displayNote,
  noteAt,
  pitchClass,
  sameNoteOrder,
  sameNoteSet,
  scaleNotes,
  spellScale,
  transpose,
  triadNotes,
} from './index';

describe('chromatic scale', () => {
  it('has 12 unique notes indexed consistently', () => {
    expect(new Set(CHROMATIC).size).toBe(12);
    CHROMATIC.forEach((note, i) => expect(NOTE_INDEX[note]).toBe(i));
  });

  it('lists the seven naturals', () => {
    expect(NATURAL_NOTES).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
  });
});

describe('fretboard', () => {
  it('uses standard tuning, low to high', () => {
    expect(STRINGS.map((s) => s.label)).toEqual(['E', 'A', 'D', 'G', 'B', 'E']);
  });

  it('returns open-string notes at fret 0', () => {
    STRINGS.forEach((s, i) => expect(noteAt(i, 0)).toBe(s.label));
  });

  it.each([
    [0, 1, 'F'],
    [0, 5, 'A'],
    [1, 3, 'C'],
    [2, 2, 'E'],
    [3, 4, 'B'],
    [4, 1, 'C'],
    [5, 3, 'G'],
    [0, 12, 'E'],
    [5, 22, 'D'],
  ] as const)('string %i fret %i is %s', (string, fret, note) => {
    expect(noteAt(string, fret)).toBe(note);
  });

  it('matches the next string at the usual unison frets', () => {
    // 5th fret = next open string, except G→B which is the 4th fret.
    for (let i = 0; i < 5; i++) {
      const fret = i === 3 ? 4 : 5;
      expect(noteAt(i, fret)).toBe(STRINGS[i + 1].label);
    }
  });

  it('has 22 frets', () => {
    expect(FRET_COUNT).toBe(22);
  });
});

describe('displayNote', () => {
  it('leaves naturals alone', () => {
    expect(displayNote('C')).toBe('C');
    expect(displayNote('B')).toBe('B');
  });

  it('shows both spellings for accidentals', () => {
    expect(displayNote('A#')).toBe('A♯/B♭');
    expect(displayNote('C#')).toBe('C♯/D♭');
    expect(displayNote('D#')).toBe('D♯/E♭');
    expect(displayNote('F#')).toBe('F♯/G♭');
    expect(displayNote('G#')).toBe('G♯/A♭');
  });
});

describe('transpose', () => {
  it('moves up by semitones and wraps around the octave', () => {
    expect(transpose('C', 4)).toBe('E');
    expect(transpose('A', 3)).toBe('C');
    expect(transpose('G', 7)).toBe('D');
    expect(transpose('B', 12)).toBe('B');
    expect(transpose('E', 0)).toBe('E');
  });
});

describe('triads', () => {
  it.each([
    ['C', 'major', ['C', 'E', 'G']],
    ['A', 'minor', ['A', 'C', 'E']],
    ['B', 'diminished', ['B', 'D', 'F']],
    ['C', 'augmented', ['C', 'E', 'G#']],
    ['F#', 'major', ['F#', 'A#', 'C#']],
    ['D#', 'minor', ['D#', 'F#', 'A#']],
  ] as const)('%s %s is %j', (root, quality, expected) => {
    expect(triadNotes(root, quality)).toEqual(expected);
  });

  it('has a label for every quality', () => {
    for (const q of Object.keys(TRIAD_INTERVALS)) {
      expect(QUALITY_LABEL[q as keyof typeof QUALITY_LABEL]).toBeTruthy();
    }
  });
});

describe('chordNotes', () => {
  it('builds seventh chords', () => {
    expect(chordNotes('C', [0, 4, 7, 11])).toEqual(['C', 'E', 'G', 'B']);
    expect(chordNotes('G', [0, 4, 7, 10])).toEqual(['G', 'B', 'D', 'F']);
    expect(chordNotes('B', [0, 3, 6, 10])).toEqual(['B', 'D', 'F', 'A']);
    expect(chordNotes('B', [0, 3, 6, 9])).toEqual(['B', 'D', 'F', 'G#']);
  });

  it('agrees with triadNotes for triad qualities', () => {
    for (const root of CHROMATIC) {
      for (const [q, ivs] of Object.entries(TRIAD_INTERVALS)) {
        expect(chordNotes(root, ivs)).toEqual(
          triadNotes(root, q as keyof typeof TRIAD_INTERVALS),
        );
      }
    }
  });
});

describe('ear-training chord sets', () => {
  it('easy is a subset of hard', () => {
    const hard = new Set(EAR_CHORDS_HARD.map((c) => c.name));
    EAR_CHORDS_EASY.forEach((c) => expect(hard.has(c.name)).toBe(true));
  });

  it('has unique names and unique interval shapes', () => {
    const names = EAR_CHORDS_HARD.map((c) => c.name);
    const shapes = EAR_CHORDS_HARD.map((c) => c.intervals.join(','));
    expect(new Set(names).size).toBe(names.length);
    expect(new Set(shapes).size).toBe(shapes.length);
  });

  it('every chord starts on the root and ascends within an octave', () => {
    for (const c of EAR_CHORDS_HARD) {
      expect(c.intervals[0]).toBe(0);
      for (let i = 1; i < c.intervals.length; i++) {
        expect(c.intervals[i]).toBeGreaterThan(c.intervals[i - 1]);
      }
      expect(c.intervals.at(-1)).toBeLessThan(12);
    }
  });
});

describe('intervals', () => {
  it('covers minor 2nd through octave, one per semitone', () => {
    expect(INTERVALS.map((i) => i.semitones)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
  });
});

describe('scales', () => {
  it('spells major scales', () => {
    expect(scaleNotes('C', 'major')).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
    expect(scaleNotes('G', 'major')).toEqual(['G', 'A', 'B', 'C', 'D', 'E', 'F#']);
    expect(scaleNotes('E', 'major')).toEqual([
      'E', 'F#', 'G#', 'A', 'B', 'C#', 'D#',
    ]);
  });

  it('spells natural minor scales', () => {
    expect(scaleNotes('A', 'minor')).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
    expect(scaleNotes('E', 'minor')).toEqual(['E', 'F#', 'G', 'A', 'B', 'C', 'D']);
  });

  it('relative major and minor share the same notes', () => {
    for (const root of CHROMATIC) {
      const relMinor = transpose(root, 9);
      expect(sameNoteSet(scaleNotes(root, 'major'), scaleNotes(relMinor, 'minor')))
        .toBe(true);
    }
  });

  it('major follows W-W-H-W-W-W-H', () => {
    expect(SCALE_STEPS.major).toEqual(['W', 'W', 'H', 'W', 'W', 'W', 'H']);
  });

  it('label degrees with their accidentals', () => {
    expect(SCALE_DEGREES.major.join(' ')).toBe('root 2nd 3rd 4th 5th 6th 7th');
    expect(SCALE_DEGREES.minor.join(' ')).toBe('root 2nd ♭3rd 4th 5th ♭6th ♭7th');
  });

  it('natural minor follows W-H-W-W-H-W-W', () => {
    expect(SCALE_STEPS.minor).toEqual(['W', 'H', 'W', 'W', 'H', 'W', 'W']);
  });

  it('spells pentatonic scales', () => {
    expect(scaleNotes('C', 'majorPentatonic')).toEqual(['C', 'D', 'E', 'G', 'A']);
    expect(scaleNotes('A', 'minorPentatonic')).toEqual(['A', 'C', 'D', 'E', 'G']);
    expect(spellScale('A#', 'minorPentatonic')).toEqual(['Bb', 'Db', 'Eb', 'F', 'Ab']);
  });

  it('pentatonics skip degrees and step by W+H', () => {
    expect(SCALE_DEGREES.majorPentatonic.join(' ')).toBe('root 2nd 3rd 5th 6th');
    expect(SCALE_DEGREES.minorPentatonic.join(' ')).toBe('root ♭3rd 4th 5th ♭7th');
    expect(SCALE_STEPS.majorPentatonic).toEqual(['W', 'W', 'W+H', 'W', 'W+H']);
    expect(SCALE_STEPS.minorPentatonic).toEqual(['W+H', 'W', 'W', 'W+H', 'W']);
  });

  it('only major and minor are keys with diatonic chords', () => {
    expect(KEY_TYPES).toEqual(['major', 'minor']);
    expect(Object.keys(DIATONIC)).toEqual(['major', 'minor']);
  });
});

describe('scale degrees', () => {
  it('has seven names and descriptions per scale type', () => {
    for (const type of ['major', 'minor'] as const) {
      expect(DEGREE_NAMES[type]).toHaveLength(7);
      expect(DEGREE_INFO[type]).toHaveLength(7);
    }
  });

  it('names the 7th degree by its distance to the tonic', () => {
    expect(DEGREE_NAMES.major[6]).toBe('leading tone');
    expect(DEGREE_NAMES.minor[6]).toBe('subtonic');
  });
});

describe('diatonic chords', () => {
  it('lists the standard numerals', () => {
    expect(DIATONIC.major.map((c) => c.numeral)).toEqual([
      'I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°',
    ]);
    expect(DIATONIC.minor.map((c) => c.numeral)).toEqual([
      'i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII',
    ]);
  });

  it('builds diatonic triads from scale notes', () => {
    expect(diatonicTriad('C', 'major', 0)).toEqual(['C', 'E', 'G']);
    expect(diatonicTriad('C', 'major', 4)).toEqual(['G', 'B', 'D']);
    expect(diatonicTriad('C', 'major', 6)).toEqual(['B', 'D', 'F']);
    expect(diatonicTriad('A', 'minor', 1)).toEqual(['B', 'D', 'F']);
    expect(diatonicTriad('A', 'minor', 6)).toEqual(['G', 'B', 'D']);
  });

  // Ties the numeral table to the actual theory: each listed quality must
  // match the triad built from scale notes, in every key.
  it.each(['major', 'minor'] as const)(
    'listed qualities match the built triads in every %s key',
    (type) => {
      for (const root of CHROMATIC) {
        const scale = scaleNotes(root, type);
        DIATONIC[type].forEach((chord, degree) => {
          expect(diatonicTriad(root, type, degree)).toEqual(
            triadNotes(scale[degree], chord.quality),
          );
        });
      }
    },
  );
});

describe('sameNoteOrder', () => {
  it('requires the same notes in the same positions', () => {
    expect(sameNoteOrder(['C', 'E', 'G'], ['C', 'E', 'G'])).toBe(true);
    expect(sameNoteOrder(['E', 'G', 'C'], ['C', 'E', 'G'])).toBe(false);
  });

  it('rejects different lengths', () => {
    expect(sameNoteOrder(['C', 'E', 'G'], ['C', 'E', 'G', 'B'])).toBe(false);
  });
});

describe('sameNoteSet', () => {
  it('ignores order', () => {
    expect(sameNoteSet(['C', 'E', 'G'], ['G', 'C', 'E'])).toBe(true);
  });

  it('rejects different sets or lengths', () => {
    expect(sameNoteSet(['C', 'E', 'G'], ['C', 'E', 'G#'])).toBe(false);
    expect(sameNoteSet(['C', 'E'], ['C', 'E', 'G'])).toBe(false);
  });
});

describe('pitchClass', () => {
  it('maps any spelling to the sharp-named pitch class', () => {
    expect(pitchClass('Bb')).toBe('A#');
    expect(pitchClass('E#')).toBe('F');
    expect(pitchClass('Cb')).toBe('B');
    expect(pitchClass('C##')).toBe('D');
    expect(pitchClass('Ebb')).toBe('D');
    expect(pitchClass('G#4')).toBe('G#');
  });

  it('round-trips every pitch class', () => {
    for (const note of CHROMATIC) expect(pitchClass(note)).toBe(note);
  });

  it('rejects non-notes', () => {
    expect(() => pitchClass('H')).toThrow();
  });
});

describe('chord types (from Tonal)', () => {
  it('have the expected intervals', () => {
    expect(CHORD_TYPES.major.intervals).toEqual([0, 4, 7]);
    expect(CHORD_TYPES.minor.intervals).toEqual([0, 3, 7]);
    expect(CHORD_TYPES.diminished.intervals).toEqual([0, 3, 6]);
    expect(CHORD_TYPES.augmented.intervals).toEqual([0, 4, 8]);
    expect(CHORD_TYPES.major7.intervals).toEqual([0, 4, 7, 11]);
    expect(CHORD_TYPES.dominant7.intervals).toEqual([0, 4, 7, 10]);
    expect(CHORD_TYPES.minor7.intervals).toEqual([0, 3, 7, 10]);
    expect(CHORD_TYPES.halfDiminished7.intervals).toEqual([0, 3, 6, 10]);
    expect(CHORD_TYPES.diminished7.intervals).toEqual([0, 3, 6, 9]);
  });

  it('label each tone with its degree and accidental', () => {
    const degrees = Object.fromEntries(
      Object.entries(CHORD_TYPES).map(([key, chord]) => [key, chord.degrees.join(' ')]),
    );
    expect(degrees).toEqual({
      major: 'root 3rd 5th',
      minor: 'root ♭3rd 5th',
      diminished: 'root ♭3rd ♭5th',
      augmented: 'root 3rd ♯5th',
      major7: 'root 3rd 5th 7th',
      dominant7: 'root 3rd 5th ♭7th',
      minor7: 'root ♭3rd 5th ♭7th',
      halfDiminished7: 'root ♭3rd ♭5th ♭7th',
      diminished7: 'root ♭3rd ♭5th 𝄫7th',
    });
  });
});
