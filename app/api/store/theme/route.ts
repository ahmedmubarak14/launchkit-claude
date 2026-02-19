import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getThemeById } from "@/lib/themes";

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

    // Get store tokens
    const { data: storeRows } = await supabase
      .from("stores")
      .select("access_token, auth_token, store_id")
      .eq("user_id", user.id)
      .eq("platform", "zid")
      .order("created_at", { ascending: false })
      .limit(1);
    const store = storeRows?.[0] || null;

    // Try to apply theme colors via Zid API (best-effort, non-fatal)
    let appliedToZid = false;
    if (store?.access_token) {
      try {
        const formData = new FormData();
        formData.append("primary_color", theme.colors.primary);
        formData.append("secondary_color", theme.colors.secondary);

        const zidRes = await fetch(`${process.env.ZID_API_BASE_URL}/v1/managers/store/`, {
          method: "PUT",
          headers: {
            "X-Manager-Token": store.access_token,
            "Authorization": `Bearer ${store.auth_token}`,
            "Accept-Language": "ar",
          },
          body: formData,
        });

        console.log("Zid theme apply response:", zidRes.status, await zidRes.text());
        appliedToZid = zidRes.ok;
      } catch (err) {
        console.error("Zid theme apply error:", err);
      }
    }

    // Save theme_id to stores table
    await supabase
      .from("stores")
      .update({ theme_id: themeId })
      .eq("user_id", user.id)
      .eq("platform", "zid");

    return NextResponse.json({ success: true, theme, appliedToZid });
  } catch (error) {
    console.error("Theme API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
