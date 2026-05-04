export function parseYoutubeVideoId(url: string): string | null {
  try {
    const u = new URL(url.trim());
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.replace(/^\//, '');
      return id || null;
    }
    if (u.searchParams.get('v')) return u.searchParams.get('v');
    const m = u.pathname.match(/\/embed\/([^/]+)/);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

export function parseTikTokVideoId(url: string): string | null {
  const m = url.trim().match(/video\/(\d+)/);
  return m?.[1] ?? null;
}

export function parseTwitterStatusId(url: string): string | null {
  const m = url.trim().match(/status\/(\d+)/);
  return m?.[1] ?? null;
}

export function detectEmbedType(url: string): 'youtube' | 'tiktok' | 'twitter' | null {
  const u = url.toLowerCase();
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('tiktok.com')) return 'tiktok';
  if (u.includes('twitter.com') || u.includes('x.com')) return 'twitter';
  return null;
}

export function TwitterIframeSrc(statusId: string) {
  return `https://platform.twitter.com/embed/Tweet.html?id=${encodeURIComponent(statusId)}`;
}

