import { getServerSupabase } from "@/lib/supabase/server";
import { loadRoomAccount } from "@/lib/common-room/server";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" };

/** Read-only, own-participant projection. This endpoint does not register or assign anyone. */
export async function GET() {
  const access = await loadRoomAccount(await getServerSupabase());
  if (access.status !== "ready") {
    const status = { "signed-out": 401, unassigned: 403, unavailable: 503 }[access.status];
    return Response.json({ status: access.status }, { status, headers });
  }
  const { id, displayName, house } = access.participant;
  return Response.json({ status: "ready", participant: { id, displayName, house } }, { headers });
}
