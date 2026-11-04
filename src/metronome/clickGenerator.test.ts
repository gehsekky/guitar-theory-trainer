import { describe, expect, it } from 'vitest';
import { createClickGenerator, type ClickGenerator } from './clickGenerator';

const RATE = 48000;
const LEAD_IN = 2400; // 0.05 s
const BLOCK = 128;

interface Beat {
  beat: number;
  frame: number;
}

/** Render `seconds` of audio and collect the beats that were reported. */
function run(generator: ClickGenerator, seconds: number, rate = RATE, block = BLOCK) {
  const beats: Beat[] = [];
  const output = new Float32Array(block);
  for (let i = 0; i < Math.ceil((seconds * rate) / block); i++) {
    generator.render(output, (beat, frame) => beats.push({ beat, frame }));
  }
  return beats;
}

describe('createClickGenerator timing', () => {
  it('puts beats exactly the right number of samples apart', () => {
    const beats = run(createClickGenerator(RATE, 120, '4/4'), 3);
    expect(beats.map((b) => b.frame)).toEqual(
      [0, 1, 2, 3, 4, 5].map((n) => LEAD_IN + n * 24000),
    );
    expect(beats.map((b) => b.beat)).toEqual([0, 1, 2, 3, 0, 1]);
  });

  it.each([
    [48000, 137],
    [44100, 97],
    [44100, 233],
  ])('never drifts over an hour at %i Hz and %i BPM', (rate, bpm) => {
    const beats = run(createClickGenerator(rate, bpm, '4/4'), 3600, rate);
    const interval = (60 * rate) / bpm;
    const start = Math.round(0.05 * rate);
    expect(beats.length).toBe(Math.ceil((3600 * rate - start) / interval));
    for (const [n, { frame }] of beats.entries()) {
      // Every beat within half a sample of ideal, however late in the hour.
      expect(Math.abs(frame - (start + n * interval))).toBeLessThanOrEqual(0.5);
    }
  });

  it('counts frames from startFrame', () => {
    const beats = run(createClickGenerator(RATE, 120, '4/4', 1000), 1);
    expect(beats[0].frame).toBe(1000 + LEAD_IN);
  });

  it.each([1, 64, 128, 1000])('gives the same beats with %i-sample blocks', (block) => {
    const expected = run(createClickGenerator(RATE, 133, '3/4'), 5).map((b) => b.frame);
    const actual = run(createClickGenerator(RATE, 133, '3/4'), 5, RATE, block);
    expect(actual.map((b) => b.frame).slice(0, expected.length)).toEqual(expected);
  });
});

describe('createClickGenerator changes', () => {
  it('measures a new tempo from the last beat', () => {
    const generator = createClickGenerator(RATE, 60, '4/4');
    run(generator, 0.5); // the first beat has sounded
    generator.setBpm(120);
    const [next] = run(generator, 1);
    expect(next.frame).toBe(LEAD_IN + 24000);
  });

  it('plays straight away if the new beat would already be past', () => {
    const generator = createClickGenerator(RATE, 30, '4/4');
    const rendered = BLOCK * 200; // well past one beat at the new tempo
    run(generator, rendered / RATE); // the first beat, then a long wait
    generator.setBpm(240);
    const [next] = run(generator, 0.1);
    expect(next.frame).toBe(rendered);
  });

  it('keeps the lead-in if the tempo changes before the first beat', () => {
    const generator = createClickGenerator(RATE, 60, '4/4');
    generator.setBpm(120);
    const beats = run(generator, 1).map((b) => b.frame);
    expect(beats).toEqual([LEAD_IN, LEAD_IN + 24000]);
  });

  it('keeps its timing and makes the next beat a downbeat on a meter change', () => {
    const generator = createClickGenerator(RATE, 120, '4/4');
    run(generator, 0.6); // beats 0 and 1 have sounded
    generator.setMeter('3/4');
    const beats = run(generator, 1.5);
    expect(beats[0]).toEqual({ beat: 0, frame: LEAD_IN + 2 * 24000 });
    expect(beats.map((b) => b.beat)).toEqual([0, 1, 2]);
  });

  it('restarts on a downbeat after the lead-in', () => {
    const generator = createClickGenerator(RATE, 120, '4/4');
    run(generator, 0.8);
    generator.restart();
    const now = Math.ceil((0.8 * RATE) / BLOCK) * BLOCK;
    const beats = run(generator, 1);
    expect(beats[0]).toEqual({ beat: 0, frame: now + LEAD_IN });
    expect(beats[1]).toEqual({ beat: 1, frame: now + LEAD_IN + 24000 });
  });
});

describe('createClickGenerator audio', () => {
  /** All the samples, in one block, for looking at the waveform. */
  function samples(seconds: number, bpm = 120) {
    const output = new Float32Array(Math.round(seconds * RATE));
    createClickGenerator(RATE, bpm, '4/4').render(output, () => {});
    return output;
  }

  it('is silent until the sample the beat starts on', () => {
    const output = samples(0.1);
    expect(output.subarray(0, LEAD_IN).every((s) => s === 0)).toBe(true);
    // The sine starts at zero, so the sound is on the very next sample.
    expect(output[LEAD_IN]).toBe(0);
    expect(output[LEAD_IN + 1]).not.toBe(0);
  });

  it('stays in range and ends before the next beat, even at top speed', () => {
    const output = samples(1, 240);
    expect(Math.max(...output.map(Math.abs))).toBeLessThanOrEqual(1);
    // Silent again just before the second beat.
    expect(output[LEAD_IN + 12000 - 1]).toBe(0);
  });

  it('accents the downbeat with a louder click', () => {
    const output = samples(1);
    const peak = (from: number) =>
      Math.max(...output.subarray(from, from + 1440).map(Math.abs));
    expect(peak(LEAD_IN)).toBeGreaterThan(peak(LEAD_IN + 24000));
  });

  it('makes every click of a kind identical', () => {
    const output = samples(2.1);
    const second = output.subarray(LEAD_IN + 24000, LEAD_IN + 24000 + 1440);
    const third = output.subarray(LEAD_IN + 48000, LEAD_IN + 48000 + 1440);
    expect(Array.from(second)).toEqual(Array.from(third));
  });
});
