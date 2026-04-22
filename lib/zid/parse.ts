/**
 * Zid response shapes drift across endpoint versions (products, categories,
 * managers namespace, partner namespace). These helpers walk every wrapper
 * we've seen, then fall back to a recursive scan that finds the first
 * array of objects with an `id` field — the one thing all Zid list
 * responses share.
 */

const KNOWN_CONTAINERS = ["data", "payload", "result", "results", "response", "body"] as const;

/**
 * Given a Zid response body and a likely key (e.g. "products", "categories"),
 * return the array of items, searching through every known wrapper shape
 * and falling back to any array-of-objects-with-id anywhere in the tree.
 */
export function extractList(data: Record<string, unknown> | null, key: string): Record<string, unknown>[] {
  if (!data) return [];

  // 1. Direct keys at each known nesting level
  const visited = new Set<unknown>();
  const queue: Record<string, unknown>[] = [data];
  while (queue.length) {
    const node = queue.shift()!;
    if (visited.has(node)) continue;
    visited.add(node);

    const direct = node[key];
    if (Array.isArray(direct)) return direct as Record<string, unknown>[];

    // Plural/singular variants: "product" vs "products"
    const pluralDrop = key.endsWith("s") ? key.slice(0, -1) : `${key}s`;
    const alt = node[pluralDrop];
    if (Array.isArray(alt) && alt.length && typeof alt[0] === "object") {
      return alt as Record<string, unknown>[];
    }

    for (const wrapper of KNOWN_CONTAINERS) {
      const child = node[wrapper];
      if (child && typeof child === "object" && !Array.isArray(child)) {
        queue.push(child as Record<string, unknown>);
      }
    }
  }

  // 2. Last-resort recursive scan: first array of {id: ...} objects anywhere
  const fallback = findArrayOfEntities(data);
  if (fallback) return fallback;

  return [];
}

function findArrayOfEntities(node: unknown, depth = 0): Record<string, unknown>[] | null {
  if (depth > 6 || !node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    if (node.length === 0) return null;
    const first = node[0];
    if (first && typeof first === "object" && "id" in (first as Record<string, unknown>)) {
      return node as Record<string, unknown>[];
    }
    return null;
  }
  for (const value of Object.values(node as Record<string, unknown>)) {
    const found = findArrayOfEntities(value, depth + 1);
    if (found) return found;
  }
  return null;
}

export function extractTotal(data: Record<string, unknown> | null, fallback: number): number {
  if (!data) return fallback;

  const visited = new Set<unknown>();
  const queue: Record<string, unknown>[] = [data];
  while (queue.length) {
    const node = queue.shift()!;
    if (visited.has(node)) continue;
    visited.add(node);

    for (const k of ["total", "total_count", "total_results", "count", "totalCount"]) {
      const v = node[k];
      if (typeof v === "number" && Number.isFinite(v)) return v;
    }

    for (const wrapper of [...KNOWN_CONTAINERS, "meta", "pagination"]) {
      const child = node[wrapper];
      if (child && typeof child === "object" && !Array.isArray(child)) {
        queue.push(child as Record<string, unknown>);
      }
    }
  }

  return fallback;
}
