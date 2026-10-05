import { useState } from 'react';
import Fretboard, { type FretboardMarker } from './Fretboard';
import NotePicker from './NotePicker';
import {
  FRET_COUNT,
  STRINGS,
  displayNote,
  noteAt,
  pick,
  randomInt,
  type Note,
} from '../music';

const ALL_STRINGS = STRINGS.map((_s, i) => i);
// Low to high, as guitarists spell the tuning: E A D G B e.
const STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'e'];

interface Round {
  marker: FretboardMarker;
  answer: Note;
}

/** A new position on one of `strings`, avoiding an immediate repeat. */
function newRound(strings: number[], prev?: Round): Round {
  let stringIndex: number;
  let fret: number;
  do {
    stringIndex = pick(strings);
    fret = randomInt(FRET_COUNT + 1); // include open string
  } while (
    prev &&
    stringIndex === prev.marker.stringIndex &&
    fret === prev.marker.fret
  );
  return { marker: { stringIndex, fret }, answer: noteAt(stringIndex, fret) };
}

type Phase = 'guessing' | 'graded';

const STRINGS_STORAGE_KEY = 'guitar-theory-trainer.neck-strings';

function loadStrings(): number[] {
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem(STRINGS_STORAGE_KEY) ?? 'null',
    );
    if (Array.isArray(stored)) {
      const valid = ALL_STRINGS.filter((i) => stored.includes(i));
      if (valid.length > 0) return valid;
    }
  } catch {
    // Fall through to the default.
  }
  return ALL_STRINGS;
}

export default function NeckTrainer() {
  const [strings, setStrings] = useState<number[]>(loadStrings);
  const [round, setRound] = useState<Round>(() => newRound(loadStrings()));
  const [selected, setSelected] = useState<Note[]>([]);
  const [phase, setPhase] = useState<Phase>('guessing');
  const [correct, setCorrect] = useState(false);

  function submit() {
    if (selected.length !== 1) return;
    setCorrect(selected[0] === round.answer);
    setPhase('graded');
  }

  function next() {
    setRound(newRound(strings, round));
    setSelected([]);
    setPhase('guessing');
  }

  function changeStrings(nextStrings: number[]) {
    // Keep at least one string eligible.
    if (nextStrings.length === 0) return;
    setStrings(nextStrings);
    localStorage.setItem(STRINGS_STORAGE_KEY, JSON.stringify(nextStrings));
    setRound(newRound(nextStrings));
    setSelected([]);
    setPhase('guessing');
  }

  function toggleString(i: number) {
    changeStrings(
      strings.includes(i)
        ? strings.filter((s) => s !== i)
        : ALL_STRINGS.filter((s) => s === i || strings.includes(s)),
    );
  }

  const allStrings = strings.length === ALL_STRINGS.length;

  return (
    <section className="trainer">
      <h2>Neck Note Trainer</h2>
      <div className="field-label">Strings</div>
      <div className="chip-row string-row" role="group" aria-label="Strings to quiz">
        {ALL_STRINGS.map((i) => {
          const on = strings.includes(i);
          return (
            <button
              key={i}
              type="button"
              className={on ? 'note-btn string-btn selected' : 'note-btn string-btn'}
              aria-pressed={on}
              aria-label={`String ${STRINGS.length - i} (${STRING_NAMES[i]})`}
              onClick={() => toggleString(i)}
            >
              {STRING_NAMES[i]}
              <span className="string-num">{STRINGS.length - i}</span>
            </button>
          );
        })}
        <button
          type="button"
          className={allStrings ? 'note-btn string-btn selected' : 'note-btn string-btn'}
          aria-pressed={allStrings}
          onClick={() => changeStrings(ALL_STRINGS)}
        >
          All
        </button>
      </div>

      <p className="instructions">
        A note is marked on the fretboard. Which note is it?
      </p>

      <Fretboard marker={round.marker} activeStrings={strings} />

      <NotePicker
        selected={selected}
        max={1}
        onChange={setSelected}
        disabled={phase === 'graded'}
        correctNotes={[round.answer]}
        graded={phase === 'graded'}
      />

      {phase === 'guessing' ? (
        <button
          type="button"
          className="primary-btn"
          onClick={submit}
          disabled={selected.length !== 1}
        >
          Submit
        </button>
      ) : (
        <button type="button" className="primary-btn" onClick={next}>
          Next
        </button>
      )}

      {phase === 'graded' && (
        <div
          className={correct ? 'result success' : 'result failure'}
          role="status"
        >
          {correct ? (
            <>✓ Correct! That note is <strong>{displayNote(round.answer)}</strong>.</>
          ) : (
            <>✗ Not quite. The correct answer is <strong>{displayNote(round.answer)}</strong>.</>
          )}
        </div>
      )}
    </section>
  );
}
