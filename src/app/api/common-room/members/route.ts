import { getServerSupabase } from "@/lib/supabase/server";
import { loadRoomAccount, loadRoomMembers } from "@/lib/common-room/server";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" };

export async function GET(request: Request) {
  const client = await getServerSupabase();
  const access = await loadRoomAccount(client);
  if (!client || access.status === "signed-out") return Response.json({ status: "signed-out" }, { status: 401, headers });
  if (access.status === "unassigned") return Response.json({ status: "unassigned" }, { status: 403, headers });
  if (access.status !== "ready") return Response.json({ status: "unavailable", message: "The profile ledger is unavailable." }, { status: 503, headers });
  const rawPage = new URL(request.url).searchParams.get("page") ?? "0";
  if (!/^(0|[1-9]\d{0,3})$/.test(rawPage) || Number(rawPage) > 1000) return Response.json({ message: "Invalid directory page." }, { status: 400, headers });
  const result = await loadRoomMembers(client, access.participant.house, Number(rawPage));
  return Response.json(result, { status: result.status === "ready" ? 200 : 503, headers });
}
