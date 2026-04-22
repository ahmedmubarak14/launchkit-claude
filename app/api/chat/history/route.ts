import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UiPayload } from "@/lib/ai/tools";

/**
 * GET /api/chat/history?sessionId=<uuid>
 *
 * Rehydrates past chat messages for a given session id. Used by
 * ChatPanel on mount so conversation survives page navigation.
 * Auth-guarded and scoped by RLS to the current user.
 */
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("messages")
    .select("id, role, content, metadata, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) {
    return NextResponse.json({ messages: [], error: error.message });
  }

  const messages = (data ?? []).map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    content: m.content as string,
    uiActions: (m.metadata as { uiActions?: UiPayload[] } | null)?.uiActions ?? [],
    toolEvents:
      (m.metadata as { toolEvents?: { name: string; ok: boolean; summary: string }[] } | null)?.toolEvents ?? [],
  }));

  return NextResponse.json({ messages });
}
