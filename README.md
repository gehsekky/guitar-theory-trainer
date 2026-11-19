# 🎸 Guitar Theory Trainer

A browser-based practice app for guitarists to drill fretboard knowledge,
music theory, and ear training. Built with React + Vite + TypeScript, with no
backend — all logic runs client-side and preferences persist in
`localStorage`.

## Trainers

- **Neck Notes** — find your way around the notes on the neck (open string
  through fret 22).
  - *Name it:* a position is marked on an SVG fretboard; name the note.
  - *Find all:* given a note, tap every place it sounds; tap a dot again to
    take it back. Graded as right only if every place is found with no
    extras; afterwards right taps show green, wrong ones red, and missed
    places as dashed dots.
  - *Strings:* toggle which strings are in play — one string for
    single-string drills, any combination, or All. Off strings are dimmed.
- **Fretboard Intervals** — learn what each interval looks like on the neck.
  The root is a labeled dot.
  - *Name it:* a second note is marked within a hand's reach of the root;
    name the interval.
  - *Find it:* tap where a named interval above the root is. Any string
    counts if the pitch is exact (same octave); afterwards every right place
    is shown, so you see each shape the interval makes, including the shift
    across the G–B strings.
  - *Drill:* all intervals, or one family (2nds and 3rds; 4ths, 5ths, and
    octave; 6ths and 7ths). After each answer you can hear the interval.
- **Chord Flashcards** — a flashcard shows a root note and chord type; spell
  the chord in root position by picking its notes in order (root, 3rd, 5th,
  and 7th for seventh chords). Order is graded.
  - *Chord* dropdown: one chord type (major, minor, diminished, augmented,
    major 7th, dominant 7th, minor 7th, half-diminished 7th, diminished 7th)
    or a mix (Major + minor, All triads, All 7th chords, All chords).
  - *Include sharp/flat notes* (on by default): when off, roots are naturals
    only — the chord tones themselves can still be sharp or flat.
- **Sheet Music** — read a note on a treble staff (with key signature, ledger
  lines, and accidentals).
  - *Easy:* key signature drawn and named; quarter notes.
  - *Hard:* key signature only (infer the key) and identify the note duration.
  - *Keys:* a key signature alone (no note); name its major key, its
    relative minor, or either at random. The answer comes with the reading
    rule (the last sharp is a half step below the key; the second-to-last
    flat is the key) and the relative major or minor.
- **Scales** — a flashcard shows a root note, scale type, and its step
  pattern (e.g. W–W–H–W–W–W–H); spell the scale by picking its notes in
  order, starting from the root. Order is graded.
  - *Scale* dropdown: one scale (Major, Natural minor, Major pentatonic,
    Minor pentatonic) or a mix (Major + minor, Both pentatonics, All scales).
  - *Include sharp/flat notes* (on by default): when off, roots are naturals
    only — the scale notes themselves can still be sharp or flat.
- **Scale Degrees** — the seven degrees of a key and the chords built on
  them. *Keys:* Major, Minor (natural), or Both.
  - *Note:* name the note for a functional scale degree (tonic, dominant,
    leading tone, …).
  - *Chord:* given a Roman numeral (e.g. `vi` in G major), pick the chord's
    root and quality.
  - *Numeral:* given a chord, pick its Roman numeral.
  - After each answer, a note explains that degree's harmonic role.
