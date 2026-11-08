"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, LoaderCircle } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";

export default function LogoutButton({
  className = "",
}: {
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (loading) return;
    setLoading(true);

    try {
      const supabase = getSupabase();
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-2.5 text-xs font-semibold tracking-wider uppercase text-red-300 transition-all duration-300 hover:border-red-400 hover:bg-red-900/40 hover:text-red-100 disabled:opacity-50 cursor-pointer shadow-sm ${className}`}
      aria-label="Sign out of account"
    >
      {loading ? (
        <>
          <LoaderCircle size={14} className="animate-spin text-red-300" />
          <span>Leaving the Hall…</span>
        </>
      ) : (
        <>
          <LogOut size={14} className="text-red-400" />
          <span>Sign Out</span>
        </>
      )}
    </button>
  );
}
