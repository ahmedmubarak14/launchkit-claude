import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getThemeById } from "@/lib/themes";

/**
 * POST /api/store/theme
 * Saves the selected theme preference to the stores table.
 * Note: Zid's visual store themes are managed through their dashboard/theme marketplace.
 * We save the color preferences and can apply them to the LaunchKit UI and any generated assets.
 */
export async function POST(request: NextRequest) {
  try {
    const { themeId, sessionId } = await request.json();

    if (!themeId || !sessionId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const theme = getThemeById(themeId);
    if (!theme) {
      return NextResponse.json({ error: "Invalid theme ID" }, { status: 400 });
    }

    // Save theme_id to stores table
    const { error } = await supabase
      .from("stores")
      .update({ theme_id: themeId })
      .eq("user_id", user.id)
      .eq("platform", "zid");

    if (error) {
      console.error("[theme] DB update error:", error);
    }

    return NextResponse.json({ success: true, theme });
  } catch (error) {
    console.error("[theme] API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
