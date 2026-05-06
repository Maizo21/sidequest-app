'use client';

import { getTodayString } from './sidequests';

export interface DailyEntry {
  sidequestId: number;
  date: string;
  completed: boolean;
  completedAt?: string;
  comment?: string;
  imageBase64?: string;
}

export interface LocalStore {
  anonymousId: string;
  entries: DailyEntry[];
}

const STORAGE_KEY = 'sidequest_store';

function generateAnonymousId(): string {
  return 'anon_' + Math.random().toString(36).substr(2, 12) + '_' + Date.now().toString(36);
}

export function getStore(): LocalStore {
  if (typeof window === 'undefined') {
    return { anonymousId: 'ssr', entries: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const newStore: LocalStore = {
        anonymousId: generateAnonymousId(),
        entries: [],
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newStore));
      return newStore;
    }
    return JSON.parse(raw) as LocalStore;
  } catch {
    const newStore: LocalStore = { anonymousId: generateAnonymousId(), entries: [] };
    return newStore;
  }
}

export function saveStore(store: LocalStore): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getTodayEntry(): DailyEntry | null {
  const store = getStore();
  const today = getTodayString();
  return store.entries.find((e) => e.date === today) ?? null;
}

export function saveTodayEntry(entry: DailyEntry): void {
  const store = getStore();
  const today = getTodayString();
  const idx = store.entries.findIndex((e) => e.date === today);
  if (idx >= 0) {
    store.entries[idx] = entry;
  } else {
    store.entries.push(entry);
  }
  saveStore(store);
}

export function getAnonymousId(): string {
  return getStore().anonymousId;
}

export function getAllEntries(): DailyEntry[] {
  return getStore().entries;
}

export function getEntryByDate(date: string): DailyEntry | null {
  const store = getStore();
  return store.entries.find((e) => e.date === date) ?? null;
}
