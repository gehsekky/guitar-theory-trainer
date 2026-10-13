import { useState, type CSSProperties } from 'react';
import NotePicker from './NotePicker';
import QuizActions from './ui/QuizActions';
import ResultBanner from './ui/ResultBanner';
import DroneKeyNotice from './ui/DroneKeyNotice';
import Dropdown from './ui/Dropdown';
import {
  CHROMATIC,
  NATURAL_NOTES,
  SCALE_DEGREES,
  SCALE_STEPS,
  displayNote,
  formatNote,
  formatNotes,
  sameNoteOrder,
  sameNoteSet,
  scaleNotes,
  spellScale,
  type Note,
  type ScaleType,
} from '../theory';
import { pick } from '../random';
import {
  booleanCodec,
  oneOf,
  usePersistentState,
} from '../hooks/usePersistentState';
import { useQuiz } from '../hooks/useQuiz';
import { useDrone } from '../drone/DroneContext';
import './ScaleTrainer.css';

type Theme =
  | 'major'
  | 'minor'
  | 'majorPentatonic'
  | 'minorPentatonic'
  | 'majorMinor'
  | 'pentatonic'
  | 'all';

// Single scales first, then mixes, shown as two groups in the dropdown.
const THEMES: { value: Theme; label: string; scales: ScaleType[]; mix?: true }[] = [
  { value: 'major', label: 'Major', scales: ['major'] },
  { value: 'minor', label: 'Natural minor', scales: ['minor'] },
  { value: 'majorPentatonic', label: 'Major pentatonic', scales: ['majorPentatonic'] },
  { value: 'minorPentatonic', label: 'Minor pentatonic', scales: ['minorPentatonic'] },
  { value: 'majorMinor', label: 'Major + minor', scales: ['major', 'minor'], mix: true },
  {
    value: 'pentatonic',
    label: 'Both pentatonics',
    scales: ['majorPentatonic', 'minorPentatonic'],
    mix: true,
  },
  {
    value: 'all',
    label: 'All scales',
    scales: ['major', 'minor', 'majorPentatonic', 'minorPentatonic'],
    mix: true,
  },
];

const SCALE_LABEL: Record<ScaleType, string> = {
  major: 'major',
  minor: 'natural minor',
  majorPentatonic: 'major pentatonic',
  minorPentatonic: 'minor pentatonic',
};

const ORDINALS = ['root', '2nd', '3rd', '4th', '5th', '6th', '7th'];

interface Round {
  root: Note;
  scaleType: ScaleType;
}

function scalesFor(theme: Theme): ScaleType[] {
  return THEMES.find((t) => t.value === theme)!.scales;
}

/** A new card, avoiding an immediate repeat of the previous one. */
/** A new card, avoiding an immediate repeat. While the drone sounds, every
 * card is rooted on its key (`lockedKey`). */
function newRound(
  theme: Theme,
  accidentals: boolean,
  lockedKey: Note | null,
  prev?: Round,
): Round {
  const roots = lockedKey ? [lockedKey] : accidentals ? [...CHROMATIC] : NATURAL_NOTES;
  const scales = scalesFor(theme);
  let round: Round;
  do {
    round = { root: pick(roots), scaleType: pick(scales) };
  } while (
    prev &&
    roots.length * scales.length > 1 &&
    round.root === prev.root &&
    round.scaleType === prev.scaleType
  );
  return round;
}

const THEME_VALUES = THEMES.map((t) => t.value);

const THEME_GROUPS = [
  { label: 'One scale', options: THEMES.filter((t) => !t.mix) },
  { label: 'Mix', options: THEMES.filter((t) => t.mix) },
];

