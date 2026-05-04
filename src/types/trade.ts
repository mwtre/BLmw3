export type TradeStatus = 'open' | 'closed';

/** Spot-style trade journal entry (USD prices from CoinGecko alignment). */
export interface ProfitTrade {
  id: string;
  /** CoinGecko coin id, e.g. bitcoin */
  coinGeckoId: string;
  symbol: string;
  openedAt: string;
  closedAt: string | null;
  entryPrice: number;
  exitPrice: number | null;
  /** Optional realized P/L override (e.g. imported from screenshot text). */
  realizedPnlUsd?: number | null;
  /** USD notional / equity used for the trade (not token quantity). */
  quantity: number;
  /** Optional source link (e.g. X post that called the trade). */
  sourceUrl?: string | null;
  /** Local-last-updated timestamp for sync merges (ISO). */
  updatedAt?: string;
  /** Soft delete tombstone for sync (ISO). */
  deletedAt?: string | null;
  status: TradeStatus;
  notes: string;
  /** Long: bought lower; short: profit when price falls (simplified journal). */
  position: 'long' | 'short';
}
