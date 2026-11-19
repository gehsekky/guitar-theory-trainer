import { useState } from 'react';
import { midiOf, playMidiPhrase } from '../audio';
import { majorChordSteps } from './chordPhrase';
import PlayButton from './ui/PlayButton';
import QuizActions from './ui/QuizActions';
import ResultBanner from './ui/ResultBanner';
import SegmentedControl from './ui/SegmentedControl';
import { DEGREE_NAMES, formatNote, keyTonic, resolution, spellAbove, type Note } from '../theory';
import { pick, randomNote } from '../random';
import { oneOf, usePersistentState } from '../hooks/usePersistentState';
import { usePlayback } from '../hooks/usePlayback';
import { useQuiz } from '../hooks/useQuiz';

/** A scale degree by its distance in semitones above the tonic. */
interface Degree {
  semitones: number;
  /** How it's written: "♭3". */
  label: string;
  /** Interval name in Tonal, for spelling the note in the key. */
  tonal: string;
  /** Functional name, for the seven degrees of the major scale. */
  name?: string;
}

const MAJOR_NAMES = DEGREE_NAMES.major;

const DEGREES: Degree[] = [
  { semitones: 0, label: '1', tonal: '1P', name: MAJOR_NAMES[0] },
  { semitones: 1, label: '♭2', tonal: '2m' },
  { semitones: 2, label: '2', tonal: '2M', name: MAJOR_NAMES[1] },
  { semitones: 3, label: '♭3', tonal: '3m' },
  { semitones: 4, label: '3', tonal: '3M', name: MAJOR_NAMES[2] },
  { semitones: 5, label: '4', tonal: '4P', name: MAJOR_NAMES[3] },
  { semitones: 6, label: '♯4', tonal: '4A' },
  { semitones: 7, label: '5', tonal: '5P', name: MAJOR_NAMES[4] },
  { semitones: 8, label: '♭6', tonal: '6m' },
  { semitones: 9, label: '6', tonal: '6M', name: MAJOR_NAMES[5] },
  { semitones: 10, label: '♭7', tonal: '7m' },
  { semitones: 11, label: '7', tonal: '7M', name: MAJOR_NAMES[6] },
];

type Pool = 'triad' | 'major' | 'chromatic';

// Which degrees a note may be, by semitones above the tonic. Values are
// saved settings, so keep them stable.
const POOLS = [
  { value: 'triad', label: '1 3 5', semitones: [0, 4, 7] },
  { value: 'major', label: 'Major scale', semitones: [0, 2, 4, 5, 7, 9, 11] },
  { value: 'chromatic', label: 'All 12', semitones: DEGREES.map((d) => d.semitones) },
] as const satisfies readonly { value: Pool; label: string; semitones: readonly number[] }[];

// I–IV–V–I: every note of the major scale sounds, and the V–I pull lands
// firmly on the tonic, so the key is set before the note plays.
const CADENCE = [0, 3, 4, 0];
const CHORD_SECONDS = 0.7;
const PAUSE_SECONDS = 0.6;
const NOTE_SECONDS = 1.6;
// The resolution after an answer: steps, then a longer landing on the tonic.
const STEP_SECONDS = 0.45;
const LANDING_SECONDS = 1.2;

interface Round {
  tonic: Note;
  degree: Degree;
}

function newRound(pool: Pool, fixedKey: Note | null, prev?: Round): Round {
  const { semitones } = POOLS.find((p) => p.value === pool)!;
  // A new degree each round, so a repeat can't be answered from memory.
  const choices = semitones.filter((s) => s !== prev?.degree.semitones);
  const degree = DEGREES[pick(choices)];
  return { tonic: fixedKey ?? randomNote(), degree };
}

/** The tonic's MIDI number, kept between F♯3 and F4 so every degree above
 * it sits in the same comfortable register as the chords. */
function tonicMidi(tonic: Note): number {
  const midi = midiOf(tonic, 4);
  return midi > 65 ? midi - 12 : midi;
}

interface DegreeEarTrainerProps {
  /** When set, every round is in this major key; null = random key. */
  fixedKey: Note | null;
}

/** Ear Training's scale-degree game: a cadence sets the key, then one note
 * plays; name its degree. (Functional ear training.) */
