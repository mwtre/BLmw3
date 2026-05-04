import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { ProfitTrade, TradeStatus } from '../types/trade';
import {
  buildTradesExport,
  loadTrades,
  parseTradesImport,
  saveTrades,
} from '../lib/tradesPersist';
import { syncTradesOnce, type SyncStatus } from '../lib/tradesSync';
import { isAdminSession } from '../lib/adminAccess';
import { supabase, supabaseEnabled } from '../lib/supabaseClient';

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
  const allTradesRef = useRef<ProfitTrade[]>(allTrades);
  useEffect(() => {
    allTradesRef.current = allTrades;
  }, [allTrades]);
  const trades = allTrades.filter((t) => !t.deletedAt);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [authSession, setAuthSession] = useState<Session | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => {
    if (!supabaseEnabled) return 'disabled';
    return 'signed_out';
  });
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const syncInFlight = useRef(false);
  const syncWatchdog = useRef<number | null>(null);

  const persistLocal = isAdminSession(authSession?.user);

  useEffect(() => {
    if (!persistLocal) return;
    const { ok, error } = saveTrades(allTrades);
    setStorageError(ok ? null : error ?? 'Save failed');
  }, [allTrades, persistLocal]);

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

  const refreshSession = useCallback(async () => {
    if (!supabaseEnabled || !supabase) {
      setAuthSession(null);
      return;
    }
    const { data } = await supabase.auth.getSession();
    setAuthSession(data.session);
  }, []);

  useEffect(() => {
    void refreshSession();
    if (!supabaseEnabled || !supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthSession(session);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [refreshSession]);

  const syncNow = useCallback(async () => {
    if (!supabaseEnabled) return;
    const admin = isAdminSession(authSession?.user);
    if (admin && !authSession) {
      setSyncStatus('signed_out');
      setSyncError('Sign in to sync');
      setLastSyncAt(nowIso());
      return;
    }
    if (syncInFlight.current) return;
    syncInFlight.current = true;
    setSyncStatus('syncing');
    try {
      const timeoutMs = 12_000;
      const res = await Promise.race<{ status: SyncStatus; error?: string }>([
        syncTradesOnce(() => allTradesRef.current, setAllTrades),
        new Promise((resolve) =>
          globalThis.setTimeout(
            () => resolve({ status: 'error', error: `Sync timed out after ${timeoutMs / 1000}s` }),
            timeoutMs
          )
        ),
      ]);
      setSyncStatus(res.status);
      if (res.status === 'synced') setSyncError(null);
      else if (res.status === 'signed_out') setSyncError(res.error ?? 'Sign in to sync');
      else if (res.status === 'error') setSyncError(res.error ?? 'Sync failed');
      else if (res.status === 'offline') setSyncError(null);
      else setSyncError(null);
      setLastSyncAt(nowIso());
    } catch (e) {
      setSyncStatus('error');
      setSyncError(e instanceof Error ? e.message : 'Sync failed');
      setLastSyncAt(nowIso());
    } finally {
      syncInFlight.current = false;
    }
  }, [authSession]);

  useEffect(() => {
    if (syncWatchdog.current) {
      window.clearTimeout(syncWatchdog.current);
      syncWatchdog.current = null;
    }
    if (syncStatus !== 'syncing') return;
    syncWatchdog.current = window.setTimeout(() => {
      // If we're still syncing after this window, force an error that will be visible in UI.
      setSyncStatus('error');
      setSyncError('Sync stuck (no response) — check adblock/extensions or Supabase network access');
      setLastSyncAt(nowIso());
      syncInFlight.current = false;
    }, 15_000);
    return () => {
      if (syncWatchdog.current) window.clearTimeout(syncWatchdog.current);
      syncWatchdog.current = null;
    };
  }, [syncStatus]);

  useEffect(() => {
    if (!supabaseEnabled) return;
    const admin = isAdminSession(authSession?.user);
    if (admin && !authSession) {
      setSyncStatus('signed_out');
      return;
    }
    void syncNow();
    // Periodic sync for admins only (guest/public reads sync on mount + manual refresh).
    if (!admin) return;
    const intervalMs = 120_000;
    const t = window.setInterval(() => {
      if (syncInFlight.current) return;
      // If the last attempt errored, require a manual click to retry.
      if (syncError) return;
      void syncNow();
    }, intervalMs);
    return () => window.clearInterval(t);
  }, [syncNow, syncError, authSession]);

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
    authSession,
    refreshSession,
    persistLocal,
    isAdmin: persistLocal,
  };
}
