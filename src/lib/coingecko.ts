/**
 * Market data via CoinPaprika (https://coinpaprika.com/api — free tier allows browser CORS).
 * Stored trades may still use legacy CoinGecko-style ids; we normalize those to Paprika ids.
 */

const PAPRICA_KEY = (import.meta.env.VITE_COINPAPRICA_API_KEY as string | undefined)?.trim() ?? '';
/** Free: api.coinpaprika.com — Pro: api-pro.coinpaprika.com + VITE_COINPAPRICA_API_KEY */
const PAPRICA_BASE =
  (import.meta.env.VITE_COINPAPRICA_BASE as string | undefined)?.trim()?.replace(/\/+$/, '') ||
  (PAPRICA_KEY ? 'https://api-pro.coinpaprika.com/v1' : 'https://api.coinpaprika.com/v1');

/** Legacy CoinGecko ids → CoinPaprika ids (existing saved trades / imports). */
const LEGACY_COINGECKO_TO_PAPRICA: Record<string, string> = {
  bitcoin: 'btc-bitcoin',
  ethereum: 'eth-ethereum',
  solana: 'sol-solana',
  ripple: 'xrp-xrp',
  dogecoin: 'doge-dogecoin',
  cardano: 'ada-cardano',
  'avalanche-2': 'avax-avalanche',
  avalanche2: 'avax-avalanche',
  polkadot: 'dot-polkadot',
  chainlink: 'link-chainlink',
  litecoin: 'ltc-litecoin',
  arbitrum: 'arb-arbitrum',
  optimism: 'op-optimism',
  aptos: 'apt-aptos',
  sui: 'sui-sui',
  near: 'near-near-protocol',
  binancecoin: 'bnb-binance-coin',
  'matic-network': 'matic-polygon',
  maticnetwork: 'matic-polygon',
  polygon: 'matic-polygon',
  'polygon-ecosystem-token': 'pol-polygon-ecosystem-token',
  tron: 'trx-tron',
  'shiba-inu': 'shib-shiba',
  shibainu: 'shib-shiba',
  'the-open-network': 'ton-the-open-network',
  'bitcoin-cash': 'bch-bitcoin-cash',
  'ethereum-classic': 'etc-ethereum-classic',
  uniswap: 'uni-uniswap',
  cosmos: 'atom-cosmos',
  pepe: 'pepe-pepe',
  wormhole: 'w-wormhole',
  elastos: 'ela-elastos',
  'kyber-network-crystal': 'knc-kyber-network',
  kybernetworkcrystal: 'knc-kyber-network',
  apecoin: 'ape-apecoin',
  hivemapper: 'honey-hivemapper',
};

let globalRateLimitUntil = 0;
const RATE_LIMIT_BACKOFF_MS = 120_000;

function isRateLimitMessage(msg: string): boolean {
  return /rate limit|429|too many/i.test(msg);
}

export function isCoingeckoRateLimitError(err: unknown): boolean {
  return err instanceof Error && isRateLimitMessage(err.message);
}

export function formatCoingeckoError(err: unknown): string {
  if (!(err instanceof Error)) return 'Market data request failed';
  if (isRateLimitMessage(err.message)) {
    return PAPRICA_KEY
      ? 'CoinPaprika rate limit — wait and retry, or check your API plan.'
      : 'CoinPaprika rate limit — wait ~2 min or add VITE_COINPAPRICA_API_KEY for higher limits.';
  }
  return err.message;
}

export function normalizeToPaprikaCoinId(id: string | null | undefined): string {
  if (id == null || typeof id !== 'string') return '';
  const t = id.trim().toLowerCase();
  if (!t) return '';
  return LEGACY_COINGECKO_TO_PAPRICA[t] ?? t;
}

type PaprikaTicker = {
  id?: string;
  quotes?: { USD?: { price?: number } };
};

type PaprikaSearchCurrency = {
  id: string;
  name: string;
  symbol: string;
};

type PaprikaSearchResponse = {
  currencies?: PaprikaSearchCurrency[];
};

