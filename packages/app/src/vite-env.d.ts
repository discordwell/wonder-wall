/// <reference types="svelte" />
/// <reference types="vite/client" />

// js-aruco2 ships no type declarations and uses a legacy `this.AR = AR` global
// pattern, so its deep import has no typed shape. The detector wrapper in
// services/aruco.ts already normalises the CJS/ESM interop at runtime
// (`mod.AR ?? mod.default?.AR ?? mod.default`); this ambient declaration just
// stops the untyped import from surfacing as an implicit-any error.
declare module 'js-aruco2/src/aruco.js';
