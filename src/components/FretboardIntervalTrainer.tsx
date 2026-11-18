import { useState } from 'react';
import { playMidiPhrase } from '../audio';
import Fretboard, { type FretboardNote } from './Fretboard';
import Dropdown from './ui/Dropdown';
import PlayButton from './ui/PlayButton';
import QuizActions from './ui/QuizActions';
import ResultBanner from './ui/ResultBanner';
import SegmentedControl from './ui/SegmentedControl';
import {
  FRET_COUNT,
  INTERVALS,
  STRINGS,
  formatNote,
  keyTonic,
  midiAt,
  noteAt,
  positionsOfMidi,
  spellInterval,
  type FretPosition,
  type Interval,
} from '../theory';
import { pick, randomInt } from '../random';
import { oneOf, usePersistentState } from '../hooks/usePersistentState';
import { usePlayback } from '../hooks/usePlayback';
import { useQuiz } from '../hooks/useQuiz';

type Mode = 'name' | 'find';

const MODES = [
  { value: 'name', label: 'Name it' },
  { value: 'find', label: 'Find it' },
] as const satisfies readonly { value: Mode; label: string }[];

// Interval families to drill one at a time. Values are saved settings, so
// keep them stable.
const INTERVAL_SETS = [
  { value: 'all', label: 'All intervals', shorts: INTERVALS.map((iv) => iv.short) },
  { value: 'seconds-thirds', label: '2nds and 3rds', shorts: ['m2', 'M2', 'm3', 'M3'] },
  { value: 'fourths-fifths', label: '4ths, 5ths, and octave', shorts: ['P4', 'TT', 'P5', 'P8'] },
  { value: 'sixths-sevenths', label: '6ths and 7ths', shorts: ['m6', 'M6', 'm7', 'M7'] },
] as const;

type IntervalSet = (typeof INTERVAL_SETS)[number]['value'];

const SET_GROUPS = [{ label: 'Intervals', options: INTERVAL_SETS }];

function intervalsIn(set: IntervalSet): Interval[] {
  const { shorts } = INTERVAL_SETS.find((s) => s.value === set)!;
  return INTERVALS.filter((iv) => (shorts as readonly string[]).includes(iv.short));
}

// In Name mode the second note sits within a hand's reach of the root, the
// way the shape is actually played.
const REACH = 4;

interface Round {
  root: FretPosition;
  interval: Interval;
  /** Every place that plays the interval's upper note, same octave. */
  targets: FretPosition[];
  /** Name mode: the one target that is marked. */
  shown: FretPosition;
}

function newRound(mode: Mode, set: IntervalSet, prev?: Round): Round {
  const intervals = intervalsIn(set);
  for (;;) {
    const root = { stringIndex: randomInt(STRINGS.length), fret: randomInt(FRET_COUNT + 1) };
    const interval = pick(intervals);
    const targets = positionsOfMidi(midiAt(root.stringIndex, root.fret) + interval.semitones);
    const reachable = targets.filter((t) => Math.abs(t.fret - root.fret) <= REACH);
    const choices = mode === 'name' ? reachable : targets;
    const repeat =
      prev &&
      prev.interval === interval &&
      samePosition(prev.root, root);
    if (choices.length > 0 && !repeat) {
      return { root, interval, targets, shown: pick(choices) };
    }
  }
}

function samePosition(a: FretPosition, b: FretPosition): boolean {
  return a.stringIndex === b.stringIndex && a.fret === b.fret;
}

/** What a wrong tap actually was, relative to the root. */
function describeTap(rootMidi: number, tap: FretPosition): string {
  const distance = midiAt(tap.stringIndex, tap.fret) - rootMidi;
  if (distance === 0) return 'the root itself';
  if (distance < 0) return 'below the root';
  if (distance > 12) return 'more than an octave above the root';
  const interval = INTERVALS.find((iv) => iv.semitones === distance)!;
  return `a ${interval.name.toLowerCase()} above the root`;
}

