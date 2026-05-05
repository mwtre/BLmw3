import type { ProfitTrade } from '../types/trade';
import { normalizeIsoMidnightToMiddayUtc } from './profitTradeDates';

export const TRADES_STORAGE_KEY = 'mw3-profit-trades-v1';
export const TRADES_SCHEMA_VERSION = 1 as const;

export interface TradesPersistEnvelope {
  v: typeof TRADES_SCHEMA_VERSION;
  trades: ProfitTrade[];
}

export interface TradesExportFile extends TradesPersistEnvelope {
  exportedAt: string;
  app: 'mw3-profit-calendar';
}

function normalizeTrade(t: unknown): ProfitTrade | null {
  if (!t || typeof t !== 'object') return null;
  const x = t as Partial<ProfitTrade>;
  if (!x.id || !x.coinGeckoId || typeof x.entryPrice !== 'number') return null;
  const pnl =
    x.realizedPnlUsd == null || typeof x.realizedPnlUsd !== 'number'
      ? null
      : Number.isFinite(x.realizedPnlUsd)
        ? Number(x.realizedPnlUsd)
        : null;
  const updatedAt = typeof x.updatedAt === 'string' ? x.updatedAt : new Date().toISOString();
  const deletedAt =
    x.deletedAt == null ? null : typeof x.deletedAt === 'string' ? x.deletedAt : null;
  const openedAt = normalizeIsoMidnightToMiddayUtc(
    typeof x.openedAt === 'string' ? x.openedAt : null
  );
  const closedAt = normalizeIsoMidnightToMiddayUtc(
    typeof x.closedAt === 'string' ? x.closedAt : null
  );
  return {
    id: String(x.id),
    coinGeckoId: String(x.coinGeckoId),
    symbol: String(x.symbol ?? '?'),
    openedAt: openedAt ?? new Date().toISOString(),
    closedAt: closedAt,
    entryPrice: Number(x.entryPrice),
    exitPrice: x.exitPrice ?? null,
    realizedPnlUsd: pnl,
    quantity: Number.isFinite(Number(x.quantity)) ? Number(x.quantity) : 1,
    sourceUrl: x.sourceUrl ? String(x.sourceUrl) : null,
    updatedAt,
    deletedAt,
    status: x.status === 'closed' ? 'closed' : 'open',
    notes: String(x.notes ?? ''),
    position: x.position === 'short' ? 'short' : 'long',
  };
}

/** Load from localStorage; supports legacy plain array or wrapped envelope. */
export function loadTrades(): ProfitTrade[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TRADES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map(normalizeTrade).filter((x): x is ProfitTrade => x !== null);
    }
    if (
      parsed &&
      typeof parsed === 'object' &&
      'trades' in parsed &&
      Array.isArray((parsed as TradesPersistEnvelope).trades)
    ) {
      const env = parsed as TradesPersistEnvelope;
      return env.trades.map(normalizeTrade).filter((x): x is ProfitTrade => x !== null);
    }
    return [];
  } catch {
    return [];
  }
}

export function saveTrades(trades: ProfitTrade[]): { ok: boolean; error?: string } {
  if (typeof localStorage === 'undefined') return { ok: true };
  try {
    const payload: TradesPersistEnvelope = { v: TRADES_SCHEMA_VERSION, trades };
    localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(payload));
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Could not save (storage full or disabled)',
    };
  }
}

/** Validate file from import; returns trades or error message. */
export function parseTradesImport(json: unknown): { trades: ProfitTrade[] } | { error: string } {
  if (!json || typeof json !== 'object') return { error: 'Invalid file' };
  const o = json as Record<string, unknown>;
  let arr: unknown[];
  if (Array.isArray(o)) {
    arr = o;
  } else if (Array.isArray(o.trades)) {
    arr = o.trades as unknown[];
  } else {
    return { error: 'Expected { trades: [...] } or a bare array' };
  }
  const trades = arr.map(normalizeTrade).filter((x): x is ProfitTrade => x !== null);
  if (trades.length === 0 && arr.length > 0) return { error: 'No valid trades found in file' };
  return { trades };
}

export function buildTradesExport(trades: ProfitTrade[]): string {
  const out: TradesExportFile = {
    v: TRADES_SCHEMA_VERSION,
    trades,
    exportedAt: new Date().toISOString(),
    app: 'mw3-profit-calendar',
  };
  return JSON.stringify(out, null, 2);
}
