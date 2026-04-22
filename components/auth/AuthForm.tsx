"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { loginAction, signupAction, type AuthState } from "@/app/[locale]/(auth)/actions";
import { ArrowRight, Loader2 } from "lucide-react";

type Mode = "login" | "signup";

export function AuthForm({ mode }: { mode: Mode }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const isAr = locale === "ar";

  const action = mode === "login" ? loginAction : signupAction;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, null);

  return (
    <div className="w-full max-w-md rounded-3xl border hairline bg-paper p-8 md:p-10 shadow-[0_24px_60px_-30px_rgba(11,11,12,0.15)]">
      <div className="mb-8">
        <h1 className="font-display text-3xl md:text-4xl leading-tight">
          {mode === "login" ? t("loginTitle") : t("signupTitle")}
        </h1>
        <p className="mt-2 text-muted-ink">
          {mode === "login" ? t("loginSubtitle") : t("signupSubtitle")}
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="locale" value={locale} />

        {mode === "signup" && (
          <Field name="name" label={t("name")} autoComplete="name" />
        )}
        <Field name="email" label={t("email")} type="email" autoComplete="email" inputMode="email" />
        <Field
          name="password"
          label={t("password")}
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          minLength={mode === "login" ? 6 : 8}
        />

        {state?.error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2.5 rounded-xl">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full h-12 rounded-full bg-ink text-paper font-medium inline-flex items-center justify-center gap-2 hover:bg-ink/85 transition-colors disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              {mode === "login" ? t("submitLogin") : t("submitSignup")}
              <ArrowRight className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-muted-ink">
        {mode === "login" ? (
          <Link href="/signup" className="hover:text-ink transition-colors">
            {t("switchToSignup")}
          </Link>
        ) : (
          <Link href="/login" className="hover:text-ink transition-colors">
            {t("switchToLogin")}
          </Link>
        )}
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  autoComplete,
  inputMode,
  minLength,
}: {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  inputMode?: "email" | "text";
  minLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-xs tracking-[0.18em] uppercase text-muted-ink">{label}</span>
      <input
        name={name}
        type={type}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        inputMode={inputMode}
        className="mt-2 w-full h-12 px-4 rounded-2xl border hairline bg-paper focus:outline-none focus:border-ink transition-colors"
      />
    </label>
  );
}
