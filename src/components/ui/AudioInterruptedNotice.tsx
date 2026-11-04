import { useSyncExternalStore } from 'react';
import { isAudioInterrupted, subscribeAudioInterrupted } from '../../audio';
import { useDrone } from '../../drone/DroneContext';
import { useMetronome } from '../../metronome/MetronomeContext';
import './AudioInterruptedNotice.css';

/** Says so when the system has cut off audio that's meant to be playing. */
export default function AudioInterruptedNotice() {
  const interrupted = useSyncExternalStore(subscribeAudioInterrupted, isAudioInterrupted);
  const drone = useDrone();
  const metronome = useMetronome();

  if (!interrupted || (!drone.on && !metronome.on)) return null;
  return (
    <p className="audio-interrupted" role="status">
      Sound was interrupted. Tap anywhere to bring it back.
    </p>
  );
}
