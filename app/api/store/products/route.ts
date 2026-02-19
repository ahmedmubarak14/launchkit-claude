import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/store/products
 * Creates a product in Zid and saves it to Supabase.
 *
 * Zid API (from official docs):
 *   POST https://api.zid.sa/v1/products/
 *   Headers: Authorization, X-Manager-Token, Store-Id, Role: Manager
 *   Body (JSON): { name, price, sku, is_draft, is_infinite, quantity, requires_shipping, is_taxable }
 *   Category assignment is a SEPARATE call: POST /v1/products/{id}/categories/  { id: categoryId }
 */
export async function POST(request: NextRequest) {
  try {
    const { product, sessionId } = await request.json();

    if (!product || !sessionId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's Zid store tokens + store_id
    const { data: storeRows } = await supabase
      .from("stores")
      .select("access_token, auth_token, store_id")
      .eq("user_id", user.id)
      .eq("platform", "zid")
      .order("created_at", { ascending: false })
      .limit(1);
    const store = storeRows?.[0] || null;

    console.log("[products] store:", {
      hasAccessToken: !!store?.access_token,
      hasAuthToken: !!store?.auth_token,
      store_id: store?.store_id,
      categoryId: product.categoryId,
    });

    // ─── Push to Zid ────────────────────────────────────────────────────────────
    let zidProductId: string | null = null;
    if (store?.access_token && store?.store_id) {
      const BASE = process.env.ZID_API_BASE_URL || "https://api.zid.sa";
      const sku = `LK-${Date.now()}`;

      // Headers per official Zid docs — Store-Id and Role are REQUIRED
      const headers: Record<string, string> = {
        "Authorization": `Bearer ${store.auth_token || ""}`,
        "X-Manager-Token": store.access_token,
        "Store-Id": store.store_id,
        "Role": "Manager",
        "Accept-Language": "all-languages",
        "Content-Type": "application/json",
      };

      // Body per official Zid docs — JSON with flat "name" field
      const body = {
        name: product.nameAr || product.nameEn || "Product",
        price: Number(product.price) || 0,
        sku,
        is_draft: false,
        is_infinite: true,
        quantity: 999,
        requires_shipping: true,
        is_taxable: false,
      };

      console.log("[products] Zid request:", { url: `${BASE}/v1/products/`, headers: { ...headers, "Authorization": "Bearer ***", "X-Manager-Token": "***" }, body });

      try {
        const res = await fetch(`${BASE}/v1/products/`, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });

        const text = await res.text();
        console.log("[products] Zid response:", res.status, text.slice(0, 500));

        if (res.ok || res.status === 201) {
          const data = JSON.parse(text);
          zidProductId = data?.id?.toString() || data?.product?.id?.toString() || null;
          console.log("[products] SUCCESS — zidProductId:", zidProductId);

          // ── Assign to category (separate Zid endpoint) ──────────────────────
          if (zidProductId && product.categoryId) {
            try {
              const catRes = await fetch(`${BASE}/v1/products/${zidProductId}/categories/`, {
                method: "POST",
                headers,
                body: JSON.stringify({ id: Number(product.categoryId) }),
              });
              const catText = await catRes.text();
              console.log("[products] Category assignment:", catRes.status, catText.slice(0, 200));
            } catch (catErr) {
              console.error("[products] Category assignment error:", catErr);
            }
          }
        } else {
          console.error("[products] Zid product creation failed:", res.status, text);
        }
      } catch (err) {
        console.error("[products] Zid fetch error:", err);
      }
    } else {
      console.log("[products] Missing store credentials — store_id:", store?.store_id, "access_token:", !!store?.access_token);
    }

    // ─── Save to Supabase ────────────────────────────────────────────────────────
    const { data, error } = await supabase.from("products").insert({
      session_id: sessionId,
      name_ar: product.nameAr,
      name_en: product.nameEn,
      description_ar: product.descriptionAr ?? null,
      description_en: product.descriptionEn ?? null,
      price: product.price || 0,
      variants: product.variants || [],
      platform_id: zidProductId,
    }).select().single();

    if (error) throw error;

    return NextResponse.json({ success: true, product: data, pushedToZid: !!zidProductId });
  } catch (error) {
    console.error("[products] API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ products: data });
  } catch (error) {
    console.error("[products] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
