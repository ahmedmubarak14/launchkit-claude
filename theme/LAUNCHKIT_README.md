# LaunchKit Theme

Forked from [zidsa/growth-theme](https://github.com/zidsa/growth-theme) (ISC license).
Vendored into this repo at the time of writing — upstream `.git` history was stripped.

## Why this lives here

The LaunchKit app currently injects landing-page HTML into a merchant's
storefront via the Zid App Scripts API. That approach is fragile (depends on
whatever theme the merchant has installed) and limits how much LaunchKit can
own the storefront experience.

Owning a theme lets LaunchKit:

- Pre-bake sensible defaults (typography, colors, layout) so a brand-new store
  looks intentional, not generic
- Define section schemas the AI can target deterministically when generating
  hero copy, featured-product blocks, category nav, etc.
- Survive Zid platform updates by building against a known theme structure

## How it integrates with LaunchKit

End-to-end flow once the theme-upload API is wired up (see "Pending: API spike"
below):

1. **Build:** `make build` produces `build/launchkit-theme-YYYY-MM-DD.zip`
   (matches the format the Zid dashboard's "Upload new theme" form accepts)
2. **Onboarding step (per merchant):** the LaunchKit setup flow uploads the
   ZIP to the merchant's store via the Zid theme-upload endpoint, then
   activates it
3. **Content push (existing, working today):** LaunchKit's chat-driven setup
   creates products and categories via the Zid product/category APIs — these
   render through the new theme's templates immediately
4. **Per-merchant customization:** AI-generated section settings (logo,
   primary color, hero copy) are applied as theme settings — either via API
   if one exists, or surfaced as a "copy this into your dashboard" UI

## Pending: API spike

The "Custom themes → Upload new theme" form in the Zid Partner Dashboard
clearly hits some endpoint, but it is not in the public docs. Before wiring
up automated upload, do a 30-min DevTools spike:

1. Open Chrome DevTools → Network tab on `partner.zid.sa`
2. Upload a tiny dummy ZIP via the dashboard
3. Capture: endpoint URL, HTTP method, auth header, body shape
4. Repeat for the "Activate theme" action

If the endpoint accepts the same `X-Manager-Token` LaunchKit already uses,
the upload step can be fully automated. If not, fall back to a guided manual
upload during onboarding.

## Build commands (from upstream)

```bash
npm install
npm run dev      # parallel CSS + JS watch
npm run build    # production build (minified CSS + both JS bundles)
make build       # produces the upload-ready ZIP under ./build/
```

## What's customized vs. what's still upstream

### Rebranding
- `package.json` — name, repo, homepage point at LaunchKit
- `Makefile` — output filename is `launchkit-theme-YYYY-MM-DD.zip`

### Niche tuning (silver accessories / luxe-minimal / Arabic-first)
The first LaunchKit pilot is a silver-accessories store ("Fiddah" / فضة).
Defaults are tuned for that aesthetic and that audience, but no
store-specific name is hardcoded — every default works for any
silver/jewelry/accessory merchant in the same niche.

- **`layout.json`** — color palette shifted to a luxe-minimal silver+champagne
  scheme inspired by [axels-store.webflow.io](https://axels-store.webflow.io):
  - `theme_primary` `#0D0D0D` (near-black, for buttons/headings)
  - `theme_secondary` `#F4F1EC` (warm cream, for section backgrounds)
  - `theme_accent` `#B3A389` (soft champagne/platinum)
  - `theme_border` `#E5E0D8` (silver-tinted)
  - `theme_radius` `2` (tighter corners — more editorial)
  - English font swapped from `Roboto` → `Inter` (more luxe-minimal)
  - Arabic font kept as `IBM Plex Sans Arabic` (already a strong choice)

- **`sections/hero.schema.json`** — default copy switched to Arabic-first
  silver-accessory voice:
  - badge: "مجموعة جديدة"
  - heading: "أناقة بلمسة فضية"
  - description: silver-accessory tagline
  - button: "تسوقي الآن"

  Defaults are per-field strings (not per-locale objects), so a merchant on
  English will see the Arabic placeholder until they set their own copy in
  the dashboard. This is fine for the Arabic-first audience.

### What's still pure upstream
Layout templates, sections (other than `hero`), components, JS/CSS, locale
files, build pipeline, and trust/UX patterns are all unchanged from
`zidsa/growth-theme`. RTL is platform-driven (`dir` attribute reads
`session.locale.language.direction` in `layout.jinja`) — already correct
for any merchant whose Zid store is set to Arabic.

### Deferred until the API-upload spike confirms the path
- Per-merchant generated logo/colors fed in at theme-publish time
- LaunchKit-specific section types (e.g. AI-generated lookbook, founder note)
- Heavier visual restructuring beyond schema defaults

## Upstream tracking

To pull updates from upstream:

```bash
git remote add growth-theme https://github.com/zidsa/growth-theme  # one-time
git fetch growth-theme
# review the diff manually, apply selectively into ./theme/
```

A submodule was deliberately avoided — vendoring keeps the LaunchKit repo
self-contained and simplifies Vercel/CI builds.
