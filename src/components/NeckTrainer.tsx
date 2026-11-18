import { useState } from 'react';
import Fretboard, { type FretboardMarker, type FretboardNote } from './Fretboard';
import NotePicker from './NotePicker';
import QuizActions from './ui/QuizActions';
import ResultBanner from './ui/ResultBanner';
import SegmentedControl from './ui/SegmentedControl';
import {
  CHROMATIC,
  FRET_COUNT,
  STRINGS,
  displayNote,
  noteAt,
  notePositions,
  type Note,
} from '../theory';
import { pick, randomInt } from '../random';
import { jsonCodec, oneOf, usePersistentState } from '../hooks/usePersistentState';
import { useQuiz } from '../hooks/useQuiz';
import './NeckTrainer.css';

const ALL_STRINGS = STRINGS.map((_s, i) => i);
// Low to high, as guitarists spell the tuning: E A D G B e.
const STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'e'];

type Mode = 'name' | 'find';

const MODES = [
  { value: 'name', label: 'Name it' },
  { value: 'find', label: 'Find all' },
] as const satisfies readonly { value: Mode; label: string }[];

interface Round {
  answer: Note;
  /** Name mode: the marked position, which plays `answer`. */
  marker?: FretboardMarker;
}

/** A new round, avoiding an immediate repeat: a position on one of
 * `strings` to name, or a note to find. */
function newRound(mode: Mode, strings: number[], prev?: Round): Round {
  if (mode === 'find') {
    return { answer: pick(CHROMATIC.filter((n) => n !== prev?.answer)) };
  }
  let stringIndex: number;
  let fret: number;
  do {
    stringIndex = pick(strings);
    fret = randomInt(FRET_COUNT + 1); // include open string
  } while (
    prev?.marker &&
    stringIndex === prev.marker.stringIndex &&
    fret === prev.marker.fret
  );
  return { marker: { stringIndex, fret }, answer: noteAt(stringIndex, fret) };
}

const positionKey = ({ stringIndex, fret }: FretboardMarker) => `${stringIndex}:${fret}`;

/** A note short enough for a fretboard dot: A♯, not A♯/B♭. */
const dotLabel = (note: Note) => note.replace('#', '♯');

/** Find mode's dots: what was tapped, then once graded, each tap marked
 * right or wrong and each place left out marked missed. */
function findDots(
  taps: readonly FretboardMarker[],
  targets: readonly FretboardMarker[],
  graded: boolean,
): FretboardNote[] {
  if (!graded) {
    return taps.map((t) => ({ ...t, label: '', root: false, status: 'selected' }));
  }
  const tapped = new Set(taps.map(positionKey));
  const targetKeys = new Set(targets.map(positionKey));
  return [
    ...taps.map((t): FretboardNote => {
      const note = noteAt(t.stringIndex, t.fret);
      const right = targetKeys.has(positionKey(t));
      return { ...t, label: dotLabel(note), root: false, status: right ? 'correct' : 'wrong' };
    }),
    ...targets
      .filter((t) => !tapped.has(positionKey(t)))
      .map((t): FretboardNote => ({
        ...t,
        label: dotLabel(noteAt(t.stringIndex, t.fret)),
        root: false,
        status: 'missed',
      })),
  ];
}

// Saved as a JSON list of string indices; keep only valid ones, and never
// end up with no strings at all.
const stringsCodec = jsonCodec((stored) => {
  if (!Array.isArray(stored)) return undefined;
  const valid = ALL_STRINGS.filter((i) => stored.includes(i));
  return valid.length > 0 ? valid : undefined;
});

