"use client";

import { useLocale } from "next-intl";
import { useEffect } from "react";
import { Link } from "@/lib/i18n/navigation";
import { RefreshCcw, Home } from "lucide-react";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = useLocale();
  const isAr = locale === "ar";

  useEffect(() => {
    console.error("[locale-error]", error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6" dir={isAr ? "rtl" : "ltr"}>
      <div className="max-w-md text-center">
        <div className="text-xs tracking-[0.22em] uppercase text-muted-ink mb-4">
          {isAr ? "خطأ" : "Something went wrong"}
        </div>
        <h1 className="font-display text-4xl md:text-5xl leading-tight">
          {isAr ? "تعذّر تحميل هذه الصفحة." : "We couldn't load this page."}
        </h1>
        <p className="mt-4 text-muted-ink">
          {isAr
            ? "حدث خطأ غير متوقّع. يمكنك إعادة المحاولة أو العودة إلى الصفحة الرئيسية."
            : "An unexpected error occurred. Try again, or head back to the landing page."}
        </p>
        {error.digest && (
          <p className="mt-6 text-xs text-muted-ink tabular-nums">
            ref · {error.digest}
          </p>
        )}
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-ink text-paper text-sm font-medium hover:bg-ink/85 transition-colors"
          >
            <RefreshCcw className="w-4 h-4" />
            {isAr ? "إعادة المحاولة" : "Try again"}
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 h-11 px-5 rounded-full border hairline text-ink text-sm hover:bg-cream transition-colors"
          >
            <Home className="w-4 h-4" />
            {isAr ? "الصفحة الرئيسية" : "Home"}
          </Link>
        </div>
      </div>
    </main>
  );
}
