/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_SYNC_ENABLED?: string;
  readonly VITE_APP_BUILD?: string;
  /** Email allowed to edit/import/sync trades (single-owner mode). */
  readonly VITE_ADMIN_EMAIL?: string;
  /** Optional CORS proxy base for browser fetches. */
  readonly VITE_CORS_PROXY_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
