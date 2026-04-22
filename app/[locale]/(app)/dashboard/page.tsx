import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { DashboardLive } from "@/components/dashboard/DashboardLive";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .maybeSingle();

  const userName = profile?.name || (user.email || "").split("@")[0];

  return (
    <div className="max-w-6xl mx-auto px-6 lg:px-10 py-10">
      <DashboardLive userName={userName} />
    </div>
  );
}
