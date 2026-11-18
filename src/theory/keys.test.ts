import { describe, expect, it } from 'vitest';
import { KEYS, signatureNotes, signatureRule, type KeyDef } from './index';

const key = (tonic: string): KeyDef => KEYS.find((k) => k.tonic === tonic)!;

describe('relative minors', () => {
  it('sit a minor 3rd below each major key', () => {
    expect(KEYS.map((k) => k.minorTonic)).toEqual([
      'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#',
      'D', 'G', 'C', 'F', 'Bb', 'Eb',
    ]);
  });

  it('are named for display', () => {
    expect(key('Bb').minorName).toBe('G minor');
    expect(key('F#').minorName).toBe('D♯ minor');
  });
});

describe('signatureNotes', () => {
  it('lists sharps and flats in the order they are written', () => {
    expect(signatureNotes(key('C'))).toEqual([]);
    expect(signatureNotes(key('D'))).toEqual(['F#', 'C#']);
    expect(signatureNotes(key('Ab'))).toEqual(['Bb', 'Eb', 'Ab', 'Db']);
    expect(signatureNotes(key('F#'))).toHaveLength(6);
  });

  it('matches the letters each key alters', () => {
    for (const k of KEYS) {
      const altered = Object.entries(k.signature).filter(([, alt]) => alt !== 0);
      expect(signatureNotes(k)).toHaveLength(altered.length);
    }
  });
});

describe('signatureRule', () => {
  it('reads sharp keys from the last sharp', () => {
    expect(signatureRule(key('E'))).toBe('The last sharp is D♯; a half step up is E major.');
  });

  it('reads flat keys from the second-to-last flat', () => {
    expect(signatureRule(key('Eb'))).toBe(
      'The second-to-last flat, E♭, names the key: E♭ major.',
    );
  });

  it('names the keys that are memorized', () => {
    expect(signatureRule(key('C'))).toBe('No sharps or flats is C major.');
    expect(signatureRule(key('F'))).toBe('One flat (B♭) is F major, the one to memorize.');
  });
});
