"use client";

import { useState } from "react";
import { Check, LayoutTemplate, Star, Truck, Shield, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIAction } from "@/types";

interface LandingPageProps {
    action: AIAction;
    sessionId: string;
    language: "en" | "ar";
    onConfirm: (data: any) => void;
}

export function LandingPageCard({ action, language, onConfirm }: LandingPageProps) {
    const [confirmed, setConfirmed] = useState(false);
    const data = action.data as any;
    const isRTL = language === "ar";

    const handleConfirm = () => {
        setConfirmed(true);
        onConfirm(data);
    };

    if (confirmed) {
        return (
            <div className="bg-gradient-to-r from-emerald-50 to-emerald-50/50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm" dir={isRTL ? "rtl" : "ltr"}>
                <div className="w-9 h-9 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                    <p className="text-sm font-semibold text-emerald-700">
                        {language === "en" ? "Landing Page Generated!" : "تم إنشاء الصفحة المقصودة!"}
                    </p>
                    <p className="text-xs text-emerald-500 mt-0.5">
                        {language === "en" ? "Section layout saved to your store profile." : "تم حفظ تخطيط القسم في ملف تعريف متجرك."}
                    </p>
                </div>
            </div>
        );
    }

    const primaryColor = data?.primaryColor || "#7C3AED";
    const heroDb = data?.hero || { headline: "Your Store", subheadline: "Welcome", cta: "Shop Now" };
    const features = data?.features || [];
    const testimonials = data?.testimonials || [];

    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-4 shadow-md overflow-hidden" dir={isRTL ? "rtl" : "ltr"}>
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-violet-100 border border-violet-200 flex items-center justify-center">
                    <LayoutTemplate className="w-4 h-4 text-violet-600" />
                </div>
                <div>
                    <span className="text-sm font-bold text-gray-900 block">
                        {language === "en" ? "Landing Page Preview" : "معاينة الصفحة المقصودة"}
                    </span>
                    <span className="text-[10px] text-gray-500 block">
                        {language === "en" ? "AI Generated Layout" : "تخطيط من إنشاء الذكاء الاصطناعي"}
                    </span>
                </div>
            </div>

            {/* Browser Mockup Wrapper */}
            <div className="rounded-xl border border-gray-200 overflow-hidden shadow-inner bg-gray-50/50">
                {/* Mockup Header */}
                <div className="bg-gray-100/80 px-3 py-2 border-b border-gray-200 flex items-center gap-1.5" dir="ltr">
                    <div className="flex gap-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                    </div>
                    <div className="mx-auto h-4 w-32 bg-white rounded flex items-center justify-center text-[8px] text-gray-400 font-medium">
                        myshop.zid.store
                    </div>
                </div>

                {/* Content Preview */}
                <div className="p-0">
                    {/* Hero Section */}
                    <div
                        className="px-6 py-12 flex flex-col items-center justify-center text-center text-white"
                        style={{ backgroundColor: primaryColor }}
                    >
                        <h1 className="text-xl font-bold mb-2 tracking-tight">{heroDb.headline}</h1>
                        <p className="text-white/80 text-xs mb-5 max-w-[200px] leading-relaxed">{heroDb.subheadline}</p>
                        <button className="bg-white text-gray-900 px-5 py-2 rounded-full text-[10px] font-bold shadow-sm flex items-center gap-1">
                            {heroDb.cta} <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>

                    {/* Features Section */}
                    {features.length > 0 && (
                        <div className="py-6 px-4 bg-white">
                            <div className="grid grid-cols-2 gap-3">
                                {features.map((f: any, i: number) => (
                                    <div key={i} className="flex flex-col items-center text-center p-3 rounded-lg bg-gray-50 border border-gray-100">
                                        <div className="w-8 h-8 rounded-full mb-2 flex items-center justify-center" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
                                            {f.icon === 'truck' ? <Truck className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                                        </div>
                                        <h3 className="text-[10px] font-bold text-gray-800">{f.title}</h3>
                                        <p className="text-[8px] text-gray-500 mt-0.5">{f.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Testimonials */}
                    {testimonials.length > 0 && (
                        <div className="py-5 px-4 bg-gray-50 border-t border-gray-100">
                            <div className="flex flex-col gap-2">
                                {testimonials.map((t: any, i: number) => (
                                    <div key={i} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm relative">
                                        <div className="flex text-amber-400 mb-1">
                                            {[...Array(5)].map((_, j) => <Star key={j} className="w-2.5 h-2.5 fill-current" />)}
                                        </div>
                                        <p className="text-[10px] text-gray-600 italic">"{t.quote}"</p>
                                        <p className="text-[9px] font-bold text-gray-900 mt-1.5">— {t.author}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* Actions */}
            <Button
                onClick={handleConfirm}
                className="w-full text-white text-sm font-semibold rounded-xl px-5 py-2.5 shadow-md transition-all hover:-translate-y-0.5"
                style={{ backgroundColor: primaryColor }}
            >
                <Check className="w-4 h-4 mr-1.5" />
                {language === "en" ? "Approve Layout" : "اعتماد التخطيط"}
            </Button>
        </div>
    );
}
