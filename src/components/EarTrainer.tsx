import { useState } from 'react';
import IntervalTrainer from './IntervalTrainer';
import ChordEarTrainer from './ChordEarTrainer';
import { CHROMATIC, displayNote, type Note } from '../theory';

// Sub-trainers within Ear Training. Future: 'note' (identify a played
// single note) slots in here alongside intervals and chords.
type EarGame = 'interval' | 'chord';

const GAMES: { id: EarGame; label: string }[] = [
  { id: 'interval', label: 'Intervals' },
  { id: 'chord', label: 'Chords' },
];

// Key selection is shared ear-trainer config: either a new random key
// every round, or one fixed key chosen by the user. Persisted across
// sessions and shared by future ear games.
type KeyMode = 'random' | 'fixed';

const KEY_MODE_STORAGE = 'guitar-theory-trainer.ear-key-mode';
const FIXED_KEY_STORAGE = 'guitar-theory-trainer.ear-fixed-key';

function loadKeyMode(): KeyMode {
  return localStorage.getItem(KEY_MODE_STORAGE) === 'fixed'
    ? 'fixed'
    : 'random';
}

function loadFixedKey(): Note {
  const stored = localStorage.getItem(FIXED_KEY_STORAGE);
  return CHROMATIC.includes(stored as Note) ? (stored as Note) : 'C';
}

export default function EarTrainer() {
  const [game, setGame] = useState<EarGame>('interval');
  const [keyMode, setKeyMode] = useState<KeyMode>(loadKeyMode);
  const [fixedKey, setFixedKey] = useState<Note>(loadFixedKey);

  function changeKeyMode(next: KeyMode) {
    if (next === keyMode) return;
    setKeyMode(next);
    localStorage.setItem(KEY_MODE_STORAGE, next);
  }

  function changeFixedKey(next: Note) {
    setFixedKey(next);
    localStorage.setItem(FIXED_KEY_STORAGE, next);
  }

  // The active key constraint: null = pick a random key each round.
  const activeFixedKey = keyMode === 'fixed' ? fixedKey : null;

  return (
    <section className="trainer">
      <h2>Ear Trainer</h2>

      {GAMES.length > 1 && (
        <div className="mode-toggle" role="radiogroup" aria-label="Ear game">
          {GAMES.map((g) => (
            <button
              key={g.id}
              type="button"
              role="radio"
              aria-checked={game === g.id}
              className={game === g.id ? 'mode-btn active' : 'mode-btn'}
              onClick={() => setGame(g.id)}
            >
              {g.label}
            </button>
          ))}
        </div>
      )}

      <div className="ear-settings">
        <span className="ear-settings-label">Key:</span>
        <div className="mode-toggle" role="radiogroup" aria-label="Key mode">
          {(['random', 'fixed'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={keyMode === m}
              className={keyMode === m ? 'mode-btn active' : 'mode-btn'}
              onClick={() => changeKeyMode(m)}
            >
              {m === 'random' ? 'Random' : 'Fixed'}
            </button>
          ))}
        </div>
        {keyMode === 'fixed' && (
          <select
            className="key-select"
            aria-label="Fixed key"
            value={fixedKey}
            onChange={(e) => changeFixedKey(e.target.value as Note)}
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
