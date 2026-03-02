"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getChordDiagram } from "@/lib/chord-diagrams";
import ChordDiagram from "./ChordDiagram";

interface ChordPopoverProps {
  chordName: string;
  anchorRect: DOMRect;
  onClose: () => void;
}

export default function ChordPopover({ chordName, anchorRect, onClose }: ChordPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const diagram = getChordDiagram(chordName);

  useEffect(() => {
    const popover = popoverRef.current;
    if (!popover) return;

    const popoverRect = popover.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    let top = anchorRect.bottom + 8;
    let left = anchorRect.left + anchorRect.width / 2 - popoverRect.width / 2;

    // Flip above if near bottom
    if (top + popoverRect.height > viewportHeight - 16) {
      top = anchorRect.top - popoverRect.height - 8;
    }

    // Clamp horizontal
    left = Math.max(8, Math.min(left, viewportWidth - popoverRect.width - 8));

    setPosition({ top, left });
  }, [anchorRect]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={popoverRef}
      className="fixed z-50 bg-zinc-800 border border-zinc-600 rounded-lg shadow-xl p-3"
      style={{ top: position.top, left: position.left }}
    >
      <div className="text-amber-400 font-bold text-sm mb-2">{chordName}</div>
      {diagram ? (
        <>
          <ChordDiagram data={diagram} />
          <div className="text-xs text-zinc-400 mt-2">
            {diagram.notes.filter((n) => n !== "X").join(" · ")}
          </div>
        </>
      ) : (
        <div className="text-xs text-zinc-500 py-2">Diagram not available</div>
      )}
    </div>,
    document.body
  );
}
