import { useState } from 'react';

// Settings persisted in localStorage, one key per setting. Keys and stored
// formats must stay stable: changing either silently resets saved settings.

const PREFIX = 'guitar-theory-trainer.';

/** How a setting is stored: `parse` returns undefined for invalid data. */
export interface Codec<T> {
  parse(raw: string): T | undefined;
  serialize(value: T): string;
}

/** One of a fixed set of strings, stored as-is. */
export function oneOf<T extends string>(values: readonly T[]): Codec<T> {
  return {
    parse: (raw) => (values.includes(raw as T) ? (raw as T) : undefined),
    serialize: (value) => value,
  };
}

/** A boolean, stored as "true" / "false". */
export const booleanCodec: Codec<boolean> = {
  parse: (raw) => (raw === 'true' ? true : raw === 'false' ? false : undefined),
  serialize: String,
};

/** JSON data, checked by `validate` (which may also clean it up). */
export function jsonCodec<T>(validate: (value: unknown) => T | undefined): Codec<T> {
  return {
    parse(raw) {
      try {
        return validate(JSON.parse(raw));
      } catch {
        return undefined;
      }
    },
    serialize: (value) => JSON.stringify(value),
  };
}

/** Read a setting, falling back when it's missing, invalid, or storage is
 * unavailable (private browsing, blocked site data). */
export function readSetting<T>(key: string, codec: Codec<T>, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (codec.parse(raw) ?? fallback);
  } catch {
    return fallback;
  }
}

export function writeSetting<T>(key: string, codec: Codec<T>, value: T) {
  try {
    localStorage.setItem(PREFIX + key, codec.serialize(value));
  } catch {
    // Storage unavailable: the setting just won't persist.
  }
}

/** useState backed by a saved setting. */
export function usePersistentState<T>(
  key: string,
  fallback: T,
  codec: Codec<T>,
): [T, (value: T) => void] {
  const [value, setValue] = useState(() => readSetting(key, codec, fallback));
  function set(next: T) {
    setValue(next);
    writeSetting(key, codec, next);
  }
  return [value, set];
}
