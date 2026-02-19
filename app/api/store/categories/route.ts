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
          // Zid requires multipart/form-data for categories
          const formData = new FormData();
          formData.append("name[ar]", cat.nameAr);
          formData.append("name[en]", cat.nameEn);
          formData.append("description[ar]", "");
          formData.append("description[en]", "");

          const zidRes = await fetch(`${process.env.ZID_API_BASE_URL}/v1/managers/store/categories/add`, {
            method: "POST",
            headers: {
              // X-Manager-Token is the OAuth access token (store-level auth)
              "X-Manager-Token": store.access_token,
              // Authorization is the partner-level token (client secret)
              "Authorization": `Bearer ${process.env.ZID_CLIENT_SECRET}`,
              "Accept-Language": "ar",
            },
            body: formData,
          });

          const responseText = await zidRes.text();
          console.log(`Zid category response for "${cat.nameEn}":`, zidRes.status, responseText);

          if (zidRes.ok) {
            const zidData = JSON.parse(responseText);
            const zidId = zidData?.category?.id?.toString();
            if (zidId) zidResults[cat.nameEn] = zidId;
          } else {
            console.error(`Zid category create failed for "${cat.nameEn}":`, zidRes.status, responseText);
          }
        } catch (err) {
          console.error(`Zid category push error for "${cat.nameEn}":`, err);
        }
      }
    } else {
      console.log("No store access token found, skipping Zid push");
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
