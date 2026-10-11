import {
  FLAT_SIG_STEPS,
  SHARP_SIG_STEPS,
  STEP_B4,
  STEP_E4,
  STEP_F5,
  STEP_G4,
  type Accidental,
  type Duration,
  type KeyDef,
} from '../theory';
import {
  FLAT,
  G_CLEF_PATH,
  NATURAL,
  SHARP,
  UNITS_PER_STAFF_SPACE,
  type Glyph,
} from './notationGlyphs';
import './SheetStaff.css';

interface SheetStaffProps {
  keyDef: KeyDef;
  /** Diatonic step of the note (octave * 7 + letter index). */
  step: number;
  accidental: Accidental;
  duration: Duration;
}

// Layout constants
const LINE_SPACING = 12;
const HALF_STEP = LINE_SPACING / 2;
const BOTTOM_LINE_Y = 120; // y of E4 (bottom staff line)
const STAFF_LEFT = 6;
const STAFF_RIGHT = 354;
const WIDTH = 360;
const HEIGHT = 190;
const CLEF_X = 12;
const KEY_SIG_X = 58; // left edge of the first key-signature accidental
const KEY_SIG_GAP = 2;
const NOTE_X = 260;
const ACCIDENTAL_GAP = 4.5; // between a note's accidental and its head
const NOTE_HEAD_LEFT = NOTE_X - 8;
const STEM_LEN = 42;

// Notation glyphs are in font units (see notationGlyphs.ts).
const GLYPH_SCALE = LINE_SPACING / UNITS_PER_STAFF_SPACE;

const NOTE_ACCIDENTAL: Record<Exclude<Accidental, 'none'>, Glyph> = {
  sharp: SHARP,
  flat: FLAT,
  natural: NATURAL,
};

/** A glyph with its left edge at x and its origin on staff position y. */
function placeGlyph(x: number, y: number): string {
  return `translate(${x} ${y}) scale(${GLYPH_SCALE} ${-GLYPH_SCALE})`;
}

function yOf(step: number): number {
  return BOTTOM_LINE_Y - (step - STEP_E4) * HALF_STEP;
}

/** Line steps (even offsets from E4) between the staff and the note. */
function ledgerSteps(step: number): number[] {
  const steps: number[] = [];
  if (step > STEP_F5) {
    for (let s = STEP_F5 + 2; s <= step; s += 2) steps.push(s);
  } else if (step < STEP_E4) {
    for (let s = STEP_E4 - 2; s >= step; s -= 2) steps.push(s);
  }
  return steps.filter((s) => s % 2 === 0);
}

export default function SheetStaff({
  keyDef,
  step,
  accidental,
  duration,
}: SheetStaffProps) {
  const noteY = yOf(step);
  const stemUp = step < STEP_B4;
  const hollow = duration === 'whole' || duration === 'half';
  const flags = duration === 'eighth' ? 1 : duration === 'sixteenth' ? 2 : 0;

  const sigCount = Math.abs(keyDef.accidentals);
  const sigSteps = (
    keyDef.accidentals >= 0 ? SHARP_SIG_STEPS : FLAT_SIG_STEPS
  ).slice(0, sigCount);
  const sigGlyph = keyDef.accidentals >= 0 ? SHARP : FLAT;
  const sigStep = sigGlyph.width * GLYPH_SCALE + KEY_SIG_GAP;

  // Stem geometry (none for whole notes)
  const stemX = stemUp ? NOTE_X + 6.5 : NOTE_X - 6.5;
  const stemY1 = stemUp ? noteY - 2 : noteY + 2;
  const stemY2 = stemUp ? noteY - STEM_LEN : noteY + STEM_LEN;

  return (
    <div className="staff-wrap">
      <svg
        className="staff"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width={WIDTH}
        height={HEIGHT}
        role="img"
        aria-label="Musical staff with a note"
      >
        {/* Staff lines: E4 G4 B4 D5 F5 */}
        {[30, 32, 34, 36, 38].map((s) => (
          <line
            key={s}
            x1={STAFF_LEFT}
            y1={yOf(s)}
            x2={STAFF_RIGHT}
            y2={yOf(s)}
            className="staff-line"
          />
        ))}

        {/* Treble clef: the glyph's origin is the G line (SMuFL), scaled
            from font units to our staff spacing and flipped to y-down. */}
        <path
          d={G_CLEF_PATH}
          transform={placeGlyph(CLEF_X, yOf(STEP_G4))}
          className="staff-clef"
        />

        {/* Key signature: each accidental on its line or space */}
        {sigSteps.map((s, i) => (
          <path
            key={i}
            d={sigGlyph.path}
            transform={placeGlyph(KEY_SIG_X + i * sigStep, yOf(s))}
            className="staff-sig"
          />
        ))}

        {/* Ledger lines */}
        {ledgerSteps(step).map((s) => (
          <line
            key={s}
            x1={NOTE_X - 14}
            y1={yOf(s)}
            x2={NOTE_X + 14}
            y2={yOf(s)}
            className="staff-line ledger"
          />
        ))}

        {/* Note accidental, just left of the note head */}
        {accidental !== 'none' && (
          <path
            d={NOTE_ACCIDENTAL[accidental].path}
            transform={placeGlyph(
              NOTE_HEAD_LEFT -
                ACCIDENTAL_GAP -
                NOTE_ACCIDENTAL[accidental].width * GLYPH_SCALE,
              noteY,
            )}
            className="staff-accidental"
          />
        )}

        {/* Note head */}
        {duration === 'whole' ? (
          <ellipse
            cx={NOTE_X}
            cy={noteY}
            rx={8.5}
            ry={5.5}
            className="note-head hollow"
          />
        ) : (
          <ellipse
            cx={NOTE_X}
            cy={noteY}
            rx={7.5}
            ry={5.5}
            transform={`rotate(-20 ${NOTE_X} ${noteY})`}
            className={hollow ? 'note-head hollow' : 'note-head'}
          />
        )}

        {/* Stem */}
        {duration !== 'whole' && (
          <line x1={stemX} y1={stemY1} x2={stemX} y2={stemY2} className="note-stem" />
        )}

        {/* Flags */}
        {Array.from({ length: flags }, (_, i) => {
          const fy = stemUp ? stemY2 + i * 9 : stemY2 - i * 9;
          const d = stemUp
            ? `M ${stemX} ${fy} C ${stemX + 3} ${fy + 9}, ${stemX + 12} ${fy + 11}, ${stemX + 8} ${fy + 24}`
            : `M ${stemX} ${fy} C ${stemX + 3} ${fy - 9}, ${stemX + 12} ${fy - 11}, ${stemX + 8} ${fy - 24}`;
          return <path key={i} d={d} className="note-flag" />;
        })}
      </svg>
    </div>
  );
}
