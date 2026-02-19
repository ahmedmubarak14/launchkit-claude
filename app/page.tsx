"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  MessageSquare,
  Zap,
  BarChart3,
  Globe,
  ArrowRight,
  CheckCircle2,
  Star,
  ShoppingBag,
  Layers,
  Target,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const translations = {
  en: {
    nav: {
      features: "Features",
      pricing: "Pricing",
      login: "Log in",
      cta: "Get Started Free",
    },
    hero: {
      badge: "Now available for Zid merchants",
      headline: "Setup Your Store in",
      headline2: "Minutes with AI",
      sub: "Stop wasting hours on manual store setup. Just describe your business in plain language — LaunchKit AI creates categories, products, and marketing configuration automatically.",
      cta: "Get Started Free",
      ctaSub: "No credit card required",
      demo: "Watch Demo",
      trusted: "Trusted by 500+ merchants",
    },
    features: {
      title: "Everything you need to launch fast",
      sub: "Three powerful capabilities that turn a conversation into a complete store.",
      cards: [
        { icon: "layers", title: "AI Categories", desc: "Describe your product range. AI generates a complete, SEO-optimized category structure in Arabic and English — instantly.", badge: "Smart" },
        { icon: "shopping", title: "Smart Products", desc: "Talk about what you sell. AI drafts product listings with names, descriptions, variants, and pricing in both languages.", badge: "Bilingual" },
        { icon: "target", title: "Marketing Setup", desc: "Get your store ready to sell. AI configures your marketing settings, tags, and metadata based on your business goals.", badge: "Automated" },
      ],
    },
    how: {
      title: "Three steps to a live store",
      steps: [
        { num: "01", title: "Connect your store", desc: "Link your Zid account securely with OAuth — one click." },
        { num: "02", title: "Describe your business", desc: "Chat with AI in Arabic or English. Tell it what you sell, your niche, your audience." },
        { num: "03", title: "Review and publish", desc: "AI shows you exactly what it will create. You approve, edit, or skip. Done." },
      ],
    },
    social: {
      title: "What merchants say",
      reviews: [
        { name: "Sarah Al-Rashidi", role: "Fashion Boutique Owner", text: "Set up 40 products and 8 categories in under 20 minutes. Would have taken me 3 days manually.", stars: 5 },
        { name: "Mohammed Al-Farsi", role: "Electronics Retailer", text: "The bilingual output is perfect. Arabic descriptions that actually sound native — not just translated.", stars: 5 },
        { name: "Nora Abdullah", role: "Skincare Brand", text: "I described my products once. The AI understood my brand voice and nailed every description.", stars: 5 },
      ],
    },
    pricing: {
      title: "Simple, honest pricing",
      sub: "Start free. Upgrade when you're ready.",
      plans: [
        { name: "Starter", price: "Free", period: "", desc: "Perfect for new merchants", features: ["1 store connection", "Up to 20 products", "AI chat setup", "Arabic + English"], cta: "Start Free", highlight: false },
        { name: "Growth", price: "SAR 99", period: "/mo", desc: "For scaling merchants", features: ["3 store connections", "Unlimited products", "Priority AI responses", "Marketing config", "Analytics dashboard"], cta: "Start 14-day Trial", highlight: true },
        { name: "Pro", price: "SAR 299", period: "/mo", desc: "For agencies and power users", features: ["Unlimited stores", "Custom AI training", "API access", "White-label option", "Dedicated support"], cta: "Contact Sales", highlight: false },
      ],
    },
    footer: { tagline: "AI-powered store setup for MENA merchants.", links: ["Privacy", "Terms", "Contact"] },
  },
  ar: {
    nav: {
      features: "المميزات",
      pricing: "الأسعار",
      login: "تسجيل الدخول",
      cta: "ابدأ مجاناً",
    },
    hero: {
      badge: "متاح الآن لتجار زد",
      headline: "أنشئ متجرك في",
      headline2: "دقائق باستخدام الذكاء الاصطناعي",
      sub: "لا مزيد من الساعات في إعداد المتجر يدوياً. صف نشاطك التجاري بلغتك العادية — لاينش كيت يُنشئ الفئات والمنتجات والإعدادات التسويقية تلقائياً.",
      cta: "ابدأ مجاناً",
      ctaSub: "لا تحتاج بطاقة ائتمان",
      demo: "شاهد العرض",
      trusted: "يثق به أكثر من 500 تاجر",
    },
    features: {
      title: "كل ما تحتاجه للإطلاق بسرعة",
      sub: "ثلاث قدرات قوية تحوّل محادثة إلى متجر متكامل.",
      cards: [
        { icon: "layers", title: "فئات بالذكاء الاصطناعي", desc: "صف نطاق منتجاتك. يولّد الذكاء الاصطناعي هيكل فئات متكاملاً محسّناً لمحركات البحث بالعربية والإنجليزية — فوراً.", badge: "ذكي" },
        { icon: "shopping", title: "منتجات ذكية", desc: "تحدّث عمّا تبيعه. يصيغ الذكاء الاصطناعي قوائم المنتجات بأسماء وأوصاف ومتغيرات وأسعار بكلتا اللغتين.", badge: "ثنائي اللغة" },
        { icon: "target", title: "إعداد التسويق", desc: "اجعل متجرك جاهزاً للبيع. يُهيئ الذكاء الاصطناعي إعداداتك التسويقية والعلامات والبيانات الوصفية بناءً على أهدافك.", badge: "تلقائي" },
      ],
    },
    how: {
      title: "ثلاث خطوات لمتجر مباشر",
      steps: [
        { num: "01", title: "اربط متجرك", desc: "اربط حساب زد بأمان عبر OAuth — بنقرة واحدة." },
        { num: "02", title: "صف نشاطك التجاري", desc: "تحدّث مع الذكاء الاصطناعي بالعربية أو الإنجليزية. أخبره عمّا تبيعه ومجالك وجمهورك." },
        { num: "03", title: "راجع وانشر", desc: "يُظهر لك الذكاء الاصطناعي ما سينشئه. وافق أو عدّل أو تخطَّ. انتهى." },
      ],
    },
    social: {
      title: "ماذا يقول التجار",
      reviews: [
        { name: "سارة الراشدي", role: "صاحبة بوتيك أزياء", text: "أنشأت 40 منتجاً و8 فئات في أقل من 20 دقيقة. كان سيستغرق مني 3 أيام يدوياً.", stars: 5 },
        { name: "محمد الفارسي", role: "تاجر إلكترونيات", text: "المحتوى ثنائي اللغة مثالي. أوصاف عربية تبدو طبيعية تماماً — ليست مجرد ترجمة.", stars: 5 },
        { name: "نورة عبدالله", role: "علامة تجارية للعناية بالبشرة", text: "وصفت منتجاتي مرة واحدة. فهم الذكاء الاصطناعي أسلوب علامتي التجارية وأتقن كل وصف.", stars: 5 },
      ],
    },
    pricing: {
      title: "تسعير بسيط وشفاف",
      sub: "ابدأ مجاناً. ارقَّ عندما تكون مستعداً.",
      plans: [
        { name: "مبتدئ", price: "مجاناً", period: "", desc: "مثالي للتجار الجدد", features: ["ربط متجر واحد", "حتى 20 منتجاً", "إعداد بالدردشة AI", "عربي + إنجليزي"], cta: "ابدأ مجاناً", highlight: false },
        { name: "نمو", price: "٩٩ ر.س", period: "/شهر", desc: "للتجار في مرحلة التوسع", features: ["3 متاجر متصلة", "منتجات غير محدودة", "ردود AI أولوية", "إعداد التسويق", "لوحة التحليلات"], cta: "جرّب 14 يوماً مجاناً", highlight: true },
        { name: "احترافي", price: "٢٩٩ ر.س", period: "/شهر", desc: "للوكالات والمستخدمين المتقدمين", features: ["متاجر غير محدودة", "تدريب AI مخصص", "وصول API", "خيار White-label", "دعم مخصص"], cta: "تواصل مع المبيعات", highlight: false },
      ],
    },
    footer: { tagline: "إعداد المتاجر بالذكاء الاصطناعي لتجار منطقة الشرق الأوسط وشمال أفريقيا.", links: ["الخصوصية", "الشروط", "التواصل"] },
  },
};

