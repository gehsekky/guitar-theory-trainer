import { useState } from 'react';
import NotePicker from './NotePicker';
import QuizActions from './ui/QuizActions';
import ResultBanner from './ui/ResultBanner';
import SegmentedControl from './ui/SegmentedControl';
import {
  CHORD_TYPES,
  CHROMATIC,
  NATURAL_NOTES,
  chordNotes,
  displayNote,
  formatNote,
  formatNotes,
  sameNoteOrder,
  sameNoteSet,
  spellChord,
  type ChordType,
  type Note,
} from '../theory';
import { pick } from '../random';
import {
  booleanCodec,
  oneOf,
  usePersistentState,
} from '../hooks/usePersistentState';
import { useQuiz } from '../hooks/useQuiz';

type Theme = 'major' | 'minor' | 'maj7' | 'all';

const { major, minor, major7 } = CHORD_TYPES;

const THEMES: { value: Theme; label: string; chords: ChordType[] }[] = [
  { value: 'major', label: 'Major', chords: [major] },
  { value: 'minor', label: 'Minor', chords: [minor] },
  { value: 'maj7', label: 'Major 7th', chords: [major7] },
  { value: 'all', label: 'All', chords: [major, minor, major7] },
];

// Root-position role of each chord tone, by slot.
const TONE_ROLES = ['root', '3rd', '5th', '7th'];

interface Round {
  root: Note;
  chord: ChordType;
}

function chordsFor(theme: Theme): ChordType[] {
  return THEMES.find((t) => t.value === theme)!.chords;
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

const THEME_VALUES = THEMES.map((t) => t.value);

export default function ChordFlashcardTrainer() {
  const [theme, setTheme] = usePersistentState<Theme>(
    'chord-flashcard-theme',
    'major',
    oneOf(THEME_VALUES),
  );
  const [accidentals, setAccidentals] = usePersistentState(
    'chord-flashcard-accidentals',
    true,
    booleanCodec,
  );
  const [selected, setSelected] = useState<Note[]>([]);
  const { round, graded, correct, grade, next } = useQuiz(
    (prev?: Round) => newRound(theme, accidentals, prev),
    () => setSelected([]),
  );

  const answer = chordNotes(round.root, round.chord.intervals);
  const needed = answer.length;

  function changeTheme(nextTheme: Theme) {
    setTheme(nextTheme);
    next(newRound(nextTheme, accidentals));
  }

  function changeAccidentals(nextAccidentals: boolean) {
    setAccidentals(nextAccidentals);
    next(newRound(theme, nextAccidentals));
  }

  // Spelled from the simpler root (B♭ major, not A♯ major).
  const spelled = spellChord(round.root, round.chord);
  const chordName = `${formatNote(spelled[0])} ${round.chord.name}`;
  const answerDisplay = formatNotes(spelled);
  const rightNotesWrongOrder = !correct && sameNoteSet(selected, answer);

  return (
    <section className="trainer">
      <h2>Chord Flashcards</h2>

      <div className="toggle-row">
        <SegmentedControl
          label="Chord theme"
          options={THEMES}
          value={theme}
          onChange={changeTheme}
        />
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
        <div className="flashcard-note">{formatNote(spelled[0])}</div>
        <div className="flashcard-quality">{round.chord.name}</div>
      </div>

      <div className="tone-slots">
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
                    : '?'}
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

      <QuizActions
        graded={graded}
        canSubmit={selected.length === needed}
        onSubmit={() => grade(sameNoteOrder(selected, answer))}
        onNext={() => next()}
      />

      {graded && (
        <ResultBanner correct={correct}>
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
        </ResultBanner>
      )}
    </section>
  );
}
