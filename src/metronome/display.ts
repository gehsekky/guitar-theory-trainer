// When to show a beat so the eye and ear agree, since sound takes a moment
// to get from the audio clock to the speakers (much longer over Bluetooth).

/** Beyond this the browser's numbers aren't believable, so they're ignored. */
const MAX_PLAUSIBLE_DELAY_MS = 1000;
/** About five seconds of animation frames: readings can wander for seconds. */
const SAMPLES = 300;

export interface AudioClockReading {
  /** From getOutputTimestamp(): what's at the speakers, and when that was. */
  output?: { contextTime?: number; performanceTime?: number };
  /** The audio clock now, which runs ahead of what's at the speakers. */
  contextTime: number;
  /** Estimated seconds from the audio clock to the speakers. */
  latency: number;
  /** performance.now() */
  now: number;
}

/** The ms to add to an audio time (in ms) to get when it's at the speakers. */
export function speakerOffset({ output, contextTime, latency, now }: AudioClockReading): number {
  const estimate = now - (contextTime - latency) * 1000;
  // Some browsers report zeros here until audio has been flowing a while.
  if (output?.contextTime && output.performanceTime) {
    const reported = output.performanceTime - output.contextTime * 1000;
    if (Math.abs(reported - estimate) <= MAX_PLAUSIBLE_DELAY_MS) return reported;
  }
  return estimate;
}

export interface DisplayClock {
  /** Take a reading; call often. */
  sample(reading: AudioClockReading): void;
  /** The performance.now() time when a beat at `beatTime` reaches the speakers. */
  beatTime(beatTime: number): number;
  /** Forget past readings, after audio has been suspended. */
  reset(): void;
}

/**
 * Each reading is noisy, but the audio clock itself is steady, so the true
 * offset barely changes. The median of recent readings ignores the noise.
 */
export function createDisplayClock(): DisplayClock {
  let offsets: number[] = [];

  return {
    sample(reading) {
      offsets.push(speakerOffset(reading));
      if (offsets.length > SAMPLES) offsets.shift();
    },
    beatTime(beatTime) {
      const sorted = offsets.toSorted((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
      return beatTime * 1000 + median;
    },
    reset() {
      offsets = [];
    },
  };
}
