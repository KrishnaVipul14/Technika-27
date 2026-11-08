import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import DashboardClient from "./dashboard-client";
import { createPrivateMetadata } from "@/lib/seo";

export const metadata = createPrivateMetadata(
  "Dashboard — Your Technika Command Centre",
  "Your private Technika 2K26 account dashboard.",
  "/dashboard",
);

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await getServerSupabase();
  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  // Fetch user profile details using lib/supabase
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, college, phone, house, created_at")
    .eq("id", user.id)
    .maybeSingle();

  // Extract robust fields, gracefully resolving user metadata
  const safeProfile = {
    full_name:
      profile?.full_name?.trim() ||
      (user.user_metadata?.display_name as string) ||
      (user.user_metadata?.full_name as string) ||
      "",
    college:
      profile?.college?.trim() || (user.user_metadata?.college as string) || "",
    phone:
      profile?.phone?.trim() || (user.user_metadata?.phone as string) || "",
    house:
      profile?.house?.trim() ||
      (user.user_metadata?.house as string) ||
      "default",
    created_at: profile?.created_at || user.created_at || null,
  };

  // Self-heal: ensure profiles row has these values if row was missing
  if (!profile || !profile.house) {
    try {
      await supabase.from("profiles").upsert(
        {
          id: user.id,
          full_name: safeProfile.full_name,
          college: safeProfile.college,
          phone: safeProfile.phone,
          house: safeProfile.house,
        },
        { onConflict: "id" },
      );
    } catch {
      // Ignore background sync errors
    }
  }

  return (
    <DashboardClient
      userId={user.id}
      email={user.email || ""}
      profile={safeProfile}
      createdAt={user.created_at}
    />
  );
}
