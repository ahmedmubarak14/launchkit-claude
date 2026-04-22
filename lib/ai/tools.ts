import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { getZidSession, zidFetch, type ZidSession } from "@/lib/zid/client";

export type ToolContext = {
  userId: string;
  locale: "ar" | "en";
};

export type ToolHandler<I> = (input: I, ctx: ToolContext) => Promise<ToolResult>;

export type ToolResult =
  | { ok: true; summary: string; ui?: UiPayload }
  | { ok: false; summary: string };

export type UiPayload =
  | { kind: "preview_bulk_products"; products: BulkProductPreview[] }
  | { kind: "preview_product"; product: SingleProductPreview }
  | { kind: "preview_landing_page"; layout: Record<string, unknown> }
  | { kind: "install_theme_instructions"; downloadUrl: string; automated: boolean };

export type BulkProductPreview = {
  nameAr: string;
  nameEn: string;
  price: number;
  descriptionAr?: string;
  descriptionEn?: string;
  imageUrl?: string;
  categoryName?: string;
};

export type SingleProductPreview = BulkProductPreview & {
  imagePrompt?: string;
};

// ── Tool schemas ──────────────────────────────────────────────────────────────

const DeleteProductInput = z.object({
  productId: z.string().min(1),
});

const DeleteProductsBulkInput = z.object({
  productIds: z.array(z.string().min(1)).min(1).max(50),
});

const CreateCategoriesInput = z.object({
  categories: z
    .array(z.object({ nameAr: z.string().min(1), nameEn: z.string().min(1) }))
    .min(1)
    .max(30),
});

const DeleteCategoryInput = z.object({
  categoryId: z.string().min(1),
});

const PreviewBulkProductsInput = z.object({
  products: z
    .array(
      z.object({
        nameAr: z.string().min(1),
        nameEn: z.string().min(1),
        price: z.number().nonnegative(),
        descriptionAr: z.string().optional(),
        descriptionEn: z.string().optional(),
        imageUrl: z.string().url().optional(),
        categoryName: z.string().optional(),
      })
    )
    .min(1)
    .max(100),
});

const PreviewProductInput = z.object({
  product: z.object({
    nameAr: z.string().min(1),
    nameEn: z.string().min(1),
    price: z.number().nonnegative(),
    descriptionAr: z.string().optional(),
    descriptionEn: z.string().optional(),
    imagePrompt: z.string().optional(),
  }),
});

const InstallThemeInput = z.object({});

const RefreshSnapshotInput = z.object({});

const ClarifyInput = z.object({
  question: z.string().min(2),
  options: z.array(z.string()).max(5).optional(),
});

// ── Tool handlers ─────────────────────────────────────────────────────────────

async function requireSession(ctx: ToolContext): Promise<ZidSession> {
  const s = await getZidSession(ctx.userId);
  if (!s) throw new Error(ctx.locale === "ar" ? "المتجر غير مرتبط بـ زد." : "Zid store not connected.");
  return s;
}

const handleDeleteProduct: ToolHandler<z.infer<typeof DeleteProductInput>> = async ({ productId }, ctx) => {
  const session = await requireSession(ctx);
  const res = await zidFetch(session, `/v1/products/${productId}`, { method: "DELETE" });
  if (res.ok || res.status === 204) return { ok: true, summary: `Deleted product ${productId}.` };
  return { ok: false, summary: `Zid refused delete for ${productId} (HTTP ${res.status}).` };
};

const handleDeleteProductsBulk: ToolHandler<z.infer<typeof DeleteProductsBulkInput>> = async ({ productIds }, ctx) => {
  const session = await requireSession(ctx);
  const failed: string[] = [];
  for (const id of productIds) {
    const res = await zidFetch(session, `/v1/products/${id}`, { method: "DELETE" });
    if (!(res.ok || res.status === 204)) failed.push(id);
  }
  const okCount = productIds.length - failed.length;
  if (failed.length === 0) return { ok: true, summary: `Deleted all ${okCount} products.` };
  return {
    ok: okCount > 0,
    summary: `Deleted ${okCount}/${productIds.length}. Failed IDs: ${failed.join(", ")}`,
  };
};

