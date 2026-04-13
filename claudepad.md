# Claudepad — WonderWall

## Session Summaries

### 2026-04-13T02:12Z — Phase 1 MVP Complete
Built WonderWall Phase 1 from scratch: a PWA test pattern generator for AV professionals.
- Researched Novastar ecosystem, NDI/SDVoE/IPMX standards, existing open-source tools (sarakusha/novastar TypeScript library)
- Designed architecture in plan mode: decoupled pattern generator + optional Novastar integration + camera-assisted panel mapping
- Built npm workspaces monorepo: `@wonderwall/patterns` (framework-agnostic Canvas 2D) + `@wonderwall/app` (Svelte 5 PWA)
- 5 Tier 1 patterns: Solid Color, SMPTE Bars (75%/100%), Numbered Grid, Crosshatch, Gradient Ramp
- Fullscreen display with tap-to-toggle overlay, double-tap lock, auto-hide, pattern navigation
- PWA configured (offline, installable, landscape fullscreen)
- 16 pattern rendering tests passing
- Code review completed, 9 issues fixed (gradient div/zero, SMPTE mid-row intensity, crosshatch offset, TS errors, timer leak, maskable icon)
- Wet tested all patterns in browser

## Key Findings

- **Novastar protocol**: Reverse-engineered TypeScript library at github.com/sarakusha/novastar — supports TCP (port 5200) and serial. 1000+ API methods. This is the foundation for Phase 4.
- **Phone HDMI output**: Web apps can't programmatically control external displays from phones. iOS/Android just mirror. But getUserMedia (rear camera) works independently while screen outputs HDMI — this enables camera-assisted panel mapping in phone-direct mode.
- **ArUco markers**: js-aruco2 is the right library for Phase 2 panel identification (~80KB, zero deps, handles 12-48 markers).
- **Svelte 5 gotcha**: `$state` rune only works in `.svelte` and `.svelte.ts` files, not plain `.ts`. Store files must be `*.svelte.ts`.
