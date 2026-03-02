export interface SavedTab {
  id: string;
  title: string;
  artist: string;
  rawText: string;
  savedAt: number;
}

const STORAGE_KEY = "guitarrero-saved-tabs";

function isClient(): boolean {
  return typeof window !== "undefined";
}

export function getSavedTabs(): SavedTab[] {
  if (!isClient()) return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveTab(tab: Omit<SavedTab, "id" | "savedAt">): SavedTab {
  const tabs = getSavedTabs();
  const newTab: SavedTab = {
    ...tab,
    id: crypto.randomUUID(),
    savedAt: Date.now(),
  };
  tabs.unshift(newTab);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
  return newTab;
}

export function deleteTab(id: string): void {
  const tabs = getSavedTabs().filter((t) => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
}
