"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { defaultLocale, locales, type Locale } from "@/lib/i18n/config";

const UpdateProfileSchema = z.object({
  name: z.string().min(2).max(80),
  locale: z.string(),
});

function resolveLocale(raw: string): Locale {
  return (locales as readonly string[]).includes(raw) ? (raw as Locale) : defaultLocale;
}

export type SettingsState = { ok?: boolean; error?: string } | null;

export async function updateProfileAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const parsed = UpdateProfileSchema.safeParse({
    name: formData.get("name"),
    locale: formData.get("locale"),
  });
  const locale = resolveLocale(String(formData.get("locale") || defaultLocale));
  if (!parsed.success) {
    return { error: locale === "ar" ? "تحقّق من الاسم." : "Check the name field." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: locale === "ar" ? "جلسة غير صالحة." : "Invalid session." };

  const { error } = await supabase
    .from("profiles")
    .update({ name: parsed.data.name })
    .eq("id", user.id);

  if (error) return { error: locale === "ar" ? "تعذّر الحفظ." : "Couldn't save." };

  revalidatePath(`/${locale}/settings`);
  return { ok: true };
}

export async function disconnectZidAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const locale = resolveLocale(String(formData.get("locale") || defaultLocale));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: locale === "ar" ? "جلسة غير صالحة." : "Invalid session." };

  const { error } = await supabase
    .from("stores")
    .delete()
    .eq("user_id", user.id)
    .eq("platform", "zid");

  if (error) return { error: locale === "ar" ? "تعذّر فصل المتجر." : "Couldn't disconnect the store." };

  revalidatePath(`/${locale}/settings`);
  revalidatePath(`/${locale}/dashboard`);
  return { ok: true };
}
