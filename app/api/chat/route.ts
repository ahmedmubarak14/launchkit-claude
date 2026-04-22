import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { SYSTEM_PROMPT } from "@/lib/ai/system";
import { buildStoreSnapshot } from "@/lib/ai/snapshot";
import { toAnthropicTools, findTool, type UiPayload } from "@/lib/ai/tools";

export const runtime = "nodejs";
export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-opus-4-7";
const MAX_TURNS = 6;

const BodySchema = z.object({
  message: z.string().min(1),
  sessionId: z.string().min(1),
  locale: z.enum(["ar", "en"]).default("en"),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .optional(),
});

type ChatResponse = {
  message: string;
  uiActions: UiPayload[];
  toolEvents: { name: string; ok: boolean; summary: string }[];
};

export async function POST(request: NextRequest) {
  const parsed = BodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }
  const { message, sessionId, locale, history = [] } = parsed.data;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const snapshot = await buildStoreSnapshot(user.id);
  const systemBlocks: Anthropic.TextBlockParam[] = [
    { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    { type: "text", text: snapshot },
  ];

  const messages: Anthropic.MessageParam[] = [
    ...history.slice(-12).map((h) => ({ role: h.role, content: h.content })),
    { role: "user", content: message },
  ];

  const tools = toAnthropicTools();
  const uiActions: UiPayload[] = [];
  const toolEvents: ChatResponse["toolEvents"] = [];
  let assistantText = "";

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: systemBlocks,
      tools,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    const texts = response.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
    if (texts) assistantText = texts;

    if (toolUses.length === 0 || response.stop_reason === "end_turn") break;

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const use of toolUses) {
      const tool = findTool(use.name);
      if (!tool) {
        toolResults.push({
          type: "tool_result",
          tool_use_id: use.id,
          content: `Unknown tool ${use.name}`,
          is_error: true,
        });
        continue;
      }
      const parseResult = tool.schema.safeParse(use.input);
      if (!parseResult.success) {
        toolResults.push({
          type: "tool_result",
          tool_use_id: use.id,
          content: `Invalid input: ${JSON.stringify(parseResult.error.issues)}`,
          is_error: true,
        });
        continue;
      }

      try {
        const result = await tool.handler(parseResult.data, { userId: user.id, locale });
        toolEvents.push({ name: tool.name, ok: result.ok, summary: result.summary });
        if (result.ok && result.ui) uiActions.push(result.ui);
        toolResults.push({
          type: "tool_result",
          tool_use_id: use.id,
          content: result.summary,
          is_error: !result.ok,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        toolEvents.push({ name: tool.name, ok: false, summary: msg });
        toolResults.push({
          type: "tool_result",
          tool_use_id: use.id,
          content: msg,
          is_error: true,
        });
      }
    }

    messages.push({ role: "user", content: toolResults });
  }

  // Best-effort persistence. messages FK -> setup_sessions.id, which
  // FK -> stores.id, so we upsert the session row before the message
  // insert or the FK will silently reject.
  try {
    const { data: storeRow } = await supabase
      .from("stores")
      .select("id")
      .eq("user_id", user.id)
      .eq("platform", "zid")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (storeRow?.id) {
      await supabase
        .from("setup_sessions")
        .upsert(
          {
            id: sessionId,
            store_id: storeRow.id,
            status: "in_progress",
            current_step: "products",
          },
          { onConflict: "id" }
        );
    }

    await supabase.from("messages").insert([
      { session_id: sessionId, role: "user", content: message },
      {
        session_id: sessionId,
        role: "assistant",
        content: assistantText,
        metadata: { uiActions, toolEvents },
      },
    ]);
  } catch (err) {
    console.warn("[chat] db insert skipped:", err);
  }

  const res: ChatResponse = { message: assistantText, uiActions, toolEvents };
  return NextResponse.json(res);
}
