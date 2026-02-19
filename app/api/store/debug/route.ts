import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/store/debug
 * Probes Zid endpoints to diagnose product creation issues.
 * Returns full status + truncated response bodies for each attempt.
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: storeRows } = await supabase
      .from("stores")
      .select("access_token, auth_token, store_id, store_name")
      .eq("user_id", user.id)
      .eq("platform", "zid")
      .order("created_at", { ascending: false })
      .limit(1);
    const store = storeRows?.[0] || null;

    const storeInfo = {
      hasAccessToken: !!store?.access_token,
      accessTokenPrefix: store?.access_token ? store.access_token.slice(0, 12) + "..." : null,
      hasAuthToken: !!store?.auth_token,
      authTokenPrefix: store?.auth_token ? store.auth_token.slice(0, 12) + "..." : null,
      store_id: store?.store_id,
      store_name: store?.store_name,
    };

    if (!store?.access_token) {
      return NextResponse.json({ error: "No Zid store found", storeInfo });
    }

    const BASE = process.env.ZID_API_BASE_URL || "https://api.zid.sa";
    const sku = `DBG-${Date.now()}`;
    const results: Record<string, unknown> = {};

    const headers: Record<string, string> = {
      "X-Manager-Token": store.access_token,
      "Authorization": `Bearer ${store.auth_token || ""}`,
      "Accept-Language": "ar",
    };

    // ── Test 1: GET /v1/managers/store/ (verify auth works) ───────────────────
    try {
      const r = await fetch(`${BASE}/v1/managers/store/`, { headers });
      const t = await r.text();
      results["GET /v1/managers/store/"] = { status: r.status, body: t.slice(0, 500) };
    } catch (e) {
      results["GET /v1/managers/store/"] = { error: String(e) };
    }

    // ── Test 2: GET /v1/managers/store/products/ (list products) ──────────────
    try {
      const r = await fetch(`${BASE}/v1/managers/store/products/`, { headers });
      const t = await r.text();
      results["GET /v1/managers/store/products/"] = { status: r.status, body: t.slice(0, 500) };
    } catch (e) {
      results["GET /v1/managers/store/products/"] = { error: String(e) };
    }

    // ── Test 3: POST /v1/managers/store/products/add (form-data, is_draft=1) ──
    try {
      const fd = new FormData();
      fd.append("name[ar]", "منتج اختبار - يُحذف");
      fd.append("name[en]", "DEBUG Test Product - delete me");
      fd.append("price", "10");
      fd.append("sku", sku);
      fd.append("is_draft", "1");
      fd.append("is_infinite", "1");
      fd.append("unlimited_quantity", "1");
      fd.append("quantity", "999");
      fd.append("requires_shipping", "0");
      fd.append("is_taxable", "0");

      const r = await fetch(`${BASE}/v1/managers/store/products/add`, {
        method: "POST",
        headers,
        body: fd,
      });
      const t = await r.text();
      results["POST /v1/managers/store/products/add (form-data)"] = { status: r.status, body: t.slice(0, 600) };
    } catch (e) {
      results["POST /v1/managers/store/products/add (form-data)"] = { error: String(e) };
    }

    // ── Test 4: POST /v1/managers/store/products/ (JSON) ─────────────────────
    try {
      const r = await fetch(`${BASE}/v1/managers/store/products/`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "DEBUG Test Product 2",
          name_ar: "منتج اختبار 2 - يُحذف",
          name_en: "DEBUG Test Product 2 - delete me",
          price: 10,
          sku: `${sku}-b`,
          is_draft: true,
          is_infinite: true,
          unlimited_quantity: true,
          quantity: 999,
          requires_shipping: false,
          is_taxable: false,
        }),
      });
      const t = await r.text();
      results["POST /v1/managers/store/products/ (JSON)"] = { status: r.status, body: t.slice(0, 600) };
    } catch (e) {
      results["POST /v1/managers/store/products/ (JSON)"] = { error: String(e) };
    }

    // ── Test 5: POST /v1/products/ (JSON) ────────────────────────────────────
    try {
      const r = await fetch(`${BASE}/v1/products/`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "DEBUG Test Product 3",
          name_ar: "منتج اختبار 3 - يُحذف",
          name_en: "DEBUG Test Product 3 - delete me",
          price: 10,
          sku: `${sku}-c`,
          is_draft: true,
          is_infinite: true,
          unlimited_quantity: true,
          quantity: 999,
          requires_shipping: false,
          is_taxable: false,
        }),
      });
      const t = await r.text();
      results["POST /v1/products/ (JSON)"] = { status: r.status, body: t.slice(0, 600) };
    } catch (e) {
      results["POST /v1/products/ (JSON)"] = { error: String(e) };
    }

    return NextResponse.json({ storeInfo, results }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
