import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const { data: store } = await supabase.from("stores").select("*").eq("user_id", user.id).limit(1).single();

  return <SettingsClient profile={profile} store={store} userEmail={user.email || ""} />;
}
