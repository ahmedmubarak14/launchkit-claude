# Theme artifacts (pre-built)

`launchkit-theme.zip` is the production build of `/theme/`, ready for
upload to a Zid merchant store via the Partner Dashboard's
**Custom themes → Upload new theme** form.

## Regenerating

```bash
cd theme
npm install        # one-time
npm run build      # CSS minify + JS bundles
make build         # writes build/launchkit-theme-YYYY-MM-DD.zip
cp build/launchkit-theme-*.zip ../public/themes/launchkit-theme.zip
```

The dated filename inside `theme/build/` is intentional (one per build);
the public-facing copy uses a stable filename so the install URL never
changes.

## Why this is checked in (for now)

LaunchKit deploys on Vercel. Vercel build environments don't have
`make` or `zip` available by default, so building the theme ZIP at
deploy time would need either a custom buildpack or a separate CI
job that uploads to Vercel Blob / Supabase Storage.

For now the artifact is committed (~414 KB) so the install API
(`/api/store/theme/install`) and any onboarding flow have something
to point at without extra infrastructure. Move this to object
storage once the artifact grows or theme builds become per-merchant.
