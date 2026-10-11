import { useState } from 'react';
import IntervalTrainer from './IntervalTrainer';
import ChordEarTrainer from './ChordEarTrainer';
import SegmentedControl from './ui/SegmentedControl';
import { CHROMATIC, displayNote, type Note } from '../theory';
import { oneOf, usePersistentState } from '../hooks/usePersistentState';
import './EarTrainer.css';

// Sub-trainers within Ear Training. Future: 'note' (identify a played
// single note) slots in here alongside intervals and chords.
type EarGame = 'interval' | 'chord';

const GAMES = [
  { value: 'interval', label: 'Intervals' },
  { value: 'chord', label: 'Chords' },
] as const;

// Key selection is shared ear-trainer config: either a new random key
// every round, or one fixed key chosen by the user. Persisted across
// sessions and shared by future ear games.
type KeyMode = 'random' | 'fixed';

const KEY_MODES = [
  { value: 'random', label: 'Random' },
  { value: 'fixed', label: 'Fixed' },
] as const;

export default function EarTrainer() {
  const [game, setGame] = useState<EarGame>('interval');
  const [keyMode, setKeyMode] = usePersistentState<KeyMode>(
    'ear-key-mode',
    'random',
    oneOf(['random', 'fixed']),
  );
  const [fixedKey, setFixedKey] = usePersistentState<Note>(
    'ear-fixed-key',
    'C',
    oneOf(CHROMATIC),
  );

  // The active key constraint: null = pick a random key each round.
  const activeFixedKey = keyMode === 'fixed' ? fixedKey : null;

  return (
    <section className="trainer">
      <h2>Ear Trainer</h2>

      <SegmentedControl
        label="Ear game"
        options={GAMES}
        value={game}
        onChange={setGame}
      />

      <div className="ear-settings">
        <span className="ear-settings-label">Key:</span>
        <SegmentedControl
          label="Key mode"
          options={KEY_MODES}
          value={keyMode}
          onChange={setKeyMode}
        />
        {keyMode === 'fixed' && (
          <select
            className="key-select"
            aria-label="Fixed key"
            value={fixedKey}
            onChange={(e) => setFixedKey(e.target.value as Note)}
          >
            {CHROMATIC.map((note) => (
              <option key={note} value={note}>
                {displayNote(note)}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Remount on key-config change so the current round is regenerated
          under the new constraint. */}
      {game === 'interval' && (
        <IntervalTrainer
          key={activeFixedKey ?? 'random'}
          fixedKey={activeFixedKey}
        />
      )}
      {game === 'chord' && (
        <ChordEarTrainer
          key={activeFixedKey ?? 'random'}
          fixedKey={activeFixedKey}
        />
      )}
    </section>
  );
}
