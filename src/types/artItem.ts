export type ArtEmbedType = 'youtube' | 'tiktok' | 'twitter';

export interface ArtFeedItem {
  id: string;
  type: ArtEmbedType;
  url: string;
  title?: string;
}
