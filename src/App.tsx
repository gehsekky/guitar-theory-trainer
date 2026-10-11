import { useEffect, useState, type ComponentType } from 'react';
import NeckTrainer from './components/NeckTrainer';
import ChordFlashcardTrainer from './components/ChordFlashcardTrainer';
import SheetTrainer from './components/SheetTrainer';
import ScaleTrainer from './components/ScaleTrainer';
import EarTrainer from './components/EarTrainer';
import ScaleDegreeTrainer from './components/ScaleDegreeTrainer';
import DiatonicChordTrainer from './components/DiatonicChordTrainer';
import DroneTrainer from './components/DroneTrainer';
import { useTabRoute } from './hooks/useTabRoute';
import './App.css';

// One entry per trainer tab, in display order. Each id is the trainer's URL
// (#/scales) and is saved as the last tab used, so keep ids stable.
const TABS = [
  { id: 'neck-notes', label: 'Neck Notes', Trainer: NeckTrainer },
  { id: 'chord-flashcards', label: 'Chord Flashcards', Trainer: ChordFlashcardTrainer },
  { id: 'sheet-music', label: 'Sheet Music', Trainer: SheetTrainer },
  { id: 'scales', label: 'Scales', Trainer: ScaleTrainer },
  { id: 'scale-degrees', label: 'Scale Degrees', Trainer: ScaleDegreeTrainer },
  { id: 'diatonic-chords', label: 'Diatonic Chords', Trainer: DiatonicChordTrainer },
  { id: 'ear-training', label: 'Ear Training', Trainer: EarTrainer },
  { id: 'drone', label: 'Drone', Trainer: DroneTrainer },
] as const satisfies readonly {
  id: string;
  label: string;
  Trainer: ComponentType;
}[];

const TAB_IDS = TABS.map((t) => t.id);

const APP_TITLE = 'Guitar Theory Trainer';

export default function App() {
  const [tab, navigate] = useTabRoute(TAB_IDS, 'neck-notes');
  // On phones only the active tab shows; tapping it reveals the rest.
  const [tabsExpanded, setTabsExpanded] = useState(false);
  const { Trainer, label } = TABS.find((t) => t.id === tab)!;

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
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main>
        <Trainer key={tab} />
      </main>
    </div>
  );
}
