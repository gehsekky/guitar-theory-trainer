import './PlayButton.css';

interface PlayButtonProps {
  hasPlayed: boolean;
  isPlaying: boolean;
  onPlay: () => void;
}

/** Play / Play Again for an ear-training prompt; disabled while playing. */
export default function PlayButton({ hasPlayed, isPlaying, onPlay }: PlayButtonProps) {
  return (
    <button
      type="button"
      className="secondary-btn"
      onClick={onPlay}
      disabled={isPlaying}
    >
      {isPlaying ? '♪ Playing…' : hasPlayed ? '▶ Play Again' : '▶ Play'}
    </button>
  );
}
