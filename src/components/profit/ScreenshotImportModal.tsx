import { useEffect, useId, useRef, useState } from 'react';
import { Image as ImageIcon, Loader2, RefreshCw, Search, X } from 'lucide-react';
import { POPULAR_COIN_IDS, searchCoins } from '../../lib/coingecko';
import {
  coingeckoIdForTicker,
  extractOrderedPrices,
  guessTicker,
  guessTradingViewPlanFromText,
  detectTradingViewClosed,
  detectTradingViewCompletedPosition,
  guessTradingViewPositionToolLevels,
  parseTradingViewBottomTimes,
  parseTradingViewClose,
  parseTradingViewAmountUsd,
  parseTradingViewAnyPnlUsd,
  parseTradingViewPnlUsd,
} from '../../lib/screenshotTradeOcr';
import { useModalA11y } from '../../hooks/useModalA11y';
import type { ProfitTrade } from '../../types/trade';

const MAX_FILE_BYTES = 8 * 1024 * 1024;

async function preprocessForOcr(file: File): Promise<HTMLCanvasElement | File> {
  try {
    const img = new Image();
    img.decoding = 'async';
    const url = URL.createObjectURL(file);
    try {
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Could not decode image'));
        img.src = url;
      });
    } finally {
      URL.revokeObjectURL(url);
    }

    const scale = 2; // small UI text needs upscale
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    // Upscale + contrast. Thresholding helps thin chart text.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.filter = 'grayscale(1) contrast(2.2)';
    ctx.drawImage(img, 0, 0, w, h);
    ctx.filter = 'none';

    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = d[i] ?? 0; // grayscale => R==G==B
      const t = v > 170 ? 255 : 0;
      d[i] = t;
      d[i + 1] = t;
      d[i + 2] = t;
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas;
  } catch {
    return file;
  }
}

interface ScreenshotImportModalProps {
  open: boolean;
  defaultAsClosed?: boolean;
  onClose: () => void;
  onConfirm: (trade: Omit<ProfitTrade, 'id'>) => void;
}

