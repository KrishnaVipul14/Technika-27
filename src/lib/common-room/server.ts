import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { houseFromValue } from "@/lib/houses";
import type { RoomAccess } from "./types";

/** Only a verified user and their database profile can choose a room. Never assigns a house. */
export async function loadRoomAccount(client: SupabaseClient | null): Promise<RoomAccess> {
  if (!client) return { status: "signed-out" };
  try {
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return { status: "signed-out" };
    const { data: profile, error } = await client.from("profiles")
      .select("full_name,college,house").eq("id", user.id).maybeSingle();
    if (error) return { status: "unavailable" };
    const metadataName = typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name.trim() : "";
    const displayName = typeof profile?.full_name === "string" && profile.full_name.trim() ? profile.full_name.trim() : metadataName || "Wizard";
    const house = houseFromValue(profile?.house);
    if (!house || house === "default") return { status: "unassigned", displayName };
    return { status: "ready", participant: {
      id: user.id, displayName, email: user.email || "", house,
      college: typeof profile?.college === "string" ? profile.college : null,
    } };
  } catch {
    return { status: "unavailable" };
  }
}
