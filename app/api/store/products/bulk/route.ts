import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getZidSession, zidFetch } from "@/lib/zid/client";
import { extractList } from "@/lib/zid/parse";

const ProductInputSchema = z.object({
  nameAr: z.string().min(1).optional(),
  nameEn: z.string().min(1).optional(),
  price: z.union([z.number(), z.string()]).transform((v) => {
    if (typeof v === "number") return v;
    const n = parseFloat(String(v).replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }),
  descriptionAr: z.string().optional(),
  descriptionEn: z.string().optional(),
  imageUrl: z.string().optional(),
  categoryName: z.string().optional(),
  categoryId: z.string().optional(),
}).refine(
  (p) => !!(p.nameAr || p.nameEn),
  { message: "At least one of nameAr or nameEn is required" }
);

const BulkSchema = z.object({
  products: z.array(ProductInputSchema).min(1).max(500),
});

/**
 * POST /api/store/products/bulk
 *
 * Bulk-create products on the merchant's Zid store. Used by the chat's
 * CSV/XLSX upload flow.
 */
export async function POST(request: NextRequest) {
  const parsed = BulkSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await getZidSession(user.id);
  if (!session) {
    return NextResponse.json({ error: "Store not connected" }, { status: 400 });
  }

  // Pre-fetch categories once so we can resolve categoryName → categoryId
  const catRes = await zidFetch(session, `/v1/managers/store/categories/`);
  const rawCats = extractList(catRes.json as Record<string, unknown> | null, "categories");

  const categoryIndex = new Map<string, string>();
  for (const c of rawCats) {
    if (!c.id) continue;
    const name = c.name as Record<string, string> | string | undefined;
    const ar = typeof name === "object" && name ? (name.ar ?? "") : String(name ?? "");
    const en = typeof name === "object" && name ? (name.en ?? "") : "";
    const id = String(c.id);
    if (ar) categoryIndex.set(normalizeForMatch(ar), id);
    if (en) categoryIndex.set(normalizeForMatch(en), id);
  }
  console.log("[bulk] categories indexed:", categoryIndex.size, "from", rawCats.length, "rows");

  const created: { zidId: string; name: string; categoryLinked: boolean; imageAttached: boolean }[] = [];
  const failed: { name: string; reason: string }[] = [];
  const unmatchedCategories = new Set<string>();

  for (const p of parsed.data.products) {
    const nameAr = p.nameAr || p.nameEn || "";
    const nameEn = p.nameEn || p.nameAr || "";

    const matchKey = p.categoryName ? normalizeForMatch(p.categoryName) : "";
    const resolvedCategoryId = p.categoryId || (matchKey ? categoryIndex.get(matchKey) : undefined);
    if (p.categoryName && !resolvedCategoryId) unmatchedCategories.add(p.categoryName);

    const body = {
      name: { ar: nameAr, en: nameEn },
      description: { ar: p.descriptionAr ?? "", en: p.descriptionEn ?? "" },
      price: p.price,
      sku: `LK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      is_published: true,
      is_draft: false,
      is_infinite: true,
      quantity: 999,
      requires_shipping: false,
      is_taxable: false,
      ...(resolvedCategoryId ? { categories: [{ id: resolvedCategoryId }] } : {}),
    };

    const res = await zidFetch(session, `/v1/products/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      failed.push({ name: nameEn, reason: `Zid HTTP ${res.status}: ${res.text.slice(0, 160)}` });
      continue;
    }

    const created_json = res.json as Record<string, unknown> | null;
    const zidId = extractCreatedId(created_json);

    // If the inline `categories` field didn't take, fall back to the
    // separate POST /v1/products/{id}/categories/ endpoint
    let categoryLinked = !!resolvedCategoryId;
    if (zidId && resolvedCategoryId) {
      const attachRes = await zidFetch(session, `/v1/products/${zidId}/categories/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: resolvedCategoryId }),
      });
      if (!attachRes.ok) {
        console.warn("[bulk] category attach failed for", zidId, attachRes.status, attachRes.text.slice(0, 120));
        categoryLinked = false;
      }
    }

    let imageAttached = false;
    if (zidId && p.imageUrl) {
      const imgRes = await zidFetch(session, `/v1/products/${zidId}/images/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: p.imageUrl }),
      });
      imageAttached = imgRes.ok;
      if (!imgRes.ok) {
        console.warn("[bulk] image attach failed for", zidId, imgRes.status, imgRes.text.slice(0, 120));
      }
    }

    created.push({ zidId, name: nameEn, categoryLinked, imageAttached });
  }

  const linkedCount = created.filter((c) => c.categoryLinked).length;
  const categoryRequested = parsed.data.products.filter((p) => p.categoryName || p.categoryId).length;

  return NextResponse.json({
    created: created.length,
    failed: failed.length,
    total: parsed.data.products.length,
    categoriesLinked: linkedCount,
    categoriesRequested: categoryRequested,
    unmatchedCategories: Array.from(unmatchedCategories),
    failures: failed,
    availableCategories: Array.from(categoryIndex.keys()).slice(0, 30),
  });
}

function extractCreatedId(data: Record<string, unknown> | null): string {
  if (!data) return "";
  const candidates: unknown[] = [
    data.id,
    (data.product as Record<string, unknown> | undefined)?.id,
    (data.data as Record<string, unknown> | undefined)?.id,
    ((data.data as Record<string, unknown> | undefined)?.product as Record<string, unknown> | undefined)?.id,
    (data.payload as Record<string, unknown> | undefined)?.id,
  ];
  for (const c of candidates) {
    if (c !== undefined && c !== null) return String(c);
  }
  return "";
}

/**
 * Match category names tolerantly:
 *  - lowercased
 *  - Arabic diacritics stripped (fatḥa/kasra/ḍamma)
 *  - alef variants normalised (أ إ آ → ا)
 *  - teh marbuta → heh
 *  - yeh variants normalised
 *  - internal whitespace collapsed
 */
function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[ً-ْ]/g, "")       // diacritics
    .replace(/[آأإ]/g, "ا") // alefs -> bare alef
    .replace(/ة/g, "ه")           // ة -> ه
    .replace(/[يى]/g, "ي")   // ي/ى -> ي
    .replace(/\s+/g, " ")
    .trim();
}
