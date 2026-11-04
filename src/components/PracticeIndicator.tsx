import { formatNote, keyTonic } from '../theory';
import { useDrone } from '../drone/DroneContext';
import { useMetronome } from '../metronome/MetronomeContext';
import './PracticeIndicator.css';

/**
 * Header control shown from any trainer while the drone or metronome is on:
 * it shows what's running and stops all of it. On phones it shrinks to a
 * round stop button.
 */
export default function PracticeIndicator() {
  const drone = useDrone();
  const metronome = useMetronome();
  if (!drone.on && !metronome.on) return null;

  const key = formatNote(keyTonic(drone.key, 'major'));
  const dronePaused = drone.on && !drone.sounding;
  const both = drone.on && metronome.on;

  const droneLabel = both ? `♪ ${key}` : `♪ ${key} drone`;
  const metronomeLabel = both ? `♩ ${metronome.bpm}` : `♩ ${metronome.bpm} BPM`;

  const spoken = [
    drone.on && `${key} drone${dronePaused ? ' (paused in this trainer)' : ''}`,
    metronome.on && `metronome at ${metronome.bpm} BPM`,
  ]
    .filter(Boolean)
    .join(' and ');

  const idle = dronePaused && !metronome.on;

  return (
    <button
      type="button"
      className={idle ? 'practice-indicator paused' : 'practice-indicator'}
      onClick={() => {
        drone.stop();
        metronome.stop();
      }}
      aria-label={`Stop the ${spoken}`}
      title={`Stop the ${spoken}`}
    >
      <span className="practice-indicator-label">
        {metronome.on && metronomeLabel}
        {both && ' · '}
        {drone.on && droneLabel}
        {dronePaused && <span className="practice-indicator-paused"> · paused</span>}
      </span>
      <svg viewBox="0 0 24 24" className="practice-indicator-stop" aria-hidden="true">
        <rect x="6" y="6" width="12" height="12" rx="2" />
      </svg>
    </button>
  );
}
