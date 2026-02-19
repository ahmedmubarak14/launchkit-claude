"use client";

import { useState } from "react";
import { Check, X, Plus, Tag, Sparkles, Pencil, Trash2, ShieldCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AIAction, ZidCategory } from "@/types";

interface CategoryCardProps {
  action: AIAction;
  sessionId: string;
  language: "en" | "ar";
  onConfirm: (categories: Array<{ nameAr: string; nameEn: string }>) => void;
}

type ExistingCatState = "keep" | "edit" | "remove";

interface ManagedExisting extends ZidCategory {
  state: ExistingCatState;
  editedNameAr: string;
  editedNameEn: string;
  isUpdating?: boolean;
}

interface NewCat {
  nameAr: string;
  nameEn: string;
}

export function CategoryCard({ action, sessionId, language, onConfirm }: CategoryCardProps) {
  const isRTL = language === "ar";

  // ── Existing Zid categories (may be undefined if none yet) ────────────────
  const rawExisting = action.data?.existingCategories || [];
  const [existing, setExisting] = useState<ManagedExisting[]>(
    rawExisting.map((c) => ({
      ...c,
      state: "keep" as ExistingCatState,
      editedNameAr: c.nameAr,
      editedNameEn: c.nameEn,
    }))
  );

  // ── AI-suggested new categories ────────────────────────────────────────────
  const [suggested, setSuggested] = useState<NewCat[]>(action.data?.categories || []);

  // ── "Add new" UI state ─────────────────────────────────────────────────────
  const [showAddInput, setShowAddInput] = useState(false);
  const [newCatInput, setNewCatInput] = useState("");
  const [editingNewIdx, setEditingNewIdx] = useState<number | null>(null);
  const [editNewVal, setEditNewVal] = useState("");

  // ── Confirm state ──────────────────────────────────────────────────────────
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  const getExistingLabel = (cat: ManagedExisting) =>
    isRTL ? cat.editedNameAr : cat.editedNameEn;

  const getSuggestedLabel = (cat: NewCat) =>
    isRTL ? cat.nameAr : cat.nameEn;

  // ── Existing category actions ──────────────────────────────────────────────
  const setExistingState = (id: string, state: ExistingCatState) => {
    setExisting((prev) => prev.map((c) => (c.id === id ? { ...c, state } : c)));
  };

  const startEditExisting = (id: string) => {
    setExisting((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        return { ...c, state: "edit" };
      })
    );
  };

  const saveEditExisting = (id: string, arVal: string, enVal: string) => {
    setExisting((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, editedNameAr: arVal || c.editedNameAr, editedNameEn: enVal || c.editedNameEn, state: "keep" }
          : c
      )
    );
  };

  // ── Suggested category actions ─────────────────────────────────────────────
  const removeSuggested = (idx: number) =>
    setSuggested((prev) => prev.filter((_, i) => i !== idx));

  const startEditNew = (idx: number) => {
    setEditingNewIdx(idx);
    setEditNewVal(getSuggestedLabel(suggested[idx]));
  };

  const saveEditNew = (idx: number) => {
    setSuggested((prev) =>
      prev.map((c, i) =>
        i === idx
          ? isRTL
            ? { ...c, nameAr: editNewVal }
            : { ...c, nameEn: editNewVal }
          : c
      )
    );
    setEditingNewIdx(null);
  };

  const addNew = () => {
    const v = newCatInput.trim();
    if (!v) return;
    setSuggested((prev) => [...prev, { nameAr: v, nameEn: v }]);
    setNewCatInput("");
    setShowAddInput(false);
  };

  // ── Confirm handler ────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    setLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_APP_URL || "";

      // 1. Update edited existing categories in Zid
      const editedCats = existing.filter((c) => c.state === "keep" && (c.editedNameAr !== c.nameAr || c.editedNameEn !== c.nameEn));
      for (const cat of editedCats) {
        try {
          await fetch("/api/store/categories/zid", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ categoryId: cat.id, nameAr: cat.editedNameAr, nameEn: cat.editedNameEn }),
          });
        } catch { /* non-fatal */ }
      }

      // 2. Delete removed categories from Zid
      const removedCats = existing.filter((c) => c.state === "remove");
      for (const cat of removedCats) {
        try {
          await fetch("/api/store/categories/zid", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ categoryId: cat.id }),
          });
        } catch { /* non-fatal */ }
      }

      // 3. Create new suggested categories
      if (suggested.length > 0) {
        await fetch("/api/store/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categories: suggested, sessionId }),
        });
      }

      setConfirmed(true);
      onConfirm(suggested);
    } finally {
      setLoading(false);
    }
  };

  const keptCount = existing.filter((c) => c.state !== "remove").length;
  const removedCount = existing.filter((c) => c.state === "remove").length;
  const totalAfter = keptCount + suggested.length;
  const hasExisting = existing.length > 0;

  // ── Confirmed state ────────────────────────────────────────────────────────
  if (confirmed) {
    return (
      <div className="bg-gradient-to-r from-emerald-50 to-emerald-50/50 border border-emerald-200 rounded-2xl p-4 shadow-sm" dir={isRTL ? "rtl" : "ltr"}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center flex-shrink-0">
            <Check className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-700">
              {language === "en" ? "Categories updated!" : "تم تحديث الفئات!"}
            </p>
            <p className="text-xs text-emerald-500 mt-0.5">
              {language === "en"
                ? `${keptCount} kept · ${suggested.length} added · ${removedCount} removed`
                : `${keptCount} محتفظ بها · ${suggested.length} مضافة · ${removedCount} محذوفة`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-gradient-to-br from-violet-50 to-purple-50/60 border border-violet-100 rounded-2xl p-4 space-y-4 shadow-sm"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-100 border border-violet-200 flex items-center justify-center">
            <Tag className="w-3.5 h-3.5 text-violet-600" />
          </div>
          <span className="text-sm font-semibold text-violet-800">
            {hasExisting
              ? language === "en" ? "Review Your Categories" : "راجع فئاتك"
              : language === "en" ? "Suggested Categories" : "الفئات المقترحة"}
          </span>
        </div>
        <Badge className="bg-violet-100 text-violet-600 border border-violet-200 text-xs font-medium px-2 py-0.5">
          {totalAfter} {language === "en" ? "total" : "إجمالي"}
        </Badge>
      </div>

      {/* ── EXISTING CATEGORIES SECTION ──────────────────────────────────── */}
      {hasExisting && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {language === "en" ? `In your store (${existing.length})` : `في متجرك (${existing.length})`}
          </p>
          <div className="space-y-1.5">
            {existing.map((cat) => (
              <ExistingCategoryRow
                key={cat.id}
                cat={cat}
                isRTL={isRTL}
                language={language}
                onSetState={setExistingState}
                onStartEdit={startEditExisting}
                onSaveEdit={saveEditExisting}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── SUGGESTED / NEW CATEGORIES SECTION ───────────────────────────── */}
      {(suggested.length > 0 || showAddInput) && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {language === "en" ? "New to add" : "جديدة للإضافة"}
          </p>
          <div className="flex flex-wrap gap-2">
            {suggested.map((cat, idx) =>
              editingNewIdx === idx ? (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 bg-white rounded-xl border-2 border-violet-300 px-2.5 py-1.5 shadow-sm"
                >
                  <input
                    value={editNewVal}
                    onChange={(e) => setEditNewVal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEditNew(idx);
                      if (e.key === "Escape") setEditingNewIdx(null);
                    }}
                    className="text-sm bg-transparent outline-none text-gray-700 w-24 font-medium"
                    autoFocus
                  />
                  <button onClick={() => saveEditNew(idx)} className="text-emerald-500 hover:text-emerald-600">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setEditingNewIdx(null)} className="text-gray-400 hover:text-gray-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div
                  key={idx}
                  className="group flex items-center gap-1.5 bg-white rounded-xl border border-violet-100 px-3 py-1.5 shadow-sm hover:border-violet-200 hover:shadow-md transition-all"
                >
                  <span className="text-sm font-medium text-gray-700">{getSuggestedLabel(cat)}</span>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEditNew(idx)} className="text-gray-300 hover:text-violet-500 transition-colors p-0.5 rounded">
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button onClick={() => removeSuggested(idx)} className="text-gray-300 hover:text-red-400 transition-colors p-0.5 rounded">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )
            )}

            {/* Add new input */}
            {showAddInput ? (
              <div className="flex items-center gap-1.5 bg-white rounded-xl border-2 border-dashed border-violet-300 px-2.5 py-1.5">
                <input
                  value={newCatInput}
                  onChange={(e) => setNewCatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addNew();
                    if (e.key === "Escape") { setShowAddInput(false); setNewCatInput(""); }
                  }}
                  placeholder={language === "en" ? "Category name..." : "اسم الفئة..."}
                  className="text-sm bg-transparent outline-none text-gray-700 w-28 placeholder:text-gray-300"
                  autoFocus
                />
                <button onClick={addNew} className="text-emerald-500 hover:text-emerald-600">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => { setShowAddInput(false); setNewCatInput(""); }} className="text-gray-400 hover:text-gray-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Add category button */}
      <button
        onClick={() => setShowAddInput(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl border border-dashed border-violet-200 text-sm text-violet-400 hover:text-violet-600 hover:border-violet-300 hover:bg-violet-50/50 transition-all font-medium"
      >
        <Plus className="w-3.5 h-3.5" />
        {language === "en" ? "Add category" : "إضافة فئة"}
      </button>

      {/* Stats bar */}
      {hasExisting && (
        <div className="flex gap-3 text-[11px] font-medium pt-1">
          <span className="flex items-center gap-1 text-emerald-600">
            <ShieldCheck className="w-3 h-3" />
            {keptCount} {language === "en" ? "kept" : "محتفظ"}
          </span>
          <span className="flex items-center gap-1 text-violet-600">
            <Plus className="w-3 h-3" />
            {suggested.length} {language === "en" ? "new" : "جديد"}
          </span>
          {removedCount > 0 && (
            <span className="flex items-center gap-1 text-red-400">
              <Trash2 className="w-3 h-3" />
              {removedCount} {language === "en" ? "removed" : "محذوف"}
            </span>
          )}
        </div>
      )}

      {/* Confirm button */}
      <Button
        onClick={handleConfirm}
        disabled={loading || totalAfter === 0}
        className="bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white text-sm font-semibold rounded-xl px-5 py-2.5 h-auto shadow-md shadow-violet-200/60 transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:translate-y-0 gap-2"
      >
        {loading ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {language === "en" ? "Saving..." : "جاري الحفظ..."}
          </>
        ) : (
          <>
            <Sparkles className="w-3.5 h-3.5" />
            {hasExisting
              ? language === "en" ? "Apply Changes" : "تطبيق التغييرات"
              : language === "en" ? "Create These Categories" : "إنشاء هذه الفئات"}
          </>
        )}
      </Button>
    </div>
  );
}

// ── Sub-component: single existing category row ───────────────────────────────
function ExistingCategoryRow({
  cat,
  isRTL,
  language,
  onSetState,
  onStartEdit,
  onSaveEdit,
}: {
  cat: ManagedExisting;
  isRTL: boolean;
  language: "en" | "ar";
  onSetState: (id: string, state: ExistingCatState) => void;
  onStartEdit: (id: string) => void;
  onSaveEdit: (id: string, ar: string, en: string) => void;
}) {
  const [arVal, setArVal] = useState(cat.editedNameAr);
  const [enVal, setEnVal] = useState(cat.editedNameEn);

  const displayName = isRTL ? cat.editedNameAr : cat.editedNameEn;

  const stateColors: Record<ExistingCatState, string> = {
    keep: "border-gray-100 bg-white",
    edit: "border-violet-300 bg-violet-50",
    remove: "border-red-200 bg-red-50 opacity-60",
  };

  if (cat.state === "edit") {
    return (
      <div className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 ${stateColors.edit}`}>
        <RefreshCw className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
        <div className="flex-1 flex gap-2">
          <input
            value={arVal}
            onChange={(e) => setArVal(e.target.value)}
            placeholder="عربي"
            className="flex-1 text-sm bg-transparent outline-none text-gray-700 border-b border-violet-200 pb-0.5 placeholder:text-gray-300"
          />
          <input
            value={enVal}
            onChange={(e) => setEnVal(e.target.value)}
            placeholder="English"
            className="flex-1 text-sm bg-transparent outline-none text-gray-700 border-b border-violet-200 pb-0.5 placeholder:text-gray-300"
          />
        </div>
        <button
          onClick={() => onSaveEdit(cat.id, arVal, enVal)}
          className="text-emerald-500 hover:text-emerald-600 p-1 rounded-lg hover:bg-emerald-50"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onSetState(cat.id, "keep")}
          className="text-gray-400 hover:text-gray-500 p-1 rounded-lg hover:bg-gray-100"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 transition-all ${stateColors[cat.state]}`}>
      {/* Status icon */}
      {cat.state === "remove" ? (
        <Trash2 className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
      ) : (
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
      )}

      {/* Name */}
      <span className={`flex-1 text-sm font-medium ${cat.state === "remove" ? "line-through text-gray-400" : "text-gray-700"}`}>
        {displayName}
      </span>

      {/* Products count badge */}
      {cat.productsCount > 0 && (
        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
          {cat.productsCount} {language === "en" ? "products" : "منتج"}
        </span>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-1">
        {cat.state === "remove" ? (
          <button
            onClick={() => onSetState(cat.id, "keep")}
            className="text-xs text-gray-500 hover:text-emerald-600 font-medium px-2 py-0.5 rounded-lg hover:bg-emerald-50 transition-colors"
          >
            {language === "en" ? "Undo" : "تراجع"}
          </button>
        ) : (
          <>
            <button
              onClick={() => onStartEdit(cat.id)}
              className="p-1 rounded-lg text-gray-300 hover:text-violet-500 hover:bg-violet-50 transition-colors"
              title={language === "en" ? "Edit" : "تعديل"}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onSetState(cat.id, "remove")}
              className="p-1 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
              title={language === "en" ? "Remove" : "حذف"}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
