import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { json } from '../_shared/socialProviders.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true });

  try {
    const body = await req.json();
    if (String(body.action ?? '') !== 'sync') {
      return json({ error: 'Unsupported analytics action.' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const authHeader = req.headers.get('authorization') ?? '';
    const client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData.user) return json({ error: 'Sign in before syncing analytics.' }, 401);

    const { data: targets, error: targetsError } = await client
      .from('social_post_targets')
      .select('id,provider,status')
      .eq('status', 'published')
      .limit(50);
    if (targetsError) throw targetsError;

    const rows = (targets ?? []).map((target) => ({
      target_id: target.id,
      provider: target.provider,
      captured_at: new Date().toISOString(),
      impressions: 0,
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      clicks: null,
      saves: null,
      raw: { source: 'placeholder_until_provider_metrics_are_enabled' },
    }));

    if (rows.length > 0) {
      const { error: insertError } = await client.from('social_analytics_snapshots').insert(rows);
      if (insertError) throw insertError;
    }

    return json({ ok: true, snapshots: rows.length });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Could not sync analytics.' }, 400);
  }
});
