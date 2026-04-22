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
  | { kind: "landing_page_applied"; scriptId: string; storeUrl?: string }
  | { kind: "logo_preview"; logoUrl: string; storeName: string }
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

const EditProductInput = z.object({
  productId: z.string().min(1),
  nameAr: z.string().min(1).optional(),
  nameEn: z.string().min(1).optional(),
  descriptionAr: z.string().optional(),
  descriptionEn: z.string().optional(),
  price: z.number().nonnegative().optional(),
  sku: z.string().optional(),
  isDraft: z.boolean().optional(),
  quantity: z.number().int().nonnegative().optional(),
});

const GenerateLandingPageInput = z.object({
  storeName: z.string().min(1),
  storeNameAr: z.string().min(1),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#0D0D0D"),
  hero: z.object({
    headline: z.string(),
    headlineAr: z.string(),
    subheadline: z.string(),
    subheadlineAr: z.string(),
    cta: z.string(),
    ctaAr: z.string(),
  }),
  features: z
    .array(
      z.object({
        icon: z.string(),
        title: z.string(),
        titleAr: z.string(),
        description: z.string(),
        descriptionAr: z.string(),
      })
    )
    .min(1)
    .max(6),
  promo: z.object({
    headline: z.string(),
    headlineAr: z.string(),
    discount: z.string(),
    code: z.string(),
    cta: z.string(),
    ctaAr: z.string(),
  }),
  testimonials: z
    .array(
      z.object({
        quote: z.string(),
        quoteAr: z.string(),
        author: z.string(),
        rating: z.number().min(1).max(5),
      })
    )
    .max(5),
  categories: z.array(z.object({ name: z.string(), nameAr: z.string() })).optional(),
  seoTitle: z.string(),
  seoDescription: z.string(),
});

const GenerateLogoInput = z.object({
  storeName: z.string().min(1),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#0D0D0D"),
  style: z.enum(["wordmark", "monogram", "icon"]).default("wordmark"),
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

const handleEditProduct: ToolHandler<z.infer<typeof EditProductInput>> = async (input, ctx) => {
  const session = await requireSession(ctx);

  const body: Record<string, unknown> = {};
  if (input.nameAr !== undefined || input.nameEn !== undefined) {
    body.name = { ar: input.nameAr ?? "", en: input.nameEn ?? "" };
  }
  if (input.descriptionAr !== undefined || input.descriptionEn !== undefined) {
    body.description = { ar: input.descriptionAr ?? "", en: input.descriptionEn ?? "" };
  }
  if (input.price !== undefined) body.price = input.price;
  if (input.sku !== undefined) body.sku = input.sku;
  if (input.isDraft !== undefined) body.is_draft = input.isDraft;
  if (input.quantity !== undefined) body.quantity = input.quantity;

  if (Object.keys(body).length === 0) {
    return { ok: false, summary: "No fields changed — nothing to update." };
  }

  const res = await zidFetch(session, `/v1/products/${input.productId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.ok) {
    const changed = Object.keys(body).join(", ");
    return { ok: true, summary: `Updated ${input.productId} (${changed}).` };
  }
  return { ok: false, summary: `Zid refused update for ${input.productId} (HTTP ${res.status}).` };
};

const handleGenerateLandingPage: ToolHandler<z.infer<typeof GenerateLandingPageInput>> = async (layout, ctx) => {
  await requireSession(ctx);
  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const res = await fetch(`${origin}/api/store/landing-page/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: await getAuthCookie() },
    body: JSON.stringify({ layout }),
  });
  const data = (await res.json().catch(() => ({}))) as { success?: boolean; scriptId?: string; storeUrl?: string; error?: string };
  if (!res.ok || !data.success) {
    return { ok: false, summary: data.error || `Landing page apply failed (HTTP ${res.status}).` };
  }
  return {
    ok: true,
    summary: `Landing page is live on the storefront (script ${data.scriptId}).`,
    ui: { kind: "landing_page_applied", scriptId: String(data.scriptId ?? ""), storeUrl: data.storeUrl },
  };
};

