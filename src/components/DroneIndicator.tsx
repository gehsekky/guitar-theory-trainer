import { formatNote, keyTonic } from '../theory';
import { useDrone } from '../drone/DroneContext';
import './DroneIndicator.css';

/**
 * Header control shown while the drone is on, from any trainer: it shows
 * the drone's key and stops it. On phones it shrinks to a round stop button.
 */
export default function DroneIndicator() {
  const drone = useDrone();
  if (!drone.on) return null;

  const name = `${formatNote(keyTonic(drone.key, 'major'))} drone`;
  const status = drone.sounding ? name : `${name} (paused in this trainer)`;

  return (
    <button
      type="button"
      className={drone.sounding ? 'drone-indicator' : 'drone-indicator paused'}
      onClick={drone.stop}
      aria-label={`Stop the ${status}`}
      title={`Stop the ${status}`}
    >
      <span className="drone-indicator-label">
        ♪ {name}
        {!drone.sounding && <span className="drone-indicator-paused"> · paused</span>}
      </span>
      <svg viewBox="0 0 24 24" className="drone-indicator-stop" aria-hidden="true">
        <rect x="6" y="6" width="12" height="12" rx="2" />
      </svg>
    </button>
  );
}
