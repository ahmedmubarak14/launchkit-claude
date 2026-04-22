import { createClient } from "@/lib/supabase/server";

export type ZidSession = {
  storeId: string;
  storeName: string | null;
  headers: Record<string, string>;
  apiBase: string;
};

export async function getZidSession(userId: string): Promise<ZidSession | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("stores")
    .select("access_token, auth_token, store_id, store_name")
    .eq("user_id", userId)
    .eq("platform", "zid")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.access_token || !data?.store_id) return null;

  const apiBase = process.env.ZID_API_BASE_URL || "https://api.zid.sa";
  return {
    storeId: data.store_id,
    storeName: data.store_name ?? null,
    apiBase,
    headers: {
      "X-Manager-Token": data.access_token,
      Authorization: `Bearer ${data.auth_token || ""}`,
      "Store-Id": data.store_id,
      Role: "Manager",
      "Accept-Language": "ar,en",
    },
  };
}

export async function zidFetch(
  session: ZidSession,
  path: string,
  init: RequestInit = {}
): Promise<{ ok: boolean; status: number; json: unknown; text: string }> {
  const url = path.startsWith("http") ? path : `${session.apiBase}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { ...session.headers, ...(init.headers as Record<string, string> | undefined) },
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json, text };
}
