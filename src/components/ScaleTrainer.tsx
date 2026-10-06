import { useState } from 'react';
import NotePicker from './NotePicker';
import {
  CHROMATIC,
  NATURAL_NOTES,
  displayNote,
  sameNoteOrder,
  sameNoteSet,
  scaleNotes,
  type Note,
  type ScaleType,
} from '../theory';
import { pick } from '../random';

type Theme = 'major' | 'minor' | 'all';

const THEMES: { id: Theme; label: string; scales: ScaleType[] }[] = [
  { id: 'major', label: 'Major', scales: ['major'] },
  { id: 'minor', label: 'Minor', scales: ['minor'] },
  { id: 'all', label: 'All', scales: ['major', 'minor'] },
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
  return THEMES.find((t) => t.id === theme)!.scales;
}

/** A new card, avoiding an immediate repeat of the previous one. */
function newRound(theme: Theme, accidentals: boolean, prev?: Round): Round {
  const roots = accidentals ? [...CHROMATIC] : NATURAL_NOTES;
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

type Phase = 'guessing' | 'graded';

const THEME_STORAGE_KEY = 'guitar-theory-trainer.scale-theme';
const ACCIDENTALS_STORAGE_KEY = 'guitar-theory-trainer.scale-accidentals';

function loadTheme(): Theme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return THEMES.some((t) => t.id === stored) ? (stored as Theme) : 'major';
}

function loadAccidentals(): boolean {
  return localStorage.getItem(ACCIDENTALS_STORAGE_KEY) !== 'false';
}

export default function ScaleTrainer() {
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [accidentals, setAccidentals] = useState(loadAccidentals);
  const [round, setRound] = useState<Round>(() =>
    newRound(loadTheme(), loadAccidentals()),
  );
  const [selected, setSelected] = useState<Note[]>([]);
  const [phase, setPhase] = useState<Phase>('guessing');
  const [correct, setCorrect] = useState(false);

  const answer = scaleNotes(round.root, round.scaleType);
  const needed = answer.length;
  const graded = phase === 'graded';

  function reset(nextTheme: Theme, nextAccidentals: boolean) {
    setRound(newRound(nextTheme, nextAccidentals));
    setSelected([]);
    setPhase('guessing');
  }

  function changeTheme(next: Theme) {
    if (next === theme) return;
    setTheme(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
    reset(next, accidentals);
  }

  function changeAccidentals(next: boolean) {
    setAccidentals(next);
    localStorage.setItem(ACCIDENTALS_STORAGE_KEY, String(next));
    reset(theme, next);
  }

  function submit() {
    if (selected.length !== needed) return;
    setCorrect(sameNoteOrder(selected, answer));
    setPhase('graded');
  }

  function next() {
    setRound(newRound(theme, accidentals, round));
    setSelected([]);
    setPhase('guessing');
  }

  const scaleName = `${displayNote(round.root)} ${SCALE_LABEL[round.scaleType]}`;
  const answerDisplay = answer.map(displayNote).join(' – ');
  const rightNotesWrongOrder = !correct && sameNoteSet(selected, answer);

  return (
    <section className="trainer">
      <h2>Scale Trainer</h2>

      <div className="toggle-row">
        <div className="mode-toggle" role="radiogroup" aria-label="Scale theme">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={theme === t.id}
              className={theme === t.id ? 'mode-btn active' : 'mode-btn'}
              onClick={() => changeTheme(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <label className="check-label">
          <input
            type="checkbox"
            checked={accidentals}
            onChange={(e) => changeAccidentals(e.target.checked)}
          />
          Include sharp/flat notes
        </label>
      </div>

      <p className="instructions">
        Spell the scale: pick its seven notes in order, starting from the root.
      </p>

      <div className="flashcard" aria-label={`Flashcard: ${scaleName}`}>
        <div className="flashcard-note">{displayNote(round.root)}</div>
        <div className="flashcard-quality">{SCALE_LABEL[round.scaleType]}</div>
      </div>

      <div className="tone-slots scale-slots">
        {answer.map((tone, i) => {
          const pickedNote = selected[i];
          let cls = 'tone-slot';
          if (graded) cls += tone === pickedNote ? ' correct' : ' wrong';
          else if (!pickedNote) cls += ' hidden-tone';
          return (
            <div key={i} className="tone-slot-wrap">
              <span className={cls}>
                {pickedNote
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

      {graded && (
        <div
          className={correct ? 'result success' : 'result failure'}
          role="status"
        >
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
        </div>
      )}
    </section>
  );
}
