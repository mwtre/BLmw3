export type SocialProvider = 'x' | 'instagram' | 'facebook' | 'youtube' | 'tiktok';

export const providers: Record<
  SocialProvider,
  {
    label: string;
    authBaseUrl: string;
    tokenUrl: string;
    scopes: string[];
    envClientId: string;
    envClientSecret: string;
  }
> = {
  instagram: {
    label: 'Instagram',
    authBaseUrl: 'https://www.facebook.com/v20.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v20.0/oauth/access_token',
    scopes: ['instagram_business_content_publish', 'instagram_business_manage_insights', 'pages_read_engagement'],
    envClientId: 'META_CLIENT_ID',
    envClientSecret: 'META_CLIENT_SECRET',
  },
  facebook: {
    label: 'Facebook',
    authBaseUrl: 'https://www.facebook.com/v20.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v20.0/oauth/access_token',
    scopes: ['pages_manage_posts', 'pages_read_engagement', 'read_insights'],
    envClientId: 'META_CLIENT_ID',
    envClientSecret: 'META_CLIENT_SECRET',
  },
  youtube: {
    label: 'YouTube',
    authBaseUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/yt-analytics.readonly'],
    envClientId: 'YOUTUBE_CLIENT_ID',
    envClientSecret: 'YOUTUBE_CLIENT_SECRET',
  },
  x: {
    label: 'X / Twitter',
    authBaseUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    scopes: ['tweet.write', 'tweet.read', 'users.read', 'offline.access'],
    envClientId: 'X_CLIENT_ID',
    envClientSecret: 'X_CLIENT_SECRET',
  },
  tiktok: {
    label: 'TikTok',
    authBaseUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
    scopes: ['video.publish', 'video.upload'],
    envClientId: 'TIKTOK_CLIENT_ID',
    envClientSecret: 'TIKTOK_CLIENT_SECRET',
  },
};

export function assertProvider(provider: string): SocialProvider {
  if (provider in providers) return provider as SocialProvider;
  throw new Error(`Unsupported social provider: ${provider}`);
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
    },
  });
}

export function readSecret(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing server secret ${name}`);
  return value;
}