export default function ScreenshotImportModal({
  open,
  defaultAsClosed = false,
  onClose,
  onConfirm,
}: ScreenshotImportModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const descId = useId();
  useModalA11y(open, panelRef, onClose);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState('');
  const [ocrStatus, setOcrStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [priceCoinId, setPriceCoinId] = useState('bitcoin');
  const [symbolLabel, setSymbolLabel] = useState('BTC');
  const [searchQ, setSearchQ] = useState('');
  const [searchHits, setSearchHits] = useState<{ id: string; symbol: string; name: string }[]>([]);

  const [entryPrice, setEntryPrice] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [planStop, setPlanStop] = useState('');
  const [planTarget, setPlanTarget] = useState('');
  const [pnlOverride, setPnlOverride] = useState<string>('');
  const [qty, setQty] = useState('1000');
  const [position, setPosition] = useState<'long' | 'short'>('long');
  const [asClosed, setAsClosed] = useState(false);
  const [openedAt, setOpenedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [closedAt, setClosedAt] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (!open) {
      setOcrText('');
      setOcrStatus('');
      setErr(null);
      setBusy(false);
      setSearchQ('');
      setSearchHits([]);
      setEntryPrice('');
      setExitPrice('');
      setPlanStop('');
      setPlanTarget('');
      setPnlOverride('');
      setQty('1000');
      setPosition('long');
      setAsClosed(false);
      setOpenedAt(new Date().toISOString().slice(0, 10));
      setClosedAt(new Date().toISOString().slice(0, 10));
      setPriceCoinId('bitcoin');
      setSymbolLabel('BTC');
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // Set initial mode for this modal instance (plan vs past trade).
    setAsClosed(defaultAsClosed);
  }, [open, defaultAsClosed]);

  useEffect(() => {
    if (!open) return;
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
        .catch(() => {
          if (!ac.signal.aborted) setSearchHits([]);
        });
    }, 320);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [searchQ, open]);

  const resetFormDefaults = () => {
    setEntryPrice('');
    setExitPrice('');
    setPlanStop('');
    setPlanTarget('');
    setPnlOverride('');
    setQty('1000');
    setPosition('long');
    setAsClosed(false);
    setOpenedAt(new Date().toISOString().slice(0, 10));
    setClosedAt(new Date().toISOString().slice(0, 10));
    setPriceCoinId('bitcoin');
    setSymbolLabel('BTC');
  };

  const applyHintsFromText = async (text: string) => {
    const prices = extractOrderedPrices(text);
    const tick = guessTicker(text);
    const id = coingeckoIdForTicker(tick);
    if (tick) {
      setSymbolLabel(tick);
      if (id) {
        setPriceCoinId(id);
      } else {
        // Resolve ticker -> CoinGecko id via API search (best-effort).
        try {
          const hits = await searchCoins(tick);
          const exact = hits.find((h) => h.symbol.toLowerCase() === tick.toLowerCase()) ?? hits[0];
          if (exact?.id) setPriceCoinId(exact.id);
        } catch {
          // ignore
        }
      }
    }

    // TradingView Position tool: reconstruct entry/stop/target from deltas + axis prices,
    // and parse bottom time strip if present.
    const bottom = parseTradingViewBottomTimes(text);
    if (bottom.openedAt) setOpenedAt(bottom.openedAt.toISOString().slice(0, 10));
    if (bottom.closedAt) setClosedAt(bottom.closedAt.toISOString().slice(0, 10));

    const tool = guessTradingViewPositionToolLevels(text);
    if (tool) {
      setEntryPrice(String(tool.entry));
      setPlanStop(String(tool.stop));
      setPlanTarget(String(tool.target));
      setPosition(tool.direction);
      const amt = parseTradingViewAmountUsd(text);
      if (amt != null && amt > 0) setQty(String(amt));
      const pnl = defaultAsClosed ? parseTradingViewAnyPnlUsd(text) : parseTradingViewPnlUsd(text);
      if (pnl != null) setPnlOverride(String(pnl));
      const isClosed =
        defaultAsClosed || detectTradingViewClosed(text) || detectTradingViewCompletedPosition(text);
      setAsClosed(isClosed);
      if (isClosed) {
        // Best-effort exit: if visible close exists, use it; otherwise leave for user.
        const xp = parseTradingViewClose(text);
        if (xp != null) setExitPrice(String(xp));
        else if (defaultAsClosed) setExitPrice(String(tool.target));
      } else {
        setExitPrice('');
      }
      return;
    }

    // TradingView fallback: infer entry from OHLC `C` and find stop/target from nearby axis labels.
    const tv = guessTradingViewPlanFromText(text);
    if (tv) {
      setEntryPrice(String(tv.entry));
      if (tv.stop != null) setPlanStop(String(tv.stop));
      if (tv.target != null) setPlanTarget(String(tv.target));
      const pnl = defaultAsClosed ? parseTradingViewAnyPnlUsd(text) : parseTradingViewPnlUsd(text);
      if (pnl != null) setPnlOverride(String(pnl));
      const isClosed =
        defaultAsClosed || detectTradingViewClosed(text) || detectTradingViewCompletedPosition(text);
      if (isClosed) {
        setAsClosed(true);
        const xp = parseTradingViewClose(text);
        if (xp != null) setExitPrice(String(xp));
        else if (defaultAsClosed && tv.target != null) setExitPrice(String(tv.target));
        setClosedAt(new Date().toISOString().slice(0, 10));
      } else {
        // Keep trade open by default; this is a plan.
        setAsClosed(false);
        setExitPrice('');
      }
      return;
    }

    if (prices.length >= 2) {
      setEntryPrice(String(prices[0]));
      setExitPrice(String(prices[1]));
      setAsClosed(true);
    } else if (prices.length === 1) {
      setEntryPrice(String(prices[0]));
      setExitPrice('');
      setAsClosed(false);
    }
  };

  const runOcr = async (file: File) => {
    setBusy(true);
    setErr(null);
    setOcrStatus('Loading OCR…');
    setOcrText('');
    try {
      const { createWorker } = await import('tesseract.js');
      // In static hosting (GitHub Pages) bundlers can break Tesseract's default asset resolution.
      // Pin to CDN assets so worker/wasm/lang always load.
      const worker = await createWorker('eng', 1, {
        workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js',
        corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.0.0',
        langPath: 'https://tessdata.projectnaptha.com/4.0.0',
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrStatus(`Reading… ${Math.round(100 * (m.progress || 0))}%`);
          } else if (m.status) {
            setOcrStatus(m.status);
          }
        },
      });
      try {
        await worker.setParameters({
          tessedit_pageseg_mode: 6,
          tessedit_char_whitelist:
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789$%.,:+-/()& ',
        });
        setOcrStatus('Reading text…');
        const input = await preprocessForOcr(file);
        const {
          data: { text },
        } = await worker.recognize(input);
        if (!text || text.trim().length < 3) {
          setErr('OCR read no text. Try a sharper screenshot (bigger UI, higher contrast).');
        }
        setOcrText(text);
        await applyHintsFromText(text);
        setOcrStatus('');
      } finally {
        await worker.terminate();
      }
    } catch (e) {
      setErr(
        e instanceof Error
          ? `OCR failed: ${e.message}`
          : 'OCR failed. (Worker/wasm blocked or screenshot unreadable.)'
      );
      setOcrStatus('');
    } finally {
      setBusy(false);
    }
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setErr(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErr('Choose a PNG or JPEG screenshot.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setErr('Image must be under 8 MB.');
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    resetFormDefaults();
    void runOcr(file);
    e.target.value = '';
  };

  const swapEntryExit = () => {
    const a = entryPrice;
    setEntryPrice(exitPrice);
    setExitPrice(a);
  };

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    setErr(null);
    const ep = parseFloat(entryPrice);
    const q = parseFloat(qty);
    if (!Number.isFinite(ep) || !Number.isFinite(q) || q <= 0) {
      setErr('Enter a valid entry price and equity (USD).');
      return;
    }
    if (asClosed) {
      const xp = parseFloat(exitPrice);
      const pnl = pnlOverride.trim() ? parseFloat(pnlOverride) : NaN;
      if (!Number.isFinite(xp) && !Number.isFinite(pnl)) {
        setErr('For closed trades, provide an exit price or a P/L value.');
        return;
      }
      onConfirm({
        coinGeckoId: priceCoinId,
        symbol: symbolLabel,
        openedAt: new Date(openedAt).toISOString(),
        closedAt: new Date(closedAt).toISOString(),
        entryPrice: ep,
        exitPrice: Number.isFinite(xp) ? xp : null,
        realizedPnlUsd: Number.isFinite(pnl) ? pnl : null,
        quantity: q,
        status: 'closed',
        notes:
          'Imported from chart screenshot (OCR). Verify entry/exit and coin.' +
          (planStop ? ` Plan stop: ${planStop}.` : '') +
          (planTarget ? ` Plan target: ${planTarget}.` : ''),
        position,
      });
      return;
    }
    onConfirm({
      coinGeckoId: priceCoinId,
      symbol: symbolLabel,
      openedAt: new Date(openedAt).toISOString(),
      closedAt: null,
      entryPrice: ep,
      exitPrice: null,
      realizedPnlUsd: null,
      quantity: q,
      status: 'open',
      notes:
        'Imported from chart screenshot (OCR). Verify prices and coin.' +
        (planStop ? ` Plan stop: ${planStop}.` : '') +
        (planTarget ? ` Plan target: ${planTarget}.` : ''),
      position,
    });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-4 md:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border-2 border-black bg-white p-6 shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h2 id={titleId} className="font-serif text-xl font-bold">
              Import from chart screenshot
            </h2>
            <p id={descId} className="mt-2 text-sm text-gray-600">
              OCR reads visible numbers and tickers — not drawing geometry. Two prices in reading order are
              guessed as entry then exit; always confirm before saving.
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-full border border-black p-1 hover:bg-gray-100"
            aria-label="Close"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-black px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-gray-900 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
            Choose screenshot
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={onPickFile}
          />
          {ocrStatus && (
            <span className="flex items-center gap-2 text-xs text-gray-600">
              <Loader2 className="h-3 w-3 animate-spin" />
              {ocrStatus}
            </span>
          )}
        </div>

        {previewUrl && (
          <div className="mb-4 overflow-hidden rounded-lg border-2 border-black">
            <img src={previewUrl} alt="Screenshot preview" className="max-h-40 w-full object-contain bg-gray-100" />
          </div>
        )}

        {err && (
          <p className="mb-4 text-sm text-red-600" role="alert">
            {err}
          </p>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-600">CoinGecko</label>
            <select
              value={priceCoinId}
              onChange={(e) => {
                setPriceCoinId(e.target.value);
                const p = POPULAR_COIN_IDS.find((c) => c.id === e.target.value);
                if (p) setSymbolLabel(p.label);
              }}
              className="mt-1 w-full rounded border-2 border-black bg-white px-3 py-2 text-sm"
            >
              {POPULAR_COIN_IDS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <label className="block text-xs font-semibold uppercase text-gray-600">Search coin</label>
            <div className="relative mt-1 flex items-center gap-2">
              <Search className="h-4 w-4 shrink-0 text-gray-400" />
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Narrow id (e.g. arbitrum)…"
                className="w-full rounded border-2 border-black px-3 py-2 text-sm"
              />
            </div>
            {searchHits.length > 0 && (
              <ul className="absolute z-10 mt-1 max-h-36 w-full overflow-auto rounded border-2 border-black bg-white shadow-md">
                {searchHits.map((h) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      className="flex w-full px-3 py-2 text-left text-sm hover:bg-black hover:text-white"
                      onClick={() => {
                        setPriceCoinId(h.id);
                        setSymbolLabel(h.symbol.toUpperCase());
                        setSearchQ('');
                        setSearchHits([]);
                      }}
                    >
                      <span className="font-semibold uppercase">{h.symbol}</span>
                      <span className="ml-2 text-gray-600">{h.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-xs font-semibold uppercase text-gray-600">Opened (date)</span>
              <input
                type="date"
                value={openedAt}
                onChange={(e) => setOpenedAt(e.target.value)}
                className="mt-1 w-full rounded border-2 border-black px-3 py-2"
              />
            </label>
            {asClosed && (
              <label className="block text-sm">
                <span className="text-xs font-semibold uppercase text-gray-600">Closed (date)</span>
                <input
                  type="date"
                  value={closedAt}
                  onChange={(e) => setClosedAt(e.target.value)}
                  className="mt-1 w-full rounded border-2 border-black px-3 py-2"
                />
              </label>
            )}
          </div>

          <div className="flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
            <span className="font-semibold">Trade:</span>
            <button
              type="button"
              onClick={() => setAsClosed(false)}
              className={`rounded-full px-3 py-1 font-bold ${
                !asClosed ? 'bg-black text-white' : 'border border-gray-400 bg-white'
              }`}
            >
              Open
            </button>
            <button
              type="button"
              onClick={() => setAsClosed(true)}
              className={`rounded-full px-3 py-1 font-bold ${
                asClosed ? 'bg-black text-white' : 'border border-gray-400 bg-white'
              }`}
            >
              Closed
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-xs font-semibold uppercase text-gray-600">Entry (USD)</span>
              <input
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                className="mt-1 w-full rounded border-2 border-black px-3 py-2"
                inputMode="decimal"
                required
              />
            </label>
            {asClosed && (
              <label className="block text-sm">
                <span className="text-xs font-semibold uppercase text-gray-600">Exit (USD)</span>
                <input
                  value={exitPrice}
                  onChange={(e) => setExitPrice(e.target.value)}
                  className="mt-1 w-full rounded border-2 border-black px-3 py-2"
                  inputMode="decimal"
                  required={asClosed}
                />
              </label>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-xs font-semibold uppercase text-gray-600">Plan stop (USD)</span>
              <input
                value={planStop}
                onChange={(e) => setPlanStop(e.target.value)}
                className="mt-1 w-full rounded border-2 border-black px-3 py-2"
                inputMode="decimal"
                placeholder="Optional"
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs font-semibold uppercase text-gray-600">Plan target (USD)</span>
              <input
                value={planTarget}
                onChange={(e) => setPlanTarget(e.target.value)}
                className="mt-1 w-full rounded border-2 border-black px-3 py-2"
                inputMode="decimal"
                placeholder="Optional"
              />
            </label>
          </div>

          {asClosed && (
            <label className="block text-sm">
              <span className="text-xs font-semibold uppercase text-gray-600">Realized P/L (USD)</span>
              <input
                value={pnlOverride}
                onChange={(e) => setPnlOverride(e.target.value)}
                className="mt-1 w-full rounded border-2 border-black px-3 py-2"
                inputMode="decimal"
                placeholder="Optional (used if exit is missing)"
              />
            </label>
          )}

          {asClosed && (
            <button
              type="button"
              onClick={swapEntryExit}
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-700 underline"
            >
              <RefreshCw className="h-3 w-3" />
              Swap entry ↔ exit
            </button>
          )}

          <label className="block text-sm">
            <span className="text-xs font-semibold uppercase text-gray-600">Equity (USD)</span>
            <input
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="mt-1 w-full rounded border-2 border-black px-3 py-2"
              inputMode="decimal"
              required
            />
          </label>

          <div>
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

          {ocrText.length > 0 && (
            <details className="rounded border border-gray-200 bg-gray-50 p-3 text-xs">
              <summary className="cursor-pointer font-semibold text-gray-700">Raw OCR text</summary>
              <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-words text-gray-600">
                {ocrText}
              </pre>
            </details>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-full bg-black py-3 font-bold uppercase tracking-wide text-white hover:bg-gray-900 disabled:opacity-50"
            >
              Add trade
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border-2 border-black px-6 py-3 font-bold uppercase tracking-wide"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
