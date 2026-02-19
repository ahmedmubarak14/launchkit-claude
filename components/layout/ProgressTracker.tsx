"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Briefcase,
  Layers,
  ShoppingBag,
  Megaphone,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  BarChart3,
  Package,
  Menu,
  X,
} from "lucide-react";
import { SetupStep } from "@/types";

interface StepConfig {
  id: SetupStep;
  labelEn: string;
  labelAr: string;
  descEn: string;
  descAr: string;
  icon: React.ReactNode;
}

const STEPS: StepConfig[] = [
  {
    id: "business",
    labelEn: "Business Info",
    labelAr: "معلومات النشاط",
    descEn: "Tell AI about your store",
    descAr: "أخبر الذكاء الاصطناعي عن متجرك",
    icon: <Briefcase className="w-4 h-4" />,
  },
  {
    id: "categories",
    labelEn: "Categories",
    labelAr: "الفئات",
    descEn: "Organize your products",
    descAr: "نظّم منتجاتك",
    icon: <Layers className="w-4 h-4" />,
  },
  {
    id: "products",
    labelEn: "Products",
    labelAr: "المنتجات",
    descEn: "Create product listings",
    descAr: "أنشئ قوائم المنتجات",
    icon: <ShoppingBag className="w-4 h-4" />,
  },
  {
    id: "marketing",
    labelEn: "Marketing",
    labelAr: "التسويق",
    descEn: "Configure promotions",
    descAr: "اضبط الترويج",
    icon: <Megaphone className="w-4 h-4" />,
  },
];

const STEP_ORDER: SetupStep[] = ["business", "categories", "products", "marketing"];

interface ProgressTrackerProps {
  currentStep: SetupStep;
  language: "en" | "ar";
  categoriesCount: number;
  productsCount: number;
}

