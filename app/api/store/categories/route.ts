import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { categories, sessionId } = await request.json();

    if (!categories || !sessionId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's Zid store access token (use limit 1 in case of duplicate rows)
    const { data: storeRows } = await supabase
      .from("stores")
      .select("access_token, store_id")
      .eq("user_id", user.id)
      .eq("platform", "zid")
      .order("created_at", { ascending: false })
      .limit(1);
    const store = storeRows?.[0] || null;

    // Push each category to Zid if store is connected
    const zidResults: Record<string, string> = {};
    if (store?.access_token) {
      for (const cat of categories) {
        try {
          const zidRes = await fetch(`${process.env.ZID_API_BASE_URL}/v1/managers/store/category`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${store.access_token}`,
              "Content-Type": "application/json",
              "Accept-Language": "ar",
            },
            body: JSON.stringify({
              name: { ar: cat.nameAr, en: cat.nameEn },
              description: { ar: "", en: "" },
              active: true,
            }),
          });

          if (zidRes.ok) {
            const zidData = await zidRes.json();
            const zidId = zidData?.category?.id?.toString() || zidData?.id?.toString();
            if (zidId) zidResults[cat.nameEn] = zidId;
          } else {
            const errText = await zidRes.text();
            console.error(`Zid category create failed for "${cat.nameEn}":`, zidRes.status, errText);
          }
        } catch (err) {
          console.error(`Zid category push error for "${cat.nameEn}":`, err);
        }
      }
    }

    // Save categories to Supabase with Zid platform_id if available
    const { data, error } = await supabase.from("categories").insert(
      categories.map((cat: { nameAr: string; nameEn: string }) => ({
        session_id: sessionId,
        name_ar: cat.nameAr,
        name_en: cat.nameEn,
        platform_id: zidResults[cat.nameEn] || null,
      }))
    ).select();

    if (error) throw error;

    const pushedToZid = Object.keys(zidResults).length > 0;
    return NextResponse.json({ success: true, categories: data, pushedToZid });
  } catch (error) {
    console.error("Categories API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ categories: data });
  } catch (error) {
    console.error("Categories GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
