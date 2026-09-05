"use client";

import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/auth/supabase-browser";

export type LearnerIdentity = { id: string; accessToken?: string; displayName?: string; mode: "guest" | "google" };

type Props = { guestId: string; onChange: (identity: LearnerIdentity) => void };

export function LearnerAccess({ guestId, onChange }: Props) {
  const [loading, setLoading] = useState(true);
  const [identity, setIdentity] = useState<LearnerIdentity>({ id: guestId, mode: "guest" });
  const [error, setError] = useState<string | null>(null);
  const supabase = getBrowserSupabase();

  useEffect(() => {
    if (!supabase) {
      const timer = window.setTimeout(() => setLoading(false), 0);
      return () => window.clearTimeout(timer);
    }
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const session = data.session;
      if (session?.user) {
        setIdentity({ id: session.user.id, accessToken: session.access_token, displayName: session.user.user_metadata.full_name ?? session.user.email, mode: "google" });
      }
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) setIdentity({ id: session.user.id, accessToken: session.access_token, displayName: session.user.user_metadata.full_name ?? session.user.email, mode: "google" });
      else setIdentity({ id: guestId, mode: "guest" });
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [guestId, supabase]);

  useEffect(() => onChange(identity), [identity, onChange]);

  async function googleSignIn() {
    if (!supabase) { setError("Google sign-in needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env."); return; }
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/classroom` } });
    if (signInError) setError(signInError.message);
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    setIdentity({ id: guestId, mode: "guest" });
  }

  return <section className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950"><h3 className="font-semibold text-blue-950 dark:text-blue-50">Choose how to learn</h3>{loading ? <p className="mt-1 text-sm text-blue-800 dark:text-blue-200">Checking your saved session…</p> : identity.mode === "google" ? <div className="mt-2 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-blue-800 dark:text-blue-200">Signed in as <span className="font-medium">{identity.displayName || "Google learner"}</span>. Your progress follows you across devices.</p><button type="button" onClick={() => void signOut()} className="text-sm font-semibold text-blue-700 underline dark:text-blue-300">Use guest mode</button></div> : <div className="mt-3 flex flex-wrap items-center gap-3"><button type="button" onClick={() => void googleSignIn()} className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-zinc-900 shadow-sm ring-1 ring-zinc-300 hover:bg-zinc-50">Continue with Google</button><span className="text-sm text-blue-800 dark:text-blue-200">or continue as a guest — no account needed.</span></div>}{error && <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">{error}</p>}</section>;
}
