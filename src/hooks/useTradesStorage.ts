import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProfitTrade, TradeStatus } from '../types/trade';
import {
  buildTradesExport,
  loadTrades,
  parseTradesImport,
  saveTrades,
} from '../lib/tradesPersist';
import { syncTradesOnce, type SyncStatus } from '../lib/tradesSync';
import { supabaseEnabled } from '../lib/supabaseClient';

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function nowIso() {
  return new Date().toISOString();
}

export function useTradesStorage() {
  const [allTrades, setAllTrades] = useState<ProfitTrade[]>(() =>
    typeof window !== 'undefined' ? loadTrades() : []
  );
  const trades = allTrades.filter((t) => !t.deletedAt);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() =>
    supabaseEnabled ? 'syncing' : 'disabled'
  );
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const syncInFlight = useRef(false);

  useEffect(() => {
    const { ok, error } = saveTrades(allTrades);
    setStorageError(ok ? null : error ?? 'Save failed');
  }, [allTrades]);

  const clearStorageError = useCallback(() => setStorageError(null), []);

  const addTrade = useCallback((t: Omit<ProfitTrade, 'id'>) => {
    const ts = nowIso();
    setAllTrades((prev) => [
      ...prev,
      { ...t, id: uid(), updatedAt: ts, deletedAt: null },
    ]);
  }, []);

  const updateTrade = useCallback((id: string, patch: Partial<ProfitTrade>) => {
    const ts = nowIso();
    setAllTrades((prev) =>
      prev.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: ts } : x))
    );
  }, []);

  const removeTrade = useCallback((id: string) => {
    const ts = nowIso();
    setAllTrades((prev) =>
      prev.map((x) => (x.id === id ? { ...x, deletedAt: ts, updatedAt: ts } : x))
    );
  }, []);

  const closeTrade = useCallback(
    (id: string, exitPrice: number, closedAtIso?: string) => {
      const ts = nowIso();
      setAllTrades((prev) =>
        prev.map((x) => {
          if (x.id !== id) return x;
          return {
            ...x,
            status: 'closed' as TradeStatus,
            exitPrice,
            closedAt: closedAtIso ?? new Date().toISOString(),
            updatedAt: ts,
          };
        })
      );
    },
    []
  );

  const exportJson = useCallback(() => buildTradesExport(trades), [trades]);

  const importFromJson = useCallback(
    (text: string): { ok: true } | { ok: false; error: string } => {
      try {
        const parsed = JSON.parse(text) as unknown;
        const result = parseTradesImport(parsed);
        if ('error' in result) return { ok: false, error: result.error };
        const normalized = result.trades.map((t) => ({
          ...t,
          updatedAt: t.updatedAt ?? nowIso(),
          deletedAt: t.deletedAt ?? null,
        }));
        setAllTrades(normalized);
        return { ok: true };
      } catch {
        return { ok: false, error: 'Invalid JSON' };
      }
    },
    []
  );

  const syncNow = useCallback(async () => {
    if (!supabaseEnabled) return;
    if (syncInFlight.current) return;
    syncInFlight.current = true;
    setSyncStatus('syncing');
    try {
      const timeoutMs = 12_000;
      const res = await Promise.race<{ status: SyncStatus; error?: string }>([
        syncTradesOnce(allTrades, setAllTrades),
        new Promise((resolve) =>
          globalThis.setTimeout(
            () => resolve({ status: 'error', error: `Sync timed out after ${timeoutMs / 1000}s` }),
            timeoutMs
          )
        ),
      ]);
      setSyncStatus(res.status);
      setSyncError(res.status === 'error' ? res.error ?? 'Sync failed' : null);
      setLastSyncAt(nowIso());
    } catch (e) {
      setSyncStatus('error');
      setSyncError(e instanceof Error ? e.message : 'Sync failed');
      setLastSyncAt(nowIso());
    } finally {
      syncInFlight.current = false;
    }
  }, [allTrades]);

  useEffect(() => {
    if (!supabaseEnabled) return;
    void syncNow();
    // Periodic sync, but don't hammer when in persistent error state.
    const t = window.setInterval(() => {
      if (syncInFlight.current) return;
      // If the last attempt errored, require a manual click to retry.
      if (syncError) return;
      void syncNow();
    }, 30_000);
    return () => window.clearInterval(t);
  }, [syncNow, syncError]);

  return {
    trades,
    setTrades: setAllTrades,
    addTrade,
    updateTrade,
    removeTrade,
    closeTrade,
    storageError,
    clearStorageError,
    exportJson,
    importFromJson,
    syncStatus,
    syncError,
    syncNow,
    lastSyncAt,
  };
}
