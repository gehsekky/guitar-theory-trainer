import { useState, type ComponentType } from 'react';
import NeckTrainer from './components/NeckTrainer';
import ChordFlashcardTrainer from './components/ChordFlashcardTrainer';
import SheetTrainer from './components/SheetTrainer';
import ScaleTrainer from './components/ScaleTrainer';
import EarTrainer from './components/EarTrainer';
import ScaleDegreeTrainer from './components/ScaleDegreeTrainer';
import DiatonicChordTrainer from './components/DiatonicChordTrainer';
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
] as const satisfies readonly {
  id: string;
  label: string;
  Trainer: ComponentType;
}[];

type Tab = (typeof TABS)[number]['id'];

export default function App() {
  const [tab, setTab] = useState<Tab>('neck');
  const { Trainer } = TABS.find((t) => t.id === tab)!;

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎸 Guitar Trainer</h1>
        <nav className="tabs" role="tablist" aria-label="Trainers">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={tab === t.id ? 'tab active' : 'tab'}
              onClick={() => setTab(t.id)}
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
