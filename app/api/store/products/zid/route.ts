import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getZidSession, zidFetch } from "@/lib/zid/client";

/**
 * GET /api/store/products/zid
 * Fetches the live product list from the merchant's Zid store.
 * Returns { products: ZidProduct[], total: number, storeConnected: boolean }
 * Pass ?debug=1 to also get a small slice of the raw Zid response for
 * diagnosing shape mismatches.
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
    console.log("[products/zid] status:", res.status, "body preview:", res.text.slice(0, 400));

    if (!res.ok) {
      return NextResponse.json({
        products: [],
        total: 0,
        error: `Zid returned ${res.status}: ${res.text.slice(0, 200)}`,
        storeConnected: true,
      });
    }

    const data = res.json as Record<string, unknown> | null;

    // Zid's response shape varies by endpoint version. Try every known wrapper:
    const rawList = extractProductList(data);
    const totalCount = extractTotal(data, rawList.length);

    const products: ZidProduct[] = rawList.map(normaliseProduct);

    const debug = request.nextUrl.searchParams.get("debug") === "1";

    return NextResponse.json({
      products,
      total: totalCount,
      storeConnected: true,
      ...(debug && {
        debug: {
          rawKeys: data ? Object.keys(data) : [],
          firstRawItem: rawList[0] ?? null,
          bodyPreview: res.text.slice(0, 800),
        },
      }),
    });
  } catch (err) {
    console.error("[products/zid] fetch error:", err);
    return NextResponse.json({ products: [], total: 0, error: String(err) });
  }
}

function extractProductList(data: Record<string, unknown> | null): Record<string, unknown>[] {
  if (!data) return [];
  const candidates: unknown[] = [
    data.products,
    (data.data as Record<string, unknown> | undefined)?.products,
    (data.payload as Record<string, unknown> | undefined)?.products,
    ((data.payload as Record<string, unknown> | undefined)?.data as Record<string, unknown> | undefined)?.products,
    data.results,
    (data.data as Record<string, unknown> | undefined)?.results,
    data.items,
    (data.data as Record<string, unknown> | undefined)?.items,
    data.data,
    data.payload,
  ];
  for (const c of candidates) {
    if (Array.isArray(c)) return c as Record<string, unknown>[];
  }
  return [];
}

function extractTotal(data: Record<string, unknown> | null, fallback: number): number {
  if (!data) return fallback;
  const candidates: unknown[] = [
    data.total,
    data.total_count,
    data.total_results,
    (data.meta as Record<string, unknown> | undefined)?.total,
    (data.pagination as Record<string, unknown> | undefined)?.total,
    (data.payload as Record<string, unknown> | undefined)?.total_count,
    (data.payload as Record<string, unknown> | undefined)?.total,
  ];
  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c)) return c;
  }
  return fallback;
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
