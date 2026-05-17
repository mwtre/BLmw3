import { assertProvider, json, providers, readSecret } from '../_shared/socialProviders.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true });

  try {
    const body = await req.json();
    const action = String(body.action ?? '');
    const provider = assertProvider(String(body.provider ?? ''));
    const config = providers[provider];

    if (action !== 'start') {
      return json({ error: 'Unsupported OAuth action.' }, 400);
    }

    const clientId = readSecret(config.envClientId);
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/social-oauth-callback`;
    const state = crypto.randomUUID();
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state: JSON.stringify({
        provider,
        nonce: state,
        redirectTo: String(body.redirectTo ?? ''),
      }),
    });

    if (provider === 'x') {
      params.set('code_challenge', 'mw3_social_pkce_server_challenge');
      params.set('code_challenge_method', 'plain');
    }

    if (provider === 'youtube') {
      params.set('access_type', 'offline');
      params.set('prompt', 'consent');
    }

    return json({ authUrl: `${config.authBaseUrl}?${params.toString()}` });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'OAuth failed.' }, 400);
  }
});
