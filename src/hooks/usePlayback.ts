import { useEffect, useRef, useState } from 'react';
import { stopPhrase } from '../audio';
import { useDrone } from '../drone/DroneContext';
import { useMetronome } from '../metronome/MetronomeContext';

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
  const metronome = useMetronome();

  // Leaving the game (another tab or game) silences its prompt.
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      stopPhrase();
    },
    [],
  );

  /** Record that audio started and will play for `seconds`. A running drone
   * dips underneath and the metronome goes quiet, so the prompt stays clear. */
  function started(seconds: number) {
    drone.duck(seconds);
    metronome.mute(seconds);
    setHasPlayed(true);
    setIsPlaying(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setIsPlaying(false), seconds * 1000);
  }

  /** Back to "not heard yet", e.g. after a settings change. Stops a prompt
   * still playing, which no longer matches the round. */
  function reset() {
    stopPhrase();
    window.clearTimeout(timer.current);
    setHasPlayed(false);
    setIsPlaying(false);
  }

  return { hasPlayed, isPlaying, started, reset };
}
