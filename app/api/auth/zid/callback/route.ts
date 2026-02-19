import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/connect?error=${error || "no_code"}`);
  }

  // Read user ID from the cookie we set in the authorize route
  const userId = request.cookies.get("zid_oauth_user_id")?.value;
  if (!userId) {
    return NextResponse.redirect(`${appUrl}/login`);
  }

  try {
    // Exchange code for tokens
    const oauthBase = process.env.ZID_OAUTH_BASE_URL || "https://oauth.zid.sa";
    const tokenResponse = await fetch(`${oauthBase}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: process.env.ZID_CLIENT_ID,
        client_secret: process.env.ZID_CLIENT_SECRET,
        redirect_uri: process.env.ZID_REDIRECT_URI,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      console.error("Token exchange failed:", tokenResponse.status, errorBody);
      throw new Error(`Token exchange failed: ${tokenResponse.status} ${errorBody}`);
    }

    const tokens = await tokenResponse.json();
    console.log("Zid token response keys:", Object.keys(tokens));

    // Note: token keys from Zid are lowercase: access_token, authorization, refresh_token
    console.log("Zid token keys:", Object.keys(tokens));

    // Use service role to bypass RLS — session cookie may be lost after OAuth redirect
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Delete any existing store records for this user+platform to avoid duplicates
    await adminSupabase.from("stores").delete().eq("user_id", userId).eq("platform", "zid");

    await adminSupabase.from("stores").insert({
      user_id: userId,
      platform: "zid",
      access_token: tokens.access_token,
      auth_token: tokens.authorization || null,   // lowercase key from Zid
      refresh_token: tokens.refresh_token || null,
      store_name: "My Zid Store",
      store_id: null,
    });

    const response = NextResponse.redirect(`${appUrl}/setup`);
    // Clear the temporary cookie
    response.cookies.set("zid_oauth_user_id", "", { maxAge: 0, path: "/" });
    return response;
  } catch (err) {
    console.error("Zid OAuth error:", err);
    return NextResponse.redirect(`${appUrl}/connect?error=oauth_failed`);
  }
}
