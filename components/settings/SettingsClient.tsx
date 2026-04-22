"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Loader2, Check, Unplug, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";
import {
  updateProfileAction,
  disconnectZidAction,
  type SettingsState,
} from "@/app/[locale]/(app)/settings/actions";

type Store = { name: string | null; id: string; createdAt: string } | null;

export function SettingsClient({
  email,
  name,
  store,
}: {
  email: string;
  name: string | null;
  store: Store;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const isAr = locale === "ar";
  const router = useRouter();

  const [profileState, profileAction, profilePending] = useActionState<SettingsState, FormData>(
    updateProfileAction,
    null
  );
  const [zidState, zidFormAction, zidPending] = useActionState<SettingsState, FormData>(
    disconnectZidAction,
    null
  );

  const onSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(`/${locale}/login`);
    router.refresh();
  };

  return (
    <div className="max-w-2xl mx-auto px-6 lg:px-10 py-12 space-y-10">
      <div>
        <div className="text-xs tracking-[0.22em] uppercase text-muted-ink mb-2">
          {isAr ? "الحساب" : "Account"}
        </div>
        <h1 className="font-display text-3xl md:text-4xl tracking-tight">
          {isAr ? "الإعدادات" : "Settings"}
        </h1>
      </div>

      {/* Profile */}
      <section className="rounded-3xl border hairline bg-paper p-8">
        <h2 className="font-display text-xl mb-1">{isAr ? "الملف الشخصي" : "Profile"}</h2>
        <p className="text-sm text-muted-ink mb-6">
          {isAr ? "بياناتك الأساسية في لانش كِت." : "Your core LaunchKit details."}
        </p>
        <form action={profileAction} className="space-y-4">
          <input type="hidden" name="locale" value={locale} />
          <div>
            <label className="block text-xs tracking-[0.18em] uppercase text-muted-ink mb-2">
              {t("auth.email")}
            </label>
            <div className="h-11 px-4 rounded-2xl bg-cream border hairline flex items-center text-sm text-muted-ink">
              {email}
            </div>
          </div>
          <div>
            <label className="block text-xs tracking-[0.18em] uppercase text-muted-ink mb-2">
              {t("auth.name")}
            </label>
            <input
              name="name"
              required
              minLength={2}
              defaultValue={name ?? ""}
              className="w-full h-11 px-4 rounded-2xl border hairline bg-paper focus:outline-none focus:border-ink transition-colors text-sm"
            />
          </div>

          {profileState?.error && (
            <p className="text-sm text-red-600">{profileState.error}</p>
          )}
          {profileState?.ok && (
            <p className="text-sm text-emerald-700 inline-flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              {isAr ? "تمّ الحفظ بنجاح." : "Saved."}
            </p>
          )}

          <button
            type="submit"
            disabled={profilePending}
            className="h-11 px-5 rounded-full bg-ink text-paper text-sm font-medium inline-flex items-center gap-2 hover:bg-ink/85 transition-colors disabled:opacity-60"
          >
            {profilePending && <Loader2 className="w-4 h-4 animate-spin" />}
            {t("common.save")}
          </button>
        </form>
      </section>

      {/* Language */}
      <section className="rounded-3xl border hairline bg-paper p-8 flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl">{isAr ? "اللغة" : "Language"}</h2>
          <p className="text-sm text-muted-ink mt-1">
            {isAr ? "بدّل لغة واجهة لانش كِت." : "Switch the LaunchKit interface."}
          </p>
        </div>
        <LanguageToggle />
      </section>

      {/* Zid connection */}
      <section className="rounded-3xl border hairline bg-paper p-8">
        <h2 className="font-display text-xl mb-1">
          {isAr ? "ربط زد" : "Zid connection"}
        </h2>
        <p className="text-sm text-muted-ink mb-6">
          {isAr
            ? "إدارة ربط لانش كِت بمتجرك على زد."
            : "Manage the link with your Zid store."}
        </p>

        {store ? (
          <div className="space-y-5">
            <div className="rounded-2xl bg-cream/60 border hairline px-5 py-4">
              <div className="text-xs tracking-[0.18em] uppercase text-muted-ink">
                {isAr ? "مربوط" : "Connected"}
              </div>
              <div className="font-display text-lg mt-1">{store.name || store.id}</div>
              <div className="text-xs text-muted-ink mt-1 tabular-nums">ID · {store.id}</div>
            </div>

            <form action={zidFormAction}>
              <input type="hidden" name="locale" value={locale} />
              {zidState?.error && (
                <p className="text-sm text-red-600 mb-3">{zidState.error}</p>
              )}
              {zidState?.ok && (
                <p className="text-sm text-emerald-700 mb-3 inline-flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  {isAr ? "تمّ فصل المتجر." : "Disconnected."}
                </p>
              )}
              <button
                type="submit"
                disabled={zidPending}
                className="h-11 px-5 rounded-full border border-red-200 bg-red-50 text-red-700 text-sm font-medium inline-flex items-center gap-2 hover:bg-red-100 transition-colors disabled:opacity-60"
              >
                {zidPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unplug className="w-4 h-4" />}
                {isAr ? "فصل المتجر" : "Disconnect store"}
              </button>
            </form>
          </div>
        ) : (
          <p className="text-sm text-muted-ink">
            {isAr ? "لا يوجد متجر مربوط حالياً." : "No store is linked."}
          </p>
        )}
      </section>

      {/* Sign out */}
      <section className="flex justify-end">
        <button
          onClick={onSignOut}
          className="h-11 px-5 rounded-full border hairline text-sm text-ink inline-flex items-center gap-2 hover:bg-cream transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {isAr ? "تسجيل الخروج" : "Sign out"}
        </button>
      </section>
    </div>
  );
}
