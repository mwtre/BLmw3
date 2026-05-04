/**
 * Heuristics for chart screenshots: OCR returns loose text, not reliable geometry.
 * We extract ordered price-like numbers and common ticker tokens — user must confirm.
 */

const KNOWN_TICKERS = new Set([
  'BTC',
  'ETH',
  'SOL',
  'XRP',
  'DOGE',
  'ADA',
  'AVAX',
  'DOT',
  'LINK',
  'UNI',
  'ATOM',
  'LTC',
  'ARB',
  'OP',
  'APT',
  'SUI',
  'NEAR',
  'BNB',
  'MATIC',
  'POL',
  'PEPE',
  'WIF',
  'TRX',
  'SHIB',
  'TON',
  'BCH',
  'ETC',
]);

/** Map uppercase ticker hint → CoinPaprika coin id when unambiguous. */
export const TICKER_TO_COINGECKO: Record<string, string> = {
  BTC: 'btc-bitcoin',
  ETH: 'eth-ethereum',
  SOL: 'sol-solana',
  XRP: 'xrp-xrp',
  DOGE: 'doge-dogecoin',
  ADA: 'ada-cardano',
  AVAX: 'avax-avalanche',
  DOT: 'dot-polkadot',
  LINK: 'link-chainlink',
  UNI: 'uni-uniswap',
  ATOM: 'atom-cosmos',
  LTC: 'ltc-litecoin',
  ARB: 'arb-arbitrum',
  OP: 'op-optimism',
  APT: 'apt-aptos',
  SUI: 'sui-sui',
  NEAR: 'near-near-protocol',
  BNB: 'bnb-binance-coin',
  MATIC: 'matic-polygon',
  POL: 'pol-polygon-ecosystem-token',
  TRX: 'trx-tron',
  SHIB: 'shib-shiba',
  TON: 'ton-the-open-network',
  BCH: 'bch-bitcoin-cash',
  ETC: 'etc-ethereum-classic',
  PEPE: 'pepe-pepe',
  WIF: 'wif-dogwifhat',
};

/** Comma-thousands must include `,###` so we do not match `418` inside `41800`. */
const PRICE_RE =
  /\$?\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+\.\d+|\d+)/g;

function sanePrice(n: number): boolean {
  return Number.isFinite(n) && n >= 0.000_001 && n <= 1e11;
}

/** Prices in order of first appearance in OCR text (crude proxy for left→right on chart). */
export function extractOrderedPrices(text: string): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  let m: RegExpExecArray | null;
  const s = text.replace(/\u00a0/g, ' ');
  PRICE_RE.lastIndex = 0;
  while ((m = PRICE_RE.exec(s)) !== null) {
    const raw = m[1].replace(/,/g, '');
    const n = parseFloat(raw);
    if (!sanePrice(n)) continue;
    const key = Math.round(n * 1e8) / 1e8;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
  }
  return out;
}

/** First known ticker token found in text (uppercase words). */
export function guessTicker(text: string): string | null {
  const upper = text.toUpperCase();
  // TradingView-style pairs often show as BTCUSD / ETHUSDT / SOLUSDC.
  // Prefer the base ticker so we can look it up on CoinPaprika.
  const pair = upper.match(/\b([A-Z]{2,10})(USD|USDT|USDC|PERP)\b/);
  if (pair?.[1]) return pair[1];
  for (const t of KNOWN_TICKERS) {
    const re = new RegExp(`\\b${t}\\b`);
    if (re.test(upper)) return t;
  }
  return null;
}

export function coingeckoIdForTicker(ticker: string | null): string | null {
  if (!ticker) return null;
  return TICKER_TO_COINGECKO[ticker] ?? null;
}

