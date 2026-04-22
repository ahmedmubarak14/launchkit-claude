import { setRequestLocale, getTranslations } from "next-intl/server";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");

  return (
    <main className="p-10">
      <h1 className="font-display text-3xl">{t("greeting", { name: "…" })}</h1>
      <p className="mt-2 text-muted-ink">Dashboard wired next turn.</p>
    </main>
  );
}