const handleCreateCategories: ToolHandler<z.infer<typeof CreateCategoriesInput>> = async ({ categories }, ctx) => {
  const session = await requireSession(ctx);
  const results: string[] = [];
  for (const c of categories) {
    const res = await zidFetch(session, `/v1/managers/store/categories/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: { ar: c.nameAr, en: c.nameEn }, status: "active" }),
    });
    if (res.ok) {
      const data = res.json as { id?: string | number; category?: { id?: string | number } } | null;
      const id = data?.id ?? data?.category?.id ?? "(new)";
      results.push(`${c.nameEn}#${id}`);
    } else {
      results.push(`${c.nameEn}[HTTP ${res.status}]`);
    }
  }
  return { ok: true, summary: `Created categories: ${results.join(", ")}` };
};

const handleDeleteCategory: ToolHandler<z.infer<typeof DeleteCategoryInput>> = async ({ categoryId }, ctx) => {
  const session = await requireSession(ctx);
  const res = await zidFetch(session, `/v1/managers/store/categories/${categoryId}`, { method: "DELETE" });
  if (res.ok || res.status === 204) return { ok: true, summary: `Deleted category ${categoryId}.` };
  return { ok: false, summary: `Zid refused category delete (HTTP ${res.status}).` };
};

const handlePreviewBulkProducts: ToolHandler<z.infer<typeof PreviewBulkProductsInput>> = async ({ products }) => ({
  ok: true,
  summary: `Preview staged for ${products.length} products. Awaiting merchant confirm.`,
  ui: { kind: "preview_bulk_products", products },
});

const handlePreviewProduct: ToolHandler<z.infer<typeof PreviewProductInput>> = async ({ product }) => ({
  ok: true,
  summary: `Preview staged for ${product.nameEn}. Awaiting merchant confirm.`,
  ui: { kind: "preview_product", product },
});

const handleInstallTheme: ToolHandler<z.infer<typeof InstallThemeInput>> = async (_input, ctx) => {
  await requireSession(ctx);
  return {
    ok: true,
    summary: "Theme install instructions surfaced.",
    ui: {
      kind: "install_theme_instructions",
      downloadUrl: "/themes/launchkit-theme.zip",
      automated: false,
    },
  };
};

const handleRefreshSnapshot: ToolHandler<z.infer<typeof RefreshSnapshotInput>> = async () => ({
  ok: true,
  summary: "Snapshot will be refreshed on the next turn.",
});

const handleClarify: ToolHandler<z.infer<typeof ClarifyInput>> = async ({ question }) => ({
  ok: true,
  summary: `Asked merchant: ${question}`,
});

// ── Registry ──────────────────────────────────────────────────────────────────

type AnyTool = {
  name: string;
  description: string;
  schema: z.ZodType;
  anthropicSchema: Anthropic.Tool;
  handler: ToolHandler<unknown>;
};

function defineTool<S extends z.ZodType>(
  name: string,
  description: string,
  schema: S,
  anthropicSchema: Anthropic.Tool["input_schema"],
  handler: ToolHandler<z.infer<S>>
): AnyTool {
  return {
    name,
    description,
    schema,
    anthropicSchema: { name, description, input_schema: anthropicSchema },
    handler: handler as ToolHandler<unknown>,
  };
}

