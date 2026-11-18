import { useState } from 'react';
import NotePicker from './NotePicker';
import SheetStaff from './SheetStaff';
import QuizActions from './ui/QuizActions';
import ResultBanner from './ui/ResultBanner';
import SegmentedControl from './ui/SegmentedControl';
import {
  KEYS,
  formatNote,
  pitchClass,
  signatureNotes,
  signatureRule,
  type KeyDef,
  type Note,
} from '../theory';
import { pick } from '../random';
import { oneOf, usePersistentState } from '../hooks/usePersistentState';
import { useQuiz } from '../hooks/useQuiz';

type Ask = 'major' | 'minor' | 'either';

const ASKS = [
  { value: 'major', label: 'Major' },
  { value: 'minor', label: 'Minor' },
  { value: 'either', label: 'Either' },
] as const satisfies readonly { value: Ask; label: string }[];

interface Round {
  key: KeyDef;
  /** Ask for the relative minor instead of the major key. */
  minor: boolean;
}

function newRound(ask: Ask, prev?: Round): Round {
  const key = pick(KEYS.filter((k) => k !== prev?.key));
  const minor = ask === 'minor' || (ask === 'either' && Math.random() < 0.5);
  return { key, minor };
}

/** "2 sharps (F♯ C♯)", "1 flat (B♭)", "no sharps or flats". */
function describeSignature(key: KeyDef): string {
  const notes = signatureNotes(key);
  if (notes.length === 0) return 'no sharps or flats';
  const kind = key.accidentals > 0 ? 'sharp' : 'flat';
  const plural = notes.length === 1 ? '' : 's';
  return `${notes.length} ${kind}${plural} (${notes.map(formatNote).join(' ')})`;
}

/** Sheet Music's key-signature mode: a signature alone; name its key. */
export default function KeySignatureQuiz() {
  const [ask, setAsk] = usePersistentState<Ask>(
    'sheet-key-ask',
    'major',
    oneOf(ASKS.map((a) => a.value)),
  );
  const [selected, setSelected] = useState<Note[]>([]);
  const { round, graded, correct, grade, next } = useQuiz(
    (prev?: Round) => newRound(ask, prev),
    () => setSelected([]),
  );

  function changeAsk(nextAsk: Ask) {
    setAsk(nextAsk);
    next(newRound(nextAsk));
  }

  const { key, minor } = round;
  const answer = pitchClass(minor ? key.minorTonic : key.tonic);
  const asked = minor ? key.minorName : key.name;

  return (
    <>
      <SegmentedControl label="Name the" options={ASKS} value={ask} onChange={changeAsk} />

      <p className="instructions">
        Which <strong>{minor ? 'minor' : 'major'}</strong> key has this key
        signature?
      </p>

      <SheetStaff keyDef={key} />

      <NotePicker
        selected={selected}
        max={1}
        onChange={setSelected}
        disabled={graded}
        correctNotes={[answer]}
        graded={graded}
      />

      <QuizActions
        graded={graded}
        canSubmit={selected.length === 1}
        onSubmit={() => grade(selected[0] === answer)}
        onNext={() => next()}
      />

      {graded && (
        <ResultBanner correct={correct}>
          {correct ? '✓ Correct! ' : '✗ Not quite. '}
          With {describeSignature(key)}, it's <strong>{asked}</strong>.{' '}
          {signatureRule(key)}{' '}
          {minor
            ? `A minor 3rd below that is its relative minor, ${key.minorName}.`
            : `Its relative minor is ${key.minorName}.`}
        </ResultBanner>
      )}
    </>
  );
}
