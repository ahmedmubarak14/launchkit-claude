import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/store/fix-store-id
 * Backfills store_id for existing stores that have tokens but null store_id.
 * Tries multiple Zid endpoints to find the store ID.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: storeRows } = await supabase
      .from("stores")
      .select("id, access_token, auth_token, store_id, store_name")
      .eq("user_id", user.id)
      .eq("platform", "zid")
      .order("created_at", { ascending: false })
      .limit(1);
    const store = storeRows?.[0] || null;

    if (!store?.access_token) {
      return NextResponse.json({ error: "No Zid store found" });
    }

    if (store.store_id) {
      return NextResponse.json({
        message: "store_id already set",
        store_id: store.store_id,
        store_name: store.store_name,
      });
    }

    const BASE = process.env.ZID_API_BASE_URL || "https://api.zid.sa";
    const headers: Record<string, string> = {
      "X-Manager-Token": store.access_token,
      "Authorization": `Bearer ${store.auth_token || ""}`,
      "Accept-Language": "en",
    };

    let storeId: string | null = null;
    let storeName = store.store_name || "My Zid Store";
    const attempts: Record<string, unknown> = {};

    // Attempt 1: manager profile
    try {
      const r = await fetch(`${BASE}/v1/managers/account/profile`, { headers });
      const t = await r.text();
      attempts["profile"] = { status: r.status, body: t.slice(0, 400) };
      if (r.ok) {
        const d = JSON.parse(t);
        storeId = d?.user?.store?.id?.toString() || d?.store?.id?.toString() || null;
        storeName = d?.user?.store?.title || d?.user?.store?.username || storeName;
      }
    } catch (e) {
      attempts["profile"] = { error: String(e) };
    }

    // Attempt 2: managers/store
    if (!storeId) {
      try {
        const r = await fetch(`${BASE}/v1/managers/store/`, { headers });
        const t = await r.text();
        attempts["managers_store"] = { status: r.status, body: t.slice(0, 400) };
        if (r.ok) {
          const d = JSON.parse(t);
          storeId = d?.store?.id?.toString() || d?.data?.store?.id?.toString() || d?.id?.toString() || null;
          storeName = d?.store?.name || d?.store?.title || storeName;
        }
      } catch (e) {
        attempts["managers_store"] = { error: String(e) };
      }
    }

    // Attempt 3: JWT decode
    if (!storeId && store.auth_token) {
      try {
        const parts = store.auth_token.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
          attempts["jwt_payload"] = payload;
          storeId = payload?.store_id?.toString() || payload?.sub?.toString() || null;
        }
      } catch (e) {
        attempts["jwt"] = { error: String(e) };
      }
    }

    if (storeId) {
      // Update the store record with the found store_id
      await supabase
        .from("stores")
        .update({ store_id: storeId, store_name: storeName })
        .eq("id", store.id);

      return NextResponse.json({
        success: true,
        store_id: storeId,
        store_name: storeName,
        message: "store_id has been saved! Products will now work. No need to reconnect.",
        attempts,
      });
    }

    return NextResponse.json({
      success: false,
      message: "Could not find store_id from any endpoint",
      attempts,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
