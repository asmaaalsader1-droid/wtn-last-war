# AGENTS.md

## Project
EQA Tactical — Arabic (RTL) war-planning tool. Next.js 14 App Router + TypeScript + Tailwind + Supabase.

## Commands
- Package manager is pnpm via Corepack. `pnpm` is NOT on PATH; always use `corepack pnpm <cmd>`.
- `corepack pnpm dev -p 12000` — dev server (public: `https://work-1-dmkqyjnwlowdkwzh.prod-runtime.all-hands.dev/`)
- `corepack pnpm test` — Vitest
- `corepack pnpm typecheck` — tsc --noEmit
- `corepack pnpm build` — production build

## Gotchas
- `next.config.mjs` sets `distDir` to `.next-dev` under `NODE_ENV=development`, so
  `dev` and `build` never share a directory and a build can no longer break a running
  dev server. Keep it that way: if both write to one distDir, every `/_next/static/*`
  request 404s and the page loads with no JS or CSS. If you do see that, kill dev,
  `rm -rf .next .next-dev`, and restart.
- `next.config` sets `trailingSlash: true`, so `usePathname()` returns a path with a
  trailing slash. Compare nav links with a normalized form, not `pathname === href`.
- `tsconfig` targets `es5`. Spreading a `Set`/`Map` iterator (`[...someSet]`) fails
  typecheck — use `Array.from(...)` or `.forEach`.
- `unzip` is unavailable in this image; use Python's `zipfile` to extract archives.
- `.env.local` holds Supabase keys and is gitignored via `.env.*`. Never commit it.
- The `save_plan_bundle` RPC does not exist on the remote; `savePlan` falls back to
  per-table writes, which is the supported path.

## Conventions
- UI copy is Arabic. Keep new user-facing strings Arabic.
- Domain types live in `app/types/domain.ts`.
- Colors are hex literals in Tailwind arbitrary values, not theme tokens. Body text
  must clear WCAG AA 4.5:1 on every panel background; `#8ea6aa` is the verified
  muted-text token (6.18:1 worst case on `panel2 #12252b`).
- Unit tests live in `tests/` and cover pure logic only (`app/lib/*`).
