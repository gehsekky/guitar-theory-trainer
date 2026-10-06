import { useState } from 'react';
import NotePicker from './NotePicker';
import {
  CHORD_TYPES,
  CHROMATIC,
  NATURAL_NOTES,
  chordNotes,
  displayNote,
  sameNoteOrder,
  sameNoteSet,
  type ChordType,
  type Note,
} from '../theory';
import { pick } from '../random';

type Theme = 'major' | 'minor' | 'maj7' | 'all';

const { major, minor, major7 } = CHORD_TYPES;

const THEMES: { id: Theme; label: string; chords: ChordType[] }[] = [
  { id: 'major', label: 'Major', chords: [major] },
  { id: 'minor', label: 'Minor', chords: [minor] },
  { id: 'maj7', label: 'Major 7th', chords: [major7] },
  { id: 'all', label: 'All', chords: [major, minor, major7] },
];

// Root-position role of each chord tone, by slot.
const TONE_ROLES = ['root', '3rd', '5th', '7th'];

interface Round {
  root: Note;
  chord: ChordType;
}

function chordsFor(theme: Theme): ChordType[] {
  return THEMES.find((t) => t.id === theme)!.chords;
}

/** A new card, avoiding an immediate repeat of the previous one. */
function newRound(theme: Theme, accidentals: boolean, prev?: Round): Round {
  const roots = accidentals ? [...CHROMATIC] : NATURAL_NOTES;
  const chords = chordsFor(theme);
  let round: Round;
  do {
    round = { root: pick(roots), chord: pick(chords) };
  } while (
    prev &&
    roots.length * chords.length > 1 &&
    round.root === prev.root &&
    round.chord === prev.chord
  );
  return round;
}

type Phase = 'guessing' | 'graded';

const THEME_STORAGE_KEY = 'guitar-theory-trainer.chord-flashcard-theme';
const ACCIDENTALS_STORAGE_KEY = 'guitar-theory-trainer.chord-flashcard-accidentals';

function loadTheme(): Theme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return THEMES.some((t) => t.id === stored) ? (stored as Theme) : 'major';
}

function loadAccidentals(): boolean {
  return localStorage.getItem(ACCIDENTALS_STORAGE_KEY) !== 'false';
}

export default function ChordFlashcardTrainer() {
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [accidentals, setAccidentals] = useState(loadAccidentals);
  const [round, setRound] = useState<Round>(() =>
    newRound(loadTheme(), loadAccidentals()),
  );
  const [selected, setSelected] = useState<Note[]>([]);
  const [phase, setPhase] = useState<Phase>('guessing');
  const [correct, setCorrect] = useState(false);

  const answer = chordNotes(round.root, round.chord.intervals);
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

  const chordName = `${displayNote(round.root)} ${round.chord.name}`;
  const answerDisplay = answer.map(displayNote).join(' – ');
  const rightNotesWrongOrder = !correct && sameNoteSet(selected, answer);

  return (
    <section className="trainer">
      <h2>Chord Flashcards</h2>

      <div className="toggle-row">
        <div className="mode-toggle" role="radiogroup" aria-label="Chord theme">
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
        Spell the chord in root position: pick its notes in order, starting
        from the root.
      </p>

      <div className="flashcard" aria-label={`Flashcard: ${chordName}`}>
        <div className="flashcard-note">{displayNote(round.root)}</div>
        <div className="flashcard-quality">{round.chord.name}</div>
      </div>

      <div className="tone-slots">
        {answer.map((tone, i) => {
          const pickedNote = selected[i];
          let cls = 'tone-slot';
          if (graded) cls += tone === pickedNote ? ' correct' : ' wrong';
          else if (!pickedNote) cls += ' hidden-tone';
          return (
            <div key={i} className="tone-slot-wrap">
              <span className={cls}>
                {pickedNote ? displayNote(pickedNote) : '?'}
              </span>
              <span className="tone-role">{TONE_ROLES[i]}</span>
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
            <>✓ Correct! {chordName} is <strong>{answerDisplay}</strong>.</>
          ) : (
            <>
              ✗ Not quite. {chordName} is <strong>{answerDisplay}</strong>
              {rightNotesWrongOrder && (
                <> — you had the right notes, but not in root-position order</>
              )}
              .
            </>
          )}
        </div>
      )}
    </section>
  );
}
