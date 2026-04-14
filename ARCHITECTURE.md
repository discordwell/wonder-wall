# WonderWall Architecture

Video wall test pattern generator, panel identification tool, and Novastar controller for AV professionals.

## Overview

WonderWall replaces the need for a Windows PC running NovaLCT to display test patterns and control LED video walls. It runs as a PWA on any phone — plug in a USB-C to HDMI adapter and go. For advanced setups, a server handles HDMI output while the phone acts as a wireless remote, optionally controlling a Novastar controller on the network.

## System Modes

### Phone-Direct Mode
```
Phone (PWA) ──USB-C/HDMI──► Video Wall
```
Phone renders patterns fullscreen. Tap to toggle controls. Camera mapping works via rear camera while pattern stays on HDMI.

### Networked Mode
```
Phone (WiFi) ──WebSocket──► Server ──HDMI──► Video Wall
                               │
                               └──TCP:5200──► Novastar Controller
```
Server renders patterns on the HDMI output. Phone is a wireless remote with full controls. Novastar integration available.

## Package Structure

### `packages/patterns` — Pattern Library
Framework-agnostic, pure TypeScript. 16 patterns across 3 tiers.

| Tier | Patterns |
|------|----------|
| Essential | Solid Color, SMPTE Bars, Numbered Grid, Crosshatch, Gradient Ramp, Panel ID Markers (ArUco), Sequential Flash |
| Professional | Pixel Walk, Color Wash, Alignment Crosses, Resolution Check, Brightness Steps |
| Advanced | Custom Text, Seam Finder, Motion Test, Uniformity White |

All patterns implement a common interface:
```typescript
interface TestPattern {
  id: string;
  name: string;
  category: 'essential' | 'professional' | 'advanced';
  parameters: PatternParameter[];
  render(ctx: CanvasRenderingContext2D, w: number, h: number, params): void;
  animate?(ctx: CanvasRenderingContext2D, w: number, h: number, params, time: number): void;
}
```

### `packages/app` — Svelte 5 PWA
Phone app. Pattern picker, fullscreen display, overlay controls, camera-assisted panel mapping, network mode, Novastar controls, preset manager.

Key components:
- `PatternCanvas` — Fullscreen canvas with DPR-aware rendering
- `ControlOverlay` — Tap-to-toggle bottom sheet with pattern nav, params, presets
- `CameraMapper` — ArUco marker detection workflow
- `NovastarPanel` — Brightness sliders + test mode controls
- `PresetBar` — Save/load pattern + params combinations

### `packages/server` — Hono Server
Networked mode server. WebSocket hub + HDMI output page + Novastar integration.

- `/output` — Self-contained HTML page that renders patterns fullscreen
- `/ws/control` — WebSocket for phone controllers
- `/ws/output` — WebSocket for HDMI output clients
- `/api/novastar/*` — REST API for Novastar controller operations

## Key Design Decisions

1. **Patterns are pure functions** — `render(ctx, w, h, params)` draws to any Canvas context. Shared between phone, server output, and tests.

2. **Decoupled modules** — Pattern generator works standalone. Camera mapping works in phone-direct mode. Novastar integration is server-side only.

3. **Camera + HDMI are independent** — `getUserMedia` captures from the rear camera while the screen outputs via HDMI. No unplugging needed for panel mapping.

4. **Self-contained output page** — The server's output page has inline pattern renderers. No build pipeline needed for the HDMI display device.

5. **WebSocket protocol** — Simple JSON messages. Phone sends `{type: "setPattern", id, params}`. Server relays to output. Novastar commands: `{type: "novastar", action, ...params}`.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Svelte 5 + Vite |
| Rendering | Canvas 2D |
| PWA | vite-plugin-pwa (Workbox) |
| Server | Hono + @hono/node-ws |
| ArUco | js-aruco2 (ARUCO_MIP_36h12) |
| Novastar | @novastar/codec + @novastar/net + @novastar/native |
| Monorepo | npm workspaces |
