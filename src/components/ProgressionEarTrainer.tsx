import { useState } from 'react';
import { playMidiPhrase } from '../audio';
import PlayButton from './ui/PlayButton';
import QuizActions from './ui/QuizActions';
import ResultBanner from './ui/ResultBanner';
import SegmentedControl from './ui/SegmentedControl';
import { majorChordSteps } from './chordPhrase';
import { DIATONIC, diatonicChordName, formatNote, keyTonic, type Note } from '../theory';
import { pick, randomNote } from '../random';
import { oneOf, usePersistentState } from '../hooks/usePersistentState';
import { usePlayback } from '../hooks/usePlayback';
import { useQuiz } from '../hooks/useQuiz';
import './ProgressionEarTrainer.css';

type Pool = 'primary' | 'common' | 'all';

// Which chords (scale degrees, 0 = I) a progression may use. Values are
// saved settings, so keep them stable. vii° is left out: it's rare in the
// progressions this drills and easily heard as V.
const POOLS = [
  { value: 'primary', label: 'I IV V', degrees: [0, 3, 4] },
  { value: 'common', label: '+ ii vi', degrees: [0, 1, 3, 4, 5] },
  { value: 'all', label: '+ iii', degrees: [0, 1, 2, 3, 4, 5] },
] as const satisfies readonly { value: Pool; label: string; degrees: readonly number[] }[];

const LENGTH = 4;
const NUMERALS = DIATONIC.major.map((c) => c.numeral);

interface Round {
  tonic: Note;
  /** Scale degrees, one per chord; the first is always I to set the key. */
  degrees: number[];
}

function newRound(pool: Pool, fixedKey: Note | null, prev?: Round): Round {
  const { degrees: choices } = POOLS.find((p) => p.value === pool)!;
  for (;;) {
    const degrees = [0];
    while (degrees.length < LENGTH) {
      // No chord twice in a row: a repeat sounds like one long chord.
      degrees.push(pick(choices.filter((d) => d !== degrees.at(-1))));
    }
    const repeat = prev && prev.degrees.join() === degrees.join();
    if (!repeat) return { tonic: fixedKey ?? randomNote(), degrees };
  }
}

interface ProgressionEarTrainerProps {
  /** When set, every progression is in this major key; null = random key. */
  fixedKey: Note | null;
}

/** Ear Training's progressions game: hear four chords in a major key and
 * name chords 2–4 by Roman numeral. */
export default function ProgressionEarTrainer({ fixedKey }: ProgressionEarTrainerProps) {
  const [pool, setPool] = usePersistentState<Pool>(
    'ear-progression-pool',
    'primary',
    oneOf(POOLS.map((p) => p.value)),
  );
  // The listener's numerals for chords 2–4, in order.
  const [answers, setAnswers] = useState<number[]>([]);
  const playback = usePlayback();
  const { round, graded, correct, grade, next } = useQuiz(
    (prev?: Round) => newRound(pool, fixedKey, prev),
    () => setAnswers([]),
  );

  function play(r: Round = round) {
    const seconds = playMidiPhrase(
      majorChordSteps(r.tonic, r.degrees, 1.1),
      0.12,
    );
    playback.started(seconds);
  }

  function changePool(nextPool: Pool) {
    setPool(nextPool);
    next(newRound(nextPool, fixedKey));
    playback.reset();
  }

  function choose(degree: number) {
    if (answers.length < LENGTH - 1) setAnswers([...answers, degree]);
  }

  /** Tapping a filled slot takes it and everything after it back. */
  function redoFrom(slot: number) {
    setAnswers(answers.slice(0, slot));
  }

  function submit() {
    grade(answers.every((d, i) => d === round.degrees[i + 1]));
  }

  function nextRound() {
    // The Next click is a user gesture, so audio can start right away.
    play(next());
  }

  const choices = POOLS.find((p) => p.value === pool)!.degrees;
  const keyName = `${formatNote(keyTonic(round.tonic, 'major'))} major`;
  const numerals = round.degrees.map((d) => NUMERALS[d]).join(' – ');
  const chordNames = round.degrees
    .map((d) => diatonicChordName(round.tonic, 'major', d))
    .join(' – ');

  return (
    <div className="ear-game">
      <SegmentedControl label="Chords" options={POOLS} value={pool} onChange={changePool} />

      <p className="instructions">
        Four chords play. The first is always I. Name the other three in
        order.
      </p>

      <div className="key-label">Key: {keyName}</div>

      <PlayButton
        hasPlayed={playback.hasPlayed}
        isPlaying={playback.isPlaying}
        onPlay={() => play()}
      />

      <div className="tone-slots progression-slots" aria-label="Your answer">
        <div className="tone-slot progression-given" aria-label="Chord 1: I">
          I
        </div>
        {Array.from({ length: LENGTH - 1 }, (_, slot) => {
          const answer = answers[slot];
          const filled = answer !== undefined;
          let cls = 'tone-slot progression-slot';
          if (!filled) cls += ' hidden-tone';
          if (graded) cls += answer === round.degrees[slot + 1] ? ' correct' : ' wrong';
          return (
            <button
              key={slot}
              type="button"
              className={cls}
              disabled={graded || !filled}
              aria-label={`Chord ${slot + 2}: ${filled ? NUMERALS[answer] : 'not chosen'}`}
              onClick={() => redoFrom(slot)}
            >
              {filled ? NUMERALS[answer] : '?'}
            </button>
          );
        })}
      </div>

      <div className="chip-row" role="group" aria-label="Chord numerals">
        {choices.map((degree) => (
          <button
            key={degree}
            type="button"
            className="note-btn chip-btn numeral-chip"
            disabled={graded || answers.length === LENGTH - 1}
            onClick={() => choose(degree)}
          >
            {NUMERALS[degree]}
          </button>
        ))}
      </div>

      <QuizActions
        graded={graded}
        canSubmit={answers.length === LENGTH - 1 && playback.hasPlayed}
        onSubmit={submit}
        onNext={nextRound}
      />

      {graded && (
        <ResultBanner correct={correct}>
          {correct ? '✓ Correct! ' : '✗ Not quite. It was '}
          <strong>{numerals}</strong> in {keyName}: {chordNames}.
        </ResultBanner>
      )}
    </div>
  );
}
