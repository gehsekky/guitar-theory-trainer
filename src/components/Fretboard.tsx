import { useEffect, useRef } from 'react';
import { FRET_COUNT, STRINGS } from '../theory';
import './Fretboard.css';

export interface FretboardMarker {
  stringIndex: number; // index into STRINGS (0 = low E)
  fret: number; // 0 = open string
}

/** A labeled dot, for showing many notes at once. */
export interface FretboardNote extends FretboardMarker {
  label: string;
  root: boolean;
  /** Marks a graded answer: a right or wrong place. */
  status?: 'correct' | 'wrong';
}

interface FretboardProps {
  marker?: FretboardMarker;
  notes?: readonly FretboardNote[];
  /** Indices into STRINGS to draw normally; the rest are dimmed. Default: all. */
  activeStrings?: number[];
  /** Where to scroll on narrow screens when there is no marker. */
  focus?: FretboardMarker;
  /** Makes every string and fret tappable, reporting the position tapped. */
  onSelect?: (position: FretboardMarker) => void;
}

// SVG layout constants
const NUT_X = 40; // leaves room for open-string markers left of the nut
const FRET_SPACING = 38;
const STRING_SPACING = 26;
const TOP = 24;
const BOTTOM = TOP + STRING_SPACING * (STRINGS.length - 1);
const WIDTH = NUT_X + FRET_SPACING * FRET_COUNT + 16;
const HEIGHT = BOTTOM + 40;
const LABEL_WIDTH = 22;

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

/** The tappable area around a string at a fret: the fret slot, or the space
 * left of the nut for the open string. */
function hitArea(fret: number) {
  const left = fret === 0 ? NUT_X - 32 : NUT_X + FRET_SPACING * (fret - 1);
  const right = fret === 0 ? NUT_X - 5 : left + FRET_SPACING;
  return { x: left, width: right - left };
}

function noteClass(root: boolean, status?: 'correct' | 'wrong') {
  let cls = root ? 'fb-note root' : 'fb-note';
  if (status) cls += ` ${status}`;
  return cls;
}

export default function Fretboard({
  marker,
  notes,
  activeStrings,
  focus,
  onSelect,
}: FretboardProps) {
  const dimmed = (i: number) => activeStrings && !activeStrings.includes(i);
  const scrollRef = useRef<HTMLDivElement>(null);
  const target = marker ?? focus;
  const markerX = target ? fretX(target.fret) : null;

  // When the board is wider than the screen (phones), scroll the marker into
  // the middle of the view. The SVG renders at 1:1, so SVG x is pixel x.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || markerX === null) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({
      left: markerX - el.clientWidth / 2,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, [markerX]);

  return (
    <div className="fretboard-area">
      {/* String names stay pinned while the board scrolls beside them. */}
      <svg
        className="fretboard-labels"
        viewBox={`0 0 ${LABEL_WIDTH} ${HEIGHT}`}
        width={LABEL_WIDTH}
        height={HEIGHT}
        aria-hidden="true"
      >
        {STRINGS.map((s, i) => (
          <text
            key={i}
            x={LABEL_WIDTH / 2}
            y={stringY(i) + 4}
            className={dimmed(i) ? 'fb-label dimmed' : 'fb-label'}
          >
            {s.label}
          </text>
        ))}
      </svg>

      <div className="fretboard-scroll" ref={scrollRef}>
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

          {/* Labeled notes */}
          {notes?.map(({ stringIndex, fret, label, root, status }) => (
            <g key={`${stringIndex}:${fret}`} className={noteClass(root, status)}>
              <circle cx={fretX(fret)} cy={stringY(stringIndex)} r={11} />
              <text x={fretX(fret)} y={stringY(stringIndex) + 3.5}>
                {label}
              </text>
            </g>
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

          {/* Tap targets, on top so dots don't block them. */}
          {onSelect &&
            STRINGS.map((_s, stringIndex) =>
              Array.from({ length: FRET_COUNT + 1 }, (_f, fret) => {
                const select = () => onSelect({ stringIndex, fret });
                return (
                  <rect
                    key={`hit${stringIndex}:${fret}`}
                    {...hitArea(fret)}
                    y={stringY(stringIndex) - STRING_SPACING / 2}
                    height={STRING_SPACING}
                    className="fb-hit"
                    role="button"
                    tabIndex={0}
                    aria-label={`String ${STRINGS.length - stringIndex}, ${
                      fret === 0 ? 'open' : `fret ${fret}`
                    }`}
                    onClick={select}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        select();
                      }
                    }}
                  />
                );
              }),
            )}
        </svg>
      </div>
    </div>
  );
}
