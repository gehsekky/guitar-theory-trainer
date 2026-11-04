import './TransportButton.css';

interface TransportButtonProps {
  /** What it plays, for screen readers: "drone" gives "Play drone". */
  name: string;
  playing: boolean;
  onClick: () => void;
}

/** The round play/pause button for something that runs until it's stopped. */
export default function TransportButton({ name, playing, onClick }: TransportButtonProps) {
  return (
    <button
      type="button"
      className={playing ? 'transport-btn playing' : 'transport-btn'}
      aria-pressed={playing}
      aria-label={`${playing ? 'Pause' : 'Play'} ${name}`}
      onClick={onClick}
    >
      <svg viewBox="0 0 24 24" className="transport-icon" aria-hidden="true">
        {playing ? (
          <>
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </>
        ) : (
          <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
        )}
      </svg>
    </button>
  );
}
