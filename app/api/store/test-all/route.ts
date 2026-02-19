import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/store/test-all
 * Comprehensive test: checks store credentials, tries creating a product,
 * and reports exact success/failure for every step.
 * Visit this URL while logged in to diagnose issues.
 */
export async function GET(_request: NextRequest) {
  const results: Record<string, unknown> = {};

  try {
    // 1. Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    results.userId = user.id;
    results.email = user.email;

    // 2. Store check
    const { data: storeRows } = await supabase
      .from("stores")
      .select("*")
      .eq("user_id", user.id)
      .eq("platform", "zid")
      .order("created_at", { ascending: false })
      .limit(1);
    const store = storeRows?.[0] || null;

    results.store = {
      found: !!store,
      store_id: store?.store_id || "NULL ⛔",
      store_name: store?.store_name,
      hasAccessToken: !!store?.access_token,
      hasAuthToken: !!store?.auth_token,
      hasRefreshToken: !!store?.refresh_token,
      theme_id: store?.theme_id || "not set",
      logo_url: store?.logo_url ? "set ✅" : "not set",
    };

    if (!store?.access_token) {
      return NextResponse.json({ ...results, error: "No store connected — visit /connect" });
    }
    if (!store?.store_id) {
      return NextResponse.json({ ...results, error: "store_id is NULL — visit /api/store/fix-store-id first" });
    }

    // 3. Setup session check
    const { data: session } = await supabase
      .from("setup_sessions")
      .select("id, status")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    results.setupSession = session ? { id: session.id, status: session.status } : "NONE ⛔ — visit /setup to create one";

    // 4. Test Zid product creation
    const BASE = process.env.ZID_API_BASE_URL || "https://api.zid.sa";
    const sku = `TEST-${Date.now()}`;
    const headers: Record<string, string> = {
      "Authorization": `Bearer ${store.auth_token || ""}`,
      "X-Manager-Token": store.access_token,
      "Store-Id": store.store_id,
      "Role": "Manager",
      "Accept-Language": "all-languages",
      "Content-Type": "application/json",
    };

    const productBody = {
      name: "TEST Product — delete me",
      price: 10,
      sku,
      is_draft: true,
      is_infinite: true,
      quantity: 999,
      requires_shipping: false,
      is_taxable: false,
    };

    try {
      const res = await fetch(`${BASE}/v1/products/`, {
        method: "POST",
        headers,
        body: JSON.stringify(productBody),
      });
      const text = await res.text();
      let parsedBody;
      try { parsedBody = JSON.parse(text); } catch { parsedBody = text; }

      results.zidProductTest = {
        status: res.status,
        ok: res.ok || res.status === 201,
        productId: parsedBody?.id || parsedBody?.product?.id || null,
        body: typeof parsedBody === "string" ? parsedBody.slice(0, 500) : parsedBody,
      };
    } catch (err) {
      results.zidProductTest = { error: String(err) };
    }

    // 5. Test Zid categories fetch
    try {
      const catRes = await fetch(`${BASE}/v1/managers/store/categories/`, {
        headers: {
          "Authorization": `Bearer ${store.auth_token || ""}`,
          "X-Manager-Token": store.access_token,
          "Accept-Language": "all-languages",
        },
      });
      const catText = await catRes.text();
      let catParsed;
      try { catParsed = JSON.parse(catText); } catch { catParsed = catText; }

      const categories = Array.isArray(catParsed)
        ? catParsed
        : catParsed?.categories || catParsed?.results || catParsed?.data || [];

      results.zidCategories = {
        status: catRes.status,
        count: Array.isArray(categories) ? categories.length : "unknown",
        sample: Array.isArray(categories) ? categories.slice(0, 3).map((c: { id?: string; name?: Record<string, string> | string }) => ({
          id: c.id,
          name: typeof c.name === "object" ? c.name : c.name,
        })) : [],
      };
    } catch (err) {
      results.zidCategories = { error: String(err) };
    }

    // 6. Test Anthropic API
    try {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        results.anthropicTest = { error: "ANTHROPIC_API_KEY not set" };
      } else {
        const testRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-3-haiku-20240307",
            max_tokens: 50,
            messages: [{ role: "user", content: "Say OK" }],
          }),
        });
        const testText = await testRes.text();
        let testParsed;
        try { testParsed = JSON.parse(testText); } catch { testParsed = testText; }

        results.anthropicTest = {
          status: testRes.status,
          ok: testRes.ok,
          model: testParsed?.model || "unknown",
          response: testParsed?.content?.[0]?.text || testParsed?.error?.message || testText.slice(0, 300),
        };
      }
    } catch (err) {
      results.anthropicTest = { error: String(err) };
    }

    // 7. DB columns check
    try {
      const { data: cols } = await supabase.rpc("get_column_info", {}).throwOnError();
      results.dbColumns = cols;
    } catch {
      // RPC doesn't exist, try a different approach
      results.dbColumns = "Cannot check automatically — ensure auth_token, theme_id, logo_url columns exist in stores table";
    }

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({ ...results, error: String(error) }, { status: 500 });
  }
}
