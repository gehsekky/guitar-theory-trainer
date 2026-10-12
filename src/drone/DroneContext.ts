import { createContext, useContext } from 'react';
import type { DroneSound } from '../audio';
import type { Note } from '../theory';

/**
 * How a trainer coexists with a running drone:
 * - `lock`: the trainer uses the drone's key while it sounds
 * - `pause`: the drone falls silent here (the trainer's keys change too
 *   often to share one), and resumes when you leave
 * - `free`: no interaction; the drone just keeps playing
 */
export type DronePolicy = 'lock' | 'pause' | 'free';

export interface DroneControls {
  /** The drone is switched on (it may be paused by the current trainer). */
  on: boolean;
  /** The drone is actually sounding right now. */
  sounding: boolean;
  key: Note;
  sound: DroneSound;
  /** The key trainers should lock to, or null while the drone is silent. */
  lockedKey: Note | null;
  /** Turn the drone on or off. Call from a tap/click handler (iOS audio). */
  toggle(): void;
  stop(): void;
  setKey(key: Note): void;
  setSound(sound: DroneSound): void;
  /** Silence the drone for the current trainer without switching it off. */
  setPaused(paused: boolean): void;
  /** Dip the drone for `seconds` under another sound, like an ear prompt. */
  duck(seconds: number): void;
}

export const DroneContext = createContext<DroneControls | null>(null);

/** The app-wide drone. */
export function useDrone(): DroneControls {
  const drone = useContext(DroneContext);
  if (!drone) throw new Error('useDrone must be used inside <DroneProvider>');
  return drone;
}
