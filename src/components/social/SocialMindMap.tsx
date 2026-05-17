import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Loader2,
  Lock,
  RefreshCw,
  Send,
  Share2,
  ShieldCheck,
} from 'lucide-react';
import { isAdminSession } from '../../lib/adminAccess';
import { supabase, supabaseEnabled } from '../../lib/supabaseClient';
import { enqueueSocialPost, startSocialOAuth, syncSocialAnalytics } from '../../lib/social/api';
import { loadSocialDashboardData } from '../../lib/social/dashboard';
import {
  SOCIAL_PROVIDER_CAPABILITIES,
  SOCIAL_PROVIDER_ORDER,
  validateSocialDraft,
} from '../../lib/social/providers';
import type { SocialDashboardData, SocialProvider } from '../../types/social';
import MindMapCloseButton from '../mind-map/MindMapCloseButton';

interface SocialMindMapProps {
  onClose: () => void;
}

function fmtNumber(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return new Intl.NumberFormat(undefined, { notation: v > 9999 ? 'compact' : 'standard' }).format(v);
}

function statusTone(status: string): string {
  if (status === 'connected' || status === 'published') return 'border-green-700 bg-green-50 text-green-800';
  if (status === 'needs_reauth' || status === 'queued' || status === 'scheduled') {
    return 'border-yellow-700 bg-yellow-50 text-yellow-800';
  }
  if (status === 'error' || status === 'failed' || status === 'partial_failed') {
    return 'border-red-700 bg-red-50 text-red-800';
  }
  return 'border-gray-300 bg-gray-50 text-gray-700';
}

