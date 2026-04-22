import { Link } from "@/lib/i18n/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { ArrowRight } from "lucide-react";

export default async function NotFound() {
  const locale = await getLocale();
  const isAr = locale === "ar";
  await getTranslations();

  return (
    <main className="min-h-screen flex items-center justify-center p-6" dir={isAr ? "rtl" : "ltr"}>
      <div className="max-w-md text-center">
        <div className="font-display text-8xl md:text-9xl text-champagne tracking-tight">404</div>
        <h1 className="font-display text-3xl md:text-4xl mt-4 tracking-tight">
          {isAr ? "الصفحة غير موجودة." : "Page not found."}
        </h1>
        <p className="mt-4 text-muted-ink">
          {isAr
            ? "الرابط الذي تحاول الوصول إليه غير متوفّر. قد يكون تمّ نقله أو حذفه."
            : "The page you're looking for doesn't exist. It may have been moved or removed."}
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 h-11 px-5 rounded-full bg-ink text-paper text-sm font-medium hover:bg-ink/85 transition-colors"
        >
          {isAr ? "العودة إلى الرئيسية" : "Back to home"}
          <ArrowRight className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />
        </Link>
      </div>
    </main>
  );
}
