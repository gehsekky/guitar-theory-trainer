import { describe, expect, it } from 'vitest';
import { createDisplayClock, speakerOffset } from './display';

describe('speakerOffset', () => {
  it('uses what the browser says is at the speakers', () => {
    const offset = speakerOffset({
      output: { contextTime: 10, performanceTime: 15000 },
      contextTime: 10.1,
      latency: 0.1,
      now: 15000,
    });
    expect(offset).toBe(5000);
  });

  it('falls back to the latency estimate without a timestamp', () => {
    const reading = { contextTime: 10, latency: 0.05, now: 12000 };
    expect(speakerOffset(reading)).toBeCloseTo(2050);
    expect(
      speakerOffset({ ...reading, output: { contextTime: 0, performanceTime: 0 } }),
    ).toBeCloseTo(2050);
  });

  it('ignores a timestamp that is implausibly far off', () => {
    const offset = speakerOffset({
      output: { contextTime: 2, performanceTime: 100 },
      contextTime: 10,
      latency: 0,
      now: 12000,
    });
    expect(offset).toBeCloseTo(2000);
  });
});

describe('createDisplayClock', () => {
  /** A reading whose offset comes out as `offset`, with no output timestamp. */
  const reading = (offset: number) => ({ contextTime: 0, latency: 0, now: offset });

  it('places a beat using the readings', () => {
    const clock = createDisplayClock();
    clock.sample(reading(5000));
    expect(clock.beatTime(10)).toBe(15000);
  });

  it('includes a long output delay, as with Bluetooth', () => {
    const clock = createDisplayClock();
    // The audio clock is at 10.3, but the speakers are only at 10.
    clock.sample({
      output: { contextTime: 10, performanceTime: 15000 },
      contextTime: 10.3,
      latency: 0.3,
      now: 15000,
    });
    expect(clock.beatTime(10.3)).toBeCloseTo(15300);
  });

  it('ignores noisy readings', () => {
    const clock = createDisplayClock();
    for (const offset of [5000, 5080, 5000, 4960, 5000]) clock.sample(reading(offset));
    expect(clock.beatTime(0)).toBe(5000);
  });

  it('follows a lasting change, like switching to Bluetooth', () => {
    const clock = createDisplayClock();
    for (let i = 0; i < 300; i++) clock.sample(reading(5000));
    for (let i = 0; i < 300; i++) clock.sample(reading(5200));
    expect(clock.beatTime(0)).toBe(5200);
  });

  it('forgets old readings on reset', () => {
    const clock = createDisplayClock();
    clock.sample(reading(5000));
    clock.reset();
    clock.sample(reading(9000));
    expect(clock.beatTime(0)).toBe(9000);
  });
});
