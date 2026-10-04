import { useState } from 'react';
import NotePicker from './NotePicker';
import {
  MAJOR_SCALE_PATTERN,
  displayNote,
  pick,
  randomInt,
  randomNote,
  sameNoteSet,
  scaleNotes,
  type Note,
  type ScaleType,
} from '../music';

type Mode = 'easy' | 'hard';

interface Round {
  root: Note;
  scaleType: ScaleType;
  notes: Note[];
  /** Easy mode: which degree (1-6, never the root) is hidden. */
  hiddenIndex: number;
}

function newRound(mode: Mode): Round {
  const root = randomNote();
  const scaleType: ScaleType =
    mode === 'easy' ? 'major' : pick(['major', 'minor'] as ScaleType[]);
  return {
    root,
    scaleType,
    notes: scaleNotes(root, scaleType),
    // The root is already given by the key name, so never hide degree 0.
    hiddenIndex: 1 + randomInt(6),
  };
}

type Phase = 'guessing' | 'graded';

const MODE_STORAGE_KEY = 'guitar-theory-trainer.scale-mode';

function loadMode(): Mode {
  const stored = localStorage.getItem(MODE_STORAGE_KEY);
  return stored === 'hard' ? 'hard' : 'easy';
}

export default function ScaleTrainer() {
  const [mode, setMode] = useState<Mode>(loadMode);
  const [round, setRound] = useState<Round>(() => newRound(loadMode()));
  const [selected, setSelected] = useState<Note[]>([]);
  const [phase, setPhase] = useState<Phase>('guessing');
  const [correct, setCorrect] = useState(false);

  const needed = mode === 'easy' ? 1 : 7;
  const answerNotes: Note[] =
    mode === 'easy' ? [round.notes[round.hiddenIndex]] : [...round.notes];

  function changeMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    localStorage.setItem(MODE_STORAGE_KEY, next);
    setRound(newRound(next));
    setSelected([]);
    setPhase('guessing');
  }

  function submit() {
    if (selected.length !== needed) return;
    setCorrect(sameNoteSet(selected, answerNotes));
    setPhase('graded');
  }

  function next() {
    setRound(newRound(mode));
    setSelected([]);
    setPhase('guessing');
  }

  const scaleName = `${displayNote(round.root)} ${round.scaleType}`;
  const notesDisplay = round.notes.map(displayNote).join(' – ');

  return (
    <section className="trainer">
      <h2>Scale Trainer</h2>

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
          ? 'One scale degree is hidden. Select the missing note.'
          : 'Select all seven notes of the scale.'}
      </p>

      <div className="chord-prompt">
        <div className="chord-name">{scaleName}</div>
        {mode === 'easy' && (
          <div className="cheat-sheet">
            {MAJOR_SCALE_PATTERN.join(' – ')}
          </div>
        )}
        <div className="tone-slots scale-slots">
          {round.notes.map((note, i) => {
            const hidden = mode === 'hard' || i === round.hiddenIndex;
            return (
              <span
                key={i}
                className={hidden ? 'tone-slot hidden-tone' : 'tone-slot'}
              >
                {hidden && phase !== 'graded' ? '?' : displayNote(note)}
              </span>
            );
          })}
        </div>
      </div>

      <NotePicker
        selected={selected}
        max={needed}
        onChange={setSelected}
        disabled={phase === 'graded'}
        correctNotes={answerNotes}
        graded={phase === 'graded'}
      />
      {mode === 'hard' && (
        <p className="pick-count">
          {selected.length}/{needed} selected
        </p>
      )}

      {phase === 'guessing' ? (
        <button
          type="button"
          className="primary-btn"
          onClick={submit}
          disabled={selected.length !== needed}
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
            <>✓ Correct! {scaleName} is <strong>{notesDisplay}</strong>.</>
          ) : (
            <>
              ✗ Not quite. {scaleName} is <strong>{notesDisplay}</strong>
              {mode === 'easy' && (
                <>
                  {' '}— the missing note was{' '}
                  <strong>{displayNote(round.notes[round.hiddenIndex])}</strong>.
                </>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
