import { useState } from 'react';
import { midiOf, playMidiPhrase } from '../audio';
import PlayButton from './ui/PlayButton';
import SegmentedControl from './ui/SegmentedControl';
import QuizActions from './ui/QuizActions';
import ResultBanner from './ui/ResultBanner';
import {
  EAR_CHORDS_EASY,
  EAR_CHORDS_HARD,
  formatNote,
  formatNotes,
  spellChord,
  type ChordType,
  type Note,
} from '../theory';
import { pick, randomNote } from '../random';
import { oneOf, usePersistentState } from '../hooks/usePersistentState';
import { usePlayback } from '../hooks/usePlayback';
import { useQuiz } from '../hooks/useQuiz';

type Mode = 'easy' | 'hard';

const MODES = [
  { value: 'easy', label: 'Easy' },
  { value: 'hard', label: 'Hard' },
] as const;

interface Round {
  root: Note;
  octave: number;
  chord: ChordType;
}

interface ChordEarTrainerProps {
  /** When set, every chord is built on this root; null = random root. */
  fixedKey: Note | null;
}

function chordsFor(mode: Mode): ChordType[] {
  return mode === 'easy' ? EAR_CHORDS_EASY : EAR_CHORDS_HARD;
}

function newRound(mode: Mode, fixedKey: Note | null): Round {
  return {
    root: fixedKey ?? randomNote(),
    octave: pick([3, 4]),
    chord: pick(chordsFor(mode)),
  };
}

export default function ChordEarTrainer({ fixedKey }: ChordEarTrainerProps) {
  const [mode, setMode] = usePersistentState<Mode>(
    'ear-chord-mode',
    'easy',
    oneOf(['easy', 'hard']),
  );
  const [selected, setSelected] = useState<ChordType | null>(null);
  const { round, graded, correct, grade, next } = useQuiz(
    () => newRound(mode, fixedKey),
    () => setSelected(null),
  );
  const playback = usePlayback();

  const choices = chordsFor(mode);

  function play(r: Round = round) {
    const rootMidi = midiOf(r.root, r.octave);
    const midis = r.chord.intervals.map((s) => rootMidi + s);
    // Arpeggiate low to high so each tone can be picked out, then the chord.
    const seconds = playMidiPhrase(
      [
        ...midis.map((midi) => ({ midis: [midi], duration: 0.7 })),
        { midis, duration: 2.5 },
      ],
      0.1,
    );
    playback.started(seconds);
  }

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    next(newRound(nextMode, fixedKey));
    playback.reset();
  }

  function submit() {
    grade(selected?.name === round.chord.name);
  }

  function nextRound() {
    play(next());
  }

  const spelled = spellChord(round.root, round.chord);
  const chordName = `${formatNote(spelled[0])} ${round.chord.name}`;
  const notesDisplay = formatNotes(spelled);

  return (
    <div className="ear-game">
      <SegmentedControl
        label="Difficulty"
        options={MODES}
        value={mode}
        onChange={changeMode}
      />

      <p className="instructions">
        {mode === 'easy'
          ? 'A chord plays note by note, then all together. Is it major or minor?'
          : 'A chord plays note by note, then all together. Which quality is it?'}
      </p>

      <PlayButton
        hasPlayed={playback.hasPlayed}
        isPlaying={playback.isPlaying}
        onPlay={() => play()}
      />

      <div className="chip-row" role="group" aria-label="Chord quality">
        {choices.map((c) => {
          const isSelected = selected?.name === c.name;
          const isCorrect = graded && c.name === round.chord.name;
          const isWrong = graded && isSelected && !isCorrect;
          let cls = 'note-btn chip-btn quality-chip';
          if (isSelected) cls += ' selected';
          if (isCorrect) cls += ' correct';
          if (isWrong) cls += ' wrong';
          return (
            <button
              key={c.name}
              type="button"
              className={cls}
              aria-pressed={isSelected}
              disabled={graded}
              onClick={() => setSelected(isSelected ? null : c)}
            >
              {c.name}
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
              ✓ Correct! That was <strong>{chordName}</strong> ({notesDisplay}).
            </>
          ) : (
            <>
              ✗ Not quite. That was <strong>{chordName}</strong> (
              {notesDisplay}).
            </>
          )}
        </ResultBanner>
      )}
    </div>
  );
}
