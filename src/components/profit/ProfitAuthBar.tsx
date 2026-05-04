import React, { useMemo, useState } from 'react';
import { LogIn, LogOut, Mail } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { supabase, supabaseEnabled } from '../../lib/supabaseClient';

function redirectUrl() {
  const base = import.meta.env.BASE_URL ?? '/';
  return `${window.location.origin}${base.replace(/\/+$/, '/')}`;
}

export default function ProfitAuthBar({
  session,
  onAuthChange,
}: {
  session: Session | null;
  onAuthChange: () => void;
}) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const signedInLabel = useMemo(() => {
    if (!session?.user?.email) return 'Signed in';
    return session.user.email;
  }, [session]);

  if (!supabaseEnabled || !supabase) {
    return (
      <div className="rounded-xl border border-black/10 bg-gray-50 px-3 py-2 text-[11px] font-semibold text-gray-600">
        Cloud sign-in disabled (missing Supabase env).
      </div>
    );
  }

  const sendEmailCode = async () => {
    const e = email.trim();
    if (!e) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await supabase.auth.signInWithOtp({
        email: e,
        options: { emailRedirectTo: redirectUrl() },
      });
      if (res.error) throw res.error;
      setMsg('Check your email for the sign-in link/code.');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Could not send email');
    } finally {
      setBusy(false);
    }
  };

  const oauth = async (provider: 'google' | 'github') => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: redirectUrl() },
      });
      if (res.error) throw res.error;
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'OAuth failed');
      setBusy(false);
    }
  };

  const signOut = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await supabase.auth.signOut();
      onAuthChange();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Sign out failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex w-full max-w-[520px] flex-col gap-2 rounded-xl border-2 border-black bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-500">Account</div>
        {session ? (
          <div className="text-[11px] font-semibold text-gray-700">{signedInLabel}</div>
        ) : (
          <div className="text-[11px] font-semibold text-gray-700">Not signed in</div>
        )}
      </div>

      {session ? (
        <button
          type="button"
          onClick={() => void signOut()}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-black bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide hover:bg-black hover:text-white disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <input
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              type="email"
              placeholder="you@domain.com"
              className="min-w-[200px] flex-1 rounded border-2 border-black px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => void sendEmailCode()}
              disabled={busy || !email.trim()}
              className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-black px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-gray-900 disabled:opacity-50"
            >
              <Mail className="h-4 w-4" />
              Email link
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void oauth('google')}
              disabled={busy}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-black bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide hover:bg-black hover:text-white disabled:opacity-50"
            >
              <LogIn className="h-4 w-4" />
              Google
            </button>
            <button
              type="button"
              onClick={() => void oauth('github')}
              disabled={busy}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-black bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide hover:bg-black hover:text-white disabled:opacity-50"
            >
              <LogIn className="h-4 w-4" />
              GitHub
            </button>
          </div>
        </div>
      )}

      {msg && <div className="text-[11px] font-semibold text-gray-700">{msg}</div>}
    </div>
  );
}
