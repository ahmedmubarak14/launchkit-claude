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
    console.log("Zid token full response:", JSON.stringify(tokens));

    // Note: token keys from Zid are lowercase: access_token, authorization, refresh_token
    const accessToken = tokens.access_token;
    const authToken = tokens.authorization || null;

    // Fetch store info to get the store_id
    let storeId: string | null = null;
    let storeName = "My Zid Store";
    try {
      const apiBase = process.env.ZID_API_BASE_URL || "https://api.zid.sa";
      const storeRes = await fetch(`${apiBase}/v1/managers/store/`, {
        headers: {
          "X-Manager-Token": accessToken,
          ...(authToken ? { "Authorization": `Bearer ${authToken}` } : {}),
          "Accept-Language": "ar",
          "Role": "Manager",
        },
      });
      const storeText = await storeRes.text();
      console.log("Zid store info response:", storeRes.status, storeText);
      if (storeRes.ok) {
        const storeData = JSON.parse(storeText);
        // Zid returns store info under different keys depending on endpoint
        storeId = storeData?.store?.id?.toString()
          || storeData?.id?.toString()
          || null;
        storeName = storeData?.store?.name
          || storeData?.name
          || "My Zid Store";
        console.log("Resolved store_id:", storeId, "store_name:", storeName);
      } else {
        console.error("Could not fetch store info:", storeRes.status, storeText);
      }
    } catch (storeErr) {
      console.error("Store info fetch error:", storeErr);
    }

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
      access_token: accessToken,
      auth_token: authToken,
      refresh_token: tokens.refresh_token || null,
      store_name: storeName,
      store_id: storeId,
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
