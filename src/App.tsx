import { useState, type ComponentType } from 'react';
import NeckTrainer from './components/NeckTrainer';
import ChordFlashcardTrainer from './components/ChordFlashcardTrainer';
import SheetTrainer from './components/SheetTrainer';
import ScaleTrainer from './components/ScaleTrainer';
import EarTrainer from './components/EarTrainer';
import ScaleDegreeTrainer from './components/ScaleDegreeTrainer';
import DiatonicChordTrainer from './components/DiatonicChordTrainer';
import DroneTrainer from './components/DroneTrainer';
import './App.css';

// One entry per trainer tab, in display order.
const TABS = [
  { id: 'neck', label: 'Neck Notes', Trainer: NeckTrainer },
  { id: 'chords', label: 'Chord Flashcards', Trainer: ChordFlashcardTrainer },
  { id: 'sheet', label: 'Sheet Music', Trainer: SheetTrainer },
  { id: 'scale', label: 'Scales', Trainer: ScaleTrainer },
  { id: 'degree', label: 'Scale Degrees', Trainer: ScaleDegreeTrainer },
  { id: 'diatonic', label: 'Diatonic Chords', Trainer: DiatonicChordTrainer },
  { id: 'ear', label: 'Ear Training', Trainer: EarTrainer },
  { id: 'drone', label: 'Drone', Trainer: DroneTrainer },
] as const satisfies readonly {
  id: string;
  label: string;
  Trainer: ComponentType;
}[];

type Tab = (typeof TABS)[number]['id'];

export default function App() {
  const [tab, setTab] = useState<Tab>('neck');
  // On phones only the active tab shows; tapping it reveals the rest.
  const [tabsExpanded, setTabsExpanded] = useState(false);
  const { Trainer } = TABS.find((t) => t.id === tab)!;

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
                if (tab === t.id) {
                  setTabsExpanded((e) => !e);
                } else {
                  setTab(t.id);
                  setTabsExpanded(false);
                }
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