export default function NeckTrainer() {
  const [mode, setMode] = usePersistentState<Mode>(
    'neck-mode',
    'name',
    oneOf(MODES.map((m) => m.value)),
  );
  const [strings, setStrings] = usePersistentState(
    'neck-strings',
    ALL_STRINGS,
    stringsCodec,
  );
  const [selected, setSelected] = useState<Note[]>([]);
  const [taps, setTaps] = useState<FretboardMarker[]>([]);
  const { round, graded, correct, grade, next } = useQuiz(
    (prev?: Round) => newRound(mode, strings, prev),
    () => {
      setSelected([]);
      setTaps([]);
    },
  );

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    next(newRound(nextMode, strings));
  }

  function changeStrings(nextStrings: number[]) {
    // Keep at least one string eligible.
    if (nextStrings.length === 0) return;
    setStrings(nextStrings);
    next(newRound(mode, nextStrings));
  }

  // Find mode: every place the note sounds on the strings in play.
  const targets = notePositions([round.answer]).filter((p) =>
    strings.includes(p.stringIndex),
  );

  /** Tap a place to pick it, tap again to take it back. Dimmed strings
   * aren't in play. */
  function toggleTap(position: FretboardMarker) {
    if (!strings.includes(position.stringIndex)) return;
    const key = positionKey(position);
    setTaps((prev) =>
      prev.some((t) => positionKey(t) === key)
        ? prev.filter((t) => positionKey(t) !== key)
        : [...prev, position],
    );
  }

  function submitFind() {
    const targetKeys = new Set(targets.map(positionKey));
    grade(
      taps.length === targets.length && taps.every((t) => targetKeys.has(positionKey(t))),
    );
  }

  const found = taps.filter((t) => noteAt(t.stringIndex, t.fret) === round.answer).length;
  const wrong = taps.length - found;

  function toggleString(i: number) {
    changeStrings(
      strings.includes(i)
        ? strings.filter((s) => s !== i)
        : ALL_STRINGS.filter((s) => s === i || strings.includes(s)),
    );
  }

  const allStrings = strings.length === ALL_STRINGS.length;

  return (
    <section className="trainer">
      <h2>Neck Note Trainer</h2>
      <SegmentedControl label="Mode" options={MODES} value={mode} onChange={changeMode} />
      <div className="field-label">Strings</div>
      <div className="chip-row string-row" role="group" aria-label="Strings to quiz">
        {ALL_STRINGS.map((i) => {
          const on = strings.includes(i);
          return (
            <button
              key={i}
              type="button"
              className={on ? 'note-btn string-btn selected' : 'note-btn string-btn'}
              aria-pressed={on}
              aria-label={`String ${STRINGS.length - i} (${STRING_NAMES[i]})`}
              onClick={() => toggleString(i)}
            >
              {STRING_NAMES[i]}
              <span className="string-num">{STRINGS.length - i}</span>
            </button>
          );
        })}
        <button
          type="button"
          className={allStrings ? 'note-btn string-btn selected' : 'note-btn string-btn'}
          aria-pressed={allStrings}
          onClick={() => changeStrings(ALL_STRINGS)}
        >
          All
        </button>
      </div>

      {mode === 'name' ? (
        <>
          <p className="instructions">
            A note is marked on the fretboard. Which note is it?
          </p>

          <Fretboard marker={round.marker} activeStrings={strings} />

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
              {correct ? (
                <>✓ Correct! That note is <strong>{displayNote(round.answer)}</strong>.</>
              ) : (
                <>✗ Not quite. The correct answer is <strong>{displayNote(round.answer)}</strong>.</>
              )}
            </ResultBanner>
          )}
        </>
      ) : (
        <>
          <p className="instructions">
            Tap every <strong>{displayNote(round.answer)}</strong>{' '}
            {allStrings
              ? 'on the neck'
              : `on the ${strings.length === 1 ? 'string' : 'strings'} in play`}
            , open strings included. Tap a dot again to remove it.
          </p>

          <Fretboard
            notes={findDots(taps, targets, graded)}
            activeStrings={strings}
            onSelect={graded ? undefined : toggleTap}
          />

          <QuizActions
            graded={graded}
            canSubmit={taps.length > 0}
            onSubmit={submitFind}
            onNext={() => next()}
          />

          {graded && (
            <ResultBanner correct={correct}>
              {correct ? (
                <>
                  ✓ Correct! You found all {targets.length} places to play{' '}
                  <strong>{displayNote(round.answer)}</strong>.
                </>
              ) : (
                <>
                  ✗ You found {found} of {targets.length} places to play{' '}
                  <strong>{displayNote(round.answer)}</strong>
                  {wrong > 0 && <>, with {wrong} wrong {wrong === 1 ? 'tap' : 'taps'}</>}.
                  {found < targets.length && ' The dashed dots are the ones you missed.'}
                </>
              )}
            </ResultBanner>
          )}
        </>
      )}
    </section>
  );
}
