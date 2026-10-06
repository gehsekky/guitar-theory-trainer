import { describe, expect, it } from 'vitest';
import {
  DURATIONS,
  DURATION_LABEL,
  FLAT_SIG_STEPS,
  KEYS,
  LETTERS,
  SHARP_SIG_STEPS,
  STEP_B4,
  STEP_E4,
  STEP_F5,
  keyAlter,
  letterOfStep,
  octaveOfStep,
  soundingNote,
  stepOf,
  type KeyDef,
} from './sheet';
import { NOTE_INDEX, scaleNotes, type Note } from './theory';

function key(name: string): KeyDef {
  const k = KEYS.find((k) => k.name === name);
  if (!k) throw new Error(`no key ${name}`);
  return k;
}

describe('staff steps', () => {
  it('places the treble staff lines at E4..F5', () => {
    expect(stepOf('E', 4)).toBe(STEP_E4);
    expect(stepOf('B', 4)).toBe(STEP_B4);
    expect(stepOf('F', 5)).toBe(STEP_F5);
  });

  it('round-trips letter and octave', () => {
    for (let octave = 2; octave <= 6; octave++) {
      for (const letter of LETTERS) {
        const step = stepOf(letter, octave);
        expect(letterOfStep(step)).toBe(letter);
        expect(octaveOfStep(step)).toBe(octave);
      }
    }
  });

  it('crosses the octave boundary between B and C', () => {
    expect(stepOf('C', 5) - stepOf('B', 4)).toBe(1);
  });

  it('draws key-signature accidentals on the matching letters', () => {
    expect(SHARP_SIG_STEPS.map(letterOfStep)).toEqual([
      'F', 'C', 'G', 'D', 'A', 'E', 'B',
    ]);
    expect(FLAT_SIG_STEPS.map(letterOfStep)).toEqual([
      'B', 'E', 'A', 'D', 'G', 'C', 'F',
    ]);
  });
});

describe('keyAlter', () => {
  it('alters nothing in C major', () => {
    for (const l of LETTERS) expect(keyAlter(l, key('C major'))).toBe(0);
  });

  it('sharps only the signature letters', () => {
    expect(keyAlter('F', key('G major'))).toBe(1);
    expect(keyAlter('C', key('G major'))).toBe(0);
    expect(keyAlter('C', key('D major'))).toBe(1);
    expect(keyAlter('G', key('D major'))).toBe(0);
  });

  it('flats only the signature letters', () => {
    expect(keyAlter('B', key('F major'))).toBe(-1);
    expect(keyAlter('E', key('F major'))).toBe(0);
    expect(keyAlter('E', key('B♭ major'))).toBe(-1);
    expect(keyAlter('A', key('B♭ major'))).toBe(0);
  });
});

// The key signature, applied to the seven letters, must spell the key's
// major scale. This validates KEYS, the sharp/flat orders and soundingNote
// together.
describe('every key signature spells its major scale', () => {
  const TONIC: Record<string, Note> = {
    C: 'C', G: 'G', D: 'D', A: 'A', E: 'E', B: 'B', 'F♯': 'F#',
    F: 'F', 'B♭': 'A#', 'E♭': 'D#', 'A♭': 'G#', 'D♭': 'C#', 'G♭': 'F#',
  };

  it.each(KEYS.map((k) => [k.name, k] as const))('%s', (_name, k) => {
    const tonic = TONIC[k.name.replace(' major', '')];
    const sounding = LETTERS.map((l) => soundingNote(stepOf(l, 4), 'none', k));
    expect(new Set(sounding)).toEqual(new Set(scaleNotes(tonic, 'major')));
  });
});

describe('soundingNote', () => {
  const C = key('C major');
  const D = key('D major');
  const Eb = key('E♭ major');

  it('returns naturals with no accidental in C major', () => {
    expect(soundingNote(stepOf('E', 4), 'none', C)).toBe('E');
  });

  it('applies the key signature when no accidental is written', () => {
    expect(soundingNote(stepOf('F', 4), 'none', D)).toBe('F#');
    expect(soundingNote(stepOf('B', 4), 'none', Eb)).toBe('A#');
  });

  it('lets a natural sign cancel the key signature', () => {
    expect(soundingNote(stepOf('F', 5), 'natural', D)).toBe('F');
    expect(soundingNote(stepOf('E', 4), 'natural', Eb)).toBe('E');
  });

  it('applies written sharps and flats regardless of key', () => {
    expect(soundingNote(stepOf('G', 4), 'sharp', C)).toBe('G#');
    expect(soundingNote(stepOf('D', 5), 'flat', C)).toBe('C#');
  });

  it('wraps enharmonics correctly', () => {
    expect(soundingNote(stepOf('C', 5), 'flat', C)).toBe('B');
    expect(soundingNote(stepOf('B', 4), 'sharp', C)).toBe('C');
    expect(soundingNote(stepOf('E', 4), 'sharp', C)).toBe('F');
    expect(soundingNote(stepOf('F', 4), 'flat', C)).toBe('E');
  });

  it('always returns a valid note', () => {
    for (const k of KEYS) {
      for (let step = 25; step <= 45; step++) {
        for (const acc of ['none', 'sharp', 'flat', 'natural'] as const) {
          expect(NOTE_INDEX[soundingNote(step, acc, k)]).toBeTypeOf('number');
        }
      }
    }
  });
});

describe('durations', () => {
  it('has a label for every duration', () => {
    expect(DURATIONS).toHaveLength(5);
    for (const d of DURATIONS) expect(DURATION_LABEL[d]).toBeTruthy();
  });
});