export default function DegreeEarTrainer({ fixedKey }: DegreeEarTrainerProps) {
  const [pool, setPool] = usePersistentState<Pool>(
    'ear-degree-pool',
    'triad',
    oneOf(POOLS.map((p) => p.value)),
  );
  const [selected, setSelected] = useState<Degree | null>(null);
  const playback = usePlayback();
  const { round, graded, correct, grade, next } = useQuiz(
    (prev?: Round) => newRound(pool, fixedKey, prev),
    () => setSelected(null),
  );

  const targetMidi = (r: Round) => tonicMidi(r.tonic) + r.degree.semitones;

  /** The cadence, a pause, then the note. */
  function play(r: Round = round) {
    const seconds = playMidiPhrase(
      [
        ...majorChordSteps(r.tonic, CADENCE, CHORD_SECONDS),
        { midis: [], duration: PAUSE_SECONDS },
        { midis: [targetMidi(r)], duration: NOTE_SECONDS },
      ],
      0.08,
    );
    playback.started(seconds);
  }

  /** Just the note again, once the key is in the ear. */
  function playNote() {
    playback.started(playMidiPhrase([{ midis: [targetMidi(round)], duration: NOTE_SECONDS }]));
  }

  /** The note walking home to the tonic (6 → 7 → 1), so its pull is heard. */
  function playResolution() {
    const base = tonicMidi(round.tonic);
    const path = resolution(round.degree.semitones);
    const seconds = playMidiPhrase(
      path.map((s, i) => ({
        midis: [base + s],
        duration: i === path.length - 1 ? LANDING_SECONDS : STEP_SECONDS,
      })),
      0.05,
    );
    playback.started(seconds);
  }

  function submit() {
    grade(selected?.semitones === round.degree.semitones);
    // The Submit tap is a user gesture, so the resolution can play now.
    playResolution();
  }

  function changePool(nextPool: Pool) {
    setPool(nextPool);
    next(newRound(nextPool, fixedKey));
    playback.reset();
  }

  function nextRound() {
    // The Next click is a user gesture, so audio can start right away.
    play(next());
  }

  const choices = POOLS.find((p) => p.value === pool)!.semitones.map((s) => DEGREES[s]);
  const tonic = keyTonic(round.tonic, 'major');
  const keyName = `${formatNote(tonic)} major`;
  const { degree } = round;
  const noteName = formatNote(spellAbove(tonic, degree.tonal));
  const path = resolution(degree.semitones).map((s) => DEGREES[s % 12].label).join(' → ');

  return (
    <div className="ear-game">
      <SegmentedControl label="Notes" options={POOLS} value={pool} onChange={changePool} />

      <p className="instructions">
        Chords set the key (I–IV–V–I), then one note plays. Which scale degree
        is it?
      </p>

      <div className="key-label">Key: {keyName}</div>

      <div className="chip-row">
        <PlayButton
          hasPlayed={playback.hasPlayed}
          isPlaying={playback.isPlaying}
          onPlay={() => play()}
        />
        {playback.hasPlayed && !graded && (
          <button
            type="button"
            className="secondary-btn"
            onClick={playNote}
            disabled={playback.isPlaying}
          >
            ♪ Note again
          </button>
        )}
        {graded && degree.semitones !== 0 && (
          <button
            type="button"
            className="secondary-btn"
            onClick={playResolution}
            disabled={playback.isPlaying}
          >
            ♪ Resolve again
          </button>
        )}
      </div>

      <div className="chip-row" role="group" aria-label="Scale degrees">
        {choices.map((d) => {
          const isSelected = selected?.semitones === d.semitones;
          const isCorrect = graded && d.semitones === degree.semitones;
          const isWrong = graded && isSelected && !isCorrect;
          let cls = 'note-btn chip-btn';
          if (isSelected) cls += ' selected';
          if (isCorrect) cls += ' correct';
          if (isWrong) cls += ' wrong';
          return (
            <button
              key={d.semitones}
              type="button"
              className={cls}
              aria-pressed={isSelected}
              aria-label={d.name ? `${d.label} (${d.name})` : d.label}
              disabled={graded}
              onClick={() => setSelected(isSelected ? null : d)}
            >
              {d.label}
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
          {correct ? '✓ Correct! ' : '✗ Not quite. '}
          That was <strong>{degree.label}</strong>
          {degree.name && <>, the {degree.name}</>}: {noteName} in {keyName}.
          {degree.semitones !== 0 && <> It resolves {path}.</>}
        </ResultBanner>
      )}
    </div>
  );
}
