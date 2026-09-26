"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
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

  const { t } = useI18n();
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
      className="panel fixed z-50 rounded-xl p-3"
      style={{ top: position.top, left: position.left }}
    >
      <div className="mb-2 font-display text-lg font-semibold text-brass-300">{chordName}</div>
      {diagram ? (
        <>
          <ChordDiagram data={diagram} />
          <div className="mt-2 font-mono text-xs text-sand-400">
            {diagram.notes.filter((n) => n !== "X").join(" · ")}
          </div>
        </>
      ) : (
        <div className="py-2 text-xs text-sand-500">{t.reader.chordMissing}</div>
      )}
    </div>,
    document.body
  );
}
