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

    // Get user's Zid store access token
    const { data: store } = await supabase
      .from("stores")
      .select("access_token, store_id")
      .eq("user_id", user.id)
      .eq("platform", "zid")
      .single();

    // Push product to Zid if store is connected
    let zidProductId: string | null = null;
    if (store?.access_token) {
      try {
        const zidRes = await fetch(`${process.env.ZID_API_BASE_URL}/v1/managers/store/product`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${store.access_token}`,
            "Content-Type": "application/json",
            "Accept-Language": "ar",
          },
          body: JSON.stringify({
            name: { ar: product.nameAr, en: product.nameEn },
            description: { ar: product.descriptionAr || "", en: product.descriptionEn || "" },
            price: product.price || 0,
            active: true,
            quantity: 100,
            unlimited_quantity: false,
            ...(product.variants && product.variants.length > 0 && {
              attributes: product.variants.map((v: { name_en?: string; options?: string[] }) => ({
                name: v.name_en || "Option",
                values: v.options || [],
              })),
            }),
          }),
        });

        if (zidRes.ok) {
          const zidData = await zidRes.json();
          zidProductId = zidData?.product?.id?.toString() || zidData?.id?.toString() || null;
        } else {
          const errText = await zidRes.text();
          console.error("Zid product create failed:", zidRes.status, errText);
        }
      } catch (err) {
        console.error("Zid product push error:", err);
      }
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
