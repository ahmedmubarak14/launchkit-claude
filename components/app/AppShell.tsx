"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";
import { LayoutDashboard, Package, Sparkles, Store, Settings, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

export function AppShell({
  user,
  storeName,
  children,
}: {
  user: { email: string; name?: string | null };
  storeName: string | null;
  children: React.ReactNode;
}) {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations();
  const isAr = locale === "ar";
  const router = useRouter();

  const nav: NavItem[] = [
    { href: "/dashboard", label: t("dashboard.greeting", { name: "" }).replace(",", "").trim() || "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/products", label: t("products.title"), icon: Package },
    { href: "/setup", label: isAr ? "مساحة العمل" : "Workspace", icon: Sparkles },
    { href: "/connect", label: isAr ? "الاتصال بـ زد" : "Zid connection", icon: Store },
    { href: "/settings", label: isAr ? "الإعدادات" : "Settings", icon: Settings },
  ];

  const onSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(`/${locale}/login`);
    router.refresh();
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[260px_1fr] bg-paper">
      <aside className="hidden md:flex flex-col border-e hairline bg-cream/40">
        <div className="h-16 px-6 flex items-center">
          <Link href="/dashboard" className="font-display text-lg">LaunchKit</Link>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1">
          {nav.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  active
                    ? "bg-ink text-paper"
                    : "text-ink hover:bg-cream"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t hairline">
          <div className="px-3 py-2.5 rounded-xl bg-paper border hairline">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-champagne" />
              <span className="text-muted-ink uppercase tracking-[0.18em]">
                {isAr ? "المتجر" : "Store"}
              </span>
            </div>
            <div className="mt-1.5 text-sm font-medium text-ink truncate">
              {storeName ?? (isAr ? "غير مرتبط" : "Not connected")}
            </div>
          </div>
        </div>
      </aside>

      <div className="flex flex-col min-h-screen">
        <header className="h-16 px-6 flex items-center justify-between border-b hairline bg-paper">
          <div className="md:hidden font-display text-lg">LaunchKit</div>
          <div className="hidden md:block text-sm text-muted-ink truncate">
            {user.name || user.email}
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <button
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-muted-ink hover:text-ink hover:bg-cream transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              {isAr ? "خروج" : "Sign out"}
            </button>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
