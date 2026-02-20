/**
 * landing-page-builder.ts
 *
 * Compiles an AI-generated landing page layout into a self-contained
 * HTML+CSS+JS string that can be injected into the Zid storefront via
 * the App Scripts API (script.src_code).
 *
 * The script inserts a sticky hero banner section at the very top of
 * the homepage body, immediately after <body> / before existing content.
 * It only runs on the store root URL (/) so it doesn't interfere with
 * product or category pages.
 */

export interface HeroSection {
  headline: string;
  headlineAr?: string;
  subheadline: string;
  subheadlineAr?: string;
  cta: string;
  ctaAr?: string;
}

export interface FeatureItem {
  icon: string;
  title: string;
  titleAr?: string;
  description: string;
  descriptionAr?: string;
}

export interface TestimonialItem {
  quote: string;
  quoteAr?: string;
  author: string;
  rating?: number;
}

export interface PromoSection {
  headline: string;
  headlineAr?: string;
  discount?: string;
  code?: string;
  cta?: string;
  ctaAr?: string;
}

export interface LandingPageLayout {
  storeName?: string;
  storeNameAr?: string;
  primaryColor?: string;
  hero?: HeroSection;
  features?: FeatureItem[];
  testimonials?: TestimonialItem[];
  promo?: PromoSection;
  categories?: Array<{ name: string; nameAr?: string }>;
  seoTitle?: string;
  seoDescription?: string;
}

