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

    // Get user's Zid store tokens (use limit 1 in case of duplicate rows)
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
      store_id: store?.store_id
    }));

    // Push product to Zid if store is connected
    let zidProductId: string | null = null;
    if (store?.access_token) {
      try {
        const sku = `LK-${Date.now()}`;

        // Use multipart/form-data — same approach as categories which works
        const formData = new FormData();
        formData.append("name[ar]", product.nameAr || product.nameEn || "منتج");
        formData.append("name[en]", product.nameEn || product.nameAr || "Product");
        formData.append("price", String(product.price || 0));
        formData.append("sku", sku);
        formData.append("is_draft", "0");
        formData.append("is_infinite", "1");
        formData.append("requires_shipping", "1");
        formData.append("is_taxable", "0");
        if (product.descriptionAr) {
          formData.append("description[ar]", product.descriptionAr);
        }
        if (product.descriptionEn) {
          formData.append("description[en]", product.descriptionEn);
        }

        // Mirror exact headers that work for categories
        const zidHeaders: Record<string, string> = {
          "X-Manager-Token": store.access_token,
          "Authorization": `Bearer ${store.auth_token}`,
          "Accept-Language": "ar",
        };

        console.log("Zid product request headers:", JSON.stringify(zidHeaders));

        // Try the managers product endpoint first (same namespace as categories)
        const zidRes = await fetch(`${process.env.ZID_API_BASE_URL}/v1/managers/store/products/add`, {
          method: "POST",
          headers: zidHeaders,
          body: formData,
        });

        const responseText = await zidRes.text();
        console.log("Zid product response (managers endpoint):", zidRes.status, responseText);

        if (zidRes.ok) {
          const zidData = JSON.parse(responseText);
          zidProductId = zidData?.product?.id?.toString() || zidData?.id?.toString() || null;
        } else {
          // Fallback: try /v1/products/ with JSON (standard endpoint)
          console.log("Managers endpoint failed, trying /v1/products/ with JSON...");

          const jsonHeaders: Record<string, string> = {
            "X-Manager-Token": store.access_token,
            "Authorization": `Bearer ${store.auth_token}`,
            "Content-Type": "application/json",
            "Accept-Language": "ar",
          };

          const jsonBody = {
            name: product.nameAr || product.nameEn,
            price: product.price || 0,
            sku,
            is_draft: false,
            is_infinite: true,
            requires_shipping: true,
            is_taxable: false,
          };

          console.log("Zid product JSON fallback body:", JSON.stringify(jsonBody));

          const fallbackRes = await fetch(`${process.env.ZID_API_BASE_URL}/v1/products/`, {
            method: "POST",
            headers: jsonHeaders,
            body: JSON.stringify(jsonBody),
          });

          const fallbackText = await fallbackRes.text();
          console.log("Zid product response (/v1/products/ JSON):", fallbackRes.status, fallbackText);

          if (fallbackRes.ok) {
            const fallbackData = JSON.parse(fallbackText);
            zidProductId = fallbackData?.product?.id?.toString() || fallbackData?.id?.toString() || null;
          } else {
            // Last attempt: form-data to /v1/products/
            console.log("JSON fallback failed, trying /v1/products/ with form-data...");

            const formData2 = new FormData();
            formData2.append("name[ar]", product.nameAr || product.nameEn || "منتج");
            formData2.append("name[en]", product.nameEn || product.nameAr || "Product");
            formData2.append("price", String(product.price || 0));
            formData2.append("sku", `${sku}-b`);
            formData2.append("is_draft", "0");
            formData2.append("is_infinite", "1");
            formData2.append("requires_shipping", "1");
            formData2.append("is_taxable", "0");

            const lastRes = await fetch(`${process.env.ZID_API_BASE_URL}/v1/products/`, {
              method: "POST",
              headers: {
                "X-Manager-Token": store.access_token,
                "Authorization": `Bearer ${store.auth_token}`,
                "Accept-Language": "ar",
              },
              body: formData2,
            });

            const lastText = await lastRes.text();
            console.log("Zid product response (/v1/products/ form-data):", lastRes.status, lastText);

            if (lastRes.ok) {
              const lastData = JSON.parse(lastText);
              zidProductId = lastData?.product?.id?.toString() || lastData?.id?.toString() || null;
            } else {
              console.error("All product creation attempts failed. Last error:", lastRes.status, lastText);
            }
          }
        }
      } catch (err) {
        console.error("Zid product push error:", err);
      }
    } else {
      console.log("No store access token found, skipping Zid push");
    }

    // Save product to Supabase with Zid platform_id if available
    const { data, error } = await supabase.from("products").insert({
      session_id: sessionId,
      name_ar: product.nameAr,
      name_en: product.nameEn,
      description_ar: product.descriptionAr,
      description_en: product.descriptionEn,
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
