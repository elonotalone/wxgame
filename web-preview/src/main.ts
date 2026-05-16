/**
 * Browser entry point for WxGame preview.
 *
 * What this does, in order:
 *   1. Grab the DOM canvas from index.html.
 *   2. Install the wx.* shim with that canvas as the "game canvas".
 *      After this, `wx.createCanvas()` returns the same DOM canvas, and
 *      `wx.onTouchStart` / `wx.getSystemInfoSync` etc. all work.
 *   3. Import the REAL mini-game entry from /src/game.js (resolved via
 *      the @wxgame alias in vite.config.ts). That file is identical to
 *      what `miniprogram-ci upload` ships to WeChat — we don't fork it.
 *
 * Step ordering is important: the shim must be installed BEFORE
 * /src/game.js executes, otherwise `wx.createCanvas` would be undefined.
 * Top-level await on the dynamic import is what enforces that ordering.
 */

import { installWxShim } from "./wx-shim";

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement | null;
if (!canvas) {
  throw new Error("#game-canvas missing from index.html");
}

// Match the on-device portrait viewport. wxapp uses a 360×640 frame too,
// so the two previews feel consistent next to each other in the
// dashboard sidebar.
canvas.width = 360;
canvas.height = 640;

installWxShim({ canvas });

// Dynamic import (not top-level await — that's not allowed by Vite's
// default build target) so the shim is fully installed BEFORE
// /src/game.js touches any wx.* call. The shim was synchronously
// installed above, so by the time this promise resolves, `globalThis.wx`
// is fully populated. Vite resolves the alias to ../src/game.js.
import("@wxgame/game.js").catch((err) => {
  console.error("Failed to load /src/game.js:", err);
});
