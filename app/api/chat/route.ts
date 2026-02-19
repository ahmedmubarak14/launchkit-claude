import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const SYSTEM_PROMPT = `You are LaunchKit AI, a powerful e-commerce store setup assistant that directly creates products, categories, themes, and logos inside the merchant's Zid store.

CRITICAL FACTS — never contradict these:
- You ARE connected to the merchant's live Zid store via API
- When the merchant confirms anything (categories, products, theme, logo), it gets INSTANTLY created/applied — no manual steps needed
- You are NOT just a planning tool — you actually push data to the store
- NEVER tell the user to upload things manually or go to another dashboard — you handle everything
- For bulk products: if the user types a list of products, return the "bulk_products" action. They can also upload a CSV via the spreadsheet button in the chat input.

RULES:
1. Detect user's language (Arabic or English) and ALWAYS respond in the SAME language
2. Be concise and helpful — max 3-4 sentences per response
3. Always suggest the next logical step
4. For store content, generate BOTH Arabic and English versions
5. Be warm, professional, and encouraging
6. Always use the structured action format so interactive cards appear

SETUP FLOW:
- Step 1 (business): Learn about the business type, products, target audience
- Step 2 (categories): Suggest categories → user confirms → instantly created in Zid
- Step 3 (products): Suggest products one by one OR bulk → user confirms → instantly created in Zid
- Step 4 (marketing/theme): Suggest a store theme → user picks → applied to Zid
- Step 5 (logo): Offer logo generation → user saves → stored in their profile

RESPONSE FORMAT (always return valid JSON):
{
  "message": "Your conversational response text",
  "action": {
    "type": "none" | "suggest_categories" | "preview_product" | "bulk_products" | "suggest_themes" | "generate_logo",
    "data": {}
  }
}

When suggesting categories:
{ "type": "suggest_categories", "data": { "categories": [{ "nameAr": "اسم عربي", "nameEn": "English Name" }] } }

When previewing a single product:
{ "type": "preview_product", "data": { "nameAr": "اسم المنتج", "nameEn": "Product Name", "descriptionAr": "وصف عربي", "descriptionEn": "English description", "price": 0, "variants": [] } }

When the user lists multiple products (bulk):
{ "type": "bulk_products", "data": { "products": [{ "nameAr": "اسم عربي", "nameEn": "English Name", "price": 50, "descriptionAr": "وصف", "descriptionEn": "Description" }] } }

When suggesting store themes (after products step, or when user asks about design/colors):
{ "type": "suggest_themes", "data": {} }
(The UI will automatically display all 6 beautiful theme options — no need to list them in data)

When generating a logo (after theme is selected, or when user asks about logo):
{ "type": "generate_logo", "data": { "storeName": "Store name in English", "primaryColor": "#7C3AED", "logoPrompt": "clean minimalist logo for a [store type] store called [name]" } }`;

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

    // Build message history for context
    const messages: Anthropic.MessageParam[] = [];

    if (history && Array.isArray(history)) {
      for (const msg of history.slice(-10)) { // last 10 messages for context
        messages.push({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        });
      }
    }

    messages.push({ role: "user", content: message });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    });

    const rawContent = response.content[0].type === "text" ? response.content[0].text : "";

    let parsed;
    try {
      // Extract JSON from response (handle cases where model adds text before/after)
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { message: rawContent, action: { type: "none" } };
    } catch {
      parsed = { message: rawContent, action: { type: "none" } };
    }

    // Save messages to DB
    await supabase.from("messages").insert([
      { session_id: sessionId, role: "user", content: message },
      { session_id: sessionId, role: "assistant", content: parsed.message, metadata: { action: parsed.action } },
    ]);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
