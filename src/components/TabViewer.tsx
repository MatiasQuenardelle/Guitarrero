"use client";

import { useState, useCallback, useEffect } from "react";
import { ParsedSong, Section } from "@/lib/types";
import { saveTab } from "@/lib/storage";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { ChordHighlightProvider } from "@/contexts/ChordHighlightContext";
import SongHeader from "./SongHeader";
import SectionGrid from "./SectionGrid";
import ViewerToolbar from "./ViewerToolbar";

interface TabViewerProps {
  song: ParsedSong;
  rawText: string;
  onNewTab: () => void;
  onOpenLibrary: () => void;
}

export default function TabViewer({ song, rawText, onNewTab, onOpenLibrary }: TabViewerProps) {
  const [fontSize, setFontSize] = useState(14);
  const [transposeAmount, setTransposeAmount] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(1.5);
  const [sections, setSections] = useState<Section[]>(song.sections);

  const handleScrollStop = useCallback(() => setIsScrolling(false), []);

  useAutoScroll({ speed: scrollSpeed, isScrolling, onStop: handleScrollStop });

  // Reset sections when song changes
  useEffect(() => {
    setSections(song.sections);
  }, [song]);

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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setIsScrolling((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSave = () => {
    saveTab({ title: song.title, artist: song.artist, rawText });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full">
      <div className="no-print flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-zinc-100">
          Guitar<span className="text-amber-400">rero</span>
        </h2>
        <div className="flex gap-2">
          <button
            onClick={onOpenLibrary}
            className="px-4 py-2 border border-zinc-600 text-zinc-300 rounded-lg hover:border-amber-500 hover:text-amber-400 transition-colors text-sm"
          >
            My Tabs
          </button>
          <button
            onClick={onNewTab}
            className="px-4 py-2 border border-zinc-600 text-zinc-300 rounded-lg hover:border-amber-500 hover:text-amber-400 transition-colors text-sm"
          >
            New Tab
          </button>
        </div>
      </div>

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
        onPrint={handlePrint}
        onSave={handleSave}
      />

      <ChordHighlightProvider>
        <SectionGrid
          sections={sections}
          fontSize={fontSize}
          transposeAmount={transposeAmount}
          onSplitSection={handleSplitSection}
        />
      </ChordHighlightProvider>
    </div>
  );
}
