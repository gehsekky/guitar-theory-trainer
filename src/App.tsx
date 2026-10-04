import { useState } from 'react';
import NeckTrainer from './components/NeckTrainer';
import ChordFlashcardTrainer from './components/ChordFlashcardTrainer';
import SheetTrainer from './components/SheetTrainer';
import ScaleTrainer from './components/ScaleTrainer';
import EarTrainer from './components/EarTrainer';
import ScaleDegreeTrainer from './components/ScaleDegreeTrainer';
import DiatonicChordTrainer from './components/DiatonicChordTrainer';
import './App.css';

type Tab =
  | 'neck'
  | 'chords'
  | 'sheet'
  | 'scale'
  | 'degree'
  | 'diatonic'
  | 'ear';

export default function App() {
  const [tab, setTab] = useState<Tab>('neck');

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎸 Guitar Trainer</h1>
        <nav className="tabs" role="tablist" aria-label="Trainers">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'neck'}
            className={tab === 'neck' ? 'tab active' : 'tab'}
            onClick={() => setTab('neck')}
          >
            Neck Notes
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'chords'}
            className={tab === 'chords' ? 'tab active' : 'tab'}
            onClick={() => setTab('chords')}
          >
            Chord Flashcards
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'sheet'}
            className={tab === 'sheet' ? 'tab active' : 'tab'}
            onClick={() => setTab('sheet')}
          >
            Sheet Music
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'scale'}
            className={tab === 'scale' ? 'tab active' : 'tab'}
            onClick={() => setTab('scale')}
          >
            Scales
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'degree'}
            className={tab === 'degree' ? 'tab active' : 'tab'}
            onClick={() => setTab('degree')}
          >
            Scale Degrees
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'diatonic'}
            className={tab === 'diatonic' ? 'tab active' : 'tab'}
            onClick={() => setTab('diatonic')}
          >
            Diatonic Chords
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'ear'}
            className={tab === 'ear' ? 'tab active' : 'tab'}
            onClick={() => setTab('ear')}
          >
            Ear Training
          </button>
        </nav>
      </header>

      <main>
        {tab === 'neck' && <NeckTrainer />}
        {tab === 'chords' && <ChordFlashcardTrainer />}
        {tab === 'sheet' && <SheetTrainer />}
        {tab === 'scale' && <ScaleTrainer />}
        {tab === 'degree' && <ScaleDegreeTrainer />}
        {tab === 'diatonic' && <DiatonicChordTrainer />}
        {tab === 'ear' && <EarTrainer />}
      </main>
    </div>
  );
}