export default function ScaleTrainer() {
  const { lockedKey } = useDrone();
  const [theme, setTheme] = usePersistentState<Theme>(
    'scale-theme',
    'major',
    oneOf(THEME_VALUES),
  );
  const [accidentals, setAccidentals] = usePersistentState(
    'scale-accidentals',
    true,
    booleanCodec,
  );
  const [selected, setSelected] = useState<Note[]>([]);
  const { round, graded, correct, grade, next } = useQuiz(
    (prev?: Round) => newRound(theme, accidentals, lockedKey, prev),
    () => setSelected([]),
  );

  const answer = scaleNotes(round.root, round.scaleType);
  const needed = answer.length;

  function changeTheme(nextTheme: Theme) {
    setTheme(nextTheme);
    next(newRound(nextTheme, accidentals, lockedKey));
  }

  function changeAccidentals(nextAccidentals: boolean) {
    setAccidentals(nextAccidentals);
    next(newRound(theme, nextAccidentals, lockedKey));
  }

  // Spelled as in the key (F major has B♭), for the card and the reveal.
  const spelled = spellScale(round.root, round.scaleType);
  const scaleName = `${formatNote(spelled[0])} ${SCALE_LABEL[round.scaleType]}`;
  const answerDisplay = formatNotes(spelled);
  const rightNotesWrongOrder = !correct && sameNoteSet(selected, answer);

  return (
    <section className="trainer">
      <h2>Scale Trainer</h2>

      <div className="toggle-row">
        <Dropdown
          label="Scale"
          groups={THEME_GROUPS}
          value={theme}
          onChange={changeTheme}
        />
        <label className="check-label">
          <input
            type="checkbox"
            checked={accidentals}
            disabled={lockedKey !== null}
            onChange={(e) => changeAccidentals(e.target.checked)}
          />
          Include sharp/flat notes
        </label>
      </div>

      {lockedKey && <DroneKeyNotice lockedKey={lockedKey} />}

      <p className="instructions">
        Spell the scale in order, root first.
      </p>

      <div className="flashcard" aria-label={`Flashcard: ${scaleName}`}>
        <div className="flashcard-note">{formatNote(spelled[0])}</div>
        <div className="flashcard-quality">{SCALE_LABEL[round.scaleType]}</div>
        <div className="scale-steps" aria-label="Step pattern">
          {SCALE_STEPS[round.scaleType].join(' – ')}
        </div>
      </div>

      <div
        className="tone-slots scale-slots"
        style={{ '--slots': needed } as CSSProperties}
      >
        {answer.map((tone, i) => {
          const pickedNote = selected[i];
          const right = graded && tone === pickedNote;
          let cls = 'tone-slot';
          if (graded) cls += right ? ' correct' : ' wrong';
          else if (!pickedNote) cls += ' hidden-tone';
          return (
            <div key={i} className="tone-slot-wrap">
              <span className={cls}>
                {right
                  ? formatNote(spelled[i])
                  : pickedNote
                  ? displayNote(pickedNote)
                      .split('/')
                      .map((name) => <span key={name}>{name}</span>)
                  : '?'}
              </span>
              <span className="tone-role">
                {ORDINALS[SCALE_DEGREES[round.scaleType][i] - 1]}
              </span>
            </div>
          );
        })}
      </div>

      <NotePicker
        selected={selected}
        max={needed}
        onChange={setSelected}
        disabled={graded}
        correctNotes={answer}
        graded={graded}
      />

      <QuizActions
        graded={graded}
        canSubmit={selected.length === needed}
        onSubmit={() => grade(sameNoteOrder(selected, answer))}
        onNext={() => next()}
      />

      {graded && (
        <ResultBanner correct={correct}>
          {correct ? (
            <>✓ Correct! {scaleName} is <strong>{answerDisplay}</strong>.</>
          ) : (
            <>
              ✗ Not quite. {scaleName} is <strong>{answerDisplay}</strong>
              {rightNotesWrongOrder && (
                <> — you had the right notes, but not in scale order</>
              )}
              .
            </>
          )}
        </ResultBanner>
      )}
    </section>
  );
}
