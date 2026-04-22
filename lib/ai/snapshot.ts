import { getZidSession, zidFetch } from "@/lib/zid/client";

type CategoryRow = { id?: string; name?: { ar?: string; en?: string } | string; products_count?: number };
type ProductRow = { id?: string; uuid?: string; name?: { ar?: string; en?: string } | string; name_ar?: string; name_en?: string; price?: number; status?: string };

export async function buildStoreSnapshot(userId: string): Promise<string> {
  const session = await getZidSession(userId);
  if (!session) return "[STORE] Not connected to Zid yet.";

  const [cats, prods] = await Promise.allSettled([
    zidFetch(session, `/v1/managers/store/categories/`),
    zidFetch(session, `/v1/products/?page=1&per_page=50`),
  ]);

  const categoryLines = parseCategories(cats);
  const { productLines, count } = parseProducts(prods);

  return [
    `[STORE] ${session.storeName ?? "Zid store"} (${session.storeId})`,
    `CATEGORIES (${categoryLines.length}):`,
    categoryLines.length ? categoryLines.join("\n") : "  (none)",
    `PRODUCTS (${count}):`,
    productLines.length ? productLines.join("\n") : "  (none)",
    "Use IDs above for edit/delete. Never invent IDs.",
  ].join("\n");
}

function parseCategories(settled: PromiseSettledResult<Awaited<ReturnType<typeof zidFetch>>>): string[] {
  if (settled.status !== "fulfilled" || !settled.value.ok) return [];
  const data = settled.value.json as { categories?: CategoryRow[]; data?: { categories?: CategoryRow[] } } | null;
  const raw = data?.categories ?? data?.data?.categories ?? [];
  return raw.map((c) => {
    const name = c.name;
    const ar = typeof name === "object" ? name?.ar ?? "" : String(name ?? "");
    const en = typeof name === "object" ? name?.en ?? ar : ar;
    return `  - ID:${c.id} | AR: ${ar} | EN: ${en} | products: ${c.products_count ?? 0}`;
  });
}

function parseProducts(
  settled: PromiseSettledResult<Awaited<ReturnType<typeof zidFetch>>>
): { productLines: string[]; count: number } {
  if (settled.status !== "fulfilled" || !settled.value.ok) return { productLines: [], count: 0 };
  const data = settled.value.json as { products?: ProductRow[]; data?: { products?: ProductRow[] }; total?: number } | null;
  const raw = data?.products ?? data?.data?.products ?? [];
  const shown = raw.slice(0, 30);
  const lines = shown.map((p) => {
    const name = p.name;
    const ar = typeof name === "object" && name ? name.ar ?? "" : String(p.name_ar ?? p.name ?? "");
    const en = typeof name === "object" && name ? name.en ?? ar : String(p.name_en ?? ar);
    return `  - ID:${p.id ?? p.uuid} | AR: ${ar} | EN: ${en} | price: ${p.price ?? 0} | status: ${p.status ?? "?"}`;
  });
  if (raw.length > 30) lines.push(`  …and ${raw.length - 30} more`);
  return { productLines: lines, count: data?.total ?? raw.length };
}
