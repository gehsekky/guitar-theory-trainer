import { afterEach, describe, expect, it, vi } from 'vitest';
import { CHROMATIC, type Note } from './theory';
import { pick, randomInt, randomNote } from './random';

describe('random helpers', () => {
  afterEach(() => vi.restoreAllMocks());

  it('randomInt stays in [0, max)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(randomInt(7)).toBe(0);
    vi.spyOn(Math, 'random').mockReturnValue(0.9999);
    expect(randomInt(7)).toBe(6);
  });

  it('randomNote and pick return members of their input', () => {
    for (let i = 0; i < 50; i++) {
      expect(CHROMATIC).toContain(randomNote());
      expect(['x', 'y', 'z']).toContain(pick(['x', 'y', 'z']));
    }
  });

  it('pick maps the random value onto the list', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(pick<Note>(['C', 'D', 'E', 'F'])).toBe('E');
  });
});
