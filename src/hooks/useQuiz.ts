import { useState } from 'react';

/**
 * The round-by-round loop every quiz trainer shares: the current round,
 * whether it has been graded, and whether the answer was right.
 *
 * `createRound` makes a new round; it gets the previous one so it can avoid
 * an immediate repeat. Answer inputs live in each trainer, which clears them
 * in `onNewRound`.
 */
export function useQuiz<R>(createRound: (prev?: R) => R, onNewRound?: () => void) {
  const [round, setRound] = useState<R>(() => createRound());
  const [graded, setGraded] = useState(false);
  const [correct, setCorrect] = useState(false);

  /** Record the answer as right or wrong and reveal the result. */
  function grade(isCorrect: boolean) {
    setCorrect(isCorrect);
    setGraded(true);
  }

  /**
   * Move to a new round: the next one from `createRound`, or `given`. After
   * a settings change, pass a round built from the new settings, since
   * `createRound` still sees the old ones until the next render.
   */
  function next(given?: R): R {
    const nextRound = given ?? createRound(round);
    setRound(nextRound);
    setGraded(false);
    onNewRound?.();
    return nextRound;
  }

  return { round, graded, correct, grade, next };
}
