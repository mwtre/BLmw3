import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  LayoutGrid,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  Image as ImageIcon,
  ExternalLink,
  Link2,
  X,
} from 'lucide-react';
import {
  fetchOpenTradeUsdPrices,
  fetchSimpleUsdPrices,
  formatCoingeckoError,
  normalizeToPaprikaCoinId,
  POPULAR_COIN_IDS,
  priceLookupKey,
  searchCoins,
} from '../lib/coingecko';
import {
  addDays,
  addMonths,
  endOfDay,
  monthGrid,
  sameDay,
  startOfDay,
  weekMonday,
} from '../lib/calendarUtils';
import { buildMonthGridMetrics } from '../lib/profitCalendarMetrics';
import { aggregateClosed, aggregateClosedRange, realizedPnL, realizedPnLPercent } from '../lib/tradeMath';
import { useTradesStorage } from '../hooks/useTradesStorage';
import { supabase, supabaseEnabled } from '../lib/supabaseClient';
import CloseTradeModal from './profit/CloseTradeModal';
import ScreenshotImportModal from './profit/ScreenshotImportModal';
import TradeLinkModal from './profit/TradeLinkModal';
import ProfitAuthBar from './profit/ProfitAuthBar';
import MindMapCloseButton from './mind-map/MindMapCloseButton';
import type { ProfitTrade } from '../types/trade';
import { dateInputToStableIso } from '../lib/profitTradeDates';

type CalMode = 'day' | 'week' | 'month';

function fmtUsdCell(n: unknown): string {
  const x = typeof n === 'number' ? n : Number(n);
  return Number.isFinite(x) ? `$${x.toFixed(2)}` : '—';
}

function fmtQtyCell(n: unknown): string {
  const x = typeof n === 'number' ? n : Number(n);
  return Number.isFinite(x) ? x.toLocaleString() : '—';
}

const BUILD = (import.meta.env.VITE_APP_BUILD as string | undefined) ?? '';
const DISPLAY_TZ = 'Europe/Amsterdam';
const DISPLAY_LOCALE: string | undefined = undefined;

function parsePlanTarget(notes: string | null | undefined): number | null {
  const text = typeof notes === 'string' ? notes : '';
  const m = text.match(/plan\s+target:\s*([0-9][0-9,]*\.?[0-9]*)/i);
  if (!m?.[1]) return null;
  const n = parseFloat(m[1].replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function formatDay(d: Date) {
  return d.toLocaleDateString(DISPLAY_LOCALE, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: DISPLAY_TZ,
  });
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(DISPLAY_LOCALE, { timeZone: DISPLAY_TZ });
}

function localYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}

function fmtPct(v: number | null | undefined) {
  if (v == null || !Number.isFinite(v)) return '—';
  const sign = v > 0 ? '+' : v < 0 ? '' : '';
  return `${sign}${v.toFixed(2)}%`;
}

function pctTone(v: number | null | undefined) {
  if (v == null || !Number.isFinite(v)) return 'text-black';
  if (v > 0) return 'text-green-700';
  if (v < 0) return 'text-red-700';
  return 'text-black';
}

