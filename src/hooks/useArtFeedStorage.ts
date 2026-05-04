import { useCallback, useEffect, useState } from 'react';
import type { ArtFeedItem } from '../types/artItem';
import { loadArtItems, saveArtItems } from '../lib/artPersist';

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useArtFeedStorage() {
  const [items, setItems] = useState<ArtFeedItem[]>(() => {
    if (typeof window === 'undefined') return loadArtItems();
    return loadArtItems();
  });

  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    const { ok, error } = saveArtItems(items);
    setStorageError(ok ? null : error ?? 'Save failed');
  }, [items]);

  const clearStorageError = useCallback(() => setStorageError(null), []);

  const addItem = useCallback((item: Omit<ArtFeedItem, 'id'>) => {
    setItems((prev) => [...prev, { ...item, id: uid() }]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const exportJson = useCallback(() => {
    return JSON.stringify(
      { v: 1, items, exportedAt: new Date().toISOString(), app: 'mw3-art-feed' },
      null,
      2
    );
  }, [items]);

  const importFromJson = useCallback(
    (text: string): { ok: true } | { ok: false; error: string } => {
      try {
        const parsed = JSON.parse(text) as unknown;
        if (!parsed || typeof parsed !== 'object') return { ok: false, error: 'Invalid file' };
        const o = parsed as { items?: unknown[] };
        const raw = Array.isArray(o.items) ? o.items : Array.isArray(parsed) ? parsed : null;
        if (!raw) return { ok: false, error: 'Expected items array' };
        const next: ArtFeedItem[] = [];
        for (const row of raw) {
          if (!row || typeof row !== 'object') continue;
          const x = row as Partial<ArtFeedItem>;
          if (!x.url || !x.type) continue;
          if (x.type !== 'youtube' && x.type !== 'tiktok' && x.type !== 'twitter') continue;
          next.push({
            id: x.id ? String(x.id) : uid(),
            type: x.type,
            url: String(x.url),
            title: x.title ? String(x.title) : undefined,
          });
        }
        if (next.length === 0) return { ok: false, error: 'No valid items' };
        setItems(next);
        return { ok: true };
      } catch {
        return { ok: false, error: 'Invalid JSON' };
      }
    },
    []
  );

  return {
    items,
    addItem,
    removeItem,
    storageError,
    clearStorageError,
    exportJson,
    importFromJson,
  };
}
