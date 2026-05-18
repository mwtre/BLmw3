import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  Heart,
  Home,
  Loader2,
  LogIn,
  LogOut,
  MessageCircle,
  Repeat2,
  Search,
  Send,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { fetchOpenTradeUsdPrices, formatCoingeckoError } from '../../lib/coingecko';
import { supabase, supabaseEnabled } from '../../lib/supabaseClient';
import MindMapCloseButton from '../mind-map/MindMapCloseButton';

interface SocialNetworkMindMapProps {
  onClose: () => void;
}

interface NetworkPost {
  id: string;
  userId: string;
  authorName: string;
  handle: string;
  body: string;
  likesCount: number;
  repliesCount: number;
  repostsCount: number;
  createdAt: string;
}

interface MentionMarket {
  symbol: string;
  price: number | null;
  tone: 'ready' | 'missing';
}

type NetworkPostRow = {
  id: string;
  user_id: string;
  author_name: string;
  handle: string;
  body: string;
  likes_count: number | null;
  replies_count: number | null;
  reposts_count: number | null;
  created_at: string;
};

const DEMO_POSTS: NetworkPost[] = [
  {
    id: 'demo-1',
    userId: 'demo',
    authorName: 'MW3 Events',
    handle: '@mw3events',
    body: 'Amsterdam and Zurich events are live. Cocktails, blockchain games, and trading lessons. Watching $BTC and $ETH for the next session.',
    likesCount: 18,
    repliesCount: 4,
    repostsCount: 7,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    userId: 'demo',
    authorName: 'MW3 Trading Desk',
    handle: '@mw3trades',
    body: 'Rule for today: if you cannot explain the invalidation, you do not have a trade. You have a wish. $SOL looks interesting only if structure holds.',
    likesCount: 42,
    repliesCount: 9,
    repostsCount: 13,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
];

function extractCashtags(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const match of text.matchAll(/(?:^|[^\w])\$([A-Za-z][A-Za-z0-9]{1,15})\b/g)) {
    const symbol = match[1]?.toUpperCase();
    if (!symbol || seen.has(symbol)) continue;
    seen.add(symbol);
    out.push(symbol);
  }
  return out.slice(0, 6);
}

function fmtUsd(price: number | null): string {
  if (price == null || !Number.isFinite(price)) return 'Price unavailable';
  if (price >= 1000) {
    return price.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  }
  if (price >= 1) {
    return price.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
  }
  return price.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumSignificantDigits: 4 });
}

function toHandle(email: string | null | undefined): string {
  const name = email?.split('@')[0]?.replace(/[^a-z0-9_]/gi, '').toLowerCase() || 'mw3user';
  return `@${name.slice(0, 18)}`;
}

