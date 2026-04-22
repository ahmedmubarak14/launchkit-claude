import { setRequestLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/lib/i18n/navigation";
import { Package, Layers, Store as StoreIcon, Sparkles, ArrowRight } from "lucide-react";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");
  const isAr = locale === "ar";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: store }, { count: catCount }, { count: prodCount }] =
    await Promise.all([
      supabase.from("profiles").select("name").eq("id", user.id).maybeSingle(),
      supabase
        .from("stores")
        .select("store_name, platform")
        .eq("user_id", user.id)
        .eq("platform", "zid")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("categories").select("id", { count: "exact", head: true }),
      supabase.from("products").select("id", { count: "exact", head: true }),
    ]);

  const name = profile?.name || (user.email || "").split("@")[0];

  const stats = [
    { label: t("stats.store"), value: store ? 1 : 0, icon: StoreIcon },
    { label: t("stats.categories"), value: catCount ?? 0, icon: Layers },
    { label: t("stats.products"), value: prodCount ?? 0, icon: Package },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 lg:px-10 py-10">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
        <div>
          <h1 className="font-display text-3xl md:text-4xl tracking-tight">
            {t("greeting", { name })}
          </h1>
          <p className="mt-2 text-muted-ink">{t("subtitle")}</p>
        </div>
        {store ? (
          <Link
            href="/setup"
            className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-ink text-paper text-sm font-medium hover:bg-ink/85 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            {t("continueCta")}
          </Link>
        ) : (
          <Link
            href="/connect"
            className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-ink text-paper text-sm font-medium hover:bg-ink/85 transition-colors"
          >
            {t("connectCta")}
            <ArrowRight className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />
          </Link>
        )}
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-3xl border hairline bg-paper p-6">
              <div className="flex items-center gap-2 text-xs tracking-[0.18em] uppercase text-muted-ink">
                <Icon className="w-3.5 h-3.5" />
                {s.label}
              </div>
              <div className="mt-3 font-display text-4xl tabular-nums">{s.value}</div>
            </div>
          );
        })}
      </div>

      {!store && (
        <div className="rounded-3xl border hairline bg-cream/60 p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-paper border hairline flex items-center justify-center mx-auto mb-5">
            <StoreIcon className="w-6 h-6 text-ink" />
          </div>
          <h2 className="font-display text-2xl">{t("emptyStore")}</h2>
          <Link
            href="/connect"
            className="mt-6 inline-flex items-center gap-2 h-11 px-5 rounded-full bg-ink text-paper text-sm font-medium hover:bg-ink/85 transition-colors"
          >
            {t("connectCta")}
            <ArrowRight className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />
          </Link>
        </div>
      )}
    </div>
  );
}
