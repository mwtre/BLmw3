const BASE = 'https://api.coingecko.com/api/v3';
const PROXY_BASE =
  (import.meta.env.VITE_CORS_PROXY_BASE as string | undefined) ?? 'https://api.allorigins.win/raw?url=';

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch (e) {
    // Common in GitHub Pages + browser environments when an upstream blocks CORS.
    const shouldProxy =
      e instanceof TypeError ||
      (e instanceof Error && /cors|failed to fetch/i.test(e.message));
    if (!shouldProxy) throw e;
    const proxied = `${PROXY_BASE}${encodeURIComponent(url)}`;
    const res2 = await fetch(proxied, { signal });
    if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
    return (await res2.json()) as T;
  }
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