function displayName(session: Session | null): string {
  const metaName = session?.user.user_metadata?.name;
  if (typeof metaName === 'string' && metaName.trim()) return metaName.trim();
  return session?.user.email?.split('@')[0] ?? 'MW3 Member';
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 'now';
  const min = Math.floor(ms / 60_000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function normalizePost(row: NetworkPostRow): NetworkPost {
  return {
    id: row.id,
    userId: row.user_id,
    authorName: row.author_name,
    handle: row.handle,
    body: row.body,
    likesCount: row.likes_count ?? 0,
    repliesCount: row.replies_count ?? 0,
    repostsCount: row.reposts_count ?? 0,
    createdAt: row.created_at,
  };
}

function MarketMentionCards({
  symbols,
  marketBySymbol,
}: {
  symbols: string[];
  marketBySymbol: Record<string, MentionMarket>;
}) {
  if (symbols.length === 0) return null;

  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {symbols.map((symbol) => {
        const market = marketBySymbol[symbol];
        return (
          <div
            key={symbol}
            className="overflow-hidden rounded-2xl border border-black/10 bg-white"
          >
            <div className="flex items-center justify-between gap-3 p-3">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                  ${symbol}
                </div>
                <div className="mt-1 text-lg font-black">{fmtUsd(market?.price ?? null)}</div>
              </div>
              <div className="rounded-full border border-black px-2 py-1 text-[10px] font-black uppercase">
                {market?.tone === 'ready' ? 'Live' : 'Search'}
              </div>
            </div>
            <div className="flex h-10 items-end gap-1 bg-gray-50 px-3 pb-2">
              {[28, 18, 24, 14, 30, 22, 35, 26, 38, 32].map((height, index) => (
                <div
                  key={`${symbol}-${index}`}
                  className="flex-1 rounded-t bg-black"
                  style={{ height: `${height}px`, opacity: 0.18 + index * 0.06 }}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function SocialNetworkMindMap({ onClose }: SocialNetworkMindMapProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [posts, setPosts] = useState<NetworkPost[]>(DEMO_POSTS);
  const [body, setBody] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [marketBySymbol, setMarketBySymbol] = useState<Record<string, MentionMarket>>({});
  const [marketMessage, setMarketMessage] = useState<string | null>(null);

  const remaining = 500 - body.length;

  const trending = useMemo(
    () => ['$BTC', '$ETH', '$SOL', '#PerpsSafety', '#AmsterdamAlpha'],
    []
  );

  const visibleSymbols = useMemo(() => {
    const seen = new Set<string>();
    for (const post of posts) {
      for (const symbol of extractCashtags(post.body)) seen.add(symbol);
    }
    return [...seen].slice(0, 16);
  }, [posts]);

  const loadPosts = useCallback(async () => {
    if (!supabaseEnabled || !supabase) {
      setPosts(DEMO_POSTS);
      setMessage('Supabase is disabled. Showing demo timeline.');
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('social_network_posts')
      .select('id,user_id,author_name,handle,body,likes_count,replies_count,reposts_count,created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      setPosts(DEMO_POSTS);
      setMessage(`Timeline table not ready: ${error.message}`);
    } else {
      setPosts(((data ?? []) as NetworkPostRow[]).map(normalizePost));
      setMessage(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    async function init() {
      if (supabaseEnabled && supabase) {
        const { data } = await supabase.auth.getSession();
        if (mounted) setSession(data.session);
        const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
          setSession(nextSession);
        });
        await loadPosts();
        return () => sub.subscription.unsubscribe();
      }
      await loadPosts();
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
  }, [loadPosts]);

  useEffect(() => {
    if (visibleSymbols.length === 0) {
      setMarketBySymbol({});
      setMarketMessage(null);
      return;
    }

    const controller = new AbortController();
    const rows = visibleSymbols.map((symbol) => ({
      tradeId: `network-${symbol}`,
      coinGeckoId: '',
      symbol,
    }));

    void fetchOpenTradeUsdPrices(rows, controller.signal)
      .then((prices) => {
        const next: Record<string, MentionMarket> = {};
        for (const symbol of visibleSymbols) {
          const price = prices[`__trade:network-${symbol}`] ?? null;
          next[symbol] = {
            symbol,
            price,
            tone: typeof price === 'number' && Number.isFinite(price) ? 'ready' : 'missing',
          };
        }
        setMarketBySymbol(next);
        setMarketMessage(null);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setMarketMessage(formatCoingeckoError(err));
      });

    return () => controller.abort();
  }, [visibleSymbols]);

  const publishPost = async () => {
    const text = body.trim();
    if (!text || !session || !supabaseEnabled || !supabase) return;
    setBusy('post');
    setMessage(null);

    const { error } = await supabase.from('social_network_posts').insert({
      user_id: session.user.id,
      author_email: session.user.email ?? null,
      author_name: displayName(session),
      handle: toHandle(session.user.email),
      body: text,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setBody('');
      await loadPosts();
    }
    setBusy(null);
  };

  const signIn = async () => {
    if (!supabaseEnabled || !supabase) return;
    setBusy('signin');
    setMessage(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) setMessage(error.message);
    else setSession(data.session);
    setBusy(null);
  };

  const signOut = async () => {
    if (!supabaseEnabled || !supabase) return;
    setBusy('signout');
    await supabase.auth.signOut();
    setSession(null);
    setBusy(null);
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <MindMapCloseButton onClose={onClose} />

      <main className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 gap-5 px-4 py-20 lg:grid-cols-[220px_minmax(0,1fr)_280px] lg:px-8">
        <aside className="hidden rounded-3xl border-2 border-black bg-white p-4 shadow-lg lg:block">
          <div className="mb-6 text-xl font-black uppercase tracking-tight">MW3 Network</div>
          {[
            { label: 'Home', icon: Home },
            { label: 'Explore', icon: Search },
            { label: 'Members', icon: UserRound },
            { label: 'Signals', icon: Sparkles },
          ].map((item) => (
            <div key={item.label} className="mb-2 flex items-center gap-3 rounded-full px-3 py-3 text-sm font-black uppercase tracking-wide hover:bg-gray-100">
              <item.icon className="h-5 w-5" />
              {item.label}
            </div>
          ))}
        </aside>

        <section className="min-w-0 overflow-hidden rounded-3xl border-2 border-black bg-white shadow-xl">
          <header className="sticky top-0 z-10 border-b-2 border-black bg-white/95 p-4 backdrop-blur">
            <div className="text-2xl font-black uppercase tracking-tight">Social Network</div>
            <p className="mt-1 text-sm text-gray-600">
              Post updates, read the MW3 timeline, and build the community inside the app.
            </p>
          </header>

          <div className="border-b border-black/10 p-4">
            {session ? (
              <div className="flex gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black text-sm font-black text-white">
                  {displayName(session).slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <textarea
                    value={body}
                    onChange={(ev) => setBody(ev.target.value.slice(0, 500))}
                    rows={3}
                    placeholder="What is happening in Web3?"
                    className="w-full resize-none border-0 text-lg outline-none placeholder:text-gray-400"
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className={`text-xs font-bold ${remaining < 40 ? 'text-red-600' : 'text-gray-500'}`}>
                      {remaining} characters left
                    </div>
                    <button
                      type="button"
                      onClick={() => void publishPost()}
                      disabled={!body.trim() || busy === 'post'}
                      className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2 text-xs font-black uppercase tracking-wide text-white disabled:opacity-50"
                    >
                      {busy === 'post' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Post
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-black/10 bg-gray-50 p-4">
                <div className="mb-3 font-black uppercase tracking-wide">Sign in to post</div>
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <input
                    value={email}
                    onChange={(ev) => setEmail(ev.target.value)}
                    type="email"
                    placeholder="email"
                    className="rounded-xl border-2 border-black px-3 py-2 text-sm"
                  />
                  <input
                    value={password}
                    onChange={(ev) => setPassword(ev.target.value)}
                    type="password"
                    placeholder="password"
                    className="rounded-xl border-2 border-black px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => void signIn()}
                    disabled={!email.trim() || !password || busy === 'signin'}
                    className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-black bg-black px-4 py-2 text-xs font-black uppercase tracking-wide text-white disabled:opacity-50"
                  >
                    {busy === 'signin' ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                    Login
                  </button>
                </div>
              </div>
            )}
          </div>

          {message && (
            <div className="border-b border-yellow-700 bg-yellow-50 px-4 py-3 text-sm font-semibold text-yellow-900">
              {message}
            </div>
          )}

          <div>
            {loading ? (
              <div className="flex items-center justify-center gap-2 p-10 text-sm font-bold uppercase tracking-wide text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading timeline
              </div>
            ) : (
              posts.map((post) => (
                <article key={post.id} className="border-b border-black/10 p-4 transition-colors hover:bg-gray-50">
                  <div className="flex gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black text-sm font-black text-white">
                      {post.authorName.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black">{post.authorName}</span>
                        <span className="text-sm text-gray-500">{post.handle}</span>
                        <span className="text-sm text-gray-400">· {relativeTime(post.createdAt)}</span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-6">{post.body}</p>
                      <MarketMentionCards
                        symbols={extractCashtags(post.body)}
                        marketBySymbol={marketBySymbol}
                      />
                      <div className="mt-4 flex max-w-md justify-between text-sm font-semibold text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <MessageCircle className="h-4 w-4" />
                          {post.repliesCount}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Repeat2 className="h-4 w-4" />
                          {post.repostsCount}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Heart className="h-4 w-4" />
                          {post.likesCount}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <aside className="rounded-3xl border-2 border-black bg-white p-4 shadow-lg">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.25em] text-gray-500">Account</div>
              <div className="mt-1 font-black">{session ? displayName(session) : 'Guest reader'}</div>
            </div>
            {session && (
              <button
                type="button"
                onClick={() => void signOut()}
                disabled={busy === 'signout'}
                className="rounded-full border-2 border-black p-2 hover:bg-black hover:text-white disabled:opacity-50"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="rounded-2xl bg-black p-4 text-white">
            <div className="text-sm font-black uppercase">Network rules</div>
            <p className="mt-2 text-xs leading-5 text-gray-300">
              Share alpha, event notes, trading lessons, wins, losses, and useful questions. Keep it clean and useful.
            </p>
          </div>

          <div className="mt-4 rounded-2xl border border-black/10 bg-gray-50 p-4">
            <div className="mb-3 text-sm font-black uppercase">Trending</div>
            <div className="space-y-2">
              {trending.map((tag) => (
                <div key={tag} className="rounded-xl bg-white px-3 py-2 text-sm font-bold">
                  {tag}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-black/10 bg-gray-50 p-4">
            <div className="mb-3 text-sm font-black uppercase">Market watch</div>
            {marketMessage && (
              <div className="mb-3 rounded-xl border border-yellow-700 bg-yellow-50 p-2 text-xs font-semibold text-yellow-900">
                {marketMessage}
              </div>
            )}
            <div className="space-y-2">
              {visibleSymbols.length === 0 ? (
                <div className="text-xs leading-5 text-gray-500">
                  Mention tokens with cashtags like $BTC or $SOL to attach prices to posts.
                </div>
              ) : (
                visibleSymbols.slice(0, 8).map((symbol) => (
                  <div key={symbol} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2">
                    <div className="font-black">${symbol}</div>
                    <div className="text-sm font-bold text-gray-600">
                      {fmtUsd(marketBySymbol[symbol]?.price ?? null)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
