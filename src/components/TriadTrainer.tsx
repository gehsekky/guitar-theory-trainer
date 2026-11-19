import { useState } from 'react';
import Fretboard, { type FretboardNote } from './Fretboard';
import NotePicker from './NotePicker';
import QuizActions from './ui/QuizActions';
import ResultBanner from './ui/ResultBanner';
import SegmentedControl from './ui/SegmentedControl';
import {
  CHROMATIC,
  INVERSIONS,
  INVERSION_NAMES,
  STRING_SETS,
  TRIAD_TYPES,
  formatNote,
  shortDegree,
  spellChord,
  triadShapes,
  type Inversion,
  type Note,
  type StringSet,
  type TriadQuality,
  type TriadShape,
} from '../theory';
import { pick } from '../random';
import { jsonCodec, oneOf, usePersistentState } from '../hooks/usePersistentState';
import { useQuiz } from '../hooks/useQuiz';
import './TriadTrainer.css';

type QualitySet = 'major-minor' | 'all';

// Values are saved settings, so keep them stable.
const QUALITY_SETS = [
  { value: 'major-minor', label: 'Major + minor', qualities: ['major', 'minor'] },
  { value: 'all', label: '+ diminished', qualities: ['major', 'minor', 'diminished'] },
] as const satisfies readonly {
  value: QualitySet;
  label: string;
  qualities: readonly TriadQuality[];
}[];

const ALL_SETS = STRING_SETS.map((_s, i) => i);

const INVERSION_LABELS: Record<Inversion, string> = { 0: 'Root', 1: '1st', 2: '2nd' };

interface Round {
  root: Note;
  quality: TriadQuality;
  inversion: Inversion;
  set: StringSet;
  shape: TriadShape;
}

function newRound(sets: number[], qualitySet: QualitySet, prev?: Round): Round {
  const { qualities } = QUALITY_SETS.find((q) => q.value === qualitySet)!;
  for (;;) {
    const root = pick(CHROMATIC);
    const quality = pick(qualities);
    const inversion = pick(INVERSIONS);
    const set = STRING_SETS[pick(sets)];
    const repeat =
      prev &&
      prev.root === root &&
      prev.quality === quality &&
      prev.inversion === inversion &&
      prev.set === set;
    const shapes = triadShapes(root, quality, inversion, set);
    if (!repeat && shapes.length > 0) {
      return { root, quality, inversion, set, shape: pick(shapes) };
    }
  }
}

// Saved as a JSON list of string-set indices; keep only valid ones, and
// never end up with none.
const setsCodec = jsonCodec((stored) => {
  if (!Array.isArray(stored)) return undefined;
  const valid = ALL_SETS.filter((i) => stored.includes(i));
  return valid.length > 0 ? valid : undefined;
});

/** "root", "root and quality", "root, quality, and inversion". */
function listParts(parts: string[]): string {
  if (parts.length < 3) return parts.join(' and ');
  return `${parts.slice(0, -1).join(', ')}, and ${parts.at(-1)}`;
}