const handleGenerateLogo: ToolHandler<z.infer<typeof GenerateLogoInput>> = async (input, ctx) => {
  await requireSession(ctx);
  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const res = await fetch(`${origin}/api/store/logo`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: await getAuthCookie() },
    body: JSON.stringify({
      type: "generate",
      sessionId: `tool-${ctx.userId}`,
      storeName: input.storeName,
      primaryColor: input.primaryColor,
      style: input.style,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { logoUrl?: string; error?: string };
  if (!res.ok || !data.logoUrl) {
    return { ok: false, summary: data.error || `Logo generation failed (HTTP ${res.status}).` };
  }
  return {
    ok: true,
    summary: `Logo generated for ${input.storeName}. Awaiting save confirmation.`,
    ui: { kind: "logo_preview", logoUrl: data.logoUrl, storeName: input.storeName },
  };
};

async function getAuthCookie(): Promise<string> {
  const { cookies } = await import("next/headers");
  const store = await cookies();
  return store.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
}

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
    "edit_product",
    "Patch fields on an existing product by Zid ID. Pass only the fields that change. Bilingual name/description must be sent together if either side is present.",
    EditProductInput,
    {
      type: "object",
      properties: {
        productId: { type: "string" },
        nameAr: { type: "string" },
        nameEn: { type: "string" },
        descriptionAr: { type: "string" },
        descriptionEn: { type: "string" },
        price: { type: "number" },
        sku: { type: "string" },
        isDraft: { type: "boolean" },
        quantity: { type: "integer" },
      },
      required: ["productId"],
    },
    handleEditProduct
  ),
  defineTool(
    "generate_landing_page",
    "Generate and immediately publish a landing page to the merchant's live Zid storefront via App Scripts. Provide hero + features + promo + testimonials in both Arabic and English. Use the merchant's existing categories if available.",
    GenerateLandingPageInput,
    {
      type: "object",
      properties: {
        storeName: { type: "string" },
        storeNameAr: { type: "string" },
        primaryColor: { type: "string", description: "Hex color like #0D0D0D" },
        hero: {
          type: "object",
          properties: {
            headline: { type: "string" },
            headlineAr: { type: "string" },
            subheadline: { type: "string" },
            subheadlineAr: { type: "string" },
            cta: { type: "string" },
            ctaAr: { type: "string" },
          },
          required: ["headline", "headlineAr", "subheadline", "subheadlineAr", "cta", "ctaAr"],
        },
        features: {
          type: "array",
          minItems: 1,
          maxItems: 6,
          items: {
            type: "object",
            properties: {
              icon: { type: "string", description: "one of: truck, shield, gift, star, heart, box" },
              title: { type: "string" },
              titleAr: { type: "string" },
              description: { type: "string" },
              descriptionAr: { type: "string" },
            },
            required: ["icon", "title", "titleAr", "description", "descriptionAr"],
          },
        },
        promo: {
          type: "object",
          properties: {
            headline: { type: "string" },
            headlineAr: { type: "string" },
            discount: { type: "string" },
            code: { type: "string" },
            cta: { type: "string" },
            ctaAr: { type: "string" },
          },
          required: ["headline", "headlineAr", "discount", "code", "cta", "ctaAr"],
        },
        testimonials: {
          type: "array",
          maxItems: 5,
          items: {
            type: "object",
            properties: {
              quote: { type: "string" },
              quoteAr: { type: "string" },
              author: { type: "string" },
              rating: { type: "number", minimum: 1, maximum: 5 },
            },
            required: ["quote", "quoteAr", "author", "rating"],
          },
        },
        categories: {
          type: "array",
          items: {
            type: "object",
            properties: { name: { type: "string" }, nameAr: { type: "string" } },
            required: ["name", "nameAr"],
          },
        },
        seoTitle: { type: "string" },
        seoDescription: { type: "string" },
      },
      required: [
        "storeName",
        "storeNameAr",
        "hero",
        "features",
        "promo",
        "testimonials",
        "seoTitle",
        "seoDescription",
      ],
    },
    handleGenerateLandingPage
  ),
  defineTool(
    "generate_logo",
    "Generate a clean SVG logo for the merchant. Returns a preview URL that the client renders.",
    GenerateLogoInput,
    {
      type: "object",
      properties: {
        storeName: { type: "string" },
        primaryColor: { type: "string", description: "Hex color like #0D0D0D" },
        style: { type: "string", enum: ["wordmark", "monogram", "icon"] },
      },
      required: ["storeName"],
    },
    handleGenerateLogo
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
