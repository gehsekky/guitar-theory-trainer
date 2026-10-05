import { useEffect, useRef, useState } from 'react';
import NotePicker from './NotePicker';
import { startDrone, type Drone, type DroneSound } from '../audio';
import { CHROMATIC, displayNote, transpose, type Note } from '../music';

const SOUNDS: { id: DroneSound; label: string }[] = [
  { id: 'synth', label: 'Synth' },
  { id: 'organ', label: 'Organ' },
  { id: 'tanpura', label: 'Tanpura' },
];

const KEY_STORAGE_KEY = 'guitar-theory-trainer.drone-key';
const SOUND_STORAGE_KEY = 'guitar-theory-trainer.drone-sound';

function loadKey(): Note {
  const stored = localStorage.getItem(KEY_STORAGE_KEY);
  return CHROMATIC.find((n) => n === stored) ?? 'E';
}

function loadSound(): DroneSound {
  const stored = localStorage.getItem(SOUND_STORAGE_KEY);
  return SOUNDS.find((s) => s.id === stored)?.id ?? 'synth';
}

export default function DroneTrainer() {
  const [key, setKey] = useState<Note>(loadKey);
  const [sound, setSound] = useState<DroneSound>(loadSound);
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
      droneRef.current = startDrone(key, sound);
      setPlaying(true);
    }
  }

  function changeSound(next: DroneSound) {
    if (next === sound) return;
    setSound(next);
    localStorage.setItem(SOUND_STORAGE_KEY, next);
    // Crossfade straight to the new sound for easy A/B comparison.
    if (droneRef.current) {
      droneRef.current.stop();
      droneRef.current = startDrone(key, next);
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

      <div className="mode-toggle" role="radiogroup" aria-label="Drone sound">
        {SOUNDS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={sound === s.id}
            className={sound === s.id ? 'mode-btn active' : 'mode-btn'}
            onClick={() => changeSound(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

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
