import { getSupabase } from "@/lib/supabase/client";

/** Unsaved UI values, not database columns or a published submission contract. */
export type AlumniDraft = {
  name: string;
  yearOfPassing: string;
  phone: string;
  email: string;
  size: string;
};

export type AlumniProfileResult =
  | { status: "ready"; profile: { full_name: string | null; phone: string | null } }
  | { status: "missing" }
  | { status: "unavailable" };

/** The current repository has no alumni registry, payment or merchandise source. */
export const alumniIntegrations = {
  // TODO(alumni): connect an officially supplied registration contract here.
  // Do not insert graduation years or merchandise preferences into profiles.
  registration: {
    status: "unavailable",
    message: "Alumni registration preview — details are not submitted or saved until the official registry is connected.",
  },
  // TODO(alumni): connect authoritative payment/status verification only when supplied.
  // Account sign-in and local form interactions must never produce a paid/verified letter.
  payment: {
    status: "unavailable",
    message: "Payment verification is not connected. No payment is requested or processed here.",
  },
  // TODO(alumni): populate options from the official merchandise source; do not invent a catalogue.
  merchandise: {
    status: "unavailable",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"] as readonly string[],
    message: "Official merchandise sizes shown for preview; ordering is not connected.",
  },
} as const;

/** Read only existing columns, filtered to the AuthProvider user's own profile. */
export async function readAlumniProfile(userId: string, signal: AbortSignal): Promise<AlumniProfileResult> {
  try {
    const client = getSupabase();
    if (!client) return { status: "unavailable" };
    const { data, error } = await client.from("profiles")
      .select("full_name,phone")
      .eq("id", userId)
      .abortSignal(signal)
      .maybeSingle();
    if (error) return { status: "unavailable" };
    if (!data) return { status: "missing" };
    return {
      status: "ready",
      profile: {
        full_name: typeof data.full_name === "string" ? data.full_name.trim() || null : null,
        phone: typeof data.phone === "string" ? data.phone.trim() || null : null,
      },
    };
  } catch {
    return { status: "unavailable" };
  }
}
