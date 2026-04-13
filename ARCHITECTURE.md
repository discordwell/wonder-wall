# WonderWall Architecture

Video wall test pattern generator and panel identification tool for AV professionals.

## Overview

WonderWall is a PWA that replaces the need for a Windows PC running NovaLCT to display test patterns on LED video walls. A tech installs the app on their phone, plugs in a USB-C to HDMI adapter, and runs test patterns directly. For advanced setups, a networked device handles HDMI output while the phone acts as a wireless remote.

## System Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Phone (PWA)                           │
│  ┌──────────┐  ┌───────────┐  ┌───────────────────────┐ │
│  │ Pattern   │  │ Control   │  │ Camera Mapper         │ │
│  │ Picker    │  │ Overlay   │  │ (ArUco detection)     │ │
│  └─────┬────┘  └─────┬─────┘  └───────────┬───────────┘ │
│        └──────┬──────┘                     │             │
│         ┌─────┴─────┐                     │             │
│         │ Pattern    │  ◄──────────────────┘             │
│         │ Canvas     │                                   │
│         └─────┬──────┘                                   │
│               │ imports                                  │
│         ┌─────┴──────────┐                               │
│         │ @wonderwall/    │                               │
│         │ patterns        │  (framework-agnostic)        │
│         └────────────────┘                               │
└──────────┬───────────────────────────────────────────────┘
           │ USB-C to HDMI (mirror)
           ▼
    ┌──────────────┐
    │  Video Wall  │
    │  (Novastar)  │
    └──────────────┘
```

### Networked Mode (Phase 3)

```
Phone (WiFi) ──WebSocket──► Server ──HDMI──► Video Wall
                              │
                              └──TCP:5200──► Novastar Controller
```

## Package Structure

### `packages/patterns` — Pattern Library
Framework-agnostic, pure TypeScript. Takes a `CanvasRenderingContext2D`, dimensions, and parameters, draws a pattern. Shared between the phone app and the server output page.

Key files:
- `src/types.ts` — `TestPattern` and `PatternParameter` interfaces
- `src/registry.ts` — Pattern registration and lookup
- `src/renderer.ts` — Canvas rendering orchestrator + animation loop
- `src/patterns/` — Individual pattern implementations

### `packages/app` — Svelte PWA
The phone app. Svelte 5 + Vite. Handles fullscreen display, tap-to-toggle control overlay, pattern parameter editing, and camera-based panel mapping.

Key files:
- `src/App.svelte` — Root: switches between picker view and fullscreen view
- `src/lib/components/PatternCanvas.svelte` — Fullscreen canvas with DPR-aware rendering
- `src/lib/components/ControlOverlay.svelte` — Translucent bottom sheet with tap-toggle, double-tap lock
- `src/lib/stores/pattern.ts` — Reactive pattern state (current pattern, params, prev/next)

### `packages/server` — Networked Mode (Phase 3)
Hono + WebSocket server. Relays pattern commands from phone to HDMI output. Optionally integrates with Novastar controllers via `@novastar/net`.

## Key Design Decisions

1. **Patterns are pure functions** — No framework dependency. `render(ctx, w, h, params)` draws to any Canvas context. This enables the same patterns to render on the phone, a server output page, or in tests.

2. **Decoupled modules** — The pattern generator works standalone. Novastar integration is optional and server-side only. Camera mapping works in both phone-direct and networked modes.

3. **Canvas 2D over WebGL** — Test patterns are static 2D graphics. Canvas 2D is simpler, faster to initialize, lower power on mobile, and has zero compatibility issues.

4. **PWA over native app** — No App Store review, works on any device with a browser, instant updates, installable with offline support.

## Test Pattern Interface

```typescript
interface TestPattern {
  id: string;
  name: string;
  category: 'essential' | 'professional' | 'advanced';
  description: string;
  parameters: PatternParameter[];
  render(ctx, w, h, params): void;
  animate?(ctx, w, h, params, time): void;
}
```

Static patterns implement `render`. Animated patterns implement `animate` and are driven by `requestAnimationFrame`.
