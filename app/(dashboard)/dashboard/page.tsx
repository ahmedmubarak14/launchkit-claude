import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: store }, { data: categories }, { data: products }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("stores").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).single(),
      supabase.from("categories").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("*").order("created_at", { ascending: false }),
    ]);

  return (
    <DashboardClient
      user={{ email: user.email || "", name: profile?.name }}
      store={store}
      categories={categories || []}
      products={products || []}
    />
  );
}
