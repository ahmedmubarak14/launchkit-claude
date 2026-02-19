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

    // Get store info from Zid
    const storeResponse = await fetch(`${process.env.ZID_API_BASE_URL}/v1/manager/account/info`, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        "Accept-Language": "ar",
      },
    });

    const storeInfo = storeResponse.ok ? await storeResponse.json() : {};

    // Use service role to bypass RLS — session cookie may be lost after OAuth redirect
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await adminSupabase.from("stores").upsert({
      user_id: userId,
      platform: "zid",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      store_name: storeInfo?.store?.name || "My Zid Store",
      store_id: storeInfo?.store?.id?.toString() || null,
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
