import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getZidSession, zidFetch } from "@/lib/zid/client";

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
  products: z.array(ProductInputSchema).min(1).max(100),
});

type CategoryRow = { id?: string | number; name?: { ar?: string; en?: string } | string };

/**
 * POST /api/store/products/bulk
 *
 * Bulk-create products on the merchant's Zid store. Used by the chat's
 * CSV/XLSX upload flow. Runs sequentially (Zid doesn't have a batch
 * endpoint); returns per-product results so the client can surface
 * partial failures.
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
  const catData = catRes.json as { categories?: CategoryRow[]; data?: { categories?: CategoryRow[] } } | null;
  const rawCats: CategoryRow[] = catData?.categories ?? catData?.data?.categories ?? [];
  const categoryIndex = new Map<string, string>();
  for (const c of rawCats) {
    if (!c.id) continue;
    const name = c.name;
    const ar = typeof name === "object" ? name?.ar ?? "" : String(name ?? "");
    const en = typeof name === "object" ? name?.en ?? "" : "";
    if (ar) categoryIndex.set(ar.toLowerCase(), String(c.id));
    if (en) categoryIndex.set(en.toLowerCase(), String(c.id));
  }

  const created: { zidId: string; name: string }[] = [];
  const failed: { name: string; reason: string }[] = [];

  for (const p of parsed.data.products) {
    // Fall back each way: if only one language is provided, mirror it.
    const nameAr = p.nameAr || p.nameEn || "";
    const nameEn = p.nameEn || p.nameAr || "";
    const resolvedCategoryId = p.categoryId || (p.categoryName ? categoryIndex.get(p.categoryName.toLowerCase()) : undefined);

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
    };

    const res = await zidFetch(session, `/v1/products/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      failed.push({ name: nameEn, reason: `Zid HTTP ${res.status}: ${res.text.slice(0, 120)}` });
      continue;
    }

    const created_json = res.json as { id?: string | number; product?: { id?: string | number } } | null;
    const zidId = String(created_json?.id ?? created_json?.product?.id ?? "");
    created.push({ zidId, name: nameEn });

    // Attach category if resolved
    if (zidId && resolvedCategoryId) {
      await zidFetch(session, `/v1/products/${zidId}/categories/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: resolvedCategoryId }),
      });
    }

    // Attach image by URL if provided
    if (zidId && p.imageUrl) {
      await zidFetch(session, `/v1/products/${zidId}/images/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: p.imageUrl }),
      });
    }
  }

  return NextResponse.json({
    created: created.length,
    failed: failed.length,
    total: parsed.data.products.length,
    failures: failed,
  });
}
