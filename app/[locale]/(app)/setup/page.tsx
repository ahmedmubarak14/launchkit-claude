import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChatPanel } from "@/components/chat/ChatPanel";

export default async function SetupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: store } = await supabase
    .from("stores")
    .select("store_id, access_token")
    .eq("user_id", user.id)
    .eq("platform", "zid")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!store?.store_id || !store?.access_token) {
    redirect(`/${locale}/connect?next=/setup`);
  }

  return <ChatPanel />;
}
