import { useEffect, useState, type ComponentType } from 'react';
import NeckTrainer from './components/NeckTrainer';
import ChordFlashcardTrainer from './components/ChordFlashcardTrainer';
import SheetTrainer from './components/SheetTrainer';
import ScaleTrainer from './components/ScaleTrainer';
import EarTrainer from './components/EarTrainer';
import ScaleDegreeTrainer from './components/ScaleDegreeTrainer';
import DiatonicChordTrainer from './components/DiatonicChordTrainer';
import DroneTrainer from './components/DroneTrainer';
import DroneIndicator from './components/DroneIndicator';
import { useDrone, type DronePolicy } from './drone/DroneContext';
import { useTabRoute } from './hooks/useTabRoute';
import './App.css';

// One entry per trainer tab, in display order. Each id is the trainer's URL
// (#/scales) and is saved as the last tab used, so keep ids stable. `drone`
// says how the trainer shares a running drone (see DronePolicy): `lock`
// trainers use its key, `pause` trainers silence it while open.
const TABS = [
  { id: 'neck-notes', label: 'Neck Notes', Trainer: NeckTrainer, drone: 'free' },
  { id: 'chord-flashcards', label: 'Chord Flashcards', Trainer: ChordFlashcardTrainer, drone: 'pause' },
  { id: 'sheet-music', label: 'Sheet Music', Trainer: SheetTrainer, drone: 'pause' },
  { id: 'scales', label: 'Scales', Trainer: ScaleTrainer, drone: 'lock' },
  { id: 'scale-degrees', label: 'Scale Degrees', Trainer: ScaleDegreeTrainer, drone: 'lock' },
  { id: 'diatonic-chords', label: 'Diatonic Chords', Trainer: DiatonicChordTrainer, drone: 'lock' },
  { id: 'ear-training', label: 'Ear Training', Trainer: EarTrainer, drone: 'lock' },
  { id: 'drone', label: 'Drone', Trainer: DroneTrainer, drone: 'free' },
] as const satisfies readonly {
  id: string;
  label: string;
  Trainer: ComponentType;
  drone: DronePolicy;
}[];

const TAB_IDS = TABS.map((t) => t.id);

const APP_TITLE = 'Guitar Theory Trainer';

export default function App() {
  const [tab, navigate] = useTabRoute(TAB_IDS, 'neck-notes');
  // On phones only the active tab shows; tapping it reveals the rest.
  const [tabsExpanded, setTabsExpanded] = useState(false);
  const { Trainer, label, drone: policy } = TABS.find((t) => t.id === tab)!;
  const drone = useDrone();
  const { setPaused } = drone;

  // Trainers whose keys change too often to share the drone's silence it.
  useEffect(() => setPaused(policy === 'pause'), [setPaused, policy]);

  // A locked trainer builds its rounds in the drone's key; remount it when
  // that key changes (or the drone stops) so the current round follows.
  const trainerKey =
    policy === 'lock' ? `${tab}:${drone.lockedKey ?? 'free'}` : tab;

  // Name the trainer in the browser tab and history entries.
  useEffect(() => {
    document.title = `${label} · ${APP_TITLE}`;
  }, [label]);

  // Collapse the phone tab list whenever the trainer changes, including
  // via Back/Forward.
  useEffect(() => setTabsExpanded(false), [tab]);

  return (
    <div className="app">
      <header className="app-header">
        <h1 aria-label="Guitar Theory Trainer">
          🎸 <span className="title-full">Guitar Theory Trainer</span>
          <span className="title-short">GTT</span>
        </h1>
        {tab !== 'drone' && <DroneIndicator />}
        <nav
          className={tabsExpanded ? 'tabs expanded' : 'tabs'}
          role="tablist"
          aria-label="Trainers"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={tab === t.id ? 'tab active' : 'tab'}
              onClick={() => {
                if (tab === t.id) setTabsExpanded((e) => !e);
                else navigate(t.id);
              }}
            >
              <span className="tab-label">{t.label}</span>
            </button>
          ))}
        </nav>
      </header>

      <main>
        <Trainer key={trainerKey} />
      </main>
    </div>
  );
}
