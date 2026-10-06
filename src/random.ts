// Randomness for quiz rounds. Kept out of the theory layer, which stays pure.

import { CHROMATIC, type Note } from './theory';

export function randomInt(maxExclusive: number): number {
  return Math.floor(Math.random() * maxExclusive);
}

export function pick<T>(items: readonly T[]): T {
  return items[randomInt(items.length)];
}

export function randomNote(): Note {
  return pick(CHROMATIC);
}
