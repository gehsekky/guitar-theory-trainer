// Chord sequences as playable phrases, shared by the ear games that play
// progressions and cadences.

import type { PhraseStep } from '../audio';
import { diatonicTriad, voiceTriad, type Note } from '../theory';

// Loudness of the bass, then the three upper voices. The bass names each
// chord, so it leads; the upper voices, often an inversion, sit back. The
// total stays about that of four equal voices, so it can't clip.
const BASS_LED = [1.5, 0.75, 0.75, 0.75];

/** Diatonic triads of a major key (scale degrees, 0 = I) as phrase steps,
 * each voiced with the root in the bass and smooth upper voices. */
export function majorChordSteps(
  tonic: Note,
  degrees: readonly number[],
  duration: number,
): PhraseStep[] {
  return degrees.map((degree) => ({
    midis: voiceTriad(diatonicTriad(tonic, 'major', degree)),
    duration,
    gains: BASS_LED,
  }));
}
