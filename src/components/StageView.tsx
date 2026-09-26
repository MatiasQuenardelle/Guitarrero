"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon, CloseIcon, MinusIcon, PlusIcon } from "@/components/ui/Icons";
import { ChordHighlightProvider } from "@/contexts/ChordHighlightContext";
import { useI18n } from "@/i18n/I18nProvider";
import type { Section } from "@/lib/types";
import SectionCard from "./SectionCard";

const GAP = 28;

/**
 * The tab on a music stand: verses flow down columns as wide as the longest line, as many
 * columns as fit on the screen, and whole screens turn like pages (arrow keys, taps).
 */
export default function StageView({
  title,
  sections,
  transposeAmount,
  initialFontSize,
  onClose,
}: {
  title: string;
  sections: Section[];
  transposeAmount: number;
  initialFontSize: number;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const shellRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(Math.max(initialFontSize, 16));
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);

  // Monospace glyphs are ~0.6em wide; add the card's padding.
  const columnWidth = useMemo(() => {
    const longest = Math.max(
      24,
      ...sections.flatMap((section) => section.lines.map((line) => line.content.length)),
    );
    return Math.ceil(longest * fontSize * 0.61) + 44;
  }, [sections, fontSize]);

  const measure = useCallback(() => {
    const el = pagesRef.current;
    if (!el) return;
    const count = Math.max(1, Math.round(el.scrollWidth / (el.clientWidth + GAP)));
    setPageCount(count);
    setPage((current) => Math.min(current, count - 1));
  }, []);

  useLayoutEffect(() => {
    measure();
  }, [measure, columnWidth, sections]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  useEffect(() => {
    const el = pagesRef.current;
    if (el) el.scrollTo({ left: page * (el.clientWidth + GAP), behavior: "smooth" });
  }, [page]);

  const turn = useCallback(
    (direction: 1 | -1) => setPage((current) => Math.min(pageCount - 1, Math.max(0, current + direction))),
    [pageCount],
  );

  // Real fullscreen where the browser allows it; on iPhone the overlay alone covers the page.
  useEffect(() => {
    const shell = shellRef.current;
    shell?.requestFullscreen?.().catch(() => {});
    const onChange = () => {
      if (!document.fullscreenElement) onClose();
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      if (document.fullscreenElement) void document.exitFullscreen();
    };
  }, [onClose]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === "PageDown" || event.code === "Space") {
        event.preventDefault();
        turn(1);
      } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        turn(-1);
      } else if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [turn, onClose]);

  return (
    <div ref={shellRef} className="wood-quiet fixed inset-0 z-50 flex flex-col">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-brass-400/10 px-4">
        <span className="min-w-0 flex-1 truncate font-display text-xl text-cream-50">{title}</span>
        <span className="hidden text-[11px] text-sand-500 md:block">{t.reader.stageHint}</span>
        <div className="flex items-center rounded-full border border-walnut-600">
          <button
            onClick={() => setFontSize((size) => Math.max(12, size - 1))}
            aria-label={`${t.reader.size} −`}
            className="flex h-8 w-8 items-center justify-center text-sand-300 hover:text-cream-50"
          >
            <MinusIcon className="h-3.5 w-3.5" />
          </button>
          <span className="w-7 text-center font-mono text-xs text-cream-100">{fontSize}</span>
          <button
            onClick={() => setFontSize((size) => Math.min(32, size + 1))}
            aria-label={`${t.reader.size} +`}
            className="flex h-8 w-8 items-center justify-center text-sand-300 hover:text-cream-50"
          >
            <PlusIcon className="h-3.5 w-3.5" />
          </button>
        </div>
        <button
          onClick={onClose}
          aria-label={t.reader.back}
          className="flex h-9 w-9 items-center justify-center rounded-full text-sand-300 hover:bg-walnut-700 hover:text-cream-50"
        >
          <CloseIcon />
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        <ChordHighlightProvider>
          <div
            ref={pagesRef}
            className="h-full overflow-hidden px-5 py-5"
            style={{
              columnWidth,
              columnGap: GAP,
              columnFill: "auto",
              "--tab-font-size": `${fontSize}px`,
            } as React.CSSProperties}
          >
            {sections.map((section, index) => (
              <div key={index} className="mb-5 inline-block w-full break-inside-avoid [&>div]:w-full">
                <SectionCard section={section} transposeAmount={transposeAmount} />
              </div>
            ))}
          </div>
        </ChordHighlightProvider>

        {/* Page turns: big quiet targets at the edges, for a foot pedal or a thumb. */}
        {page > 0 && (
          <button
            onClick={() => turn(-1)}
            aria-label="←"
            className="absolute inset-y-0 left-0 flex w-16 items-center justify-start pl-3 text-sand-500 hover:text-cream-50"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </button>
        )}
        {page < pageCount - 1 && (
          <button
            onClick={() => turn(1)}
            aria-label="→"
            className="absolute inset-y-0 right-0 flex w-16 items-center justify-end pr-3 text-sand-500 hover:text-cream-50"
          >
            <ArrowRightIcon className="h-6 w-6" />
          </button>
        )}
      </div>

      {pageCount > 1 && (
        <div className="flex h-10 shrink-0 items-center justify-center gap-2">
          {Array.from({ length: pageCount }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              aria-label={`${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === page ? "w-6 bg-brass-400" : "w-1.5 bg-walnut-500"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
