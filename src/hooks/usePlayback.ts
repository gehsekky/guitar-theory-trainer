import { useEffect, useRef, useState } from 'react';
import { useDrone } from '../drone/DroneContext';

/**
 * Play-button state for ear-training games: whether the prompt has been
 * heard yet (answers unlock after the first play) and whether it is
 * playing right now.
 */
export function usePlayback() {
  const [hasPlayed, setHasPlayed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const drone = useDrone();

  useEffect(() => () => window.clearTimeout(timer.current), []);

  /** Record that audio started and will play for `seconds`. A running drone
   * dips underneath so the prompt stays clear. */
  function started(seconds: number) {
    drone.duck(seconds);
    setHasPlayed(true);
    setIsPlaying(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setIsPlaying(false), seconds * 1000);
  }

  /** Back to "not heard yet", e.g. after a settings change. */
  function reset() {
    window.clearTimeout(timer.current);
    setHasPlayed(false);
    setIsPlaying(false);
  }

  return { hasPlayed, isPlaying, started, reset };
}
