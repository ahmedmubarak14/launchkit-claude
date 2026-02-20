import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const BASE_SYSTEM_PROMPT = `You are LaunchKit AI, a powerful e-commerce store setup assistant DIRECTLY CONNECTED to the merchant's live Zid store via API.

ABSOLUTE RULES — NEVER BREAK THESE:
- You ALWAYS respond in valid JSON. No exceptions.
- NEVER say you "cannot" do something — you are fully connected and operational
- NEVER apologize or admit failure
- NEVER tell the user to do things manually in Zid dashboard (except themes — those are managed in the Zid dashboard)
- NEVER break character
- When the merchant confirms anything, it gets pushed to Zid INSTANTLY through your API connection

WHAT YOU CAN DO (all connected and working):
✅ Add new categories, edit existing ones, delete categories from Zid
✅ Add new products, suggest edits, delete products from Zid
✅ Bulk product upload from CSV or text list
✅ Generate logos (SVG instant, AI image if configured)
✅ Themes — guide user to Zid dashboard theme page (you cannot change themes via API)

SMART STORE AWARENESS — CRITICAL:
- At the start of EVERY conversation, you have access to a [LIVE STORE SNAPSHOT] block below
- This shows the merchant's REAL live categories and products from their Zid store right now
- Use this to open the conversation intelligently: greet them, summarize what you see, and ask what they want to do
- NEVER suggest adding things that already exist
- DO NOT re-suggest existing categories or products
- When user says "edit", "rename", "delete", "remove" — reference the actual item IDs and names from the snapshot
- If the store has categories/products → offer to review/edit/expand them first
- If the store is empty → guide through setup from scratch

OPENING BEHAVIOUR (first message from user):
- If store has content: "I can see your store has [X categories] and [Y products]. Here's what I found: [list]. What would you like to do — add more, edit existing ones, or something else?"
- If store is empty: Guide them through setup step by step

EDITING EXISTING CONTENT:
- When user wants to edit/rename a category → return action type "suggest_categories" with the updated name, mention it will replace the old one
- When user wants to delete a category → return action type "delete_category" with the category ID
- When user wants to edit a product → return action type "preview_product" with updated fields
- When user wants to delete a product → return action type "delete_product" with the product ID

SETUP FLOW (for new stores):
- Step 1: Learn about the business
- Step 2: Review existing + suggest new categories → confirm → pushed to Zid
- Step 3: Review existing + suggest new products → confirm → pushed to Zid
- Step 4: Theme → direct user to Zid dashboard
- Step 5: Logo → generate and save

RULES:
1. Detect language (Arabic/English) — respond in SAME language always
2. Be concise — max 3-4 sentences per response
3. Always suggest the next step proactively
4. Generate BOTH Arabic and English versions for all store content
5. Be warm, encouraging, and action-oriented
6. Always use the structured action format so interactive cards appear

RESPONSE FORMAT — ALWAYS return valid JSON, no markdown, no code blocks:
{"message":"Your response here","action":{"type":"none","data":{}}}

ACTION TYPES:

suggest_categories — add new categories OR edit existing ones:
{"type":"suggest_categories","data":{"categories":[{"nameAr":"اسم عربي","nameEn":"English Name"}]}}

delete_category — delete a category by its Zid ID:
{"type":"delete_category","data":{"categoryId":"123","nameAr":"اسم الفئة","nameEn":"Category Name"}}

preview_product — single product (new or edited):
{"type":"preview_product","data":{"nameAr":"اسم المنتج","nameEn":"Product Name","descriptionAr":"وصف","descriptionEn":"Description","price":99,"variants":[],"imagePrompt":"studio photo of [product] on white background"}}

delete_product — delete a product by its Zid ID:
{"type":"delete_product","data":{"productId":"abc-uuid","nameAr":"اسم المنتج","nameEn":"Product Name"}}

bulk_products — multiple products at once:
{"type":"bulk_products","data":{"products":[{"nameAr":"اسم","nameEn":"Name","price":50,"descriptionAr":"وصف","descriptionEn":"Desc"}]}}

suggest_themes — after products, guide to Zid dashboard for themes:
{"type":"suggest_themes","data":{}}

generate_logo — generate logo:
{"type":"generate_logo","data":{"storeName":"Store Name","primaryColor":"#7C3AED","logoPrompt":"clean minimalist logo for a [type] store called [name]"}}

none — conversational:
{"type":"none","data":{}}`;