const FeatureIcon = ({ type }: { type: string }) => {
  if (type === "layers") return <Layers className="w-6 h-6 text-violet-600" />;
  if (type === "shopping") return <ShoppingBag className="w-6 h-6 text-violet-600" />;
  return <Target className="w-6 h-6 text-violet-600" />;
};

export default function LandingPage() {
  const [lang, setLang] = useState<"en" | "ar">("en");
  const t = translations[lang];
  const isRTL = lang === "ar";

  return (
    <div
      className="min-h-screen bg-[#F8FAFC]"
      dir={isRTL ? "rtl" : "ltr"}
      style={{ fontFamily: isRTL ? "'IBM Plex Sans Arabic', sans-serif" : "'Inter', sans-serif" }}
    >
      {/* HEADER */}
      <header className="sticky top-0 z-50 glass border-b border-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-violet-800 flex items-center justify-center shadow-md">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900">LaunchKit</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-gray-600 hover:text-violet-600 transition-colors font-medium">{t.nav.features}</a>
            <a href="#pricing" className="text-sm text-gray-600 hover:text-violet-600 transition-colors font-medium">{t.nav.pricing}</a>
          </nav>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLang(lang === "en" ? "ar" : "en")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:border-violet-300 transition-all text-sm font-medium text-gray-600 hover:text-violet-600 shadow-sm"
            >
              <Globe className="w-4 h-4" />
              {lang === "en" ? "AR" : "EN"}
            </button>
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-violet-600 font-medium">{t.nav.login}</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl px-4 shadow-md shadow-violet-200 transition-all hover:shadow-lg hover:shadow-violet-300 hover:-translate-y-0.5">
                {t.nav.cta}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden pt-20 pb-32">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-violet-100/80 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-20 right-0 w-72 h-72 bg-emerald-100/50 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-violet-100/50 rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-6">
            <Badge className="bg-violet-50 text-violet-700 border border-violet-200 px-4 py-1.5 rounded-full text-sm font-medium shadow-sm">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />{t.hero.badge}
            </Badge>
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight tracking-tight mb-6">
            {t.hero.headline} <span className="gradient-text">{t.hero.headline2}</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">{t.hero.sub}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/signup">
              <Button size="lg" className="bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white font-semibold px-8 py-6 rounded-2xl shadow-xl shadow-violet-200/60 transition-all hover:-translate-y-1 text-base">
                {t.hero.cta}<ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="border-gray-200 text-gray-700 hover:border-violet-300 hover:text-violet-600 font-medium px-8 py-6 rounded-2xl text-base bg-white/80 backdrop-blur-sm">
              <MessageSquare className="w-4 h-4 mr-2" />{t.hero.demo}
            </Button>
          </div>
          <div className="flex items-center justify-center gap-3 text-sm text-gray-500 mb-20">
            <div className="flex -space-x-2">
              {["F","M","N","A","K"].map((l,i) => (
                <div key={i} className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-sm"
                  style={{ background: `hsl(${262+i*15},70%,${55+i*3}%)` }}>{l}</div>
              ))}
            </div>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_,i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
            </div>
            <span>{t.hero.trusted}</span>
          </div>

          {/* Mockup */}
          <div className="relative max-w-5xl mx-auto">
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#F8FAFC] to-transparent z-10 pointer-events-none" />
            <div className="rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-gray-200/80 overflow-hidden">
              <div className="h-10 bg-gray-50 border-b border-gray-100 flex items-center px-4 gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
                </div>
                <div className="flex-1 mx-4 h-6 bg-white rounded-md border border-gray-200 flex items-center px-3 text-xs text-gray-400 font-mono">
                  app.launchkit.ai/setup
                </div>
              </div>
              <div className="flex h-[420px]">
                {/* Sidebar */}
                <div className="w-64 border-r border-gray-100 bg-gray-50/50 p-4 flex flex-col gap-3">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Setup Progress</div>
                  {["Business Info","Categories","Products","Marketing"].map((step,i) => (
                    <div key={step} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      i===1?"bg-violet-600 text-white shadow-md shadow-violet-200":i<1?"text-emerald-600 bg-emerald-50":"text-gray-400"}`}>
                      {i<1?<CheckCircle2 className="w-4 h-4"/>:<div className={`w-4 h-4 rounded-full border-2 ${i===1?"border-white bg-white/30":"border-gray-300"}`}/>}
                      {step}
                    </div>
                  ))}
                  <div className="mt-auto">
                    <div className="text-xs text-gray-400 mb-2">25% complete</div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full w-1/4 bg-gradient-to-r from-violet-500 to-violet-600 rounded-full" />
                    </div>
                  </div>
                </div>
                {/* Chat */}
                <div className="flex-1 flex flex-col">
                  <div className="flex-1 p-6 space-y-4 overflow-hidden">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center flex-shrink-0 shadow-md">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-white rounded-2xl rounded-tl-sm border border-gray-100 p-4 max-w-sm shadow-sm">
                        <p className="text-sm text-gray-700">Great! I will set up a fashion boutique store. Here are the categories I suggest:</p>
                      </div>
                    </div>
                    <div className="ml-11 flex flex-wrap gap-2">
                      {["Women's Wear","Men's Fashion","Kids' Collection","Accessories"].map(cat=>(
                        <span key={cat} className="px-3 py-1.5 bg-violet-50 text-violet-700 rounded-xl text-xs font-medium border border-violet-100">{cat}</span>
                      ))}
                      <div className="flex gap-2 w-full mt-1">
                        <button className="px-4 py-1.5 bg-violet-600 text-white rounded-xl text-xs font-medium shadow-sm">Confirm</button>
                        <button className="px-4 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-xl text-xs font-medium">Edit</button>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 justify-end">
                      <div className="bg-gradient-to-br from-violet-600 to-violet-700 rounded-2xl rounded-br-sm p-4 max-w-xs shadow-md shadow-violet-200/50">
                        <p className="text-sm text-white">Yes, that looks great! Let us go with those categories.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center flex-shrink-0 shadow-md">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-white rounded-2xl rounded-tl-sm border border-gray-100 p-4 shadow-sm">
                        <div className="flex gap-1.5 items-center h-4">
                          <div className="w-2 h-2 rounded-full bg-violet-400 typing-dot" />
                          <div className="w-2 h-2 rounded-full bg-violet-400 typing-dot" />
                          <div className="w-2 h-2 rounded-full bg-violet-400 typing-dot" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 border-t border-gray-100 bg-white/50">
                    <div className="flex gap-3 items-center bg-white rounded-2xl border border-gray-200 px-4 py-3 shadow-sm">
                      <input className="flex-1 text-sm text-gray-400 bg-transparent outline-none placeholder:text-gray-300" placeholder="Describe your next product..." readOnly />
                      <button className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center shadow-md">
                        <ArrowRight className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>
                </div>
                {/* Preview */}
                <div className="w-64 border-l border-gray-100 bg-gray-50/50 p-4">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Preview</div>
                  <div className="space-y-3">
                    <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
                      <div className="text-xs font-semibold text-gray-700 mb-1">Categories (4)</div>
                      <div className="flex flex-wrap gap-1">
                        {["Women","Men","Kids","Access."].map(c=>(
                          <span key={c} className="text-[10px] px-2 py-0.5 bg-violet-50 text-violet-600 rounded-md border border-violet-100 font-medium">{c}</span>
                        ))}
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm opacity-50">
                      <div className="text-xs font-semibold text-gray-400 mb-1">Products (0)</div>
                      <div className="text-[10px] text-gray-300">Coming next...</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="bg-violet-50 text-violet-700 border border-violet-200 mb-4 px-4 py-1 rounded-full text-sm">Features</Badge>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">{t.features.title}</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">{t.features.sub}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {t.features.cards.map((card,i) => (
              <div key={i} className="group relative bg-white rounded-2xl border border-gray-100 p-8 shadow-sm hover:shadow-xl hover:shadow-violet-100/50 transition-all duration-300 hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-50/0 to-violet-50/80 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center mb-6 group-hover:bg-violet-100 transition-colors shadow-sm">
                    <FeatureIcon type={card.icon} />
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-xl font-bold text-gray-900">{card.title}</h3>
                    <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-xs px-2 py-0.5">{card.badge}</Badge>
                  </div>
                  <p className="text-gray-500 leading-relaxed">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">{t.how.title}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {t.how.steps.map((step,i) => (
              <div key={i} className="relative flex flex-col items-center text-center">
                {i<t.how.steps.length-1 && <div className="hidden md:block absolute top-6 left-[60%] w-full h-px bg-gradient-to-r from-violet-200 to-transparent z-0" />}
                <div className="relative z-10 w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-violet-800 flex items-center justify-center text-white font-bold text-sm mb-6 shadow-lg shadow-violet-200">{step.num}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-500 leading-relaxed max-w-xs">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">{t.social.title}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {t.social.reviews.map((review,i) => (
              <div key={i} className="bg-[#F8FAFC] rounded-2xl border border-gray-100 p-8 hover:shadow-lg hover:shadow-violet-50 transition-all">
                <div className="flex gap-1 mb-4">
                  {[...Array(review.stars)].map((_,j) => <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-gray-600 leading-relaxed mb-6 italic">&ldquo;{review.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-md">{review.name[0]}</div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{review.name}</div>
                    <div className="text-gray-400 text-xs">{review.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">{t.pricing.title}</h2>
            <p className="text-lg text-gray-500">{t.pricing.sub}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {t.pricing.plans.map((plan,i) => (
              <div key={i} className={`relative rounded-2xl p-8 transition-all duration-300 ${plan.highlight?"bg-gradient-to-br from-violet-600 to-violet-800 text-white shadow-2xl shadow-violet-300/40 scale-105":"bg-white border border-gray-100 shadow-sm hover:shadow-lg"}`}>
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-emerald-400 text-white border-0 px-4 py-1 text-xs font-semibold shadow-md">
                      <Zap className="w-3 h-3 mr-1" />Most Popular
                    </Badge>
                  </div>
                )}
                <div className={`text-sm font-semibold mb-2 ${plan.highlight?"text-violet-200":"text-gray-400"}`}>{plan.name}</div>
                <div className="flex items-end gap-1 mb-2">
                  <span className={`text-4xl font-bold ${plan.highlight?"text-white":"text-gray-900"}`}>{plan.price}</span>
                  <span className={`text-sm mb-1 ${plan.highlight?"text-violet-200":"text-gray-400"}`}>{plan.period}</span>
                </div>
                <p className={`text-sm mb-6 ${plan.highlight?"text-violet-200":"text-gray-500"}`}>{plan.desc}</p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature,j) => (
                    <li key={j} className="flex items-center gap-2.5 text-sm">
                      <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${plan.highlight?"text-emerald-300":"text-emerald-500"}`} />
                      <span className={plan.highlight?"text-violet-100":"text-gray-600"}>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/signup">
                  <Button className={`w-full rounded-xl font-semibold transition-all ${plan.highlight?"bg-white text-violet-700 hover:bg-violet-50 shadow-md":"bg-violet-600 text-white hover:bg-violet-700 shadow-md shadow-violet-200"}`}>
                    {plan.cta}<ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="py-20 bg-gradient-to-br from-violet-600 to-violet-800 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/30 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-violet-900/30 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6 leading-tight">
            {lang==="en"?"Ready to launch?":"جاهز للإطلاق؟"}
          </h2>
          <p className="text-xl text-violet-200 mb-10">
            {lang==="en"?"Join 500+ merchants who set up their stores in minutes, not days.":"انضم إلى أكثر من 500 تاجر أنشأوا متاجرهم في دقائق، لا أيام."}
          </p>
          <Link href="/signup">
            <Button size="lg" className="bg-white text-violet-700 hover:bg-violet-50 font-bold px-10 py-6 rounded-2xl text-base shadow-2xl shadow-violet-900/30 transition-all hover:-translate-y-1">
              {lang==="en"?"Get Started Free — No Card Required":"ابدأ مجاناً — لا بطاقة مطلوبة"}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-md">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-white">LaunchKit</span>
            </div>
            <p className="text-gray-400 text-sm">{t.footer.tagline}</p>
            <div className="flex gap-6">
              {t.footer.links.map(link=><a key={link} href="#" className="text-gray-400 hover:text-white text-sm transition-colors">{link}</a>)}
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-500 text-xs">
            2025 LaunchKit. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
