const BASE = 'https://api.coingecko.com/api/v3';

/** Demo API key from CoinGecko dashboard — raises free-tier limits (still exposed in client bundle). */
const DEMO_API_KEY = (import.meta.env.VITE_COINGECKO_API_KEY as string | undefined)?.trim() ?? '';

/** User-defined prefix; target URL is appended as encoded query value (e.g. …/raw?url=). */
const CUSTOM_PROXY_BASE =
  (import.meta.env.VITE_CORS_PROXY_BASE as string | undefined)?.trim() ?? '';

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
  if (!(err instanceof Error)) return 'CoinGecko request failed';
  if (isRateLimitMessage(err.message)) {
    return DEMO_API_KEY
      ? 'CoinGecko rate limit — wait a few minutes or check your API plan.'
      : 'CoinGecko free tier is rate-limited. Wait ~2 min, refresh less often, or add VITE_COINGECKO_API_KEY (free demo key at coingecko.com/api).';
  }
  return err.message;
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
