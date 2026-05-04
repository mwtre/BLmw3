/**
 * Supabase Edge Function: CoinGecko-shaped USD prices from Revolut X (revx.revolut.com) tickers.
 *
 * Auth (see https://github.com/revolut-engineering/revolut-x-api):
 *   X-Revx-API-Key, X-Revx-Timestamp, X-Revx-Signature (Ed25519 over a canonical string)
 *
 * Secrets (Supabase project → Edge Functions → Secrets):
 *   REVOLUT_X_API_KEY        — 64-char key from Revolut X (after registering your public key)
 *   REVOLUT_X_PRIVATE_KEY    — PKCS#8 PEM, full text including BEGIN/END (or set via `supabase secrets set ... < private.pem`)
 *
 * Optional:
 *   REVOLUT_X_BASE_URL       — default https://revx.revolut.com (sandbox: https://revx.revolut.codes)
 *
 * Deploy: `supabase functions deploy revolut-x-prices --project-ref <ref>`
 *
 * This is not the Revolut Business (B2B) API — that is `revolut-prices` in this repo.
 */

import { Buffer } from "node:buffer";
import { createPrivateKey, sign } from "node:crypto";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

/** CoinGecko id → Revolut X pair (quote USD). Only listed pairs on your exchange will return data. */
const COIN_ID_TO_PAIR: Record<string, string> = {
  bitcoin: "BTC-USD",
  ethereum: "ETH-USD",
  solana: "SOL-USD",
  ripple: "XRP-USD",
  cardano: "ADA-USD",
  dogecoin: "DOGE-USD",
  polkadot: "DOT-USD",
  chainlink: "LINK-USD",
  litecoin: "LTC-USD",
  bitcoincash: "BCH-USD",
  stellar: "XLM-USD",
  eos: "EOS-USD",
  tezos: "XTZ-USD",
  cosmos: "ATOM-USD",
  avalanche2: "AVAX-USD",
  "avalanche-2": "AVAX-USD",
  binancecoin: "BNB-USD",
  uniswap: "UNI-USD",
  aave: "AAVE-USD",
  maker: "MKR-USD",
  compoundether: "COMP-USD",
  shibainu: "SHIB-USD",
  "shiba-inu": "SHIB-USD",
  tron: "TRX-USD",
  monero: "XMR-USD",
  aptos: "APT-USD",
  sui: "SUI-USD",
  near: "NEAR-USD",
  optimism: "OP-USD",
  arbitrum: "ARB-USD",
  polygon: "MATIC-USD",
  maticnetwork: "MATIC-USD",
  cronos: "CRO-USD",
  fantom: "FTM-USD",
  pepe: "PEPE-USD",
  render: "RNDR-USD",
  injective: "INJ-USD",
  immutablex: "IMX-USD",
  bonk: "BONK-USD",
  wormhole: "W-USD",
};

/** Same query ordering as revolut-engineering/revolut-x-api makeRequest */
function buildQueryString(params: Record<string, string>): string {
  const entries: [string, string][] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    entries.push([key, String(value)]);
  }
  entries.sort((a, b) => a[0].localeCompare(b[0]));
  return entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
}

function buildAuthHeaders(
  apiKey: string,
  pem: string,
  method: string,
  fullPath: string,
  query: string,
  body: string,
): Record<string, string> {
  const privateKey = createPrivateKey(pem);
  const timestamp = String(Date.now());
  const message = `${timestamp}${method.toUpperCase()}${fullPath}${query}${body}`;
  const signature = sign(null, Buffer.from(message, "utf8"), privateKey).toString("base64");
  return {
    "X-Revx-API-Key": apiKey,
    "X-Revx-Timestamp": timestamp,
    "X-Revx-Signature": signature,
  };
}

type WireTicker = {
  symbol: string;
  bid?: string;
  ask?: string;
  mid?: string;
  last_price?: string;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("REVOLUT_X_API_KEY")?.trim();
  const pemRaw = Deno.env.get("REVOLUT_X_PRIVATE_KEY")?.trim();
  if (!apiKey || !pemRaw) {
    return new Response(
      JSON.stringify({
        error:
          "Missing REVOLUT_X_API_KEY or REVOLUT_X_PRIVATE_KEY (PKCS#8 PEM). Never expose these in the browser.",
      }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  const pem = pemRaw.includes("BEGIN") ? pemRaw : pemRaw.replace(/\\n/g, "\n");

  const base = (Deno.env.get("REVOLUT_X_BASE_URL") ?? "https://revx.revolut.com").replace(/\/+$/, "");
  const urlObj = new URL(req.url);
  const ids =
    urlObj.searchParams.get("ids")?.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean) ?? [];

  const pairs = [...new Set(ids.map((id) => COIN_ID_TO_PAIR[id]).filter(Boolean))];
  if (pairs.length === 0) {
    return new Response(JSON.stringify({}), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const innerPath = "/tickers";
  const fullPath = `/api/1.0${innerPath}`;
  const params: Record<string, string> = { symbols: pairs.join(",") };
  const queryString = buildQueryString(params);
  const fetchUrl = `${base}${fullPath}?${queryString}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...buildAuthHeaders(apiKey, pem, "GET", fullPath, queryString, ""),
  };

  let res: Response;
  try {
    res = await fetch(fetchUrl, { method: "GET", headers });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Revolut X fetch failed" }),
      { status: 502, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  if (!res.ok) {
    const t = await res.text();
    return new Response(JSON.stringify({ error: `Revolut X HTTP ${res.status}`, detail: t.slice(0, 500) }), {
      status: 502,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const payload = (await res.json()) as { data?: WireTicker[] };
  const tickers = payload.data ?? [];
  const bySymbol = new Map(tickers.map((t) => [t.symbol, t]));

  const out: Record<string, { usd?: number }> = {};
  for (const id of ids) {
    const pair = COIN_ID_TO_PAIR[id];
    if (!pair) continue;
    const t = bySymbol.get(pair);
    if (!t) continue;
    const raw = t.last_price ?? t.mid ?? t.bid;
    if (raw == null) continue;
    const usd = Number.parseFloat(raw);
    if (Number.isFinite(usd)) {
      out[id] = { usd };
    }
  }

  return new Response(JSON.stringify(out), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
