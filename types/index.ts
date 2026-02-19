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

export interface AIAction {
  type: "none" | "suggest_categories" | "preview_product" | "preview_coupon";
  data?: {
    categories?: Array<{ nameAr: string; nameEn: string }>;
    nameAr?: string;
    nameEn?: string;
    descriptionAr?: string;
    descriptionEn?: string;
    price?: number;
    variants?: ProductVariant[];
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
