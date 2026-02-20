import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/store/products/zid
 * Fetches the live product list from the merchant's Zid store.
 * Returns { products: ZidProduct[], total: number }
 */
export interface ZidProduct {
  id: string;
  nameAr: string;
  nameEn: string;
  price: number;
  sku: string | null;
  status: string;
  categoryIds: string[];
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: storeRows } = await supabase
      .from("stores")
      .select("access_token, auth_token, store_id")
      .eq("user_id", user.id)
      .eq("platform", "zid")
      .order("created_at", { ascending: false })
      .limit(1);

    const store = storeRows?.[0] || null;
    if (!store?.access_token || !store?.store_id) {
      return NextResponse.json({ products: [], storeConnected: false });
    }

    const apiBase = process.env.ZID_API_BASE_URL || "https://api.zid.sa";
    const headers: Record<string, string> = {
      "X-Manager-Token": store.access_token,
      "Authorization": `Bearer ${store.auth_token || ""}`,
      "Store-Id": store.store_id,
      "Role": "Manager",
      "Accept-Language": "ar,en",
    };

    // Fetch first 50 products
    const res = await fetch(`${apiBase}/v1/products/?page=1&per_page=50`, { headers });
    const text = await res.text();
    console.log("[products/zid] Zid fetch:", res.status, text.slice(0, 300));

    if (!res.ok) {
      return NextResponse.json({ products: [], error: `Zid returned ${res.status}: ${text.slice(0, 200)}` });
    }

    const data = JSON.parse(text);

    // Zid wraps products under different keys depending on version
    const rawList: Record<string, unknown>[] =
      data?.products ||
      data?.data?.products ||
      data?.data ||
      [];

    const products: ZidProduct[] = rawList.map((p) => {
      const name = p.name as Record<string, string> | string | undefined;
      const nameAr = typeof name === "object" && name !== null
        ? name.ar || name.en || ""
        : String(p.name_ar || p.name || "");
      const nameEn = typeof name === "object" && name !== null
        ? name.en || name.ar || ""
        : String(p.name_en || p.name || nameAr);

      return {
        id: String(p.id || p.uuid || ""),
        nameAr,
        nameEn,
        price: Number(p.price || 0),
        sku: p.sku ? String(p.sku) : null,
        status: String(p.status || p.is_draft ? "draft" : "active"),
        categoryIds: Array.isArray(p.category_ids)
          ? p.category_ids.map(String)
          : [],
      };
    });

    return NextResponse.json({
      products,
      total: data?.total || data?.meta?.total || products.length,
      storeConnected: true,
    });
  } catch (err) {
    console.error("[products/zid] fetch error:", err);
    return NextResponse.json({ products: [], error: String(err) });
  }
}
