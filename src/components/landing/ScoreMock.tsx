/**
 * A drawn fragment of notation over tablature with the player's playhead on it — the hero
 * image. Plain SVG so the landing page never loads the score engine.
 */

interface MockNote {
  /** Tab string, 1 = high E. */
  string: number;
  fret: number;
  /** Staff position in half-spaces above the bottom line (E4 = 0). */
  pitch: number;
}

// Two voices of an E-minor arpeggio study, six eighths a bar.
const BARS: MockNote[][] = [
  [
    { string: 6, fret: 0, pitch: -7 },
    { string: 3, fret: 0, pitch: 3 },
    { string: 2, fret: 0, pitch: 5 },
    { string: 1, fret: 0, pitch: 7 },
    { string: 2, fret: 0, pitch: 5 },
    { string: 3, fret: 0, pitch: 3 },
  ],
  [
    { string: 5, fret: 2, pitch: -5 },
    { string: 3, fret: 2, pitch: 4 },
    { string: 2, fret: 1, pitch: 6 },
    { string: 1, fret: 3, pitch: 9 },
    { string: 2, fret: 1, pitch: 6 },
    { string: 3, fret: 2, pitch: 4 },
  ],
  [
    { string: 4, fret: 2, pitch: -3 },
    { string: 3, fret: 0, pitch: 3 },
    { string: 2, fret: 3, pitch: 7 },
    { string: 1, fret: 2, pitch: 8 },
    { string: 2, fret: 3, pitch: 7 },
    { string: 3, fret: 0, pitch: 3 },
  ],
];

const LEFT = 64;
const BAR_W = 150;
const STAFF_BOTTOM = 86;
const HALF_SPACE = 4.5;
const TAB_TOP = 132;
const TAB_GAP = 11;

const noteY = (pitch: number) => STAFF_BOTTOM - pitch * HALF_SPACE;
const stringY = (string: number) => TAB_TOP + (string - 1) * TAB_GAP;

