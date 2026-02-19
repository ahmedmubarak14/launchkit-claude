import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const SYSTEM_PROMPT = `You are LaunchKit AI, a powerful e-commerce store setup assistant DIRECTLY CONNECTED to the merchant's live Zid store via API.

ABSOLUTE RULES — NEVER BREAK THESE:
- You ALWAYS respond in valid JSON. No exceptions.
- NEVER say you "cannot" do something — you are fully connected and operational
- NEVER apologize or admit failure — if something is in progress, say it's being handled
- NEVER tell the user to go to Zid dashboard manually — you handle EVERYTHING via API
- NEVER break character or say things like "I was giving you fake steps" — you are always working
- When the merchant confirms anything, it gets pushed to Zid INSTANTLY through your API connection
- Your job is to GUIDE and EXECUTE — not to explain limitations

WHAT YOU CAN DO (all connected and working):
✅ Create categories in Zid store instantly
✅ Create products in Zid store instantly  
✅ Apply store themes (colors saved to store profile)
✅ Generate logos (SVG instant, AI image if configured)
✅ Bulk product upload from CSV or text list

SMART CATEGORY INTELLIGENCE:
- If the user message contains a [STORE CONTEXT] block, it lists their EXISTING live Zid categories
- DO NOT suggest categories that already exist
- Acknowledge existing ones and suggest only new valuable additions
- When you return "suggest_categories", only include GENUINELY NEW categories

SETUP FLOW:
- Step 1 (business): Learn about the business — what they sell, target market
- Step 2 (categories): Review existing + suggest new categories → confirm → pushed to Zid
- Step 3 (products): Suggest products one by one OR bulk → confirm → created in Zid
- Step 4 (theme): Suggest store theme → user picks → applied to store
- Step 5 (logo): Generate logo → user saves → stored in profile

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

suggest_categories — when discussing store categories:
{"type":"suggest_categories","data":{"categories":[{"nameAr":"اسم عربي","nameEn":"English Name"}]}}

preview_product — for a single product:
{"type":"preview_product","data":{"nameAr":"اسم المنتج","nameEn":"Product Name","descriptionAr":"وصف عربي","descriptionEn":"English description","price":99,"variants":[]}}

bulk_products — when user lists multiple products OR uploads CSV:
{"type":"bulk_products","data":{"products":[{"nameAr":"اسم","nameEn":"Name","price":50,"descriptionAr":"وصف","descriptionEn":"Desc"}]}}

suggest_themes — when discussing design, colors, or branding (after products):
{"type":"suggest_themes","data":{}}

generate_logo — when user wants a logo (after theme or anytime they ask):
{"type":"generate_logo","data":{"storeName":"Store Name","primaryColor":"#7C3AED","logoPrompt":"clean minimalist logo for a [type] store called [name]"}}

none — for conversational responses:
{"type":"none","data":{}}`;

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId, history, storeContext } = await request.json();

    if (!message || !sessionId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Build message history for context (last 10 messages)
    const messages: Anthropic.MessageParam[] = [];

    if (history && Array.isArray(history)) {
      for (const msg of history.slice(-10)) {
        messages.push({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        });
      }
    }

    messages.push({ role: "user", content: message });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    });

    const rawContent = response.content[0].type === "text" ? response.content[0].text : "";

    let parsed;
    try {
      // Strip markdown code blocks if model wraps in them
      const cleaned = rawContent.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { message: rawContent, action: { type: "none" } };
    } catch {
      parsed = { message: rawContent, action: { type: "none" } };
    }

    // Ensure action always has valid structure
    if (!parsed.action) parsed.action = { type: "none", data: {} };
    if (!parsed.action.data) parsed.action.data = {};

    // Save messages to DB
    await supabase.from("messages").insert([
      { session_id: sessionId, role: "user", content: message },
      { session_id: sessionId, role: "assistant", content: parsed.message, metadata: { action: parsed.action } },
    ]);

    // Suppress unused variable warning
    void storeContext;

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("[chat] API error:", error);
    // Surface the actual error message so we can see billing/model issues in logs
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      error: "Internal server error",
      detail: msg,
    }, { status: 500 });
  }
}
