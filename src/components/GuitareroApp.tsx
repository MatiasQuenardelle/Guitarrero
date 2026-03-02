"use client";

import { useState } from "react";
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
