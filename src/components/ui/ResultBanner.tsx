import type { ReactNode } from 'react';
import './ResultBanner.css';

interface ResultBannerProps {
  correct: boolean;
  children: ReactNode;
}

/** The graded result, announced to screen readers. */
export default function ResultBanner({ correct, children }: ResultBannerProps) {
  return (
    <div className={correct ? 'result success' : 'result failure'} role="status">
      {children}
    </div>
  );
}
