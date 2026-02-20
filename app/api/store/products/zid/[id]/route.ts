import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * DELETE /api/store/products/zid/[id]
 * Deletes a product from Zid by its product ID.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing product id" }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: storeRows } = await supabase
      .from("stores")
      .select("access_token, auth_token, store_id")
      .eq("user_id", user.id)
      .eq("platform", "zid")
      .order("created_at", { ascending: false })
      .limit(1);

    const store = storeRows?.[0] || null;
    if (!store?.access_token || !store?.store_id) {
      return NextResponse.json({ error: "Store not connected" }, { status: 400 });
    }

    const apiBase = process.env.ZID_API_BASE_URL || "https://api.zid.sa";
    const headers: Record<string, string> = {
      "X-Manager-Token": store.access_token,
      "Authorization": `Bearer ${store.auth_token || ""}`,
      "Store-Id": store.store_id,
      "Role": "Manager",
    };

    const res = await fetch(`${apiBase}/v1/products/${id}`, {
      method: "DELETE",
      headers,
    });
    const text = await res.text();
    console.log("[products/zid/delete]", res.status, text.slice(0, 200));

    return NextResponse.json({ success: res.ok || res.status === 204, status: res.status, body: text });
  } catch (err) {
    console.error("[products/zid/delete] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
