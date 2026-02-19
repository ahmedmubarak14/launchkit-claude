export interface SVGLogoConfig {
  storeName: string;
  primaryColor: string;
  style: "initials" | "wordmark" | "icon+text";
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function lightenColor(hex: string, amount = 0.85): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#F5F0FF";
  const r = Math.round(rgb.r + (255 - rgb.r) * amount);
  const g = Math.round(rgb.g + (255 - rgb.g) * amount);
  const b = Math.round(rgb.b + (255 - rgb.b) * amount);
  return `rgb(${r},${g},${b})`;
}

export function generateSVGLogo(config: SVGLogoConfig): string {
  const { storeName, primaryColor, style } = config;
  const initials = getInitials(storeName);
  const lightBg = lightenColor(primaryColor);

  if (style === "initials") {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${primaryColor};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${primaryColor}cc;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="80" height="80" rx="20" fill="url(#grad)"/>
  <text x="40" y="54" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif"
        font-size="${initials.length === 1 ? 42 : 32}" font-weight="800" fill="white"
        letter-spacing="-1">${initials}</text>
</svg>`;
  }

  if (style === "wordmark") {
    const displayName = storeName.length > 12 ? storeName.slice(0, 12) : storeName;
    const fontSize = displayName.length > 8 ? 18 : 22;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" width="200" height="60">
  <rect width="200" height="60" rx="14" fill="${lightBg}"/>
  <text x="100" y="${30 + fontSize / 3}" text-anchor="middle"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="${fontSize}" font-weight="800" fill="${primaryColor}"
        letter-spacing="-0.5">${displayName}</text>
</svg>`;
  }

  // icon+text
  const displayName = storeName.length > 10 ? storeName.slice(0, 10) : storeName;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" width="200" height="60">
  <rect width="200" height="60" rx="14" fill="${lightBg}"/>
  <!-- Icon circle -->
  <circle cx="30" cy="30" r="20" fill="${primaryColor}"/>
  <text x="30" y="37" text-anchor="middle"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="18" font-weight="800" fill="white">${initials.slice(0, 1)}</text>
  <!-- Store name -->
  <text x="110" y="35" text-anchor="middle"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="18" font-weight="700" fill="${primaryColor}">${displayName}</text>
</svg>`;
}

export function svgToDataUri(svg: string): string {
  const encoded = encodeURIComponent(svg);
  return `data:image/svg+xml,${encoded}`;
}