export default function FretboardIntervalTrainer() {
  const [mode, setMode] = usePersistentState<Mode>(
    'fretboard-intervals-mode',
    'name',
    oneOf(MODES.map((m) => m.value)),
  );
  const [set, setSet] = usePersistentState<IntervalSet>(
    'fretboard-intervals-set',
    'all',
    oneOf(INTERVAL_SETS.map((s) => s.value)),
  );
  const [named, setNamed] = useState<Interval | null>(null);
  const [tapped, setTapped] = useState<FretPosition | null>(null);
  const playback = usePlayback();
  const { round, graded, correct, grade, next } = useQuiz(
    (prev?: Round) => newRound(mode, set, prev),
    () => {
      setNamed(null);
      setTapped(null);
      playback.reset();
    },
  );

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    next(newRound(nextMode, set));
  }

  function changeSet(nextSet: IntervalSet) {
    setSet(nextSet);
    next(newRound(mode, nextSet));
  }

  const rootMidi = midiAt(round.root.stringIndex, round.root.fret);
  const upperMidi = rootMidi + round.interval.semitones;
  // Spell as IntervalTrainer does: the root as a key would (B♭, not A♯),
  // the upper note by letter distance (C → F♯ for an augmented 4th).
  const rootName = keyTonic(noteAt(round.root.stringIndex, round.root.fret), 'major');
  const upperName = spellInterval(rootName, round.interval);

  function submit() {
    if (mode === 'name') {
      grade(named?.semitones === round.interval.semitones);
    } else if (tapped) {
      grade(midiAt(tapped.stringIndex, tapped.fret) === upperMidi);
    }
  }

  function hear() {
    const seconds = playMidiPhrase([
      { midis: [rootMidi], duration: 0.9 },
      { midis: [upperMidi], duration: 0.9 },
      { midis: [rootMidi, upperMidi], duration: 1.4 },
    ]);
    playback.started(seconds);
  }

  // The dots to draw: the root always; in Find mode after grading, every
  // right place and the wrong tap; in Name mode after grading, the label.
  const rootDot: FretboardNote = { ...round.root, label: formatNote(rootName), root: true };
  const dots: FretboardNote[] = [rootDot];
  let marker: FretPosition | undefined;
  if (mode === 'name') {
    if (graded) {
      dots.push({ ...round.shown, label: round.interval.short, root: false, status: 'correct' });
    } else {
      marker = round.shown;
    }
  } else if (graded) {
    for (const target of round.targets) {
      dots.push({ ...target, label: round.interval.short, root: false, status: 'correct' });
    }
    if (tapped && !correct) {
      const tapName = formatNote(noteAt(tapped.stringIndex, tapped.fret));
      // A tap on the root keeps the root dot; mark it wrong in place.
      const i = dots.findIndex((d) => samePosition(d, tapped));
      if (i >= 0) dots[i] = { ...dots[i], status: 'wrong' };
      else dots.push({ ...tapped, label: tapName, root: false, status: 'wrong' });
    }
  } else if (tapped) {
    marker = tapped;
  }

  const intervals = intervalsIn(set);
  const where = round.targets.length === 1 ? 'one place' : `${round.targets.length} places`;

  return (
    <section className="trainer">
      <h2>Fretboard Intervals</h2>

      <div className="toggle-row">
        <SegmentedControl label="Mode" options={MODES} value={mode} onChange={changeMode} />
        <Dropdown label="Drill" groups={SET_GROUPS} value={set} onChange={changeSet} />
      </div>

      {mode === 'name' ? (
        <p className="instructions">
          The root is labeled and a second note is marked. What interval is
          the marked note above the root?
        </p>
      ) : (
        <p className="instructions">
          Tap the fretboard where the <strong>{round.interval.name}</strong>{' '}
          above <strong>{formatNote(rootName)}</strong> is. Any string works,
          as long as it's the same octave.
        </p>
      )}

      <Fretboard
        notes={dots}
        marker={marker}
        focus={round.root}
        onSelect={mode === 'find' && !graded ? setTapped : undefined}
      />

      {mode === 'name' && (
        <div className="interval-picker" role="group" aria-label="Interval choices">
          {intervals.map((iv) => {
            const isSelected = named?.semitones === iv.semitones;
            const isCorrect = graded && iv.semitones === round.interval.semitones;
            const isWrongPick = graded && isSelected && !isCorrect;
            let cls = 'note-btn interval-btn';
            if (isSelected) cls += ' selected';
            if (isCorrect) cls += ' correct';
            if (isWrongPick) cls += ' wrong';
            return (
              <button
                key={iv.semitones}
                type="button"
                className={cls}
                aria-pressed={isSelected}
                disabled={graded}
                onClick={() => setNamed(isSelected ? null : iv)}
              >
                <span className="interval-name">{iv.name}</span>
                <span className="interval-short">{iv.short}</span>
              </button>
            );
          })}
        </div>
      )}

      <QuizActions
        graded={graded}
        canSubmit={mode === 'name' ? named !== null : tapped !== null}
        onSubmit={submit}
        onNext={() => next()}
      />

      {graded && (
        <>
          <ResultBanner correct={correct}>
            {correct ? '✓ Correct! ' : '✗ Not quite. '}
            {mode === 'name' ? (
              <>
                That's a <strong>{round.interval.name}</strong>:{' '}
                {formatNote(rootName)} → {formatNote(upperName)}.
              </>
            ) : (
              <>
                {!correct && tapped && (
                  <>That's {describeTap(rootMidi, tapped)}. </>
                )}
                The <strong>{round.interval.name}</strong> above{' '}
                {formatNote(rootName)} is {formatNote(upperName)}, in {where} on
                the neck.
              </>
            )}
          </ResultBanner>
          <PlayButton
            hasPlayed={playback.hasPlayed}
            isPlaying={playback.isPlaying}
            onPlay={hear}
          />
        </>
      )}
    </section>
  );
}
