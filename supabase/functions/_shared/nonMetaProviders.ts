export async function publishXPost(input: {
  accessToken: string;
  body: string;
}): Promise<{ providerPostId: string; providerPostUrl: string | null }> {
  const res = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${input.accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ text: input.body }),
  });
  const payload = await res.json();
  if (!res.ok || !payload.data?.id) {
    throw new Error(`X publish failed: ${JSON.stringify(payload)}`);
  }
  return {
    providerPostId: String(payload.data.id),
    providerPostUrl: `https://x.com/i/web/status/${payload.data.id}`,
  };
}

export async function publishTikTokVideo(input: {
  accessToken: string;
  body: string;
  videoUrl: string;
}): Promise<{ providerPostId: string; providerPostUrl: string | null }> {
  const res = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${input.accessToken}`,
      'content-type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
      post_info: {
        title: input.body,
        privacy_level: 'SELF_ONLY',
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      },
      source_info: {
        source: 'PULL_FROM_URL',
        video_url: input.videoUrl,
      },
    }),
  });
  const payload = await res.json();
  if (!res.ok || !payload.data?.publish_id) {
    throw new Error(`TikTok publish init failed: ${JSON.stringify(payload)}`);
  }
  return {
    providerPostId: String(payload.data.publish_id),
    providerPostUrl: null,
  };
}

export async function publishYouTubeVideo(input: {
  accessToken: string;
  title: string;
  body: string;
  videoBytes: Blob;
}): Promise<{ providerPostId: string; providerPostUrl: string | null }> {
  const metadataRes = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${input.accessToken}`,
        'content-type': 'application/json; charset=UTF-8',
        'x-upload-content-type': input.videoBytes.type || 'video/mp4',
      },
      body: JSON.stringify({
        snippet: {
          title: input.title,
          description: input.body,
        },
        status: {
          privacyStatus: 'private',
        },
      }),
    }
  );

  const uploadUrl = metadataRes.headers.get('location');
  if (!metadataRes.ok || !uploadUrl) {
    const payload = await metadataRes.text();
    throw new Error(`YouTube upload session failed: ${payload}`);
  }

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${input.accessToken}`,
      'content-type': input.videoBytes.type || 'video/mp4',
    },
    body: input.videoBytes,
  });
  const payload = await uploadRes.json();
  if (!uploadRes.ok || !payload.id) {
    throw new Error(`YouTube upload failed: ${JSON.stringify(payload)}`);
  }

  return {
    providerPostId: String(payload.id),
    providerPostUrl: `https://youtube.com/watch?v=${payload.id}`,
  };
}
