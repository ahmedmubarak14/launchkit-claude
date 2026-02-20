"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useAppStore } from "@/store/useStore";
import { ChatMessage, AIAction, BulkProductItem, ZidCategory } from "@/types";
import { MessageBubble, TypingIndicator } from "./MessageBubble";
import { ChatInput } from "./ChatInput";

interface ChatContainerProps {
  sessionId: string;
}

function generateId() {
  return Math.random().toString(36).slice(2);
}

export function ChatContainer({ sessionId }: ChatContainerProps) {
  const {
    messages,
    addMessage,
    isTyping,
    setIsTyping,
    language,
    currentStep,
    setCurrentStep,
    setCompletionPercentage,
    categories,
    addCategory,
    products,
    addProduct,

    setLogoUrl,
  } = useAppStore();

  const scrollRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);

  // Live Zid categories fetched on mount
  const [zidCategories, setZidCategories] = useState<ZidCategory[]>([]);
  const [zidCategoriesFetched, setZidCategoriesFetched] = useState(false);

  // Scroll to bottom whenever messages change or typing starts
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  // Fetch live categories from Zid on mount
  useEffect(() => {
    if (zidCategoriesFetched) return;
    setZidCategoriesFetched(true);

    fetch("/api/store/categories/zid")
      .then((r) => r.json())
      .then((data) => {
        if (data.categories && data.categories.length > 0) {
          setZidCategories(data.categories);
        }
      })
      .catch(() => {/* silently fail — store may not be connected yet */ });
  }, [zidCategoriesFetched]);

  // Build the smart welcome message
  const buildWelcomeMessage = useCallback((cats: ZidCategory[]) => {
    if (cats.length > 0) {
      const catList = cats.slice(0, 5).map((c) => (language === "ar" ? c.nameAr : c.nameEn)).join(", ");
      const more = cats.length > 5 ? (language === "en" ? ` and ${cats.length - 5} more` : ` و${cats.length - 5} أخرى`) : "";
      return language === "en"
        ? `Hello! I'm your LaunchKit AI assistant. I can see your Zid store already has ${cats.length} categories: ${catList}${more}. Tell me about your business and I'll help you review, improve, and expand your store setup!`
        : `مرحباً! أنا مساعد لاينش كيت الذكي. أرى أن متجرك على زد يحتوي على ${cats.length} فئات: ${catList}${more}. أخبرني عن نشاطك التجاري وسأساعدك في مراجعة وتحسين وتوسيع إعداد متجرك!`;
    }
    return language === "en"
      ? "Hello! I'm your LaunchKit AI assistant. I'm here to help you set up your online store step by step. To get started — what type of products do you sell? Tell me about your business!"
      : "مرحباً! أنا مساعد لاينش كيت الذكي. أنا هنا لمساعدتك في إعداد متجرك الإلكتروني خطوة بخطوة. للبدء — ما نوع المنتجات التي تبيعها؟ أخبرني عن نشاطك التجاري!";
  }, [language]);

  // Initialize with smart welcome message (wait briefly for zid categories fetch)
  useEffect(() => {
    if (isInitialized.current || messages.length > 0) return;

    // Wait up to 800ms for Zid categories to arrive, then show welcome
    const timer = setTimeout(() => {
      if (isInitialized.current) return;
      isInitialized.current = true;
      addMessage({
        id: generateId(),
        role: "assistant",
        content: buildWelcomeMessage(zidCategories),
        timestamp: new Date(),
      });
    }, 800);

    return () => clearTimeout(timer);
  }, [language, messages.length, addMessage, buildWelcomeMessage, zidCategories]);

  // Build context string about existing Zid categories to inject into every AI call
  const buildCategoryContext = useCallback((): string => {
    if (zidCategories.length === 0) return "";
    const list = zidCategories
      .map((c) => `- ${c.nameAr} / ${c.nameEn}${c.productsCount > 0 ? ` (${c.productsCount} products)` : ""}`)
      .join("\n");
    return `\n\n[STORE CONTEXT — existing Zid categories (${zidCategories.length} total)]:\n${list}\nConsider these when making suggestions. Don't re-suggest categories that already exist unless improving them.`;
  }, [zidCategories]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: generateId(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    addMessage(userMsg);
    setIsTyping(true);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Append category context to the message so AI knows what's already in the store
      const categoryContext = buildCategoryContext();
      const enrichedMessage = categoryContext ? `${text}${categoryContext}` : text;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: enrichedMessage,
          sessionId,
          history,
          // Pass existing category count as metadata for smart prompting
          storeContext: {
            existingCategoryCount: zidCategories.length,
            existingCategories: zidCategories.map((c) => ({ id: c.id, nameAr: c.nameAr, nameEn: c.nameEn })),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const detail = data?.detail || data?.error || "Unknown error";
        console.error("[chat] API error detail:", detail);
        throw new Error(detail);
      }

      // If AI returns suggest_categories, inject the live Zid categories into the action data
      // so CategoryCard can show "existing" vs "new to add"
      if (data.action?.type === "suggest_categories" && zidCategories.length > 0) {
        data.action.data = {
          ...data.action.data,
          existingCategories: zidCategories,
        };
      }

      const aiMsg: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: data.message,
        action: data.action as AIAction,
        timestamp: new Date(),
      };
      addMessage(aiMsg);

      // Advance step based on action
      if (data.action?.type === "suggest_categories" && currentStep === "business") {
        setCurrentStep("categories");
        setCompletionPercentage(25);
      } else if (data.action?.type === "preview_product" && currentStep === "categories") {
        setCurrentStep("products");
        setCompletionPercentage(50);
      } else if (data.action?.type === "bulk_products" && currentStep === "categories") {
        setCurrentStep("products");
        setCompletionPercentage(50);
      } else if (data.action?.type === "suggest_themes") {
        setCurrentStep("marketing");
        setCompletionPercentage(75);
      } else if (data.action?.type === "generate_logo") {
        setCompletionPercentage(88);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      addMessage({
        id: generateId(),
        role: "assistant",
        content:
          language === "en"
            ? `Sorry, I encountered an error: ${errMsg}`
            : `عذراً، حدث خطأ: ${errMsg}`,
        timestamp: new Date(),
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleCategoryConfirm = (newCategories: Array<{ nameAr: string; nameEn: string }>) => {
    newCategories.forEach((cat) => {
      addCategory({
        id: generateId(),
        session_id: sessionId,
        platform_id: null,
        name_ar: cat.nameAr,
        name_en: cat.nameEn,
        created_at: new Date().toISOString(),
      });
    });
    setCurrentStep("products");
    setCompletionPercentage(50);

    setTimeout(() => {
      const addedCount = newCategories.length;
      handleSend(
        language === "en"
          ? `Categories updated! Added ${addedCount} new categories. Now let's add products.`
          : `تم تحديث الفئات! أضفت ${addedCount} فئات جديدة. الآن دعنا نضيف المنتجات.`
      );
    }, 500);
  };

  const handleProductConfirm = (product: unknown) => {
    const p = product as {
      nameAr?: string;
      nameEn?: string;
      name_ar?: string;
      name_en?: string;
      descriptionAr?: string;
      descriptionEn?: string;
      description_ar?: string;
      description_en?: string;
      price?: number;
      variants?: [];
      id?: string;
      created_at?: string;
    };

    const nameAr = p.nameAr || p.name_ar || "";
    const nameEn = p.nameEn || p.name_en || "";

    addProduct({
      id: p.id || generateId(),
      session_id: sessionId,
      platform_id: null,
      name_ar: nameAr,
      name_en: nameEn,
      description_ar: p.descriptionAr || p.description_ar || null,
      description_en: p.descriptionEn || p.description_en || null,
      price: p.price || 0,
      variants: p.variants || [],
      created_at: p.created_at || new Date().toISOString(),
    });

    if (products.length + 1 >= 3) {
      setCurrentStep("marketing");
      setCompletionPercentage(75);
    }
  };

  const handleImageUpload = (file: File) => {
    handleSend(
      language === "en"
        ? `I uploaded an image of my product: ${file.name}`
        : `قمت برفع صورة منتجي: ${file.name}`
    );
  };

  const handleThemeConfirm = (_data: unknown) => {
    // Theme is now chosen externally via Zid dashboard — no theme object passed back
    setCompletionPercentage(88);
    setTimeout(() => {
      handleSend(
        language === "en"
          ? "Theme chosen! Now let's create a logo for your store."
          : "تم اختيار الثيم! الآن لننشئ شعارًا لمتجرك."
      );
    }, 500);
  };

  const handleLogoConfirm = (url: string) => {
    setLogoUrl(url);
    setCompletionPercentage(100);
    setTimeout(() => {
      handleSend(
        language === "en"
          ? "Logo saved! Your store is now fully set up. What else would you like to do?"
          : "تم حفظ الشعار! متجرك الآن مُعدّ بالكامل. ماذا تريد أن تفعل بعد ذلك؟"
      );
    }, 500);
  };

  const handleBulkProductsConfirm = (confirmedProducts: BulkProductItem[]) => {
    confirmedProducts.forEach((p) => {
      addProduct({
        id: generateId(),
        session_id: sessionId,
        platform_id: null,
        name_ar: p.nameAr,
        name_en: p.nameEn,
        description_ar: p.descriptionAr || null,
        description_en: p.descriptionEn || null,
        price: p.price,
        variants: [],
        created_at: new Date().toISOString(),
      });
    });
    if (products.length + confirmedProducts.length >= 3) {
      setCurrentStep("marketing");
      setCompletionPercentage(75);
    }
  };

  const handleLandingPageConfirm = (landingPageData: any) => {
    // In a real app we'd save this generated layout to the DB
    // For now we just acknowledge it and move the progress bar
    setCompletionPercentage(95);
    setTimeout(() => {
      handleSend(
        language === "en"
          ? "I've saved your landing page layout! Is there anything else you'd like to do to set up your store today?"
          : "لقد حفظت تخطيط صفحتك المقصودة! هل هناك أي شيء آخر تود القيام به لإعداد متجرك اليوم؟"
      );
    }, 500);
  };

  const handleCSVUpload = (parsedProducts: BulkProductItem[]) => {
    const bulkMsg: ChatMessage = {
      id: generateId(),
      role: "assistant",
      content:
        language === "en"
          ? `I found ${parsedProducts.length} products in your CSV. Review them below and click "Add to Store" to create them all.`
          : `وجدت ${parsedProducts.length} منتج في ملف CSV الخاص بك. راجعها أدناه واضغط "إضافة للمتجر" لإنشائها.`,
      action: {
        type: "bulk_products",
        data: { products: parsedProducts },
      },
      timestamp: new Date(),
    };
    addMessage(bulkMsg);
  };

  const isFirstMessage = messages.length <= 1;

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-4"
        style={{ scrollBehavior: "smooth" }}
      >
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            sessionId={sessionId}
            language={language}
            onCategoryConfirm={handleCategoryConfirm}
            onProductConfirm={handleProductConfirm}
            onThemeConfirm={handleThemeConfirm}
            onLogoConfirm={handleLogoConfirm}
            onBulkProductsConfirm={handleBulkProductsConfirm}
            onLandingPageConfirm={handleLandingPageConfirm}
          />
        ))}

        {isTyping && <TypingIndicator language={language} />}

        {/* Anchor for scroll-to-bottom */}
        <div />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-100 p-4 bg-white/80 backdrop-blur-sm">
        <ChatInput
          onSend={handleSend}
          onImageUpload={handleImageUpload}
          onCSVUpload={handleCSVUpload}
          disabled={isTyping}
          language={language}
          showQuickChips={isFirstMessage}
        />
        <p className="text-center text-[10px] text-gray-300 mt-2">
          {language === "en"
            ? "Press Enter to send · Shift+Enter for new line"
            : "اضغط Enter للإرسال · Shift+Enter لسطر جديد"}
        </p>
      </div>
    </div>
  );
}
