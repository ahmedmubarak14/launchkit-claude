# LaunchKit

The commerce operator for Zid merchants. Bilingual (Arabic-first), voice-enabled, and powered by Claude Opus 4.7.

## What it does

LaunchKit sits on top of a merchant's Zid store and operates it through a chat interface. A merchant talks or types — in Arabic or English — and LaunchKit:

- Reads their live catalogue every turn (IDs, prices, stock, status)
- Acts directly on Zid: creates/edits/deletes products, creates categories, installs a theme, publishes a landing page
- Generates bilingual copy (both languages, always), native — not machine-translated
- Previews creative work before shipping, deletes destructively on confirm
- Takes voice input via the browser's native Speech Recognition (ar-SA / en-US)

Plus a direct `/dashboard/products` page with checkbox bulk-delete when a merchant just wants to clean house without chatting.

## Stack

- **Next.js 16** App Router + Server Components + Server Actions
- **Supabase** for auth (email/password), Postgres with Row Level Security, and chat history
- **Anthropic Claude Opus 4.7** with prompt caching + agentic tool-use loops
- **Zod** for schema validation end-to-end (API routes, tool inputs, LLM outputs)
- **TanStack Query** for live server state on the dashboard
- **next-intl** for `/ar` and `/en` routing with RTL/LTR driven by locale
- **Tailwind 4** + shadcn/ui, Fraunces + IBM Plex Sans Arabic for display typography

## Getting started

See [`SETUP.md`](./SETUP.md) for the full walkthrough. Short version:

```bash
git clone https://github.com/ahmedmubarak14/launchkit-claude.git
cd launchkit-claude
npm install
cp .env.example .env.local    # fill in Supabase + Anthropic + Zid keys
npm run dev
```

Before you use the app, hit the health endpoint to confirm every subsystem is wired:

```bash
curl http://localhost:3000/api/health | python3 -m json.tool
```

## Project layout

```
app/
  [locale]/                  Arabic + English route group
    page.tsx                 landing page (Hero, Features, Steps, Testimonial, FAQ, CTA)
    (auth)/{login,signup}    Server-Action forms with Zod validation
    (app)/                   authenticated shell
      dashboard              overview with live stats
      dashboard/products     TanStack Query list + bulk delete
      setup                  the chat (guarded by connected Zid store)
      connect                Zid OAuth entry
      settings               profile, disconnect Zid, sign out
    error.tsx  not-found.tsx  loading.tsx
  api/
    auth/zid/{authorize,callback}   Zid OAuth 2.0 handshake
    chat                             Opus 4.7 agentic loop with Zod tools
    health                           /api/health subsystem check
    store/                           REST endpoints backing the dashboard UIs

lib/
  ai/
    system.ts    bilingual system prompt
    snapshot.ts  live Zid snapshot (categories + products) per turn
    tools.ts     Zod-typed tool spec + server-side handlers
  zid/client.ts  common Zid API wrapper (headers, fetch, JSON parsing)
  supabase/      browser + SSR clients, middleware helper, full schema.sql

components/
  landing/       Nav, Hero, Marquee, Features, Steps, Testimonial, Faq, FinalCta, Footer
  app/AppShell   sidebar + top bar for the authenticated shell
  auth/AuthForm  login + signup shared form
  products/ProductsTable live product list with bulk delete
  chat/ChatPanel the chat UI + VoiceButton + useSpeechRecognition
  settings/SettingsClient account + Zid connection management
  i18n/LanguageToggle chip + link variants of the language switcher

messages/ar.json, messages/en.json   all display strings, native — not translated
```

## Tools Claude can call

All defined in `lib/ai/tools.ts`, registered in `app/api/chat/route.ts`:

| Tool | Does |
|---|---|
| `delete_product` | DELETE /v1/products/{id} |
| `delete_products_bulk` | Loops the above, max 50 per call |
| `edit_product` | PATCH /v1/products/{id}, partial updates |
| `create_categories` | POST /v1/managers/store/categories/add |
| `delete_category` | DELETE /v1/managers/store/categories/{id} |
| `preview_bulk_products` | Returns a preview card for merchant confirmation |
| `preview_product` | Returns a single-product preview card |
| `generate_landing_page` | Builds a landing page + injects into the store via App Scripts |
| `generate_logo` | Generates an SVG logo preview |
| `install_theme` | Surfaces the LaunchKit theme ZIP + guided upload steps |
| `refresh_store_snapshot` | Force a re-read of live Zid state on next turn |
| `ask_clarifying_question` | Asks the merchant instead of guessing |

## Development

```bash
npm run dev       # next dev
npm run build     # next build (production)
npm run lint      # eslint
npx tsc --noEmit  # type check
```

## License

Proprietary — LaunchKit, Riyadh.