export default function ScoreMock({ className = "" }: { className?: string }) {
  const width = LEFT + BAR_W * BARS.length + 16;
  const activeBar = 1;
  const activeBeat = 3;

  return (
    <svg viewBox={`0 0 ${width} 214`} className={className} role="img" aria-label="Score and tablature">
      <defs>
        <linearGradient id="mock-highlight" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#d3aa63" stopOpacity="0.2" />
          <stop offset="1" stopColor="#d3aa63" stopOpacity="0.08" />
        </linearGradient>
      </defs>

      {/* Playhead: the bar being played and the beat inside it. */}
      <rect
        x={LEFT + activeBar * BAR_W + 2}
        y={24}
        width={BAR_W - 4}
        height={178}
        rx={4}
        fill="url(#mock-highlight)"
      />
      <rect
        x={LEFT + activeBar * BAR_W + 18 + activeBeat * 22 - 1}
        y={22}
        width={2}
        height={182}
        rx={1}
        fill="#9a6a2c"
      />

      {/* Staff */}
      {[0, 1, 2, 3, 4].map((line) => (
        <line
          key={`s${line}`}
          x1={16}
          x2={width - 16}
          y1={STAFF_BOTTOM - line * 9}
          y2={STAFF_BOTTOM - line * 9}
          stroke="#2b1e15"
          strokeOpacity="0.55"
          strokeWidth="0.8"
        />
      ))}
      {/* Treble clef, suggested with a glyph from the display face. */}
      <text x={20} y={STAFF_BOTTOM + 6} fontSize="52" fill="#2b1e15" fontFamily="Georgia, serif">
        𝄞
      </text>
      <text x={48} y={STAFF_BOTTOM - 20} fontSize="17" fontWeight="700" fill="#2b1e15" fontFamily="Georgia, serif">
        6
      </text>
      <text x={48} y={STAFF_BOTTOM - 3} fontSize="17" fontWeight="700" fill="#2b1e15" fontFamily="Georgia, serif">
        8
      </text>

      {/* Tab */}
      {[1, 2, 3, 4, 5, 6].map((string) => (
        <line
          key={`t${string}`}
          x1={16}
          x2={width - 16}
          y1={stringY(string)}
          y2={stringY(string)}
          stroke="#2b1e15"
          strokeOpacity="0.45"
          strokeWidth="0.8"
        />
      ))}
      {["T", "A", "B"].map((letter, i) => (
        <text
          key={letter}
          x={28}
          y={TAB_TOP + 14 + i * 17}
          fontSize="14"
          fontWeight="700"
          fill="#2b1e15"
          fontFamily="Georgia, serif"
          textAnchor="middle"
        >
          {letter}
        </text>
      ))}

      {/* Bar lines */}
      {BARS.map((_, bar) => (
        <g key={`b${bar}`}>
          <line
            x1={LEFT + (bar + 1) * BAR_W}
            x2={LEFT + (bar + 1) * BAR_W}
            y1={STAFF_BOTTOM - 36}
            y2={STAFF_BOTTOM}
            stroke="#2b1e15"
            strokeWidth="1"
          />
          <line
            x1={LEFT + (bar + 1) * BAR_W}
            x2={LEFT + (bar + 1) * BAR_W}
            y1={stringY(1)}
            y2={stringY(6)}
            stroke="#2b1e15"
            strokeWidth="1"
          />
          <text
            x={LEFT + bar * BAR_W + 6}
            y={STAFF_BOTTOM - 44}
            fontSize="9"
            fill="#2b1e15"
            fillOpacity="0.6"
            fontFamily="Georgia, serif"
          >
            {bar + 5}
          </text>
        </g>
      ))}

      {/* Notes */}
      {BARS.map((notes, bar) => {
        const xs = notes.map((_, i) => LEFT + bar * BAR_W + 18 + i * 22);
        const beamY = Math.min(...notes.map((n) => noteY(n.pitch))) - 26;
        const active = (i: number) => bar === activeBar && i === activeBeat;
        return (
          <g key={`n${bar}`}>
            {notes.map((note, i) => {
              const x = xs[i];
              const y = noteY(note.pitch);
              const color = active(i) ? "#9a5a1c" : "#2b1e15";
              // Ledger lines below the staff.
              const ledgers = [];
              for (let p = -2; p >= note.pitch; p -= 2) ledgers.push(p);
              return (
                <g key={i}>
                  {ledgers.map((p) => (
                    <line
                      key={p}
                      x1={x - 7}
                      x2={x + 7}
                      y1={noteY(p)}
                      y2={noteY(p)}
                      stroke="#2b1e15"
                      strokeWidth="0.8"
                    />
                  ))}
                  <ellipse cx={x} cy={y} rx="4.6" ry="3.4" transform={`rotate(-20 ${x} ${y})`} fill={color} />
                  <line x1={x + 4.2} x2={x + 4.2} y1={y - 1} y2={beamY} stroke={color} strokeWidth="1.1" />
                  <rect
                    x={x - 6}
                    y={stringY(note.string) - 7}
                    width="12"
                    height="13"
                    fill="#f8f1e3"
                  />
                  <text
                    x={x}
                    y={stringY(note.string) + 4}
                    fontSize="11.5"
                    fontWeight={active(i) ? 700 : 600}
                    fill={color}
                    textAnchor="middle"
                    fontFamily="ui-monospace, Menlo, monospace"
                  >
                    {note.fret}
                  </text>
                </g>
              );
            })}
            {/* Beam over each group of three eighths. */}
            {[0, 3].map((start) => (
              <line
                key={start}
                x1={xs[start] + 4.2}
                x2={xs[start + 2] + 4.2}
                y1={beamY}
                y2={beamY}
                stroke="#2b1e15"
                strokeWidth="3.4"
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
}
