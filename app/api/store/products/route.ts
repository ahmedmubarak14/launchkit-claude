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

    console.log("Store data:", JSON.stringify({
      hasAccessToken: !!store?.access_token,
      hasAuthToken: !!store?.auth_token,
      store_id: store?.store_id,
      categoryId: product.categoryId,
    }));

    // ─── Push to Zid ────────────────────────────────────────────────────────────
    let zidProductId: string | null = null;
    if (store?.access_token) {
      try {
        const sku = `LK-${Date.now()}`;

        const zidHeaders: Record<string, string> = {
          "X-Manager-Token": store.access_token,
          "Authorization": `Bearer ${store.auth_token}`,
          "Accept-Language": "ar",
        };

        // Helper: build shared FormData fields
        const buildFormData = (skuValue: string): FormData => {
          const fd = new FormData();
          fd.append("name[ar]", product.nameAr || product.nameEn || "منتج");
          fd.append("name[en]", product.nameEn || product.nameAr || "Product");
          fd.append("price", String(product.price || 0));
          fd.append("sku", skuValue);
          fd.append("is_draft", "0");
          fd.append("is_infinite", "1");
          fd.append("requires_shipping", "1");
          fd.append("is_taxable", "0");
          if (product.descriptionAr) fd.append("description[ar]", product.descriptionAr);
          if (product.descriptionEn) fd.append("description[en]", product.descriptionEn);
          // ── Category assignment ──────────────────────────────────────────────
          if (product.categoryId) {
            fd.append("category_id", String(product.categoryId));
            fd.append("categories[]", String(product.categoryId));
          }
          return fd;
        };

        // Attempt 1: /v1/managers/store/products/add  (same namespace as categories)
        console.log("Attempt 1: /v1/managers/store/products/add");
        const res1 = await fetch(`${process.env.ZID_API_BASE_URL}/v1/managers/store/products/add`, {
          method: "POST",
          headers: zidHeaders,
          body: buildFormData(sku),
        });
        const text1 = await res1.text();
        console.log("Attempt 1 result:", res1.status, text1.slice(0, 500));

        if (res1.ok) {
          const d = JSON.parse(text1);
          zidProductId = d?.product?.id?.toString() ?? d?.id?.toString() ?? null;
        } else {
          // Attempt 2: /v1/products/ JSON
          console.log("Attempt 2: /v1/products/ JSON");
          const jsonBody: Record<string, unknown> = {
            name: product.nameAr || product.nameEn,
            name_en: product.nameEn || product.nameAr,
            price: product.price || 0,
            sku,
            is_draft: false,
            is_infinite: true,
            requires_shipping: true,
            is_taxable: false,
          };
          if (product.categoryId) {
            jsonBody.category_id = product.categoryId;
            jsonBody.categories = [product.categoryId];
          }

          const res2 = await fetch(`${process.env.ZID_API_BASE_URL}/v1/products/`, {
            method: "POST",
            headers: { ...zidHeaders, "Content-Type": "application/json" },
            body: JSON.stringify(jsonBody),
          });
          const text2 = await res2.text();
          console.log("Attempt 2 result:", res2.status, text2.slice(0, 500));

          if (res2.ok) {
            const d = JSON.parse(text2);
            zidProductId = d?.product?.id?.toString() ?? d?.id?.toString() ?? null;
          } else {
            // Attempt 3: /v1/products/ form-data
            console.log("Attempt 3: /v1/products/ form-data");
            const res3 = await fetch(`${process.env.ZID_API_BASE_URL}/v1/products/`, {
              method: "POST",
              headers: zidHeaders,
              body: buildFormData(`${sku}-b`),
            });
            const text3 = await res3.text();
            console.log("Attempt 3 result:", res3.status, text3.slice(0, 500));

            if (res3.ok) {
              const d = JSON.parse(text3);
              zidProductId = d?.product?.id?.toString() ?? d?.id?.toString() ?? null;
            } else {
              // Attempt 4: /v1/managers/store/products/ (without /add suffix)
              console.log("Attempt 4: /v1/managers/store/products/");
              const res4 = await fetch(`${process.env.ZID_API_BASE_URL}/v1/managers/store/products/`, {
                method: "POST",
                headers: { ...zidHeaders, "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: product.nameAr || product.nameEn,
                  name_en: product.nameEn || product.nameAr,
                  price: product.price || 0,
                  sku: `${sku}-c`,
                  is_draft: false,
                  is_infinite: true,
                  requires_shipping: true,
                  is_taxable: false,
                  ...(product.categoryId ? { category_id: product.categoryId, categories: [product.categoryId] } : {}),
                }),
              });
              const text4 = await res4.text();
              console.log("Attempt 4 result:", res4.status, text4.slice(0, 500));

              if (res4.ok) {
                const d = JSON.parse(text4);
                zidProductId = d?.product?.id?.toString() ?? d?.id?.toString() ?? null;
              } else {
                console.error("All 4 product creation attempts failed.");
              }
            }
          }
        }
      } catch (err) {
        console.error("Zid product push error:", err);
      }
    } else {
      console.log("No store access token, skipping Zid push");
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
    console.error("Products API error:", error);
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
    console.error("Products GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
