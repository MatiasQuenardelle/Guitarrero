"use client";

import { useState } from "react";
import Link from "next/link";
import { ParsedSong } from "@/lib/types";
import { parseTab } from "@/lib/parser";
import TabInput from "./TabInput";
import TabViewer from "./TabViewer";
import TabLibrary from "./TabLibrary";

type AppView = "input" | "viewer" | "library";

export default function GuitareroApp() {
  const [view, setView] = useState<AppView>("input");
  const [song, setSong] = useState<ParsedSong | null>(null);
  const [rawText, setRawText] = useState("");

  const handleParse = (text: string) => {
    const parsed = parseTab(text);
    setSong(parsed);
    setRawText(text);
    setView("viewer");
  };

  const handleNewTab = () => {
    setSong(null);
    setRawText("");
    setView("input");
  };

  const handleOpenLibrary = () => {
    setView("library");
  };

  const handleLoadTab = (text: string) => {
    handleParse(text);
  };

  const handleCloseLibrary = () => {
    setView(song ? "viewer" : "input");
  };

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/learn"
        className="no-print fixed right-4 top-4 z-20 rounded-md border border-zinc-700 bg-zinc-950/80 px-2.5 py-1 text-xs font-medium text-zinc-300 backdrop-blur-sm transition-colors hover:border-amber-500 hover:text-amber-400"
      >
        Aprender
      </Link>
      {view === "viewer" && song ? (
        <TabViewer
          song={song}
          rawText={rawText}
          onNewTab={handleNewTab}
          onOpenLibrary={handleOpenLibrary}
        />
      ) : view === "library" ? (
        <div className="flex items-center justify-center min-h-[80vh]">
          <TabLibrary onLoadTab={handleLoadTab} onClose={handleCloseLibrary} />
        </div>
      ) : (
        <div className="flex items-center justify-center min-h-[80vh]">
          <TabInput onParse={handleParse} onOpenLibrary={handleOpenLibrary} />
        </div>
      )}
    </main>
  );
}
