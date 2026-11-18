import { useState } from 'react';
import { midiOf, playMidiPhrase } from '../audio';
import PlayButton from './ui/PlayButton';
import QuizActions from './ui/QuizActions';
import ResultBanner from './ui/ResultBanner';
import {
  INTERVALS,
  formatNote,
  keyTonic,
  spellInterval,
  type Interval,
  type Note,
} from '../theory';
import { pick, randomNote } from '../random';
import { usePlayback } from '../hooks/usePlayback';
import { useQuiz } from '../hooks/useQuiz';

interface Round {
  tonic: Note;
  octave: number;
  interval: Interval;
}

function newRound(fixedKey: Note | null): Round {
  return {
    tonic: fixedKey ?? randomNote(),
    octave: pick([3, 4]),
    interval: pick(INTERVALS),
  };
}

interface IntervalTrainerProps {
  /** When set, every round uses this tonic; null = random key per round. */
  fixedKey: Note | null;
}

export default function IntervalTrainer({ fixedKey }: IntervalTrainerProps) {
  const [selected, setSelected] = useState<Interval | null>(null);
  const { round, graded, correct, grade, next } = useQuiz(
    () => newRound(fixedKey),
    () => setSelected(null),
  );
  const playback = usePlayback();

  function play(r: Round = round) {
    const root = midiOf(r.tonic, r.octave);
    const upper = root + r.interval.semitones;
    // Melodic (one after the other), then harmonic (together) to hear the
    // interval's combined color.
    const seconds = playMidiPhrase([
      { midis: [root], duration: 1.2 },
      { midis: [upper], duration: 1.2 },
      { midis: [root, upper], duration: 1.8 },
    ]);
    playback.started(seconds);
  }

  function submit() {
    grade(selected?.semitones === round.interval.semitones);
  }

  function nextRound() {
    // The Next click is a user gesture, so we can start audio right away.
    play(next());
  }

  // Spell the tonic as a key would (B♭, not A♯) and the upper note by the
  // interval's letter distance (C → F♯ for a tritone written as an aug 4th).
  const tonic = keyTonic(round.tonic, 'major');
  const upper = spellInterval(tonic, round.interval);

  return (
    <div className="ear-game">
      <p className="instructions">
        The tonic plays, then a second note, then both together. Which
        interval do you hear?
      </p>

      <div className="key-label">Key: {formatNote(tonic)}</div>

      <PlayButton
        hasPlayed={playback.hasPlayed}
        isPlaying={playback.isPlaying}
        onPlay={() => play()}
      />

      <div className="interval-picker" role="group" aria-label="Interval choices">
        {INTERVALS.map((iv) => {
          const isSelected = selected?.semitones === iv.semitones;
          const isCorrect =
            graded && iv.semitones === round.interval.semitones;
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
              onClick={() => setSelected(isSelected ? null : iv)}
            >
              <span className="interval-name">{iv.name}</span>
              <span className="interval-short">{iv.short}</span>
            </button>
          );
        })}
      </div>

      <QuizActions
        graded={graded}
        canSubmit={selected !== null && playback.hasPlayed}
        onSubmit={submit}
        onNext={nextRound}
      />

      {graded && (
        <ResultBanner correct={correct}>
          {correct ? (
            <>
              ✓ Correct! That was a{' '}
              <strong>{round.interval.name}</strong> (
              {formatNote(tonic)} → {formatNote(upper)}).
            </>
          ) : (
            <>
              ✗ Not quite. That was a{' '}
              <strong>{round.interval.name}</strong> (
              {formatNote(tonic)} → {formatNote(upper)}).
            </>
          )}
        </ResultBanner>
      )}
    </div>
  );
}
