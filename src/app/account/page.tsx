import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { AccountRoom } from "@/components/account-room";
import { loadRoomAccount } from "@/lib/common-room/server";
import { createPrivateMetadata } from "@/lib/seo";

export const metadata = createPrivateMetadata("Your Hogwarts Common Room", "Enter your private Technika ’27 house common room.", "/account");
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const access = await loadRoomAccount(await getServerSupabase());
  if (access.status === "signed-out") redirect("/login");
  return <AccountRoom access={access} />;
}
