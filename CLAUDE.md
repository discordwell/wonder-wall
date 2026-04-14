# WonderWall

Video wall test pattern generator for AV professionals. PWA + optional networked mode + optional Novastar integration.

## Dev Commands
- `npm run dev` — Start Vite dev server (packages/app)
- `npm run dev:server` — Start WonderWall server with hot reload
- `npm run build` — Build patterns package then app
- `npm run test` — Run all workspace tests
- `npm run server` — Start production server

## Architecture
See ARCHITECTURE.md for full system design. Key points:
- `packages/patterns` — Framework-agnostic Canvas 2D pattern library (16 patterns). Pure functions: `render(ctx, w, h, params)`.
- `packages/app` — Svelte 5 PWA. Pattern picker → fullscreen display with tap-to-toggle overlay.
- `packages/server` — Hono + WebSocket for networked mode + Novastar integration.

## Conventions
- Patterns are pure functions operating on CanvasRenderingContext2D — no framework dependencies
- Svelte stores use `$state` rune and must be in `.svelte.ts` files
- PWA manifest: `display: fullscreen`, `orientation: landscape`, black theme
- npm workspaces — three packages: `@wonderwall/patterns`, `@wonderwall/app`, `@wonderwall/server`
- The server output page (`packages/server/output/index.html`) has inline pattern renderers — keep them in sync with the patterns package
- Novastar @native API methods are imported selectively to minimize bundle

## Deploy
- **PWA**: `npm run build` then deploy `packages/app/dist/` to any static host (Cloudflare Pages, Netlify, Vercel)
- **Server**: `npm run dev:server` or `PORT=3333 npx tsx packages/server/src/index.ts` on any device with Node.js + HDMI output. Open `http://localhost:3333/output` in a fullscreen browser.
