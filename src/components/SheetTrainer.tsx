import { useState } from 'react';
import NotePicker from './NotePicker';
import SheetStaff from './SheetStaff';
import QuizActions from './ui/QuizActions';
import ResultBanner from './ui/ResultBanner';
import SegmentedControl from './ui/SegmentedControl';
import {
  DURATIONS,
  DURATION_LABEL,
  KEYS,
  formatNote,
  keyAlter,
  letterOfStep,
  pitchClass,
  stepOf,
  writtenNote,
  type Accidental,
  type Duration,
  type KeyDef,
  type Note,
  type SpelledNote,
} from '../theory';
import { pick, randomInt } from '../random';
import { oneOf, usePersistentState } from '../hooks/usePersistentState';
import { useQuiz } from '../hooks/useQuiz';

type Mode = 'easy' | 'hard';

const MODES = [
  { value: 'easy', label: 'Easy' },
  { value: 'hard', label: 'Hard' },
] as const;

interface Round {
  key: KeyDef;
  step: number;
  accidental: Accidental;
  duration: Duration;
  /** The note as written, e.g. "Bb" or "E#". */
  written: SpelledNote;
  answer: Note;
}

// Note range: C4 (one ledger line below) up to C6 (two above).
const STEP_MIN = stepOf('C', 4);
const STEP_MAX = stepOf('C', 6);

function newRound(mode: Mode): Round {
  const key = pick(KEYS);
  const step = STEP_MIN + randomInt(STEP_MAX - STEP_MIN + 1);
  const letter = letterOfStep(step);

  // Pick an accidental that isn't redundant for this letter in this key:
  // an already-sharped/flatted letter can only be naturalized; a natural
  // letter can be sharped or flatted. ~60% of notes carry no accidental.
  const alter = keyAlter(letter, key);
  const options: Accidental[] = alter === 0 ? ['sharp', 'flat'] : ['natural'];
  const accidental: Accidental = Math.random() < 0.6 ? 'none' : pick(options);

  const duration: Duration = mode === 'hard' ? pick(DURATIONS) : 'quarter';

  const written = writtenNote(step, accidental, key);
  return {
    key,
    step,
    accidental,
    duration,
    written,
    answer: pitchClass(written),
  };
}

export default function SheetTrainer() {
  const [mode, setMode] = usePersistentState<Mode>(
    'sheet-mode',
    'easy',
    oneOf(['easy', 'hard']),
  );
  const [selected, setSelected] = useState<Note[]>([]);
  const [selectedDuration, setSelectedDuration] = useState<Duration | null>(null);
  const { round, graded, correct, grade, next } = useQuiz(
    () => newRound(mode),
    () => {
      setSelected([]);
      setSelectedDuration(null);
    },
  );

  const needsDuration = mode === 'hard';
  const ready =
    selected.length === 1 && (!needsDuration || selectedDuration !== null);

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    next(newRound(nextMode));
  }

  function submit() {
    const noteRight = selected[0] === round.answer;
    const durationRight = !needsDuration || selectedDuration === round.duration;
    grade(noteRight && durationRight);
  }

  const answerText = (
    <>
      <strong>{formatNote(round.written)}</strong>
      {/* E♯, C♭, B♯, F♭ land on a white key: say which one sounds. */}
      {round.written.length > 1 && !round.answer.includes('#') && (
        <> (sounds as {round.answer})</>
      )}
      {needsDuration && (
        <>
          {' '}
          (<strong>{DURATION_LABEL[round.duration].toLowerCase()} note</strong>)
        </>
      )}
      {mode === 'hard' && <> — the key was {round.key.name}</>}
    </>
  );

  return (
    <section className="trainer">
      <h2>Sheet Music Trainer</h2>

      <SegmentedControl
        label="Difficulty"
        options={MODES}
        value={mode}
        onChange={changeMode}
      />

      <p className="instructions">
        {mode === 'easy'
          ? 'Name the note on the staff. Watch the key signature!'
          : 'Name the note and its duration. You must work out the key from the signature.'}
      </p>

      {mode === 'easy' && <div className="key-label">Key: {round.key.name}</div>}

      <SheetStaff
        keyDef={round.key}
        step={round.step}
        accidental={round.accidental}
        duration={round.duration}
      />

      <NotePicker
        selected={selected}
        max={1}
        onChange={setSelected}
        disabled={graded}
        correctNotes={[round.answer]}
        graded={graded}
      />

      {needsDuration && (
        <div className="duration-picker" role="group" aria-label="Note duration">
          {DURATIONS.map((d) => {
            const isSelected = selectedDuration === d;
            let cls = 'note-btn duration-btn';
            if (isSelected) cls += ' selected';
            if (graded && d === round.duration) cls += ' correct';
            if (graded && isSelected && d !== round.duration)
              cls += ' wrong';
            return (
              <button
                key={d}
                type="button"
                className={cls}
                aria-pressed={isSelected}
                disabled={graded}
                onClick={() => setSelectedDuration(isSelected ? null : d)}
              >
                {DURATION_LABEL[d]}
              </button>
            );
          })}
        </div>
      )}

      <QuizActions
        graded={graded}
        canSubmit={ready}
        onSubmit={submit}
        onNext={() => next()}
      />

      {graded && (
        <ResultBanner correct={correct}>
          {correct ? (
            <>✓ Correct! That's {answerText}.</>
          ) : (
            <>✗ Not quite. The answer is {answerText}.</>
          )}
        </ResultBanner>
      )}
    </section>
  );
}
