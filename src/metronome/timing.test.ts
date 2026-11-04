import { describe, expect, it } from 'vitest';
import {
  MAX_BPM,
  MIN_BPM,
  accentOf,
  addTap,
  beatsIn,
  bpmFromTaps,
  clampBpm,
} from './timing';

describe('meters', () => {
  it.each([
    ['2/4', 2],
    ['3/4', 3],
    ['4/4', 4],
    ['6/8', 6],
  ] as const)('%s has %i clicks a bar', (meter, beats) => {
    expect(beatsIn(meter)).toBe(beats);
  });

  it('accents the downbeat', () => {
    expect(accentOf('4/4', 0)).toBe('strong');
    expect(accentOf('4/4', 1)).toBe('weak');
    expect(accentOf('4/4', 3)).toBe('weak');
  });

  it('gives 6/8 a second pulse on beat four', () => {
    expect(accentOf('6/8', 0)).toBe('strong');
    expect(accentOf('6/8', 3)).toBe('medium');
    expect(accentOf('6/8', 4)).toBe('weak');
  });
});

describe('clampBpm', () => {
  it('rounds and stays in range', () => {
    expect(clampBpm(120.4)).toBe(120);
    expect(clampBpm(1)).toBe(MIN_BPM);
    expect(clampBpm(999)).toBe(MAX_BPM);
  });
});

describe('tap tempo', () => {
  it('needs two taps', () => {
    expect(bpmFromTaps([])).toBeNull();
    expect(bpmFromTaps([1000])).toBeNull();
  });

  it('averages the gaps between taps', () => {
    expect(bpmFromTaps([0, 500])).toBe(120);
    expect(bpmFromTaps([0, 450, 1000, 1500])).toBe(120);
  });

  it('ignores two taps at the same instant', () => {
    expect(bpmFromTaps([1000, 1000])).toBeNull();
  });

  it('starts over after a long gap, but not at the slowest tempo', () => {
    expect(addTap([0, 500], 4000)).toEqual([4000]);
    expect(addTap([0], 2000)).toEqual([0, 2000]);
  });

  it('keeps only the most recent taps', () => {
    let taps: number[] = [];
    for (let t = 0; t <= 4000; t += 500) taps = addTap(taps, t);
    expect(taps).toEqual([1500, 2000, 2500, 3000, 3500, 4000]);
  });
});
