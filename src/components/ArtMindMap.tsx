import React, { useEffect, useRef, useState } from 'react';
import {
  Clapperboard,
  Link2,
  Plus,
  Trash2,
  ExternalLink,
  Download,
  Upload,
  X,
} from 'lucide-react';
import { detectEmbedType, parseTikTokVideoId, parseTwitterStatusId, parseYoutubeVideoId, TwitterIframeSrc } from '../lib/embedUrls';
import { useArtFeedStorage } from '../hooks/useArtFeedStorage';
import MindMapCloseButton from './mind-map/MindMapCloseButton';
import type { ArtFeedItem } from '../types/artItem';

interface ArtMindMapProps {
  onClose: () => void;
}

function LazyMediaFrame({
  minClass,
  children,
}: {
  minClass: string;
  children: (ready: boolean) => React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setReady(true);
      },
      { rootMargin: '200px', threshold: 0.01 }
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, []);
  return (
    <div ref={ref} className={minClass}>
      {children(ready)}
    </div>
  );
}

function ArtEmbed({ item }: { item: ArtFeedItem }) {
  if (item.type === 'youtube') {
    const id = parseYoutubeVideoId(item.url);
    if (!id) {
      return (
        <p className="text-sm text-red-600">
          Could not read YouTube ID — paste a watch or youtu.be link.
        </p>
      );
    }
    return (
      <LazyMediaFrame minClass="aspect-video w-full overflow-hidden rounded-lg border-2 border-black bg-black shadow-inner">
        {(ready) =>
          ready ? (
            <iframe
              title={item.title ?? 'YouTube'}
              src={`https://www.youtube.com/embed/${id}?rel=0`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full min-h-[200px] items-center justify-center bg-gray-900 text-xs text-gray-400">
              Scroll to load video
            </div>
          )
        }
      </LazyMediaFrame>
    );
  }

  if (item.type === 'tiktok') {
    const id = parseTikTokVideoId(item.url);
    if (!id) {
      return (
        <p className="text-sm text-red-600">
          Paste a TikTok video URL with a numeric id after <code className="rounded bg-gray-100 px-1">/video/</code>.
        </p>
      );
    }
    return (
      <LazyMediaFrame minClass="aspect-[9/16] max-h-[min(80vh,560px)] w-full max-w-[340px] mx-auto overflow-hidden rounded-lg border-2 border-black bg-black">
        {(ready) =>
          ready ? (
            <iframe
              title={item.title ?? 'TikTok'}
              src={`https://www.tiktok.com/embed/v2/${id}`}
              allow="fullscreen"
              className="h-full w-full"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full min-h-[360px] items-center justify-center bg-gray-900 text-xs text-gray-400">
              Scroll to load
            </div>
          )
        }
      </LazyMediaFrame>
    );
  }

  const tweetId = parseTwitterStatusId(item.url);
  if (!tweetId) {
    return (
      <p className="text-sm text-red-600">
        Could not read post ID — use a status URL that includes{' '}
        <code className="rounded bg-gray-100 px-1">/status/</code> followed by the numeric id.
      </p>
    );
  }
  return (
    <LazyMediaFrame minClass="min-h-[420px] w-full overflow-hidden rounded-lg border-2 border-black bg-white">
      {(ready) =>
        ready ? (
          <iframe
            title={item.title ?? 'X post'}
            src={TwitterIframeSrc(tweetId)}
            className="h-[min(480px,70vh)] w-full border-0"
            loading="lazy"
          />
        ) : (
          <div className="flex min-h-[320px] items-center justify-center bg-gray-50 text-xs text-gray-500">
            Scroll to load post
          </div>
        )
      }
    </LazyMediaFrame>
  );
}

const ArtMindMap: React.FC<ArtMindMapProps> = ({ onClose }) => {
  const {
    items,
    addItem,
    removeItem,
    storageError,
    clearStorageError,
    exportJson,
    importFromJson,
  } = useArtFeedStorage();
  const importRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const onAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const t = detectEmbedType(url);
    if (!t) {
      setError('Paste a YouTube, TikTok, or X (Twitter) link.');
      return;
    }
    if (t === 'youtube' && !parseYoutubeVideoId(url)) {
      setError('Invalid YouTube URL.');
      return;
    }
    if (t === 'tiktok' && !parseTikTokVideoId(url)) {
      setError('Invalid TikTok video URL.');
      return;
    }
    if (t === 'twitter' && !parseTwitterStatusId(url)) {
      setError('Need a status URL like twitter.com/…/status/123…');
      return;
    }
    addItem({ type: t, url: url.trim(), title: title.trim() || undefined });
    setUrl('');
    setTitle('');
  };

  const downloadFeed = () => {
    const blob = new Blob([exportJson()], { type: 'application/json' });
    const a = document.createElement('a');
    const u = URL.createObjectURL(blob);
    a.href = u;
    a.download = `mw3-art-feed-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(u);
  };

  const onImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setImportMsg(null);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const r = importFromJson(text);
      setImportMsg(r.ok ? 'Feed imported.' : r.error);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="min-h-screen overflow-y-auto bg-white text-black">
      <MindMapCloseButton onClose={onClose} />

      <div className="mx-auto max-w-6xl px-4 pb-20 pt-20">
        {storageError && (
          <div
            role="alert"
            className="mb-6 flex items-start justify-between gap-3 rounded-xl border-2 border-red-600 bg-red-50 p-4 text-sm text-red-900"
          >
            <p>
              <strong>Could not save art feed.</strong> {storageError} Export a backup JSON below.
            </p>
            <button
              type="button"
              aria-label="Dismiss"
              className="shrink-0 rounded-full border border-red-800 p-1 hover:bg-red-100"
              onClick={clearStorageError}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <header className="mb-10 border-b-2 border-black pb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border-2 border-black px-4 py-1 text-xs font-bold uppercase tracking-widest">
            <Clapperboard className="h-4 w-4" />
            Feed
          </div>
          <h1 className="font-serif text-3xl font-bold md:text-5xl">ART & media</h1>
          <p className="mt-3 max-w-2xl text-sm text-gray-600 md:text-base">
            Drop YouTube, TikTok, and X posts into one wall. Embeds load when scrolled into view; links stay in
            this browser until you clear storage.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={downloadFeed}
              className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide hover:bg-black hover:text-white"
            >
              <Download className="h-4 w-4" />
              Export feed JSON
            </button>
            <button
              type="button"
              onClick={() => importRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide hover:bg-black hover:text-white"
            >
              <Upload className="h-4 w-4" />
              Import JSON
            </button>
            <input
              ref={importRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={onImportFile}
            />
            {importMsg && (
              <span className="text-xs text-gray-700" role="status">
                {importMsg}
              </span>
            )}
          </div>
        </header>

        <form
          onSubmit={onAdd}
          className="mb-12 grid gap-4 rounded-2xl border-2 border-black bg-gray-50 p-6 md:grid-cols-[1fr_auto]"
        >
          <div className="space-y-3 md:col-span-2">
            <label className="block text-sm font-semibold uppercase tracking-wide text-gray-600">
              <Link2 className="mr-1 inline h-4 w-4" />
              URL
            </label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=…  ·  tiktok.com/…/video/…  ·  x.com/…/status/…"
              className="w-full rounded-lg border-2 border-black bg-white px-4 py-3 text-sm"
            />
          </div>
          <div className="space-y-3 md:col-span-2">
            <label className="block text-sm font-semibold uppercase tracking-wide text-gray-600">
              Title (optional)
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Label for your wall"
              className="w-full rounded-lg border-2 border-black bg-white px-4 py-3 text-sm"
            />
          </div>
          {error && <p className="text-sm text-red-600 md:col-span-2">{error}</p>}
          <div className="md:col-span-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-black px-8 py-3 text-sm font-bold uppercase tracking-wide text-white hover:bg-gray-900"
            >
              <Plus className="h-4 w-4" />
              Add to wall
            </button>
          </div>
        </form>

        <div className="columns-1 gap-8 space-y-8 md:columns-2">
          {items.map((item) => (
            <article
              key={item.id}
              className="mb-8 break-inside-avoid rounded-2xl border-2 border-black bg-white p-4 shadow-sm"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    {item.type}
                  </span>
                  <h2 className="font-serif text-lg font-bold leading-tight">
                    {item.title ?? 'Untitled clip'}
                  </h2>
                </div>
                <div className="flex shrink-0 gap-1">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-black p-2 hover:bg-black hover:text-white"
                    aria-label="Open original"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <button
                    type="button"
                    aria-label="Remove"
                    onClick={() => removeItem(item.id)}
                    className="rounded-full border border-red-600 p-2 text-red-600 hover:bg-red-600 hover:text-white"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <ArtEmbed item={item} />
            </article>
          ))}
        </div>

        {items.length === 0 && (
          <p className="py-16 text-center text-gray-500">Add your first link above.</p>
        )}
      </div>
    </div>
  );
};

export default ArtMindMap;