export const TOOLS: AnyTool[] = [
  defineTool(
    "delete_product",
    "Permanently delete a single product from the merchant's Zid store. Use only when the merchant explicitly asked to delete, and you have the exact product ID from the [STORE] snapshot.",
    DeleteProductInput,
    {
      type: "object",
      properties: { productId: { type: "string", description: "Zid product ID from the snapshot" } },
      required: ["productId"],
    },
    handleDeleteProduct
  ),
  defineTool(
    "delete_products_bulk",
    "Permanently delete multiple products in one shot. Use when the merchant says 'delete all drafts', 'remove the first 5', or selects many. Max 50 per call.",
    DeleteProductsBulkInput,
    {
      type: "object",
      properties: {
        productIds: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 50 },
      },
      required: ["productIds"],
    },
    handleDeleteProductsBulk
  ),
  defineTool(
    "create_categories",
    "Create one or more categories in the merchant's Zid store right now. Always provide both Arabic and English names.",
    CreateCategoriesInput,
    {
      type: "object",
      properties: {
        categories: {
          type: "array",
          minItems: 1,
          maxItems: 30,
          items: {
            type: "object",
            properties: {
              nameAr: { type: "string" },
              nameEn: { type: "string" },
            },
            required: ["nameAr", "nameEn"],
          },
        },
      },
      required: ["categories"],
    },
    handleCreateCategories
  ),
  defineTool(
    "delete_category",
    "Permanently delete a category by ID. Use IDs from the [STORE] snapshot only.",
    DeleteCategoryInput,
    {
      type: "object",
      properties: { categoryId: { type: "string" } },
      required: ["categoryId"],
    },
    handleDeleteCategory
  ),
  defineTool(
    "preview_bulk_products",
    "Show a preview card with multiple products for the merchant to confirm before anything ships to Zid. Used for CSV/XLSX imports or when generating many items from a conversation.",
    PreviewBulkProductsInput,
    {
      type: "object",
      properties: {
        products: {
          type: "array",
          minItems: 1,
          maxItems: 100,
          items: {
            type: "object",
            properties: {
              nameAr: { type: "string" },
              nameEn: { type: "string" },
              price: { type: "number" },
              descriptionAr: { type: "string" },
              descriptionEn: { type: "string" },
              imageUrl: { type: "string" },
              categoryName: { type: "string" },
            },
            required: ["nameAr", "nameEn", "price"],
          },
        },
      },
      required: ["products"],
    },
    handlePreviewBulkProducts
  ),
  defineTool(
    "preview_product",
    "Show a preview card with a single product for the merchant to confirm before it ships to Zid.",
    PreviewProductInput,
    {
      type: "object",
      properties: {
        product: {
          type: "object",
          properties: {
            nameAr: { type: "string" },
            nameEn: { type: "string" },
            price: { type: "number" },
            descriptionAr: { type: "string" },
            descriptionEn: { type: "string" },
            imagePrompt: { type: "string" },
          },
          required: ["nameAr", "nameEn", "price"],
        },
      },
      required: ["product"],
    },
    handlePreviewProduct
  ),
  defineTool(
    "install_theme",
    "Surface the LaunchKit theme install step to the merchant. Returns the ZIP download URL and guided-upload steps.",
    InstallThemeInput,
    { type: "object", properties: {}, required: [] },
    handleInstallTheme
  ),
  defineTool(
    "refresh_store_snapshot",
    "Force a refresh of the [STORE] snapshot. Use only after mutations where the stale snapshot could confuse the next decision.",
    RefreshSnapshotInput,
    { type: "object", properties: {}, required: [] },
    handleRefreshSnapshot
  ),
  defineTool(
    "ask_clarifying_question",
    "Ask the merchant a focused question when their request is ambiguous. Prefer this over guessing.",
    ClarifyInput,
    {
      type: "object",
      properties: {
        question: { type: "string" },
        options: { type: "array", items: { type: "string" }, maxItems: 5 },
      },
      required: ["question"],
    },
    handleClarify
  ),
];

export function toAnthropicTools(): Anthropic.Tool[] {
  return TOOLS.map((t) => t.anthropicSchema);
}

export function findTool(name: string): AnyTool | undefined {
  return TOOLS.find((t) => t.name === name);
}
