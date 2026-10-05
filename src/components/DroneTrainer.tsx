import { useEffect, useRef, useState } from 'react';
import NotePicker from './NotePicker';
import { startDrone, type Drone } from '../audio';
import { CHROMATIC, displayNote, transpose, type Note } from '../music';

const KEY_STORAGE_KEY = 'guitar-theory-trainer.drone-key';

function loadKey(): Note {
  const stored = localStorage.getItem(KEY_STORAGE_KEY);
  return CHROMATIC.find((n) => n === stored) ?? 'E';
}

export default function DroneTrainer() {
  const [key, setKey] = useState<Note>(loadKey);
  const [playing, setPlaying] = useState(false);
  const droneRef = useRef<Drone | null>(null);

  // Silence the drone when leaving the tab.
  useEffect(() => () => droneRef.current?.stop(), []);

  function toggle() {
    if (droneRef.current) {
      droneRef.current.stop();
      droneRef.current = null;
      setPlaying(false);
    } else {
      droneRef.current = startDrone(key);
      setPlaying(true);
    }
  }

  function changeKey(selected: Note[]) {
    // Tapping the current key would deselect it; keep a key chosen.
    const next = selected[0];
    if (!next) return;
    setKey(next);
    localStorage.setItem(KEY_STORAGE_KEY, next);
    droneRef.current?.setRoot(next);
  }

  return (
    <section className="trainer">
      <h2>Drone</h2>

      <p className="instructions">
        Play a root + fifth drone to anchor the key while you practice. Pick a
        key below — it changes live while the drone plays.
      </p>

      <button
        type="button"
        className={playing ? 'drone-btn playing' : 'drone-btn'}
        aria-pressed={playing}
        aria-label={playing ? 'Pause drone' : 'Play drone'}
        onClick={toggle}
      >
        <svg viewBox="0 0 24 24" className="drone-icon" aria-hidden="true">
          {playing ? (
            <>
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </>
          ) : (
            <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
          )}
        </svg>
      </button>

      <div className="drone-key">
        {displayNote(key)} drone{' '}
        <span className="drone-notes">
          ({displayNote(key)} + {displayNote(transpose(key, 7))})
        </span>
      </div>

      <NotePicker selected={[key]} max={1} onChange={changeKey} />
    </section>
  );
}
