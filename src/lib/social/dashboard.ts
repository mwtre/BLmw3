import type {
  SocialAccount,
  SocialAnalyticsSnapshot,
  SocialDashboardData,
  SocialPost,
  SocialPostTarget,
  SocialProvider,
} from '../../types/social';
import { supabase, supabaseEnabled } from '../supabaseClient';
import { SOCIAL_PROVIDER_ORDER, providerLabel } from './providers';

type SocialAccountRow = {
  id: string;
  provider: SocialProvider;
  display_name: string;
  handle: string | null;
  avatar_url: string | null;
  status: SocialAccount['status'];
  scopes: string[] | null;
  last_connected_at: string | null;
  last_sync_at: string | null;
  error: string | null;
};

type SocialPostRow = {
  id: string;
  title: string | null;
  body: string;
  status: SocialPost['status'];
  scheduled_at: string | null;
  published_at: string | null;
  media_asset_ids: string[] | null;
  campaign: string | null;
  created_at: string;
  updated_at: string;
};

type SocialPostTargetRow = {
  id: string;
  post_id: string;
  account_id: string | null;
  provider: SocialProvider;
  body_override: string | null;
  media_asset_ids: string[] | null;
  status: SocialPostTarget['status'];
  provider_post_id: string | null;
  provider_post_url: string | null;
  error: string | null;
  attempts: number | null;
  last_attempt_at: string | null;
  published_at: string | null;
};

type SocialAnalyticsRow = {
  id: string;
  target_id: string;
  provider: SocialProvider;
  captured_at: string;
  impressions: number | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  clicks: number | null;
  saves: number | null;
};

function demoAccounts(): SocialAccount[] {
  return SOCIAL_PROVIDER_ORDER.map((provider) => ({
    id: `demo-${provider}`,
    provider,
    displayName: providerLabel(provider),
    handle: provider === 'x' ? '@mw3' : null,
    avatarUrl: null,
    status: provider === 'instagram' || provider === 'facebook' ? 'needs_reauth' : 'not_connected',
    scopes: [],
    lastConnectedAt: null,
    lastSyncAt: null,
    error: null,
  }));
}

function demoPosts(): SocialPost[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'demo-post-1',
      title: 'Weekly MW3 drop',
      body: 'Draft once, adapt per network, publish everywhere from SOCIAL.',
      status: 'draft',
      scheduledAt: null,
      publishedAt: null,
      mediaAssetIds: [],
      campaign: 'SOCIAL MVP',
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function demoTargets(): SocialPostTarget[] {
  return SOCIAL_PROVIDER_ORDER.map((provider) => ({
    id: `demo-target-${provider}`,
    postId: 'demo-post-1',
    accountId: `demo-${provider}`,
    provider,
    bodyOverride: null,
    mediaAssetIds: null,
    status: 'queued',
    providerPostId: null,
    providerPostUrl: null,
    error: null,
    attempts: 0,
    lastAttemptAt: null,
    publishedAt: null,
  }));
}

function demoAnalytics(): SocialAnalyticsSnapshot[] {
  return [
    {
      id: 'demo-analytics-1',
      targetId: 'demo-target-instagram',
      provider: 'instagram',
      capturedAt: new Date().toISOString(),
      impressions: 0,
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      clicks: null,
      saves: 0,
    },
  ];
}

export function fallbackSocialDashboardData(): SocialDashboardData {
  return {
    accounts: demoAccounts(),
    posts: demoPosts(),
    targets: demoTargets(),
    analytics: demoAnalytics(),
  };
}

export async function loadSocialDashboardData(): Promise<{
  data: SocialDashboardData;
  source: 'supabase' | 'demo';
  error?: string;
}> {
  if (!supabaseEnabled || !supabase) {
    return { data: fallbackSocialDashboardData(), source: 'demo' };
  }

  try {
    const [accountsRes, postsRes, targetsRes, analyticsRes] = await Promise.all([
      supabase.from('social_accounts').select('*').order('provider', { ascending: true }),
      supabase.from('social_posts').select('*').order('updated_at', { ascending: false }).limit(25),
      supabase.from('social_post_targets').select('*').order('updated_at', { ascending: false }).limit(100),
      supabase
        .from('social_analytics_snapshots')
        .select('*')
        .order('captured_at', { ascending: false })
        .limit(100),
    ]);

    const firstError =
      accountsRes.error ?? postsRes.error ?? targetsRes.error ?? analyticsRes.error ?? null;
    if (firstError) throw new Error(firstError.message);

    const accounts = ((accountsRes.data ?? []) as SocialAccountRow[]).map((row) => ({
      id: row.id,
      provider: row.provider,
      displayName: row.display_name,
      handle: row.handle,
      avatarUrl: row.avatar_url,
      status: row.status,
      scopes: row.scopes ?? [],
      lastConnectedAt: row.last_connected_at,
      lastSyncAt: row.last_sync_at,
      error: row.error,
    }));

    const posts = ((postsRes.data ?? []) as SocialPostRow[]).map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      status: row.status,
      scheduledAt: row.scheduled_at,
      publishedAt: row.published_at,
      mediaAssetIds: row.media_asset_ids ?? [],
      campaign: row.campaign,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    const targets = ((targetsRes.data ?? []) as SocialPostTargetRow[]).map((row) => ({
      id: row.id,
      postId: row.post_id,
      accountId: row.account_id,
      provider: row.provider,
      bodyOverride: row.body_override,
      mediaAssetIds: row.media_asset_ids,
      status: row.status,
      providerPostId: row.provider_post_id,
      providerPostUrl: row.provider_post_url,
      error: row.error,
      attempts: row.attempts ?? 0,
      lastAttemptAt: row.last_attempt_at,
      publishedAt: row.published_at,
    }));

    const analytics = ((analyticsRes.data ?? []) as SocialAnalyticsRow[]).map((row) => ({
      id: row.id,
      targetId: row.target_id,
      provider: row.provider,
      capturedAt: row.captured_at,
      impressions: row.impressions,
      views: row.views,
      likes: row.likes,
      comments: row.comments,
      shares: row.shares,
      clicks: row.clicks,
      saves: row.saves,
    }));

    return { data: { accounts, posts, targets, analytics }, source: 'supabase' };
  } catch (err) {
    return {
      data: fallbackSocialDashboardData(),
      source: 'demo',
      error: err instanceof Error ? err.message : 'Could not load social dashboard',
    };
  }
}
