"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAppStore } from "@/store/useStore";
import { ChatMessage, AIAction } from "@/types";
import { MessageBubble, TypingIndicator } from "./MessageBubble";
import { ChatInput } from "./ChatInput";

interface ChatContainerProps {
  sessionId: string;
}

function generateId() {
  return Math.random().toString(36).slice(2);
}

const WELCOME_MESSAGES: Record<string, string> = {
  en: "Hello! I'm your LaunchKit AI assistant. I'm here to help you set up your online store step by step. To get started — what type of products do you sell? Tell me about your business!",
  ar: "مرحباً! أنا مساعد لاينش كيت الذكي. أنا هنا لمساعدتك في إعداد متجرك الإلكتروني خطوة بخطوة. للبدء — ما نوع المنتجات التي تبيعها؟ أخبرني عن نشاطك التجاري!",
};

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
  } = useAppStore();

  const scrollRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);

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

  // Initialize with welcome message
  useEffect(() => {
    if (!isInitialized.current && messages.length === 0) {
      isInitialized.current = true;
      addMessage({
        id: generateId(),
        role: "assistant",
        content: WELCOME_MESSAGES[language] || WELCOME_MESSAGES.en,
        timestamp: new Date(),
      });
    }
  }, [language, messages.length, addMessage]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: generateId(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    addMessage(userMsg);
    setIsTyping(true);

    try {
      // Build history for context (exclude welcome message)
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          sessionId,
          history,
        }),
      });

      if (!res.ok) throw new Error("API error");

      const data = await res.json();

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
      }
    } catch {
      addMessage({
        id: generateId(),
        role: "assistant",
        content:
          language === "en"
            ? "Sorry, I encountered an error. Please try again."
            : "عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.",
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

    // Send confirmation message to continue
    setTimeout(() => {
      handleSend(
        language === "en"
          ? `Great, I've confirmed ${newCategories.length} categories. Now let's add products.`
          : `تم تأكيد ${newCategories.length} فئات. الآن دعنا نضيف المنتجات.`
      );
    }, 500);
  };

  const handleProductConfirm = (product: unknown) => {
    const p = product as { nameAr: string; nameEn: string; descriptionAr?: string; descriptionEn?: string; price?: number; variants?: [] };
    addProduct({
      id: generateId(),
      session_id: sessionId,
      platform_id: null,
      name_ar: p.nameAr,
      name_en: p.nameEn,
      description_ar: p.descriptionAr || null,
      description_en: p.descriptionEn || null,
      price: p.price || 0,
      variants: p.variants || [],
      created_at: new Date().toISOString(),
    });

    if (products.length + 1 >= 3) {
      setCurrentStep("marketing");
      setCompletionPercentage(75);
    }
  };

  const handleImageUpload = (file: File) => {
    // Image upload handler — send a descriptive message
    handleSend(
      language === "en"
        ? `I uploaded an image of my product: ${file.name}`
        : `قمت برفع صورة منتجي: ${file.name}`
    );
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
