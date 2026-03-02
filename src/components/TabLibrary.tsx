"use client";

import { useEffect, useState } from "react";
import { getSavedTabs, deleteTab, SavedTab } from "@/lib/storage";

interface TabLibraryProps {
  onLoadTab: (rawText: string) => void;
  onClose: () => void;
}

export default function TabLibrary({ onLoadTab, onClose }: TabLibraryProps) {
  const [tabs, setTabs] = useState<SavedTab[]>([]);

  useEffect(() => {
    setTabs(getSavedTabs());
  }, []);

  const handleDelete = (id: string) => {
    deleteTab(id);
    setTabs(getSavedTabs());
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-zinc-100">
          My <span className="text-amber-400">Tabs</span>
        </h2>
        <button
          onClick={onClose}
          className="px-4 py-2 border border-zinc-600 text-zinc-300 rounded-lg hover:border-amber-500 hover:text-amber-400 transition-colors text-sm"
        >
          Back
        </button>
      </div>

      {tabs.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-zinc-500 text-lg">No saved tabs yet</p>
          <p className="text-zinc-600 text-sm mt-2">
            Parse a tab and click Save to store it here
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className="border border-zinc-700 rounded-lg bg-zinc-900 p-4 flex flex-col"
            >
              <h3 className="text-zinc-100 font-semibold truncate">
                {tab.title || "Untitled"}
              </h3>
              {tab.artist && (
                <p className="text-zinc-400 text-sm truncate">{tab.artist}</p>
              )}
              <p className="text-zinc-600 text-xs mt-2">
                {new Date(tab.savedAt).toLocaleDateString()}
              </p>
              <div className="flex gap-2 mt-3 pt-3 border-t border-zinc-800">
                <button
                  onClick={() => onLoadTab(tab.rawText)}
                  className="flex-1 px-3 py-1.5 text-sm bg-amber-500 text-zinc-900 font-semibold rounded hover:bg-amber-400 transition-colors"
                >
                  Load
                </button>
                <button
                  onClick={() => handleDelete(tab.id)}
                  className="px-3 py-1.5 text-sm border border-zinc-600 text-zinc-400 rounded hover:border-red-500 hover:text-red-400 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
