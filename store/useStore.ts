import { create } from "zustand";
import { Language, ChatMessage, SetupStep, Category, Product, StoreTheme, BulkProductItem } from "@/types";

interface AppState {
  // Language
  language: Language;
  setLanguage: (lang: Language) => void;

  // Chat
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
  isTyping: boolean;
  setIsTyping: (typing: boolean) => void;

  // Setup Progress
  currentStep: SetupStep;
  setCurrentStep: (step: SetupStep) => void;
  completionPercentage: number;
  setCompletionPercentage: (pct: number) => void;

  // Session
  sessionId: string | null;
  setSessionId: (id: string | null) => void;

  // Store
  storeConnected: boolean;
  setStoreConnected: (connected: boolean) => void;
  storeName: string | null;
  setStoreName: (name: string | null) => void;

  // Created items
  categories: Category[];
  setCategories: (cats: Category[]) => void;
  addCategory: (cat: Category) => void;
  products: Product[];
  setProducts: (prods: Product[]) => void;
  addProduct: (prod: Product) => void;

  // Theme
  selectedTheme: StoreTheme | null;
  setSelectedTheme: (theme: StoreTheme | null) => void;

  // Logo
  logoUrl: string | null;
  setLogoUrl: (url: string | null) => void;

  // Bulk products pending confirmation
  pendingBulkProducts: BulkProductItem[];
  setPendingBulkProducts: (products: BulkProductItem[]) => void;
  clearPendingBulkProducts: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Language
  language: "en",
  setLanguage: (lang) => set({ language: lang }),

  // Chat
  messages: [],
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  clearMessages: () => set({ messages: [] }),
  isTyping: false,
  setIsTyping: (typing) => set({ isTyping: typing }),

  // Setup Progress
  currentStep: "business",
  setCurrentStep: (step) => set({ currentStep: step }),
  completionPercentage: 0,
  setCompletionPercentage: (pct) => set({ completionPercentage: pct }),

  // Session
  sessionId: null,
  setSessionId: (id) => set({ sessionId: id }),

  // Store
  storeConnected: false,
  setStoreConnected: (connected) => set({ storeConnected: connected }),
  storeName: null,
  setStoreName: (name) => set({ storeName: name }),

  // Created items
  categories: [],
  setCategories: (cats) => set({ categories: cats }),
  addCategory: (cat) =>
    set((state) => ({ categories: [...state.categories, cat] })),
  products: [],
  setProducts: (prods) => set({ products: prods }),
  addProduct: (prod) =>
    set((state) => ({ products: [...state.products, prod] })),

  // Theme
  selectedTheme: null,
  setSelectedTheme: (theme) => set({ selectedTheme: theme }),

  // Logo
  logoUrl: null,
  setLogoUrl: (url) => set({ logoUrl: url }),

  // Bulk products
  pendingBulkProducts: [],
  setPendingBulkProducts: (products) => set({ pendingBulkProducts: products }),
  clearPendingBulkProducts: () => set({ pendingBulkProducts: [] }),
}));
