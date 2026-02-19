import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/connect?error=${error || "no_code"}`
    );
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
      throw new Error("Token exchange failed");
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
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login`);
    }

    // Save store to DB
    await supabase.from("stores").upsert({
      user_id: user.id,
      platform: "zid",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      store_name: storeInfo?.store?.name || "My Zid Store",
      store_id: storeInfo?.store?.id?.toString() || null,
    });

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/setup`);
  } catch (err) {
    console.error("Zid OAuth error:", err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/connect?error=oauth_failed`
    );
  }
}
