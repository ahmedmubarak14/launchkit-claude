import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/health
 *
 * Lightweight self-check the merchant can hit after setting .env.local
 * to confirm every subsystem is wired. Does not leak secrets — only
 * reports whether each env var is present and whether each service
 * actually responds.
 */
export async function GET() {
  const env = {
    supabase: {
      url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      serviceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    anthropic: {
      apiKey: !!process.env.ANTHROPIC_API_KEY,
    },
    zid: {
      clientId: !!process.env.ZID_CLIENT_ID,
      clientSecret: !!process.env.ZID_CLIENT_SECRET,
      redirectUri: !!process.env.ZID_REDIRECT_URI,
      apiBase: process.env.ZID_API_BASE_URL || "https://api.zid.sa",
      oauthBase: process.env.ZID_OAUTH_BASE_URL || "https://oauth.zid.sa",
    },
    app: {
      url: process.env.NEXT_PUBLIC_APP_URL || "(unset)",
    },
  };

  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  // Supabase reachability + auth check
  if (env.supabase.url && env.supabase.anonKey) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.getUser();
      checks.supabase = {
        ok: !error,
        detail: error
          ? `auth error: ${error.message}`
          : data.user
            ? `signed in as ${data.user.email}`
            : "reachable, no active session",
      };
    } catch (err) {
      checks.supabase = { ok: false, detail: String(err) };
    }
  } else {
    checks.supabase = { ok: false, detail: "env vars missing" };
  }

  // Anthropic — just confirms key format; no live call to avoid burning tokens
  if (env.anthropic.apiKey) {
    const key = process.env.ANTHROPIC_API_KEY || "";
    checks.anthropic = {
      ok: key.startsWith("sk-ant-"),
      detail: key.startsWith("sk-ant-") ? "api key format OK" : "api key doesn't look right",
    };
  } else {
    checks.anthropic = { ok: false, detail: "ANTHROPIC_API_KEY missing" };
  }

  // Zid — checks config completeness; live check requires an authenticated
  // session + stored tokens so we skip that here.
  checks.zid = {
    ok: env.zid.clientId && env.zid.clientSecret && env.zid.redirectUri,
    detail:
      env.zid.clientId && env.zid.clientSecret && env.zid.redirectUri
        ? "OAuth config present; visit /connect to run the handshake"
        : "one or more of ZID_CLIENT_ID / ZID_CLIENT_SECRET / ZID_REDIRECT_URI missing",
  };

  const allOk = Object.values(checks).every((c) => c.ok);

  return NextResponse.json(
    {
      ok: allOk,
      env,
      checks,
      version: "v2",
      timestamp: new Date().toISOString(),
    },
    { status: allOk ? 200 : 503 }
  );
}
