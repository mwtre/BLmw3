const BASE = 'https://api.coingecko.com/api/v3';

/** User-defined prefix; target URL is appended as encoded query value (e.g. …/raw?url=). */
const CUSTOM_PROXY_BASE =
  (import.meta.env.VITE_CORS_PROXY_BASE as string | undefined)?.trim() ?? '';

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
  // CodeTabs proxy returns JSON with CORS * (reliable for static hosting).
  urls.push(`https://api.codetabs.com/v1/proxy/?quest=${encoded}`);
  // corsproxy.io — may 403 from some networks; keep as middle fallback.
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

function throwIfCoingeckoErrorPayload(data: unknown): void {
  if (!data || typeof data !== 'object') return;
  if (!('status' in data)) return;
  const st = (data as { status?: { error_code?: number; error_message?: string } }).status;
  if (st && typeof st.error_code === 'number' && st.error_code !== 0) {
    throw new Error(st.error_message ?? `CoinGecko error ${st.error_code}`);
  }
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
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
      // Same CoinGecko 429 for every proxy; do not fan out.
      if (/rate limit|exceeded the rate limit|429/i.test(msg)) break;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/** Dedupe rapid repeats (free tier friendly). */
const PRICE_CACHE_TTL_MS = 45_000;
const priceCache = new Map<
  string,
  { at: number; data: Record<string, { usd?: number }> }
>();

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
  const params = new URLSearchParams({
    ids: [...new Set(coinIds)].join(','),
    vs_currencies: 'usd',
  });
  const data = await fetchJson<Record<string, { usd?: number }>>(
    `${BASE}/simple/price?${params}`,
    signal
  );
  priceCache.set(key, { at: now, data });
  return data;
}

export async function searchCoins(
  query: string,
  signal?: AbortSignal
): Promise<{ id: string; symbol: string; name: string; thumb?: string }[]> {
  const q = query.trim();
  if (q.length < 1) return [];
  const data = await fetchJson<{
    coins?: { id: string; symbol: string; name: string; thumb: string }[];
  }>(`${BASE}/search?query=${encodeURIComponent(q)}`, signal);
  return (data.coins ?? []).slice(0, 20);
}

export const POPULAR_COIN_IDS = [
  { id: 'bitcoin', label: 'BTC' },
  { id: 'ethereum', label: 'ETH' },
  { id: 'solana', label: 'SOL' },
  { id: 'ripple', label: 'XRP' },
  { id: 'cardano', label: 'ADA' },
  { id: 'dogecoin', label: 'DOGE' },
] as const;
