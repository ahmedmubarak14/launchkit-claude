import { setRequestLocale, getTranslations } from "next-intl/server";

export default async function SignupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border hairline bg-paper p-10">
        <h1 className="font-display text-3xl">{t("signupTitle")}</h1>
        <p className="mt-2 text-muted-ink">{t("signupSubtitle")}</p>
        <p className="mt-8 text-sm text-muted-ink">Auth UI wired next turn.</p>
      </div>
    </main>
  );
}
