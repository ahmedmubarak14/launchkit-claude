"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ImageOff, Package, AlertTriangle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIAction, BulkProductItem, ZidCategory } from "@/types";

interface BulkProductCardProps {
  action: AIAction;
  sessionId: string;
  language: "en" | "ar";
  onConfirm: (products: BulkProductItem[]) => void;
}

const CREATE_NEW = "__create_new__";
const NO_CATEGORY = "";

type Row = BulkProductItem & {
  _id: number;
  _selected: boolean;
  _done: boolean;
  _failed: boolean;
  /** Resolved Zid category id, CREATE_NEW sentinel, or empty = no category */
  _categoryChoice: string;
};

export function BulkProductCard({ action, sessionId, language, onConfirm }: BulkProductCardProps) {
  const isRTL = language === "ar";

  const [liveCategories, setLiveCategories] = useState<ZidCategory[]>([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);

  const [items, setItems] = useState<Row[]>(() =>
    (action.data?.products || []).map((p, i) => ({
      ...p,
      _id: i,
      _selected: true,
      _done: false,
      _failed: false,
      _categoryChoice: NO_CATEGORY,
    }))
  );

  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [progress, setProgress] = useState(0);

  // Fetch live Zid categories once; then auto-resolve each row's categoryName.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/store/categories/zid")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const cats: ZidCategory[] = Array.isArray(data?.categories) ? data.categories : [];
        setLiveCategories(cats);
        setCategoriesLoaded(true);
        setItems((prev) => prev.map((row) => ({ ...row, _categoryChoice: resolveChoice(row.categoryName, cats) })));
      })
      .catch(() => {
        if (!cancelled) setCategoriesLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = items.filter((i) => i._selected);

  const unmatched = useMemo(
    () => selected.filter((r) => r.categoryName && r._categoryChoice === CREATE_NEW),
    [selected]
  );

  const toggle = (id: number) => {
    setItems((prev) => prev.map((row) => (row._id === id ? { ...row, _selected: !row._selected } : row)));
  };

  const setCategoryChoice = (id: number, value: string) => {
    setItems((prev) => prev.map((row) => (row._id === id ? { ...row, _categoryChoice: value } : row)));
  };

  const handleConfirm = async () => {
    if (selected.length === 0) return;
    setLoading(true);
    setProgress(0);

    try {
      // Step 1: create any "Create new" categories in one batch, build a name -> zid id map.
      const newCategoryNames = Array.from(
        new Set(
          selected
            .filter((r) => r._categoryChoice === CREATE_NEW && r.categoryName)
            .map((r) => r.categoryName!.trim())
        )
      );

      const createdMap = new Map<string, string>(); // name (lowercased) -> zid categoryId
      if (newCategoryNames.length > 0) {
        try {
          const res = await fetch("/api/store/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId,
              categories: newCategoryNames.map((name) => ({ nameAr: name, nameEn: name })),
            }),
          });
          const data = await res.json();
          const created: Array<{ name_en?: string; name_ar?: string; platform_id?: string | null }> =
            Array.isArray(data?.categories) ? data.categories : [];
          for (const c of created) {
            const key = (c.name_en || c.name_ar || "").trim().toLowerCase();
            if (key && c.platform_id) createdMap.set(key, String(c.platform_id));
          }
        } catch (err) {
          console.error("[BulkProductCard] category creation failed:", err);
        }
      }

      // Step 2: push products one-by-one with resolved categoryId + imageUrl.
      for (let i = 0; i < selected.length; i++) {
        const p = selected[i];
        const categoryId = resolveCategoryId(p, createdMap);

        let ok = false;
        try {
          const res = await fetch("/api/store/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId,
              product: {
                nameAr: p.nameAr,
                nameEn: p.nameEn,
                descriptionAr: p.descriptionAr,
                descriptionEn: p.descriptionEn,
                price: p.price,
                variants: [],
                imageUrl: p.imageUrl,
                categoryId,
              },
            }),
          });
          ok = res.ok;
        } catch {
          ok = false;
        }

        setItems((prev) =>
          prev.map((row) => (row._id === p._id ? { ...row, _done: ok, _failed: !ok } : row))
        );
        setProgress(Math.round(((i + 1) / selected.length) * 100));
      }

      setConfirmed(true);
      onConfirm(
        selected.map(({ nameAr, nameEn, price, descriptionAr, descriptionEn, imageUrl, categoryName }) => ({
          nameAr,
          nameEn,
          price,
          descriptionAr,
          descriptionEn,
          imageUrl,
          categoryName,
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  if (confirmed) {
    const successCount = items.filter((i) => i._done).length;
    const failCount = items.filter((i) => i._failed).length;
    return (
      <div className="bg-gradient-to-r from-emerald-50 to-emerald-50/50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
        <div className="w-9 h-9 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center flex-shrink-0">
          <Check className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-700">
            {language === "en" ? "Bulk upload complete" : "اكتمل الرفع الجماعي"}
          </p>
          <p className="text-xs text-emerald-500 mt-0.5">
            {language === "en"
              ? `${successCount} added${failCount > 0 ? `, ${failCount} failed` : ""}`
              : `${successCount} أضيف${failCount > 0 ? `، ${failCount} فشل` : ""}`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-gradient-to-br from-violet-50 to-purple-50/60 border border-violet-100 rounded-2xl p-4 space-y-3 shadow-sm"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-100 border border-violet-200 flex items-center justify-center">
            <Package className="w-3.5 h-3.5 text-violet-600" />
          </div>
          <span className="text-sm font-semibold text-violet-800">
            {language === "en" ? "Bulk Products Preview" : "معاينة المنتجات الجماعية"}
          </span>
        </div>
        <span className="text-xs font-medium text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full border border-violet-200">
          {selected.length} {language === "en" ? "selected" : "محدد"}
        </span>
      </div>

      {/* Category banner — empty store = informational, populated store = warning */}
      {categoriesLoaded && unmatched.length > 0 && (
        liveCategories.length === 0 ? (
          <div className="flex items-start gap-2 bg-violet-50 border border-violet-200 rounded-xl px-3 py-2">
            <Sparkles className="w-3.5 h-3.5 text-violet-500 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-violet-700 leading-relaxed">
              {language === "en"
                ? `Your store has no categories yet. ${unmatched.length} new categor${unmatched.length > 1 ? "ies" : "y"} from your file will be created automatically.`
                : `متجرك لا يحتوي على فئات بعد. سيتم إنشاء ${unmatched.length} ${unmatched.length > 1 ? "فئات جديدة" : "فئة جديدة"} من ملفك تلقائيًا.`}
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-amber-700 leading-relaxed">
              {language === "en"
                ? `${unmatched.length} row${unmatched.length > 1 ? "s" : ""} reference a category not in your store. Pick an existing one or keep "Create new" to add it.`
                : `${unmatched.length} ${unmatched.length > 1 ? "صفوف تشير" : "صف يشير"} إلى فئة غير موجودة في متجرك. اختر فئة موجودة أو أبقِ "إنشاء جديدة" لإضافتها.`}
            </p>
          </div>
        )
      )}

      {/* Products table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden max-h-72 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="w-8 py-2 px-2" />
              <th className="w-10 py-2 px-2" />
              <th className="py-2 px-2 text-left font-semibold text-gray-500">
                {language === "en" ? "Name" : "الاسم"}
              </th>
              <th className="py-2 px-2 text-left font-semibold text-gray-500">
                {language === "en" ? "Category" : "الفئة"}
              </th>
              <th className="py-2 px-2 text-right font-semibold text-gray-500">
                {language === "en" ? "Price" : "السعر"}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map((item) => (
              <tr
                key={item._id}
                className={`transition-colors ${
                  item._failed
                    ? "bg-red-50"
                    : item._done
                    ? "bg-emerald-50"
                    : item._selected
                    ? "bg-white"
                    : "bg-gray-50 opacity-50"
                }`}
              >
                {/* Checkbox / status */}
                <td className="py-2 px-2 text-center align-middle">
                  {item._done ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500 mx-auto" />
                  ) : item._failed ? (
                    <span className="text-[10px] text-red-500 font-semibold">!</span>
                  ) : (
                    <button
                      onClick={() => toggle(item._id)}
                      disabled={loading}
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                        item._selected ? "border-violet-500 bg-violet-500" : "border-gray-300 bg-white"
                      }`}
                    >
                      {item._selected && <Check className="w-2.5 h-2.5 text-white" />}
                    </button>
                  )}
                </td>

                {/* Image thumbnail */}
                <td className="py-2 px-2 align-middle">
                  <Thumbnail url={item.imageUrl} />
                </td>

                {/* Name (primary + secondary) */}
                <td className="py-2 px-2 align-middle">
                  <div className="font-medium text-gray-700 truncate max-w-[160px]">
                    {language === "ar" ? item.nameAr : item.nameEn}
                  </div>
                  <div className="text-gray-400 truncate max-w-[160px]">
                    {language === "ar" ? item.nameEn : item.nameAr}
                  </div>
                </td>

                {/* Category dropdown */}
                <td className="py-2 px-2 align-middle">
                  <CategoryPicker
                    language={language}
                    row={item}
                    liveCategories={liveCategories}
                    disabled={loading}
                    onChange={(v) => setCategoryChoice(item._id, v)}
                  />
                </td>

                {/* Price */}
                <td className="py-2 px-2 text-right text-gray-700 font-medium whitespace-nowrap align-middle">
                  {item.price} <span className="text-gray-400">SAR</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Progress bar */}
      {loading && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>{language === "en" ? "Adding products..." : "جاري إضافة المنتجات..."}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-violet-600 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Confirm button — disabled until categories fetch settles to avoid a race
          where rows still show NO_CATEGORY before resolveChoice() runs */}
      <Button
        onClick={handleConfirm}
        disabled={loading || selected.length === 0 || !categoriesLoaded}
        className="w-full bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white text-sm font-semibold rounded-xl px-5 py-2.5 h-auto shadow-md shadow-violet-200/60 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 gap-2"
      >
        {loading ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {language === "en" ? "Adding..." : "جاري الإضافة..."}
          </>
        ) : !categoriesLoaded ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {language === "en" ? "Checking your store..." : "جاري فحص متجرك..."}
          </>
        ) : (
          <>
            <Package className="w-3.5 h-3.5" />
            {language === "en"
              ? `Add ${selected.length} Products to Store`
              : `إضافة ${selected.length} منتج للمتجر`}
          </>
        )}
      </Button>
    </div>
  );
}

function Thumbnail({ url }: { url?: string }) {
  const [errored, setErrored] = useState(false);
  if (!url || errored) {
    return (
      <div className="w-9 h-9 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
        <ImageOff className="w-3.5 h-3.5 text-gray-300" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      onError={() => setErrored(true)}
      className="w-9 h-9 rounded-lg object-cover border border-gray-200 bg-gray-50"
    />
  );
}

interface CategoryPickerProps {
  language: "en" | "ar";
  row: Row;
  liveCategories: ZidCategory[];
  disabled: boolean;
  onChange: (value: string) => void;
}

function CategoryPicker({ language, row, liveCategories, disabled, onChange }: CategoryPickerProps) {
  const hasRequestedName = !!row.categoryName;
  const isUnmatched = hasRequestedName && row._categoryChoice === CREATE_NEW;

  return (
    <div className="flex flex-col gap-0.5">
      <select
        value={row._categoryChoice}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`text-[11px] rounded-md border px-1.5 py-1 bg-white max-w-[140px] outline-none focus:ring-2 focus:ring-violet-200 ${
          isUnmatched ? "border-amber-300 text-amber-800" : "border-gray-200 text-gray-700"
        }`}
      >
        <option value={NO_CATEGORY}>
          {language === "en" ? "(No category)" : "(بدون فئة)"}
        </option>
        {liveCategories.map((c) => (
          <option key={c.id} value={c.id}>
            {language === "ar" ? c.nameAr : c.nameEn}
          </option>
        ))}
        {hasRequestedName && (
          <option value={CREATE_NEW}>
            {language === "en" ? `+ Create "${row.categoryName}"` : `+ إنشاء "${row.categoryName}"`}
          </option>
        )}
      </select>
      {hasRequestedName && isUnmatched && (
        <span className="text-[9px] text-amber-600 truncate max-w-[140px]">
          {language === "en" ? `from CSV: ${row.categoryName}` : `من الملف: ${row.categoryName}`}
        </span>
      )}
    </div>
  );
}

/**
 * Pick the best initial dropdown choice for a CSV row based on its categoryName.
 * Returns a live Zid category id if a case-insensitive ar/en match exists,
 * CREATE_NEW if a name was given but doesn't match anything,
 * or NO_CATEGORY (empty string) if no category name was provided.
 */
function resolveChoice(name: string | undefined, liveCategories: ZidCategory[]): string {
  if (!name) return NO_CATEGORY;
  const needle = name.trim().toLowerCase();
  if (!needle) return NO_CATEGORY;
  const match = liveCategories.find(
    (c) => c.nameAr.trim().toLowerCase() === needle || c.nameEn.trim().toLowerCase() === needle
  );
  if (match) return match.id;
  return CREATE_NEW;
}

/**
 * Resolve the final Zid category id for a row at submit time.
 * If the row chose CREATE_NEW, look it up in the createdMap we built
 * after POST /api/store/categories returned platform_ids.
 */
function resolveCategoryId(row: Row, createdMap: Map<string, string>): string | undefined {
  if (row._categoryChoice === CREATE_NEW) {
    const key = (row.categoryName || "").trim().toLowerCase();
    return createdMap.get(key);
  }
  return row._categoryChoice || undefined;
}
