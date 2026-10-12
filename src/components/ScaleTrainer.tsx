import { useState } from 'react';
import NotePicker from './NotePicker';
import QuizActions from './ui/QuizActions';
import ResultBanner from './ui/ResultBanner';
import SegmentedControl from './ui/SegmentedControl';
import DroneKeyNotice from './ui/DroneKeyNotice';
import {
  CHROMATIC,
  NATURAL_NOTES,
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

type Theme = 'major' | 'minor' | 'all';

const THEMES: { value: Theme; label: string; scales: ScaleType[] }[] = [
  { value: 'major', label: 'Major', scales: ['major'] },
  { value: 'minor', label: 'Minor', scales: ['minor'] },
  { value: 'all', label: 'All', scales: ['major', 'minor'] },
];

const SCALE_LABEL: Record<ScaleType, string> = {
  major: 'major',
  minor: 'natural minor',
};

// Scale degree of each slot.
const DEGREE_ROLES = ['root', '2nd', '3rd', '4th', '5th', '6th', '7th'];

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
        <SegmentedControl
          label="Scale theme"
          options={THEMES}
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
        Spell the scale: pick its seven notes in order, starting from the root.
      </p>

      <div className="flashcard" aria-label={`Flashcard: ${scaleName}`}>
        <div className="flashcard-note">{formatNote(spelled[0])}</div>
        <div className="flashcard-quality">{SCALE_LABEL[round.scaleType]}</div>
      </div>

      <div className="tone-slots scale-slots">
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
              <span className="tone-role">{DEGREE_ROLES[i]}</span>
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
