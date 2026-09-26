"use client";

import { useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";

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
  const { t } = useI18n();
  const [text, setText] = useState("");

  const handleParse = () => {
    if (text.trim()) onParse(text);
  };

  // Pasting into an empty box goes straight to the verses.
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData("text");
    if (pasted.trim() && !text.trim()) setTimeout(() => onParse(pasted), 0);
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-8">
        <h1 className="font-display text-5xl font-medium text-cream-50">{t.reader.title}</h1>
        <p className="mt-2 max-w-xl text-[15px] text-sand-400">{t.reader.lead}</p>
      </div>

      <div className="panel overflow-hidden rounded-2xl">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={handlePaste}
          placeholder={t.reader.placeholder}
          className="block h-[46vh] min-h-72 w-full resize-none bg-transparent p-5 font-mono text-[13px] leading-relaxed text-cream-100 placeholder:text-sand-600 focus:outline-none"
          spellCheck={false}
        />
        <div className="flex flex-wrap items-center gap-2 border-t border-brass-400/10 bg-walnut-950/50 px-4 py-3">
          <button onClick={handleParse} disabled={!text.trim()} className={buttonClass("primary", "md")}>
            {t.reader.view}
          </button>
          <button onClick={() => setText(SAMPLE_TAB)} className={buttonClass("ghost", "md")}>
            {t.reader.sample}
          </button>
          <button onClick={onOpenLibrary} className={buttonClass("secondary", "md", "ml-auto")}>
            {t.reader.saved}
          </button>
        </div>
      </div>
    </div>
  );
}
