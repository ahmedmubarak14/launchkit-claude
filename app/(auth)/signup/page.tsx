"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, Mail, Lock, User, Eye, EyeOff, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setTimeout(() => {
        router.push("/connect");
        router.refresh();
      }, 2000);
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Account created!</h2>
        <p className="text-gray-500">Redirecting you to connect your store...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-violet-800 shadow-lg shadow-violet-200 mb-4">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
        <p className="text-gray-500 mt-1 text-sm">Start setting up your store with AI</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-100/50 p-8">
        <form onSubmit={handleSignup} className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-gray-700">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input id="name" type="text" placeholder="Ahmed Mohammed" value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-10 h-11 border-gray-200 rounded-xl focus:border-violet-400 focus:ring-violet-400/20" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input id="email" type="email" placeholder="you@example.com" value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-11 border-gray-200 rounded-xl focus:border-violet-400 focus:ring-violet-400/20" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input id="password" type={showPassword ? "text" : "password"} placeholder="Min 8 characters" value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 h-11 border-gray-200 rounded-xl focus:border-violet-400 focus:ring-violet-400/20" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {password && (
              <div className="flex gap-1 mt-1">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                    password.length > i * 2 + 3 ? i < 1 ? "bg-red-400" : i < 2 ? "bg-yellow-400" : i < 3 ? "bg-blue-400" : "bg-emerald-400" : "bg-gray-200"
                  }`} />
                ))}
              </div>
            )}
          </div>

          <Button type="submit" disabled={loading}
            className="w-full h-11 bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white font-semibold rounded-xl shadow-md shadow-violet-200 transition-all hover:-translate-y-0.5 disabled:opacity-50">
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating account...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                Create Account
                <ArrowRight className="w-4 h-4" />
              </div>
            )}
          </Button>

          <p className="text-xs text-gray-400 text-center">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        </form>
      </div>

      <p className="text-center text-sm text-gray-500 mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-violet-600 hover:text-violet-700 font-semibold">Sign in</Link>
      </p>
    </div>
  );
}