function parseNumberToken(token: string): number | null {
  const raw = token.replace(/,/g, '').trim();
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

/** TradingView header often contains OHLC like `O79,684 H79,781 L79,592 C79,725`. */
export function parseTradingViewClose(text: string): number | null {
  const m = text.match(/\bC\s*([0-9][0-9,]*\.?[0-9]*)/i);
  if (!m?.[1]) return null;
  const n = parseNumberToken(m[1]);
  if (n == null) return null;
  return n;
}

export function parseTradingViewPnlUsd(text: string): number | null {
  // Examples: "Closed P&L: 36", "Closed P&L: +$36.00", "Closed P/L -507"
  const pl = 'p\\s*(?:&|/)\\s*l';
  const m =
    text.match(new RegExp(`closed\\s+${pl}\\s*:??\\s*([+\\-]?\\s*\\$?\\s*[0-9][0-9,]*\\.?[0-9]*)`, 'i')) ??
    text.match(new RegExp(`${pl}\\s*:??\\s*([+\\-]?\\s*\\$?\\s*[0-9][0-9,]*\\.?[0-9]*)`, 'i'));
  if (!m?.[1]) return null;
  const n = parseNumberToken(m[1].replace(/\$/g, ''));
  if (n == null) return null;
  return n;
}

/** Reads either Open or Closed P&L numeric value (TradingView position tool). */
export function parseTradingViewAnyPnlUsd(text: string): number | null {
  const pl = 'p\\s*(?:&|/)\\s*l';
  const m =
    text.match(new RegExp(`(?:open|closed)\\s+${pl}\\s*:??\\s*([+\\-]?\\s*\\$?\\s*[0-9][0-9,]*\\.?[0-9]*)`, 'i')) ??
    text.match(new RegExp(`${pl}\\s*:??\\s*([+\\-]?\\s*\\$?\\s*[0-9][0-9,]*\\.?[0-9]*)`, 'i'));
  if (!m?.[1]) return null;
  const n = parseNumberToken(m[1].replace(/\$/g, ''));
  if (n == null) return null;
  return n;
}

export function detectTradingViewClosed(text: string): boolean {
  const u = text.toLowerCase();
  if (u.includes('closed p&l') || u.includes('closed p/l') || u.includes('closed pnl')) return true;
  if (u.includes('open p&l') || u.includes('open p/l') || u.includes('open pnl')) return false;
  return false;
}

/**
 * Your “completed trade” screenshots still show the Position tool but with P&L visible.
 * Treat it as completed when we see Position-tool labels plus any P&L readout.
 */
export function detectTradingViewCompletedPosition(text: string): boolean {
  const u = text.toLowerCase();
  const hasStop = u.includes('stop');
  const hasTarget = u.includes('target');
  const hasRiskReward = u.includes('risk/reward') || u.includes('risk reward');
  const hasPnl = u.includes('p&l') || u.includes('p/l') || u.includes('pnl');
  // If it explicitly says "open", we do not auto-close.
  if (u.includes('open p&l') || u.includes('open p/l') || u.includes('open pnl')) return false;
  // If it says closed, definitely closed.
  if (detectTradingViewClosed(text)) return true;
  // Otherwise: position tool + pnl readout => treat as completed for your workflow.
  return hasPnl && (hasRiskReward || (hasStop && hasTarget));
}

export type PlanGuess = {
  entry: number;
  stop: number | null;
  target: number | null;
};

export type PositionToolDeltas = {
  stopDelta: number;
  targetDelta: number;
};

export function parseTradingViewPositionToolDeltas(text: string): PositionToolDeltas | null {
  const stopM = text.match(/stop\s*:\s*([0-9][0-9,]*\.?[0-9]*)/i);
  const targetM = text.match(/target\s*:\s*([0-9][0-9,]*\.?[0-9]*)/i);
  if (!stopM?.[1] || !targetM?.[1]) return null;
  const stopDelta = parseNumberToken(stopM[1]);
  const targetDelta = parseNumberToken(targetM[1]);
  if (stopDelta == null || targetDelta == null) return null;
  if (stopDelta <= 0 || targetDelta <= 0) return null;
  return { stopDelta, targetDelta };
}

export function parseTradingViewAmountUsd(text: string): number | null {
  // Example: "Amount: 3195.31"
  const m = text.match(/amount\s*:\s*([0-9][0-9,]*\.?[0-9]*)/i);
  if (!m?.[1]) return null;
  const n = parseNumberToken(m[1]);
  if (n == null) return null;
  return n;
}

export type PositionToolLevels = {
  entry: number;
  stop: number;
  target: number;
  direction: 'long' | 'short';
};

function approxInList(value: number, prices: number[], tol: number) {
  return prices.some((p) => Math.abs(p - value) <= tol);
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const a = [...nums].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 === 0 ? (a[mid - 1]! + a[mid]!) / 2 : a[mid]!;
}

/**
 * TradingView position tool shows deltas (Target: 0.843 / Stop: 0.096) — not the actual price levels.
 * We reconstruct levels by choosing a likely stop/target price from visible axis labels.
 */
export function guessTradingViewPositionToolLevels(text: string): PositionToolLevels | null {
  const deltas = parseTradingViewPositionToolDeltas(text);
  if (!deltas) return null;
  const prices = extractOrderedPrices(text);
  const c = parseTradingViewClose(text);
  // Need a reasonable reference price. OCR can misread decimals, so sanity-check against axis labels.
  const axisMed = median(prices.filter((p) => p >= 0.000_001 && p <= 1e11));
  const ref = (() => {
    if (c == null) return axisMed;
    if (axisMed == null) return c;
    // If close is way off the visible axis scale, trust the axis median.
    if (c < axisMed * 0.5 || c > axisMed * 1.5) return axisMed;
    return c;
  })();
  if (ref == null) return null;

  // Use tolerance relative to price scale (decimals vs thousands).
  const tol = Math.max(0.001, ref * 0.01); // ~1% (OCR is noisy)
  const bandMin = ref * 0.4;
  const bandMax = ref * 2.5;
  const axis = prices.filter((p) => p >= bandMin && p <= bandMax);
  if (axis.length < 4) return null;

  let best: { score: number; levels: PositionToolLevels } | null = null;

  for (const stop of axis) {
    // Long candidate: entry above stop, target above entry.
    const entryL = stop + deltas.stopDelta;
    const targetL = entryL + deltas.targetDelta;
    const cBetweenLong = ref > stop && ref < targetL;
    const scoreL =
      (approxInList(entryL, axis, tol) ? 2 : 0) +
      (approxInList(targetL, axis, tol) ? 2 : 0) +
      (approxInList(stop, axis, tol) ? 1 : 0) +
      (Math.abs(entryL - ref) <= ref * 0.35 ? 1 : 0) +
      // Strong preference: current price should be between stop and target for long.
      (cBetweenLong ? 3 : 0);
    if (!best || scoreL > best.score) {
      best = { score: scoreL, levels: { entry: entryL, stop, target: targetL, direction: 'long' } };
    }

    // Short candidate: entry below stop (stop above entry), target below entry.
    const entryS = stop - deltas.stopDelta;
    const targetS = entryS - deltas.targetDelta;
    const cBetweenShort = ref < stop && ref > targetS;
    const scoreS =
      (approxInList(entryS, axis, tol) ? 2 : 0) +
      (approxInList(targetS, axis, tol) ? 2 : 0) +
      (approxInList(stop, axis, tol) ? 1 : 0) +
      (Math.abs(entryS - ref) <= ref * 0.35 ? 1 : 0) +
      // Strong preference: current price should be between target and stop for short.
      (cBetweenShort ? 3 : 0);
    if (!best || scoreS > best.score) {
      best = { score: scoreS, levels: { entry: entryS, stop, target: targetS, direction: 'short' } };
    }
  }

  // Accept matches even if one axis label is missing (e.g. entry not OCR'd but stop+target are).
  if (!best || best.score < 2) return null;
  return best.levels;
}

const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

export type TradingViewBottomTimes = {
  openedAt: Date | null;
  closedAt: Date | null;
};

/** Parses bottom toolbar like: "Thu 30 Apr '26 Fri 01 May '26 20:00" */
export function parseTradingViewBottomTimes(text: string): TradingViewBottomTimes {
  const re = /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{1,2})\s+([A-Za-z]{3})\s+'?(\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/g;
  const hits: { d: number; m: number; y: number; hh: number; mm: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const day = parseInt(m[1] ?? '', 10);
    const mon = MONTHS[(m[2] ?? '').toLowerCase()] ?? null;
    const yy = parseInt(m[3] ?? '', 10);
    if (!Number.isFinite(day) || mon == null || !Number.isFinite(yy)) continue;
    const year = yy < 100 ? 2000 + yy : yy;
    const hh = m[4] ? parseInt(m[4], 10) : 0;
    const mm = m[5] ? parseInt(m[5], 10) : 0;
    hits.push({ d: day, m: mon, y: year, hh: Number.isFinite(hh) ? hh : 0, mm: Number.isFinite(mm) ? mm : 0 });
  }
  const openedAt = hits.length >= 1 ? new Date(hits[0].y, hits[0].m, hits[0].d, hits[0].hh, hits[0].mm) : null;
  const closedAt = hits.length >= 1 ? new Date(hits[hits.length - 1].y, hits[hits.length - 1].m, hits[hits.length - 1].d, hits[hits.length - 1].hh, hits[hits.length - 1].mm) : null;
  return { openedAt, closedAt };
}

