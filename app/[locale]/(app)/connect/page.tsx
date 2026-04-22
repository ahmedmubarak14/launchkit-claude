import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Store, ArrowRight, Check, Info } from "lucide-react";

export default async function ConnectPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  const { next } = await searchParams;
  setRequestLocale(locale);
  const isAr = locale === "ar";
  const bouncedFromSetup = next === "/setup";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: store } = await supabase
    .from("stores")
    .select("store_name, store_id")
    .eq("user_id", user?.id)
    .eq("platform", "zid")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const connected = !!store?.store_id;

  return (
    <div className="max-w-3xl mx-auto px-6 lg:px-10 py-14">
      <div className="text-xs tracking-[0.22em] uppercase text-muted-ink mb-4">
        {isAr ? "الاتصال" : "Connection"}
      </div>
      <h1 className="font-display text-4xl md:text-5xl tracking-tight leading-tight">
        {isAr ? "اربط متجر زد الخاص بك" : "Connect your Zid store"}
      </h1>
      <p className="mt-4 text-muted-ink text-lg max-w-2xl">
        {isAr
          ? "خطوة واحدة. بعدها يصبح لانش كيت زميلاً داخل متجرك، يقرأ كتالوجك ويدير كل عملية نيابة عنك."
          : "One click. LaunchKit becomes a teammate inside your store — reading your catalogue and running every operation on your behalf."}
      </p>

      {bouncedFromSetup && !connected && (
        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-champagne/40 bg-champagne/10 px-4 py-3 text-sm">
          <Info className="w-4 h-4 text-champagne mt-0.5 flex-shrink-0" />
          <p className="text-ink leading-relaxed">
            {isAr
              ? "مساحة العمل تحتاج متجر زد مربوطاً. اربطه الآن وسنعيدك مباشرة بعد ذلك."
              : "The workspace needs a connected Zid store. Link it now and we'll drop you back in."}
          </p>
        </div>
      )}

      <div className="mt-10 rounded-3xl border hairline bg-paper p-8 flex items-center gap-6">
        <div className="w-14 h-14 rounded-2xl bg-cream border hairline flex items-center justify-center">
          <Store className="w-6 h-6 text-ink" />
        </div>
        <div className="flex-1">
          <div className="font-display text-xl">Zid</div>
          <div className="text-sm text-muted-ink mt-0.5">
            {connected
              ? (isAr ? `متصل · ${store?.store_name || store?.store_id}` : `Connected · ${store?.store_name || store?.store_id}`)
              : (isAr ? "غير مرتبط" : "Not connected")}
          </div>
        </div>
        {connected ? (
          <span className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
            <Check className="w-4 h-4" />
            {isAr ? "مفعَّل" : "Active"}
          </span>
        ) : (
          // eslint-disable-next-line @next/next/no-html-link-for-pages
          <a
            href="/api/auth/zid/authorize"
            rel="external"
            className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-ink text-paper text-sm font-medium hover:bg-ink/85 transition-colors"
          >
            {isAr ? "ربط زد" : "Connect Zid"}
            <ArrowRight className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />
          </a>
        )}
      </div>
    </div>
  );
}
