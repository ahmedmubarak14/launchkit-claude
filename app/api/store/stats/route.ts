import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getZidSession, zidFetch } from "@/lib/zid/client";

/**
 * GET /api/store/stats
 *
 * Live dashboard stats pulled directly from Zid, not Supabase.
 * Returns counts + recent items so the dashboard can match what's live.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await getZidSession(user.id);
  if (!session) {
    return NextResponse.json({
      storeConnected: false,
      storeName: null,
      categoryCount: 0,
      productCount: 0,
      recentProducts: [],
      recentCategories: [],
      fetchedAt: new Date().toISOString(),
    });
  }

  const [catsRes, prodsRes] = await Promise.allSettled([
    zidFetch(session, `/v1/managers/store/categories/`),
    zidFetch(session, `/v1/products/?page=1&per_page=6`),
  ]);

  let categoryCount = 0;
  let recentCategories: { id: string; nameAr: string; nameEn: string; productsCount: number }[] = [];
  if (catsRes.status === "fulfilled" && catsRes.value.ok) {
    const data = catsRes.value.json as Record<string, unknown> | null;
    const raw = extractList(data, "categories");
    categoryCount = extractTotal(data, raw.length);
    recentCategories = raw.slice(0, 6).map((c) => {
      const name = c.name as Record<string, string> | string | undefined;
      const ar = typeof name === "object" && name ? (name.ar ?? "") : String(name ?? "");
      const en = typeof name === "object" && name ? (name.en ?? ar) : ar;
      return {
        id: String(c.id ?? ""),
        nameAr: ar,
        nameEn: en,
        productsCount: Number(c.products_count ?? 0),
      };
    });
  }

  let productCount = 0;
  let recentProducts: { id: string; nameAr: string; nameEn: string; price: number; status: string }[] = [];
  if (prodsRes.status === "fulfilled" && prodsRes.value.ok) {
    const data = prodsRes.value.json as Record<string, unknown> | null;
    const raw = extractList(data, "products");
    productCount = extractTotal(data, raw.length);
    recentProducts = raw.slice(0, 6).map((p) => {
      const name = p.name as Record<string, string> | string | undefined;
      const ar = typeof name === "object" && name ? (name.ar ?? "") : String(p.name_ar ?? p.name ?? "");
      const en = typeof name === "object" && name ? (name.en ?? ar) : String(p.name_en ?? p.name ?? ar);
      return {
        id: String(p.id ?? p.uuid ?? ""),
        nameAr: ar,
        nameEn: en,
        price: Number(p.price ?? 0),
        status: p.is_draft ? "draft" : String(p.status ?? "active"),
      };
    });
  }

  return NextResponse.json({
    storeConnected: true,
    storeName: session.storeName,
    categoryCount,
    productCount,
    recentProducts,
    recentCategories,
    fetchedAt: new Date().toISOString(),
  });
}

function extractList(data: Record<string, unknown> | null, key: string): Record<string, unknown>[] {
  if (!data) return [];
  const candidates: unknown[] = [
    data[key],
    (data.data as Record<string, unknown> | undefined)?.[key],
    (data.payload as Record<string, unknown> | undefined)?.[key],
    ((data.payload as Record<string, unknown> | undefined)?.data as Record<string, unknown> | undefined)?.[key],
    data.results,
    data.items,
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
