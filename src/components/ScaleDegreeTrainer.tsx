import { useState } from 'react';
import NotePicker from './NotePicker';
import {
  DEGREE_INFO,
  DEGREE_NAMES,
  displayNote,
  pick,
  randomInt,
  randomNote,
  scaleNotes,
  type Note,
  type ScaleType,
} from '../music';

type Mode = 'easy' | 'hard';

interface Round {
  root: Note;
  scaleType: ScaleType;
  degree: number; // 0-6
  answer: Note;
}

function newRound(mode: Mode): Round {
  const root = randomNote();
  const scaleType: ScaleType =
    mode === 'easy' ? 'major' : pick(['major', 'minor'] as ScaleType[]);
  const degree = randomInt(7);
  return {
    root,
    scaleType,
    degree,
    answer: scaleNotes(root, scaleType)[degree],
  };
}

type Phase = 'guessing' | 'graded';

const MODE_STORAGE_KEY = 'guitar-theory-trainer.scale-degree-mode';

function loadMode(): Mode {
  const stored = localStorage.getItem(MODE_STORAGE_KEY);
  return stored === 'hard' ? 'hard' : 'easy';
}

export default function ScaleDegreeTrainer() {
  const [mode, setMode] = useState<Mode>(loadMode);
  const [round, setRound] = useState<Round>(() => newRound(loadMode()));
  const [selected, setSelected] = useState<Note[]>([]);
  const [phase, setPhase] = useState<Phase>('guessing');
  const [correct, setCorrect] = useState(false);

  function changeMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    localStorage.setItem(MODE_STORAGE_KEY, next);
    setRound(newRound(next));
    setSelected([]);
    setPhase('guessing');
  }

  function submit() {
    if (selected.length !== 1) return;
    setCorrect(selected[0] === round.answer);
    setPhase('graded');
  }

  function next() {
    setRound(newRound(mode));
    setSelected([]);
    setPhase('guessing');
  }

  const scaleName = `${displayNote(round.root)} ${round.scaleType}`;
  const degreeName = DEGREE_NAMES[round.scaleType][round.degree];
  const degreeInfo = DEGREE_INFO[round.scaleType][round.degree];
  const answerLine = (
    <>
      the <strong>{degreeName}</strong> of {scaleName} is{' '}
      <strong>{displayNote(round.answer)}</strong> (degree {round.degree + 1})
    </>
  );

  return (
    <section className="trainer">
      <h2>Scale-Degree Trainer</h2>

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
          ? 'Major keys. Select the note for the named scale degree.'
          : 'Major and minor keys. Select the note for the named scale degree.'}
      </p>

      <div className="chord-prompt">
        <div className="chord-name">{scaleName}</div>
        <div className="degree-name">
          the {degreeName}{' '}
          <span className="degree-num">(degree {round.degree + 1})</span>
        </div>
      </div>

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
          {correct ? <>✓ Correct — {answerLine}.</> : <>✗ Not quite — {answerLine}.</>}
        </div>
      )}

      {phase === 'graded' && (
        <div className="degree-info">
          <div className="degree-info-title">
            {degreeName} <span className="degree-num">(degree {round.degree + 1})</span>
          </div>
          <p>{degreeInfo}</p>
        </div>
      )}
    </section>
  );
}
