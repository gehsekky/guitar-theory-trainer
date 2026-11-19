import { describe, expect, it } from 'vitest';
import {
  CHROMATIC,
  INVERSIONS,
  STRING_SETS,
  TRIAD_TYPES,
  chordNotes,
  midiAt,
  noteAt,
  triadShapes,
  type TriadQuality,
} from './index';

const QUALITIES = Object.keys(TRIAD_TYPES) as TriadQuality[];

/** Every combination the trainer can ask about. */
function* everyTriad() {
  for (const root of CHROMATIC)
    for (const quality of QUALITIES)
      for (const inversion of INVERSIONS)
        for (const set of STRING_SETS) yield { root, quality, inversion, set };
}

describe('triadShapes', () => {
  it('finds C major root position on the D G B strings at the 10th fret', () => {
    // D string 10 (C), G string 9 (E), B string 8 (G).
    const set = STRING_SETS.find((s) => s.name === 'D G B')!;
    const frets = triadShapes('C', 'major', 0, set).map((s) => s.positions.map((p) => p.fret));
    expect(frets).toContainEqual([10, 9, 8]);
  });

  it('has a shape for every root, quality, inversion, and string set', () => {
    for (const { root, quality, inversion, set } of everyTriad()) {
      expect(triadShapes(root, quality, inversion, set).length).toBeGreaterThan(0);
    }
  });

  it('plays the chord, one tone per string, with the inversion in the bass', () => {
    for (const { root, quality, inversion, set } of everyTriad()) {
      const notes = chordNotes(root, TRIAD_TYPES[quality].intervals);
      for (const { positions, tones } of triadShapes(root, quality, inversion, set)) {
        expect(positions.map((p) => p.stringIndex)).toEqual(set.strings);
        // Each position plays the tone it says it does, and all three sound.
        positions.forEach((p, i) => expect(noteAt(p.stringIndex, p.fret)).toBe(notes[tones[i]]));
        expect(new Set(tones)).toEqual(new Set([0, 1, 2]));
        expect(tones[0]).toBe(inversion);
      }
    }
  });

  it('stacks the notes in close position: rising, within an octave', () => {
    for (const { root, quality, inversion, set } of everyTriad()) {
      for (const { positions } of triadShapes(root, quality, inversion, set)) {
        const [a, b, c] = positions.map((p) => midiAt(p.stringIndex, p.fret));
        expect(a < b && b < c).toBe(true);
        expect(c - a).toBeLessThan(12);
      }
    }
  });

  it('only gives shapes a hand can play', () => {
    for (const { root, quality, inversion, set } of everyTriad()) {
      for (const { positions } of triadShapes(root, quality, inversion, set)) {
        const frets = positions.map((p) => p.fret);
        expect(Math.max(...frets) - Math.min(...frets)).toBeLessThanOrEqual(4);
        expect(Math.min(...frets)).toBeGreaterThanOrEqual(0);
        expect(Math.max(...frets)).toBeLessThanOrEqual(22);
      }
    }
  });
});
