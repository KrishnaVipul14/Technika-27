"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, LogOut, ShieldCheck } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import type { RoomAccess } from "@/lib/common-room/types";
import { CommonRoomExperience } from "./common-room/common-room-experience";
import { useAuth } from "./auth-provider";
import { useRegistrationArrival } from "./registration-arrival";

export function AccountRoom({ access }: { access: Exclude<RoomAccess, { status: "signed-out" }> }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { cancel: cancelArrival } = useRegistrationArrival();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const staleSession = (!loading && !user) || Boolean(user && access.status === "ready" && user.id !== access.participant.id);
  useEffect(() => {
    if (!staleSession) return;
    if (!user) router.replace("/login");
    router.refresh();
  }, [staleSession, user, router]);

  useEffect(() => { if (staleSession || access.status !== "ready") cancelArrival(); }, [staleSession, access.status, cancelArrival]);
  const logout = async () => {
    setBusy(true); setFeedback("");
    try {
      const client = getSupabase();
      if (!client) throw new Error("The account service is unavailable. Please try again.");
      const { error } = await client.auth.signOut();
      if (error) throw error;
      router.replace("/login"); router.refresh();
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not sign out. Please try again."); }
    finally { setBusy(false); }
  };
  if (staleSession) return <p className="shell py-40" role="status">Verifying your castle key…</p>;
  const accountActions = <><button className="button button-glass" type="button" disabled={busy} onClick={logout}><LogOut size={14} />{busy ? "Signing out…" : "Sign out"}</button>{feedback && <p role="status">{feedback}</p>}</>;
  if (access.status === "ready") return <CommonRoomExperience key={`${access.participant.id}:${access.participant.house}`} participant={access.participant} accountActions={accountActions} />;
  return <section className="common-room shell" data-testid="common-room">
    <span className="eyebrow"><ShieldCheck size={13} />Your private common room</span>
    {access.status === "unassigned" ? <>
      <h1>House assignment pending</h1>
      <p>{access.displayName}, your account is verified, but a house has not been saved in your profile. The Common Room will not assign one for you.</p>
      <Link className="button button-gold" href="/signup?step=ceremony">Return to the Sorting Hat <ArrowUpRight size={15} /></Link>
    </> : <>
      <h1>The profile ledger is unavailable.</h1>
      <p>We could not read your saved house. Your account has not been changed.</p>
      <button className="button button-gold" type="button" onClick={() => router.refresh()}>Retry profile</button>
    </>}
    <div className="account-actions">
      <Link className="button button-glass" href="/">Return to the festival <ArrowUpRight size={15} /></Link>
      <button className="button button-glass" type="button" disabled={busy} onClick={logout}><LogOut size={14} />{busy ? "Signing out…" : "Sign out"}</button>
    </div>
    {feedback && <p role="status">{feedback}</p>}
  </section>;
}