- **Ear Training** — tones are synthesized with the Web Audio API. The key can
  be random each round or fixed to a chosen note; every game shares it.
  Starting a prompt cuts off one still playing, and leaving a game or
  changing its settings silences it.
  - *Intervals:* hear a tonic, then a second note, then both together, and
    name the interval (minor 2nd through octave).
  - *Chords:* hear a chord note by note (low to high), then all together, and
    name its quality. Easy is major/minor; hard adds diminished, augmented,
    and five seventh chords (major 7th, dominant 7th, minor 7th,
    half-diminished 7th, diminished 7th).
  - *Progressions:* hear four chords in a major key, starting on I, and
    name chords 2–4 by Roman numeral (tap a filled slot to redo from
    there). Chords: I IV V, + ii vi, or + iii. Each chord has the root in
    the bass and the upper voices kept close, so changes move smoothly.
  - *Degrees:* functional ear training. A I–IV–V–I cadence sets the key,
    then one note plays; name its scale degree. Notes: 1 3 5, the major
    scale, or all 12 (adding ♭2, ♭3, ♯4, ♭6, ♭7). *Note again* replays just
    the note. After each answer the note resolves stepwise along the major
    scale to the nearer tonic (6 → 7 → 1, ♭3 → 2 → 1), so its pull is heard.
- **Fretboard Explorer** — pick a root and a scale, mode, or chord to see every
  place to play it across the neck, with the root highlighted. Dots show note
  names (spelled for the key) or degrees (R, ♭3, 5). Nothing is graded.
  - *Scales:* major, natural and harmonic minor, major and minor pentatonic,
    and major and minor blues.
  - *Modes:* Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, and Locrian.
- **Practice Tools** — a metronome and a drone on one page, each with its own
  play button, so you can run either or both. They keep playing as you
  switch trainers, and a header control shows what's running and stops it from
  anywhere. The screen stays on while either plays (where the browser supports
  the Screen Wake Lock API).
  - *Metronome:* 30–240 BPM, set with the −/+ buttons, the slider, or by
    tapping Tap in time. Time signatures are 2/4, 3/4, 4/4, and 6/8 (every
    eighth note clicks, so BPM counts eighths, with a second pulse on beat
    four). The downbeat is accented and dots show the beat. It goes quiet
    during ear-training prompts.
  - *Drone:* a sustained root + fifth (synthesized) to anchor a key while you
    practice. Pick the key from the note grid, and it changes live.
  - *Practicing with the drone:* while it sounds, Scales, Scale Degrees, and
    Ear Training use its key (each says so), and ear-training prompts briefly
    dip it. Sheet Music and Chord Flashcards change key every round, so the
    drone pauses there and resumes when you leave; Neck Notes leaves it
    playing.
  - *Sounds:* Tanpura, the default (modeled on measurements of a real
    tanpura: Pa, Sa, Sa, low Sa plucked across an 8 s cycle with a little
    human timing variation, soft attacks, long overlapping ring, and a buzz
    that blooms after each pluck), Synth (detuned sawtooths, slowly breathing
    filter), or Organ (steady drawbar-style sine partials). Switching while
    playing crossfades for easy comparison.

Notes in a key, scale, chord, or interval are spelled correctly for that
context (F major has B♭, not A♯; A♯ major is shown as B♭ major), and a written
note that lands on a white key says so (E♯, sounds as F). Answers are pitch
classes, so the note-picker buttons show both spellings (A♯/B♭). Mode and key
choices are remembered between visits.

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

## Installing as an app (PWA)

The site is a progressive web app: it can be installed to a phone's home
screen or the desktop (iPhone: Share → Add to Home Screen; Android/desktop
Chrome: the install prompt or menu item), opens in its own window without
browser bars, and works offline after the first visit.

The service worker (`src/sw.ts`, built by `vite-plugin-pwa`) uses this update
strategy:

- **The page is network-first.** Opening the app while online always loads
  the latest deploy, with no "new version available" reload mid-practice;
  offline, the last cached copy is used.
- **Build assets are cache-first.** JS, CSS, and icons are content-hashed and
  precached, so they never go stale.

The service worker only runs in production builds; use `npm run build &&
npm run preview` to try offline behavior locally.

## Tech

- React 19 + TypeScript
- Vite
- Web Audio API for tone generation
- `vite-plugin-pwa` + Workbox for the installable, offline-capable PWA
- Inline SVG for the fretboard and musical staff
- [Tonal](https://github.com/tonaljs/tonal) for core music theory (scales,
  chords, intervals, modes)
