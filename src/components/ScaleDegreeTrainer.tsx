import { useState } from 'react';
import NotePicker from './NotePicker';
import QuizActions from './ui/QuizActions';
import ResultBanner from './ui/ResultBanner';
import SegmentedControl from './ui/SegmentedControl';
import DroneKeyNotice from './ui/DroneKeyNotice';
import {
  DEGREE_INFO,
  DEGREE_NAMES,
  DIATONIC,
  QUALITY_LABEL,
  formatNote,
  formatNotes,
  keyTonic,
  scaleNotes,
  spellDiatonicTriad,
  type Note,
  type Quality,
  type KeyType,
} from '../theory';
import { pick, randomInt, randomNote } from '../random';
import { oneOf, readSetting, usePersistentState } from '../hooks/usePersistentState';
import { useQuiz } from '../hooks/useQuiz';
import { useDrone } from '../drone/DroneContext';
import './ScaleDegreeTrainer.css';

// Three questions about the same thing, the seven degrees of a key:
// which note a degree is, which chord a Roman numeral is, and which
// numeral a chord is.
type Quiz = 'note' | 'chord' | 'numeral';
type Keys = KeyType | 'both';

const QUIZZES = [
  { value: 'note', label: 'Note' },
  { value: 'chord', label: 'Chord' },
  { value: 'numeral', label: 'Numeral' },
] as const;

const KEY_CHOICES = [
  { value: 'major', label: 'Major' },
  { value: 'minor', label: 'Minor' },
  { value: 'both', label: 'Both' },
] as const;

// Both major and natural-minor keys only ever produce these three qualities.
const QUALITIES: Quality[] = ['major', 'minor', 'diminished'];

// Before Scale Degrees and Diatonic Chords merged, Scale Degrees had an
// Easy (major keys) / Hard (major or minor) setting; carry it over.
const legacyKeys = (): Keys =>
  readSetting('scale-degree-mode', oneOf(['easy', 'hard']), 'easy') === 'hard'
    ? 'both'
    : 'major';

interface Round {
  root: Note;
  scaleType: KeyType;
  degree: number; // 0-6
}

/** A new question; while the drone sounds, always in its key (`lockedKey`). */
function newRound(keys: Keys, lockedKey: Note | null): Round {
  return {
    root: lockedKey ?? randomNote(),
    scaleType: keys === 'both' ? pick<KeyType>(['major', 'minor']) : keys,
    degree: randomInt(7),
  };
}