async function fetchPaprikaJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  if (typeof window !== 'undefined' && Date.now() < globalRateLimitUntil) {
    throw new Error(
      `Rate limit — cooling down. Retry after ${Math.ceil((globalRateLimitUntil - Date.now()) / 1000)}s.`
    );
  }

  const url = `${PAPRICA_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (PAPRICA_KEY) headers.Authorization = PAPRICA_KEY;

  const res = await fetch(url, { signal, headers });
  if (res.status === 429) {
    globalRateLimitUntil = Date.now() + RATE_LIMIT_BACKOFF_MS;
    throw new Error('CoinPaprika rate limit — try again shortly.');
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

const PRICE_CACHE_TTL_MS = PAPRICA_KEY ? 60_000 : 180_000;
const priceCache = new Map<
  string,
  { at: number; data: Record<string, { usd?: number }> }
>();

const priceInflight = new Map<string, Promise<Record<string, { usd?: number }>>>();

function priceCacheKey(ids: string[]) {
  return [...new Set(ids)].sort().join(',');
}

/** Key used in `openPrices` / batch price maps: Paprika id, or per-trade when id is missing. */
export function priceLookupKey(t: { id: string; coinGeckoId?: string | null }): string {
  const id = typeof t.coinGeckoId === 'string' ? t.coinGeckoId.trim() : '';
  return id.length > 0 ? id : `__trade:${t.id}`;
}

function normalizeSymbolForSearch(symbol: string): string {
  const t = symbol.trim();
  if (!t) return '';
  const seg = (t.split(/[/\s]+/)[0] ?? t).replace(/[_-]+/g, '');
  return seg.replace(/[^a-zA-Z0-9]/g, '').slice(0, 32);
}

function pickSearchHit(
  hits: { id: string; symbol: string; name: string }[],
  query: string
): string | null {
  if (hits.length === 0) return null;
  const qu = query.toUpperCase();
  const exact = hits.find((h) => h.symbol.toUpperCase() === qu);
  if (exact) return exact.id;
  const starts = hits.find(
    (h) => h.symbol.toUpperCase().startsWith(qu) && qu.length >= 2
  );
  if (starts) return starts.id;
  return hits[0]!.id;
}

export type OpenTradePriceRow = { tradeId: string; coinGeckoId: string; symbol: string };

const openTradePriceInflight = new Map<string, Promise<Record<string, number | null>>>();
const openTradePriceCache = new Map<string, { at: number; data: Record<string, number | null> }>();

function openTradePriceCacheKey(rows: OpenTradePriceRow[]): string {
  return rows
    .map((r) => `${r.tradeId}\t${r.coinGeckoId}\t${r.symbol}`)
    .sort()
    .join('\n');
}

/**
 * Spot USD for open-trade rows: ticker by stored id, then CoinPaprika search-by-symbol when missing.
 * Keys match {@link priceLookupKey} so UI can resolve live price even with blank/wrong legacy ids.
 */
export async function fetchOpenTradeUsdPrices(
  rows: OpenTradePriceRow[],
  signal?: AbortSignal
): Promise<Record<string, number | null>> {
  if (rows.length === 0) return {};
  const cacheKey = openTradePriceCacheKey(rows);
  const now = Date.now();
  const hit = openTradePriceCache.get(cacheKey);
  if (hit && now - hit.at < PRICE_CACHE_TTL_MS) {
    return hit.data;
  }

  const existing = openTradePriceInflight.get(cacheKey);
  if (existing) return existing;

  const p = (async () => {
    const ids = [...new Set(rows.map((r) => r.coinGeckoId.trim()).filter((x) => x.length > 0))];
    const base = await fetchSimpleUsdPrices(ids, signal);
    const out: Record<string, number | null> = {};

    const rowKey = (row: OpenTradePriceRow) =>
      priceLookupKey({ id: row.tradeId, coinGeckoId: row.coinGeckoId });

    for (const row of rows) {
      const lk = rowKey(row);
      const rawId = row.coinGeckoId.trim();
      if (rawId) {
        const usd = base[rawId]?.usd;
        if (typeof usd === 'number' && Number.isFinite(usd)) {
          out[lk] = usd;
        }
      }
    }

    const missing: OpenTradePriceRow[] = [];
    const seenLk = new Set<string>();
    for (const row of rows) {
      const lk = rowKey(row);
      if (typeof out[lk] === 'number' && Number.isFinite(out[lk]!)) continue;
      if (seenLk.has(lk)) continue;
      seenLk.add(lk);
      missing.push(row);
    }

    const chunk = 4;
    for (let i = 0; i < missing.length; i += chunk) {
      const slice = missing.slice(i, i + chunk);
      await Promise.all(
        slice.map(async (row) => {
          if (signal?.aborted) return;
          const lk = rowKey(row);
          const q = normalizeSymbolForSearch(row.symbol);
          if (q.length < 1) return;
          try {
            const hits = await searchCoins(q, signal);
            const paprikaId = pickSearchHit(hits, q);
            if (!paprikaId || signal?.aborted) return;
            const ticker = await fetchPaprikaJson<PaprikaTicker>(
              `/tickers/${encodeURIComponent(paprikaId)}`,
              signal
            );
            const price = ticker?.quotes?.USD?.price;
            if (typeof price === 'number' && Number.isFinite(price)) {
              out[lk] = price;
            }
          } catch {
            // leave absent
          }
        })
      );
    }

    openTradePriceCache.set(cacheKey, { at: Date.now(), data: out });
    return out;
  })();

  openTradePriceInflight.set(cacheKey, p);
  try {
    return await p;
  } finally {
    openTradePriceInflight.delete(cacheKey);
  }
}

/** Coin ids: Paprika ids (e.g. btc-bitcoin) or legacy CoinGecko ids (e.g. bitcoin). */
export async function fetchSimpleUsdPrices(
  coinIds: string[],
  signal?: AbortSignal
): Promise<Record<string, { usd?: number }>> {
  const cleaned = coinIds.filter(
    (id): id is string => typeof id === 'string' && id.trim().length > 0
  );
  if (cleaned.length === 0) return {};
  const key = priceCacheKey(cleaned);
  const now = Date.now();
  const hit = priceCache.get(key);
  if (hit && now - hit.at < PRICE_CACHE_TTL_MS) {
    return hit.data;
  }

  const existing = priceInflight.get(key);
  if (existing) return existing;

  const p = (async () => {
    const uniqueRaw = [...new Set(cleaned)];
    const pairs = uniqueRaw
      .map((raw) => ({ raw, paprika: normalizeToPaprikaCoinId(raw) }))
      .filter((p) => p.paprika.length > 0);
    const uniquePaprika = [...new Set(pairs.map((p) => p.paprika))];

    const tickerByPaprika = new Map<string, PaprikaTicker>();
    const chunk = 8;
    for (let i = 0; i < uniquePaprika.length; i += chunk) {
      const slice = uniquePaprika.slice(i, i + chunk);
      await Promise.all(
        slice.map(async (pid) => {
          try {
            const t = await fetchPaprikaJson<PaprikaTicker>(
              `/tickers/${encodeURIComponent(pid)}`,
              signal
            );
            tickerByPaprika.set(pid, t);
          } catch {
            // missing coin / network — leave absent
          }
        })
      );
    }

    const out: Record<string, { usd?: number }> = {};
    for (const { raw, paprika } of pairs) {
      const t = tickerByPaprika.get(paprika);
      const price = t?.quotes?.USD?.price;
      if (typeof price === 'number' && Number.isFinite(price)) {
        out[raw] = { usd: price };
      }
    }

    priceCache.set(key, { at: Date.now(), data: out });
    return out;
  })();

  priceInflight.set(key, p);
  try {
    return await p;
  } finally {
    priceInflight.delete(key);
  }
}

const SEARCH_CACHE_TTL_MS = 60_000;
const searchCache = new Map<
  string,
  { at: number; data: { id: string; symbol: string; name: string; thumb?: string }[] }
>();
const searchInflight = new Map<string, Promise<{ id: string; symbol: string; name: string; thumb?: string }[]>>();

export async function searchCoins(
  query: string,
  signal?: AbortSignal
): Promise<{ id: string; symbol: string; name: string; thumb?: string }[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 1) return [];

  const now = Date.now();
  const cached = searchCache.get(q);
  if (cached && now - cached.at < SEARCH_CACHE_TTL_MS) {
    return cached.data;
  }

  const inflight = searchInflight.get(q);
  if (inflight) return inflight;

  const p = (async () => {
    const data = await fetchPaprikaJson<PaprikaSearchResponse>(
      `/search/?q=${encodeURIComponent(q)}`,
      signal
    );
    const list = (data.currencies ?? []).slice(0, 20).map((c) => ({
      id: c.id,
      symbol: c.symbol,
      name: c.name,
    }));
    searchCache.set(q, { at: Date.now(), data: list });
    return list;
  })();

  searchInflight.set(q, p);
  try {
    return await p;
  } finally {
    searchInflight.delete(q);
  }
}

/** CoinPaprika ids for the popular picker (labels stay familiar). */
export const POPULAR_COIN_IDS = [
  { id: 'btc-bitcoin', label: 'BTC' },
  { id: 'eth-ethereum', label: 'ETH' },
  { id: 'sol-solana', label: 'SOL' },
  { id: 'xrp-xrp', label: 'XRP' },
  { id: 'ada-cardano', label: 'ADA' },
  { id: 'doge-dogecoin', label: 'DOGE' },
] as const;
