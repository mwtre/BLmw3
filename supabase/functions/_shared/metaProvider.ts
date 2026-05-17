export interface MetaPublishInput {
  provider: 'instagram' | 'facebook';
  accessToken: string;
  accountId: string;
  body: string;
  mediaUrl?: string;
}

export async function publishMetaPost(input: MetaPublishInput): Promise<{
  providerPostId: string;
  providerPostUrl: string | null;
}> {
  if (input.provider === 'instagram') {
    if (!input.mediaUrl) throw new Error('Instagram publishing requires hosted media.');

    const containerRes = await fetch(`https://graph.facebook.com/v20.0/${input.accountId}/media`, {
      method: 'POST',
      body: new URLSearchParams({
        image_url: input.mediaUrl,
        caption: input.body,
        access_token: input.accessToken,
      }),
    });
    const container = await containerRes.json();
    if (!containerRes.ok || !container.id) {
      throw new Error(`Instagram container failed: ${JSON.stringify(container)}`);
    }

    const publishRes = await fetch(`https://graph.facebook.com/v20.0/${input.accountId}/media_publish`, {
      method: 'POST',
      body: new URLSearchParams({
        creation_id: container.id,
        access_token: input.accessToken,
      }),
    });
    const publish = await publishRes.json();
    if (!publishRes.ok || !publish.id) {
      throw new Error(`Instagram publish failed: ${JSON.stringify(publish)}`);
    }

    return {
      providerPostId: String(publish.id),
      providerPostUrl: null,
    };
  }

  const postRes = await fetch(`https://graph.facebook.com/v20.0/${input.accountId}/feed`, {
    method: 'POST',
    body: new URLSearchParams({
      message: input.body,
      access_token: input.accessToken,
    }),
  });
  const post = await postRes.json();
  if (!postRes.ok || !post.id) {
    throw new Error(`Facebook publish failed: ${JSON.stringify(post)}`);
  }

  return {
    providerPostId: String(post.id),
    providerPostUrl: `https://www.facebook.com/${post.id}`,
  };
}

export async function fetchMetaInsights(input: {
  provider: 'instagram' | 'facebook';
  accessToken: string;
  providerPostId: string;
}): Promise<Record<string, number | null>> {
  const metrics =
    input.provider === 'instagram'
      ? 'impressions,reach,likes,comments,saved,shares'
      : 'post_impressions,post_reactions_like_total,post_comments,post_shares';
  const res = await fetch(
    `https://graph.facebook.com/v20.0/${input.providerPostId}/insights?metric=${metrics}&access_token=${input.accessToken}`
  );
  const payload = await res.json();
  if (!res.ok) throw new Error(`Meta insights failed: ${JSON.stringify(payload)}`);

  const out: Record<string, number | null> = {};
  for (const row of payload.data ?? []) {
    const value = Array.isArray(row.values) ? row.values.at(-1)?.value : null;
    out[String(row.name)] = typeof value === 'number' ? value : null;
  }
  return out;
}
