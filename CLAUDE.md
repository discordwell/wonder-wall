# WonderWall

Video wall test pattern generator for AV professionals. PWA + optional networked mode + optional Novastar integration.

## Dev Commands
- `npm run dev` — Start Vite dev server (packages/app)
- `npm run build` — Build patterns package then app
- `npm run test` — Run all workspace tests
- `npm run test --workspace=packages/patterns` — Run pattern tests only

## Architecture
See ARCHITECTURE.md for full system design. Key points:
- `packages/patterns` — Framework-agnostic Canvas 2D pattern library. Pure functions: `render(ctx, w, h, params)`.
- `packages/app` — Svelte 5 PWA. Pattern picker → fullscreen display with tap-to-toggle overlay.
- `packages/server` — (Phase 3) Hono + WebSocket for networked mode.

## Conventions
- Patterns are pure functions operating on CanvasRenderingContext2D — no framework dependencies
- Svelte stores use `$state` rune and must be in `.svelte.ts` files
- PWA manifest: `display: fullscreen`, `orientation: landscape`, black theme
- npm workspaces — three packages: `@wonderwall/patterns`, `@wonderwall/app`, `@wonderwall/server`
