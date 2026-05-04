import { describe, expect, it } from 'vitest';
import {
  coingeckoIdForTicker,
  extractOrderedPrices,
  guessTicker,
  guessTradingViewPlanFromText,
  guessTradingViewPositionToolLevels,
  parseTradingViewAnyPnlUsd,
  parseTradingViewBottomTimes,
  parseTradingViewClose,
  parseTradingViewPnlUsd,
} from './screenshotTradeOcr';

describe('screenshotTradeOcr', () => {
  it('extractOrderedPrices preserves order and skips junk', () => {
    const t = `BTC $42,350.12  some noise  41800  0.00001`;
    expect(extractOrderedPrices(t)).toEqual([42350.12, 41800, 0.00001]);
  });

  it('guessTicker finds symbol', () => {
    expect(guessTicker('long SOL / USDT')).toBe('SOL');
    expect(guessTicker('BTCUSD Bitcoin / U.S. Dollar')).toBe('BTC');
    expect(guessTicker('ETHUSDT')).toBe('ETH');
    expect(guessTicker('no symbol here')).toBeNull();
  });

  it('coingeckoIdForTicker maps known tickers', () => {
    expect(coingeckoIdForTicker('BTC')).toBe('bitcoin');
    expect(coingeckoIdForTicker('XX')).toBeNull();
  });

  it('parseTradingViewClose reads C from OHLC header', () => {
    expect(parseTradingViewClose('O79,684 H79,781 L79,592 C79,725 +41')).toBe(79725);
  });

  it('parseTradingViewPnlUsd reads closed P&L', () => {
    expect(parseTradingViewPnlUsd('Closed P&L: +$36.00')).toBe(36);
    expect(parseTradingViewPnlUsd('closed p/l -507')).toBe(-507);
  });

  it('parseTradingViewAnyPnlUsd reads open P&L too', () => {
    expect(parseTradingViewAnyPnlUsd('Open P&L: 0.0682, Qty: 21186')).toBe(0.0682);
  });

  it('guessTradingViewPlanFromText picks extremes around close', () => {
    const text = `BTCUSD O79,684 H79,781 L79,592 C79,725
83,000 82,000 81,463 79,725 79,615 79,108 77,450`;
    const g = guessTradingViewPlanFromText(text);
    expect(g?.entry).toBe(79725);
    expect(g?.stop).toBe(79108);
    expect(g?.target).toBe(81463);
  });

  it('guessTradingViewPositionToolLevels reconstructs levels from deltas', () => {
    const text = `ORCAUSDT O1.922 H1.930 L1.915 C1.917
Target: 0.843 (57.114%) 843
Stop: 0.096 (6.504%) 96
2.319 1.917 1.510 1.476 1.380 1.130`;
    const g = guessTradingViewPositionToolLevels(text);
    expect(g?.direction).toBe('long');
    // stop 1.380 + 0.096 = 1.476 (entry), entry + 0.843 = 2.319 (target)
    expect(Number(g?.stop.toFixed(3))).toBe(1.38);
    expect(Number(g?.entry.toFixed(3))).toBe(1.476);
    expect(Number(g?.target.toFixed(3))).toBe(2.319);
  });

  it('parseTradingViewBottomTimes reads last timestamp', () => {
    const t = `Thu 30 Apr '26 Fri 01 May '26 20:00`;
    const r = parseTradingViewBottomTimes(t);
    expect(r.openedAt?.getFullYear()).toBe(2026);
    expect(r.closedAt?.getHours()).toBe(20);
  });
});
