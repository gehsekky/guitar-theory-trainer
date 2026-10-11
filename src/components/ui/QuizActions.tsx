interface QuizActionsProps {
  graded: boolean;
  /** Whether an answer is complete enough to submit. */
  canSubmit: boolean;
  onSubmit: () => void;
  onNext: () => void;
}

/** Submit while answering, then Next once graded. */
export default function QuizActions({
  graded,
  canSubmit,
  onSubmit,
  onNext,
}: QuizActionsProps) {
  return graded ? (
    <button type="button" className="primary-btn" onClick={onNext}>
      Next
    </button>
  ) : (
    <button
      type="button"
      className="primary-btn"
      onClick={onSubmit}
      disabled={!canSubmit}
    >
      Submit
    </button>
  );
}
