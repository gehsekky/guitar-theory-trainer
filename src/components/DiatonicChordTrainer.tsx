import { useState } from 'react';
import NotePicker from './NotePicker';
import QuizActions from './ui/QuizActions';
import ResultBanner from './ui/ResultBanner';
import SegmentedControl from './ui/SegmentedControl';
import DroneKeyNotice from './ui/DroneKeyNotice';
import {
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
} from '../theory';
import { randomInt, randomNote } from '../random';
import { oneOf, usePersistentState } from '../hooks/usePersistentState';
import { useQuiz } from '../hooks/useQuiz';
import { useDrone } from '../drone/DroneContext';
import './DiatonicChordTrainer.css';

// Both major and natural-minor keys only ever produce these three qualities.
const FIND_QUALITIES: Quality[] = ['major', 'minor', 'diminished'];

type Mode = 'find' | 'name';
type KeyType = 'major' | 'minor';

const MODES = [
  { value: 'find', label: 'Find Chord' },
  { value: 'name', label: 'Name Numeral' },
] as const;

const KEY_TYPES = [
  { value: 'major', label: 'Major' },
  { value: 'minor', label: 'Minor' },
] as const;

interface Round {
  keyRoot: Note;
  degree: number; // 0-6
}

/** A new question; while the drone sounds, always in its key (`lockedKey`). */
function newRound(lockedKey: Note | null): Round {
  return { keyRoot: lockedKey ?? randomNote(), degree: randomInt(7) };
}

export default function DiatonicChordTrainer() {
  const { lockedKey } = useDrone();
  const [mode, setMode] = usePersistentState<Mode>(
    'diatonic-mode',
    'find',
    oneOf(['find', 'name']),
  );
  const [keyType, setKeyType] = usePersistentState<KeyType>(
    'diatonic-keytype',
    'major',
    oneOf(['major', 'minor']),
  );

  // Find-mode inputs
  const [selectedRoot, setSelectedRoot] = useState<Note[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<Quality | null>(null);
  // Name-mode input
  const [selectedNumeral, setSelectedNumeral] = useState<string | null>(null);

  const { round, graded, correct, grade, next } = useQuiz(() => newRound(lockedKey), () => {
    setSelectedRoot([]);
    setSelectedQuality(null);
    setSelectedNumeral(null);
  });

  const numerals = DIATONIC[keyType].map((c) => c.numeral);
  const chord = DIATONIC[keyType][round.degree];
  const chordRoot = scaleNotes(round.keyRoot, keyType)[round.degree];
  // Spelled within the key: IV of F major is B♭ major (B♭ – D – F).
  const spelledTriad = spellDiatonicTriad(round.keyRoot, keyType, round.degree);
  const keyName = `${formatNote(keyTonic(round.keyRoot, keyType))} ${keyType}`;
  const chordName = `${formatNote(spelledTriad[0])} ${QUALITY_LABEL[chord.quality]}`;
  const degreeName = DEGREE_NAMES[keyType][round.degree];
  const triadDisplay = formatNotes(spelledTriad);

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    next();
  }

  function changeKeyType(nextKeyType: KeyType) {
    setKeyType(nextKeyType);
    next();
  }

  const ready =
    mode === 'find'
      ? selectedRoot.length === 1 && selectedQuality !== null
      : selectedNumeral !== null;

  function submit() {
    grade(
      mode === 'find'
        ? selectedRoot[0] === chordRoot && selectedQuality === chord.quality
        : selectedNumeral === chord.numeral,
    );
  }

  const reveal =
    mode === 'find' ? (
      <>
        <strong>{chord.numeral}</strong> in {keyName} is{' '}
        <strong>{chordName}</strong> ({triadDisplay}) — the {degreeName}
      </>
    ) : (
      <>
        <strong>{chordName}</strong> is <strong>{chord.numeral}</strong> in{' '}
        {keyName} — the {degreeName}
      </>
    );

  return (
    <section className="trainer">
      <h2>Diatonic Chord Trainer</h2>

      <div className="toggle-row">
        <div className="toggle-group">
          <span className="toggle-label">Mode</span>
          <SegmentedControl
            label="Mode"
            options={MODES}
            value={mode}
            onChange={changeMode}
          />
        </div>

        <div className="toggle-group">
          <span className="toggle-label">Key</span>
          <SegmentedControl
            label="Key type"
            options={KEY_TYPES}
            value={keyType}
            onChange={changeKeyType}
          />
        </div>
      </div>

      {lockedKey && <DroneKeyNotice lockedKey={lockedKey} />}

      <p className="instructions">
        {mode === 'find'
          ? 'Identify the chord for the Roman numeral — pick its root and quality.'
          : 'Name the Roman numeral for the chord shown in this key.'}
      </p>

      {mode === 'find' ? (
        <>
          <div className="chord-prompt">
            <div className="chord-name">{keyName}</div>
            <div className="numeral-display">{chord.numeral}</div>
          </div>

          <div className="field-label">{degreeName} (chord root)</div>
          <NotePicker
            selected={selectedRoot}
            max={1}
            onChange={setSelectedRoot}
            disabled={graded}
            correctNotes={[chordRoot]}
            graded={graded}
          />

          <div className="field-label">Quality</div>
          <div className="chip-row" role="group" aria-label="Chord quality">
            {FIND_QUALITIES.map((q) => {
              const isSelected = selectedQuality === q;
              const isCorrect = graded && q === chord.quality;
              const isWrong = graded && isSelected && !isCorrect;
              let cls = 'note-btn chip-btn';
              if (isSelected) cls += ' selected';
              if (isCorrect) cls += ' correct';
              if (isWrong) cls += ' wrong';
              return (
                <button
                  key={q}
                  type="button"
                  className={cls}
                  aria-pressed={isSelected}
                  disabled={graded}
                  onClick={() => setSelectedQuality(isSelected ? null : q)}
                >
                  {QUALITY_LABEL[q]}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="chord-prompt">
            <div className="chord-label">In {keyName}:</div>
            <div className="chord-name">{chordName}</div>
          </div>

          <div className="field-label">Roman numeral</div>
          <div className="chip-row" role="group" aria-label="Roman numeral">
            {numerals.map((num) => {
              const isSelected = selectedNumeral === num;
              const isCorrect = graded && num === chord.numeral;
              const isWrong = graded && isSelected && !isCorrect;
              let cls = 'note-btn chip-btn numeral-btn';
              if (isSelected) cls += ' selected';
              if (isCorrect) cls += ' correct';
              if (isWrong) cls += ' wrong';
              return (
                <button
                  key={num}
                  type="button"
                  className={cls}
                  aria-pressed={isSelected}
                  disabled={graded}
                  onClick={() => setSelectedNumeral(isSelected ? null : num)}
                >
                  {num}
                </button>
              );
            })}
          </div>
        </>
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
    </section>
  );
}
