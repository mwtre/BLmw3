/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_SYNC_ENABLED?: string;
  readonly VITE_APP_BUILD?: string;
  /** Email allowed to edit/import/sync trades (single-owner mode). */
  readonly VITE_ADMIN_EMAIL?: string;
  /** CoinPaprika Pro API key (optional; raises limits). */
  readonly VITE_COINPAPRICA_API_KEY?: string;
  /** Override API base, default api.coinpaprika.com/v1 or api-pro when key set. */
  readonly VITE_COINPAPRICA_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
