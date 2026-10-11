import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initialTab, tabFromHash } from './useTabRoute';

const IDS = ['neck-notes', 'scales', 'drone'] as const;

describe('tabFromHash', () => {
  it('reads "#/id" and "#id"', () => {
    expect(tabFromHash('#/scales', IDS)).toBe('scales');
    expect(tabFromHash('#drone', IDS)).toBe('drone');
  });

  it('rejects empty and unknown hashes', () => {
    expect(tabFromHash('', IDS)).toBeUndefined();
    expect(tabFromHash('#/', IDS)).toBeUndefined();
    expect(tabFromHash('#/nope', IDS)).toBeUndefined();
  });
});

describe('initialTab', () => {
  let stored: Record<string, string>;
  beforeEach(() => {
    stored = {};
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => stored[k] ?? null,
      setItem: (k: string, v: string) => void (stored[k] = v),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('prefers the URL', () => {
    stored['guitar-theory-trainer.last-tab'] = 'drone';
    expect(initialTab('#/scales', IDS, 'neck-notes')).toBe('scales');
  });

  it('falls back to the last tab used, then the default', () => {
    expect(initialTab('', IDS, 'neck-notes')).toBe('neck-notes');
    stored['guitar-theory-trainer.last-tab'] = 'drone';
    expect(initialTab('', IDS, 'neck-notes')).toBe('drone');
    expect(initialTab('#/nope', IDS, 'neck-notes')).toBe('drone');
  });

  it('ignores a saved tab that no longer exists', () => {
    stored['guitar-theory-trainer.last-tab'] = 'removed-trainer';
    expect(initialTab('', IDS, 'neck-notes')).toBe('neck-notes');
  });
});
