# WonderWall

**Video wall test pattern generator, panel-identification tool, and Novastar controller for AV professionals.**

WonderWall replaces the Windows-PC-plus-NovaLCT workflow for displaying test patterns and driving LED video walls. It runs as an installable PWA on any phone — plug in a USB‑C‑to‑HDMI adapter and you have a pocket pattern generator. For larger rigs, a small Node server takes over HDMI output while the phone becomes a wireless remote that can also talk to a Novastar controller on the network.

- 📱 **Phone-direct** — render fullscreen patterns straight to HDMI from a phone, no server.
- 🖥️ **Networked** — a server renders to HDMI; phones are wireless remotes (PIN-paired).
- 🎛️ **Novastar** — read/set brightness, run built-in test modes, snapshot & restore config over TCP.
- 📷 **Camera panel mapping** — photograph an ArUco grid to verify panels are wired in the right order and orientation.
- 🩺 **Quick diagnostics** — sweep R/G/B/White/Black fields and photograph each to flag gross non-uniformity.

Everything works offline. The pattern library has no framework dependencies and is shared verbatim between the phone, the server's HDMI output page, and the test suite.

---

## Patterns

16 patterns across three tiers:

| Tier | Patterns |
|------|----------|
| **Essential** | Solid Color · SMPTE Bars (75 % / 100 %) · Numbered Grid · Crosshatch · Gradient Ramp · Panel ID Markers (ArUco) · Sequential Flash |
| **Professional** | Pixel Walk · Color Wash · Alignment Crosses · Resolution Check (1 px checkerboard) · Brightness Steps |
| **Advanced** | Custom Text · Seam Finder · Motion Test (animated) · Uniformity White |

Each pattern is a pure function — `render(ctx, w, h, params)` — drawing to any `CanvasRenderingContext2D`. Parameters (colors, grid sizes, speeds…) are declared with `min`/`max`/`type` metadata and clamped to that contract at every boundary before they reach a renderer.

---

## Modes

### Phone-direct
```
Phone (PWA) ──USB-C/HDMI──► Video Wall
```
The phone renders patterns fullscreen. Tap to toggle controls. The rear camera can map panels while the pattern stays on HDMI — no unplugging.

### Networked
```
Phone (WiFi) ──WebSocket──► Server ──HDMI──► Video Wall
                               │
                               └──TCP:5200──► Novastar Controller
```
The server renders on its own HDMI output and relays pattern changes from any paired phone in real time. Novastar control is available in this mode.

---

## Quick start

Requires **Node.js 20+** and npm.

```bash
git clone <repo-url> wonder-wall
cd wonder-wall
npm install
```

### Run the phone app (PWA)

```bash
npm run dev          # Vite dev server for packages/app
```

Open the printed URL on your phone (same network), or on a desktop browser to try it out. Install it to the home screen for fullscreen landscape behaviour.

### Run the networked server

```bash
npm run dev:server   # hot-reloading server on :3333
```

On startup the server prints a **pairing PIN**:

```
  ┌─────────────────────────────┐
  │  Pairing PIN:  482915        │
  └─────────────────────────────┘
```

Open `http://localhost:3333/output` in a fullscreen browser on the HDMI-connected device (the PIN is injected automatically, so the TV needs nothing typed). On the phone, choose **Network Mode**, enter the server address and the PIN, and you're paired.

Set `WONDERWALL_PIN` to keep the PIN fixed across restarts, so paired phones and output boxes stay paired:

```bash
WONDERWALL_PIN=482915 PORT=3333 npm run dev:server
```

---

## Scripts

Run from the repo root (npm workspaces):

| Command | What it does |
|---------|--------------|
| `npm run dev` | Vite dev server for the phone app |
| `npm run dev:server` | Server with hot reload |
| `npm run build` | Build the patterns package, then the app (to `packages/app/dist/`) |
| `npm run test` | Run every workspace's test suite |
| `npm run server` | Start the built server (`node dist/index.js`) |
| `npm run preview` | Preview the production app build |

---

## Deploy

- **PWA** — `npm run build`, then serve `packages/app/dist/` from any static host (Cloudflare Pages, Netlify, Vercel, nginx…). It's a fully offline-capable PWA.
- **Server** — run on any device with Node.js and an HDMI output (e.g. a mini-PC or SBC):
  ```bash
  npm run build --workspace=packages/patterns
  PORT=3333 WONDERWALL_PIN=<your-pin> npx tsx packages/server/src/index.ts
  ```
  Then open `http://localhost:3333/output` fullscreen on the HDMI display.

> **Always set `WONDERWALL_PIN` in production.** Without it the server generates a fresh random PIN on every restart, which silently un-pairs every phone and output box until they re-enter the new code.

---

## Project structure

npm workspaces monorepo with three packages:

| Package | Role |
|---------|------|
| [`packages/patterns`](packages/patterns) | `@wonderwall/patterns` — framework-agnostic Canvas 2D pattern library + WebSocket protocol types. Pure functions, no DOM/Svelte. |
| [`packages/app`](packages/app) | `@wonderwall/app` — Svelte 5 PWA: pattern picker, fullscreen display, overlay controls, camera mapping, network mode, Novastar panel, presets. |
| [`packages/server`](packages/server) | `@wonderwall/server` — Hono + WebSocket hub, PIN-gated HDMI output page, Novastar integration. |

The server's `/output` page inlines copies of the pattern renderers so the HDMI box needs no build step. That duplication is fenced by a **pixel-parity test** (`output-render-parity.test.ts`) which renders every inline pattern next to its `@wonderwall/patterns` twin on a node-canvas and asserts they diff to zero pixels — so any drift fails the build instead of silently shipping to hardware.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full system design and key decisions.

---

## Testing

```bash
npm run test          # all workspaces
npm run test --workspace=packages/patterns
npm run test --workspace=packages/app
npm run test --workspace=packages/server
```

Patterns are verified with pixel assertions and parameter-sanitization checks; the app covers stores, services, and the ArUco spatial verification; the server covers PIN auth, the WebSocket relay, the Novastar connect lifecycle, and output-page render parity.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Svelte 5 + Vite |
| Rendering | Canvas 2D |
| PWA | vite-plugin-pwa (Workbox) |
| Server | Hono + @hono/node-ws |
| ArUco | js-aruco2 (`ARUCO_MIP_36h12`) |
| Novastar | @novastar/codec · @novastar/net · @novastar/native |
| Monorepo | npm workspaces |
