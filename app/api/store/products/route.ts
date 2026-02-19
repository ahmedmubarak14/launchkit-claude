import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    // Get user's Zid store tokens
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

    // ─── Push to Zid ─────────────────────────────────────────────────────────────
    let zidProductId: string | null = null;
    if (store?.access_token) {
      const sku = `LK-${Date.now()}`;
      const BASE = process.env.ZID_API_BASE_URL || "https://api.zid.sa";

      const commonHeaders: Record<string, string> = {
        "X-Manager-Token": store.access_token,
        "Authorization": `Bearer ${store.auth_token || ""}`,
        "Accept-Language": "ar",
      };

      // Helper: build shared FormData
      const buildFD = (skuVal: string): FormData => {
        const fd = new FormData();
        fd.append("name[ar]", product.nameAr || product.nameEn || "منتج");
        fd.append("name[en]", product.nameEn || product.nameAr || "Product");
        fd.append("price", String(product.price || 0));
        fd.append("sku", skuVal);
        fd.append("is_draft", "0");
        fd.append("is_infinite", "1");
        fd.append("unlimited_quantity", "1");   // Zid sometimes requires this
        fd.append("quantity", "999");
        fd.append("requires_shipping", "1");
        fd.append("is_taxable", "0");
        if (product.descriptionAr) fd.append("description[ar]", product.descriptionAr);
        if (product.descriptionEn) fd.append("description[en]", product.descriptionEn);
        if (product.categoryId) {
          fd.append("category_id", String(product.categoryId));
          fd.append("categories[]", String(product.categoryId));
        }
        return fd;
      };

      // Helper: build JSON body
      const buildJSON = (skuVal: string) => ({
        name: product.nameAr || product.nameEn,
        name_ar: product.nameAr || product.nameEn,
        name_en: product.nameEn || product.nameAr,
        description_ar: product.descriptionAr || "",
        description_en: product.descriptionEn || "",
        price: product.price || 0,
        sku: skuVal,
        is_draft: false,
        is_infinite: true,
        unlimited_quantity: true,
        quantity: 999,
        requires_shipping: true,
        is_taxable: false,
        ...(product.categoryId ? { category_id: product.categoryId, categories: [product.categoryId] } : {}),
      });

      const attempts = [
        // 1. managers/store/products/add — form-data (mirrors category endpoint)
        () => fetch(`${BASE}/v1/managers/store/products/add`, {
          method: "POST", headers: commonHeaders, body: buildFD(sku),
        }),
        // 2. managers/store/products/ — JSON
        () => fetch(`${BASE}/v1/managers/store/products/`, {
          method: "POST",
          headers: { ...commonHeaders, "Content-Type": "application/json" },
          body: JSON.stringify(buildJSON(`${sku}-b`)),
        }),
        // 3. products/ — JSON
        () => fetch(`${BASE}/v1/products/`, {
          method: "POST",
          headers: { ...commonHeaders, "Content-Type": "application/json" },
          body: JSON.stringify(buildJSON(`${sku}-c`)),
        }),
        // 4. products/ — form-data
        () => fetch(`${BASE}/v1/products/`, {
          method: "POST", headers: commonHeaders, body: buildFD(`${sku}-d`),
        }),
        // 5. managers/products/ — form-data (alternative namespace)
        () => fetch(`${BASE}/v1/managers/products/`, {
          method: "POST", headers: commonHeaders, body: buildFD(`${sku}-e`),
        }),
      ];

      for (let i = 0; i < attempts.length; i++) {
        try {
          const res = await attempts[i]();
          const text = await res.text();
          console.log(`[products] attempt ${i + 1}: status=${res.status} body=${text.slice(0, 300)}`);
          if (res.ok) {
            const d = JSON.parse(text);
            zidProductId = d?.product?.id?.toString() ?? d?.data?.id?.toString() ?? d?.id?.toString() ?? null;
            console.log(`[products] SUCCESS on attempt ${i + 1}, zidProductId=${zidProductId}`);
            break;
          }
        } catch (err) {
          console.error(`[products] attempt ${i + 1} threw:`, err);
        }
      }

      if (!zidProductId) {
        console.error("[products] All attempts failed — product saved to DB only");
      }
    } else {
      console.log("[products] No store access token, skipping Zid push");
    }

    // ─── Save to Supabase ─────────────────────────────────────────────────────────
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
