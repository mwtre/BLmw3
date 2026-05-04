/**
 * Supabase Edge Function: CoinGecko-shaped USD spot prices from Revolut Business API (B2B).
 *
 * Secrets (Dashboard → Edge Functions → Secrets, or `supabase secrets set`):
 *   REVOLUT_ACCESS_TOKEN — Bearer token from Revolut Business API (OAuth / JWT).
 *
 * Optional:
 *   REVOLUT_B2B_BASE — default https://b2b.revolut.com (sandbox: https://sandbox-b2b.revolut.com)
 *
 * Deploy: `supabase functions deploy revolut-prices --project-ref <ref>`
 *
 * For Revolut X (exchange tickers + Ed25519), use `supabase/functions/revolut-x-prices` instead.
 */

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

/** CoinGecko coin id → ISO currency symbol Revolut uses in GET /rate */
const COIN_ID_TO_REVOLUT: Record<string, string> = {
  bitcoin: "BTC",
  ethereum: "ETH",
  solana: "SOL",
  ripple: "XRP",
  cardano: "ADA",
  dogecoin: "DOGE",
  polkadot: "DOT",
  chainlink: "LINK",
  litecoin: "LTC",
  bitcoincash: "BCH",
  stellar: "XLM",
  eos: "EOS",
  tezos: "XTZ",
  cosmos: "ATOM",
  avalanche2: "AVAX",
  "avalanche-2": "AVAX",
  binancecoin: "BNB",
  uniswap: "UNI",
  aave: "AAVE",
  maker: "MKR",
  compoundether: "COMP",
  shibainu: "SHIB",
  "shiba-inu": "SHIB",
  tron: "TRX",
  monero: "XMR",
  aptos: "APT",
  sui: "SUI",
  near: "NEAR",
  optimism: "OP",
  arbitrum: "ARB",
  polygon: "MATIC",
  maticnetwork: "MATIC",
  cronos: "CRO",
  fantom: "FTM",
  pepe: "PEPE",
  render: "RNDR",
  injective: "INJ",
  immutablex: "IMX",
  bonk: "BONK",
  wormhole: "W",
};

type RateJson = {
  rate?: number;
  from?: { amount?: number; currency?: string };
  to?: { amount?: number; currency?: string };
};

function usdFromRatePayload(j: RateJson): number | undefined {
  if (j.to?.currency === "USD" && typeof j.to.amount === "number") return j.to.amount;
  if (typeof j.rate === "number") return j.rate;
  return undefined;
}

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

  const token = Deno.env.get("REVOLUT_ACCESS_TOKEN")?.trim();
  if (!token) {
    return new Response(
      JSON.stringify({ error: "Missing REVOLUT_ACCESS_TOKEN on the function (set Supabase secret)." }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  const base = (Deno.env.get("REVOLUT_B2B_BASE") ?? "https://b2b.revolut.com").replace(/\/+$/, "");
  const url = new URL(req.url);
  const ids =
    url.searchParams.get("ids")?.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean) ?? [];

  const out: Record<string, { usd?: number }> = {};

  for (const id of ids) {
    const rev = COIN_ID_TO_REVOLUT[id];
    if (!rev) continue;

    const rateUrl = new URL(`${base}/api/1.0/rate`);
    rateUrl.searchParams.set("from", rev);
    rateUrl.searchParams.set("to", "USD");
    rateUrl.searchParams.set("amount", "1");

    try {
      const r = await fetch(rateUrl.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      if (!r.ok) continue;
      const j = (await r.json()) as RateJson;
      const usd = usdFromRatePayload(j);
      if (usd != null && Number.isFinite(usd)) {
        out[id] = { usd };
      }
    } catch {
      // skip id on failure
    }
  }

  return new Response(JSON.stringify(out), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
