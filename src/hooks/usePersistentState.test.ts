import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  booleanCodec,
  jsonCodec,
  oneOf,
  readSetting,
  writeSetting,
} from './usePersistentState';

function fakeStorage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}

let storage: ReturnType<typeof fakeStorage>;
beforeEach(() => {
  storage = fakeStorage();
  vi.stubGlobal('localStorage', storage);
});
afterEach(() => vi.unstubAllGlobals());

const mode = oneOf(['easy', 'hard'] as const);

describe('settings storage', () => {
  it('stores under the app prefix in the existing formats', () => {
    writeSetting('sheet-mode', mode, 'hard');
    writeSetting('scale-accidentals', booleanCodec, false);
    writeSetting('neck-strings', jsonCodec((v) => v as number[]), [1, 2]);
    expect(Object.fromEntries(storage.data)).toEqual({
      'guitar-theory-trainer.sheet-mode': 'hard',
      'guitar-theory-trainer.scale-accidentals': 'false',
      'guitar-theory-trainer.neck-strings': '[1,2]',
    });
  });

  it('round-trips values', () => {
    writeSetting('sheet-mode', mode, 'hard');
    expect(readSetting('sheet-mode', mode, 'easy')).toBe('hard');
    writeSetting('flag', booleanCodec, false);
    expect(readSetting('flag', booleanCodec, true)).toBe(false);
  });

  it('falls back when missing or invalid', () => {
    expect(readSetting('sheet-mode', mode, 'easy')).toBe('easy');
    storage.data.set('guitar-theory-trainer.sheet-mode', 'nonsense');
    expect(readSetting('sheet-mode', mode, 'easy')).toBe('easy');
    storage.data.set('guitar-theory-trainer.flag', 'yes');
    expect(readSetting('flag', booleanCodec, true)).toBe(true);
    storage.data.set('guitar-theory-trainer.list', '{not json');
    expect(readSetting('list', jsonCodec((v) => v as number[]), [0])).toEqual([0]);
  });

  it('lets JSON validators reject or clean data', () => {
    const nonEmpty = jsonCodec((v) =>
      Array.isArray(v) && v.length > 0 ? v.filter((n) => n < 6) : undefined,
    );
    storage.data.set('guitar-theory-trainer.s', '[]');
    expect(readSetting('s', nonEmpty, [9])).toEqual([9]);
    storage.data.set('guitar-theory-trainer.s', '[1,7,3]');
    expect(readSetting('s', nonEmpty, [9])).toEqual([1, 3]);
  });

  it('survives unavailable storage', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    expect(readSetting('sheet-mode', mode, 'easy')).toBe('easy');
    expect(() => writeSetting('sheet-mode', mode, 'hard')).not.toThrow();
  });
});
