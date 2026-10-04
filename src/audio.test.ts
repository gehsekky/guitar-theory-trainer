import { describe, expect, it } from 'vitest';
import { freqOfMidi, midiOf } from './audio';

describe('midiOf', () => {
  it.each([
    ['A', 4, 69],
    ['C', 4, 60],
    ['B', 3, 59],
    ['C', 5, 72],
    ['E', 2, 40], // low E string
    ['E', 4, 64], // high E string
    ['G#', 4, 68],
    ['A#', 4, 70],
  ] as const)('%s%i is MIDI %i', (note, octave, midi) => {
    expect(midiOf(note, octave)).toBe(midi);
  });
});

describe('freqOfMidi', () => {
  it('tunes A4 to 440 Hz', () => {
    expect(freqOfMidi(69)).toBe(440);
  });

  it('doubles per octave', () => {
    expect(freqOfMidi(81)).toBeCloseTo(880);
    expect(freqOfMidi(57)).toBeCloseTo(220);
  });

  it('gives middle C ≈ 261.63 Hz', () => {
    expect(freqOfMidi(60)).toBeCloseTo(261.63, 2);
  });
});
