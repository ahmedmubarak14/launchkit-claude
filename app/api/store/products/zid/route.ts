import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getZidSession, zidFetch } from "@/lib/zid/client";
import { extractList, extractTotal } from "@/lib/zid/parse";

/**
 * GET /api/store/products/zid
 * Fetches the live product list from the merchant's Zid store.
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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const session = await getZidSession(user.id);
    if (!session) {
      return NextResponse.json({ products: [], total: 0, storeConnected: false });
    }

    const res = await zidFetch(session, `/v1/products/?page=1&per_page=100`);
    console.log("[products/zid] status:", res.status);
    console.log("[products/zid] body preview:", res.text.slice(0, 600));

    if (!res.ok) {
      return NextResponse.json({
        products: [],
        total: 0,
        error: `Zid returned ${res.status}: ${res.text.slice(0, 200)}`,
        storeConnected: true,
      });
    }

    const data = res.json as Record<string, unknown> | null;
    const rawList = extractList(data, "products");
    const totalCount = extractTotal(data, rawList.length);

    const products: ZidProduct[] = rawList.map(normaliseProduct);
    const debug = request.nextUrl.searchParams.get("debug") === "1";

    if (rawList.length === 0 && totalCount > 0) {
      // Zid reports a total but we didn't find the array — log the full shape
      console.warn("[products/zid] total>0 but no array found. keys:", data ? Object.keys(data) : null);
    }

    return NextResponse.json({
      products,
      total: totalCount,
      storeConnected: true,
      ...(debug || (rawList.length === 0 && totalCount > 0)
        ? {
            debug: {
              rawKeys: data ? Object.keys(data) : [],
              nestedKeys: data && typeof data === "object"
                ? Object.fromEntries(
                    Object.entries(data).map(([k, v]) => [k, typeof v === "object" && v ? Object.keys(v) : typeof v])
                  )
                : null,
              bodyPreview: res.text.slice(0, 1200),
            },
          }
        : {}),
    });
  } catch (err) {
    console.error("[products/zid] fetch error:", err);
    return NextResponse.json({ products: [], total: 0, error: String(err) });
  }
}

function normaliseProduct(p: Record<string, unknown>): ZidProduct {
  const name = p.name as Record<string, string> | string | undefined;
  const nameAr = typeof name === "object" && name !== null
    ? (name.ar || name.en || "")
    : String(p.name_ar || p.name || "");
  const nameEn = typeof name === "object" && name !== null
    ? (name.en || name.ar || "")
    : String(p.name_en || p.name || nameAr);

  return {
    id: String(p.id || p.uuid || ""),
    nameAr,
    nameEn,
    price: Number(p.price || (p.sale_price as number) || 0),
    sku: p.sku ? String(p.sku) : null,
    status: p.is_draft ? "draft" : String(p.status || "active"),
    categoryIds: Array.isArray(p.category_ids)
      ? (p.category_ids as unknown[]).map(String)
      : Array.isArray(p.categories)
        ? (p.categories as Record<string, unknown>[]).map((c) => String(c.id ?? ""))
        : [],
  };
}
