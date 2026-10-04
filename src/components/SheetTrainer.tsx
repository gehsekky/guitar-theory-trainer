import { useState } from 'react';
import NotePicker from './NotePicker';
import SheetStaff from './SheetStaff';
import { displayNote, pick, randomInt, type Note } from '../music';
import {
  DURATIONS,
  DURATION_LABEL,
  KEYS,
  keyAlter,
  letterOfStep,
  soundingNote,
  stepOf,
  type Accidental,
  type Duration,
  type KeyDef,
} from '../sheet';

type Mode = 'easy' | 'hard';

interface Round {
  key: KeyDef;
  step: number;
  accidental: Accidental;
  duration: Duration;
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

  return {
    key,
    step,
    accidental,
    duration,
    answer: soundingNote(step, accidental, key),
  };
}

type Phase = 'guessing' | 'graded';

const MODE_STORAGE_KEY = 'guitar-theory-trainer.sheet-mode';

function loadMode(): Mode {
  const stored = localStorage.getItem(MODE_STORAGE_KEY);
  return stored === 'hard' ? 'hard' : 'easy';
}

export default function SheetTrainer() {
  const [mode, setMode] = useState<Mode>(loadMode);
  const [round, setRound] = useState<Round>(() => newRound(loadMode()));
  const [selected, setSelected] = useState<Note[]>([]);
  const [selectedDuration, setSelectedDuration] = useState<Duration | null>(null);
  const [phase, setPhase] = useState<Phase>('guessing');
  const [correct, setCorrect] = useState(false);

  const needsDuration = mode === 'hard';
  const ready =
    selected.length === 1 && (!needsDuration || selectedDuration !== null);

  function changeMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    localStorage.setItem(MODE_STORAGE_KEY, next);
    setRound(newRound(next));
    setSelected([]);
    setSelectedDuration(null);
    setPhase('guessing');
  }

  function submit() {
    if (!ready) return;
    const noteRight = selected[0] === round.answer;
    const durationRight = !needsDuration || selectedDuration === round.duration;
    setCorrect(noteRight && durationRight);
    setPhase('graded');
  }

  function next() {
    setRound(newRound(mode));
    setSelected([]);
    setSelectedDuration(null);
    setPhase('guessing');
  }

  const answerText = (
    <>
      <strong>{displayNote(round.answer)}</strong>
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

      <div className="mode-toggle" role="radiogroup" aria-label="Difficulty">
        {(['easy', 'hard'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            className={mode === m ? 'mode-btn active' : 'mode-btn'}
            onClick={() => changeMode(m)}
          >
            {m === 'easy' ? 'Easy' : 'Hard'}
          </button>
        ))}
      </div>

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
        disabled={phase === 'graded'}
        correctNotes={[round.answer]}
        graded={phase === 'graded'}
      />

      {needsDuration && (
        <div className="duration-picker" role="group" aria-label="Note duration">
          {DURATIONS.map((d) => {
            const isSelected = selectedDuration === d;
            let cls = 'note-btn duration-btn';
            if (isSelected) cls += ' selected';
            if (phase === 'graded' && d === round.duration) cls += ' correct';
            if (phase === 'graded' && isSelected && d !== round.duration)
              cls += ' wrong';
            return (
              <button
                key={d}
                type="button"
                className={cls}
                aria-pressed={isSelected}
                disabled={phase === 'graded'}
                onClick={() => setSelectedDuration(isSelected ? null : d)}
              >
                {DURATION_LABEL[d]}
              </button>
            );
          })}
        </div>
      )}

      {phase === 'guessing' ? (
        <button
          type="button"
          className="primary-btn"
          onClick={submit}
          disabled={!ready}
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
            <>✓ Correct! That's {answerText}.</>
          ) : (
            <>✗ Not quite. The answer is {answerText}.</>
          )}
        </div>
      )}
    </section>
  );
}
