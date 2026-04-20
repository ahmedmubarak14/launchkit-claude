import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/store/theme/install
 *
 * Installs the LaunchKit theme on the authenticated merchant's Zid store.
 *
 * Status: STUB. The endpoints Zid's Partner Dashboard uses behind
 * "Custom themes → Upload new theme" and "Activate theme" are not in the
 * public docs. Until a 30-min DevTools spike on partner.zid.sa confirms
 * them, this route returns instructions for a guided manual upload and
 * exposes the download URL for the pre-built ZIP.
 *
 * Once the spike confirms the endpoints, fill in ZID_THEME_UPLOAD_URL +
 * ZID_THEME_ACTIVATE_URL below and switch `automated` to true.
 */

const ZIP_PUBLIC_PATH = "/themes/launchkit-theme.zip";

// TODO(spike): replace with the actual Zid endpoints captured from DevTools
const ZID_THEME_UPLOAD_URL: string | null = null; // e.g. `${BASE}/v1/managers/store/themes/upload`
const ZID_THEME_ACTIVATE_URL: string | null = null; // e.g. `${BASE}/v1/managers/store/themes/{id}/activate`

export async function POST(request: NextRequest) {
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
    return NextResponse.json(
      { error: "Store not connected", detail: "Connect a Zid store first." },
      { status: 400 }
    );
  }

  // ── Until the API spike completes: return guided-manual-upload instructions ──
  if (!ZID_THEME_UPLOAD_URL || !ZID_THEME_ACTIVATE_URL) {
    const origin = new URL(request.url).origin;
    return NextResponse.json({
      automated: false,
      downloadUrl: `${origin}${ZIP_PUBLIC_PATH}`,
      instructions: {
        en: [
          "Download the LaunchKit theme ZIP using the URL below",
          "Open your Zid Partner Dashboard → Custom themes → Upload new theme",
          'Set Name: "LaunchKit Theme", upload the ZIP, then click Save',
          "Click Activate theme on the row that appears",
        ],
        ar: [
          "حمّل ملف ثيم لاينش كيت من الرابط أدناه",
          "افتح لوحة تحكم متجر زد ← الثيمات المخصصة ← رفع ثيم جديد",
          "اكتب الاسم: LaunchKit Theme، ارفع الملف، ثم اضغط حفظ",
          "اضغط على تفعيل الثيم في السطر الذي يظهر",
        ],
      },
    });
  }

  // ── Automated path (fill in once the spike confirms endpoints) ──────────────
  let zip: Buffer;
  try {
    const zipPath = path.join(process.cwd(), "public", "themes", "launchkit-theme.zip");
    zip = await readFile(zipPath);
  } catch (err) {
    return NextResponse.json(
      { error: "Theme artifact missing", detail: String(err) },
      { status: 500 }
    );
  }

  const headers: Record<string, string> = {
    "X-Manager-Token": store.access_token,
    "Authorization": `Bearer ${store.auth_token || ""}`,
    "Store-Id": store.store_id,
    "Role": "Manager",
  };

  // Upload
  const uploadFd = new FormData();
  uploadFd.append("name", "LaunchKit Theme");
  uploadFd.append("description", "AI-configured storefront by LaunchKit");
  uploadFd.append(
    "file",
    new File([new Uint8Array(zip)], "launchkit-theme.zip", { type: "application/zip" })
  );

  const uploadRes = await fetch(ZID_THEME_UPLOAD_URL, {
    method: "POST",
    headers,
    body: uploadFd,
  });
  const uploadText = await uploadRes.text();
  if (!uploadRes.ok) {
    return NextResponse.json(
      { error: "Theme upload failed", status: uploadRes.status, detail: uploadText.slice(0, 500) },
      { status: uploadRes.status }
    );
  }

  let themeId: string | null = null;
  try {
    const parsed = JSON.parse(uploadText);
    themeId = String(parsed?.theme?.id ?? parsed?.id ?? "") || null;
  } catch {
    // leave themeId null; the activate URL may be parameterless
  }

  // Activate
  const activateUrl = themeId
    ? ZID_THEME_ACTIVATE_URL.replace("{id}", themeId)
    : ZID_THEME_ACTIVATE_URL;
  const activateRes = await fetch(activateUrl, { method: "POST", headers });
  const activateText = await activateRes.text();
  if (!activateRes.ok) {
    return NextResponse.json(
      {
        uploaded: true,
        activated: false,
        themeId,
        error: "Theme activation failed",
        status: activateRes.status,
        detail: activateText.slice(0, 500),
      },
      { status: activateRes.status }
    );
  }

  // Persist on the store row so we know which theme is active
  await supabase
    .from("stores")
    .update({ theme_id: themeId ?? "launchkit-theme" })
    .eq("user_id", user.id)
    .eq("platform", "zid");

  return NextResponse.json({ automated: true, uploaded: true, activated: true, themeId });
}
