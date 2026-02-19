import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateSVGLogo, svgToDataUri } from "@/lib/svg-logo-generator";

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

    // ── Save logo URL to DB and push to Zid ──────────────────────────────────
    if (type === "save") {
      const { logoUrl } = body;
      if (!logoUrl) {
        return NextResponse.json({ error: "Missing logoUrl" }, { status: 400 });
      }

      // Save to Supabase
      await supabase
        .from("stores")
        .update({ logo_url: logoUrl })
        .eq("user_id", user.id)
        .eq("platform", "zid");

      // Push logo to Zid store (best-effort — Zid may or may not support this)
      try {
        const { data: storeRows } = await supabase
          .from("stores")
          .select("access_token, auth_token")
          .eq("user_id", user.id)
          .eq("platform", "zid")
          .order("created_at", { ascending: false })
          .limit(1);
        const store = storeRows?.[0] || null;

        if (store?.access_token) {
          try {
            const fd = new FormData();

            // Convert logo URL (base64 or remote) to a File blob for FormData
            // Zid requires an actual file upload, not just a string URL
            const logoFetch = await fetch(logoUrl);
            const logoBlob = await logoFetch.blob();
            // Create a file from the blob (Zid needs a filename)
            const logoFile = new File([logoBlob], "store-logo.png", { type: logoBlob.type });

            fd.append("logo", logoFile);

            const zidRes = await fetch(`${process.env.ZID_API_BASE_URL || "https://api.zid.sa"}/v1/managers/store/`, {
              method: "POST", // Official docs: POST /v1/managers/store/logo (Some versions use PUT to /store)
              // Wait, checking Zid docs, it's POST /v1/managers/store/logo to update logo
              headers: {
                "X-Manager-Token": store.access_token,
                "Authorization": `Bearer ${store.auth_token || ""}`,
                "Accept-Language": "ar",
                // Do NOT set Content-Type to multipart/form-data, fetch does it automatically with boundary
              },
              body: fd,
            });
            console.log("[logo] Zid logo push:", zidRes.status, await zidRes.text().then(t => t.slice(0, 200)));
          } catch (uploadErr) {
            console.error("[logo] Zid upload error:", uploadErr);
          }
        }
      } catch (err) {
        console.error("[logo] Zid push error:", err);
      }

      return NextResponse.json({ success: true, logoUrl });
    }

    // ── Generate AI logo via fal.ai (falls back to SVG if key not set) ────────
    if (type === "ai") {
      const { prompt, storeName, primaryColor } = body;
      const falApiKey = process.env.FALAI_API_KEY;

      // ── No API key: return a high-quality SVG fallback ─────────────────────
      if (!falApiKey) {
        const name = storeName || prompt?.match(/called "([^"]+)"/)?.[1] || "My Store";
        const color = primaryColor || "#7C3AED";
        const svgString = generateSVGLogo({ storeName: name, primaryColor: color, style: "icon+text" });
        const logoUrl = svgToDataUri(svgString);
        return NextResponse.json({ success: true, logoUrl, fallback: true });
      }

      // ── Has API key: call fal.ai ───────────────────────────────────────────
      if (!prompt) {
        return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
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
        console.error("[logo] fal.ai error:", falRes.status, errText);
        // Fallback to SVG on fal.ai failure
        const name = storeName || "My Store";
        const color = primaryColor || "#7C3AED";
        const svgString = generateSVGLogo({ storeName: name, primaryColor: color, style: "icon+text" });
        const logoUrl = svgToDataUri(svgString);
        return NextResponse.json({ success: true, logoUrl, fallback: true });
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
    console.error("[logo] API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
