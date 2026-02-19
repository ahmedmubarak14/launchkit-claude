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
    // Try multiple endpoints since store_id is required for product creation
    let storeId: string | null = null;
    let storeName = "My Zid Store";
    const apiBase = process.env.ZID_API_BASE_URL || "https://api.zid.sa";
    const commonHeaders: Record<string, string> = {
      "X-Manager-Token": accessToken,
      "Authorization": `Bearer ${authToken || ""}`,
      "Accept-Language": "en",
    };

    // Attempt 1: GET /v1/managers/account/profile — returns user.store.id
    try {
      const profileRes = await fetch(`${apiBase}/v1/managers/account/profile`, {
        headers: commonHeaders,
      });
      const profileText = await profileRes.text();
      console.log("Zid profile response:", profileRes.status, profileText.slice(0, 500));
      if (profileRes.ok) {
        const profileData = JSON.parse(profileText);
        storeId = profileData?.user?.store?.id?.toString()
          || profileData?.user?.store?.uuid?.toString()
          || profileData?.store?.id?.toString()
          || null;
        storeName = profileData?.user?.store?.title
          || profileData?.user?.store?.username
          || profileData?.store?.name
          || "My Zid Store";
        console.log("Profile endpoint — store_id:", storeId, "store_name:", storeName);
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
    }

    // Attempt 2: GET /v1/managers/store/ — returns store object directly
    if (!storeId) {
      try {
        const storeRes = await fetch(`${apiBase}/v1/managers/store/`, {
          headers: commonHeaders,
        });
        const storeText = await storeRes.text();
        console.log("Zid store info response:", storeRes.status, storeText.slice(0, 500));
        if (storeRes.ok) {
          const storeData = JSON.parse(storeText);
          storeId = storeData?.store?.id?.toString()
            || storeData?.data?.store?.id?.toString()
            || storeData?.id?.toString()
            || null;
          storeName = storeData?.store?.name
            || storeData?.store?.title
            || storeData?.name
            || storeName;
          console.log("Store endpoint — store_id:", storeId, "store_name:", storeName);
        }
      } catch (storeErr) {
        console.error("Store info fetch error:", storeErr);
      }
    }

    // Attempt 3: extract store_id from JWT token payload if available
    if (!storeId && authToken) {
      try {
        const parts = authToken.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
          console.log("JWT payload:", JSON.stringify(payload).slice(0, 300));
          storeId = payload?.store_id?.toString()
            || payload?.sub?.toString()
            || null;
          console.log("JWT — store_id:", storeId);
        }
      } catch (jwtErr) {
        console.error("JWT decode error:", jwtErr);
      }
    }

    console.log("Final resolved store_id:", storeId, "store_name:", storeName);

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
