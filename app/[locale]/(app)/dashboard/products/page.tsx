import { setRequestLocale } from "next-intl/server";
import { ProductsTable } from "@/components/products/ProductsTable";

export default async function ProductsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ProductsTable />;
}
