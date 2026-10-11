import { useState } from 'react';
import NotePicker from './NotePicker';
import QuizActions from './ui/QuizActions';
import ResultBanner from './ui/ResultBanner';
import SegmentedControl from './ui/SegmentedControl';
import {
  DEGREE_INFO,
  DEGREE_NAMES,
  formatNote,
  scaleNotes,
  spellScale,
  type Note,
  type ScaleType,
} from '../theory';
import { pick, randomInt, randomNote } from '../random';
import { oneOf, usePersistentState } from '../hooks/usePersistentState';
import { useQuiz } from '../hooks/useQuiz';

type Mode = 'easy' | 'hard';

const MODES = [
  { value: 'easy', label: 'Easy' },
  { value: 'hard', label: 'Hard' },
] as const;

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

export default function ScaleDegreeTrainer() {
  const [mode, setMode] = usePersistentState<Mode>(
    'scale-degree-mode',
    'easy',
    oneOf(['easy', 'hard']),
  );
  const [selected, setSelected] = useState<Note[]>([]);
  const { round, graded, correct, grade, next } = useQuiz(
    () => newRound(mode),
    () => setSelected([]),
  );

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    next(newRound(nextMode));
  }

  const spelled = spellScale(round.root, round.scaleType);
  const scaleName = `${formatNote(spelled[0])} ${round.scaleType}`;
  const degreeName = DEGREE_NAMES[round.scaleType][round.degree];
  const degreeInfo = DEGREE_INFO[round.scaleType][round.degree];
  const answerLine = (
    <>
      the <strong>{degreeName}</strong> of {scaleName} is{' '}
      <strong>{formatNote(spelled[round.degree])}</strong> (degree {round.degree + 1})
    </>
  );

  return (
    <section className="trainer">
      <h2>Scale-Degree Trainer</h2>

      <SegmentedControl
        label="Difficulty"
        options={MODES}
        value={mode}
        onChange={changeMode}
      />

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
          {correct ? <>✓ Correct — {answerLine}.</> : <>✗ Not quite — {answerLine}.</>}
        </ResultBanner>
      )}

      {graded && (
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
