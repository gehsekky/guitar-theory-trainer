import { useEffect, useRef, useState } from 'react';
import NotePicker from './NotePicker';
import SegmentedControl from './ui/SegmentedControl';
import { startDrone, type Drone, type DroneSound } from '../audio';
import {
  CHROMATIC,
  INTERVALS,
  formatNote,
  keyTonic,
  spellInterval,
  type Note,
} from '../theory';
import { useWakeLock } from '../hooks/useWakeLock';
import { oneOf, usePersistentState } from '../hooks/usePersistentState';

const SOUNDS = [
  { value: 'synth', label: 'Synth' },
  { value: 'organ', label: 'Organ' },
  { value: 'tanpura', label: 'Tanpura' },
] as const satisfies readonly { value: DroneSound; label: string }[];

const PERFECT_FIFTH = INTERVALS.find((i) => i.short === 'P5')!;

export default function DroneTrainer() {
  const [key, setKey] = usePersistentState<Note>('drone-key', 'E', oneOf(CHROMATIC));
  const [sound, setSound] = usePersistentState<DroneSound>(
    'drone-sound',
    'synth',
    oneOf(SOUNDS.map((s) => s.value)),
  );
  const [playing, setPlaying] = useState(false);
  const droneRef = useRef<Drone | null>(null);

  // Silence the drone when leaving the tab.
  useEffect(() => () => droneRef.current?.stop(), []);
  // Keep the screen on while it plays, so practice isn't cut off by the
  // screen timeout.
  useWakeLock(playing);

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
    setSound(next);
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
    droneRef.current?.setRoot(next);
  }

  // Spell the drone like a key: B♭ + F rather than A♯ + F.
  const tonic = keyTonic(key, 'major');
  const fifth = spellInterval(tonic, PERFECT_FIFTH);

  return (
    <section className="trainer">
      <h2>Drone</h2>

      <SegmentedControl
        label="Drone sound"
        options={SOUNDS}
        value={sound}
        onChange={changeSound}
      />

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
        {formatNote(tonic)} drone{' '}
        <span className="drone-notes">
          ({formatNote(tonic)} + {formatNote(fifth)})
        </span>
      </div>

      <NotePicker selected={[key]} max={1} onChange={changeKey} />
    </section>
  );
}
