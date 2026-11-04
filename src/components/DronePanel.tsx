import NotePicker from './NotePicker';
import SegmentedControl from './ui/SegmentedControl';
import TransportButton from './ui/TransportButton';
import type { DroneSound } from '../audio';
import { INTERVALS, formatNote, keyTonic, spellInterval, type Note } from '../theory';
import { useDrone } from '../drone/DroneContext';

const SOUNDS = [
  { value: 'tanpura', label: 'Tanpura' },
  { value: 'synth', label: 'Synth' },
  { value: 'organ', label: 'Organ' },
] as const satisfies readonly { value: DroneSound; label: string }[];

const PERFECT_FIFTH = INTERVALS.find((i) => i.short === 'P5')!;

export default function DronePanel() {
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
    <section className="tool-panel" aria-labelledby="drone-panel-title">
      <div className="tool-header">
        <h3 id="drone-panel-title" className="tool-title">
          Drone
        </h3>
        <div className="drone-key">
          {formatNote(tonic)} drone{' '}
          <span className="drone-notes">
            ({formatNote(tonic)} + {formatNote(fifth)})
          </span>
        </div>
      </div>

      <div className="tool-main drone-controls">
        <TransportButton name="drone" playing={drone.on} onClick={drone.toggle} />
        <SegmentedControl
          label="Drone sound"
          options={SOUNDS}
          value={drone.sound}
          onChange={drone.setSound}
        />
      </div>

      <NotePicker selected={[drone.key]} max={1} onChange={changeKey} />
    </section>
  );
}
