import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
    try {
        const { prompt, sessionId } = await request.json();

        if (!prompt || !sessionId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const falApiKey = process.env.FALAI_API_KEY;
        if (!falApiKey) {
            // Fallback dummy image if no Fal key
            return NextResponse.json({
                success: true,
                imageUrl: `https://fakeimg.pl/800x800/f3f4f6/9ca3af?text=Product&font=museo`
            });
        }

        // Call fal.ai for product image
        const falRes = await fetch("https://fal.run/fal-ai/flux/schnell", {
            method: "POST",
            headers: {
                "Authorization": `Key ${falApiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                prompt: `${prompt}, photorealistic e-commerce product photography, high quality, studio lighting, white background, clean, professional, 8k resolution`,
                image_size: "square_hd",
                num_inference_steps: 4,
                num_images: 1,
            }),
        });

        if (!falRes.ok) {
            throw new Error(`Fal.ai error: ${await falRes.text()}`);
        }

        const falData = await falRes.json();
        const imageUrl = falData?.images?.[0]?.url;

        if (!imageUrl) {
            throw new Error("No image returned from AI");
        }

        return NextResponse.json({ success: true, imageUrl });

    } catch (error) {
        console.error("[product-image] API error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
