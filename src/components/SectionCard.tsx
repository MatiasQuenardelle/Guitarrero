"use client";

import { Section } from "@/lib/types";
import ChordLine from "./ChordLine";
import LyricLine from "./LyricLine";
import TabLine from "./TabLine";

interface SectionCardProps {
  section: Section;
  transposeAmount?: number;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  isDragging?: boolean;
  isDragOver?: boolean;
  onSplit?: (lineIndex: number) => void;
}

export default function SectionCard({
  section,
  transposeAmount = 0,
  draggable = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging = false,
  isDragOver = false,
  onSplit,
}: SectionCardProps) {
  const canSplit = onSplit && section.lines.length >= 4;
  return (
    <div
      className={`w-fit min-w-[280px] max-w-full border rounded-lg bg-zinc-900 p-4 section-card-print transition-all ${
        isDragging ? "opacity-50" : ""
      } ${isDragOver ? "border-amber-500" : "border-zinc-700"}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {section.title && (
        <div className="flex items-center justify-between mb-3 border-b border-zinc-700 pb-2">
          <h3 className="text-amber-500 font-semibold text-sm uppercase tracking-wide">
            {section.title}
          </h3>
          {draggable && (
            <span
              className="cursor-grab text-zinc-600 hover:text-zinc-400 transition-colors select-none"
              title="Drag to reorder"
            >
              ⠿
            </span>
          )}
        </div>
      )}
      <div className="space-y-0 max-h-[600px] overflow-y-auto">
        {section.lines.map((line, i) => {
          const lineEl = (() => {
            switch (line.type) {
              case "chord":
                return (
                  <ChordLine
                    key={`line-${i}`}
                    content={line.content}
                    transposeAmount={transposeAmount}
                  />
                );
              case "tab":
                return <TabLine key={`line-${i}`} content={line.content} />;
              case "lyric":
                return <LyricLine key={`line-${i}`} content={line.content} />;
              case "empty":
                return <div key={`line-${i}`} className="h-3" />;
              default:
                return null;
            }
          })();

          return canSplit && i > 0 ? (
            <div key={`group-${i}`}>
              <div
                className="group relative h-0 flex items-center cursor-pointer no-print"
                onClick={() => onSplit!(i)}
                title="Split section here"
              >
                <div className="absolute inset-x-0 -top-1 h-2 z-10" />
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-amber-500/0 group-hover:border-amber-500/80 transition-all" />
                <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-amber-500/0 group-hover:text-amber-500/80 bg-zinc-900 px-1 transition-all select-none">
                  ✂
                </span>
              </div>
              {lineEl}
            </div>
          ) : lineEl;
        })}
      </div>
    </div>
  );
}
