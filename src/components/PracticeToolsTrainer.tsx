import DronePanel from './DronePanel';
import MetronomePanel from './MetronomePanel';
import './PracticeToolsTrainer.css';

/**
 * The practice companions, each with its own play button so either or both
 * can run. The metronome comes first: it's shorter, so on small phones both
 * play buttons stay on screen and only the key grid can fall below the fold.
 */
export default function PracticeToolsTrainer() {
  return (
    <section className="trainer">
      <h2>Practice Tools</h2>
      <p className="instructions">Run either or both in any trainer.</p>
      <MetronomePanel />
      <DronePanel />
    </section>
  );
}
