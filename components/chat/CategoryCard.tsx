"use client";

import { useState } from "react";
import { Check, X, Plus, Tag, Sparkles, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AIAction } from "@/types";

interface CategoryCardProps {
  action: AIAction;
  sessionId: string;
  language: "en" | "ar";
  onConfirm: (categories: Array<{ nameAr: string; nameEn: string }>) => void;
}

export function CategoryCard({ action, sessionId, language, onConfirm }: CategoryCardProps) {
  const [categories, setCategories] = useState(action.data?.categories || []);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editVal, setEditVal] = useState("");
  const [newCatInput, setNewCatInput] = useState("");
  const [showAddInput, setShowAddInput] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const isRTL = language === "ar";

  const getLabel = (cat: { nameAr: string; nameEn: string }) =>
    isRTL ? cat.nameAr : cat.nameEn;

  const startEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditVal(getLabel(categories[idx]));
  };

  const saveEdit = (idx: number) => {
    setCategories((prev) =>
      prev.map((c, i) =>
        i === idx
          ? isRTL
            ? { ...c, nameAr: editVal }
            : { ...c, nameEn: editVal }
          : c
      )
    );
    setEditingIdx(null);
  };

  const removeCategory = (idx: number) => {
    setCategories((prev) => prev.filter((_, i) => i !== idx));
  };

  const addCategory = () => {
    if (!newCatInput.trim()) return;
    setCategories((prev) => [
      ...prev,
      { nameAr: newCatInput.trim(), nameEn: newCatInput.trim() },
    ]);
    setNewCatInput("");
    setShowAddInput(false);
  };

  const handleConfirm = async () => {
    if (categories.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/store/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories, sessionId }),
      });
      if (res.ok) {
        setConfirmed(true);
        onConfirm(categories);
      }
    } finally {
      setLoading(false);
    }
  };

  if (confirmed) {
    return (
      <div className="bg-gradient-to-r from-emerald-50 to-emerald-50/50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
        <div className="w-9 h-9 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center flex-shrink-0">
          <Check className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-700">
            {language === "en" ? "Categories created!" : "تم إنشاء الفئات!"}
          </p>
          <p className="text-xs text-emerald-500 mt-0.5">
            {categories.length}{" "}
            {language === "en" ? "categories added to your store" : "فئة أضيفت إلى متجرك"}
          </p>
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
            {language === "en" ? "Suggested Categories" : "الفئات المقترحة"}
          </span>
        </div>
        <Badge className="bg-violet-100 text-violet-600 border border-violet-200 text-xs font-medium px-2 py-0.5">
          {categories.length} {language === "en" ? "categories" : "فئات"}
        </Badge>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat, idx) =>
          editingIdx === idx ? (
            <div
              key={idx}
              className="flex items-center gap-1.5 bg-white rounded-xl border-2 border-violet-300 px-2.5 py-1.5 shadow-sm"
            >
              <input
                value={editVal}
                onChange={(e) => setEditVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveEdit(idx);
                  if (e.key === "Escape") setEditingIdx(null);
                }}
                className="text-sm bg-transparent outline-none text-gray-700 w-24 font-medium"
                autoFocus
              />
              <button onClick={() => saveEdit(idx)} className="text-emerald-500 hover:text-emerald-600 transition-colors">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setEditingIdx(null)} className="text-gray-400 hover:text-gray-500 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div
              key={idx}
              className="group flex items-center gap-1.5 bg-white rounded-xl border border-violet-100 px-3 py-1.5 shadow-sm hover:border-violet-200 hover:shadow-md transition-all"
            >
              <span className="text-sm font-medium text-gray-700">{getLabel(cat)}</span>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => startEdit(idx)} className="text-gray-300 hover:text-violet-500 transition-colors p-0.5 rounded">
                  <Pencil className="w-3 h-3" />
                </button>
                <button onClick={() => removeCategory(idx)} className="text-gray-300 hover:text-red-400 transition-colors p-0.5 rounded">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )
        )}

        {showAddInput ? (
          <div className="flex items-center gap-1.5 bg-white rounded-xl border-2 border-dashed border-violet-300 px-2.5 py-1.5">
            <input
              value={newCatInput}
              onChange={(e) => setNewCatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addCategory();
                if (e.key === "Escape") { setShowAddInput(false); setNewCatInput(""); }
              }}
              placeholder={language === "en" ? "Category name..." : "اسم الفئة..."}
              className="text-sm bg-transparent outline-none text-gray-700 w-28 placeholder:text-gray-300"
              autoFocus
            />
            <button onClick={addCategory} className="text-emerald-500 hover:text-emerald-600">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => { setShowAddInput(false); setNewCatInput(""); }} className="text-gray-400 hover:text-gray-500">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddInput(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl border border-dashed border-violet-200 text-sm text-violet-400 hover:text-violet-600 hover:border-violet-300 hover:bg-violet-50/50 transition-all font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            {language === "en" ? "Add category" : "إضافة فئة"}
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          onClick={handleConfirm}
          disabled={loading || categories.length === 0}
          className="bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white text-sm font-semibold rounded-xl px-5 py-2.5 h-auto shadow-md shadow-violet-200/60 transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:translate-y-0 gap-2"
        >
          {loading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {language === "en" ? "Creating..." : "جاري الإنشاء..."}
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              {language === "en" ? "Create These Categories" : "إنشاء هذه الفئات"}
            </>
          )}
        </Button>
        <Button
          variant="outline"
          className="text-sm rounded-xl px-4 py-2.5 h-auto border-violet-200 text-violet-600 hover:bg-violet-50 bg-white font-medium"
        >
          {language === "en" ? "Edit" : "تعديل"}
        </Button>
      </div>
    </div>
  );
}
