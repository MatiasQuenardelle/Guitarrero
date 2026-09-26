"use client";

import { useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { ArrowLeftIcon } from "@/components/ui/Icons";
import { useI18n } from "@/i18n/I18nProvider";
import { deleteTab, getSavedTabs, SavedTab } from "@/lib/storage";

interface TabLibraryProps {
  onLoadTab: (rawText: string) => void;
  onClose: () => void;
}

/** Tabs saved from the reader, kept in this browser. */
export default function TabLibrary({ onLoadTab, onClose }: TabLibraryProps) {
  const { t, locale } = useI18n();
  // Only ever rendered after a click, so localStorage is there on the first render.
  const [tabs, setTabs] = useState<SavedTab[]>(getSavedTabs);

  const handleDelete = (id: string) => {
    deleteTab(id);
    setTabs(getSavedTabs());
  };

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-8 flex items-end justify-between gap-4">
        <h1 className="font-display text-5xl font-medium text-cream-50">{t.reader.saved}</h1>
        <button onClick={onClose} className={buttonClass("secondary", "md")}>
          <ArrowLeftIcon /> {t.reader.back}
        </button>
      </div>

      {tabs.length === 0 ? (
        <div className="panel rounded-2xl px-6 py-16 text-center">
          <p className="font-display text-2xl text-cream-100">{t.reader.noSaved}</p>
          <p className="mt-2 text-sm text-sand-500">{t.reader.noSavedHint}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tabs.map((tab) => (
            <div key={tab.id} className="panel flex flex-col rounded-2xl p-5">
              <h3 className="truncate font-display text-2xl text-cream-50">{tab.title || t.reader.untitled}</h3>
              {tab.artist && <p className="truncate text-sm text-sand-400">{tab.artist}</p>}
              <p className="mt-2 font-mono text-[11px] text-sand-600">
                {new Date(tab.savedAt).toLocaleDateString(locale)}
              </p>
              <div className="mt-4 flex gap-2 border-t border-brass-400/10 pt-4">
                <button onClick={() => onLoadTab(tab.rawText)} className={buttonClass("primary", "sm", "flex-1")}>
                  {t.reader.load}
                </button>
                <button
                  onClick={() => handleDelete(tab.id)}
                  className={buttonClass("ghost", "sm", "hover:!text-rosewood-400")}
                >
                  {t.reader.delete}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