function KpiCard({
  title,
  headline,
  subtitle,
  rows,
}: {
  title: string;
  headline: React.ReactNode;
  subtitle?: React.ReactNode;
  rows?: { k: string; v: React.ReactNode; emphasis?: 'high' | 'low' }[];
}) {
  return (
    <div className="rounded-2xl border-2 border-black bg-white p-3 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-500">{title}</div>
        {subtitle && <div className="text-[10px] font-semibold text-gray-600">{subtitle}</div>}
      </div>
      <div className="mt-1 font-serif text-[22px] font-bold leading-tight">{headline}</div>
      {rows && rows.length > 0 && (
        <dl className="mt-2 grid grid-cols-3 gap-x-2 gap-y-1 text-[11px]">
          {rows.map((r) => (
            <div key={r.k} className="rounded-lg border border-black/10 bg-gray-50 px-2 py-1">
              <dt className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{r.k}</dt>
              <dd
                className={
                  r.emphasis === 'high'
                    ? 'font-extrabold text-black'
                    : r.emphasis === 'low'
                      ? 'font-semibold text-gray-500'
                      : 'font-bold text-black'
                }
              >
                {r.v}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function tradeOnDay(t: ProfitTrade, day: Date): boolean {
  // Compare by local calendar day keys so UTC ISO storage doesn't shift days.
  const dKey = localYmd(day);
  const oKey = localYmd(new Date(t.openedAt));
  const cKey = t.closedAt ? localYmd(new Date(t.closedAt)) : null;
  if (t.status === 'open') {
    // Show open trades from opened date through today (avoid painting all future days).
    const todayKey = localYmd(new Date());
    return dKey >= oKey && dKey <= todayKey;
  }
  if (cKey) {
    // If OCR/import produced an inverted range, fall back to showing only closed day.
    if (oKey > cKey) return dKey === cKey;
    return dKey >= oKey && dKey <= cKey;
  }
  return dKey === oKey;
}

function tradeEventOnDay(t: ProfitTrade, day: Date): boolean {
  // "Event" view: only show trades that opened or closed on this day (no spanning open positions).
  const dKey = localYmd(day);
  const oKey = localYmd(new Date(t.openedAt));
  if (t.status === 'open') return dKey === oKey;
  const cKey = t.closedAt ? localYmd(new Date(t.closedAt)) : null;
  return cKey ? dKey === cKey : dKey === oKey;
}

interface ProfitCalendarMindMapProps {
  onClose: () => void;
}

const ProfitCalendarMindMap: React.FC<ProfitCalendarMindMapProps> = ({ onClose }) => {
  const {
    trades,
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
    resetFromCloud,
    lastSyncAt,
    authSession,
    refreshSession,
    isAdmin,
  } = useTradesStorage();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [screenshotImportOpen, setScreenshotImportOpen] = useState(false);
  const [pastScreenshotImportOpen, setPastScreenshotImportOpen] = useState(false);
  const [mode, setMode] = useState<CalMode>('month');
  const [cursor, setCursor] = useState(() => new Date());
  const [priceCoinId, setPriceCoinId] = useState('btc-bitcoin');
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchHits, setSearchHits] = useState<{ id: string; symbol: string; name: string }[]>([]);
  const [searchCoinError, setSearchCoinError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formSubmitError, setFormSubmitError] = useState<string | null>(null);
  const [closeTarget, setCloseTarget] = useState<ProfitTrade | null>(null);
  const [closeExit, setCloseExit] = useState('');
  const [linkTargetId, setLinkTargetId] = useState<string | null>(null);
  const [linkValue, setLinkValue] = useState('');
  const [shareBusy, setShareBusy] = useState(false);

  const [entryPrice, setEntryPrice] = useState('1');
  const [qty, setQty] = useState('1000');
  const [position, setPosition] = useState<'long' | 'short'>('long');
  const [planTarget, setPlanTarget] = useState('');
  const [notes, setNotes] = useState('');
  const [openedAt, setOpenedAt] = useState(() => new Date().toISOString().slice(0, 10));
  /** Ticker shown in ledger — synced from popular list or search pick */
  const [symbolLabel, setSymbolLabel] = useState('BTC');
  const [priceNonce, setPriceNonce] = useState(0);

  /** Editing is always allowed here; Supabase RLS still controls who can upload. */
  const readOnly = false;
  const canEdit = true;

  useEffect(() => {
    const p = POPULAR_COIN_IDS.find((c) => c.id === priceCoinId);
    if (p) setSymbolLabel(p.label);
  }, [priceCoinId]);

  useEffect(() => {
    const ac = new AbortController();
    setPriceLoading(true);
    setPriceError(null);
    (async () => {
      try {
        const data = await fetchSimpleUsdPrices([priceCoinId], ac.signal);
        if (ac.signal.aborted) return;
        const keyRaw = priceCoinId.trim();
        const keyNorm = normalizeToPaprikaCoinId(priceCoinId);
        const p = data[keyRaw]?.usd ?? (keyNorm !== keyRaw ? data[keyNorm]?.usd : undefined);
        setLivePrice(p ?? null);
        if (p != null) setEntryPrice(String(p));
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setPriceError(formatCoingeckoError(e));
        setLivePrice(null);
      } finally {
        if (!ac.signal.aborted) setPriceLoading(false);
      }
    })();
    return () => ac.abort();
  }, [priceCoinId, priceNonce]);

  useEffect(() => {
    const ac = new AbortController();
    const t = setTimeout(() => {
      if (searchQ.trim().length < 2) {
        setSearchHits([]);
        return;
      }
      void searchCoins(searchQ, ac.signal)
        .then((hits) => {
          if (!ac.signal.aborted) setSearchHits(hits);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          setSearchHits([]);
        });
    }, 320);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [searchQ]);

  const stats = useMemo(() => aggregateClosed(trades), [trades]);

  const sortedTrades = useMemo(
    () =>
      [...trades].sort(
        (a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime()
      ),
    [trades]
  );
  const openTrades = useMemo(() => sortedTrades.filter((t) => t.status === 'open'), [sortedTrades]);
  const closedTrades = useMemo(() => sortedTrades.filter((t) => t.status === 'closed'), [sortedTrades]);

  const [openPrices, setOpenPrices] = useState<Record<string, number | null>>({});
  const [openPricesUpdatedAt, setOpenPricesUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    if (readOnly) return;
    if (openTrades.length === 0) {
      setOpenPrices({});
      setOpenPricesUpdatedAt(null);
      return;
    }
    const rows = openTrades.map((t) => ({
      tradeId: t.id,
      coinGeckoId: typeof t.coinGeckoId === 'string' ? t.coinGeckoId : '',
      symbol: typeof t.symbol === 'string' ? t.symbol : '',
    }));
    const ac = new AbortController();
    const run = async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const data = await fetchOpenTradeUsdPrices(rows, ac.signal);
        if (ac.signal.aborted) return;
        setOpenPrices(data);
        setOpenPricesUpdatedAt(new Date().toISOString());
      } catch {
        // ignore; keep last good
      }
    };
    void run();
    const tick = window.setInterval(run, 180_000);
    const onVis = () => {
      if (document.visibilityState === 'visible') void run();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      ac.abort();
      window.clearInterval(tick);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [openTrades, readOnly]);

  const rangeLabel = useMemo(() => {
    if (mode === 'month') {
      return cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    }
    if (mode === 'week') {
      const mon = weekMonday(cursor);
      const sun = addDays(mon, 6);
      return `${formatDay(mon)} — ${formatDay(sun)}`;
    }
    return formatDay(cursor);
  }, [cursor, mode]);

  const rangeStartEnd = useMemo(() => {
    const day = startOfDay(cursor);
    if (mode === 'day') return { start: day, end: endOfDay(day) };
    if (mode === 'week') {
      const mon = weekMonday(cursor);
      const sun = addDays(mon, 6);
      return { start: startOfDay(mon), end: endOfDay(sun) };
    }
    const start = startOfDay(new Date(cursor.getFullYear(), cursor.getMonth(), 1));
    const end = endOfDay(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0));
    return { start, end };
  }, [cursor, mode]);

  const rangeStats = useMemo(() => {
    const day = startOfDay(cursor);
    if (mode === 'day') {
      return aggregateClosedRange(trades, day, endOfDay(day));
    }
    if (mode === 'week') {
      const mon = weekMonday(cursor);
      const sun = addDays(mon, 6);
      return aggregateClosedRange(trades, startOfDay(mon), endOfDay(sun));
    }
    // month
    const start = startOfDay(new Date(cursor.getFullYear(), cursor.getMonth(), 1));
    const end = endOfDay(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0));
    return aggregateClosedRange(trades, start, end);
  }, [trades, cursor, mode]);

  const todayStats = useMemo(() => {
    const d = startOfDay(new Date());
    return aggregateClosedRange(trades, d, endOfDay(d));
  }, [trades]);

  const yearStats = useMemo(() => {
    const now = new Date();
    const start = startOfDay(new Date(now.getFullYear(), 0, 1));
    const end = endOfDay(new Date(now.getFullYear(), 11, 31));
    return aggregateClosedRange(trades, start, end);
  }, [trades]);

  const navigate = (dir: -1 | 1) => {
    if (mode === 'month') setCursor((d) => addMonths(d, dir));
    else if (mode === 'week') setCursor((d) => addDays(d, dir * 7));
    else setCursor((d) => addDays(d, dir));
  };

  const onSubmitTrade = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitError(null);
    const ep = parseFloat(entryPrice);
    const q = parseFloat(qty);
    if (!Number.isFinite(ep) || ep <= 0) {
      setFormSubmitError('Enter a valid entry price (USD).');
      return;
    }
    if (!Number.isFinite(q) || q <= 0) {
      setFormSubmitError('Enter a valid equity amount (USD).');
      return;
    }
    const openedIso = dateInputToStableIso(openedAt);
    if (!openedIso) {
      setFormSubmitError('Pick a valid opened date.');
      return;
    }
    const pt = planTarget.trim() ? parseFloat(planTarget) : NaN;
    const planNote = Number.isFinite(pt) ? `Plan target: ${pt}` : '';
    const mergedNotes = [notes.trim(), planNote].filter(Boolean).join(' · ');
    addTrade({
      coinGeckoId:
        typeof priceCoinId === 'string' && priceCoinId.trim() ? priceCoinId.trim() : 'btc-bitcoin',
      symbol: symbolLabel,
      openedAt: openedIso,
      closedAt: null,
      entryPrice: ep,
      exitPrice: null,
      quantity: q,
      status: 'open',
      notes: mergedNotes,
      position,
    });
    setFormSubmitError(null);
    setNotes('');
    setPlanTarget('');
    setFormOpen(false);
  };

  const submitClose = () => {
    if (!closeTarget) return;
    const x = parseFloat(closeExit);
    if (!Number.isFinite(x)) return;
    closeTrade(closeTarget.id, x);
    setCloseTarget(null);
    setCloseExit('');
  };

  const grid = useMemo(() => monthGrid(cursor), [cursor]);
  const gridFlat = useMemo(() => grid.flat(), [grid]);
  const monthMetrics = useMemo(
    () => (mode === 'month' ? buildMonthGridMetrics(trades, cursor, gridFlat) : null),
    [trades, cursor, gridFlat, mode]
  );

  const downloadBackup = () => {
    const blob = new Blob([exportJson()], { type: 'application/json' });
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = `mw3-trades-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const createShareLink = async () => {
    if (!supabaseEnabled || !supabase) {
      setImportMessage('Supabase is not enabled (missing env keys).');
      return;
    }
    if (shareBusy) return;
    setShareBusy(true);
    setImportMessage(null);
    try {
      const user = authSession?.user;
      if (!user) {
        setImportMessage('Sign in to create a share link.');
        return;
      }

      const shareId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

      const startMs = rangeStartEnd.start.getTime();
      const endMs = rangeStartEnd.end.getTime();
      const closedInRange = closedTrades.filter((t) => {
        const c = t.closedAt ? new Date(t.closedAt).getTime() : NaN;
        return Number.isFinite(c) && c >= startMs && c <= endMs;
      });

      const summary = {
        app: 'mw3-profit-calendar',
        mode,
        rangeLabel,
        rangeStart: rangeStartEnd.start.toISOString(),
        rangeEnd: rangeStartEnd.end.toISOString(),
        stats: rangeStats,
        trades: closedInRange.map((t) => ({
          id: t.id,
          symbol: t.symbol,
          openedAt: t.openedAt,
          closedAt: t.closedAt,
          entryPrice: t.entryPrice,
          exitPrice: t.exitPrice,
          quantity: t.quantity,
          position: t.position,
          realizedPnlUsd: realizedPnL(t),
          realizedPnlPct: realizedPnLPercent(t),
          sourceUrl: t.sourceUrl ?? null,
          notes: t.notes,
        })),
      };

      const ins = await supabase.from('share_snapshots').insert({
        id: shareId,
        user_id: user.id,
        range_start: rangeStartEnd.start.toISOString(),
        range_end: rangeStartEnd.end.toISOString(),
        summary,
      });
      if (ins.error) throw new Error(ins.error.message);

      const base = import.meta.env.BASE_URL ?? '/';
      const link = `${window.location.origin}${base.replace(/\/+$/, '/')}` + `share/${shareId}`;
      await navigator.clipboard?.writeText?.(link);
      setImportMessage(`Share link copied: ${link}`);
    } catch (e) {
      setImportMessage(e instanceof Error ? e.message : 'Could not create share link');
    } finally {
      setShareBusy(false);
    }
  };

  const onPickImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setImportMessage(null);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const r = importFromJson(text);
      setImportMessage(r.ok ? 'Imported successfully.' : r.error);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="min-h-screen overflow-y-auto bg-white text-black">
      <MindMapCloseButton onClose={onClose} />

      <div className="mx-auto max-w-6xl px-4 pb-16 pt-20">
        {storageError && (
          <div
            role="alert"
            className="mb-6 flex items-start justify-between gap-3 rounded-xl border-2 border-red-600 bg-red-50 p-4 text-sm text-red-900"
          >
            <p>
              <strong>Could not save to browser storage.</strong> {storageError} Export a backup below so you
              do not lose trades.
            </p>
            <button
              type="button"
              className="shrink-0 rounded-full border border-red-800 p-1 hover:bg-red-100"
              aria-label="Dismiss"
              onClick={clearStorageError}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {readOnly && (
          <div className="mb-6 rounded-xl border-2 border-black bg-gray-50 p-4 text-sm text-gray-800">
            <strong>Public view:</strong> you can browse the published Profit ledger. Only the owner account can add,
            edit, import, or sync changes.
          </div>
        )}

        <div className="sticky top-0 z-40 -mx-4 mb-6 border-b-2 border-black bg-white/95 px-4 pb-4 pt-4 backdrop-blur">
          <header className="mb-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="mb-1 text-xs tracking-[0.35em] text-gray-500">TRACKING</p>
                <h1 className="font-serif text-3xl font-bold md:text-4xl">Profit calendar</h1>
                <p className="mt-2 max-w-2xl text-sm text-gray-600">
                  Log trades with CoinPaprika spot prices (free tier). Open positions stay editable; closing
                  stores realized P/L locally for totals — data stays in your browser.
                </p>
                {BUILD && (
                  <p className="mt-1 text-[10px] font-semibold tracking-wide text-gray-400">
                    build {BUILD.slice(0, 7)}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ProfitAuthBar session={authSession} onAuthChange={() => void refreshSession()} />
                <div className="mr-1 flex items-center gap-2">
                  <div className="flex flex-col items-start gap-1">
                    <span
                      className={`rounded-full border-2 px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
                        syncStatus === 'synced'
                          ? 'border-green-700 bg-green-50 text-green-800'
                          : syncStatus === 'syncing'
                            ? 'border-black bg-white text-black'
                            : syncStatus === 'offline'
                              ? 'border-yellow-700 bg-yellow-50 text-yellow-800'
                              : syncStatus === 'error'
                                ? 'border-red-700 bg-red-50 text-red-800'
                                : syncStatus === 'signed_out'
                                  ? 'border-orange-700 bg-orange-50 text-orange-900'
                                : 'border-gray-300 bg-gray-50 text-gray-600'
                      }`}
                      title={syncError ?? undefined}
                    >
                      {syncStatus === 'disabled' ? 'Cloud off' : syncStatus}
                    </span>
                    {(syncStatus === 'error' || syncStatus === 'signed_out') && syncError && (
                      <span className="max-w-[240px] text-[10px] font-semibold leading-tight text-red-700">
                        {syncError}
                      </span>
                    )}
                    {lastSyncAt && syncStatus !== 'disabled' && (
                      <span className="text-[10px] font-semibold leading-tight text-gray-500">
                        {new Date(lastSyncAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                  {syncStatus !== 'disabled' && (
                    <button
                      type="button"
                      onClick={() => void syncNow()}
                      className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide hover:bg-black hover:text-white disabled:opacity-50"
                      disabled={
                        syncStatus === 'syncing' ||
                        (isAdmin && syncStatus === 'signed_out')
                      }
                      title={
                        readOnly
                          ? 'Refresh published trades'
                          : syncError ?? 'Sync now'
                      }
                    >
                      <RefreshCw className={`h-4 w-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                      {readOnly ? 'Refresh' : 'Sync'}
                    </button>
                  )}
                  {!readOnly && syncStatus !== 'disabled' && (
                    <button
                      type="button"
                      onClick={() => {
                        const ok = window.confirm(
                          'Reset local ledger and pull from cloud? This will overwrite your local-only changes.'
                        );
                        if (!ok) return;
                        void resetFromCloud();
                      }}
                      className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide hover:bg-black hover:text-white disabled:opacity-50"
                      disabled={syncStatus === 'syncing'}
                      title="Force localhost to match cloud data"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={downloadBackup}
                  disabled={readOnly}
                  className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide hover:bg-black hover:text-white disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  Export JSON
                </button>
                <button
                  type="button"
                  onClick={() => void createShareLink()}
                  disabled={shareBusy || syncStatus === 'disabled' || !authSession || readOnly}
                  className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide hover:bg-black hover:text-white disabled:opacity-50"
                  title={
                    syncStatus === 'disabled'
                      ? 'Enable Supabase env keys to create share links'
                      : readOnly
                        ? 'Owner only'
                      : !authSession
                        ? 'Sign in to create share links'
                      : 'Create a read-only share snapshot for the current range'
                  }
                >
                  <Link2 className="h-4 w-4" />
                  Share link
                </button>
                <button
                  type="button"
                  onClick={() => importInputRef.current?.click()}
                  disabled={readOnly}
                  className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide hover:bg-black hover:text-white disabled:opacity-50"
                >
                  <Upload className="h-4 w-4" />
                  Import
                </button>
                <button
                  type="button"
                  onClick={() => setScreenshotImportOpen(true)}
                  disabled={readOnly}
                  className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide hover:bg-black hover:text-white disabled:opacity-50"
                >
                  <ImageIcon className="h-4 w-4" />
                  Screenshot
                </button>
                <button
                  type="button"
                  onClick={() => setPastScreenshotImportOpen(true)}
                  disabled={readOnly}
                  className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide hover:bg-black hover:text-white disabled:opacity-50"
                >
                  Past trade
                </button>
              </div>
            </div>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={onPickImportFile}
            />
            {importMessage && (
              <div className="mt-2 text-xs font-semibold text-gray-700" role="status">
                {importMessage}
              </div>
            )}
          </header>

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Overall"
              headline={`$${stats.total.toFixed(2)}`}
              subtitle={`${stats.closed} closed · ${stats.wins}W / ${stats.losses}L · ${trades.length} rows`}
              rows={[
                {
                  k: 'win rate',
                  v:
                    stats.closed > 0
                      ? `${((stats.wins / stats.closed) * 100).toFixed(1)}%`
                      : '—',
                  emphasis: 'high',
                },
              ]}
            />
            <KpiCard
              title="Today"
              headline={
                <span className={pctTone(todayStats.pnlPctSum)}>
                  {fmtPct(todayStats.pnlPctSum)}
                </span>
              }
              subtitle={`${todayStats.closed} closed · $${todayStats.pnlUsd.toFixed(2)}`}
              rows={[
                { k: 'sum %', v: fmtPct(todayStats.pnlPctSum), emphasis: 'high' },
                { k: 'weighted', v: fmtPct(todayStats.pnlPctEquityWeighted) },
                { k: 'avg %', v: fmtPct(todayStats.pnlPctAvg), emphasis: 'low' },
              ]}
            />
            <KpiCard
              title={`Year ${new Date().getFullYear()}`}
              headline={
                <span className={pctTone(yearStats.pnlPctSum)}>
                  {fmtPct(yearStats.pnlPctSum)}
                </span>
              }
              subtitle={`${yearStats.closed} closed · $${yearStats.pnlUsd.toFixed(2)}`}
              rows={[
                { k: 'sum %', v: fmtPct(yearStats.pnlPctSum), emphasis: 'high' },
                { k: 'weighted', v: fmtPct(yearStats.pnlPctEquityWeighted) },
                { k: 'avg %', v: fmtPct(yearStats.pnlPctAvg), emphasis: 'low' },
              ]}
            />
            <KpiCard
              title={`In view · ${mode}`}
              headline={
                <span className={pctTone(rangeStats.pnlPctSum)}>
                  {fmtPct(rangeStats.pnlPctSum)}
                </span>
              }
              subtitle={`Range: ${rangeLabel} · ${rangeStats.closed} closed · $${rangeStats.pnlUsd.toFixed(2)}`}
              rows={[
                { k: 'sum %', v: fmtPct(rangeStats.pnlPctSum), emphasis: 'high' },
                { k: 'weighted', v: fmtPct(rangeStats.pnlPctEquityWeighted) },
                { k: 'avg %', v: fmtPct(rangeStats.pnlPctAvg), emphasis: 'low' },
              ]}
            />
          </section>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {(['day', 'week', 'month'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`rounded-full border-2 px-4 py-2 text-xs font-bold uppercase tracking-wide ${
                    mode === m
                      ? 'border-black bg-black text-white'
                      : 'border-black bg-white hover:bg-gray-100'
                  }`}
                >
                  {m === 'day' && <AlignLeft className="mr-1 inline h-4 w-4" />}
                  {m === 'week' && <LayoutGrid className="mr-1 inline h-4 w-4" />}
                  {m === 'month' && <CalendarDays className="mr-1 inline h-4 w-4" />}
                  {m}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Previous"
                onClick={() => navigate(-1)}
                className="rounded-full border-2 border-black p-2 hover:bg-black hover:text-white"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="min-w-[12rem] text-center font-serif text-lg font-semibold">
                {rangeLabel}
              </span>
              <button
                type="button"
                aria-label="Next"
                onClick={() => navigate(1)}
                className="rounded-full border-2 border-black p-2 hover:bg-black hover:text-white"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setImportMessage(null);
                setFormSubmitError(null);
                setFormOpen((v) => {
                  if (!v) {
                    if (
                      !entryPrice.trim() ||
                      !Number.isFinite(parseFloat(entryPrice)) ||
                      parseFloat(entryPrice) <= 0
                    ) {
                      if (livePrice != null) setEntryPrice(String(livePrice));
                      else setEntryPrice('1');
                    }
                  }
                  return !v;
                });
              }}
              disabled={readOnly}
              className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-black px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-gray-900 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add trade
            </button>
          </div>
        </div>

        <section className="mb-6 flex flex-col gap-4 rounded-xl border-2 border-black p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-600">CoinPaprika</span>
            <select
              value={priceCoinId}
              onChange={(e) => setPriceCoinId(e.target.value)}
              className="rounded border-2 border-black bg-white px-3 py-2 text-sm"
            >
              {!POPULAR_COIN_IDS.some((c) => c.id === priceCoinId) && priceCoinId ? (
                <option value={priceCoinId}>{symbolLabel}</option>
              ) : null}
              {POPULAR_COIN_IDS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setPriceNonce((n) => n + 1)}
              disabled={priceLoading}
              className="inline-flex items-center gap-2 rounded-full border-2 border-black px-4 py-2 text-sm font-semibold hover:bg-black hover:text-white disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${priceLoading ? 'animate-spin' : ''}`} />
              Refresh price
            </button>
            <span className="font-serif text-xl font-bold">
              {livePrice != null ? `$${livePrice.toLocaleString()}` : '—'}
            </span>
            {priceError && <span className="text-xs text-red-600">{priceError}</span>}
          </div>
          <div className="flex flex-col gap-1">
            <div className="relative flex flex-wrap items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search coin (e.g. aptos)…"
                className="min-w-[200px] flex-1 rounded border-2 border-black px-3 py-2 text-sm"
              />
              {searchHits.length > 0 && (
                <ul className="absolute left-0 top-full z-30 mt-1 max-h-48 w-full overflow-auto rounded border-2 border-black bg-white shadow-lg md:w-96">
                  {searchHits.map((h) => (
                    <li key={h.id}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-black hover:text-white"
                        onClick={() => {
                          setPriceCoinId(h.id);
                          setSymbolLabel(h.symbol.toUpperCase());
                          setSearchQ('');
                          setSearchHits([]);
                          setSearchCoinError(null);
                        }}
                      >
                        <span className="font-semibold uppercase">{h.symbol}</span>
                        <span className="text-gray-600">{h.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {searchCoinError && (
              <p className="text-xs font-semibold leading-snug text-red-700">{searchCoinError}</p>
            )}
          </div>
        </section>

        {formOpen && (
          <form
            onSubmit={onSubmitTrade}
            className="mb-8 grid gap-4 rounded-xl border-2 border-dashed border-black p-4 md:grid-cols-2"
          >
            {formSubmitError && (
              <div
                className="md:col-span-2 rounded-lg border-2 border-red-800 bg-red-50 p-3 text-sm font-semibold text-red-900"
                role="alert"
              >
                {formSubmitError}
              </div>
            )}
            <label className="block text-sm">
              <span className="text-xs font-semibold uppercase text-gray-600">Opened (local date)</span>
              <input
                type="date"
                value={openedAt}
                onChange={(e) => setOpenedAt(e.target.value)}
                className="mt-1 w-full rounded border-2 border-black px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs font-semibold uppercase text-gray-600">Entry price (USD)</span>
              <input
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                className="mt-1 w-full rounded border-2 border-black px-3 py-2"
                inputMode="decimal"
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs font-semibold uppercase text-gray-600">Target (USD)</span>
              <input
                value={planTarget}
                onChange={(e) => setPlanTarget(e.target.value)}
                className="mt-1 w-full rounded border-2 border-black px-3 py-2"
                inputMode="decimal"
                placeholder="Optional"
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs font-semibold uppercase text-gray-600">Equity (USD)</span>
              <input
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="mt-1 w-full rounded border-2 border-black px-3 py-2"
                inputMode="decimal"
              />
            </label>
            <div className="block text-sm">
              <span className="text-xs font-semibold uppercase text-gray-600">Position</span>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setPosition('long')}
                  className={`flex-1 rounded border-2 py-2 text-sm font-bold ${
                    position === 'long' ? 'border-black bg-black text-white' : 'border-black'
                  }`}
                >
                  Long
                </button>
                <button
                  type="button"
                  onClick={() => setPosition('short')}
                  className={`flex-1 rounded border-2 py-2 text-sm font-bold ${
                    position === 'short' ? 'border-black bg-black text-white' : 'border-black'
                  }`}
                >
                  Short
                </button>
              </div>
            </div>
            <label className="md:col-span-2 block text-sm">
              <span className="text-xs font-semibold uppercase text-gray-600">Notes</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded border-2 border-black px-3 py-2"
              />
            </label>
            <div className="md:col-span-2 flex flex-wrap gap-3">
              <button
                type="submit"
                className="rounded-full border-2 border-black bg-black px-6 py-2 font-bold uppercase tracking-wide text-white"
              >
                Save open trade
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormOpen(false);
                  setFormSubmitError(null);
                }}
                className="rounded-full border-2 border-black px-6 py-2 font-bold uppercase tracking-wide"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {mode === 'month' && (
          <div className="mb-10 overflow-x-auto rounded-xl border-2 border-black">
            <div className="grid grid-cols-7 bg-black text-center text-[10px] font-bold uppercase tracking-wider text-white">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                <div key={d} className="px-1 py-2">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-gray-200">
              {grid.flat().map((cell, i) => {
                if (!cell) {
                  return <div key={`pad-${i}`} className="min-h-[88px] bg-gray-50" />;
                }
                const cKey = localYmd(cell);
                const met = monthMetrics?.get(cKey);
                const nOpen = met?.nOpen ?? 0;
                const nOpened = met?.nOpened ?? 0;
                const nClosed = met?.nClosed ?? 0;
                const dayAgg = met?.dayAgg ?? {
                  pnlUsd: 0,
                  equityUsd: 0,
                  pnlPctEquityWeighted: null,
                  pnlPctAvg: null,
                  pnlPctSum: 0,
                  closed: 0,
                };
                const isToday = sameDay(cell, new Date());
                return (
                  <button
                    type="button"
                    key={cell.toISOString()}
                    onClick={() => {
                      setCursor(new Date(cell));
                      setMode('day');
                    }}
                    className={`min-h-[88px] w-full bg-white p-1 text-left text-xs hover:bg-gray-50 ${
                      isToday ? 'ring-2 ring-inset ring-black' : ''
                    }`}
                  >
                    <div className="font-bold">{cell.getDate()}</div>
                    {(nOpen + nClosed) > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {nOpened > 0 && (
                          <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-900">
                            {nOpened} opened
                          </span>
                        )}
                        {nOpen > 0 && (
                          <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                            {nOpen} open
                          </span>
                        )}
                        {nClosed > 0 && (
                          <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-900">
                            {nClosed} closed
                          </span>
                        )}
                        {dayAgg.closed > 0 && Number.isFinite(dayAgg.pnlPctSum) && (
                          <span className="inline-block rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-black border border-black">
                            {dayAgg.pnlPctSum >= 0 ? '+' : ''}
                            {dayAgg.pnlPctSum.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {mode === 'week' && (
          <div className="mb-10 grid grid-cols-1 gap-3 md:grid-cols-7">
            {Array.from({ length: 7 }).map((_, i) => {
              const mon = weekMonday(cursor);
              const day = addDays(mon, i);
              const dayTrades = trades.filter((t) => tradeOnDay(t, day));
              const agg = aggregateClosedRange(trades, startOfDay(day), endOfDay(day));
              const openedCount = trades.filter((t) => localYmd(new Date(t.openedAt)) === localYmd(day)).length;
              return (
                <div key={i} className="min-h-[140px] rounded-xl border-2 border-black p-2">
                  <div className="border-b border-gray-200 pb-1 text-xs font-bold">{formatDay(day)}</div>
                  {openedCount > 0 && (
                    <div className="mt-1 text-[10px] font-bold text-blue-900">{openedCount} opened</div>
                  )}
                  {agg.pnlPctEquityWeighted != null && agg.closed > 0 && (
                    <div className="mt-1 text-[10px] font-bold text-black">
                      {agg.pnlPctEquityWeighted >= 0 ? '+' : ''}
                      {agg.pnlPctEquityWeighted.toFixed(2)}% · ${agg.pnlUsd.toFixed(2)}
                    </div>
                  )}
                  <ul className="mt-2 space-y-1">
                    {dayTrades.map((t) => (
                      <li key={t.id} className="rounded bg-gray-100 px-1 py-0.5 text-[10px]">
                        <span className="font-semibold">{t.symbol}</span> · {t.status}
                        {t.status === 'closed' && (
                          <>
                            {(() => {
                              const pnl = realizedPnL(t);
                              const pct = realizedPnLPercent(t);
                              if (pnl == null && pct == null) return null;
                              const cls = pnl != null && pnl < 0 ? 'text-red-700' : 'text-green-700';
                              return (
                                <span className={`ml-2 font-bold ${cls}`}>
                                  {pnl != null ? `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}` : '—'}
                                  {pct != null ? ` (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%)` : ''}
                                </span>
                              );
                            })()}
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        {mode === 'day' && (
          <div className="mb-6 rounded-xl border-2 border-black p-4">
            <h3 className="mb-3 font-serif text-lg font-bold">{formatDay(cursor)}</h3>
            {(() => {
              const agg = aggregateClosedRange(trades, startOfDay(cursor), endOfDay(cursor));
              if (agg.closed === 0) return null;
              return (
                <div className="mb-3 text-sm font-semibold">
                  Day closed:{' '}
                  {agg.pnlPctEquityWeighted != null
                    ? `${agg.pnlPctEquityWeighted.toFixed(2)}%`
                    : '—'}{' '}
                  · ${agg.pnlUsd.toFixed(2)} (equity ${agg.equityUsd.toFixed(0)}) · sum{' '}
                  {Number.isFinite(agg.pnlPctSum) ? `${agg.pnlPctSum.toFixed(2)}%` : '—'}
                </div>
              );
            })()}
            <ul className="space-y-2">
              {trades.filter((t) => tradeEventOnDay(t, cursor)).length === 0 && (
                <li className="text-sm text-gray-500">No trades on this day.</li>
              )}
              {trades
                .filter((t) => tradeEventOnDay(t, cursor))
                .map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span>
                      <span className="font-semibold">{t.symbol}</span> · {t.status}
                      {t.status === 'closed' && (
                        <>
                          {(() => {
                            const pnl = realizedPnL(t);
                            const pct = realizedPnLPercent(t);
                            if (pnl == null && pct == null) return null;
                            const cls = pnl != null && pnl < 0 ? 'text-red-700' : 'text-green-700';
                            return (
                              <span className={`ml-2 font-bold ${cls}`}>
                                {pnl != null ? `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}` : '—'}
                                {pct != null ? ` (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%)` : ''}
                              </span>
                            );
                          })()}
                        </>
                      )}
                    </span>
                    <span className="text-gray-600">{t.position}</span>
                  </li>
                ))}
            </ul>
          </div>
        )}

        <section className="space-y-10">
          <div>
            <h3 className="mb-4 font-serif text-xl font-bold">Open trades ({openTrades.length})</h3>
            {openTrades.length > 0 && (
              <p className="-mt-2 mb-3 text-xs text-gray-500">
                Prices updated:{' '}
                <span className="font-medium">
                  {openPricesUpdatedAt ? formatDateTime(openPricesUpdatedAt) : '—'}
                </span>{' '}
                ({DISPLAY_TZ})
              </p>
            )}
            <div className="overflow-x-auto rounded-xl border-2 border-black">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-black text-white">
                  <tr>
                    <th scope="col" className="px-3 py-2">
                      Asset
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Opened
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Entry
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Target
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Live
                    </th>
                    <th scope="col" className="px-3 py-2">
                      P/L
                    </th>
                    <th scope="col" className="px-3 py-2">
                      P/L %
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Progress
                    </th>
                    <th scope="col" className="px-3 py-2">Equity</th>
                    <th scope="col" className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {openTrades.map((t) => {
                    const live = openPrices[priceLookupKey(t)] ?? null;
                    const target = parsePlanTarget(t.notes);
                    const ep = Number(t.entryPrice);
                    const entryOk = Number.isFinite(ep) && ep !== 0;
                    const qtyN = Number(t.quantity);
                    const qtyOk = Number.isFinite(qtyN);
                    let pct: number | null = null;
                    if (live != null && entryOk && Number.isFinite(live)) {
                      const p =
                        t.position === 'long'
                          ? ((live - ep) / ep) * 100
                          : ((ep - live) / ep) * 100;
                      pct = Number.isFinite(p) ? p : null;
                    }
                    const pnlUsd =
                      pct != null && qtyOk ? (pct / 100) * qtyN : null;
                    let progress: number | null = null;
                    if (
                      live != null &&
                      target != null &&
                      entryOk &&
                      Number.isFinite(live) &&
                      target !== ep
                    ) {
                      const raw =
                        t.position === 'long'
                          ? (live - ep) / (target - ep)
                          : (ep - live) / (ep - target);
                      progress = Number.isFinite(raw) ? raw : null;
                    }
                    const progClamped = progress == null ? null : Math.max(0, Math.min(1, progress));
                    return (
                      <tr key={t.id} className="border-t border-gray-200 odd:bg-gray-50">
                        <td className="px-3 py-2 font-semibold">
                          {t.symbol}
                          <span className="ml-2 text-xs text-gray-500">{t.position}</span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {formatDateTime(t.openedAt)}
                        </td>
                        <td className="px-3 py-2">{fmtUsdCell(t.entryPrice)}</td>
                        <td className="px-3 py-2">{target != null ? `$${target.toFixed(2)}` : '—'}</td>
                        <td className="px-3 py-2">{live != null ? `$${live.toFixed(2)}` : '—'}</td>
                        <td className="px-3 py-2 font-semibold">
                          {pnlUsd != null && Number.isFinite(pnlUsd) ? (
                            <span className={pnlUsd >= 0 ? 'text-green-700' : 'text-red-700'}>
                              {pnlUsd >= 0 ? '+' : ''}
                              {pnlUsd.toFixed(2)}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-3 py-2 font-semibold">
                          {pct != null && Number.isFinite(pct) ? (
                            <span className={pct >= 0 ? 'text-green-700' : 'text-red-700'}>
                              {pct >= 0 ? '+' : ''}
                              {pct.toFixed(2)}%
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {progClamped == null ? (
                            '—'
                          ) : (
                            <div className="flex items-center gap-2">
                              {(() => {
                                const pct = progClamped * 100;
                                const width =
                                  pct <= 0 ? 0 : pct > 0 && pct < 1 ? 1 : Math.round(pct);
                                const label = pct > 0 && pct < 1 ? '<1%' : `${Math.round(pct)}%`;
                                return (
                                  <>
                                    <div className="h-2 w-24 overflow-hidden rounded-full border border-black bg-white">
                                      <div className="h-full bg-black" style={{ width: `${width}%` }} />
                                    </div>
                                    <span className="text-xs font-bold">{label}</span>
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2">{fmtQtyCell(t.quantity)}</td>
                        <td className="px-3 py-2 text-right">
                          {t.sourceUrl && (
                            <a
                              href={t.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mr-2 inline-flex items-center rounded border border-black p-1 hover:bg-black hover:text-white"
                              aria-label="Open source link"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                          {canEdit ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setLinkTargetId(t.id);
                                  setLinkValue(t.sourceUrl ?? '');
                                }}
                                className="mr-2 inline-flex items-center rounded border border-black p-1 hover:bg-black hover:text-white"
                                aria-label="Add/edit source link"
                              >
                                <Link2 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCloseTarget(t);
                                  setCloseExit('');
                                  const cid =
                                    typeof t.coinGeckoId === 'string' && t.coinGeckoId.trim()
                                      ? t.coinGeckoId
                                      : '';
                                  if (!cid) return;
                                  fetchSimpleUsdPrices([cid])
                                    .then((data) => {
                                      const p = data[cid]?.usd;
                                      if (p != null) setCloseExit(String(p));
                                    })
                                    .catch(() => {});
                                }}
                                className="mr-2 rounded border border-black px-2 py-1 text-xs font-bold uppercase hover:bg-black hover:text-white"
                              >
                                Close
                              </button>
                              <button
                                type="button"
                                aria-label="Delete trade"
                                onClick={() => removeTrade(t.id)}
                                className="inline-flex rounded border border-red-600 p-1 text-red-600 hover:bg-red-600 hover:text-white"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <span className="text-xs font-semibold text-gray-400">View</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {openTrades.length === 0 && (
              <p className="mt-4 text-center text-sm text-gray-500">No open trades.</p>
            )}
          </div>

          <div>
            <h3 className="mb-4 font-serif text-xl font-bold">Closed trades ({closedTrades.length})</h3>
            <div className="overflow-x-auto rounded-xl border-2 border-black">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-black text-white">
                  <tr>
                    <th scope="col" className="px-3 py-2">
                      Asset
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Closed
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Entry
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Exit
                    </th>
                    <th scope="col" className="px-3 py-2">Equity</th>
                    <th scope="col" className="px-3 py-2">
                      P/L
                    </th>
                    <th scope="col" className="px-3 py-2">
                      P/L %
                    </th>
                    <th scope="col" className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {closedTrades.map((t) => {
                    const pnl = realizedPnL(t);
                    const pct = realizedPnLPercent(t);
                    return (
                      <tr key={t.id} className="border-t border-gray-200 odd:bg-gray-50">
                        <td className="px-3 py-2 font-semibold">
                          {t.symbol}
                          <span className="ml-2 text-xs text-gray-500">{t.position}</span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {t.closedAt ? formatDateTime(t.closedAt) : '—'}
                        </td>
                        <td className="px-3 py-2">{fmtUsdCell(t.entryPrice)}</td>
                        <td className="px-3 py-2">
                          {t.exitPrice != null ? fmtUsdCell(t.exitPrice) : '—'}
                        </td>
                        <td className="px-3 py-2">{fmtQtyCell(t.quantity)}</td>
                        <td className="px-3 py-2 font-semibold">
                          {pnl != null ? (
                            <span className={pnl >= 0 ? 'text-green-700' : 'text-red-700'}>
                              {pnl >= 0 ? '+' : ''}
                              {pnl.toFixed(2)}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-3 py-2 font-semibold">
                          {pct != null ? (
                            <span className={pct >= 0 ? 'text-green-700' : 'text-red-700'}>
                              {pct >= 0 ? '+' : ''}
                              {pct.toFixed(2)}%
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {t.sourceUrl && (
                            <a
                              href={t.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mr-2 inline-flex items-center rounded border border-black p-1 hover:bg-black hover:text-white"
                              aria-label="Open source link"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                          {canEdit ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setLinkTargetId(t.id);
                                  setLinkValue(t.sourceUrl ?? '');
                                }}
                                className="mr-2 inline-flex items-center rounded border border-black p-1 hover:bg-black hover:text-white"
                                aria-label="Add/edit source link"
                              >
                                <Link2 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                aria-label="Delete trade"
                                onClick={() => removeTrade(t.id)}
                                className="inline-flex rounded border border-red-600 p-1 text-red-600 hover:bg-red-600 hover:text-white"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <span className="text-xs font-semibold text-gray-400">View</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {closedTrades.length === 0 && (
              <p className="mt-4 text-center text-sm text-gray-500">No closed trades yet.</p>
            )}
          </div>
        </section>
      </div>

      <ScreenshotImportModal
        open={screenshotImportOpen}
        onClose={() => setScreenshotImportOpen(false)}
        onConfirm={(t) => {
          addTrade(t);
          setScreenshotImportOpen(false);
          setImportMessage('Trade added from screenshot — verify OCR fields.');
        }}
      />

      <ScreenshotImportModal
        open={pastScreenshotImportOpen}
        defaultAsClosed
        onClose={() => setPastScreenshotImportOpen(false)}
        onConfirm={(t) => {
          addTrade(t);
          setPastScreenshotImportOpen(false);
          setImportMessage('Past trade added — verify OCR fields.');
        }}
      />

      <CloseTradeModal
        open={closeTarget !== null}
        symbol={closeTarget?.symbol}
        exitValue={closeExit}
        onExitChange={setCloseExit}
        onConfirm={submitClose}
        onCancel={() => setCloseTarget(null)}
      />

      <TradeLinkModal
        open={linkTargetId !== null}
        symbol={trades.find((t) => t.id === linkTargetId)?.symbol}
        initialUrl={linkValue}
        onClose={() => setLinkTargetId(null)}
        onSave={(url) => {
          if (!linkTargetId) return;
          updateTrade(linkTargetId, { sourceUrl: url });
          setLinkTargetId(null);
        }}
      />
    </div>
  );
};

export default ProfitCalendarMindMap;
