import sidequestsData from '@/data/sidequests.json';

export interface Sidequest {
  id: number;
  title: string;
  description: string;
  query: string;
  category: string;
  difficulty: string;
  duration: string;
}

export const sidequests: Sidequest[] = sidequestsData;

export function mergeSidequestPool(dynamicSidequests: Sidequest[]): Sidequest[] {
  const staticIds = new Set(sidequests.map((sidequest) => sidequest.id));
  const uniqueDynamicSidequests = dynamicSidequests.filter((sidequest) => !staticIds.has(sidequest.id));
  return [...sidequests, ...uniqueDynamicSidequests];
}

// Seeded random number generator (mulberry32)
function seededRandom(seed: number): number {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// Generate a numeric hash from a string
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Get the current date string YYYY-MM-DD
export function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// Get the sidequest for a given user seed + date
export function getDailySidequest(
  anonymousId: string,
  dateStr?: string,
  availableSidequests: Sidequest[] = sidequests
): Sidequest {
  const date = dateStr ?? getTodayString();
  const pool = availableSidequests.length > 0 ? availableSidequests : sidequests;
  const seed = hashString(anonymousId + date);
  const index = Math.floor(seededRandom(seed) * pool.length);
  return pool[index];
}

// Category color mapping
export const categoryColors: Record<string, string> = {
  creativo: '#ff6d28',
  conexión: '#e8a87c',
  aventura: '#7cb9e8',
  mindfulness: '#b8e87c',
  conocimiento: '#e87cb8',
  arte: '#c87ce8',
  hogar: '#e8d87c',
};

export const difficultyLabels: Record<string, string> = {
  fácil: '●○○',
  media: '●●○',
  difícil: '●●●',
};
