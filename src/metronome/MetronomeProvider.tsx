import { useEffect, useRef, useState, type ReactNode } from 'react';
import { startMetronome, unlockAudio, type Metronome } from '../audio';
import { oneOf, usePersistentState, type Codec } from '../hooks/usePersistentState';
import { useWakeLock } from '../hooks/useWakeLock';
import { MetronomeContext, type MetronomeControls } from './MetronomeContext';
import { MAX_BPM, METERS, MIN_BPM, clampBpm, type Meter } from './timing';

const bpmCodec: Codec<number> = {
  parse(raw) {
    const bpm = Number(raw);
    return Number.isInteger(bpm) && bpm >= MIN_BPM && bpm <= MAX_BPM ? bpm : undefined;
  },
  serialize: String,
};

/**
 * Owns the one metronome for the whole app, so it keeps playing as you move
 * between trainers. Trainers read it through `useMetronome()`.
 */
export default function MetronomeProvider({ children }: { children: ReactNode }) {
  const [bpm, saveBpm] = usePersistentState('metronome-bpm', 120, bpmCodec);
  const [meter, saveMeter] = usePersistentState<Meter>('metronome-meter', '4/4', oneOf(METERS));
  const [on, setOn] = useState(false);
  const [failed, setFailed] = useState(false);

  const engine = useRef<Metronome | null>(null);
  const beatListeners = useRef(new Set<(beat: number) => void>());

  useEffect(() => () => engine.current?.stop(), []);

  // Keep the screen on while it plays. The drone holds its own lock, and
  // the screen stays awake while either one does.
  useWakeLock(on);

  function stop() {
    engine.current?.stop();
    engine.current = null;
    setOn(false);
  }

  const controls: MetronomeControls = {
    on,
    bpm,
    meter,
    failed,
    toggle() {
      if (engine.current) {
        stop();
        return;
      }
      unlockAudio();
      setFailed(false);
      engine.current = startMetronome(bpm, meter, {
        onBeat(beat) {
          for (const listener of beatListeners.current) listener(beat);
        },
        onError() {
          engine.current = null;
          setOn(false);
          setFailed(true);
        },
      });
      setOn(true);
    },
    stop,
    setBpm(next) {
      const clamped = clampBpm(next);
      saveBpm(clamped);
      engine.current?.setBpm(clamped);
    },
    setMeter(next) {
      saveMeter(next);
      engine.current?.setMeter(next);
    },
    mute(seconds) {
      engine.current?.mute(seconds);
    },
    subscribeBeat(listener) {
      beatListeners.current.add(listener);
      return () => beatListeners.current.delete(listener);
    },
  };

  return <MetronomeContext.Provider value={controls}>{children}</MetronomeContext.Provider>;
}
