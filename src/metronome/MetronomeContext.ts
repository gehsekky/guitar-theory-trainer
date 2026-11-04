import { createContext, useContext } from 'react';
import type { Meter } from './timing';

export interface MetronomeControls {
  on: boolean;
  bpm: number;
  meter: Meter;
  /** The metronome couldn't start here (it needs HTTPS or localhost). */
  failed: boolean;
  /** Turn the metronome on or off. Call from a tap/click handler (iOS audio). */
  toggle(): void;
  stop(): void;
  setBpm(bpm: number): void;
  setMeter(meter: Meter): void;
  /** Silence the clicks for `seconds` under another sound, like an ear prompt. */
  mute(seconds: number): void;
  /** Hear about each beat as it sounds. Returns the unsubscribe function. */
  subscribeBeat(listener: (beat: number) => void): () => void;
}

export const MetronomeContext = createContext<MetronomeControls | null>(null);

/** The app-wide metronome. */
export function useMetronome(): MetronomeControls {
  const metronome = useContext(MetronomeContext);
  if (!metronome) throw new Error('useMetronome must be used inside <MetronomeProvider>');
  return metronome;
}
