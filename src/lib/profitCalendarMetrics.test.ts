import { describe, it, expect } from 'vitest';
import { monthGrid } from './calendarUtils';
import { buildMonthGridMetrics } from './profitCalendarMetrics';
import type { ProfitTrade } from '../types/trade';

describe('buildMonthGridMetrics', () => {
  it('counts opened / open / closed without scanning trades per cell', () => {
    const cursor = new Date(2026, 4, 15);
    const grid = monthGrid(cursor).flat();
    const trades: ProfitTrade[] = [
      {
        id: '1',
        coinGeckoId: 'btc-bitcoin',
        symbol: 'BTC',
        openedAt: new Date(2026, 4, 10).toISOString(),
        closedAt: null,
        entryPrice: 1,
        exitPrice: null,
        quantity: 100,
        status: 'open',
        notes: '',
        position: 'long',
      },
      {
        id: '2',
        coinGeckoId: 'btc-bitcoin',
        symbol: 'BTC',
        openedAt: new Date(2026, 4, 12).toISOString(),
        closedAt: new Date(2026, 4, 12).toISOString(),
        entryPrice: 1,
        exitPrice: 2,
        quantity: 50,
        status: 'closed',
        notes: '',
        position: 'long',
      },
    ];
    const m = buildMonthGridMetrics(trades, cursor, grid);
    const may12 = '2026-05-12';
    expect(m.get(may12)?.nOpened).toBe(1);
    expect(m.get(may12)?.nClosed).toBe(1);
    expect(m.get(may12)?.dayAgg.closed).toBe(1);
  });
});
