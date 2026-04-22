"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, RefreshCcw, Search, Loader2, X } from "lucide-react";

type ZidProduct = {
  id: string;
  nameAr: string;
  nameEn: string;
  price: number;
  sku: string | null;
  status: string;
  categoryIds: string[];
};

type ProductsResponse = { products: ZidProduct[]; total?: number; error?: string };

async function fetchProducts(): Promise<ProductsResponse> {
  const res = await fetch("/api/store/products/zid", { cache: "no-store" });
  if (!res.ok) throw new Error("failed");
  return res.json();
}

async function deleteProduct(id: string) {
  const res = await fetch(`/api/store/products/zid/${id}`, { method: "DELETE" });
  const data = await res.json();
  if (!data.success) throw new Error(data.body || data.error || "delete failed");
  return data;
}

export function ProductsTable() {
  const t = useTranslations("products");
  const locale = useLocale();
  const isAr = locale === "ar";
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["zid-products"],
    queryFn: fetchProducts,
  });

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [failures, setFailures] = useState<{ id: string; name: string }[]>([]);

  const products = useMemo(() => data?.products ?? [], [data?.products]);
  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.trim().toLowerCase();
    return products.filter(
      (p) =>
        p.nameAr.toLowerCase().includes(q) ||
        p.nameEn.toLowerCase().includes(q) ||
        (p.sku || "").toLowerCase().includes(q)
    );
  }, [products, search]);

  const allSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((p) => p.id)));
    }
  };

  const bulkMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const fails: { id: string; name: string }[] = [];
      for (const id of ids) {
        try {
          await deleteProduct(id);
        } catch {
          const product = products.find((p) => p.id === id);
          fails.push({ id, name: product ? (isAr ? product.nameAr : product.nameEn) : id });
        }
      }
      return fails;
    },
    onSuccess: (fails) => {
      setFailures(fails);
      setSelected(new Set());
      setConfirming(false);
      qc.invalidateQueries({ queryKey: ["zid-products"] });
    },
  });

  return (
    <div className="max-w-6xl mx-auto px-6 lg:px-10 py-10">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl md:text-4xl tracking-tight">{t("title")}</h1>
          <p className="mt-2 text-muted-ink">{t("subtitle")}</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-full border hairline bg-paper text-sm hover:bg-cream transition-colors disabled:opacity-50"
        >
          <RefreshCcw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          {t("refresh")}
        </button>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className={`absolute ${isAr ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-ink`} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search")}
            className={`w-full h-11 ${isAr ? "pr-10 pl-4" : "pl-10 pr-4"} rounded-2xl border hairline bg-paper focus:outline-none focus:border-ink transition-colors text-sm`}
          />
        </div>
        {selected.size > 0 && (
          <button
            onClick={() => setConfirming(true)}
            className="inline-flex items-center gap-2 h-11 px-4 rounded-full bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            {t("deleteSelected", { count: selected.size })}
          </button>
        )}
      </div>

      {failures.length > 0 && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <div className="flex items-center justify-between">
            <div>
              {failures.map((f) => t("deleteFailed", { name: f.name })).join(" · ")}
            </div>
            <button onClick={() => setFailures([])} className="text-red-500 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="rounded-3xl border hairline bg-paper overflow-hidden">
        <div className="px-5 py-3.5 border-b hairline bg-cream/40 flex items-center gap-3 text-xs tracking-[0.18em] uppercase text-muted-ink">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="w-4 h-4 accent-ink"
            aria-label={t("selectAll")}
          />
          <span className="flex-1">{t("title")}</span>
          <span className="w-24 text-end">SAR</span>
          <span className="w-20 text-end">{t("status.active").length ? "" : ""}</span>
        </div>

        {isLoading ? (
          <div className="p-16 text-center text-muted-ink text-sm flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t("loading")}
          </div>
        ) : isError || data?.error ? (
          <div className="p-16 text-center text-red-600 text-sm">
            {data?.error || (isAr ? "تعذّر جلب المنتجات." : "Couldn't load products.")}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-muted-ink text-sm">{t("empty")}</div>
        ) : (
          <ul className="divide-y hairline">
            {filtered.map((p) => {
              const checked = selected.has(p.id);
              const name = isAr ? p.nameAr || p.nameEn : p.nameEn || p.nameAr;
              return (
                <li
                  key={p.id}
                  className={`px-5 py-4 flex items-center gap-4 transition-colors ${checked ? "bg-cream/40" : "hover:bg-cream/20"}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleOne(p.id)}
                    className="w-4 h-4 accent-ink"
                    aria-label={name}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ink truncate">{name}</div>
                    {p.sku && <div className="text-xs text-muted-ink mt-0.5">SKU · {p.sku}</div>}
                  </div>
                  <div className="w-24 text-end tabular-nums text-sm">{p.price.toLocaleString()}</div>
                  <StatusPill status={p.status} />
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {confirming && (
        <ConfirmBulkDelete
          count={selected.size}
          pending={bulkMutation.isPending}
          onConfirm={() => bulkMutation.mutate(Array.from(selected))}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const t = useTranslations("products.status");
  const norm = status.toLowerCase();
  const label = norm.includes("draft") ? t("draft") : norm.includes("hidden") ? t("hidden") : t("active");
  const color =
    norm.includes("draft") ? "bg-amber-50 text-amber-700 border-amber-200"
      : norm.includes("hidden") ? "bg-gray-50 text-gray-700 border-gray-200"
        : "bg-emerald-50 text-emerald-700 border-emerald-200";
  return (
    <span className={`w-20 text-center text-[10px] tracking-[0.18em] uppercase py-1 rounded-full border ${color}`}>
      {label}
    </span>
  );
}

function ConfirmBulkDelete({
  count,
  pending,
  onConfirm,
  onCancel,
}: {
  count: number;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("products");
  return (
    <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-paper p-8 border hairline">
        <h3 className="font-display text-2xl">{t("deleteConfirm", { count })}</h3>
        <p className="mt-3 text-muted-ink text-sm">{t("deleteWarning")}</p>
        <div className="mt-8 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={pending}
            className="h-11 px-5 rounded-full border hairline text-sm hover:bg-cream transition-colors disabled:opacity-50"
          >
            {t("cancel")}
          </button>
          <button
            onClick={onConfirm}
            disabled={pending}
            className="h-11 px-5 rounded-full bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors inline-flex items-center gap-2 disabled:opacity-70"
          >
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {t("deleteCta")}
          </button>
        </div>
      </div>
    </div>
  );
}
