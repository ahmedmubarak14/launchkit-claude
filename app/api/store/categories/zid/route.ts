import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export interface ZidCategory {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string | null;
  productsCount: number;
}

/**
 * GET /api/store/categories/zid
 * Fetches the live category list directly from the merchant's Zid store.
 * Returns { categories: ZidCategory[] }
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get store tokens
    const { data: storeRows } = await supabase
      .from("stores")
      .select("access_token, auth_token, store_id")
      .eq("user_id", user.id)
      .eq("platform", "zid")
      .order("created_at", { ascending: false })
      .limit(1);

    const store = storeRows?.[0] || null;
    if (!store?.access_token) {
      return NextResponse.json({ categories: [], storeConnected: false });
    }

    const apiBase = process.env.ZID_API_BASE_URL || "https://api.zid.sa";
    const headers: Record<string, string> = {
      "X-Manager-Token": store.access_token,
      "Authorization": `Bearer ${store.auth_token}`,
      "Accept-Language": "ar",
    };

    // Zid returns categories under GET /v1/managers/store/categories/
    const res = await fetch(`${apiBase}/v1/managers/store/categories/`, { headers });
    const text = await res.text();
    console.log("Zid categories fetch:", res.status, text.substring(0, 300));

    if (!res.ok) {
      return NextResponse.json({ categories: [], error: `Zid returned ${res.status}` });
    }

    const data = JSON.parse(text);

    // Zid wraps in different keys — handle all known shapes
    const rawList: Record<string, unknown>[] =
      data?.categories ||
      data?.data?.categories ||
      data?.data ||
      [];

    const categories: ZidCategory[] = rawList.map((cat) => {
      // Name can be a string or { ar, en } object
      const nameAr =
        typeof cat.name === "object" && cat.name !== null
          ? (cat.name as Record<string, string>).ar || ""
          : String(cat.name || "");
      const nameEn =
        typeof cat.name === "object" && cat.name !== null
          ? (cat.name as Record<string, string>).en || nameAr
          : nameAr;

      return {
        id: String(cat.id || ""),
        nameAr,
        nameEn: nameEn || nameAr,
        slug: cat.slug ? String(cat.slug) : null,
        productsCount: Number(cat.products_count ?? cat.productsCount ?? 0),
      };
    });

    return NextResponse.json({ categories, storeConnected: true });
  } catch (err) {
    console.error("Zid categories fetch error:", err);
    return NextResponse.json({ categories: [], error: String(err) });
  }
}

/**
 * DELETE /api/store/categories/zid
 * Body: { categoryId: string }
 * Deletes a category from Zid by its platform ID.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { categoryId } = await request.json();
    if (!categoryId) {
      return NextResponse.json({ error: "Missing categoryId" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: storeRows } = await supabase
      .from("stores")
      .select("access_token, auth_token")
      .eq("user_id", user.id)
      .eq("platform", "zid")
      .order("created_at", { ascending: false })
      .limit(1);

    const store = storeRows?.[0] || null;
    if (!store?.access_token) {
      return NextResponse.json({ error: "Store not connected" }, { status: 400 });
    }

    const apiBase = process.env.ZID_API_BASE_URL || "https://api.zid.sa";
    const headers: Record<string, string> = {
      "X-Manager-Token": store.access_token,
      "Authorization": `Bearer ${store.auth_token}`,
      "Accept-Language": "ar",
    };

    // Try known Zid delete endpoints
    let deleted = false;
    let lastStatus = 0;
    let lastBody = "";

    // Attempt 1: DELETE /v1/managers/store/categories/{id}
    const res1 = await fetch(`${apiBase}/v1/managers/store/categories/${categoryId}`, {
      method: "DELETE",
      headers,
    });
    lastStatus = res1.status;
    lastBody = await res1.text();
    console.log("Zid delete cat attempt 1:", res1.status, lastBody);
    if (res1.ok) deleted = true;

    // Attempt 2: POST /v1/managers/store/categories/delete (some Zid versions)
    if (!deleted) {
      const fd = new FormData();
      fd.append("category_id", categoryId);
      const res2 = await fetch(`${apiBase}/v1/managers/store/categories/delete`, {
        method: "POST",
        headers,
        body: fd,
      });
      lastStatus = res2.status;
      lastBody = await res2.text();
      console.log("Zid delete cat attempt 2:", res2.status, lastBody);
      if (res2.ok) deleted = true;
    }

    return NextResponse.json({ success: deleted, status: lastStatus, body: lastBody });
  } catch (err) {
    console.error("Zid category delete error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/**
 * PUT /api/store/categories/zid
 * Body: { categoryId: string, nameAr: string, nameEn: string }
 * Updates a category name in Zid.
 */
export async function PUT(request: NextRequest) {
  try {
    const { categoryId, nameAr, nameEn } = await request.json();
    if (!categoryId || !nameAr) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: storeRows } = await supabase
      .from("stores")
      .select("access_token, auth_token")
      .eq("user_id", user.id)
      .eq("platform", "zid")
      .order("created_at", { ascending: false })
      .limit(1);

    const store = storeRows?.[0] || null;
    if (!store?.access_token) {
      return NextResponse.json({ error: "Store not connected" }, { status: 400 });
    }

    const apiBase = process.env.ZID_API_BASE_URL || "https://api.zid.sa";
    const headers: Record<string, string> = {
      "X-Manager-Token": store.access_token,
      "Authorization": `Bearer ${store.auth_token}`,
      "Accept-Language": "ar",
    };

    const fd = new FormData();
    fd.append("name[ar]", nameAr);
    fd.append("name[en]", nameEn || nameAr);
    fd.append("description[ar]", "");
    fd.append("description[en]", "");

    const res = await fetch(`${apiBase}/v1/managers/store/categories/${categoryId}`, {
      method: "PUT",
      headers,
      body: fd,
    });

    const text = await res.text();
    console.log("Zid update category:", res.status, text.substring(0, 200));

    return NextResponse.json({ success: res.ok, status: res.status, body: text });
  } catch (err) {
    console.error("Zid category update error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
