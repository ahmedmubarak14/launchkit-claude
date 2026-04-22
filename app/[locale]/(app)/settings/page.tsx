import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "@/components/settings/SettingsClient";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const [{ data: profile }, { data: store }] = await Promise.all([
    supabase.from("profiles").select("name, email").eq("id", user.id).maybeSingle(),
    supabase
      .from("stores")
      .select("store_name, store_id, created_at")
      .eq("user_id", user.id)
      .eq("platform", "zid")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <SettingsClient
      email={user.email || ""}
      name={profile?.name ?? null}
      store={store ? { name: store.store_name, id: store.store_id, createdAt: store.created_at } : null}
    />
  );
}
