import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const clientId = process.env.ZID_CLIENT_ID!;
  const redirectUri = process.env.ZID_REDIRECT_URI!;

  // Get user before redirecting away — we'll store their ID in a cookie
  // so the callback can identify them even if the Supabase session cookie is lost
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Resolve merchant's locale from Referer or Accept-Language so we send them
  // back to the same-language login/connect page after OAuth
  const referer = request.headers.get("referer") || "";
  const refererMatch = referer.match(/\/(ar|en)(\/|$)/);
  const acceptLang = (request.headers.get("accept-language") || "").toLowerCase();
  const locale = refererMatch?.[1] || (acceptLang.startsWith("ar") ? "ar" : "en");

  if (!user) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/${locale}/login`);
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "store:read store:write products:read products:write categories:read categories:write",
  });

  const oauthBase = process.env.ZID_OAUTH_BASE_URL || "https://oauth.zid.sa";
  const authUrl = `${oauthBase}/oauth/authorize?${params.toString()}`;

  const response = NextResponse.redirect(authUrl);
  // Store user ID in a short-lived cookie to survive the OAuth redirect
  response.cookies.set("zid_oauth_user_id", user.id, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });
  response.cookies.set("zid_oauth_locale", locale, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  return response;
}
