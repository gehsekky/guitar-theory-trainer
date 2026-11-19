import { describe, expect, it } from 'vitest';
import { resolution } from './index';

describe('resolution', () => {
  it('leaves the tonic where it is', () => {
    expect(resolution(0)).toEqual([0]);
  });

  it('walks degrees 2–4 down the major scale to 1', () => {
    expect(resolution(2)).toEqual([2, 0]); // 2 → 1
    expect(resolution(4)).toEqual([4, 2, 0]); // 3 → 2 → 1
    expect(resolution(5)).toEqual([5, 4, 2, 0]); // 4 → 3 → 2 → 1
  });

  it('walks degrees 5–7 up to the octave', () => {
    expect(resolution(7)).toEqual([7, 9, 11, 12]); // 5 → 6 → 7 → 1
    expect(resolution(9)).toEqual([9, 11, 12]); // 6 → 7 → 1
    expect(resolution(11)).toEqual([11, 12]); // 7 → 1
  });

  it('moves chromatic notes onto the scale toward the nearer tonic', () => {
    expect(resolution(1)).toEqual([1, 0]); // ♭2 → 1
    expect(resolution(3)).toEqual([3, 2, 0]); // ♭3 → 2 → 1
    expect(resolution(6)).toEqual([6, 7, 9, 11, 12]); // ♯4 → 5 → 6 → 7 → 1
    expect(resolution(8)).toEqual([8, 9, 11, 12]); // ♭6 → 6 → 7 → 1
    expect(resolution(10)).toEqual([10, 11, 12]); // ♭7 → 7 → 1
  });

  it('only ever steps (never leaps more than a whole step)', () => {
    for (let s = 0; s < 12; s++) {
      const path = resolution(s);
      for (let i = 1; i < path.length; i++) {
        expect(Math.abs(path[i] - path[i - 1])).toBeLessThanOrEqual(2);
      }
      expect([0, 12]).toContain(path.at(-1));
    }
  });
});