/**
 * Heuristic for TradingView position tool screenshots:
 * - Use `C` (close) as entry proxy (many screenshots show it).
 * - From all extracted prices, ignore tiny amounts and keep numbers near entry.
 * - Stop = lowest price below entry in the band; Target = highest above entry in the band.
 */
export function guessTradingViewPlanFromText(text: string): PlanGuess | null {
  const entry = parseTradingViewClose(text);
  if (entry == null) return null;
  const prices = extractOrderedPrices(text);
  // Axis ticks can be far away; plans are usually near current price.
  const bandMin = entry * 0.9;
  const bandMax = entry * 1.1;
  const near = prices.filter((p) => p >= bandMin && p <= bandMax);
  const below = near.filter((p) => p < entry * 0.999);
  const above = near.filter((p) => p > entry * 1.001);
  const isRoundTick = (p: number) => {
    const i = Math.round(p);
    return i % 1000 === 0 || i % 500 === 0;
  };
  const preferNonRound = (arr: number[]) => {
    const non = arr.filter((p) => !isRoundTick(p));
    return non.length ? non : arr;
  };
  // Prefer "close-by" levels; if none, fall back to extremes in the band.
  const closeByStop = preferNonRound(below.filter((p) => p >= entry * 0.98));
  const closeByTarget = preferNonRound(above.filter((p) => p <= entry * 1.05));
  const fallbackStop = preferNonRound(below);
  const fallbackTarget = preferNonRound(above);
  const stop =
    closeByStop.length ? Math.min(...closeByStop) : fallbackStop.length ? Math.min(...fallbackStop) : null;
  const target =
    closeByTarget.length ? Math.max(...closeByTarget) : fallbackTarget.length ? Math.max(...fallbackTarget) : null;
  return { entry, stop, target };
}
