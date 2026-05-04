import type { ProfitTrade } from '../types/trade';
import { addDays, endOfDay, startOfDay } from './calendarUtils';
import { aggregateClosedRange } from './tradeMath';

function localYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}

function ymdToDayStart(key: string): Date {
  const [ys, ms, ds] = key.split('-').map((x) => Number(x));
  return startOfDay(new Date(ys, ms - 1, ds));
}

export type MonthDayCellMetrics = {
  nOpened: number;
  nOpen: number;
  nClosed: number;
  dayAgg: ReturnType<typeof aggregateClosedRange>;
};

/**
 * Precompute month calendar cell stats in one pass over `trades` instead of
 * O(monthCells × trades) filters + aggregateClosedRange per cell (freezes UI with large lists).
 */
export function buildMonthGridMetrics(
  trades: ProfitTrade[],
  cursor: Date,
  gridCells: (Date | null)[]
): Map<string, MonthDayCellMetrics> {
  const keys = new Set<string>();
  for (const c of gridCells) {
    if (!c) continue;
    keys.add(localYmd(c));
  }

  const monthStart = startOfDay(new Date(cursor.getFullYear(), cursor.getMonth(), 1));
  const lastDayOfMonthStart = startOfDay(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0));
  const todayStart = startOfDay(new Date());
  /** Last calendar day in this month that can show open trades (not after “today”). */
  const openTradeEndDay =
    todayStart.getTime() <= lastDayOfMonthStart.getTime() ? todayStart : lastDayOfMonthStart;

  const closedByDay = new Map<string, ProfitTrade[]>();

  const base = new Map<string, Omit<MonthDayCellMetrics, 'dayAgg'>>();
  for (const k of keys) {
    base.set(k, { nOpened: 0, nOpen: 0, nClosed: 0 });
  }

  for (const t of trades) {
    const openKey = localYmd(new Date(t.openedAt));
    const bo = base.get(openKey);
    if (bo) bo.nOpened += 1;

    if (t.status === 'closed' && t.closedAt) {
      const ck = localYmd(new Date(t.closedAt));
      if (!base.has(ck)) continue;
      const b = base.get(ck)!;
      b.nClosed += 1;
      const list = closedByDay.get(ck) ?? [];
      list.push(t);
      closedByDay.set(ck, list);
    }

    if (t.status === 'open') {
      const opened = startOfDay(new Date(t.openedAt));
      let d = opened.getTime() > monthStart.getTime() ? opened : monthStart;
      if (d.getTime() > openTradeEndDay.getTime()) continue;
      while (d.getTime() <= openTradeEndDay.getTime()) {
        const dk = localYmd(d);
        const bx = base.get(dk);
        if (bx) bx.nOpen += 1;
        d = addDays(d, 1);
      }
    }
  }

  const out = new Map<string, MonthDayCellMetrics>();
  for (const k of keys) {
    const b = base.get(k)!;
    const closedList = closedByDay.get(k) ?? [];
    const dayStart = ymdToDayStart(k);
    const dayAgg = aggregateClosedRange(closedList, dayStart, endOfDay(dayStart));
    out.set(k, {
      nOpened: b.nOpened,
      nOpen: b.nOpen,
      nClosed: b.nClosed,
      dayAgg,
    });
  }

  return out;
}
