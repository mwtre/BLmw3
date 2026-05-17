export type SocialProvider = 'x' | 'instagram' | 'facebook' | 'youtube' | 'tiktok';

export type SocialAccountStatus = 'connected' | 'needs_reauth' | 'not_connected' | 'error';
export type SocialPostStatus =
  | 'draft'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'partial_failed'
  | 'failed';
export type SocialTargetStatus = 'queued' | 'publishing' | 'published' | 'failed' | 'skipped';
export type SocialMediaType = 'image' | 'video';

export interface SocialAccount {
  id: string;
  provider: SocialProvider;
  displayName: string;
  handle: string | null;
  avatarUrl: string | null;
  status: SocialAccountStatus;
  scopes: string[];
  lastConnectedAt: string | null;
  lastSyncAt: string | null;
  error: string | null;
}

export interface SocialMediaAsset {
  id: string;
  storagePath: string;
  publicUrl: string | null;
  mediaType: SocialMediaType;
  mimeType: string | null;
  altText: string | null;
}

export interface SocialPost {
  id: string;
  title: string | null;
  body: string;
  status: SocialPostStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  mediaAssetIds: string[];
  campaign: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SocialPostTarget {
  id: string;
  postId: string;
  accountId: string | null;
  provider: SocialProvider;
  bodyOverride: string | null;
  mediaAssetIds: string[] | null;
  status: SocialTargetStatus;
  providerPostId: string | null;
  providerPostUrl: string | null;
  error: string | null;
  attempts: number;
  lastAttemptAt: string | null;
  publishedAt: string | null;
}

export interface SocialAnalyticsSnapshot {
  id: string;
  targetId: string;
  provider: SocialProvider;
  capturedAt: string;
  impressions: number | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  clicks: number | null;
  saves: number | null;
}

export interface SocialProviderCapability {
  provider: SocialProvider;
  label: string;
  shortLabel: string;
  publishMode: 'official_api' | 'review_required';
  contentTypes: string[];
  maxTextLength: number | null;
  mediaRequired: boolean;
  notes: string[];
  scopes: string[];
}

export interface SocialDashboardData {
  accounts: SocialAccount[];
  posts: SocialPost[];
  targets: SocialPostTarget[];
  analytics: SocialAnalyticsSnapshot[];
}
