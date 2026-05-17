import type { SocialProvider, SocialProviderCapability } from '../../types/social';

export const SOCIAL_PROVIDER_ORDER: SocialProvider[] = [
  'instagram',
  'facebook',
  'youtube',
  'x',
  'tiktok',
];

export const SOCIAL_PROVIDER_CAPABILITIES: Record<SocialProvider, SocialProviderCapability> = {
  instagram: {
    provider: 'instagram',
    label: 'Instagram',
    shortLabel: 'IG',
    publishMode: 'review_required',
    contentTypes: ['image', 'reel', 'carousel'],
    maxTextLength: 2_200,
    mediaRequired: true,
    scopes: ['instagram_business_content_publish', 'instagram_business_manage_insights'],
    notes: [
      'Requires a professional Instagram account connected through Meta.',
      'Media must be hosted before publish.',
      'Publishing is capped by Meta platform limits.',
    ],
  },
  facebook: {
    provider: 'facebook',
    label: 'Facebook',
    shortLabel: 'FB',
    publishMode: 'review_required',
    contentTypes: ['page_post', 'photo', 'video'],
    maxTextLength: 63_206,
    mediaRequired: false,
    scopes: ['pages_manage_posts', 'pages_read_engagement', 'read_insights'],
    notes: [
      'Page publishing is the supported v1 path.',
      'Personal profile posting is not a reliable API target.',
    ],
  },
  youtube: {
    provider: 'youtube',
    label: 'YouTube',
    shortLabel: 'YT',
    publishMode: 'review_required',
    contentTypes: ['video', 'short'],
    maxTextLength: 5_000,
    mediaRequired: true,
    scopes: ['youtube.upload', 'yt-analytics.readonly'],
    notes: [
      'Uploads consume YouTube API quota.',
      'Public upload workflows may require Google compliance review.',
    ],
  },
  x: {
    provider: 'x',
    label: 'X / Twitter',
    shortLabel: 'X',
    publishMode: 'official_api',
    contentTypes: ['text', 'image', 'video'],
    maxTextLength: 280,
    mediaRequired: false,
    scopes: ['tweet.write', 'tweet.read', 'users.read', 'offline.access'],
    notes: [
      'API access is paid and usage-based.',
      'Long posts and richer analytics depend on account/API tier.',
    ],
  },
  tiktok: {
    provider: 'tiktok',
    label: 'TikTok',
    shortLabel: 'TT',
    publishMode: 'review_required',
    contentTypes: ['video'],
    maxTextLength: 2_200,
    mediaRequired: true,
    scopes: ['video.publish', 'video.upload'],
    notes: [
      'Direct Post API requires TikTok app review.',
      'Unaudited apps are limited and may only publish private videos.',
    ],
  },
};

export function providerLabel(provider: SocialProvider): string {
  return SOCIAL_PROVIDER_CAPABILITIES[provider].label;
}

export function validateSocialDraft(
  provider: SocialProvider,
  body: string,
  mediaCount: number
): string[] {
  const capability = SOCIAL_PROVIDER_CAPABILITIES[provider];
  const warnings: string[] = [];
  const textLength = body.trim().length;

  if (capability.maxTextLength && textLength > capability.maxTextLength) {
    warnings.push(`${capability.label} text is over ${capability.maxTextLength} characters.`);
  }

  if (capability.mediaRequired && mediaCount === 0) {
    warnings.push(`${capability.label} requires media before publishing.`);
  }

  if (provider === 'youtube' && mediaCount > 1) {
    warnings.push('YouTube v1 publishes one video per job.');
  }

  return warnings;
}
