import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { product, sessionId } = await request.json();

    if (!product || !sessionId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase.from("products").insert({
      session_id: sessionId,
      name_ar: product.nameAr,
      name_en: product.nameEn,
      description_ar: product.descriptionAr,
      description_en: product.descriptionEn,
      price: product.price || 0,
      variants: product.variants || [],
    }).select().single();

    if (error) throw error;

    return NextResponse.json({ success: true, product: data });
  } catch (error) {
    console.error("Products API error:", error);
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
      .from("products")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ products: data });
  } catch (error) {
    console.error("Products GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