export default function SocialMindMap({ onClose }: SocialMindMapProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [data, setData] = useState<SocialDashboardData | null>(null);
  const [dataSource, setDataSource] = useState<'supabase' | 'demo'>('demo');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [body, setBody] = useState('GM MW3 fam. New update is live from the SOCIAL command center.');
  const [scheduledAt, setScheduledAt] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedProviders, setSelectedProviders] = useState<SocialProvider[]>([
    'instagram',
    'facebook',
    'x',
  ]);

  const isAdmin = isAdminSession(session?.user);

  const refreshDashboard = async () => {
    setLoading(true);
    const result = await loadSocialDashboardData();
    setData(result.data);
    setDataSource(result.source);
    setMessage(result.error ? `Using demo data: ${result.error}` : null);
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;
    async function init() {
      if (supabaseEnabled && supabase) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (mounted) setSession(sessionData.session);
        const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
          setSession(nextSession);
        });
        await refreshDashboard();
        return () => sub.subscription.unsubscribe();
      }
      await refreshDashboard();
      return undefined;
    }

    let cleanup: (() => void) | undefined;
    void init().then((fn) => {
      cleanup = fn;
    });

    return () => {
      mounted = false;
      cleanup?.();
    };
  }, []);

  const warnings = useMemo(() => {
    return selectedProviders.flatMap((provider) => validateSocialDraft(provider, body, 0));
  }, [body, selectedProviders]);

  const totals = useMemo(() => {
    const analytics = data?.analytics ?? [];
    return analytics.reduce(
      (acc, row) => ({
        impressions: acc.impressions + (row.impressions ?? row.views ?? 0),
        likes: acc.likes + (row.likes ?? 0),
        comments: acc.comments + (row.comments ?? 0),
        shares: acc.shares + (row.shares ?? 0),
      }),
      { impressions: 0, likes: 0, comments: 0, shares: 0 }
    );
  }, [data]);

  const toggleProvider = (provider: SocialProvider) => {
    setSelectedProviders((prev) =>
      prev.includes(provider) ? prev.filter((x) => x !== provider) : [...prev, provider]
    );
  };

  const connectProvider = async (provider: SocialProvider) => {
    setBusyAction(`connect-${provider}`);
    setMessage(null);
    try {
      const authUrl = await startSocialOAuth(provider);
      window.location.href = authUrl;
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not start provider connection.');
    } finally {
      setBusyAction(null);
    }
  };

  const publishDraft = async () => {
    setBusyAction('publish');
    setMessage(null);
    try {
      const result = await enqueueSocialPost({
        body,
        providers: selectedProviders,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      });
      setMessage(`Publish jobs created for post ${result.postId}.`);
      await refreshDashboard();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not enqueue social post.');
    } finally {
      setBusyAction(null);
    }
  };

  const syncStats = async () => {
    setBusyAction('analytics');
    setMessage(null);
    try {
      await syncSocialAnalytics();
      setMessage('Analytics sync queued.');
      await refreshDashboard();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not sync analytics.');
    } finally {
      setBusyAction(null);
    }
  };

  const signIn = async () => {
    if (!supabaseEnabled || !supabase) return;
    setBusyAction('signin');
    setMessage(null);
    try {
      const res = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (res.error) throw res.error;
      setSession(res.data.session);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not sign in.');
    } finally {
      setBusyAction(null);
    }
  };

  const signOut = async () => {
    if (!supabaseEnabled || !supabase) return;
    setBusyAction('signout');
    setMessage(null);
    try {
      await supabase.auth.signOut();
      setSession(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not sign out.');
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <MindMapCloseButton onClose={onClose} />

      <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-20 sm:px-6 lg:px-8">
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em]">
              <Share2 className="h-4 w-4" />
              SOCIAL Admin
            </div>

            <h1 className="max-w-4xl text-4xl font-black uppercase tracking-tight sm:text-6xl">
              Cross-post command center for MW3.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-gray-600 sm:text-lg">
              Connect official provider APIs, create one campaign post, publish jobs per platform,
              and pull performance snapshots back into one dashboard.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void refreshDashboard()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide hover:bg-black hover:text-white disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => void syncStats()}
                disabled={!isAdmin || busyAction === 'analytics'}
                className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-black px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-gray-900 disabled:opacity-50"
              >
                {busyAction === 'analytics' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <BarChart3 className="h-4 w-4" />
                )}
                Sync stats
              </button>
            </div>
          </div>

          <aside className="rounded-3xl border-2 border-black bg-black p-6 text-white shadow-2xl">
            <div className="flex items-start gap-3">
              {isAdmin ? (
                <CheckCircle2 className="mt-1 h-6 w-6 text-green-300" />
              ) : (
                <Lock className="mt-1 h-6 w-6 text-yellow-300" />
              )}
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Access</p>
                <h2 className="mt-1 text-2xl font-black uppercase">
                  {isAdmin ? 'Admin enabled' : 'Admin required'}
                </h2>
                <p className="mt-3 text-sm leading-6 text-gray-300">
                  {supabaseEnabled
                    ? 'Sign in with the configured admin email before connecting providers or publishing.'
                    : 'Supabase env is missing, so this page is showing the dashboard in demo mode.'}
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Metric label="Reach" value={fmtNumber(totals.impressions)} />
              <Metric label="Likes" value={fmtNumber(totals.likes)} />
              <Metric label="Comments" value={fmtNumber(totals.comments)} />
              <Metric label="Shares" value={fmtNumber(totals.shares)} />
            </div>

            <div className="mt-4 rounded-2xl border border-white/15 bg-white/5 p-3 text-xs text-gray-300">
              Data source: <span className="font-bold uppercase text-white">{dataSource}</span>
            </div>

            {supabaseEnabled && (
              <div className="mt-4 rounded-2xl border border-white/15 bg-white/5 p-4">
                {session ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-gray-300">
                      Signed in as <span className="font-bold text-white">{session.user.email}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void signOut()}
                      disabled={busyAction === 'signout'}
                      className="rounded-full border border-white/30 px-3 py-2 text-xs font-bold uppercase hover:bg-white hover:text-black disabled:opacity-50"
                    >
                      Sign out
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <input
                      value={email}
                      onChange={(ev) => setEmail(ev.target.value)}
                      type="email"
                      placeholder="admin email"
                      className="rounded-xl border border-white/20 bg-black px-3 py-2 text-sm text-white placeholder:text-gray-500"
                    />
                    <input
                      value={password}
                      onChange={(ev) => setPassword(ev.target.value)}
                      type="password"
                      placeholder="password"
                      className="rounded-xl border border-white/20 bg-black px-3 py-2 text-sm text-white placeholder:text-gray-500"
                    />
                    <button
                      type="button"
                      onClick={() => void signIn()}
                      disabled={busyAction === 'signin' || !email.trim() || !password}
                      className="rounded-full border border-white/30 px-3 py-2 text-xs font-bold uppercase hover:bg-white hover:text-black disabled:opacity-50"
                    >
                      Sign in
                    </button>
                  </div>
                )}
              </div>
            )}
          </aside>
        </section>

        {message && (
          <div className="flex items-start gap-3 rounded-2xl border-2 border-yellow-700 bg-yellow-50 p-4 text-sm text-yellow-900">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{message}</p>
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-5">
          {SOCIAL_PROVIDER_ORDER.map((provider) => {
            const account = data?.accounts.find((x) => x.provider === provider);
            const capability = SOCIAL_PROVIDER_CAPABILITIES[provider];
            return (
              <article key={provider} className="rounded-3xl border-2 border-black bg-white p-4 shadow-lg">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-black uppercase tracking-wide">{capability.label}</h2>
                  <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${statusTone(account?.status ?? 'not_connected')}`}>
                    {account?.status.replace(/_/g, ' ') ?? 'not connected'}
                  </span>
                </div>
                <p className="mt-3 text-xs leading-5 text-gray-600">
                  {account?.handle ?? capability.contentTypes.join(' / ')}
                </p>
                <button
                  type="button"
                  onClick={() => void connectProvider(provider)}
                  disabled={!isAdmin || busyAction === `connect-${provider}`}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-black px-3 py-2 text-xs font-bold uppercase tracking-wide hover:bg-black hover:text-white disabled:opacity-50"
                >
                  {busyAction === `connect-${provider}` ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                  Connect
                </button>
              </article>
            );
          })}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
          <article className="rounded-3xl border-2 border-black bg-white p-6 shadow-lg">
            <div className="mb-5 flex items-center gap-2">
              <Send className="h-5 w-5" />
              <h2 className="text-2xl font-black uppercase tracking-wide">Composer</h2>
            </div>

            <textarea
              value={body}
              onChange={(ev) => setBody(ev.target.value)}
              rows={6}
              className="w-full rounded-2xl border-2 border-black p-4 text-sm leading-6 outline-none focus:ring-2 focus:ring-black/20"
              placeholder="Write once, then override per platform later..."
            />

            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(ev) => setScheduledAt(ev.target.value)}
                className="rounded-2xl border-2 border-black px-4 py-3 text-sm"
                aria-label="Schedule post"
              />
              <button
                type="button"
                onClick={() => void publishDraft()}
                disabled={!isAdmin || selectedProviders.length === 0 || !body.trim() || busyAction === 'publish'}
                className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-black bg-black px-5 py-3 text-xs font-bold uppercase tracking-wide text-white hover:bg-gray-900 disabled:opacity-50"
              >
                {busyAction === 'publish' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CalendarClock className="h-4 w-4" />
                )}
                Create jobs
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {SOCIAL_PROVIDER_ORDER.map((provider) => (
                <button
                  type="button"
                  key={provider}
                  onClick={() => toggleProvider(provider)}
                  className={`rounded-full border-2 px-3 py-2 text-xs font-bold uppercase tracking-wide ${
                    selectedProviders.includes(provider)
                      ? 'border-black bg-black text-white'
                      : 'border-gray-300 bg-white text-gray-600'
                  }`}
                >
                  {SOCIAL_PROVIDER_CAPABILITIES[provider].shortLabel}
                </button>
              ))}
            </div>

            {warnings.length > 0 && (
              <div className="mt-4 rounded-2xl border border-yellow-700 bg-yellow-50 p-4 text-xs leading-5 text-yellow-900">
                {warnings.map((warning) => (
                  <div key={warning}>{warning}</div>
                ))}
              </div>
            )}
          </article>

          <article className="rounded-3xl border-2 border-black bg-white p-6 shadow-lg">
            <div className="mb-5 flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              <h2 className="text-2xl font-black uppercase tracking-wide">Queue</h2>
            </div>

            <div className="space-y-3">
              {(data?.targets ?? []).slice(0, 8).map((target) => (
                <div key={target.id} className="rounded-2xl border border-black/10 bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold uppercase tracking-wide">
                      {SOCIAL_PROVIDER_CAPABILITIES[target.provider].label}
                    </div>
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${statusTone(target.status)}`}>
                      {target.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-gray-600">
                    Attempts: {target.attempts}
                    {target.error ? ` · ${target.error}` : ''}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
      <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-400">{label}</div>
      <div className="mt-2 text-2xl font-black">{value}</div>
    </div>
  );
}