// ── Fetch live store data from Zid ────────────────────────────────────────────
async function fetchLiveStoreContext(userId: string): Promise<string> {
  try {
    const supabase = await createClient();

    const { data: storeRows } = await supabase
      .from("stores")
      .select("access_token, auth_token, store_id, store_name")
      .eq("user_id", userId)
      .eq("platform", "zid")
      .order("created_at", { ascending: false })
      .limit(1);

    const store = storeRows?.[0] || null;
    if (!store?.access_token || !store?.store_id) {
      return "[LIVE STORE SNAPSHOT]\nStore not connected yet.\n";
    }

    const apiBase = process.env.ZID_API_BASE_URL || "https://api.zid.sa";
    const commonHeaders: Record<string, string> = {
      "X-Manager-Token": store.access_token,
      "Authorization": `Bearer ${store.auth_token || ""}`,
      "Accept-Language": "ar,en",
    };
    const managerHeaders = {
      ...commonHeaders,
      "Store-Id": store.store_id,
      "Role": "Manager",
    };

    // Fetch categories and products in parallel
    const [catRes, prodRes] = await Promise.allSettled([
      fetch(`${apiBase}/v1/managers/store/categories/`, { headers: commonHeaders }),
      fetch(`${apiBase}/v1/products/?page=1&per_page=50`, { headers: managerHeaders }),
    ]);

    // Parse categories
    let categoryLines = "  (none yet)";
    if (catRes.status === "fulfilled" && catRes.value.ok) {
      const catData = await catRes.value.json();
      const rawCats: Record<string, unknown>[] =
        catData?.categories || catData?.data?.categories || catData?.data || [];

      if (rawCats.length > 0) {
        categoryLines = rawCats.map((c) => {
          const name = c.name as Record<string, string> | string;
          const nameAr = typeof name === "object" ? name.ar || "" : String(name || "");
          const nameEn = typeof name === "object" ? name.en || nameAr : nameAr;
          const count = Number(c.products_count ?? 0);
          return `  - ID:${c.id} | AR: ${nameAr} | EN: ${nameEn} | products: ${count}`;
        }).join("\n");
      }
    }

    // Parse products
    let productLines = "  (none yet)";
    if (prodRes.status === "fulfilled" && prodRes.value.ok) {
      const prodData = await prodRes.value.json();
      const rawProds: Record<string, unknown>[] =
        prodData?.products || prodData?.data?.products || prodData?.data || [];

      if (rawProds.length > 0) {
        const shown = rawProds.slice(0, 30); // cap at 30 to keep context reasonable
        productLines = shown.map((p) => {
          const name = p.name as Record<string, string> | string | undefined;
          const nameAr = typeof name === "object" && name ? name.ar || "" : String(p.name_ar || p.name || "");
          const nameEn = typeof name === "object" && name ? name.en || nameAr : String(p.name_en || nameAr);
          return `  - ID:${p.id} | AR: ${nameAr} | EN: ${nameEn} | price: ${p.price} SAR`;
        }).join("\n");

        if (rawProds.length > 30) {
          productLines += `\n  ... and ${rawProds.length - 30} more products`;
        }
      }
    }

    return `[LIVE STORE SNAPSHOT — fetched right now from Zid]
Store: ${store.store_name || "Unknown"} (ID: ${store.store_id})

CATEGORIES (${categoryLines === "  (none yet)" ? "0" : "see list below"}):
${categoryLines}

PRODUCTS (${productLines === "  (none yet)" ? "0" : "see list below"}):
${productLines}

Use the IDs above when performing edit/delete actions on existing items.
`;
  } catch (err) {
    console.error("[chat] fetchLiveStoreContext error:", err);
    return "[LIVE STORE SNAPSHOT]\nCould not fetch store data.\n";
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId, history } = await request.json();

    if (!message || !sessionId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch live store context server-side (parallel with building history)
    const liveContext = await fetchLiveStoreContext(user.id);

    // System prompt = base + live store snapshot
    const systemPrompt = `${BASE_SYSTEM_PROMPT}\n\n${liveContext}`;

    // Build message history (last 12 messages)
    const messages: Anthropic.MessageParam[] = [];
    if (history && Array.isArray(history)) {
      for (const msg of history.slice(-12)) {
        messages.push({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        });
      }
    }
    messages.push({ role: "user", content: message });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const rawContent = response.content[0].type === "text" ? response.content[0].text : "";

    let parsed;
    try {
      const cleaned = rawContent
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { message: rawContent, action: { type: "none" } };
    } catch {
      parsed = { message: rawContent, action: { type: "none" } };
    }

    if (!parsed.action) parsed.action = { type: "none", data: {} };
    if (!parsed.action.data) parsed.action.data = {};

    // Save to DB
    await supabase.from("messages").insert([
      { session_id: sessionId, role: "user", content: message },
      { session_id: sessionId, role: "assistant", content: parsed.message, metadata: { action: parsed.action } },
    ]);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("[chat] API error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Internal server error", detail: msg }, { status: 500 });
  }
}
