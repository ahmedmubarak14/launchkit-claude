"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { Package, Layers, Store as StoreIcon, Sparkles, ArrowRight, RefreshCcw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";

type Stats = {
  storeConnected: boolean;
  storeName: string | null;
  categoryCount: number;
  productCount: number;
  recentProducts: { id: string; nameAr: string; nameEn: string; price: number; status: string }[];
  recentCategories: { id: string; nameAr: string; nameEn: string; productsCount: number }[];
  fetchedAt: string;
};

async function fetchStats(): Promise<Stats> {
  const res = await fetch("/api/store/stats", { cache: "no-store" });
  if (!res.ok) throw new Error("stats_fetch_failed");
  return res.json();
}

export function DashboardLive({ userName }: { userName: string }) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const isAr = locale === "ar";

  const { data, isLoading, isError, refetch, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ["store-stats"],
    queryFn: fetchStats,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });

  const stats = [
    {
      label: t("stats.store"),
      value: data?.storeConnected ? 1 : 0,
      icon: StoreIcon,
      tint: "ink",
    },
    {
      label: t("stats.categories"),
      value: data?.categoryCount ?? 0,
      icon: Layers,
      tint: "champagne",
    },
    {
      label: t("stats.products"),
      value: data?.productCount ?? 0,
      icon: Package,
      tint: "ink",
    },
  ];

  const lastUpdated = (() => {
    if (!dataUpdatedAt) return null;
    try {
      return formatDistanceToNow(dataUpdatedAt, { addSuffix: true, locale: isAr ? arLocale : enUS });
    } catch {
      return null;
    }
  })();

  return (
    <>
      <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
        <div>
          <h1 className="font-display text-3xl md:text-4xl tracking-tight">
            {t("greeting", { name: userName })}
          </h1>
          <p className="mt-2 text-muted-ink">{t("subtitle")}</p>
          {lastUpdated && (
            <p className="mt-2 text-xs text-muted-ink">
              {isAr ? "آخر تحديث " : "Updated "}{lastUpdated}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-full border hairline bg-paper text-sm hover:bg-cream transition-colors disabled:opacity-50"
            title={t("refresh") ?? (isAr ? "تحديث" : "Refresh")}
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            {isAr ? "تحديث" : "Refresh"}
          </button>
          {data?.storeConnected ? (
            <Link
              href="/setup"
              className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-ink text-paper text-sm font-medium hover:bg-ink/85 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              {t("continueCta")}
            </Link>
          ) : (
            <Link
              href="/connect"
              className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-ink text-paper text-sm font-medium hover:bg-ink/85 transition-colors"
            >
              {t("connectCta")}
              <ArrowRight className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />
            </Link>
          )}
        </div>
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
              <div className="mt-3 font-display text-4xl tabular-nums">
                {isLoading ? "—" : s.value}
              </div>
            </div>
          );
        })}
      </div>

      {isError && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {isAr ? "تعذّر جلب بيانات المتجر الحيّة." : "Couldn't refresh live store data."}
        </div>
      )}

      {!data?.storeConnected && !isLoading && (
        <div className="rounded-3xl border hairline bg-cream/60 p-10 text-center mb-8">
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

      {data?.storeConnected && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card
            title={t("sections.recent")}
            icon={<Package className="w-4 h-4" />}
            items={
              data.recentProducts.length === 0
                ? [{ key: "empty", primary: isAr ? "لا توجد منتجات بعد." : "No products yet." }]
                : data.recentProducts.map((p) => ({
                    key: p.id,
                    primary: isAr ? p.nameAr || p.nameEn : p.nameEn || p.nameAr,
                    secondary: `${p.price.toLocaleString()} SAR`,
                    badge: p.status,
                  }))
            }
            linkHref="/dashboard/products"
            linkLabel={t("sections.viewAll")}
          />
          <Card
            title={t("sections.categories")}
            icon={<Layers className="w-4 h-4" />}
            items={
              data.recentCategories.length === 0
                ? [{ key: "empty", primary: isAr ? "لا توجد فئات بعد." : "No categories yet." }]
                : data.recentCategories.map((c) => ({
                    key: c.id,
                    primary: isAr ? c.nameAr || c.nameEn : c.nameEn || c.nameAr,
                    secondary: isAr ? `${c.productsCount} منتج` : `${c.productsCount} products`,
                  }))
            }
          />
        </div>
      )}
    </>
  );
}

function Card({
  title,
  icon,
  items,
  linkHref,
  linkLabel,
}: {
  title: string;
  icon: React.ReactNode;
  items: { key: string; primary: string; secondary?: string; badge?: string }[];
  linkHref?: string;
  linkLabel?: string;
}) {
  return (
    <div className="rounded-3xl border hairline bg-paper overflow-hidden">
      <div className="px-5 py-4 border-b hairline flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-ink">
          {icon}
          {title}
        </div>
        {linkHref && linkLabel && (
          <Link href={linkHref} className="text-xs text-muted-ink hover:text-ink transition-colors">
            {linkLabel} →
          </Link>
        )}
      </div>
      <ul className="divide-y hairline">
        {items.map((it) => (
          <li key={it.key} className="px-5 py-3 flex items-center gap-3 text-sm">
            <div className="flex-1 min-w-0 truncate text-ink">{it.primary}</div>
            {it.secondary && <div className="text-muted-ink tabular-nums text-xs">{it.secondary}</div>}
            {it.badge && (
              <span className="text-[10px] tracking-[0.18em] uppercase px-2 py-0.5 rounded-full border hairline text-muted-ink">
                {it.badge}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
