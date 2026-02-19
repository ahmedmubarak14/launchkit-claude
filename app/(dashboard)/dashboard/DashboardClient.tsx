"use client";

import Link from "next/link";
import {
  Sparkles,
  ShoppingBag,
  Layers,
  ArrowRight,
  Plus,
  TrendingUp,
  Package,
  Store,
  BarChart3,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/Header";
import { useAppStore } from "@/store/useStore";
import { Category, Product, Store as StoreType } from "@/types";

interface DashboardClientProps {
  user: { email: string; name?: string | null };
  store: StoreType | null;
  categories: Category[];
  products: Product[];
}

export function DashboardClient({ user, store, categories, products }: DashboardClientProps) {
  const { language } = useAppStore();
  const isRTL = language === "ar";

  const greeting = isRTL
    ? `مرحباً، ${user.name || user.email.split("@")[0]}`
    : `Hello, ${user.name || user.email.split("@")[0]}`;

  const stats = [
    {
      label: isRTL ? "المتاجر المتصلة" : "Connected Stores",
      value: store ? 1 : 0,
      icon: <Store className="w-5 h-5" />,
      color: "violet",
      bg: "bg-violet-50",
      text: "text-violet-600",
      border: "border-violet-100",
    },
    {
      label: isRTL ? "الفئات" : "Categories",
      value: categories.length,
      icon: <Layers className="w-5 h-5" />,
      color: "blue",
      bg: "bg-blue-50",
      text: "text-blue-600",
      border: "border-blue-100",
    },
    {
      label: isRTL ? "المنتجات" : "Products",
      value: products.length,
      icon: <ShoppingBag className="w-5 h-5" />,
      color: "emerald",
      bg: "bg-emerald-50",
      text: "text-emerald-600",
      border: "border-emerald-100",
    },
    {
      label: isRTL ? "نسبة الإكمال" : "Setup Complete",
      value: store ? `${Math.min(Math.round((categories.length + products.length) / 10 * 100), 100)}%` : "0%",
      icon: <TrendingUp className="w-5 h-5" />,
      color: "amber",
      bg: "bg-amber-50",
      text: "text-amber-600",
      border: "border-amber-100",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC]" dir={isRTL ? "rtl" : "ltr"}>
      <Header storeName={store?.store_name} userEmail={user.email} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{greeting} 👋</h1>
            <p className="text-gray-500 mt-1 text-sm">
              {isRTL ? "هنا نظرة عامة على متجرك" : "Here's an overview of your store setup"}
            </p>
          </div>
          {store ? (
            <Link href="/setup">
              <Button className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-md shadow-violet-200 gap-2 font-medium transition-all hover:-translate-y-0.5">
                <Zap className="w-4 h-4" />
                {isRTL ? "متابعة الإعداد" : "Continue Setup"}
              </Button>
            </Link>
          ) : (
            <Link href="/connect">
              <Button className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-md shadow-violet-200 gap-2 font-medium">
                <Plus className="w-4 h-4" />
                {isRTL ? "ربط متجر" : "Connect Store"}
              </Button>
            </Link>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.border} border flex items-center justify-center mb-3 ${stat.text}`}>
                {stat.icon}
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* No store connected */}
        {!store && (
          <div className="bg-gradient-to-br from-violet-50 to-violet-100/50 border border-violet-100 rounded-2xl p-8 text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-white border border-violet-100 flex items-center justify-center mx-auto mb-4 shadow-md">
              <Store className="w-7 h-7 text-violet-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {isRTL ? "لم يتم ربط أي متجر بعد" : "No store connected yet"}
            </h3>
            <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
              {isRTL
                ? "اربط متجر زد الخاص بك للبدء في إعداده بالذكاء الاصطناعي"
                : "Connect your Zid store to start setting it up with AI"}
            </p>
            <Link href="/connect">
              <Button className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-md shadow-violet-200 gap-2 font-medium">
                <Plus className="w-4 h-4" />
                {isRTL ? "ربط متجر زد" : "Connect Zid Store"}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Categories */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-violet-500" />
                <h2 className="font-semibold text-gray-900">
                  {isRTL ? "الفئات" : "Categories"}
                </h2>
                <Badge className="bg-violet-50 text-violet-600 border-0 text-xs">{categories.length}</Badge>
              </div>
              <Link href="/setup">
                <Button variant="ghost" size="sm" className="text-xs text-violet-600 hover:bg-violet-50 rounded-lg gap-1">
                  <Plus className="w-3 h-3" />
                  {isRTL ? "إضافة" : "Add"}
                </Button>
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {categories.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <Layers className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">
                    {isRTL ? "لا توجد فئات بعد. ابدأ المحادثة!" : "No categories yet. Start the chat!"}
                  </p>
                </div>
              ) : (
                categories.slice(0, 6).map((cat) => (
                  <div key={cat.id} className="px-6 py-3.5 flex items-center gap-3 hover:bg-gray-50/50 transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center border border-violet-100">
                      <Layers className="w-3.5 h-3.5 text-violet-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {isRTL ? cat.name_ar : cat.name_en}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {isRTL ? cat.name_en : cat.name_ar}
                      </p>
                    </div>
                    <Badge className="bg-emerald-50 text-emerald-600 border-0 text-[10px]">
                      {isRTL ? "نشط" : "Active"}
                    </Badge>
                  </div>
                ))
              )}
              {categories.length > 6 && (
                <div className="px-6 py-3 text-center">
                  <button className="text-xs text-violet-600 hover:text-violet-700 font-medium">
                    +{categories.length - 6} {isRTL ? "المزيد" : "more"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Products */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-500" />
                <h2 className="font-semibold text-gray-900">
                  {isRTL ? "المنتجات" : "Products"}
                </h2>
                <Badge className="bg-emerald-50 text-emerald-600 border-0 text-xs">{products.length}</Badge>
              </div>
              <Link href="/setup">
                <Button variant="ghost" size="sm" className="text-xs text-emerald-600 hover:bg-emerald-50 rounded-lg gap-1">
                  <Plus className="w-3 h-3" />
                  {isRTL ? "إضافة" : "Add"}
                </Button>
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {products.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <Package className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">
                    {isRTL ? "لا توجد منتجات بعد. ابدأ المحادثة!" : "No products yet. Start the chat!"}
                  </p>
                </div>
              ) : (
                products.slice(0, 6).map((prod) => (
                  <div key={prod.id} className="px-6 py-3.5 flex items-center gap-3 hover:bg-gray-50/50 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-50 to-emerald-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-violet-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {isRTL ? prod.name_ar : prod.name_en}
                      </p>
                      <p className="text-xs text-gray-400">
                        {prod.price} {isRTL ? "ر.س" : "SAR"}
                      </p>
                    </div>
                    <Badge className="bg-emerald-50 text-emerald-600 border-0 text-[10px]">
                      {isRTL ? "مسودة" : "Draft"}
                    </Badge>
                  </div>
                ))
              )}
              {products.length > 6 && (
                <div className="px-6 py-3 text-center">
                  <button className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                    +{products.length - 6} {isRTL ? "المزيد" : "more"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Start setup CTA */}
        {store && categories.length === 0 && (
          <div className="mt-6 bg-gradient-to-r from-violet-600 to-violet-700 rounded-2xl p-6 flex items-center justify-between shadow-xl shadow-violet-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">
                  {isRTL ? "ابدأ إعداد متجرك الآن" : "Start setting up your store"}
                </h3>
                <p className="text-violet-200 text-sm">
                  {isRTL ? "تحدث مع الذكاء الاصطناعي وأنشئ متجرك في دقائق" : "Chat with AI and build your store in minutes"}
                </p>
              </div>
            </div>
            <Link href="/setup">
              <Button className="bg-white text-violet-700 hover:bg-violet-50 font-semibold rounded-xl gap-2 flex-shrink-0 shadow-md">
                <Zap className="w-4 h-4" />
                {isRTL ? "ابدأ" : "Start"}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
