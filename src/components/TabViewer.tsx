"use client";

import { useCallback, useEffect, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { ChordHighlightProvider } from "@/contexts/ChordHighlightContext";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { useI18n } from "@/i18n/I18nProvider";
import { saveTab } from "@/lib/storage";
import { ParsedSong, Section } from "@/lib/types";
import SectionGrid from "./SectionGrid";
import SongHeader from "./SongHeader";
import StageView from "./StageView";
import ViewerToolbar from "./ViewerToolbar";

interface TabViewerProps {
  song: ParsedSong;
  rawText: string;
  onNewTab?: () => void;
  onOpenLibrary?: () => void;
}

export default function TabViewer({ song, rawText, onNewTab, onOpenLibrary }: TabViewerProps) {
  const { t } = useI18n();
  const [fontSize, setFontSize] = useState(14);
  const [transposeAmount, setTransposeAmount] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(1.5);
  const [sections, setSections] = useState<Section[]>(song.sections);
  const [saved, setSaved] = useState(false);
  const [stage, setStage] = useState(false);

  const handleScrollStop = useCallback(() => setIsScrolling(false), []);

  useAutoScroll({ speed: scrollSpeed, isScrolling: isScrolling && !stage, onStop: handleScrollStop });

  const handleSplitSection = useCallback((sectionIndex: number, lineIndex: number) => {
    setSections((prev) => {
      const section = prev[sectionIndex];
      if (!section || lineIndex <= 0 || lineIndex >= section.lines.length) return prev;
      const first: Section = { title: section.title, lines: section.lines.slice(0, lineIndex) };
      const second: Section = {
        title: section.title ? `${section.title} (cont.)` : "(cont.)",
        lines: section.lines.slice(lineIndex),
      };
      const next = [...prev];
      next.splice(sectionIndex, 1, first, second);
      return next;
    });
  }, []);

  // Space bar toggles scroll when no input focused
  useEffect(() => {
    if (stage) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setIsScrolling((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [stage]);

  const handleSave = () => {
    if (saved) return;
    saveTab({ title: song.title, artist: song.artist, rawText });
    setSaved(true);
  };

  const closeStage = useCallback(() => setStage(false), []);

  return (
    <div className="w-full">
      {(onNewTab || onOpenLibrary) && (
        <div className="no-print mb-6 flex items-center justify-end gap-2">
          {onOpenLibrary && (
            <button onClick={onOpenLibrary} className={buttonClass("ghost", "sm")}>
              {t.reader.saved}
            </button>
          )}
          {onNewTab && (
            <button onClick={onNewTab} className={buttonClass("secondary", "sm")}>
              {t.reader.newTab}
            </button>
          )}
        </div>
      )}

      <SongHeader
        title={song.title}
        artist={song.artist}
        capo={song.capo}
        songKey={song.key}
        transposeAmount={transposeAmount}
      />

      <ViewerToolbar
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        transposeAmount={transposeAmount}
        onTransposeChange={setTransposeAmount}
        isScrolling={isScrolling}
        scrollSpeed={scrollSpeed}
        onScrollToggle={() => setIsScrolling((prev) => !prev)}
        onSpeedChange={setScrollSpeed}
        onPrint={() => window.print()}
        onSave={handleSave}
        saved={saved}
        onStage={() => {
          setIsScrolling(false);
          setStage(true);
        }}
      />

      <ChordHighlightProvider>
        <SectionGrid
          sections={sections}
          fontSize={fontSize}
          transposeAmount={transposeAmount}
          onSplitSection={handleSplitSection}
        />
      </ChordHighlightProvider>

      {stage && (
        <StageView
          title={song.title || t.reader.untitled}
          sections={sections}
          transposeAmount={transposeAmount}
          initialFontSize={fontSize}
          onClose={closeStage}
        />
      )}
    </div>
  );
}
