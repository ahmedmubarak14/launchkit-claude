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

    // Save categories to Supabase
    const { data, error } = await supabase.from("categories").insert(
      categories.map((cat: { nameAr: string; nameEn: string }) => ({
        session_id: sessionId,
        name_ar: cat.nameAr,
        name_en: cat.nameEn,
      }))
    ).select();

    if (error) throw error;

    // TODO: Also push to Zid API when credentials are configured
    // const store = await getStoreForSession(sessionId);
    // await pushCategoriesToZid(store, categories);

    return NextResponse.json({ success: true, categories: data });
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
