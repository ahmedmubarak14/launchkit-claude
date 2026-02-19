import { StoreTheme } from "@/types";

export const STORE_THEMES: StoreTheme[] = [
  {
    id: "desert-gold",
    nameEn: "Desert Gold",
    nameAr: "ذهب الصحراء",
    style: "elegant",
    colors: { primary: "#C9922A", secondary: "#F5E6C8", accent: "#8B6914" },
    descriptionEn: "Warm gold tones inspired by Arabian luxury",
    descriptionAr: "ألوان ذهبية دافئة مستوحاة من الرقي العربي",
  },
  {
    id: "ocean-blue",
    nameEn: "Ocean Blue",
    nameAr: "أزرق المحيط",
    style: "modern",
    colors: { primary: "#1E6FBF", secondary: "#E8F3FF", accent: "#0D4C8C" },
    descriptionEn: "Clean and professional, ideal for tech and fashion",
    descriptionAr: "نظيف واحترافي، مثالي للتقنية والأزياء",
  },
  {
    id: "midnight-black",
    nameEn: "Midnight Black",
    nameAr: "أسود منتصف الليل",
    style: "bold",
    colors: { primary: "#1A1A2E", secondary: "#F0F0F5", accent: "#7C3AED" },
    descriptionEn: "Bold and premium — makes products stand out",
    descriptionAr: "جريء وراقٍ — يجعل المنتجات تبرز",
  },
  {
    id: "rose-garden",
    nameEn: "Rose Garden",
    nameAr: "حديقة الورود",
    style: "elegant",
    colors: { primary: "#BE185D", secondary: "#FFF0F6", accent: "#9D174D" },
    descriptionEn: "Soft and feminine — perfect for beauty and gifts",
    descriptionAr: "ناعم وأنثوي — مثالي للجمال والهدايا",
  },
  {
    id: "sage-minimal",
    nameEn: "Sage Minimal",
    nameAr: "أخضر مريمية",
    style: "minimal",
    colors: { primary: "#4A7C59", secondary: "#F0F7F2", accent: "#2D5A3D" },
    descriptionEn: "Natural and calm — great for organic and wellness",
    descriptionAr: "طبيعي وهادئ — رائع للمنتجات العضوية والصحية",
  },
  {
    id: "royal-violet",
    nameEn: "Royal Violet",
    nameAr: "بنفسجي ملكي",
    style: "modern",
    colors: { primary: "#7C3AED", secondary: "#F5F0FF", accent: "#5B21B6" },
    descriptionEn: "Vibrant and modern — bold identity for any store",
    descriptionAr: "نابض بالحياة وحديث — هوية جريئة لأي متجر",
  },
];

export function getThemeById(id: string): StoreTheme | undefined {
  return STORE_THEMES.find((t) => t.id === id);
}
