import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { houseFromValue } from "@/lib/houses";
import type { AssignedHouse, MembersResult, RoomAccess } from "./types";

export async function loadRoomMembers(client: SupabaseClient, house: AssignedHouse, page: number): Promise<MembersResult> {
  try {
    // ponytail: legacy house strings require a wildcard scan; normalize/index the column
    // through a separately approved migration if directory scale warrants it.
    const { data, error } = await client.from("profiles").select("full_name,house")
      .ilike("house", `%${house}%`).order("full_name", { nullsFirst: false }).order("id")
      .range(page * 24, page * 24 + 24);
    if (error) throw error;
    const rows = data || [];
    return { status: "ready", house, nextPage: rows.length > 24 && page < 1000 ? page + 1 : null,
      members: rows.slice(0, 24).filter((row) => houseFromValue(row.house) === house).map((row) => ({
        name: typeof row.full_name === "string" && row.full_name.trim() ? row.full_name.trim() : "House member", house,
      })),
    };
  } catch {
    return { status: "unavailable", message: "The house directory could not be reached. Please try again." };
  }
}

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
