import { useEffect, useRef, useState } from 'react';
import { midiOf, playMidiPhrase } from '../audio';
import {
  EAR_CHORDS_EASY,
  EAR_CHORDS_HARD,
  chordNotes,
  displayNote,
  type ChordType,
  type Note,
} from '../theory';
import { pick, randomNote } from '../random';

type Mode = 'easy' | 'hard';

interface Round {
  root: Note;
  octave: number;
  chord: ChordType;
}

interface ChordEarTrainerProps {
  /** When set, every chord is built on this root; null = random root. */
  fixedKey: Note | null;
}

const MODE_STORAGE_KEY = 'guitar-theory-trainer.ear-chord-mode';

function loadMode(): Mode {
  return localStorage.getItem(MODE_STORAGE_KEY) === 'hard' ? 'hard' : 'easy';
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

type Phase = 'guessing' | 'graded';

export default function ChordEarTrainer({ fixedKey }: ChordEarTrainerProps) {
  const [mode, setMode] = useState<Mode>(loadMode);
  const [round, setRound] = useState<Round>(() =>
    newRound(loadMode(), fixedKey),
  );
  const [selected, setSelected] = useState<ChordType | null>(null);
  const [phase, setPhase] = useState<Phase>('guessing');
  const [correct, setCorrect] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const playTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(playTimer.current), []);

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
    setHasPlayed(true);
    setIsPlaying(true);
    window.clearTimeout(playTimer.current);
    playTimer.current = window.setTimeout(
      () => setIsPlaying(false),
      seconds * 1000,
    );
  }

  function changeMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    localStorage.setItem(MODE_STORAGE_KEY, next);
    setRound(newRound(next, fixedKey));
    setSelected(null);
    setPhase('guessing');
    setHasPlayed(false);
    setIsPlaying(false);
  }

  function submit() {
    if (!selected) return;
    setCorrect(selected.name === round.chord.name);
    setPhase('graded');
  }

  function next() {
    const r = newRound(mode, fixedKey);
    setRound(r);
    setSelected(null);
    setPhase('guessing');
    play(r);
  }

  const chordName = `${displayNote(round.root)} ${round.chord.name}`;
  const notesDisplay = chordNotes(round.root, round.chord.intervals)
    .map(displayNote)
    .join(' – ');

  return (
    <div className="ear-game">
      <div className="mode-toggle" role="radiogroup" aria-label="Difficulty">
        {(['easy', 'hard'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            className={mode === m ? 'mode-btn active' : 'mode-btn'}
            onClick={() => changeMode(m)}
          >
            {m === 'easy' ? 'Easy' : 'Hard'}
          </button>
        ))}
      </div>

      <p className="instructions">
        {mode === 'easy'
          ? 'A chord plays note by note, then all together. Is it major or minor?'
          : 'A chord plays note by note, then all together. Which quality is it?'}
      </p>

      <button
        type="button"
        className="secondary-btn"
        onClick={() => play()}
        disabled={isPlaying}
      >
        {isPlaying ? '♪ Playing…' : hasPlayed ? '▶ Play Again' : '▶ Play'}
      </button>

      <div className="chip-row" role="group" aria-label="Chord quality">
        {choices.map((c) => {
          const isSelected = selected?.name === c.name;
          const isCorrect = phase === 'graded' && c.name === round.chord.name;
          const isWrong = phase === 'graded' && isSelected && !isCorrect;
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
              disabled={phase === 'graded'}
              onClick={() => setSelected(isSelected ? null : c)}
            >
              {c.name}
            </button>
          );
        })}
      </div>

      {phase === 'guessing' ? (
        <button
          type="button"
          className="primary-btn"
          onClick={submit}
          disabled={!selected || !hasPlayed}
        >
          Submit
        </button>
      ) : (
        <button type="button" className="primary-btn" onClick={next}>
          Next
        </button>
      )}

      {phase === 'graded' && (
        <div
          className={correct ? 'result success' : 'result failure'}
          role="status"
        >
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
        </div>
      )}
    </div>
  );
}
