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

    // Push product to Zid if store is connected
    let zidProductId: string | null = null;
    if (store?.access_token) {
      try {
        const sku = `LK-${Date.now()}`;
        const zidBody: Record<string, unknown> = {
          name: product.nameAr || product.nameEn, // Zid uses a single name field
          price: product.price || 0,
          sku,
          is_draft: false,
          is_infinite: true,
          requires_shipping: true,
          is_taxable: false,
        };

        const zidRes = await fetch(`${process.env.ZID_API_BASE_URL}/v1/products/`, {
          method: "POST",
          headers: {
            "X-Manager-Token": store.access_token,
            "Authorization": `Bearer ${store.auth_token}`,
            "Content-Type": "application/json",
            "Accept-Language": "ar",
            "Role": "Manager",
            ...(store.store_id ? { "Store-Id": store.store_id } : {}),
          },
          body: JSON.stringify(zidBody),
        });

        const responseText = await zidRes.text();
        console.log("Zid product response:", zidRes.status, responseText);

        if (zidRes.ok) {
          const zidData = JSON.parse(responseText);
          zidProductId = zidData?.product?.id?.toString() || zidData?.id?.toString() || null;
        } else {
          console.error("Zid product create failed:", zidRes.status, responseText);
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
