import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  TRADES_STORAGE_KEY,
  buildTradesExport,
  loadTrades,
  parseTradesImport,
  saveTrades,
} from './tradesPersist';
import type { ProfitTrade } from '../types/trade';

const sample: ProfitTrade = {
  id: 't1',
  coinGeckoId: 'bitcoin',
  symbol: 'BTC',
  openedAt: '2025-01-01T00:00:00.000Z',
  closedAt: null,
  entryPrice: 50_000,
  exitPrice: null,
  quantity: 0.1,
  status: 'open',
  notes: '',
  position: 'long',
};

describe('tradesPersist', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('saveTrades and loadTrades round-trip envelope', () => {
    const r = saveTrades([sample]);
    expect(r.ok).toBe(true);
    const raw = localStorage.getItem(TRADES_STORAGE_KEY);
    expect(raw).toBeTruthy();
    const loaded = loadTrades();
    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.id).toBe('t1');
    expect(loaded[0]?.entryPrice).toBe(50_000);
  });

  it('loadTrades accepts legacy bare array', () => {
    localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify([sample]));
    const loaded = loadTrades();
    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.coinGeckoId).toBe('bitcoin');
  });

  it('parseTradesImport accepts envelope and bare array', () => {
    const env = { v: 1, trades: [sample] };
    const a = parseTradesImport(env);
    expect('trades' in a && a.trades.length).toBe(1);

    const b = parseTradesImport([sample]);
    expect('trades' in b && b.trades.length).toBe(1);
  });

  it('buildTradesExport includes metadata', () => {
    const s = buildTradesExport([sample]);
    const o = JSON.parse(s) as { app?: string; trades?: unknown[]; exportedAt?: string };
    expect(o.app).toBe('mw3-profit-calendar');
    expect(Array.isArray(o.trades)).toBe(true);
    expect(typeof o.exportedAt).toBe('string');
  });

  it('saveTrades returns ok false when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const r = saveTrades([sample]);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/quota/i);
  });
});
