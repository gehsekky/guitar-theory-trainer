import NotePicker from './NotePicker';
import SegmentedControl from './ui/SegmentedControl';
import type { DroneSound } from '../audio';
import { INTERVALS, formatNote, keyTonic, spellInterval, type Note } from '../theory';
import { useDrone } from '../drone/DroneContext';
import './DroneTrainer.css';

const SOUNDS = [
  { value: 'synth', label: 'Synth' },
  { value: 'organ', label: 'Organ' },
  { value: 'tanpura', label: 'Tanpura' },
] as const satisfies readonly { value: DroneSound; label: string }[];

const PERFECT_FIFTH = INTERVALS.find((i) => i.short === 'P5')!;

export default function DroneTrainer() {
  // The drone itself lives app-wide (DroneProvider), so it keeps playing
  // when you switch to another trainer.
  const drone = useDrone();

  function changeKey(selected: Note[]) {
    // Tapping the current key would deselect it; keep a key chosen.
    const next = selected[0];
    if (next) drone.setKey(next);
  }

  // Spell the drone like a key: B♭ + F rather than A♯ + F.
  const tonic = keyTonic(drone.key, 'major');
  const fifth = spellInterval(tonic, PERFECT_FIFTH);

  return (
    <section className="trainer">
      <h2>Drone</h2>

      <SegmentedControl
        label="Drone sound"
        options={SOUNDS}
        value={drone.sound}
        onChange={drone.setSound}
      />

      <p className="instructions">
        Play a root + fifth drone to anchor the key while you practice. It keeps
        playing in other trainers, and Scales, Scale Degrees, and Ear Training
        switch to its key.
      </p>

      <button
        type="button"
        className={drone.on ? 'drone-btn playing' : 'drone-btn'}
        aria-pressed={drone.on}
        aria-label={drone.on ? 'Pause drone' : 'Play drone'}
        onClick={drone.toggle}
      >
        <svg viewBox="0 0 24 24" className="drone-icon" aria-hidden="true">
          {drone.on ? (
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

      <NotePicker selected={[drone.key]} max={1} onChange={changeKey} />
    </section>
  );
}
