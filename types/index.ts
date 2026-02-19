export type Language = "en" | "ar";

export interface Profile {
  id: string;
  email: string;
  name: string | null;
  preferred_language: Language;
  created_at: string;
}

export interface Store {
  id: string;
  user_id: string;
  platform: "zid" | "salla" | "shopify";
  access_token: string;
  refresh_token: string | null;
  store_name: string;
  store_id: string | null;
  logo_url?: string | null;
  theme_id?: string | null;
  created_at: string;
}

export interface SetupSession {
  id: string;
  store_id: string;
  status: "pending" | "in_progress" | "completed";
  current_step: "business" | "categories" | "products" | "marketing";
  completion_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Category {
  id: string;
  session_id: string;
  platform_id: string | null;
  name_ar: string;
  name_en: string;
  created_at: string;
}

export interface Product {
  id: string;
  session_id: string;
  platform_id: string | null;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  price: number;
  variants: ProductVariant[];
  created_at: string;
}

export interface ProductVariant {
  name_ar: string;
  name_en: string;
  options: string[];
}

// ─── Zid Live Category (fetched from merchant's store) ────────────────────────
export interface ZidCategory {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string | null;
  productsCount: number;
}

// ─── New: Theme ────────────────────────────────────────────────────────────────
export interface StoreTheme {
  id: string;
  nameEn: string;
  nameAr: string;
  style: "modern" | "minimal" | "bold" | "elegant";
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  descriptionEn: string;
  descriptionAr: string;
}

// ─── New: Bulk Product ─────────────────────────────────────────────────────────
export interface BulkProductItem {
  nameAr: string;
  nameEn: string;
  price: number;
  descriptionAr?: string;
  descriptionEn?: string;
}

// ─── New: Logo Config ──────────────────────────────────────────────────────────
export interface LogoConfig {
  storeName: string;
  storeNameAr?: string;
  primaryColor: string;
  style: "initials" | "wordmark" | "icon+text";
}

// ─── AI Actions ────────────────────────────────────────────────────────────────
export interface AIAction {
  type:
  | "none"
  | "suggest_categories"
  | "preview_product"
  | "preview_coupon"
  | "suggest_themes"
  | "generate_logo"
  | "bulk_products"
  | "generate_landing_page";
  data?: {
    // Existing
    categories?: Array<{ nameAr: string; nameEn: string }>;
    nameAr?: string;
    nameEn?: string;
    descriptionAr?: string;
    descriptionEn?: string;
    price?: number;
    variants?: ProductVariant[];
    imagePrompt?: string;
    // Theme
    themes?: StoreTheme[];
    // Logo
    storeName?: string;
    primaryColor?: string;
    logoPrompt?: string;
    // Bulk products
    products?: BulkProductItem[];
    // Existing Zid categories (for smart category review mode)
    existingCategories?: ZidCategory[];
  };
}

export interface AIResponse {
  message: string;
  action: AIAction;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  action?: AIAction;
  timestamp: Date;
}

export type SetupStep = "business" | "categories" | "products" | "marketing";

export interface StepInfo {
  id: SetupStep;
  label_en: string;
  label_ar: string;
  icon: string;
}
