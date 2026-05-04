import { useId, useRef, useState } from 'react';
import { ExternalLink, Link2, X } from 'lucide-react';
import { useModalA11y } from '../../hooks/useModalA11y';

function normalizeUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.toString();
  } catch {
    // If user pasted without scheme, assume https.
    try {
      const u = new URL(`https://${s}`);
      return u.toString();
    } catch {
      return null;
    }
  }
}

interface TradeLinkModalProps {
  open: boolean;
  symbol?: string;
  initialUrl?: string | null;
  onSave: (url: string | null) => void;
  onClose: () => void;
}

export default function TradeLinkModal({
  open,
  symbol,
  initialUrl,
  onSave,
  onClose,
}: TradeLinkModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  useModalA11y(open, panelRef, onClose);

  const [value, setValue] = useState(initialUrl ?? '');
  const [err, setErr] = useState<string | null>(null);

  if (!open) return null;

  const submit = () => {
    setErr(null);
    const n = normalizeUrl(value);
    if (value.trim() && !n) {
      setErr('Paste a valid http(s) URL.');
      return;
    }
    onSave(n);
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4 md:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="w-full max-w-lg rounded-2xl border-2 border-black bg-white p-6 shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="font-serif text-xl font-bold">
              Link source{symbol ? ` · ${symbol}` : ''}
            </h2>
            <p id={descId} className="mt-2 text-sm text-gray-600">
              Attach the X post (or any URL) that called this trade.
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-full border border-black p-1 hover:bg-gray-100"
            aria-label="Close"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <label className="block text-sm">
          <span className="text-xs font-semibold uppercase text-gray-600">
            <Link2 className="mr-1 inline h-4 w-4" />
            URL
          </span>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://x.com/…/status/…"
            className="mt-1 w-full rounded border-2 border-black px-3 py-2"
            inputMode="url"
            autoComplete="off"
          />
        </label>

        {err && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {err}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={submit}
            className="rounded-full bg-black px-5 py-2 text-sm font-bold uppercase tracking-wide text-white"
          >
            Save link
          </button>
          <button
            type="button"
            onClick={() => {
              setValue('');
              onSave(null);
            }}
            className="rounded-full border-2 border-black px-5 py-2 text-sm font-bold uppercase tracking-wide"
          >
            Clear
          </button>
          {initialUrl && (
            <a
              href={initialUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-auto inline-flex items-center gap-2 rounded-full border-2 border-black px-5 py-2 text-sm font-bold uppercase tracking-wide hover:bg-black hover:text-white"
            >
              <ExternalLink className="h-4 w-4" />
              Open
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

