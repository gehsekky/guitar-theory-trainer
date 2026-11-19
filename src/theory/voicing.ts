// Voicing chords for playback: which octave each note sounds in. Pure MIDI
// math, so it can be tested without audio.

import { NOTE_INDEX, type Note } from './pitch';

/** MIDI number for a note in an octave (C4 = 60). */
function midiIn(note: Note, octave: number): number {
  // NOTE_INDEX is anchored at A = 0; convert to semitones above C.
  return (octave + 1) * 12 + ((NOTE_INDEX[note] + 9) % 12);
}

// Where the upper voices sit: around E4, clear on phone speakers and close
// enough together that successive chords move smoothly.
const UPPER_CENTER = 64;

/**
 * A triad voiced the way a keyboard player would comp it: the root alone in
 * the bass, and above it whichever inversion of the triad sits closest to
 * the middle of the staff. Holding the upper voices near one center keeps
 * each chord change a small move (voice leading), so a progression sounds
 * connected rather than jumping between root positions.
 *
 * The bass is what names the chord (the upper voices are often an
 * inversion), so it always sounds in octave 3: octave 2 is too low for
 * phone speakers to carry. The upper voices then sit above it.
 * Returns MIDI numbers, low to high.
 */
export function voiceTriad(notes: readonly [Note, Note, Note]): number[] {
  const [root] = notes;
  // Root position starting at or above C4, then its two inversions.
  const base = notes.map((n) => midiIn(n, 4));
  for (let i = 1; i < 3; i++) while (base[i] <= base[i - 1]) base[i] += 12;
  const inversions = [
    base,
    [base[1], base[2], base[0] + 12],
    [base[2], base[0] + 12, base[1] + 12],
  ];
  const distance = (v: number[]) => Math.abs(v.reduce((a, b) => a + b, 0) / 3 - UPPER_CENTER);
  const bass = midiIn(root, 3);
  const closest = inversions
    .flatMap((v) => [v, v.map((m) => m - 12)])
    .filter((v) => v[0] > bass)
    .reduce((best, v) => (distance(v) < distance(best) ? v : best));
  return [bass, ...closest];
}
