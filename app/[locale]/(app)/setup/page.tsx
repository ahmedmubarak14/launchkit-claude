import { setRequestLocale } from "next-intl/server";

export default async function SetupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isAr = locale === "ar";

  return (
    <div className="max-w-3xl mx-auto px-6 lg:px-10 py-20 text-center">
      <h1 className="font-display text-4xl">{isAr ? "مساحة العمل" : "Workspace"}</h1>
      <p className="mt-3 text-muted-ink">
        {isAr ? "الشات + الصوت + الأدوات قادم في الخطوة التالية." : "Chat + voice + tools — wired in the next commit."}
      </p>
    </div>
  );
}
