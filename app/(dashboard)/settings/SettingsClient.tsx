"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Globe, Store, User, Bell, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/layout/Header";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/store/useStore";
import { Profile, Store as StoreType } from "@/types";

interface SettingsClientProps {
  profile: Profile | null;
  store: StoreType | null;
  userEmail: string;
}

export function SettingsClient({ profile, store, userEmail }: SettingsClientProps) {
  const router = useRouter();
  const { language, setLanguage } = useAppStore();
  const [name, setName] = useState(profile?.name || "");
  const [prefLang, setPrefLang] = useState<"en" | "ar">(profile?.preferred_language || "en");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const isRTL = language === "ar";

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();
    await supabase.from("profiles").update({ name, preferred_language: prefLang }).eq("id", profile?.id);
    setLanguage(prefLang);
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 3000);
    router.refresh();
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC]" dir={isRTL ? "rtl" : "ltr"}>
      <Header storeName={store?.store_name} userEmail={userEmail} />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {isRTL ? "الإعدادات" : "Settings"}
        </h1>

        <div className="space-y-6">
          {/* Profile */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <User className="w-4 h-4 text-violet-500" />
              <h2 className="font-semibold text-gray-900">{isRTL ? "الملف الشخصي" : "Profile"}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  {isRTL ? "الاسم الكامل" : "Full Name"}
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ahmed Mohammed"
                  className="h-11 border-gray-200 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Email</Label>
                <Input value={userEmail} disabled className="h-11 border-gray-200 rounded-xl bg-gray-50 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Language */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <Globe className="w-4 h-4 text-violet-500" />
              <h2 className="font-semibold text-gray-900">{isRTL ? "اللغة" : "Language"}</h2>
            </div>
            <div className="p-6">
              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                {isRTL ? "اللغة المفضلة" : "Preferred Language"}
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {([["en", "English", "🇬🇧"], ["ar", "العربية", "🇸🇦"]] as const).map(([code, label, flag]) => (
                  <button
                    key={code}
                    onClick={() => setPrefLang(code)}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                      prefLang === code
                        ? "border-violet-500 bg-violet-50"
                        : "border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    <span className="text-xl">{flag}</span>
                    <span className={`font-medium text-sm ${prefLang === code ? "text-violet-700" : "text-gray-600"}`}>
                      {label}
                    </span>
                    {prefLang === code && (
                      <div className="ml-auto w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Connected store */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <Store className="w-4 h-4 text-violet-500" />
              <h2 className="font-semibold text-gray-900">{isRTL ? "المتجر المتصل" : "Connected Store"}</h2>
            </div>
            <div className="p-6">
              {store ? (
                <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                    <Store className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{store.store_name}</div>
                    <div className="text-sm text-emerald-600">{isRTL ? "متصل عبر OAuth" : "Connected via OAuth"}</div>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5 text-emerald-500">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-medium">{isRTL ? "نشط" : "Active"}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">{isRTL ? "لا يوجد متجر متصل" : "No store connected"}</p>
              )}
            </div>
          </div>

          {/* Save */}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-11 bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white font-semibold rounded-xl shadow-md shadow-violet-200 transition-all hover:-translate-y-0.5 gap-2"
          >
            {saving ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {isRTL ? "جاري الحفظ..." : "Saving..."}
              </div>
            ) : saved ? (
              <div className="flex items-center gap-2 text-emerald-200">
                ✓ {isRTL ? "تم الحفظ!" : "Saved!"}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                {isRTL ? "حفظ التغييرات" : "Save Changes"}
              </div>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