/** A row of single-choice answer chips, marked right and wrong once graded. */
function ChoiceChips<T extends string | number>({
  label,
  options,
  selected,
  answer,
  graded,
  onSelect,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  selected: T | null;
  answer: T;
  graded: boolean;
  onSelect: (value: T | null) => void;
}) {
  return (
    <div className="chip-row" role="group" aria-label={label}>
      {options.map((o) => {
        const isSelected = selected === o.value;
        let cls = 'note-btn chip-btn';
        if (isSelected) cls += ' selected';
        if (graded && o.value === answer) cls += ' correct';
        if (graded && isSelected && o.value !== answer) cls += ' wrong';
        return (
          <button
            key={o.value}
            type="button"
            className={cls}
            aria-pressed={isSelected}
            disabled={graded}
            onClick={() => onSelect(isSelected ? null : o.value)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default function TriadTrainer() {
  const [sets, setSets] = usePersistentState('triad-sets', ALL_SETS, setsCodec);
  const [qualitySet, setQualitySet] = usePersistentState<QualitySet>(
    'triad-qualities',
    'major-minor',
    oneOf(QUALITY_SETS.map((q) => q.value)),
  );
  const [root, setRoot] = useState<Note[]>([]);
  const [quality, setQuality] = useState<TriadQuality | null>(null);
  const [inversion, setInversion] = useState<Inversion | null>(null);
  const { round, graded, correct, grade, next } = useQuiz(
    (prev?: Round) => newRound(sets, qualitySet, prev),
    () => {
      setRoot([]);
      setQuality(null);
      setInversion(null);
    },
  );

  function changeSets(nextSets: number[]) {
    if (nextSets.length === 0) return; // keep at least one
    setSets(nextSets);
    next(newRound(nextSets, qualitySet));
  }

  function toggleSet(i: number) {
    changeSets(
      sets.includes(i) ? sets.filter((s) => s !== i) : ALL_SETS.filter((s) => s === i || sets.includes(s)),
    );
  }

  function changeQualitySet(nextQualitySet: QualitySet) {
    setQualitySet(nextQualitySet);
    next(newRound(sets, nextQualitySet));
  }

  const rootRight = root[0] === round.root;
  const qualityRight = quality === round.quality;
  const inversionRight = inversion === round.inversion;

  const type = TRIAD_TYPES[round.quality];
  const spelled = spellChord(round.root, type);
  const { positions, tones } = round.shape;

  // Unlabeled dots to read; once graded, each labeled with its chord tone.
  const dots: FretboardNote[] = positions.map((p, i) => ({
    ...p,
    label: graded ? shortDegree(type.degrees[tones[i]]) : '',
    root: graded && tones[i] === 0,
  }));

  const qualities = QUALITY_SETS.find((q) => q.value === qualitySet)!.qualities;
  const allSets = sets.length === ALL_SETS.length;
  const chordName = `${formatNote(spelled[0])} ${type.name}`;
  const lowToHigh = tones.map((t) => formatNote(spelled[t])).join(' ');
  const wrongParts = [
    !rootRight && 'root',
    !qualityRight && 'quality',
    !inversionRight && 'inversion',
  ].filter((part): part is string => Boolean(part));

  return (
    <section className="trainer">
      <h2>Triad Trainer</h2>

      <div className="field-label">Strings</div>
      <div className="chip-row triad-set-row" role="group" aria-label="String sets to quiz">
        {STRING_SETS.map((set, i) => {
          const on = sets.includes(i);
          return (
            <button
              key={set.name}
              type="button"
              className={on ? 'note-btn triad-set-btn selected' : 'note-btn triad-set-btn'}
              aria-pressed={on}
              onClick={() => toggleSet(i)}
            >
              {set.name}
            </button>
          );
        })}
        <button
          type="button"
          className={allSets ? 'note-btn triad-set-btn selected' : 'note-btn triad-set-btn'}
          aria-pressed={allSets}
          onClick={() => changeSets(ALL_SETS)}
        >
          All
        </button>
      </div>

      <SegmentedControl
        label="Chord qualities"
        options={QUALITY_SETS}
        value={qualitySet}
        onChange={changeQualitySet}
      />

      <p className="instructions">
        A triad is marked on three strings. Name its root, quality, and
        inversion (which chord tone is lowest).
      </p>

      <Fretboard notes={dots} focus={positions[0]} activeStrings={[...round.set.strings]} />

      <div className="field-label">Root</div>
      <NotePicker
        selected={root}
        max={1}
        onChange={setRoot}
        disabled={graded}
        correctNotes={[round.root]}
        graded={graded}
      />

      <div className="field-label">Quality</div>
      <ChoiceChips
        label="Quality"
        options={qualities.map((q) => ({ value: q, label: TRIAD_TYPES[q].name }))}
        selected={quality}
        answer={round.quality}
        graded={graded}
        onSelect={setQuality}
      />

      <div className="field-label">Inversion</div>
      <ChoiceChips
        label="Inversion"
        options={INVERSIONS.map((i) => ({ value: i, label: INVERSION_LABELS[i] }))}
        selected={inversion}
        answer={round.inversion}
        graded={graded}
        onSelect={setInversion}
      />

      <QuizActions
        graded={graded}
        canSubmit={root.length === 1 && quality !== null && inversion !== null}
        onSubmit={() => grade(rootRight && qualityRight && inversionRight)}
        onNext={() => next()}
      />

      {graded && (
        <ResultBanner correct={correct}>
          {correct ? '✓ Correct! ' : '✗ Not quite. '}
          That's <strong>{chordName}</strong> in{' '}
          <strong>{INVERSION_NAMES[round.inversion]}</strong> on the{' '}
          {round.set.name} strings: {lowToHigh}, low to high.
          {!correct && <> Check the {listParts(wrongParts)}.</>}
        </ResultBanner>
      )}
    </section>
  );
}
