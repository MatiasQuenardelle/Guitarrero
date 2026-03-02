"use client";

import { ChordDiagramData } from "@/lib/chord-diagrams";

interface ChordDiagramProps {
  data: ChordDiagramData;
}

export default function ChordDiagram({ data }: ChordDiagramProps) {
  const { frets, baseFret, barres } = data;

  const numFrets = 4;
  const stringSpacing = 14;
  const fretSpacing = 18;
  const topPadding = 20;
  const leftPadding = 20;
  const width = leftPadding + stringSpacing * 5 + 20;
  const height = topPadding + fretSpacing * numFrets + 20;

  const stringX = (s: number) => leftPadding + s * stringSpacing;
  const fretY = (f: number) => topPadding + f * fretSpacing;

  const isOpenChord = baseFret === 1;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="block"
    >
      {/* Nut or base fret label */}
      {isOpenChord ? (
        <line
          x1={stringX(0)}
          y1={fretY(0)}
          x2={stringX(5)}
          y2={fretY(0)}
          stroke="#a1a1aa"
          strokeWidth={3}
        />
      ) : (
        <>
          <line
            x1={stringX(0)}
            y1={fretY(0)}
            x2={stringX(5)}
            y2={fretY(0)}
            stroke="#52525b"
            strokeWidth={1}
          />
          <text
            x={leftPadding - 14}
            y={fretY(0.5)}
            textAnchor="middle"
            fontSize={10}
            fill="#a1a1aa"
            dominantBaseline="middle"
          >
            {baseFret}
          </text>
        </>
      )}

      {/* Fret lines */}
      {Array.from({ length: numFrets }, (_, i) => (
        <line
          key={`fret-${i}`}
          x1={stringX(0)}
          y1={fretY(i + 1)}
          x2={stringX(5)}
          y2={fretY(i + 1)}
          stroke="#52525b"
          strokeWidth={1}
        />
      ))}

      {/* String lines */}
      {Array.from({ length: 6 }, (_, i) => (
        <line
          key={`string-${i}`}
          x1={stringX(i)}
          y1={fretY(0)}
          x2={stringX(i)}
          y2={fretY(numFrets)}
          stroke="#52525b"
          strokeWidth={1}
        />
      ))}

      {/* Barre indicators */}
      {barres.map((barre) => {
        const barreFret = barre;
        const barreStrings = frets
          .map((f, i) => ({ fret: f, string: i }))
          .filter((s) => s.fret >= barreFret);
        if (barreStrings.length < 2) return null;
        const first = barreStrings[0].string;
        const last = barreStrings[barreStrings.length - 1].string;
        const fretPos = barreFret - baseFret + 1;
        return (
          <rect
            key={`barre-${barre}`}
            x={stringX(first) - 3}
            y={fretY(fretPos) - fretSpacing / 2 - 4}
            width={stringX(last) - stringX(first) + 6}
            height={8}
            rx={4}
            fill="#f59e0b"
            opacity={0.8}
          />
        );
      })}

      {/* Finger positions */}
      {frets.map((fret, i) => {
        if (fret <= 0) return null;
        const fretPos = fret - baseFret + 1;
        if (fretPos < 1 || fretPos > numFrets) return null;
        return (
          <circle
            key={`finger-${i}`}
            cx={stringX(i)}
            cy={fretY(fretPos) - fretSpacing / 2}
            r={5}
            fill="#f59e0b"
          />
        );
      })}

      {/* Open / muted string markers */}
      {frets.map((fret, i) => {
        if (fret === 0) {
          return (
            <circle
              key={`open-${i}`}
              cx={stringX(i)}
              cy={fretY(0) - 8}
              r={4}
              fill="none"
              stroke="#a1a1aa"
              strokeWidth={1.5}
            />
          );
        }
        if (fret === -1) {
          return (
            <text
              key={`muted-${i}`}
              x={stringX(i)}
              y={fretY(0) - 5}
              textAnchor="middle"
              fontSize={10}
              fill="#a1a1aa"
              dominantBaseline="middle"
            >
              ×
            </text>
          );
        }
        return null;
      })}
    </svg>
  );
}
