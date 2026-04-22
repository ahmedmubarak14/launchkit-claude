"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { defaultLocale, locales, type Locale } from "@/lib/i18n/config";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  locale: z.string(),
});

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).max(80),
  locale: z.string(),
});

function resolveLocale(raw: string): Locale {
  return (locales as readonly string[]).includes(raw) ? (raw as Locale) : defaultLocale;
}

export type AuthState = { error?: string } | null;

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    locale: formData.get("locale"),
  });
  const locale = resolveLocale(String(formData.get("locale") || defaultLocale));

  if (!parsed.success) {
    return { error: locale === "ar" ? "تحقّق من البريد وكلمة المرور." : "Check your email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: locale === "ar" ? "بيانات الدخول غير صحيحة." : "Incorrect email or password." };
  }

  redirect(`/${locale}/dashboard`);
}

export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = SignupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name"),
    locale: formData.get("locale"),
  });
  const locale = resolveLocale(String(formData.get("locale") || defaultLocale));

  if (!parsed.success) {
    const issues = parsed.error.issues[0]?.path[0];
    const map: Record<string, { en: string; ar: string }> = {
      email: { en: "Enter a valid email address.", ar: "أدخل بريداً إلكترونياً صحيحاً." },
      password: { en: "Password needs at least 8 characters.", ar: "كلمة المرور يجب أن تكون ٨ أحرف على الأقل." },
      name: { en: "Enter your full name.", ar: "أدخل اسمك الكامل." },
    };
    const fallback = { en: "Something looks off. Check the form.", ar: "تحقّق من النموذج." };
    const msg = map[String(issues ?? "")] ?? fallback;
    return { error: locale === "ar" ? msg.ar : msg.en };
  }

  const supabase = await createClient();
  const { error, data } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { name: parsed.data.name },
    },
  });

  if (error) {
    return { error: locale === "ar" ? "تعذّر إنشاء الحساب." : "Couldn't create the account." };
  }

  if (data.user) {
    await supabase.from("profiles").upsert({
      id: data.user.id,
      email: parsed.data.email,
      name: parsed.data.name,
    });
  }

  redirect(`/${locale}/connect`);
}
