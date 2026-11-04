import { useEffect, useRef, useState, type MouseEvent } from 'react';
import SegmentedControl from './ui/SegmentedControl';
import TransportButton from './ui/TransportButton';
import { useMetronome } from '../metronome/MetronomeContext';
import {
  MAX_BPM,
  METERS,
  MIN_BPM,
  accentOf,
  addTap,
  beatsIn,
  bpmFromTaps,
} from '../metronome/timing';

const METER_OPTIONS = METERS.map((meter) => ({ value: meter, label: meter }));

function BeatDots() {
  const metronome = useMetronome();
  const { subscribeBeat, meter } = metronome;
  const [beat, setBeat] = useState(0);

  useEffect(() => subscribeBeat(setBeat), [subscribeBeat]);

  // Decorative: the clicks and BPM readout already say this to screen readers.
  return (
    <div className="beat-dots" aria-hidden="true">
      {Array.from({ length: beatsIn(meter) }, (_, i) => {
        const classes = ['beat-dot', accentOf(meter, i)];
        if (metronome.on && i === beat) classes.push('current');
        return <span key={i} className={classes.join(' ')} />;
      })}
    </div>
  );
}

export default function MetronomePanel() {
  const metronome = useMetronome();
  const { bpm } = metronome;
  const taps = useRef<number[]>([]);

  function tap(event: MouseEvent) {
    taps.current = addTap(taps.current, event.timeStamp);
    const tapped = bpmFromTaps(taps.current);
    if (tapped !== null) metronome.setBpm(tapped);
  }

  return (
    <section className="tool-panel" aria-labelledby="metronome-panel-title">
      <h3 id="metronome-panel-title" className="tool-title">
        Metronome
      </h3>

      <div className="tool-main">
        <TransportButton name="metronome" playing={metronome.on} onClick={metronome.toggle} />
        <div className="bpm-stepper">
          <button
            type="button"
            className="bpm-step"
            aria-label="Slower"
            disabled={bpm <= MIN_BPM}
            onClick={() => metronome.setBpm(bpm - 1)}
          >
            −
          </button>
          <div className="bpm-value">
            <strong>{bpm}</strong> <span>BPM</span>
          </div>
          <button
            type="button"
            className="bpm-step"
            aria-label="Faster"
            disabled={bpm >= MAX_BPM}
            onClick={() => metronome.setBpm(bpm + 1)}
          >
            +
          </button>
        </div>
        <button type="button" className="tap-btn" onClick={tap}>
          Tap
        </button>
      </div>

      <input
        type="range"
        className="bpm-slider"
        aria-label="Tempo in beats per minute"
        min={MIN_BPM}
        max={MAX_BPM}
        value={bpm}
        onChange={(event) => metronome.setBpm(Number(event.target.value))}
      />

      <div className="meter-row">
        <SegmentedControl
          label="Time signature"
          options={METER_OPTIONS}
          value={metronome.meter}
          onChange={metronome.setMeter}
        />
        <BeatDots />
      </div>

      {metronome.failed && (
        <p className="metronome-failed" role="alert">
          The metronome can't start here. It needs a secure (HTTPS) connection and a
          recent browser.
        </p>
      )}
    </section>
  );
}
