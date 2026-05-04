const BASE = 'https://api.coingecko.com/api/v3';

/** Demo API key from CoinGecko dashboard — raises free-tier limits (still exposed in client bundle). */
const DEMO_API_KEY = (import.meta.env.VITE_COINGECKO_API_KEY as string | undefined)?.trim() ?? '';

/** User-defined prefix; target URL is appended as encoded query value (e.g. …/raw?url=). */
const CUSTOM_PROXY_BASE =
  (import.meta.env.VITE_CORS_PROXY_BASE as string | undefined)?.trim() ?? '';

/** USD spot prices via Supabase Edge Function calling Revolut Business API (token stays server-side). */
const USE_REVOLUT_EDGE =
  (import.meta.env.VITE_USE_REVOLUT_EDGE_PRICES as string | undefined)?.toLowerCase() === 'true';
/** Revolut X (crypto exchange) tickers via Edge Function — takes precedence over Business + CoinGecko when true. */
const USE_REVOLUT_X_EDGE =
  (import.meta.env.VITE_USE_REVOLUT_X_EDGE_PRICES as string | undefined)?.toLowerCase() === 'true';
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const SUPABASE_ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

function withDemoKey(url: string): string {
  if (!DEMO_API_KEY) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}x_cg_demo_api_key=${encodeURIComponent(DEMO_API_KEY)}`;
}

function isBrowserLocalhost(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
}

/**
 * CoinGecko does not send CORS headers for browser origins (e.g. GitHub Pages).
 * Try several public proxies; users can set VITE_CORS_PROXY_BASE to their own worker.
 */
function proxyUrlsFor(targetUrl: string): string[] {
  const encoded = encodeURIComponent(targetUrl);
  const urls: string[] = [];
  if (CUSTOM_PROXY_BASE) {
    urls.push(`${CUSTOM_PROXY_BASE}${encoded}`);
  }
  urls.push(`https://api.codetabs.com/v1/proxy/?quest=${encoded}`);
  urls.push(`https://corsproxy.io/?${encoded}`);
  urls.push(`https://api.allorigins.win/raw?url=${encoded}`);
  urls.push(`https://api.allorigins.win/get?url=${encoded}`);
  return urls;
}

async function parseProxyResponse(res: Response, requestUrl: string): Promise<unknown> {
  const text = await res.text();
  if (!text) throw new Error('Empty response body');
  if (requestUrl.includes('api.allorigins.win/get')) {
    const wrapped = JSON.parse(text) as { contents?: string };
    if (typeof wrapped.contents !== 'string') throw new Error('Invalid allorigins get payload');
    return JSON.parse(wrapped.contents) as unknown;
  }
  return JSON.parse(text) as unknown;
}

/** After a 429, pause outbound CoinGecko calls so we do not burn the whole quota. */
let globalRateLimitUntil = 0;
const RATE_LIMIT_BACKOFF_MS = 120_000;

function isRateLimitMessage(msg: string): boolean {
  return /rate limit|exceeded the rate limit|\b429\b/i.test(msg);
}

export function isCoingeckoRateLimitError(err: unknown): boolean {
  return err instanceof Error && isRateLimitMessage(err.message);
}

/** Short message for UI when CoinGecko or proxies refuse requests. */
export function formatCoingeckoError(err: unknown): string {
  if (!(err instanceof Error)) return 'Market data request failed';
  if (/VITE_USE_REVOLUT_X_EDGE_PRICES requires/i.test(err.message)) return err.message;
  if (/VITE_USE_REVOLUT_EDGE_PRICES requires/i.test(err.message)) return err.message;
  if (/Revolut X prices/i.test(err.message)) {
    return 'Revolut X prices failed — deploy revolut-x-prices and set REVOLUT_X_API_KEY + REVOLUT_X_PRIVATE_KEY in Supabase (see supabase/functions/revolut-x-prices).';
  }
  if (/Revolut prices/i.test(err.message)) {
    return 'Revolut prices failed — deploy the revolut-prices Edge Function and set REVOLUT_ACCESS_TOKEN in Supabase (see supabase/functions/revolut-prices).';
  }
  if (isRateLimitMessage(err.message)) {
    if (USE_REVOLUT_X_EDGE || USE_REVOLUT_EDGE) {
      return 'Rate limit or upstream error. If you use Revolut, check the Edge Function; otherwise add VITE_COINGECKO_API_KEY for CoinGecko.';
    }
    return DEMO_API_KEY
      ? 'CoinGecko rate limit — wait a few minutes or check your API plan.'
      : 'CoinGecko free tier is rate-limited. Wait ~2 min, refresh less often, add VITE_COINGECKO_API_KEY, or use VITE_USE_REVOLUT_X_EDGE_PRICES / VITE_USE_REVOLUT_EDGE_PRICES with a Supabase Edge Function.';
  }
  return err.message;
}

