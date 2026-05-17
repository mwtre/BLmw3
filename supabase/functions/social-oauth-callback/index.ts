import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { assertProvider, json, providers, readSecret } from '../_shared/socialProviders.ts';

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const rawState = url.searchParams.get('state');
    if (!code || !rawState) throw new Error('Missing OAuth code or state.');

    const state = JSON.parse(rawState) as { provider?: string; redirectTo?: string };
    const provider = assertProvider(String(state.provider ?? ''));
    const config = providers[provider];

    const clientId = readSecret(config.envClientId);
    const clientSecret = readSecret(config.envClientSecret);
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/social-oauth-callback`;

    const tokenRes = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
        grant_type: 'authorization_code',
        code_verifier: provider === 'x' ? 'mw3_social_pkce_server_challenge' : '',
      }),
    });

    const tokenPayload = await tokenRes.json();
    if (!tokenRes.ok) {
      return json({ error: 'Provider token exchange failed.', details: tokenPayload }, 400);
    }

    const supabaseUrl = readSecret('SUPABASE_URL');
    const serviceRoleKey = readSecret('SUPABASE_SERVICE_ROLE_KEY');
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    await adminClient.from('social_audit_log').insert({
      action: 'oauth_token_received',
      provider,
      details: {
        token_type: tokenPayload.token_type ?? null,
        expires_in: tokenPayload.expires_in ?? null,
        scope: tokenPayload.scope ?? null,
      },
    });

    const redirectTo = state.redirectTo || '/';
    return Response.redirect(redirectTo, 302);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'OAuth callback failed.' }, 400);
  }
});
