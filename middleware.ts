import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { locales, defaultLocale } from "@/lib/i18n/config";

const intlMiddleware = createIntlMiddleware({
  locales: [...locales],
  defaultLocale,
  localePrefix: "always",
});

const PROTECTED = ["/dashboard", "/connect", "/setup", "/settings"];
const AUTH_ONLY = ["/login", "/signup"];

function stripLocale(pathname: string): { locale: string; rest: string } {
  const match = pathname.match(/^\/(ar|en)(\/.*)?$/);
  if (match) return { locale: match[1], rest: match[2] || "/" };
  return { locale: defaultLocale, rest: pathname };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api") || pathname.startsWith("/themes")) {
    return NextResponse.next();
  }

  const intlResponse = intlMiddleware(request);
  const { locale, rest } = stripLocale(pathname);

  const isProtected = PROTECTED.some((p) => rest === p || rest.startsWith(p + "/"));
  const isAuthOnly = AUTH_ONLY.some((p) => rest === p || rest.startsWith(p + "/"));

  if (!isProtected && !isAuthOnly) return intlResponse;

  // If Supabase env vars are missing, don't crash the middleware — just let
  // the page render. This keeps the landing page usable before the merchant
  // has finished wiring .env.local. Protected pages will still redirect to
  // login via the (app) layout guard, which has clearer error messaging.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnon) {
    console.warn("[middleware] Supabase env vars missing — skipping auth check. Create .env.local.");
    return intlResponse;
  }

  const response = intlResponse;
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnon,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    return NextResponse.redirect(url);
  }
  if (user && isAuthOnly) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/dashboard`;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|zip)$).*)"],
};
