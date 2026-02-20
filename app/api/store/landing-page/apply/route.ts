import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildLandingPageScript, LandingPageLayout } from "@/lib/landing-page-builder";

const ZID_BASE = process.env.ZID_API_BASE_URL || "https://api.zid.sa";
const SCRIPT_NAME = "LaunchKit Landing Page";

/**
 * POST /api/store/landing-page/apply
 *
 * Takes the AI-generated landing page layout, compiles it into a
 * self-contained JavaScript snippet, and injects it into the merchant's
 * live Zid storefront via the App Scripts API.
 *
 * The script is inserted before any existing page content on the homepage,
 * showing the hero banner, features, promo strip, categories, and testimonials.
 *
 * Body: { layout: LandingPageLayout }
 * Returns: { success, scriptId, storeUrl }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const layout = body.layout as LandingPageLayout;

    if (!layout) {
      return NextResponse.json({ error: "Missing layout" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch store credentials
    const { data: storeRows } = await supabase
      .from("stores")
      .select("id, access_token, auth_token, store_id, store_name")
      .eq("user_id", user.id)
      .eq("platform", "zid")
      .order("created_at", { ascending: false })
      .limit(1);

    const store = storeRows?.[0] || null;

    if (!store?.access_token) {
      return NextResponse.json({ error: "Store not connected" }, { status: 400 });
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${store.auth_token || ""}`,
      "X-Manager-Token": store.access_token,
      "Content-Type": "application/json",
      Accept: "application/json",
      "Accept-Language": "en",
    };

    if (store.store_id) {
      headers["Store-Id"] = store.store_id;
      headers["Role"] = "Manager";
    }

    // Build the injectable script
    const srcCode = buildLandingPageScript(layout);

    // ── Step 1: List existing scripts to find/delete previous LaunchKit script ──
    let existingScriptId: string | null = null;
    try {
      const listRes = await fetch(`${ZID_BASE}/v1/managers/scripts`, {
        method: "GET",
        headers,
      });
      if (listRes.ok) {
        const listData = await listRes.json();
        // Zid returns { scripts: [...] } or an array
        const scripts: Array<{ id: string; name?: string; title?: string }> =
          listData?.scripts || listData?.data || listData || [];
        const existing = scripts.find(
          (s) => (s.name || s.title || "").includes("LaunchKit")
        );
        if (existing) existingScriptId = existing.id;
      }
    } catch {
      // non-fatal
    }

    // ── Step 2: Delete existing LaunchKit script if present ──
    if (existingScriptId) {
      try {
        await fetch(`${ZID_BASE}/v1/managers/scripts/${existingScriptId}`, {
          method: "DELETE",
          headers,
        });
      } catch {
        // non-fatal
      }
    }

    // ── Step 3: Create new script via App Scripts API ──
    const scriptPayload = {
      name: SCRIPT_NAME,
      title: SCRIPT_NAME,
      description: "AI-generated landing page section by LaunchKit",
      src_code: srcCode,
      event: "onload",           // run when DOM is loaded
      scope: "storefront",       // inject in storefront only (not checkout)
    };

    const createRes = await fetch(`${ZID_BASE}/v1/managers/scripts`, {
      method: "POST",
      headers,
      body: JSON.stringify(scriptPayload),
    });

    const createBody = await createRes.text();
    let createData: Record<string, unknown> = {};
    try {
      createData = JSON.parse(createBody);
    } catch {
      // response may not be JSON
    }

    if (!createRes.ok) {
      console.error("[landing-page/apply] Zid script API error:", createRes.status, createBody);
      return NextResponse.json(
        {
          error: "Zid App Script API error",
          status: createRes.status,
          detail: createBody,
          // Still return partial success info so UI can guide user
          fallback: true,
          storeUrl: store.store_id
            ? `https://web.zid.sa/${store.store_id}`
            : null,
          storeBuilderUrl: store.store_id
            ? `https://dashboard.zid.sa/ar-sa/stores/${store.store_id}/channels/online-store/builder`
            : "https://web.zid.sa/store-design",
        },
        { status: 422 }
      );
    }

    // ── Step 4: Save layout + script ID to DB ──
    const scriptId =
      (createData?.script as Record<string, unknown>)?.id ||
      createData?.id ||
      existingScriptId ||
      null;

    try {
      await supabase
        .from("stores")
        .update({
          landing_page_data: { ...layout, scriptId },
          updated_at: new Date().toISOString(),
        } as Record<string, unknown>)
        .eq("id", store.id);
    } catch {
      // non-fatal
    }

    const storeUrl = store.store_id
      ? `https://web.zid.sa/${store.store_id}`
      : null;

    return NextResponse.json({
      success: true,
      scriptId,
      storeUrl,
      storeBuilderUrl: store.store_id
        ? `https://dashboard.zid.sa/ar-sa/stores/${store.store_id}/channels/online-store/builder`
        : "https://web.zid.sa/store-design",
    });
  } catch (err) {
    console.error("[landing-page/apply] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/**
 * DELETE /api/store/landing-page/apply
 * Removes the LaunchKit landing page script from the store.
 */
export async function DELETE() {
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
      .select("id, access_token, auth_token, store_id, landing_page_data")
      .eq("user_id", user.id)
      .eq("platform", "zid")
      .order("created_at", { ascending: false })
      .limit(1);

    const store = storeRows?.[0] || null;
    if (!store?.access_token) {
      return NextResponse.json({ error: "Store not connected" }, { status: 400 });
    }

    const landingData = (store as Record<string, unknown>)?.landing_page_data as Record<string, unknown> | null;
    const scriptId = landingData?.scriptId as string | null;

    if (!scriptId) {
      return NextResponse.json({ success: true, message: "No script to remove" });
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${store.auth_token || ""}`,
      "X-Manager-Token": store.access_token,
      Accept: "application/json",
    };
    if (store.store_id) {
      headers["Store-Id"] = store.store_id;
      headers["Role"] = "Manager";
    }

    const delRes = await fetch(`${ZID_BASE}/v1/managers/scripts/${scriptId}`, {
      method: "DELETE",
      headers,
    });

    // Clear script ID from DB
    try {
      await supabase
        .from("stores")
        .update({ landing_page_data: { ...landingData, scriptId: null } } as Record<string, unknown>)
        .eq("id", store.id);
    } catch {
      // non-fatal
    }

    return NextResponse.json({ success: delRes.ok, status: delRes.status });
  } catch (err) {
    console.error("[landing-page/apply] DELETE error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
