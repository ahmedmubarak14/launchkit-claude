"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, Globe, LogOut, Settings, LayoutDashboard, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/store/useStore";

interface HeaderProps {
  storeName?: string | null;
  userEmail?: string | null;
}

export function Header({ storeName, userEmail }: HeaderProps) {
  const router = useRouter();
  const { language, setLanguage } = useAppStore();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <header className="h-14 border-b border-gray-100 bg-white/80 backdrop-blur-sm flex items-center px-4 gap-3 flex-shrink-0">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2 flex-shrink-0">
        <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-600 to-violet-800 flex items-center justify-center shadow-md">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="font-bold text-base text-gray-900">LaunchKit</span>
      </Link>

      {storeName && (
        <div className="flex items-center gap-1.5">
          <div className="w-px h-4 bg-gray-200" />
          <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-xs px-2 py-0.5 font-medium">
            <Store className="w-3 h-3 mr-1" />
            {storeName}
          </Badge>
        </div>
      )}

      <div className="flex-1" />

      {/* Nav links */}
      <nav className="hidden md:flex items-center gap-1">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="text-gray-500 hover:text-violet-600 rounded-lg gap-1.5 text-xs font-medium">
            <LayoutDashboard className="w-3.5 h-3.5" />
            Dashboard
          </Button>
        </Link>
        <Link href="/settings">
          <Button variant="ghost" size="sm" className="text-gray-500 hover:text-violet-600 rounded-lg gap-1.5 text-xs font-medium">
            <Settings className="w-3.5 h-3.5" />
            Settings
          </Button>
        </Link>
      </nav>

      {/* Language toggle */}
      <button
        onClick={() => setLanguage(language === "en" ? "ar" : "en")}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-violet-300 text-xs font-medium text-gray-500 hover:text-violet-600 transition-all"
      >
        <Globe className="w-3.5 h-3.5" />
        {language === "en" ? "AR" : "EN"}
      </button>

      {/* User + logout */}
      {userEmail && (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
            {userEmail[0].toUpperCase()}
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </header>
  );
}
