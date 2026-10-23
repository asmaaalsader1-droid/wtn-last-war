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
- Theme is LIGHT: white surfaces, near-black text, teal brand. Colors are semantic
  Tailwind tokens defined in `tailwind.config.ts` (`strong`, `muted`, `label`,
  `panel`, `panel2`, `fill`, `line`, `brand`, `brand-strong`, `brand-soft`, `amber`,
  `amber-soft`, `danger`, `danger-soft`). Do not reintroduce hex literals — a palette
  change must stay in one place. Body text must clear WCAG AA 4.5:1 on every panel
  background; white text is only valid on a solid `bg-brand`/`bg-strong` fill.
- The brand token is `brand`, NOT `accent`: Tailwind's built-in `accentColor` plugin
  owns the `accent-*` namespace, so `text-accent`/`bg-accent` fail to compile.
- Player rows grow progressively: `players` holds one trailing blank row and
  `ensureTrailingBlank` appends a new one as soon as the last is filled. Blank rows
  use `blank-<n>` ids, never persisted (`persist` maps them to `crypto.randomUUID()`).
- Buildings are the eleven real Desert Storm positions, numbered along the map
  border path (top-right corner, down the right side, left across the bottom, up
  the left side, right across the top, then the centre column). Each entry in
  `DEFAULT_BUILDINGS` carries its in-game `L/R/C` label as a trailing comment.
  Renumbering changes `plan_buildings.building_number`, so saved plans must be
  re-checked whenever the order moves.
- Distribution rules live in `app/lib/algorithm.ts`. `distributePlayers` fills the
  highest-yield buildings first and skips the minute-10 centre (buildings 5, 10 and
  11, flagged by `unlockMinute`) whenever there are not enough players for every
  building. One player is enough to hold a building (`covered` means `>= 1`), and
  `expectedPoints` only counts the seconds after `unlockMinute`. The two 50/s
  refineries tie on rate, so the lower id takes the stronger player.
- Unit tests live in `tests/` and cover pure logic only (`app/lib/*`).
