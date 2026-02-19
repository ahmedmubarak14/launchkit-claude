import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: storeRows } = await supabase
      .from("stores")
      .select("access_token, auth_token, store_id, store_name")
      .eq("user_id", user.id)
      .eq("platform", "zid")
      .order("created_at", { ascending: false })
      .limit(1);
    const store = storeRows?.[0] || null;

    if (!store?.access_token) return NextResponse.json({ error: "No store" });
    if (!store.store_id) return NextResponse.json({ error: "store_id is NULL — visit /api/store/fix-store-id first" });

    const BASE = process.env.ZID_API_BASE_URL || "https://api.zid.sa";
    const sku = `DBG-${Date.now()}`;

    // Exact headers per Zid official docs
    const headers: Record<string, string> = {
      "Authorization": `Bearer ${store.auth_token || ""}`,
      "X-Manager-Token": store.access_token,
      "Store-Id": store.store_id,
      "Role": "Manager",
      "Accept-Language": "en",
      "Content-Type": "application/json",
    };

    const storeInfo = {
      store_id: store.store_id,
      store_name: store.store_name,
      accessTokenPrefix: store.access_token.slice(0, 15) + "...",
      authTokenPrefix: (store.auth_token || "").slice(0, 15) + "...",
    };

    // POST /v1/products/ — full response, not truncated
    const body = {
      name: "DEBUG - delete me",
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
    const responseText = await r.text();

    return NextResponse.json({
      storeInfo,
      request: { url: `${BASE}/v1/products/`, body },
      response: { status: r.status, ok: r.ok, body: responseText },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
