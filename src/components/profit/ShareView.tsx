import { useEffect, useMemo, useState } from 'react';
import { supabase, supabaseEnabled } from '../../lib/supabaseClient';
import MindMapCloseButton from '../mind-map/MindMapCloseButton';

type ShareRow = {
  id: string;
  created_at: string;
  range_start: string | null;
  range_end: string | null;
  summary: unknown;
};

function prettyJson(x: unknown) {
  try {
    return JSON.stringify(x, null, 2);
  } catch {
    return String(x);
  }
}

export default function ShareView({
  shareId,
  onClose,
}: {
  shareId: string;
  onClose: () => void;
}) {
  const [row, setRow] = useState<ShareRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const title = useMemo(() => `Share · ${shareId.slice(0, 8)}`, [shareId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        if (!supabaseEnabled || !supabase) throw new Error('Supabase is not configured');
        const res = await supabase
          .from('share_snapshots')
          .select('id,created_at,range_start,range_end,summary')
          .eq('id', shareId)
          .single();
        if (res.error) throw new Error(res.error.message);
        if (!alive) return;
        setRow(res.data as ShareRow);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : 'Could not load share snapshot');
        setRow(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [shareId]);

  return (
    <div className="min-h-screen overflow-y-auto bg-white text-black">
      <MindMapCloseButton onClose={onClose} />
      <div className="mx-auto max-w-4xl px-4 pb-16 pt-20">
        <p className="mb-1 text-xs tracking-[0.35em] text-gray-500">READ ONLY</p>
        <h1 className="font-serif text-3xl font-bold md:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-gray-600">
          This is a snapshot export. If this fails to load publicly, enable the optional public read policy in
          `supabase/schema.sql`.
        </p>

        <div className="mt-6 rounded-2xl border-2 border-black bg-white p-4">
          {loading && <div className="text-sm font-semibold">Loading…</div>}
          {!loading && error && (
            <div className="text-sm font-semibold text-red-700">
              Could not load share snapshot. {error}
            </div>
          )}
          {!loading && row && (
            <>
              <div className="flex flex-wrap gap-3 text-xs font-semibold text-gray-700">
                <div>
                  <span className="text-gray-500">Created:</span>{' '}
                  {new Date(row.created_at).toLocaleString()}
                </div>
                {row.range_start && (
                  <div>
                    <span className="text-gray-500">Start:</span>{' '}
                    {new Date(row.range_start).toLocaleString()}
                  </div>
                )}
                {row.range_end && (
                  <div>
                    <span className="text-gray-500">End:</span>{' '}
                    {new Date(row.range_end).toLocaleString()}
                  </div>
                )}
              </div>
              <pre className="mt-4 max-h-[70vh] overflow-auto rounded-xl border border-black/10 bg-gray-50 p-4 text-[12px] leading-relaxed">
                {prettyJson(row.summary)}
              </pre>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

