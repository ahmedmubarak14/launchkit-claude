import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/store/debug
 * Tests the CORRECT Zid product endpoint (per official docs):
 *   POST https://api.zid.sa/v1/products/
 *   Headers: Authorization (Bearer), X-Manager-Token, Store-Id, Role: Manager
 *   Body: JSON { name, price, sku, is_draft, is_infinite, ... }
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
      accessTokenPrefix: store?.access_token ? store.access_token.slice(0, 15) + "..." : null,
      hasAuthToken: !!store?.auth_token,
      authTokenPrefix: store?.auth_token ? store.auth_token.slice(0, 15) + "..." : null,
      store_id: store?.store_id,
      store_name: store?.store_name,
    };

    if (!store?.access_token) {
      return NextResponse.json({ error: "No Zid store found", storeInfo });
    }

    if (!store.store_id) {
      return NextResponse.json({
        error: "store_id is NULL — you need to reconnect your Zid store (disconnect and connect again)",
        storeInfo,
        fix: "The OAuth callback should have fetched your store_id. Re-connect at /connect.",
      });
    }

    const BASE = process.env.ZID_API_BASE_URL || "https://api.zid.sa";
    const sku = `DBG-${Date.now()}`;
    const results: Record<string, unknown> = {};

    // ── Correct headers per Zid docs ──────────────────────────────────────────
    const headers: Record<string, string> = {
      "Authorization": `Bearer ${store.auth_token || ""}`,
      "X-Manager-Token": store.access_token,
      "Store-Id": store.store_id,
      "Role": "Manager",
      "Accept-Language": "en",
      "Content-Type": "application/json",
    };

    // ── Test 1: GET store info (verify auth) ──────────────────────────────────
    try {
      const r = await fetch(`${BASE}/v1/managers/store/`, {
        headers: {
          "Authorization": `Bearer ${store.auth_token || ""}`,
          "X-Manager-Token": store.access_token,
          "Accept-Language": "en",
        },
      });
      const t = await r.text();
      results["1_GET_store_info"] = { status: r.status, ok: r.ok, body: t.slice(0, 400) };
    } catch (e) {
      results["1_GET_store_info"] = { error: String(e) };
    }

    // ── Test 2: POST /v1/products/ (correct endpoint per docs) ────────────────
    try {
      const body = {
        name: "DEBUG Test - delete me",
        price: 10,
        sku,
        is_draft: true,
        is_infinite: true,
        quantity: 999,
        requires_shipping: false,
        is_taxable: false,
      };

      const r = await fetch(`${BASE}/v1/products/`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      const t = await r.text();
      results["2_POST_products_json"] = { status: r.status, ok: r.ok, body: t.slice(0, 600) };
    } catch (e) {
      results["2_POST_products_json"] = { error: String(e) };
    }

    // ── Test 3: List products (verify read access) ────────────────────────────
    try {
      const r = await fetch(`${BASE}/v1/products/`, {
        headers: {
          "Authorization": `Bearer ${store.auth_token || ""}`,
          "X-Manager-Token": store.access_token,
          "Store-Id": store.store_id,
          "Role": "Manager",
          "Accept-Language": "en",
        },
      });
      const t = await r.text();
      results["3_GET_products_list"] = { status: r.status, ok: r.ok, body: t.slice(0, 400) };
    } catch (e) {
      results["3_GET_products_list"] = { error: String(e) };
    }

    return NextResponse.json({ storeInfo, results });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
