import { useState } from 'react';
import Fretboard, { type FretboardMarker } from './Fretboard';
import NotePicker from './NotePicker';
import QuizActions from './ui/QuizActions';
import ResultBanner from './ui/ResultBanner';
import { FRET_COUNT, STRINGS, displayNote, noteAt, type Note } from '../theory';
import { pick, randomInt } from '../random';
import { jsonCodec, usePersistentState } from '../hooks/usePersistentState';
import { useQuiz } from '../hooks/useQuiz';

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

// Saved as a JSON list of string indices; keep only valid ones, and never
// end up with no strings at all.
const stringsCodec = jsonCodec((stored) => {
  if (!Array.isArray(stored)) return undefined;
  const valid = ALL_STRINGS.filter((i) => stored.includes(i));
  return valid.length > 0 ? valid : undefined;
});

export default function NeckTrainer() {
  const [strings, setStrings] = usePersistentState(
    'neck-strings',
    ALL_STRINGS,
    stringsCodec,
  );
  const [selected, setSelected] = useState<Note[]>([]);
  const { round, graded, correct, grade, next } = useQuiz(
    (prev?: Round) => newRound(strings, prev),
    () => setSelected([]),
  );

  function changeStrings(nextStrings: number[]) {
    // Keep at least one string eligible.
    if (nextStrings.length === 0) return;
    setStrings(nextStrings);
    next(newRound(nextStrings));
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
        disabled={graded}
        correctNotes={[round.answer]}
        graded={graded}
      />

      <QuizActions
        graded={graded}
        canSubmit={selected.length === 1}
        onSubmit={() => grade(selected[0] === round.answer)}
        onNext={() => next()}
      />

      {graded && (
        <ResultBanner correct={correct}>
          {correct ? (
            <>✓ Correct! That note is <strong>{displayNote(round.answer)}</strong>.</>
          ) : (
            <>✗ Not quite. The correct answer is <strong>{displayNote(round.answer)}</strong>.</>
          )}
        </ResultBanner>
      )}
    </section>
  );
}
