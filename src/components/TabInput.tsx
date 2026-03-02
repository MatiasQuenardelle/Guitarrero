"use client";

import { useState } from "react";

interface TabInputProps {
  onParse: (text: string) => void;
  onOpenLibrary: () => void;
}

const SAMPLE_TAB = `Title: Wonderwall
Artist: Oasis
Capo: 2

[Intro]
Em7  G  Dsus4  A7sus4

[Verse 1]
Em7                G
Today is gonna be the day
              Dsus4              A7sus4
That they're gonna throw it back to you
Em7               G
By now you should've somehow
             Dsus4            A7sus4
Realized what you gotta do
Em7                   G
I don't believe that anybody
Dsus4            A7sus4
Feels the way I do
         C      Dsus4    A7sus4
About you now

[Chorus]
         C              Em7       G        Em7
And all the roads we have to walk are winding
         C              Em7         G        Em7
And all the lights that lead us there are blinding
C               Em7
There are many things
        G                 Em7
That I would like to say to you
          Dsus4    A7sus4
But I don't know how

         A7sus4              Em7    G
Because maybe
                          Em7
You're gonna be the one that saves me
    G               Em7
And after all
                      Dsus4   A7sus4
You're my wonderwall

[Verse 2]
Em7                G
Today was gonna be the day
              Dsus4               A7sus4
But they'll never throw it back to you
Em7             G
By now you should've somehow
             Dsus4              A7sus4
Realized what you're not to do
Em7                   G
I don't believe that anybody
Dsus4             A7sus4
Feels the way I do
         C      Dsus4    A7sus4
About you now

[Outro]
         A7sus4              Em7    G
Because maybe
                          Em7
You're gonna be the one that saves me
    G               Em7
And after all
                      Dsus4   A7sus4
You're my wonderwall`;

export default function TabInput({ onParse, onOpenLibrary }: TabInputProps) {
  const [text, setText] = useState("");

  const handleParse = () => {
    if (text.trim()) {
      onParse(text);
    }
  };

  const handleSample = () => {
    setText(SAMPLE_TAB);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData("text");
    if (pasted.trim()) {
      setTimeout(() => onParse(pasted), 0);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="mb-6 text-center">
        <h1 className="text-4xl font-bold text-zinc-100 mb-2">
          Guitar<span className="text-amber-400">rero</span>
        </h1>
        <p className="text-zinc-400">
          Paste a guitar tab to view sections side-by-side
        </p>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onPaste={handlePaste}
        placeholder="Paste your guitar tab here..."
        className="w-full h-80 bg-zinc-900 border border-zinc-700 rounded-lg p-4 text-sm font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500 resize-none"
        spellCheck={false}
      />

      <div className="flex gap-3 mt-4 justify-center flex-wrap">
        <button
          onClick={handleParse}
          disabled={!text.trim()}
          className="px-6 py-2.5 bg-amber-500 text-zinc-900 font-semibold rounded-lg hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Parse Tab
        </button>
        <button
          onClick={handleSample}
          className="px-6 py-2.5 border border-zinc-600 text-zinc-300 rounded-lg hover:border-amber-500 hover:text-amber-400 transition-colors"
        >
          Load Sample
        </button>
        <button
          onClick={onOpenLibrary}
          className="px-6 py-2.5 border border-zinc-600 text-zinc-300 rounded-lg hover:border-amber-500 hover:text-amber-400 transition-colors"
        >
          My Tabs
        </button>
      </div>
    </div>
  );
}
