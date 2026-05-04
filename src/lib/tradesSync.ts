import type { ProfitTrade } from '../types/trade';
import { isAdminSession } from './adminAccess';
import { supabase, supabaseEnabled } from './supabaseClient';

export type SyncStatus = 'disabled' | 'offline' | 'syncing' | 'synced' | 'error' | 'signed_out';

const LS_LAST_PULL = 'mw3-supabase-trades-last-pull';
const LS_LAST_PUSH = 'mw3-supabase-trades-last-push';

function nowIso() {
  return new Date().toISOString();
}

function toMillis(iso: string | null | undefined): number {
  const t = iso ? new Date(iso).getTime() : 0;
  return Number.isFinite(t) ? t : 0;
}

function mergeTrades(local: ProfitTrade[], remote: ProfitTrade[]): ProfitTrade[] {
  const map = new Map<string, ProfitTrade>();
  for (const t of local) map.set(t.id, t);
  for (const r of remote) {
    const l = map.get(r.id);
    if (!l) {
      map.set(r.id, r);
      continue;
    }
    const lt = toMillis(l.updatedAt);
    const rt = toMillis(r.updatedAt);
    map.set(r.id, rt >= lt ? r : l);
  }
  return [...map.values()];
}

export async function syncTradesOnce(
  getCurrent: () => ProfitTrade[],
  setNext: (next: ProfitTrade[]) => void
): Promise<{ status: SyncStatus; error?: string }> {
  if (!supabaseEnabled || !supabase) return { status: 'disabled' };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { status: 'offline' };

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    const admin = isAdminSession(user);

    const current = getCurrent();
    const lastPull = (typeof localStorage !== 'undefined' && localStorage.getItem(LS_LAST_PULL)) || null;
    const lastPush = (typeof localStorage !== 'undefined' && localStorage.getItem(LS_LAST_PUSH)) || null;

    // 1) Pull remote changes
    let remoteRows: { id: string; payload: unknown; updated_at: string; deleted_at: string | null }[] = [];
    {
      let q = supabase
        .from('trades')
        .select('id,payload,updated_at,deleted_at')
        .order('updated_at', { ascending: true });
      if (admin) {
        if (!user) return { status: 'signed_out', error: 'Sign in to sync' };
        q = q.eq('user_id', user.id);
        const res = lastPull ? await q.gte('updated_at', lastPull) : await q;
        if (res.error) throw new Error(res.error.message);
        remoteRows = res.data ?? [];
      } else {
        // Public read: RLS allows select for everyone; viewers should see the full published ledger.
        const res = await q;
        if (res.error) throw new Error(res.error.message);
        remoteRows = res.data ?? [];
      }
    }

    const remoteTrades: ProfitTrade[] = remoteRows.map((r) => {
      const payload = (r.payload ?? {}) as Partial<ProfitTrade>;
      return {
        id: String(r.id),
        coinGeckoId: String(payload.coinGeckoId ?? ''),
        symbol: String(payload.symbol ?? '?'),
        openedAt: String(payload.openedAt ?? nowIso()),
        closedAt: (payload.closedAt as string | null) ?? null,
        entryPrice: Number(payload.entryPrice ?? 0),
        exitPrice: (payload.exitPrice as number | null) ?? null,
        realizedPnlUsd: payload.realizedPnlUsd ?? null,
        quantity: Number(payload.quantity ?? 1),
        sourceUrl: payload.sourceUrl ?? null,
        status: payload.status === 'closed' ? 'closed' : 'open',
        notes: String(payload.notes ?? ''),
        position: payload.position === 'short' ? 'short' : 'long',
        updatedAt: payload.updatedAt ?? r.updated_at,
        deletedAt: payload.deletedAt ?? r.deleted_at,
      };
    });

    // Bootstrap: remote has zero rows but local has trades. Older builds could set last_push watermarks
    // during pull-only syncs, preventing upload — reset markers so we do a full upsert once.
    if (admin) {
      const localHasRows = current.some((t) => !t.deletedAt);
      if (remoteRows.length === 0 && localHasRows && typeof localStorage !== 'undefined') {
        localStorage.removeItem(LS_LAST_PUSH);
        localStorage.removeItem(LS_LAST_PULL);
      }
    }

    const merged = admin ? mergeTrades(current, remoteTrades) : remoteTrades;
    setNext(merged);

    // bump last pull watermark
    if (admin && typeof localStorage !== 'undefined' && remoteRows.length > 0) {
      localStorage.setItem(LS_LAST_PULL, remoteRows[remoteRows.length - 1]!.updated_at);
    } else if (admin && typeof localStorage !== 'undefined' && !lastPull) {
      localStorage.setItem(LS_LAST_PULL, nowIso());
    }

    // 2) Push local changes (since last push)
    if (!admin) return { status: 'synced' };
    if (!user) return { status: 'signed_out', error: 'Sign in to sync' };

    const effectiveLastPush =
      (typeof localStorage !== 'undefined' && localStorage.getItem(LS_LAST_PUSH)) || lastPush;
    const lastPushMs = toMillis(effectiveLastPush);
    const changed = merged.filter((t) => toMillis(t.updatedAt) > lastPushMs);
    if (changed.length > 0) {
      const upserts = changed.map((t) => ({
        id: t.id,
        user_id: user.id,
        payload: t,
        updated_at: t.updatedAt ?? nowIso(),
        deleted_at: t.deletedAt ?? null,
      }));
      const res = await supabase.from('trades').upsert(upserts, { onConflict: 'id' });
      if (res.error) throw new Error(res.error.message);
      if (typeof localStorage !== 'undefined') localStorage.setItem(LS_LAST_PUSH, nowIso());
    }

    return { status: 'synced' };
  } catch (e) {
    return { status: 'error', error: e instanceof Error ? e.message : 'Sync failed' };
  }
}