- Vitest for unit tests (`src/**/*.test.ts`), covering the theory, staff, and
  pitch helpers

### Theory layer (`src/theory/`)

Trainers import music theory only from `src/theory`, never from Tonal
directly, so the library stays an implementation detail:

- `pitch.ts`: pitch classes (the `Note` type), spelling → pitch class
- `spelling.ts`: spelled notes (`"Bb"`), display (`B♭`), and choosing a
  root's spelling by fewest accidentals
- `scales.ts`: the scales the app teaches; adding one is a single `SCALES`
  entry naming a Tonal scale, and its step pattern and degree numbers are
  derived. `KEY_TYPES` marks the scales that define a key (seven degrees,
  diatonic chords)
- `chords.ts`: one `CHORD_TYPES` registry shared by every trainer
- `diatonic.ts`: diatonic chords and Roman numerals, derived from each
  scale's mode
- `degrees.ts`: scale-degree names and descriptions (teaching content)
- `intervals.ts`: the intervals the ear trainer uses
- `keys.ts`: key signatures, derived from each key's spelled scale
- `notation.ts`: treble-staff positions, written accidentals, durations
- `guitar.ts`: tuning and fretboard, kept free of app code

The `@tonaljs/*` packages are pinned to exact versions because Tonal's
2026-09-28 release was published with missing `main`/`types` files, so
upgrade them deliberately and check that they still build.

UI and rendering (fretboard, staff, synthesized audio) use no external
libraries. The treble clef and the sharps, flats, and naturals are SVG
outlines from [Bravura](https://github.com/steinbergmedia/bravura),
Steinberg's SMuFL reference music font (SIL Open Font License 1.1, see
`licenses/Bravura-OFL.txt`). SMuFL defines where each glyph sits on the
staff, so the notation looks identical on every device rather than
depending on installed fonts.

### Shared trainer building blocks

Every quiz trainer is built from the same pieces, so cross-cutting changes
(layout, scoring, shortcuts) happen in one place:

- `hooks/useQuiz.ts`: the round loop (current round, graded, correct,
  `grade()`, `next()`)
- `hooks/usePersistentState.ts`: settings saved in `localStorage` under
  stable keys, with typed codecs (`oneOf`, `booleanCodec`, `jsonCodec`) and
  safe fallbacks when storage is unavailable
- `hooks/usePlayback.ts`: play-button state for ear-training games
- `metronome/`: the one app-wide metronome (`MetronomeProvider`,
  `useMetronome()`). Clicks are generated on the audio thread by an
  `AudioWorklet` (`click.worklet.ts`), so a busy or hidden page can't delay
  them. It wraps `clickGenerator.ts`, which places every beat by sample number
  and has no browser dependencies, so tests check exact sample positions.
  `display.ts` times the beat dots to when the sound reaches the speakers.
  `audio.ts` also recovers from interruptions such as phone calls. AudioWorklet
  needs a secure page, so test on a phone over HTTPS, not a plain LAN address.
- `drone/`: the one app-wide drone (`DroneProvider`, `useDrone()`), and each
  trainer's `drone` policy in `App.tsx` (`lock` to its key, `pause` it, or
  `free`); locked trainers remount when the drone's key changes so the
  current round follows
- `hooks/useTabRoute.ts`: the active trainer in the URL hash (`#/scales`),
  so trainers can be linked to and Back/Forward move between them; a bare
  URL or app launch reopens the last trainer used. Trainer ids in `App.tsx`
  are public URLs, so keep them stable.
- `components/ui/`: `SegmentedControl`, `QuizActions` (Submit/Next),
  `ResultBanner`, `PlayButton`

Styles live next to what they style: each component imports its own
`.css` file, `src/styles/trainer.css` holds the pieces several trainers
share (the trainer card, choice buttons, chips, toggles, flashcard and
answer slots), `src/index.css` holds the color tokens, and `App.css` the
header and tabs. Vite still bundles one stylesheet.
