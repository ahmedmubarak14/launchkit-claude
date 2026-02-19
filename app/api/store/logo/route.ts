import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Save an existing logo URL (SVG data URI or AI image URL) ──
    if (type === "save") {
      const { logoUrl } = body;
      if (!logoUrl) {
        return NextResponse.json({ error: "Missing logoUrl" }, { status: 400 });
      }

      await supabase
        .from("stores")
        .update({ logo_url: logoUrl })
        .eq("user_id", user.id)
        .eq("platform", "zid");

      return NextResponse.json({ success: true, logoUrl });
    }

    // ── Generate AI logo via fal.ai ──
    if (type === "ai") {
      const { prompt } = body;
      if (!prompt) {
        return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
      }

      const falApiKey = process.env.FALAI_API_KEY;
      if (!falApiKey) {
        return NextResponse.json(
          { error: "AI logo generation not configured. Add FALAI_API_KEY to environment variables." },
          { status: 503 }
        );
      }

      const falRes = await fetch("https://fal.run/fal-ai/flux/schnell", {
        method: "POST",
        headers: {
          "Authorization": `Key ${falApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: `${prompt}, simple clean logo design, white background, vector style, professional`,
          image_size: "square_hd",
          num_inference_steps: 4,
          num_images: 1,
        }),
      });

      if (!falRes.ok) {
        const errText = await falRes.text();
        console.error("fal.ai error:", falRes.status, errText);
        return NextResponse.json({ error: "AI generation failed. Please try again." }, { status: 500 });
      }

      const falData = await falRes.json();
      const logoUrl = falData?.images?.[0]?.url || null;

      if (!logoUrl) {
        return NextResponse.json({ error: "No image returned from AI" }, { status: 500 });
      }

      return NextResponse.json({ success: true, logoUrl });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("Logo API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
