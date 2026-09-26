"use client";

import { useState } from "react";
import TabInput from "@/components/TabInput";
import TabLibrary from "@/components/TabLibrary";
import TabViewer from "@/components/TabViewer";
import { parseTab } from "@/lib/parser";
import { ParsedSong } from "@/lib/types";

type ReaderView = "input" | "viewer" | "library";

/** Paste a text tab, read it verse by verse; saved tabs stay in this browser. */
export default function ReaderApp() {
  const [view, setView] = useState<ReaderView>("input");
  const [song, setSong] = useState<ParsedSong | null>(null);
  const [rawText, setRawText] = useState("");
  // Each opened tab gets a fresh viewer (its splits, transposition and saved state reset).
  const [opened, setOpened] = useState(0);

  const handleParse = (text: string) => {
    setSong(parseTab(text));
    setRawText(text);
    setOpened((count) => count + 1);
    setView("viewer");
    window.scrollTo({ top: 0 });
  };

  const handleNewTab = () => {
    setSong(null);
    setRawText("");
    setView("input");
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8 lg:py-12">
      {view === "viewer" && song ? (
        <TabViewer
          key={opened}
          song={song}
          rawText={rawText}
          onNewTab={handleNewTab}
          onOpenLibrary={() => setView("library")}
        />
      ) : view === "library" ? (
        <TabLibrary onLoadTab={handleParse} onClose={() => setView(song ? "viewer" : "input")} />
      ) : (
        <TabInput onParse={handleParse} onOpenLibrary={() => setView("library")} />
      )}
    </main>
  );
}
