import { FRET_COUNT, STRINGS } from '../music';

export interface FretboardMarker {
  stringIndex: number; // index into STRINGS (0 = low E)
  fret: number; // 0 = open string
}

interface FretboardProps {
  marker?: FretboardMarker;
  /** Indices into STRINGS to draw normally; the rest are dimmed. Default: all. */
  activeStrings?: number[];
}

// SVG layout constants
const NUT_X = 60; // leaves room for string labels and open-string markers
const FRET_SPACING = 38;
const STRING_SPACING = 26;
const TOP = 24;
const BOTTOM = TOP + STRING_SPACING * (STRINGS.length - 1);
const WIDTH = NUT_X + FRET_SPACING * FRET_COUNT + 16;
const HEIGHT = BOTTOM + 40;

const ALL_FRETS = Array.from({ length: FRET_COUNT }, (_, i) => i + 1);
// Standard side/face inlays repeat every octave: single dots at 3/5/7/9,
// a double dot at the 12th (and 24th).
const SINGLE_INLAYS = ALL_FRETS.filter((f) => [3, 5, 7, 9].includes(f % 12));
const DOUBLE_INLAYS = ALL_FRETS.filter((f) => f % 12 === 0);
const MID_Y = (TOP + BOTTOM) / 2;

/** Center x of a fret slot (where a finger would go); fret 0 sits left of the nut. */
function fretX(fret: number): number {
  if (fret === 0) return NUT_X - 16;
  return NUT_X + FRET_SPACING * (fret - 0.5);
}

/** y of a string. STRINGS is low→high, but low E renders at the bottom. */
function stringY(stringIndex: number): number {
  return TOP + STRING_SPACING * (STRINGS.length - 1 - stringIndex);
}

export default function Fretboard({ marker, activeStrings }: FretboardProps) {
  const dimmed = (i: number) => activeStrings && !activeStrings.includes(i);

  return (
    <div className="fretboard-scroll">
      <svg
        className="fretboard"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width={WIDTH}
        height={HEIGHT}
        role="img"
        aria-label="Guitar fretboard"
      >
        {/* Board background */}
        <rect
          x={NUT_X}
          y={TOP - 10}
          width={FRET_SPACING * FRET_COUNT}
          height={BOTTOM - TOP + 20}
          rx={4}
          className="fb-wood"
        />

        {/* Nut */}
        <rect x={NUT_X - 5} y={TOP - 10} width={5} height={BOTTOM - TOP + 20} className="fb-nut" />

        {/* Frets */}
        {Array.from({ length: FRET_COUNT }, (_, i) => i + 1).map((f) => (
          <line
            key={f}
            x1={NUT_X + FRET_SPACING * f}
            y1={TOP - 10}
            x2={NUT_X + FRET_SPACING * f}
            y2={BOTTOM + 10}
            className="fb-fret"
          />
        ))}

        {/* Single inlays */}
        {SINGLE_INLAYS.map((f) => (
          <circle
            key={`s${f}`}
            cx={NUT_X + FRET_SPACING * (f - 0.5)}
            cy={MID_Y}
            r={4.5}
            className="fb-inlay"
          />
        ))}
        {/* Double (octave) inlays */}
        {DOUBLE_INLAYS.map((f) => (
          <g key={`d${f}`}>
            <circle
              cx={NUT_X + FRET_SPACING * (f - 0.5)}
              cy={MID_Y - STRING_SPACING}
              r={4.5}
              className="fb-inlay"
            />
            <circle
              cx={NUT_X + FRET_SPACING * (f - 0.5)}
              cy={MID_Y + STRING_SPACING}
              r={4.5}
              className="fb-inlay"
            />
          </g>
        ))}

        {/* Strings */}
        {STRINGS.map((_s, i) => (
          <line
            key={i}
            x1={NUT_X - 5}
            y1={stringY(i)}
            x2={NUT_X + FRET_SPACING * FRET_COUNT}
            y2={stringY(i)}
            className={dimmed(i) ? 'fb-string dimmed' : 'fb-string'}
            // thicker lines for lower strings
            strokeWidth={2.4 - i * 0.3}
          />
        ))}

        {/* Open-string labels */}
        {STRINGS.map((s, i) => (
          <text
            key={i}
            x={14}
            y={stringY(i) + 4}
            className={dimmed(i) ? 'fb-label dimmed' : 'fb-label'}
          >
            {s.label}
          </text>
        ))}

        {/* Fret numbers */}
        {Array.from({ length: FRET_COUNT }, (_, i) => i + 1).map((f) => (
          <text
            key={f}
            x={NUT_X + FRET_SPACING * (f - 0.5)}
            y={BOTTOM + 30}
            className="fb-fretnum"
          >
            {f}
          </text>
        ))}

        {/* Marker */}
        {marker && (
          <g>
            <circle
              cx={fretX(marker.fret)}
              cy={stringY(marker.stringIndex)}
              r={11}
              className="fb-marker"
            />
            <circle
              cx={fretX(marker.fret)}
              cy={stringY(marker.stringIndex)}
              r={11}
              className="fb-marker-ring"
            />
          </g>
        )}
      </svg>
    </div>
  );
}
