import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Debug endpoint to test Zid API directly and see exact errors
// GET /api/store/debug — returns store tokens and tests all product endpoints
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: storeRows } = await supabase
      .from("stores")
      .select("access_token, auth_token, store_id, store_name, platform")
      .eq("user_id", user.id)
      .eq("platform", "zid")
      .order("created_at", { ascending: false })
      .limit(1);

    const store = storeRows?.[0] || null;

    if (!store) {
      return NextResponse.json({ error: "No store connected", storeRows });
    }

    const results: Record<string, unknown> = {
      storeFound: true,
      store_name: store.store_name,
      store_id: store.store_id,
      hasAccessToken: !!store.access_token,
      hasAuthToken: !!store.auth_token,
      accessTokenPrefix: store.access_token?.substring(0, 20) + "...",
      authTokenPrefix: store.auth_token?.substring(0, 20) + "...",
    };

    const apiBase = process.env.ZID_API_BASE_URL || "https://api.zid.sa";
    const testSku = `DEBUG-${Date.now()}`;

    const commonHeaders: Record<string, string> = {
      "X-Manager-Token": store.access_token,
      "Authorization": `Bearer ${store.auth_token}`,
      "Accept-Language": "ar",
    };

    // Test 1: GET store info
    try {
      const storeInfoRes = await fetch(`${apiBase}/v1/managers/store/`, {
        headers: commonHeaders,
      });
      const storeInfoText = await storeInfoRes.text();
      results.storeInfo = { status: storeInfoRes.status, body: storeInfoText.substring(0, 500) };
    } catch (e) {
      results.storeInfo = { error: String(e) };
    }

    // Test 2: POST product via managers/store/products/add (form-data)
    try {
      const fd = new FormData();
      fd.append("name[ar]", "منتج تجريبي");
      fd.append("name[en]", "Debug Product");
      fd.append("price", "10");
      fd.append("sku", testSku);
      fd.append("is_draft", "0");
      fd.append("is_infinite", "1");
      fd.append("requires_shipping", "1");
      fd.append("is_taxable", "0");

      const r = await fetch(`${apiBase}/v1/managers/store/products/add`, {
        method: "POST",
        headers: commonHeaders,
        body: fd,
      });
      const text = await r.text();
      results.managersProductAdd = { status: r.status, body: text.substring(0, 500) };
    } catch (e) {
      results.managersProductAdd = { error: String(e) };
    }

    // Test 3: POST product via /v1/products/ (JSON)
    try {
      const r = await fetch(`${apiBase}/v1/products/`, {
        method: "POST",
        headers: { ...commonHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Debug Product JSON",
          price: 10,
          sku: `${testSku}-json`,
          is_draft: false,
          is_infinite: true,
          requires_shipping: true,
          is_taxable: false,
        }),
      });
      const text = await r.text();
      results.productsJsonPost = { status: r.status, body: text.substring(0, 500) };
    } catch (e) {
      results.productsJsonPost = { error: String(e) };
    }

    // Test 4: POST product via /v1/products/ (form-data)
    try {
      const fd = new FormData();
      fd.append("name[ar]", "منتج تجريبي فورم");
      fd.append("name[en]", "Debug Product Form");
      fd.append("price", "10");
      fd.append("sku", `${testSku}-fd`);
      fd.append("is_draft", "0");
      fd.append("is_infinite", "1");
      fd.append("requires_shipping", "1");
      fd.append("is_taxable", "0");

      const r = await fetch(`${apiBase}/v1/products/`, {
        method: "POST",
        headers: commonHeaders,
        body: fd,
      });
      const text = await r.text();
      results.productsFormPost = { status: r.status, body: text.substring(0, 500) };
    } catch (e) {
      results.productsFormPost = { error: String(e) };
    }

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
