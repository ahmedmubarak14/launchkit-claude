"use client";

import { useEffect } from "react";
import { Sparkles, Eye, EyeOff } from "lucide-react";
import { useAppStore } from "@/store/useStore";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { ProgressTracker } from "@/components/layout/ProgressTracker";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Language } from "@/types";

interface SetupClientPageProps {
  sessionId: string;
  storeName: string;
  userEmail: string;
  initialLanguage: Language;
}

export function SetupClientPage({
  sessionId,
  storeName,
  userEmail,
  initialLanguage,
}: SetupClientPageProps) {
  const { language, setLanguage, currentStep, categories, products } = useAppStore();
  const isRTL = language === "ar";

  useEffect(() => {
    setLanguage(initialLanguage);
  }, [initialLanguage, setLanguage]);

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC]" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <Header storeName={storeName} userEmail={userEmail} />

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — Progress tracker */}
        <aside className="w-64 border-r border-gray-100 bg-white flex-shrink-0 overflow-y-auto">
          <ProgressTracker
            currentStep={currentStep}
            language={language}
            categoriesCount={categories.length}
            productsCount={products.length}
          />
        </aside>

        {/* Center — Chat */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <ChatContainer sessionId={sessionId} />
        </main>

        {/* Right panel — Preview */}
        <aside className="w-72 border-l border-gray-100 bg-white flex-shrink-0 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center">
                <Eye className="w-3.5 h-3.5 text-violet-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-700">
                {language === "en" ? "Store Preview" : "معاينة المتجر"}
              </h3>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Categories preview */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {language === "en" ? "Categories" : "الفئات"}
                </span>
                <Badge className="bg-violet-50 text-violet-600 border-0 text-xs px-2 py-0.5">
                  {categories.length}
                </Badge>
              </div>
              {categories.length === 0 ? (
                <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-400">
                    {language === "en" ? "Categories will appear here" : "ستظهر الفئات هنا"}
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-gray-100 shadow-sm"
                    >
                      <div className="w-2 h-2 rounded-full bg-violet-400 flex-shrink-0" />
                      <span className="text-xs text-gray-700 font-medium truncate">
                        {isRTL ? cat.name_ar : cat.name_en}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Products preview */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {language === "en" ? "Products" : "المنتجات"}
                </span>
                <Badge className="bg-emerald-50 text-emerald-600 border-0 text-xs px-2 py-0.5">
                  {products.length}
                </Badge>
              </div>
              {products.length === 0 ? (
                <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-400">
                    {language === "en" ? "Products will appear here" : "ستظهر المنتجات هنا"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {products.map((prod) => (
                    <div
                      key={prod.id}
                      className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
                    >
                      <div className="h-16 bg-gradient-to-br from-violet-50 to-emerald-50 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-violet-300" />
                      </div>
                      <div className="p-2.5">
                        <p className="text-xs font-semibold text-gray-700 truncate">
                          {isRTL ? prod.name_ar : prod.name_en}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {prod.price} {language === "en" ? "SAR" : "ر.س"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom action */}
          {(categories.length > 0 || products.length > 0) && (
            <div className="p-4 border-t border-gray-100">
              <button className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-violet-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-violet-200 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                {language === "en" ? "View Dashboard" : "عرض لوحة التحكم"}
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
