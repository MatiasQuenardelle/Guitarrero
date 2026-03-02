"use client";

import { useState } from "react";
import { tokenizeChordLine, transposeLine, normalizeChordName } from "@/lib/chords";
import { useChordHighlight } from "@/contexts/ChordHighlightContext";
import ChordPopover from "./ChordPopover";

interface ChordLineProps {
  content: string;
  transposeAmount?: number;
}

export default function ChordLine({ content, transposeAmount = 0 }: ChordLineProps) {
  const { highlightedChord, setHighlightedChord } = useChordHighlight();
  const [popover, setPopover] = useState<{ name: string; rect: DOMRect } | null>(null);

  const displayContent = transposeLine(content, transposeAmount);
  const tokens = tokenizeChordLine(displayContent);

  const handleChordClick = (name: string, e: React.MouseEvent<HTMLSpanElement>) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setPopover((prev) => (prev?.name === name ? null : { name, rect }));
  };

  return (
    <>
      <pre
        className="font-mono text-amber-400 leading-tight whitespace-pre chord-line-print"
        style={{ fontSize: "var(--tab-font-size, 14px)" }}
      >
        {tokens.map((token, i) => {
          if (token.type === "gap") {
            return <span key={i}>{token.raw}</span>;
          }
          const normalized = normalizeChordName(token.raw);
          const isHighlighted =
            highlightedChord !== null &&
            normalizeChordName(highlightedChord) === normalized;
          return (
            <span
              key={i}
              className={`cursor-pointer hover:text-amber-300 transition-colors ${
                isHighlighted ? "bg-amber-400/20 rounded px-0.5" : ""
              }`}
              onMouseEnter={() => setHighlightedChord(token.raw)}
              onMouseLeave={() => setHighlightedChord(null)}
              onClick={(e) => handleChordClick(token.raw, e)}
            >
              {token.raw}
            </span>
          );
        })}
      </pre>
      {popover && (
        <ChordPopover
          chordName={popover.name}
          anchorRect={popover.rect}
          onClose={() => setPopover(null)}
        />
      )}
    </>
  );
}
