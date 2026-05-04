import type { ArtFeedItem } from '../types/artItem';

export const ART_STORAGE_KEY = 'mw3-art-feed-v1';
export const ART_SCHEMA_VERSION = 1 as const;

export interface ArtPersistEnvelope {
  v: typeof ART_SCHEMA_VERSION;
  items: ArtFeedItem[];
}

function normalizeItem(x: unknown): ArtFeedItem | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Partial<ArtFeedItem>;
  if (!o.id || !o.url || !o.type) return null;
  if (o.type !== 'youtube' && o.type !== 'tiktok' && o.type !== 'twitter') return null;
  return {
    id: String(o.id),
    type: o.type,
    url: String(o.url),
    title: o.title ? String(o.title) : undefined,
  };
}

export function loadArtItems(): ArtFeedItem[] {
  if (typeof localStorage === 'undefined') return defaultArtItems();
  try {
    const raw = localStorage.getItem(ART_STORAGE_KEY);
    if (raw === null) return defaultArtItems();
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map(normalizeItem).filter((x): x is ArtFeedItem => x !== null);
    }
    if (
      parsed &&
      typeof parsed === 'object' &&
      'items' in parsed &&
      Array.isArray((parsed as ArtPersistEnvelope).items)
    ) {
      return (parsed as ArtPersistEnvelope).items
        .map(normalizeItem)
        .filter((x): x is ArtFeedItem => x !== null);
    }
    return defaultArtItems();
  } catch {
    return defaultArtItems();
  }
}

export function defaultArtItems(): ArtFeedItem[] {
  return [
    {
      id: 'demo-yt',
      type: 'youtube',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'Demo — replace with your video',
    },
    {
      id: 'demo-x',
      type: 'twitter',
      url: 'https://twitter.com/Twitter/status/1445078200966565889',
      title: 'Demo post — swap URL',
    },
  ];
}

export function saveArtItems(items: ArtFeedItem[]): { ok: boolean; error?: string } {
  if (typeof localStorage === 'undefined') return { ok: true };
  try {
    const payload: ArtPersistEnvelope = { v: ART_SCHEMA_VERSION, items };
    localStorage.setItem(ART_STORAGE_KEY, JSON.stringify(payload));
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Could not save art feed',
    };
  }
}