/** Convert a hex color to rgba with alpha */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Escape strings for safe HTML embedding */
function esc(s: string | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** SVG icons for feature badges */
function getIconSvg(name: string, color: string): string {
  const fill = esc(color);
  switch ((name || "").toLowerCase()) {
    case "truck":
    case "shipping":
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${fill}" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="1"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`;
    case "shield":
    case "secure":
    case "payment":
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${fill}" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
    case "gift":
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${fill}" stroke-width="2"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5" rx="1"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>`;
    case "tag":
    case "discount":
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${fill}" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`;
    case "star":
    case "quality":
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="${fill}" stroke="${fill}" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    default:
      return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${fill}" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
  }
}

/** Generate star rating HTML */
function starRating(count: number, color: string): string {
  return Array.from({ length: 5 }, (_, i) =>
    `<span style="color:${i < (count || 5) ? "#f59e0b" : "#d1d5db"}">★</span>`
  ).join("");
}

/**
 * Build the complete injectable JavaScript string.
 * The script detects the page language (AR/EN) from <html lang>,
 * creates a full landing section and prepends it to the page body.
 */
export function buildLandingPageScript(layout: LandingPageLayout): string {
  const color = layout.primaryColor || "#7C3AED";
  const colorLight = hexToRgba(color, 0.12);
  const colorDark = hexToRgba(color, 0.9);

  const hero = layout.hero || {
    headline: layout.storeName || "Your Store",
    headlineAr: layout.storeNameAr || "متجرك",
    subheadline: "Welcome",
    subheadlineAr: "مرحباً",
    cta: "Shop Now",
    ctaAr: "تسوق الآن",
  };

  const features = layout.features || [];
  const testimonials = layout.testimonials || [];
  const promo = layout.promo || null;
  const categories = layout.categories || [];

  // Build features HTML
  const featuresHtml = features.length
    ? `<div class="lk-features">
        ${features
          .map(
            (f) => `
          <div class="lk-feature-item">
            <div class="lk-feature-icon">${getIconSvg(f.icon, color)}</div>
            <div class="lk-feature-text">
              <span class="lk-en">${esc(f.title)}</span>
              <span class="lk-ar">${esc(f.titleAr || f.title)}</span>
              <small class="lk-en">${esc(f.description)}</small>
              <small class="lk-ar">${esc(f.descriptionAr || f.description)}</small>
            </div>
          </div>`
          )
          .join("")}
       </div>`
    : "";

  // Build promo HTML
  const promoHtml = promo
    ? `<div class="lk-promo">
        <span class="lk-en">${esc(promo.headline)}</span>
        <span class="lk-ar">${esc(promo.headlineAr || promo.headline)}</span>
        ${promo.discount ? `<span class="lk-promo-badge">${esc(promo.discount)}</span>` : ""}
        ${promo.code ? `<code class="lk-promo-code">${esc(promo.code)}</code>` : ""}
       </div>`
    : "";

  // Build categories HTML
  const catsHtml = categories.length
    ? `<div class="lk-cats">
        ${categories
          .map(
            (c) =>
              `<span class="lk-cat-chip">
                <span class="lk-en">${esc(c.name)}</span>
                <span class="lk-ar">${esc(c.nameAr || c.name)}</span>
               </span>`
          )
          .join("")}
       </div>`
    : "";

  // Build testimonials HTML
  const testimonialsHtml = testimonials.length
    ? `<div class="lk-testimonials">
        <p class="lk-section-label lk-en">What our customers say</p>
        <p class="lk-section-label lk-ar">ماذا يقول عملاؤنا</p>
        <div class="lk-testi-grid">
          ${testimonials
            .map(
              (t) => `
            <div class="lk-testi-card">
              <div class="lk-stars">${starRating(t.rating || 5, "#f59e0b")}</div>
              <p class="lk-testi-quote lk-en">"${esc(t.quote)}"</p>
              <p class="lk-testi-quote lk-ar">"${esc(t.quoteAr || t.quote)}"</p>
              <p class="lk-testi-author">— ${esc(t.author)}</p>
            </div>`
            )
            .join("")}
        </div>
       </div>`
    : "";

  // Inline CSS
  const css = `
    #lk-landing-section {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, Arial, sans-serif;
      box-sizing: border-box;
    }
    #lk-landing-section *, #lk-landing-section *::before, #lk-landing-section *::after {
      box-sizing: inherit;
    }
    .lk-hero {
      background: ${color};
      padding: 60px 24px;
      text-align: center;
      color: #fff;
      position: relative;
      overflow: hidden;
    }
    .lk-hero::before {
      content: '';
      position: absolute;
      top: -60px; right: -60px;
      width: 220px; height: 220px;
      border-radius: 50%;
      background: rgba(255,255,255,0.08);
    }
    .lk-hero::after {
      content: '';
      position: absolute;
      bottom: -40px; left: -40px;
      width: 160px; height: 160px;
      border-radius: 50%;
      background: rgba(255,255,255,0.06);
    }
    .lk-hero-inner { position: relative; z-index: 1; max-width: 620px; margin: 0 auto; }
    .lk-hero h1 { font-size: 2rem; font-weight: 800; margin: 0 0 12px; letter-spacing: -0.5px; }
    .lk-hero p { font-size: 1rem; opacity: 0.85; margin: 0 0 24px; line-height: 1.6; }
    .lk-hero-cta {
      display: inline-flex; align-items: center; gap: 8px;
      background: #fff; color: ${color};
      padding: 12px 28px; border-radius: 50px;
      font-weight: 700; font-size: 0.95rem;
      text-decoration: none; border: none; cursor: pointer;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .lk-hero-cta:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.2); }
    .lk-promo {
      background: ${colorDark};
      color: #fff;
      padding: 12px 24px;
      display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 10px;
      font-size: 0.9rem; font-weight: 600; text-align: center;
    }
    .lk-promo-badge {
      background: rgba(255,255,255,0.2); border-radius: 50px;
      padding: 3px 12px; font-size: 0.85rem;
    }
    .lk-promo-code {
      background: #fff; color: ${color};
      border-radius: 6px; padding: 3px 10px;
      font-family: monospace; font-size: 0.9rem; font-weight: 800; letter-spacing: 1px;
    }
    .lk-features {
      display: flex; flex-wrap: wrap; justify-content: center; gap: 12px;
      padding: 32px 24px; background: #fff; border-bottom: 1px solid #f3f4f6;
    }
    .lk-feature-item {
      display: flex; align-items: center; gap: 12px;
      background: ${colorLight}; border-radius: 12px;
      padding: 12px 16px; min-width: 180px; flex: 1 1 180px; max-width: 240px;
    }
    .lk-feature-icon {
      width: 40px; height: 40px; border-radius: 50%;
      background: ${colorLight}; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .lk-feature-text { display: flex; flex-direction: column; }
    .lk-feature-text span { font-weight: 700; font-size: 0.85rem; color: #111; }
    .lk-feature-text small { color: #666; font-size: 0.75rem; margin-top: 2px; }
    .lk-cats {
      padding: 20px 24px; display: flex; flex-wrap: wrap;
      gap: 8px; justify-content: center; background: #f9fafb;
      border-bottom: 1px solid #f3f4f6;
    }
    .lk-cat-chip {
      background: ${color}; color: #fff;
      padding: 6px 16px; border-radius: 50px;
      font-size: 0.82rem; font-weight: 600; cursor: pointer;
      transition: opacity 0.2s;
    }
    .lk-cat-chip:hover { opacity: 0.85; }
    .lk-testimonials { padding: 36px 24px; background: #fff; }
    .lk-section-label {
      text-align: center; font-size: 0.75rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 1.5px;
      color: #9ca3af; margin: 0 0 20px;
    }
    .lk-testi-grid {
      display: flex; flex-wrap: wrap; gap: 12px; justify-content: center;
    }
    .lk-testi-card {
      background: #f9fafb; border: 1px solid #e5e7eb;
      border-radius: 12px; padding: 16px; flex: 1 1 220px; max-width: 300px;
    }
    .lk-stars { font-size: 1rem; margin-bottom: 8px; }
    .lk-testi-quote { font-size: 0.88rem; color: #374151; font-style: italic; margin: 0 0 8px; line-height: 1.5; }
    .lk-testi-author { font-size: 0.8rem; font-weight: 700; color: #111; margin: 0; }
    /* Language switching */
    [dir="rtl"] .lk-en, [lang="ar"] .lk-en { display: none !important; }
    [dir="ltr"] .lk-ar, [lang="en"] .lk-ar { display: none !important; }
    .lk-ar, .lk-en { display: block; }
    @media (max-width: 480px) {
      .lk-hero h1 { font-size: 1.5rem; }
      .lk-hero p { font-size: 0.9rem; }
      .lk-feature-item { min-width: 140px; }
    }
  `;

  // JavaScript that inserts the section
  const script = `
(function() {
  try {
    // Only inject on homepage
    var path = window.location.pathname;
    if (path !== '/' && path !== '') return;
    if (document.getElementById('lk-landing-section')) return;

    // Detect language from html element
    var htmlEl = document.documentElement;
    var lang = (htmlEl.getAttribute('lang') || htmlEl.getAttribute('dir') || 'en').toLowerCase();
    var isAr = lang === 'ar' || lang === 'rtl';

    // Build section HTML
    var section = document.createElement('div');
    section.id = 'lk-landing-section';
    section.setAttribute('dir', isAr ? 'rtl' : 'ltr');

    // Inject CSS
    var style = document.createElement('style');
    style.textContent = ${JSON.stringify(css)};
    section.appendChild(style);

    // Build inner HTML
    section.innerHTML += ${JSON.stringify(
      `<div class="lk-hero">
        <div class="lk-hero-inner">
          <h1 class="lk-en">${esc(hero.headline)}</h1>
          <h1 class="lk-ar">${esc(hero.headlineAr || hero.headline)}</h1>
          <p class="lk-en">${esc(hero.subheadline)}</p>
          <p class="lk-ar">${esc(hero.subheadlineAr || hero.subheadline)}</p>
          <button class="lk-hero-cta" onclick="window.scrollTo({top: window.innerHeight, behavior: 'smooth'})">
            <span class="lk-en">${esc(hero.cta)} →</span>
            <span class="lk-ar">${esc(hero.ctaAr || hero.cta)} ←</span>
          </button>
        </div>
      </div>
      ${promoHtml}
      ${featuresHtml}
      ${catsHtml}
      ${testimonialsHtml}`
    )};

    // Insert before body's first child
    var body = document.body;
    if (body.firstChild) {
      body.insertBefore(section, body.firstChild);
    } else {
      body.appendChild(section);
    }
  } catch(e) {
    // Silently fail — never break the store
    console.warn('[LaunchKit] Landing section injection error:', e);
  }
})();
  `.trim();

  return script;
}
