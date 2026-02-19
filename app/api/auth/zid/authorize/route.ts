import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const clientId = process.env.ZID_CLIENT_ID!;
  const redirectUri = process.env.ZID_REDIRECT_URI!;
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "store:read store:write products:read products:write categories:read categories:write",
  });

  const oauthBase = process.env.ZID_OAUTH_BASE_URL || "https://oauth.zid.sa";
  const authUrl = `${oauthBase}/oauth/authorize?${params.toString()}`;
  
  return NextResponse.redirect(authUrl);
}
