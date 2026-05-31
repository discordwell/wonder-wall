# Claudepad — WonderWall

## Session Summaries

### 2026-05-31T01:00Z — Quality Pass C (review-driven, 11 fixes)
Fresh full review surfaced findings across correctness, security, and the two "smart" features. User chose: always-require-PIN, real ArUco spatial verification, keep+reframe diagnostics. Implemented all 11 with a test each (91 → 122 tests, build clean, server tsc clean):
- **Server PIN auth** (`services/auth.ts`): `WONDERWALL_PIN` env or random 6-digit, printed at startup. `/ws/control` + `/ws/output` gated via `?pin=`; bad PIN → close 1008. PIN injected into served `/output` HTML (HDMI box auto-pairs). Phone enters PIN in `ModeSelector`. Per-connection auth capture in the upgrade factory + defense-in-depth `onMessage`/`onClose` guards.
- **Deduped Novastar control**: deleted REST `routes/novastar.ts` (app only ever used WS). WS is the single control path; `discover` exposed via a new WS action + a Scan button in `NovastarPanel`.
- **discoverDevices throttle**: new `services/concurrency.ts` `mapWithConcurrency` (bounded worker pool, 32) replaces the eager 254-socket burst.
- **Device-pixel rendering**: `PatternCanvas` + `output/index.html` size canvas to `cssSize×dpr` and draw 1:1 (no `ctx.scale`), via `services/canvas.ts`. Wet-tested in-browser on dpr=2: 1px checkerboard alternates per physical pixel (was 2px blocks before).
- **ArUco spatial verification** (`services/aruco.ts`): `observedGridPositions` pitch-quantizes detected centers into a grid; `buildPanelMap` flags `misplaced`/`rotated` panels vs id-derived expected position. Surfaced in `CameraMapper`. Now actually catches out-of-order wiring, not just presence.
- **Diagnostics**: fixed `avgBrightness` divisor (was /1000 regardless of sample count); camera teardown + Cancel button in `DiagnosticsRunner`; reframed "Wall Health Score" → "Relative Uniformity" with an honest caveat.
- **WS reconnect**: exponential backoff (1s→30s cap), no reconnect after explicit disconnect or 1008, `pagehide` cleanup. **Multi-controller sync**: `onPattern → patternStore.applyRemote`. **localStorage** writes guarded (presets/wall). **Fullscreen** rejection caught; **NovastarPanel a11y** label `for`/`id` (build warnings gone). **Parity test** hardened (DPR + ArUco overflow drift guards); output-page ArUco overflow aligned to package.
- Code review (high effort): ready-to-merge, no critical/important. Known minor edges: no timeout on `scanning` flag if server fully hangs; clustering leniency on a partial capture (documented assumption).

### 2026-04-21T23:50Z — Quality Pass B (cleanup sweep)
Built on Pass A with four coordinated cleanup changes:
- **`getParam` helper** in `@wonderwall/patterns/utils.ts` — typed read of values from a params bag, with a typeof guard that rejects type-mismatched values (e.g. stringified numbers from malformed WS messages) and falls back to the default. Migrated all 16 patterns, replaced ~50 copies of `(params.x as T) ?? default`. Call sites that compare literals (smpte-bars intensity, motion-test direction, brightness-steps direction) use explicit `getParam<string>` to avoid TS over-narrowing.
- **sequential-flash dedup** — static `render` now delegates to `animate(..., 0)`, eliminating a hardcoded `#0` literal and keeping the two code paths in lockstep.
- **WS protocol types** in new `@wonderwall/patterns/protocol.ts` — `ClientMessage` / `ServerMessage` discriminated unions with `parseClientMessage` / `parseServerMessage` runtime validators. Migrated server `ws.ts` and app `websocket.ts` / `novastar-client.ts` / `connection.svelte.ts`. Top-level `type` is strictly discriminated; novastar action-specific fields stay loose since shape varies per action.
- **WS send safety** — `safeSend` + `broadcast` helpers evict dead clients from the controllers/outputs set instead of silently leaking them. Covers readyState≠OPEN and thrown-send cases.
- Tests: 48 → 58 (4 protocol parser + 3 getParam + 3 ws-safe-send). App build green. Server `tsc` still broken pre-existingly (no `@types/node`) — my changes don't add new errors vs baseline. Remaining Pass B backlog: nothing urgent; server auth/CORS (item 11 from original audit) is scoped as its own conversation when deployment plans firm up.

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
- **PIN auth is a breaking deploy change** (Pass C, 2026-05-31): the server now requires a PIN on every WS connection. A running output box / paired phone must re-pair with the new PIN after a server restart unless `WONDERWALL_PIN` is set to a fixed value on the host. Always set `WONDERWALL_PIN` in the deploy environment so restarts don't silently drop the wall.
- **Render at device pixels, never `ctx.scale(dpr)`** (Pass C): pixel-exact patterns (resolution-check, crosshatch) must render 1:1 in device pixels or they misrepresent on HiDPI/Retina outputs. The `sizeCanvasToDevicePixels` helper (app) and `sizeCanvas()` (output page) own this; don't reintroduce a scale transform.
