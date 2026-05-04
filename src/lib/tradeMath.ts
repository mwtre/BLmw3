import type { ProfitTrade } from '../types/trade';

/** USD realized P/L from stored entry/exit (journal math, not tax advice). */
export function realizedPnL(t: ProfitTrade): number | null {
  if (t.status !== 'closed') return null;
  if (t.realizedPnlUsd != null && Number.isFinite(t.realizedPnlUsd)) {
    return Math.round(Number(t.realizedPnlUsd) * 100) / 100;
  }
  if (t.exitPrice == null) return null;
  const pct = realizedPnLPercent(t);
  if (pct == null) return null;
  const usd = (pct / 100) * t.quantity;
  return Math.round(usd * 100) / 100;
}

/** Percent return based on entry/exit (ignores qty). */
export function realizedPnLPercent(t: ProfitTrade): number | null {
  if (t.status !== 'closed' || t.exitPrice == null) return null;
  if (!Number.isFinite(t.entryPrice) || t.entryPrice === 0) return null;
  const pct =
    t.position === 'long'
      ? ((t.exitPrice - t.entryPrice) / t.entryPrice) * 100
      : ((t.entryPrice - t.exitPrice) / t.entryPrice) * 100;
  return Math.round(pct * 100) / 100;
}

export function aggregateClosed(trades: ProfitTrade[]) {
  let total = 0;
  let wins = 0;
  let losses = 0;
  for (const t of trades) {
    if (t.status !== 'closed') continue;
    const p = realizedPnL(t);
    if (p == null) continue;
    total += p;
    if (p > 0) wins += 1;
    else if (p < 0) losses += 1;
  }
  return { total, wins, losses, closed: wins + losses };
}

export function aggregateClosedRange(
  trades: ProfitTrade[],
  start: Date,
  end: Date
): {
  pnlUsd: number;
  equityUsd: number;
  pnlPctEquityWeighted: number | null;
  pnlPctAvg: number | null;
  pnlPctSum: number;
  closed: number;
} {
  let pnlUsd = 0;
  let equityUsd = 0;
  let closed = 0;
  let pctSum = 0;
  let pctN = 0;
  const a = start.getTime();
  const b = end.getTime();
  for (const t of trades) {
    if (t.status !== 'closed') continue;
    const ts = new Date(t.closedAt ?? t.openedAt).getTime();
    if (ts < a || ts > b) continue;
    const p = realizedPnL(t);
    if (p == null) continue;
    pnlUsd += p;
    equityUsd += Number.isFinite(t.quantity) ? t.quantity : 0;
    closed += 1;
    const pct = realizedPnLPercent(t);
    if (pct != null) {
      pctSum += pct;
      pctN += 1;
    }
  }
  const pnlPctEquityWeighted =
    equityUsd > 0 ? Math.round(((pnlUsd / equityUsd) * 100) * 100) / 100 : null;
  const pnlPctAvg = pctN > 0 ? Math.round(((pctSum / pctN) * 100)) / 100 : null;
  return {
    pnlUsd: Math.round(pnlUsd * 100) / 100,
    equityUsd: Math.round(equityUsd * 100) / 100,
    pnlPctEquityWeighted,
    pnlPctAvg,
    pnlPctSum: Math.round(pctSum * 100) / 100,
    closed,
  };
}
