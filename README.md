# 🎸 Guitar Theory Trainer

A browser-based practice app for guitarists to drill fretboard knowledge,
music theory, and ear training. Built with React + Vite + TypeScript, with no
backend — all logic runs client-side and preferences persist in
`localStorage`.

## Trainers

- **Neck Notes** — a position (open string through fret 22) is marked on an
  SVG fretboard; name the note.
- **Chord Flashcards** — a flashcard shows a root note and chord type; spell
  the chord in root position by picking its notes in order (root, 3rd, 5th,
  and 7th for seventh chords). Order is graded.
  - *Themes:* Major, Minor, Major 7th, or All (a mix of the three).
  - *Include sharp/flat notes* (on by default): when off, roots are naturals
    only — the chord tones themselves can still be sharp or flat.
- **Sheet Music** — read a note on a treble staff (with key signature, ledger
  lines, and accidentals).
  - *Easy:* key signature drawn and named; quarter notes.
  - *Hard:* key signature only (infer the key) and identify the note duration.
- **Scales** — spell major and natural-minor scales.
  - *Easy:* major only, with a W–W–H–W–W–W–H cheat sheet and one degree hidden.
  - *Hard:* major or minor, no cheat sheet, all seven notes hidden.
- **Scale Degrees** — name the note for a functional scale degree (tonic,
  dominant, leading tone, …), with a description of each degree's harmonic role.
  - *Easy:* major keys only.
  - *Hard:* major or natural-minor keys.
- **Diatonic Chords** — work with the chords built on each degree of a key,
  in major or natural minor.
  - *Find Chord:* given a key and Roman numeral (e.g. `vi` in G major), pick
    the chord's root and quality.
  - *Name Numeral:* given a key and a chord, pick its Roman numeral.
- **Ear Training** — tones are synthesized with the Web Audio API. The key can
  be random each round or fixed to a chosen note; both games share it.
  - *Intervals:* hear a tonic then a second note and name the interval
    (minor 2nd through octave).
  - *Chords:* hear a chord and name its quality. Easy is major/minor; hard
    adds diminished, augmented, and five seventh chords (major 7th,
    dominant 7th, minor 7th, half-diminished 7th, diminished 7th).

Accidentals are shown with both enharmonic spellings (e.g. A♯/B♭). Mode and
key choices are remembered between visits.

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check and build for production
npm run preview  # preview the production build
npm test         # run the test suite once
npm run test:watch  # re-run tests on change
npm run lint     # lint with oxlint
```

## Deployment

Live at <https://guitartheorytrainer.com>. Every push to `main` runs lint,
tests, and the production build, then publishes `dist/` to GitHub Pages
(`.github/workflows/deploy.yml`). The custom domain is configured in the
repo's Pages settings.

## Tech

- React 19 + TypeScript
- Vite
- Web Audio API for tone generation
- Inline SVG for the fretboard and musical staff
- Vitest for unit tests (`src/*.test.ts`), covering the theory, staff, and
  pitch helpers

No external UI or music-theory libraries — the theory (scales, triads,
intervals, key signatures) and rendering are implemented from scratch.
