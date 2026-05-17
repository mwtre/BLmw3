import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { assertProvider, json, type SocialProvider } from '../_shared/socialProviders.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true });

  try {
    const body = await req.json();
    if (String(body.action ?? '') !== 'enqueue') {
      return json({ error: 'Unsupported publish action.' }, 400);
    }

    const text = String(body.body ?? '').trim();
    if (!text) return json({ error: 'Post body is required.' }, 400);

    const providers = Array.isArray(body.providers)
      ? body.providers.map((provider: unknown) => assertProvider(String(provider)))
      : [];
    if (providers.length === 0) return json({ error: 'Choose at least one provider.' }, 400);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const authHeader = req.headers.get('authorization') ?? '';
    const client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData.user) return json({ error: 'Sign in before publishing.' }, 401);

    const now = new Date().toISOString();
    const { data: post, error: postError } = await client
      .from('social_posts')
      .insert({
        user_id: userData.user.id,
        body: text,
        status: body.scheduledAt ? 'scheduled' : 'draft',
        scheduled_at: body.scheduledAt ?? null,
        campaign: 'SOCIAL',
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single();

    if (postError) throw postError;

    const targetRows = providers.map((provider: SocialProvider) => ({
      post_id: post.id,
      provider,
      status: 'queued',
      created_at: now,
      updated_at: now,
    }));

    const { error: targetsError } = await client.from('social_post_targets').insert(targetRows);
    if (targetsError) throw targetsError;

    return json({ postId: post.id, targets: targetRows.length });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Could not enqueue post.' }, 400);
  }
});
