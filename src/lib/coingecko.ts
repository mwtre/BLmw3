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

export function normalizeToPaprikaCoinId(id: string): string {
  const t = id.trim().toLowerCase();
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

/** Coin ids: Paprika ids (e.g. btc-bitcoin) or legacy CoinGecko ids (e.g. bitcoin). */
export async function fetchSimpleUsdPrices(
  coinIds: string[],
  signal?: AbortSignal
): Promise<Record<string, { usd?: number }>> {
  if (coinIds.length === 0) return {};
  const key = priceCacheKey(coinIds);
  const now = Date.now();
  const hit = priceCache.get(key);
  if (hit && now - hit.at < PRICE_CACHE_TTL_MS) {
    return hit.data;
  }

  const existing = priceInflight.get(key);
  if (existing) return existing;

  const p = (async () => {
    const uniqueRaw = [...new Set(coinIds)];
    const pairs = uniqueRaw.map((raw) => ({ raw, paprika: normalizeToPaprikaCoinId(raw) }));
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
