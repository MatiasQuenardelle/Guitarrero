"use client";

import { Section } from "@/lib/types";
import ChordLine from "./ChordLine";
import LyricLine from "./LyricLine";
import TabLine from "./TabLine";
import { useI18n } from "@/i18n/I18nProvider";

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
  const { t } = useI18n();
  const canSplit = onSplit && section.lines.length >= 4;
  return (
    <div
      className={`panel w-fit min-w-[280px] max-w-full overflow-x-auto rounded-2xl p-5 section-card-print transition-all ${
        isDragging ? "opacity-50" : ""
      } ${isDragOver ? "!border-brass-400" : ""}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {section.title && (
        <div className="mb-3 flex items-center justify-between border-b border-brass-400/15 pb-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass-400">
            {section.title}
          </h3>
          {draggable && (
            <span
              className="cursor-grab select-none text-sand-600 transition-colors hover:text-sand-300"
              title={t.reader.drag}
            >
              ⠿
            </span>
          )}
        </div>
      )}
      <div className="space-y-0">
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
                title={t.reader.split}
              >
                <div className="absolute inset-x-0 -top-1 h-2 z-10" />
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-brass-400/0 group-hover:border-brass-400/80 transition-all" />
                <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-brass-400/0 group-hover:text-brass-400/80 group-hover:bg-walnut-850 px-1 transition-all select-none">
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
