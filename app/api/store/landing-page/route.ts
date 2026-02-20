import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/store/landing-page
 * Saves the AI-generated landing page layout to the store record.
 * The layout is stored as JSONB in stores.landing_page_data.
 *
 * Also returns the store's Zid store builder URL so the user can
 * visit the Zid dashboard and manually apply the generated content.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { layout } = body;

    if (!layout) {
      return NextResponse.json({ error: "Missing layout data" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the user's store
    const { data: storeRows } = await supabase
      .from("stores")
      .select("id, store_id, store_name")
      .eq("user_id", user.id)
      .eq("platform", "zid")
      .order("created_at", { ascending: false })
      .limit(1);

    const store = storeRows?.[0] || null;

    if (!store) {
      return NextResponse.json({ error: "Store not connected" }, { status: 400 });
    }

    // Save the layout to the stores table (best-effort — column may not exist yet)
    // We use a try/catch so a missing column doesn't break the flow
    let savedToDb = false;
    try {
      const { error: updateError } = await supabase
        .from("stores")
        .update({ landing_page_data: layout, updated_at: new Date().toISOString() } as Record<string, unknown>)
        .eq("id", store.id);

      if (!updateError) {
        savedToDb = true;
      } else {
        console.warn("[landing-page] DB save skipped:", updateError.message);
      }
    } catch (dbErr) {
      console.warn("[landing-page] DB save error:", dbErr);
    }

    // Build the Zid dashboard store-builder URL
    const storeBuilderUrl = store.store_id
      ? `https://dashboard.zid.sa/ar-sa/stores/${store.store_id}/channels/online-store/builder`
      : "https://web.zid.sa/store-design";

    return NextResponse.json({
      success: true,
      savedToDb,
      storeBuilderUrl,
      storeName: store.store_name,
    });
  } catch (err) {
    console.error("[landing-page] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/**
 * GET /api/store/landing-page
 * Returns the saved landing page layout for the current store.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: storeRows } = await supabase
      .from("stores")
      .select("id, store_id, store_name, landing_page_data")
      .eq("user_id", user.id)
      .eq("platform", "zid")
      .order("created_at", { ascending: false })
      .limit(1);

    const store = storeRows?.[0] || null;

    return NextResponse.json({
      layout: (store as Record<string, unknown>)?.landing_page_data || null,
      storeBuilderUrl: store?.store_id
        ? `https://dashboard.zid.sa/ar-sa/stores/${store.store_id}/channels/online-store/builder`
        : "https://web.zid.sa/store-design",
    });
  } catch (err) {
    console.error("[landing-page] GET error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
