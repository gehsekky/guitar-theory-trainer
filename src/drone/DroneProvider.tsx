import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  DRONE_SOUNDS,
  startDrone,
  unlockAudio,
  type Drone,
  type DroneSound,
} from '../audio';
import { CHROMATIC, type Note } from '../theory';
import { oneOf, usePersistentState } from '../hooks/usePersistentState';
import { useWakeLock } from '../hooks/useWakeLock';
import { DroneContext, type DroneControls } from './DroneContext';

/**
 * Owns the one drone for the whole app, so it keeps playing as you move
 * between trainers. Trainers read it through `useDrone()`.
 */
export default function DroneProvider({ children }: { children: ReactNode }) {
  const [key, setKey] = usePersistentState<Note>('drone-key', 'E', oneOf(CHROMATIC));
  const [sound, setSound] = usePersistentState<DroneSound>(
    'drone-sound',
    'tanpura',
    oneOf(DRONE_SOUNDS),
  );
  const [on, setOn] = useState(false);
  const [paused, setPaused] = useState(false);
  const sounding = on && !paused;

  const droneRef = useRef<Drone | null>(null);
  const keyRef = useRef(key);
  keyRef.current = key;

  // Start the audio while sounding; a new sound crossfades (the old drone
  // fades out as the new one fades in).
  useEffect(() => {
    if (!sounding) return;
    const drone = startDrone(keyRef.current, sound);
    droneRef.current = drone;
    return () => {
      drone.stop();
      if (droneRef.current === drone) droneRef.current = null;
    };
  }, [sounding, sound]);

  // Key changes glide on the running drone instead of restarting it.
  useEffect(() => {
    droneRef.current?.setRoot(key);
  }, [key]);

  // Keep the screen on only while the drone is actually sounding.
  useWakeLock(sounding);

  const controls: DroneControls = {
    on,
    sounding,
    key,
    sound,
    lockedKey: sounding ? key : null,
    toggle() {
      unlockAudio();
      setOn((o) => !o);
    },
    stop() {
      setOn(false);
    },
    setKey,
    setSound,
    setPaused,
    duck(seconds) {
      droneRef.current?.duck(seconds);
    },
  };

  return <DroneContext.Provider value={controls}>{children}</DroneContext.Provider>;
}
