"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import {
  Sparkles,
  Store,
  ArrowRight,
  Shield,
  Zap,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

function ConnectContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const handleConnect = () => {
    window.location.href = "/api/auth/zid/authorize";
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-emerald-50 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-violet-800 shadow-lg shadow-violet-200 mb-4">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Connect Your Store</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Link your Zid store to start the AI-powered setup
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-600">
              Connection failed. Please try again.
            </p>
          </div>
        )}

        {/* Main card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-100/50 p-8 space-y-6">
          {/* Zid branding */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-md">
              <Store className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">Zid Platform</div>
              <div className="text-sm text-gray-400">منصة زد للتجارة الإلكترونية</div>
            </div>
            <div className="ml-auto">
              <div className="flex items-center gap-1 text-emerald-500">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-medium">Ready</span>
              </div>
            </div>
          </div>

          {/* What we access */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">LaunchKit will access:</p>
            <div className="space-y-2">
              {[
                { en: "Read your store information", ar: "قراءة معلومات متجرك" },
                { en: "Create categories and products", ar: "إنشاء الفئات والمنتجات" },
                { en: "Configure marketing settings", ar: "إعداد إعدادات التسويق" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  {item.en}
                </div>
              ))}
            </div>
          </div>

          {/* Security note */}
          <div className="flex items-start gap-3 bg-violet-50 rounded-xl p-4 border border-violet-100">
            <Shield className="w-5 h-5 text-violet-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-violet-700">Secure OAuth 2.0</p>
              <p className="text-xs text-violet-500 mt-0.5 leading-relaxed">
                We never store your Zid password. Access tokens are encrypted and can be revoked anytime.
              </p>
            </div>
          </div>

          {/* CTA */}
          <Button
            onClick={handleConnect}
            className="w-full h-12 bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white font-semibold rounded-xl shadow-md shadow-violet-200 transition-all hover:-translate-y-0.5 hover:shadow-lg gap-2 text-base"
          >
            <Zap className="w-5 h-5" />
            Connect Zid Store
            <ArrowRight className="w-4 h-4" />
          </Button>

          <div className="text-center">
            <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              Skip for now →
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Don&apos;t have a Zid store?{" "}
          <a href="https://zid.sa" target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline">
            Create one free
          </a>
        </p>
      </div>
    </div>
  );
}

export default function ConnectPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <ConnectContent />
    </Suspense>
  );
}
