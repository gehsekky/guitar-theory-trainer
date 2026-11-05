import Fretboard from './Fretboard';
import NotePicker from './NotePicker';
import Dropdown from './ui/Dropdown';
import SegmentedControl from './ui/SegmentedControl';
import {
  CHORD_TYPES,
  CHROMATIC,
  SCALE_DEGREES,
  formatNote,
  notePositions,
  pitchClass,
  shortDegree,
  spellChord,
  spellScale,
  type ChordType,
  type Note,
  type ScaleType,
  type SpelledNote,
} from '../theory';
import { oneOf, usePersistentState } from '../hooks/usePersistentState';
import './FretboardExplorer.css';

/** Something to look at on the neck: a scale or a chord. */
interface Shape {
  value: string;
  /** Written to follow the root: "A minor pentatonic", "A Dorian". */
  name: string;
  spell(root: Note): SpelledNote[];
  degrees: readonly string[];
}

// Saved as the last choice, so keep values stable. `id` tells apart two names
// for one scale (major is also Ionian).
function scale(type: ScaleType, name: string, id: string = type): Shape {
  return {
    value: `scale-${id}`,
    name,
    spell: (root) => spellScale(root, type),
    degrees: SCALE_DEGREES[type],
  };
}

function chord(id: string, type: ChordType): Shape {
  return {
    value: `chord-${id}`,
    // "Major" alone could mean the scale, so triads say so.
    name: type.intervals.length === 3 ? `${type.name} triad` : type.name,
    spell: (root) => spellChord(root, type),
    degrees: type.degrees,
  };
}

const SCALE_SHAPES = [
  scale('major', 'major scale'),
  scale('minor', 'natural minor'),
  scale('majorPentatonic', 'major pentatonic'),
  scale('minorPentatonic', 'minor pentatonic'),
  scale('harmonicMinor', 'harmonic minor'),
  scale('minorBlues', 'minor blues'),
  scale('majorBlues', 'major blues'),
];

const MODE_SHAPES = [
  scale('major', 'Ionian (major)', 'ionian'),
  scale('dorian', 'Dorian'),
  scale('phrygian', 'Phrygian'),
  scale('lydian', 'Lydian'),
  scale('mixolydian', 'Mixolydian'),
  scale('minor', 'Aeolian (natural minor)', 'aeolian'),
  scale('locrian', 'Locrian'),
];

const CHORD_SHAPES = Object.entries(CHORD_TYPES).map(([id, type]) => chord(id, type));

const SHAPES = [...SCALE_SHAPES, ...MODE_SHAPES, ...CHORD_SHAPES];
const SHAPE_VALUES = SHAPES.map((s) => s.value);

function option({ value, name }: Shape) {
  return { value, label: name[0].toUpperCase() + name.slice(1) };
}

const SHAPE_GROUPS = [
  { label: 'Scales', options: SCALE_SHAPES.map(option) },
  { label: 'Modes', options: MODE_SHAPES.map(option) },
  { label: 'Chords', options: CHORD_SHAPES.map(option) },
];

type LabelMode = 'notes' | 'degrees';

const LABEL_MODES = [
  { value: 'notes', label: 'Notes' },
  { value: 'degrees', label: 'Degrees' },
] as const satisfies readonly { value: LabelMode; label: string }[];

export default function FretboardExplorer() {
  const [root, setRoot] = usePersistentState<Note>('explorer-root', 'A', oneOf(CHROMATIC));
  const [shapeValue, setShapeValue] = usePersistentState(
    'explorer-shape',
    'scale-minorPentatonic',
    oneOf(SHAPE_VALUES),
  );
  const [labelMode, setLabelMode] = usePersistentState<LabelMode>(
    'explorer-labels',
    'notes',
    oneOf(LABEL_MODES.map((m) => m.value)),
  );

  const shape = SHAPES.find((s) => s.value === shapeValue)!;
  const spelled = shape.spell(root);
  const noteNames = spelled.map(formatNote);
  const degrees = shape.degrees.map(shortDegree);
  const labels = labelMode === 'notes' ? noteNames : degrees;

  const notes = notePositions(spelled.map(pitchClass)).map(({ tone, ...position }) => ({
    ...position,
    label: labels[tone],
    root: tone === 0,
  }));

  function changeRoot(selected: Note[]) {
    // Tapping the current root would deselect it; keep one chosen.
    const next = selected[0];
    if (next) setRoot(next);
  }

  return (
    <section className="trainer">
      <h2>Fretboard Explorer</h2>

      <div className="toggle-row">
        <Dropdown
          label="Show"
          groups={SHAPE_GROUPS}
          value={shapeValue}
          onChange={setShapeValue}
        />
        <SegmentedControl
          label="Label dots with"
          options={LABEL_MODES}
          value={labelMode}
          onChange={setLabelMode}
        />
      </div>

      <div className="explorer-summary">
        <div className="explorer-name">
          {noteNames[0]} {shape.name}
        </div>
        <ol className="explorer-tones">
          {noteNames.map((name, i) => (
            <li key={name} className={i === 0 ? 'explorer-tone root' : 'explorer-tone'}>
              <span className="explorer-tone-note">{name}</span>
              <span className="explorer-tone-degree">{degrees[i]}</span>
            </li>
          ))}
        </ol>
      </div>

      <Fretboard notes={notes} />

      <NotePicker selected={[root]} max={1} onChange={changeRoot} />
    </section>
  );
}
