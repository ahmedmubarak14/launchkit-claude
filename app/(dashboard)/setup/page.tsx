import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SetupClientPage } from "./SetupClientPage";

export default async function SetupPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get user's store
  const { data: store } = await supabase
    .from("stores")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!store) {
    redirect("/connect");
  }

  // Get or create setup session
  let session = null;
  const { data: existingSession } = await supabase
    .from("setup_sessions")
    .select("*")
    .eq("store_id", store.id)
    .eq("status", "in_progress")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (existingSession) {
    session = existingSession;
  } else {
    const { data: newSession } = await supabase
      .from("setup_sessions")
      .insert({ store_id: store.id, status: "in_progress" })
      .select()
      .single();
    session = newSession;
  }

  if (!session) {
    redirect("/dashboard");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <SetupClientPage
      sessionId={session.id}
      storeName={store.store_name}
      userEmail={user.email || ""}
      initialLanguage={profile?.preferred_language || "en"}
    />
  );
}
