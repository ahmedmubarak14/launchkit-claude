# LaunchKit — local setup

Everything you need to get v2 running on your Mac end-to-end.

## 1. Clone + install

```bash
cd ~
git clone https://github.com/ahmedmubarak14/launchkit-claude.git
cd launchkit-claude
npm install
```

## 2. Supabase

LaunchKit uses Supabase for auth, the user profile row, the connected
Zid store record, and chat history. You need a Supabase project.

1. Create a project at <https://supabase.com/dashboard> (free tier is fine)
2. Open **SQL Editor**, paste the contents of `lib/supabase/schema.sql`,
   run it. This creates `profiles`, `stores`, `setup_sessions`, `messages`,
   `categories`, and `products` with Row Level Security + the `handle_new_user`
   trigger.
3. Open **Project Settings → API**, copy these into `.env.local` (see step 4):
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Project API keys → anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Project API keys → service_role secret** → `SUPABASE_SERVICE_ROLE_KEY`

## 3. Anthropic

The chat runs on Opus 4.7. Get a key:

1. <https://console.anthropic.com/settings/keys>
2. Create a key, copy into `.env.local` as `ANTHROPIC_API_KEY`

## 4. Zid OAuth

Without this the `/connect` flow won't work and tools that touch Zid
(delete_product, create_categories, etc.) will return "Zid store not
connected".

1. Log in at <https://partners.zid.sa>
2. Create an app (or open your existing LaunchKit partner app)
3. Under **OAuth**, set:
   - **Redirect URI** = `http://localhost:3000/api/auth/zid/callback`
     (add a production URL later when you deploy)
   - **Scopes** = `store:read store:write products:read products:write categories:read categories:write`
4. Copy Client ID + Client Secret into `.env.local`

## 5. `.env.local`

Create the file at the repo root:

```bash
cp .env.example .env.local
open -e .env.local
```

Fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

ANTHROPIC_API_KEY=sk-ant-api03-...

ZID_CLIENT_ID=...
ZID_CLIENT_SECRET=...
ZID_REDIRECT_URI=http://localhost:3000/api/auth/zid/callback
ZID_OAUTH_BASE_URL=https://oauth.zid.sa
ZID_API_BASE_URL=https://api.zid.sa

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 6. Run

```bash
npm run dev
```

Then, before anything else:

```bash
curl http://localhost:3000/api/health | jq
```

You should see `"ok": true` and a green check on each subsystem. If one
is red, the `detail` field tells you what's missing.

Example healthy output:

```json
{
  "ok": true,
  "checks": {
    "supabase": { "ok": true, "detail": "reachable, no active session" },
    "anthropic": { "ok": true, "detail": "api key format OK" },
    "zid": { "ok": true, "detail": "OAuth config present; visit /connect to run the handshake" }
  }
}
```

## 7. End-to-end smoke test

1. Open <http://localhost:3000/ar> — landing page, Arabic by default
2. Click the language chip top-right to flip to `/en`
3. Click **Start free** → sign up with an email + password
4. You land on `/ar/connect` — click **Connect Zid**, authorize in the popup
5. You land on `/ar/setup` — the chat. Try: "اعرض لي منتجات متجري"
   (Claude should call `refresh_store_snapshot` and list them from live Zid)
6. Try: "احذف المنتج اللي سعره ٥٠٠ ريال" — it should call `delete_product`
   with the right ID and report back
7. Open `/ar/dashboard/products` — live list + checkbox bulk delete
8. Open `/ar/settings` — profile, language, disconnect Zid, sign out

## Troubleshooting

**"Your project's URL and Key are required to create a Supabase client"**
You haven't set `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
in `.env.local`, or you didn't restart `npm run dev` after creating it.

**Fonts fail to load / build errors about Google Fonts**
Network issue fetching Fraunces / Inter / IBM Plex Sans Arabic from
fonts.googleapis.com. Usually transient; on Vercel deploys it's never a
problem.

**"Zid store not connected" in the chat**
You're logged in but haven't completed the OAuth handshake yet. Visit
`/ar/connect` and click **Connect Zid**.

**Safari "can't connect to server"**
Dev server isn't running, or port conflict. Run `lsof -ti:3000 | xargs kill -9`
to free the port, then `npm run dev` again, or try `http://127.0.0.1:3000`.

**Chat works but history isn't saved**
Normal if you haven't run the Supabase schema yet. Check that the six
tables exist in **Table Editor**.
