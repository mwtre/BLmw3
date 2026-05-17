import type { SocialProvider } from '../../types/social';
import { supabase, supabaseEnabled } from '../supabaseClient';

export async function startSocialOAuth(provider: SocialProvider): Promise<string> {
  if (!supabaseEnabled || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase.functions.invoke<{ authUrl?: string; error?: string }>(
    'social-oauth',
    {
      body: {
        action: 'start',
        provider,
        redirectTo: window.location.href,
      },
    }
  );

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  if (!data?.authUrl) throw new Error('Provider did not return an authorization URL.');
  return data.authUrl;
}

export async function enqueueSocialPost(input: {
  body: string;
  providers: SocialProvider[];
  scheduledAt: string | null;
}): Promise<{ postId: string }> {
  if (!supabaseEnabled || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase.functions.invoke<{ postId?: string; error?: string }>(
    'social-publish',
    {
      body: {
        action: 'enqueue',
        ...input,
      },
    }
  );

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  if (!data?.postId) throw new Error('Publish function did not return a post id.');
  return { postId: data.postId };
}

export async function syncSocialAnalytics(): Promise<void> {
  if (!supabaseEnabled || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>(
    'social-analytics',
    {
      body: { action: 'sync' },
    }
  );

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}
