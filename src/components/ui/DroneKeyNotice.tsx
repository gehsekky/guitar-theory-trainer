import { formatNote, keyTonic, type Note } from '../../theory';
import './DroneKeyNotice.css';

/** Tells the user a trainer is following the drone's key, and why. */
export default function DroneKeyNotice({ lockedKey }: { lockedKey: Note }) {
  return (
    <p className="drone-key-notice" role="note">
      ♪ Following the drone: key of{' '}
      <strong>{formatNote(keyTonic(lockedKey, 'major'))}</strong>. Stop the drone
      to use other keys.
    </p>
  );
}
