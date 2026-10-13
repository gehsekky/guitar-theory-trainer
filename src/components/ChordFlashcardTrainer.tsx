import { useState } from 'react';
import NotePicker from './NotePicker';
import QuizActions from './ui/QuizActions';
import ResultBanner from './ui/ResultBanner';
import Dropdown from './ui/Dropdown';
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

const {
  major,
  minor,
  diminished,
  augmented,
  major7,
  dominant7,
  minor7,
  halfDiminished7,
  diminished7,
} = CHORD_TYPES;

const TRIADS = [major, minor, diminished, augmented];
const SEVENTHS = [major7, dominant7, minor7, halfDiminished7, diminished7];

// Single chord types first, then mixes, shown as two groups in the dropdown.
// Saved ids predate the dropdown (major, minor, maj7, all), so keep them.
const THEMES = [
  { value: 'major', label: 'Major', chords: [major] },
  { value: 'minor', label: 'Minor', chords: [minor] },
  { value: 'diminished', label: 'Diminished', chords: [diminished] },
  { value: 'augmented', label: 'Augmented', chords: [augmented] },
  { value: 'maj7', label: 'Major 7th', chords: [major7] },
  { value: 'dom7', label: 'Dominant 7th', chords: [dominant7] },
  { value: 'min7', label: 'Minor 7th', chords: [minor7] },
  { value: 'halfDim7', label: 'Half-diminished 7th', chords: [halfDiminished7] },
  { value: 'dim7', label: 'Diminished 7th', chords: [diminished7] },
  { value: 'majorMinor', label: 'Major + minor', chords: [major, minor], mix: true },
  { value: 'triads', label: 'All triads', chords: TRIADS, mix: true },
  { value: 'sevenths', label: 'All 7th chords', chords: SEVENTHS, mix: true },
  { value: 'all', label: 'All chords', chords: [...TRIADS, ...SEVENTHS], mix: true },
] as const satisfies readonly {
  value: string;
  label: string;
  chords: readonly ChordType[];
  mix?: true;
}[];

type Theme = (typeof THEMES)[number]['value'];

interface Round {
  root: Note;
  chord: ChordType;
}

function chordsFor(theme: Theme): readonly ChordType[] {
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

const THEME_GROUPS = [
  { label: 'One chord', options: THEMES.filter((t) => !('mix' in t)) },
  { label: 'Mix', options: THEMES.filter((t) => 'mix' in t) },
];

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
        <Dropdown
          label="Chord"
          groups={THEME_GROUPS}
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
        Spell the chord in order, root first.
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
              <span className="tone-role">{round.chord.degrees[i]}</span>
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
