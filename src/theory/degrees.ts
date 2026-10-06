// Teaching content for scale degrees: functional names and a short note on
// each degree's harmonic role, shown after grading.

import type { ScaleType } from './scales';

// Functional names for each scale degree (index 0 = degree 1 = tonic).
// Degrees 1-6 share names across qualities; the 7th differs: a half-step
// below the tonic is the "leading tone" (major), a whole-step below is
// the "subtonic" (natural minor).
export const DEGREE_NAMES: Record<ScaleType, string[]> = {
  major: [
    'tonic',
    'supertonic',
    'mediant',
    'subdominant',
    'dominant',
    'submediant',
    'leading tone',
  ],
  minor: [
    'tonic',
    'supertonic',
    'mediant',
    'subdominant',
    'dominant',
    'submediant',
    'subtonic',
  ],
};

// Short notes on each degree's harmonic function and compositional use.
// Shown after grading as an educational blurb.
export const DEGREE_INFO: Record<ScaleType, string[]> = {
  major: [
    'Home base — the tonal center every other note pulls toward. Pieces usually begin and end here, and it is the point of ultimate rest.',
    'A classic pre-dominant: the ii chord built on it sets up the dominant and pushes the music toward a cadence.',
    'Sits midway between tonic and dominant, sharing notes with both. It carries the key’s major color and can stand in for the tonic as a softer resting point.',
    'The "away" pole opposite the dominant. Its IV chord creates gentle departure from home and powers the plagal "Amen" cadence.',
    'The engine of tonal music: it generates the most tension and drives hardest back home. The V–I authentic cadence is built on it.',
    'Root of the relative minor (vi). Used for deceptive cadences (V–vi) that dodge the expected resolution and extend a phrase.',
    'Only a half step below the tonic, it strains upward to resolve home. That pull gives the dominant chord its drive and defines major-key tension.',
  ],
  minor: [
    'Home base — the tonal center every other note pulls toward. Pieces usually begin and end here, and it is the point of ultimate rest.',
    'A pre-dominant heading toward the dominant. In minor the chord here is diminished (ii°), lending extra instability.',
    'In minor this degree is the root of the relative major, and it gives the key much of its darker color.',
    'The "away" pole opposite the dominant. Its iv chord creates gentle departure from home and supports the plagal cadence.',
    'Still the strongest pull home. In natural minor the dominant is a weaker minor chord, so composers often raise the 7th (harmonic minor) to forge a true leading tone and a strong V–i.',
    'Root of the relative major region; it also enables deceptive motion away from the tonic.',
    'A whole step below the tonic, so it lacks the sharp upward pull of a leading tone. It gives natural-minor, modal, and rock progressions their relaxed ♭VII descent.',
  ],
};
