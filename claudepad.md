# Claudepad — WonderWall

## Session Summaries

### 2026-04-21T23:30Z — Quality Pass A (bug fixes)
Full-codebase analysis pass on a long-idle project. Three subagents audited patterns/app/server packages; findings triaged against real code (two flagged items — motion-test inversion and gradient steps=1 — turned out to be false positives from the analysis, so nothing changed in those files). Three real bugs fixed with regression tests:
- **Output page drift**: server `/output` inline renderers were missing `aruco-grid` entirely and had dropped `numbered-grid`'s `col,row` coordinate label. Added both; added a server-side parity test that enumerates every registry ID and asserts an inline renderer exists in `output/index.html` — catches this drift class going forward.
- **Novastar `connectToDevice` race**: timer / connect-callback / `'error'` listener could each settle the Promise after another already had. Added `settled` flag + centralized `settle()` helper. Also added an optional `port` param (default 5200) to enable loopback unit tests.
- **aruco-grid overflow**: `break` only exited the inner loop when cell index exceeded the 48-marker bank; overflow cells rendered blank. Changed to always draw `#N` label, only conditionally draw the marker. Exported `MAX_ARUCO_MARKERS`.
- Tests: 28 → 48 passing across monorepo (17 parity, 3 novastar-connect, 1 aruco-overflow new). Pass B (cleanup sweep — `getParam` helper, WS protocol typing, `any` removal) is next.

### 2026-04-14T16:04Z — Phase 5 Polish (Tier 3 + Presets)
Final polish phase:
- 4 Tier 3 patterns: Custom Text, Seam Finder, Motion Test (animated), Uniformity White
- Preset manager: save/load pattern + params combinations via localStorage, PresetBar component
- Updated ARCHITECTURE.md with full system documentation
- Updated CLAUDE.md with deploy instructions
- Output page updated with all 16 pattern renderers
- 27 tests passing (5 new for Tier 3 patterns + registry count test)
- Total: 16 patterns, 3 tiers, 3 deployment modes, Novastar integration, preset manager

### 2026-04-14T13:11Z — Phase 4 Novastar Integration
Integrated @novastar packages for controlling LED video wall controllers:
- Novastar service: connect via TCP port 5200, read/set brightness (global + RGB), test modes, device info
- REST API routes at /api/novastar/* (status, connect, disconnect, brightness, test-mode, discover)
- WebSocket protocol extended: phone sends `{type:"novastar", action:"setBrightness", value:200}` etc.
- NovastarPanel component: connection input, brightness sliders (global + R/G/B), built-in test mode buttons
- Panel appears in picker when connected to server
- Server broadcasts novastar connection status in WS status messages
- All @novastar/native API methods imported selectively to minimize bundle

### 2026-04-14T13:00Z — Phase 3 Networked Mode + Tier 2 Patterns
Added networked mode and 5 Tier 2 patterns:
- Hono server with WebSocket hub (ws/control for phone, ws/output for HDMI device)
- Self-contained output page (/output) with inline pattern renderers — no build step needed
- Phone app: ModeSelector, ConnectionStatus, WebSocket client service, connection store
- Pattern commands relayed phone → server → HDMI output in real-time
- 5 Tier 2 patterns: Pixel Walk, Color Wash, Alignment Crosses, Resolution Check, Brightness Steps
- WebSocket relay tested end-to-end (controller → output)
- Server runs with `npx tsx packages/server/src/index.ts` or `npm run dev:server`

### 2026-04-13T02:52Z — Phase 2 Camera Panel Mapping
Added camera-assisted panel identification:
- ArUco marker grid pattern (ARUCO_MIP_36h12 dictionary, 48 markers embedded, renders 10x10 marker grids)
- Sequential flash pattern (animated, lights up panels one at a time)
- Camera service (getUserMedia rear camera, frame capture)
- ArUco detection service (js-aruco2 wrapper, marker detection, panel map building)
- CameraMapper component (full workflow: camera preview → capture → detect → results → save)
- Panel map persistence (IndexedDB) with JSON export
- "Map Panels" button in picker and overlay
- js-aruco2 code-split to separate chunk (26KB, loaded on demand)
- 22 tests passing (6 new for ArUco grid + sequential flash)
- Wet tested: ArUco markers render correctly, sequential flash animates, Map button accessible

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
