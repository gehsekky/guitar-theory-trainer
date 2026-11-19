import { describe, expect, it } from 'vitest';
import { diatonicChordName, diatonicTriad, voiceTriad, CHROMATIC, type Note } from './index';

const pitchClassOf = (midi: number): Note => CHROMATIC[(midi - 57 + 1200) % 12]; // A3 = 57

describe('voiceTriad', () => {
  it('puts the root alone in the bass, always in octave 3', () => {
    expect(voiceTriad(['C', 'E', 'G'])[0]).toBe(48); // C3
    // A high root keeps its octave-3 bass; the upper voices move above it.
    expect(voiceTriad(['B', 'D#', 'F#'])).toEqual([59, 63, 66, 71]); // B3 | D♯4 F♯4 B4
    for (const root of CHROMATIC) {
      for (let degree = 0; degree < 7; degree++) {
        const [bass] = voiceTriad(diatonicTriad(root, 'major', degree));
        expect(bass).toBeGreaterThanOrEqual(48); // C3
        expect(bass).toBeLessThanOrEqual(59); // B3
      }
    }
  });

  it('plays every chord tone above the bass, low to high', () => {
    for (const root of CHROMATIC) {
      for (let degree = 0; degree < 7; degree++) {
        const notes = diatonicTriad(root, 'major', degree);
        const [bass, ...upper] = voiceTriad(notes);
        expect(upper.every((m) => m > bass)).toBe(true);
        expect([...upper].sort((a, b) => a - b)).toEqual(upper);
        expect(new Set(upper.map(pitchClassOf))).toEqual(new Set(notes));
      }
    }
  });

  it('keeps the upper voices close together and in one register', () => {
    for (const root of CHROMATIC) {
      for (let degree = 0; degree < 7; degree++) {
        const [, low, , high] = voiceTriad(diatonicTriad(root, 'major', degree));
        expect(high - low).toBeLessThanOrEqual(9); // within a close-position triad
        expect(low).toBeGreaterThanOrEqual(55); // G3
        expect(high).toBeLessThanOrEqual(74); // D5
      }
    }
  });

  it('moves smoothly between chords: I to IV in C is C–E–G to C–F–A', () => {
    const [, ...one] = voiceTriad(['C', 'E', 'G']);
    const [, ...four] = voiceTriad(['F', 'A', 'C']);
    const moved = one.reduce((sum, m, i) => sum + Math.abs(m - four[i]), 0);
    expect(moved).toBeLessThanOrEqual(5);
  });
});

describe('diatonicChordName', () => {
  it('names each chord in a major key', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map((d) => diatonicChordName('C', 'major', d))).toEqual([
      'C', 'Dm', 'Em', 'F', 'G', 'Am', 'B°',
    ]);
  });

  it('spells chords for the key', () => {
    expect(diatonicChordName('F', 'major', 3)).toBe('B♭');
    expect(diatonicChordName('E', 'major', 2)).toBe('G♯m');
  });
});