export function ProgressTracker({
  currentStep,
  language,
  categoriesCount,
  productsCount,
}: ProgressTrackerProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const currentIdx = STEP_ORDER.indexOf(currentStep);
  const percentage = Math.round((currentIdx / (STEP_ORDER.length - 1)) * 100);
  const isRTL = language === "ar";

  const getStepState = (idx: number): "completed" | "active" | "pending" => {
    if (idx < currentIdx) return "completed";
    if (idx === currentIdx) return "active";
    return "pending";
  };

  const stepLabel = (step: StepConfig) =>
    language === "en" ? step.labelEn : step.labelAr;
  const stepDesc = (step: StepConfig) =>
    language === "en" ? step.descEn : step.descAr;

  const content = (
    <div
      className="flex flex-col h-full"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        {!collapsed && (
          <div>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              {language === "en" ? "Setup Progress" : "تقدم الإعداد"}
            </h2>
          </div>
        )}
        {/* Collapse toggle (desktop) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex w-6 h-6 rounded-md hover:bg-gray-100 items-center justify-center text-gray-400 hover:text-gray-600 transition-all ml-auto"
        >
          {collapsed
            ? isRTL
              ? <ChevronLeft className="w-4 h-4" />
              : <ChevronRight className="w-4 h-4" />
            : isRTL
            ? <ChevronRight className="w-4 h-4" />
            : <ChevronLeft className="w-4 h-4" />
          }
        </button>
      </div>

      {/* Steps */}
      <div className="px-3 space-y-1 flex-shrink-0">
        {STEPS.map((step, idx) => {
          const state = getStepState(idx);
          const isLast = idx === STEPS.length - 1;

          return (
            <div key={step.id} className="relative">
              {/* Connector line */}
              {!isLast && !collapsed && (
                <div
                  className={`absolute top-10 left-[22px] w-0.5 h-5 transition-colors duration-500 ${
                    state === "completed" ? "bg-emerald-300" : "bg-gray-100"
                  }`}
                  style={isRTL ? { left: "auto", right: "22px" } : {}}
                />
              )}

              <div
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 cursor-default ${
                  state === "active"
                    ? "bg-violet-600 shadow-md shadow-violet-200"
                    : state === "completed"
                    ? "hover:bg-emerald-50/60"
                    : "hover:bg-gray-50/60"
                }`}
              >
                {/* Icon / status indicator */}
                <div className="flex-shrink-0 relative">
                  {state === "completed" ? (
                    <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                  ) : state === "active" ? (
                    <div className="relative w-8 h-8">
                      {/* Pulse ring */}
                      <div className="absolute inset-0 rounded-full bg-white/30 animate-ping" />
                      <div className="relative w-8 h-8 rounded-full bg-white/20 border-2 border-white flex items-center justify-center">
                        <div className="text-white">{step.icon}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full border-2 border-gray-200 flex items-center justify-center bg-white">
                      <div className="text-gray-300">{step.icon}</div>
                    </div>
                  )}
                </div>

                {/* Label + desc */}
                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-semibold truncate ${
                        state === "active"
                          ? "text-white"
                          : state === "completed"
                          ? "text-emerald-600"
                          : "text-gray-400"
                      }`}
                    >
                      {stepLabel(step)}
                    </p>
                    <p
                      className={`text-[10px] truncate ${
                        state === "active" ? "text-violet-200" : "text-gray-400/70"
                      }`}
                    >
                      {stepDesc(step)}
                    </p>
                  </div>
                )}

                {/* Badge for counts */}
                {!collapsed && state === "completed" && (
                  <>
                    {step.id === "categories" && categoriesCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-600 rounded-md font-bold">
                        {categoriesCount}
                      </span>
                    )}
                    {step.id === "products" && productsCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-600 rounded-md font-bold">
                        {productsCount}
                      </span>
                    )}
                  </>
                )}
                {!collapsed && state === "active" && (
                  <>
                    {step.id === "categories" && categoriesCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-white/20 text-white rounded-md font-bold">
                        {categoriesCount}
                      </span>
                    )}
                    {step.id === "products" && productsCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-white/20 text-white rounded-md font-bold">
                        {productsCount}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats section */}
      {!collapsed && (
        <div className="mt-4 px-4 space-y-3">
          {/* Progress bar */}
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                <TrendingUp className="w-3.5 h-3.5 text-violet-500" />
                {language === "en" ? "Completion" : "الإكمال"}
              </div>
              <span className="text-sm font-bold text-violet-600">{percentage}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-violet-600 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-violet-50 rounded-xl p-3 border border-violet-100 flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-[10px] text-violet-400 font-semibold uppercase tracking-wider">
                  {language === "en" ? "Categories" : "فئات"}
                </span>
              </div>
              <span className="text-2xl font-black text-violet-700">{categoriesCount}</span>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                  {language === "en" ? "Products" : "منتجات"}
                </span>
              </div>
              <span className="text-2xl font-black text-emerald-700">{productsCount}</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1" />

      {/* Help hint */}
      {!collapsed && (
        <div className="px-4 pb-5 mt-4">
          <div className="bg-gradient-to-br from-violet-50 to-purple-50/60 rounded-xl p-3 border border-violet-100">
            <p className="text-[11px] text-violet-500 leading-relaxed font-medium">
              {language === "en"
                ? "Just chat naturally. AI will guide you through each step."
                : "تحدث بشكل طبيعي. سيرشدك الذكاء الاصطناعي خلال كل خطوة."}
            </p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div
        className={`hidden md:flex flex-col h-full transition-all duration-300 ease-in-out ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        {content}
      </div>

      {/* Mobile: floating button + drawer */}
      <div className="md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed bottom-20 left-4 z-50 w-12 h-12 rounded-2xl bg-violet-600 text-white shadow-xl shadow-violet-200 flex items-center justify-center active:scale-95 transition-transform"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Drawer */}
        <div
          className={`fixed top-0 left-0 z-50 h-full w-72 bg-white shadow-2xl transition-transform duration-300 ease-out overflow-y-auto ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 text-sm">Setup Progress</h2>
            <button
              onClick={() => setMobileOpen(false)}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col h-[calc(100%-56px)]">{content}</div>
        </div>
      </div>
    </>
  );
}
