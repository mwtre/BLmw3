import { describe, expect, it } from 'vitest';
import { aggregateClosed, realizedPnL } from './tradeMath';
import type { ProfitTrade } from '../types/trade';

const base = (over: Partial<ProfitTrade>): ProfitTrade => ({
  id: '1',
  coinGeckoId: 'bitcoin',
  symbol: 'BTC',
  openedAt: '2025-01-01',
  closedAt: null,
  entryPrice: 100,
  exitPrice: null,
  quantity: 1000,
  status: 'open',
  notes: '',
  position: 'long',
  ...over,
});

describe('realizedPnL', () => {
  it('returns null for open trades', () => {
    expect(realizedPnL(base({ status: 'open', exitPrice: null }))).toBeNull();
  });

  it('computes long P/L', () => {
    const t = base({
      status: 'closed',
      entryPrice: 100,
      exitPrice: 110,
      quantity: 1000,
      position: 'long',
    });
    expect(realizedPnL(t)).toBe(100);
  });

  it('computes short P/L', () => {
    const t = base({
      status: 'closed',
      entryPrice: 110,
      exitPrice: 100,
      quantity: 1000,
      position: 'short',
    });
    expect(realizedPnL(t)).toBe(90.9);
  });
});

describe('aggregateClosed', () => {
  it('sums wins and losses', () => {
    const trades: ProfitTrade[] = [
      base({
        id: 'a',
        status: 'closed',
        entryPrice: 10,
        exitPrice: 20,
        quantity: 100,
        position: 'long',
      }),
      base({
        id: 'b',
        status: 'closed',
        entryPrice: 100,
        exitPrice: 90,
        quantity: 100,
        position: 'long',
      }),
      base({ id: 'c', status: 'open' }),
    ];
    const r = aggregateClosed(trades);
    expect(r.total).toBe(90);
    expect(r.wins).toBe(1);
    expect(r.losses).toBe(1);
    expect(r.closed).toBe(2);
  });
});