async function fetchRevolutEdgePrices(
  coinIds: string[],
  signal?: AbortSignal
): Promise<Record<string, { usd?: number }>> {
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    throw new Error('VITE_USE_REVOLUT_EDGE_PRICES requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  }
  const params = new URLSearchParams({ ids: [...new Set(coinIds)].join(',') });
  const fnUrl = `${SUPABASE_URL.replace(/\/+$/, '')}/functions/v1/revolut-prices?${params}`;
  const res = await fetch(fnUrl, {
    signal,
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON}`,
      apikey: SUPABASE_ANON,
    },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Revolut prices (${res.status}): ${t.slice(0, 240)}`);
  }
  return res.json() as Promise<Record<string, { usd?: number }>>;
}

async function fetchRevolutXEdgePrices(
  coinIds: string[],
  signal?: AbortSignal
): Promise<Record<string, { usd?: number }>> {
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    throw new Error('VITE_USE_REVOLUT_X_EDGE_PRICES requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  }
  const params = new URLSearchParams({ ids: [...new Set(coinIds)].join(',') });
  const fnUrl = `${SUPABASE_URL.replace(/\/+$/, '')}/functions/v1/revolut-x-prices?${params}`;
  const res = await fetch(fnUrl, {
    signal,
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON}`,
      apikey: SUPABASE_ANON,
    },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Revolut X prices (${res.status}): ${t.slice(0, 240)}`);
  }
  return res.json() as Promise<Record<string, { usd?: number }>>;
}

function throwIfCoingeckoErrorPayload(data: unknown): void {
  if (!data || typeof data !== 'object') return;
  if (!('status' in data)) return;
  const st = (data as { status?: { error_code?: number; error_message?: string } }).status;
  if (st && typeof st.error_code === 'number' && st.error_code !== 0) {
    if (st.error_code === 429) {
      globalRateLimitUntil = Math.max(globalRateLimitUntil, Date.now() + RATE_LIMIT_BACKOFF_MS);
    }
    throw new Error(st.error_message ?? `CoinGecko error ${st.error_code}`);
  }
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  if (typeof window !== 'undefined' && Date.now() < globalRateLimitUntil) {
    throw new Error(
      `CoinGecko rate limit — cooling down. Retry after ${Math.ceil((globalRateLimitUntil - Date.now()) / 1000)}s or set VITE_COINGECKO_API_KEY.`
    );
  }

  const directFirst = isBrowserLocalhost();
  const attempts = directFirst
    ? [url, ...proxyUrlsFor(url)]
    : [...proxyUrlsFor(url), url];

  let lastErr: unknown;
  for (const attemptUrl of attempts) {
    try {
      const res = await fetch(attemptUrl, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await parseProxyResponse(res, attemptUrl)) as T;
      throwIfCoingeckoErrorPayload(data);
      return data;
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (isRateLimitMessage(msg)) break;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/** Fewer round-trips = fewer 429s on the free tier + shared proxy IPs. */
const PRICE_CACHE_TTL_MS = DEMO_API_KEY ? 60_000 : 180_000;
const priceCache = new Map<
  string,
  { at: number; data: Record<string, { usd?: number }> }
>();

const priceInflight = new Map<string, Promise<Record<string, { usd?: number }>>>();

function priceCacheKey(ids: string[]) {
  return [...new Set(ids)].sort().join(',');
}

/** ids: comma-separated CoinGecko ids, e.g. bitcoin,ethereum */
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
    if (USE_REVOLUT_X_EDGE) {
      try {
        const data = await fetchRevolutXEdgePrices(coinIds, signal);
        priceCache.set(key, { at: Date.now(), data });
        return data;
      } catch (e) {
        const stale = priceCache.get(key);
        if (stale && isCoingeckoRateLimitError(e)) return stale.data;
        throw e;
      }
    }

    if (USE_REVOLUT_EDGE) {
      try {
        const data = await fetchRevolutEdgePrices(coinIds, signal);
        priceCache.set(key, { at: Date.now(), data });
        return data;
      } catch (e) {
        const stale = priceCache.get(key);
        if (stale && isCoingeckoRateLimitError(e)) return stale.data;
        throw e;
      }
    }

    const params = new URLSearchParams({
      ids: [...new Set(coinIds)].join(','),
      vs_currencies: 'usd',
    });
    const upstream = withDemoKey(`${BASE}/simple/price?${params}`);
    try {
      const data = await fetchJson<Record<string, { usd?: number }>>(upstream, signal);
      priceCache.set(key, { at: Date.now(), data });
      return data;
    } catch (e) {
      const stale = priceCache.get(key);
      if (stale && isCoingeckoRateLimitError(e)) {
        return stale.data;
      }
      throw e;
    }
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
    const upstream = withDemoKey(`${BASE}/search?query=${encodeURIComponent(q)}`);
    const data = await fetchJson<{
      coins?: { id: string; symbol: string; name: string; thumb: string }[];
    }>(upstream, signal);
    const list = (data.coins ?? []).slice(0, 20);
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

export const POPULAR_COIN_IDS = [
  { id: 'bitcoin', label: 'BTC' },
  { id: 'ethereum', label: 'ETH' },
  { id: 'solana', label: 'SOL' },
  { id: 'ripple', label: 'XRP' },
  { id: 'cardano', label: 'ADA' },
  { id: 'dogecoin', label: 'DOGE' },
] as const;
