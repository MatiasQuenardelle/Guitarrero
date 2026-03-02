"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface ChordHighlightContextType {
  highlightedChord: string | null;
  setHighlightedChord: (chord: string | null) => void;
}

const ChordHighlightContext = createContext<ChordHighlightContextType>({
  highlightedChord: null,
  setHighlightedChord: () => {},
});

export function ChordHighlightProvider({ children }: { children: ReactNode }) {
  const [highlightedChord, setHighlightedChord] = useState<string | null>(null);

  return (
    <ChordHighlightContext.Provider value={{ highlightedChord, setHighlightedChord }}>
      {children}
    </ChordHighlightContext.Provider>
  );
}

export function useChordHighlight() {
  return useContext(ChordHighlightContext);
}