export default function ScaleDegreeTrainer() {
  const { lockedKey } = useDrone();
  const [quiz, setQuiz] = usePersistentState<Quiz>(
    'scale-degree-quiz',
    'note',
    oneOf(['note', 'chord', 'numeral']),
  );
  const [keys, setKeys] = usePersistentState<Keys>(
    'scale-degree-keys',
    legacyKeys(),
    oneOf(['major', 'minor', 'both']),
  );

  const [selectedNote, setSelectedNote] = useState<Note[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<Quality | null>(null);
  const [selectedNumeral, setSelectedNumeral] = useState<string | null>(null);

  const { round, graded, correct, grade, next } = useQuiz(
    () => newRound(keys, lockedKey),
    () => {
      setSelectedNote([]);
      setSelectedQuality(null);
      setSelectedNumeral(null);
    },
  );

  function changeQuiz(nextQuiz: Quiz) {
    setQuiz(nextQuiz);
    next();
  }

  function changeKeys(nextKeys: Keys) {
    setKeys(nextKeys);
    next(newRound(nextKeys, lockedKey));
  }

  const { root, scaleType, degree } = round;
  const keyName = `${formatNote(keyTonic(root, scaleType))} ${scaleType}`;
  const degreeName = DEGREE_NAMES[scaleType][degree];
  const degreeNum = `degree ${degree + 1}`;
  const note = scaleNotes(root, scaleType)[degree];
  const chord = DIATONIC[scaleType][degree];
  // Spelled within the key: IV of F major is B♭ major (B♭ – D – F).
  const triad = spellDiatonicTriad(root, scaleType, degree);
  const chordName = `${formatNote(triad[0])} ${QUALITY_LABEL[chord.quality]}`;

  const ready = {
    note: selectedNote.length === 1,
    chord: selectedNote.length === 1 && selectedQuality !== null,
    numeral: selectedNumeral !== null,
  }[quiz];

  function submit() {
    grade(
      {
        note: selectedNote[0] === note,
        chord: selectedNote[0] === note && selectedQuality === chord.quality,
        numeral: selectedNumeral === chord.numeral,
      }[quiz],
    );
  }

  // The prompt already shows the key, so the answer lines leave it out.
  const reveal = {
    note: (
      <>
        the <strong>{degreeName}</strong> is <strong>{formatNote(triad[0])}</strong>
      </>
    ),
    chord: (
      <>
        <strong>{chord.numeral}</strong> is <strong>{chordName}</strong>{' '}
        <span className="nowrap">({formatNotes(triad)})</span>
      </>
    ),
    numeral: (
      <>
        <strong>{chordName}</strong> is <strong>{chord.numeral}</strong>
      </>
    ),
  }[quiz];

  const question = {
    note: (
      <>
        Which note is the <span className="degree-name">{degreeName}</span>?
      </>
    ),
    chord: (
      <>
        Which chord is <span className="numeral-display">{chord.numeral}</span>?
      </>
    ),
    numeral: (
      <>
        Which numeral is <strong>{chordName}</strong>?
      </>
    ),
  }[quiz];

  return (
    <section className="trainer">
      <h2>Scale-Degree Trainer</h2>

      <div className="toggle-row">
        <div className="toggle-group">
          <span className="toggle-label">Quiz</span>
          <SegmentedControl
            label="Quiz"
            options={QUIZZES}
            value={quiz}
            onChange={changeQuiz}
          />
        </div>

        <div className="toggle-group">
          <span className="toggle-label">Keys</span>
          <SegmentedControl
            label="Keys"
            options={KEY_CHOICES}
            value={keys}
            onChange={changeKeys}
          />
        </div>
      </div>

      {lockedKey && <DroneKeyNotice lockedKey={lockedKey} />}

      <div className="chord-prompt">
        <div className="prompt-caption">Key</div>
        <div className="chord-name">{keyName}</div>
        <div className="prompt-question">{question}</div>
        {quiz === 'note' && <div className="prompt-subtitle">({degreeNum})</div>}
      </div>

      {quiz !== 'numeral' && (
        <>
          {quiz === 'chord' && <div className="field-label">Root</div>}
          <NotePicker
            selected={selectedNote}
            max={1}
            onChange={setSelectedNote}
            disabled={graded}
            correctNotes={[note]}
            graded={graded}
          />
        </>
      )}

      {quiz === 'chord' && (
        <>
          <div className="field-label">Quality</div>
          <ChipGroup
            label="Chord quality"
            options={QUALITIES}
            render={(q) => QUALITY_LABEL[q]}
            selected={selectedQuality}
            answer={chord.quality}
            graded={graded}
            onChange={setSelectedQuality}
          />
        </>
      )}

      {quiz === 'numeral' && (
        <ChipGroup
          label="Roman numeral"
          className="numeral-btn"
          options={DIATONIC[scaleType].map((c) => c.numeral)}
          render={(n) => n}
          selected={selectedNumeral}
          answer={chord.numeral}
          graded={graded}
          onChange={setSelectedNumeral}
        />
      )}

      <QuizActions
        graded={graded}
        canSubmit={ready}
        onSubmit={submit}
        onNext={() => next()}
      />

      {graded && (
        <ResultBanner correct={correct}>
          {correct ? <>✓ Correct — {reveal}.</> : <>✗ Not quite — {reveal}.</>}
        </ResultBanner>
      )}

      {graded && (
        <div className="degree-info">
          <div className="degree-info-title">
            {chord.numeral} · <span className="capitalize">{degreeName}</span>{' '}
            <span className="degree-num">({degreeNum})</span>
          </div>
          <p>{DEGREE_INFO[scaleType][degree]}</p>
        </div>
      )}
    </section>
  );
}

/** A single-choice row of chip buttons, marked right/wrong once graded. */
function ChipGroup<T extends string>({
  label,
  className,
  options,
  render,
  selected,
  answer,
  graded,
  onChange,
}: {
  label: string;
  className?: string;
  options: readonly T[];
  render: (option: T) => string;
  selected: T | null;
  answer: T;
  graded: boolean;
  onChange: (option: T | null) => void;
}) {
  return (
    <div className="chip-row" role="group" aria-label={label}>
      {options.map((option) => {
        const isSelected = selected === option;
        const isCorrect = graded && option === answer;
        const isWrong = graded && isSelected && !isCorrect;
        let cls = 'note-btn chip-btn';
        if (className) cls += ` ${className}`;
        if (isSelected) cls += ' selected';
        if (isCorrect) cls += ' correct';
        if (isWrong) cls += ' wrong';
        return (
          <button
            key={option}
            type="button"
            className={cls}
            aria-pressed={isSelected}
            disabled={graded}
            onClick={() => onChange(isSelected ? null : option)}
          >
            {render(option)}
          </button>
        );
      })}
    </div>
  );
}
