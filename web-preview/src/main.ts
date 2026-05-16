/**
 * Browser entry point for wxgame preview, Phaser 3 edition.
 *
 * What this does, in order:
 *   1. Grab the DOM canvas from index.html (360×640 portrait).
 *   2. Install the wx.* shim so any future `wx.*` call from imported
 *      modules still works inside the browser. We're not currently
 *      using wx.* in the Phaser scene, but the shim is cheap and
 *      future-proofs vibe-coded snippets that copy wx.* recipes from
 *      WeChat docs.
 *   3. Boot Phaser with the existing canvas (not a new one). Phaser
 *      supports rendering into a caller-provided canvas via the
 *      `canvas` config option, which is what lets the page keep its
 *      hand-crafted phone-frame styling around the canvas element.
 *
 * Why Phaser does NOT run on the real WeChat device (yet):
 *   Phaser's source contains many references to `window`, `document`,
 *   `HTMLImageElement`, and `XMLHttpRequest` — globals that don't
 *   exist inside the WeChat mini-game runtime. Adapting Phaser to the
 *   wxgame runtime needs a 2000+ line polyfill ("phaser-wechat-
 *   adapter"). That's a separate project. For now:
 *     - browser preview (this file) uses Phaser, fast iteration.
 *     - real device (/src/game.js) uses a hand-written canvas2d loop
 *       (see game-logic.js) that's guaranteed to work on the
 *       WeChat runtime.
 *   When you want a Phaser scene to ship to real device, port it back
 *   to the canvas2d shape OR vendor a wechat adapter into /src/.
 *   See AGENTS.md "Phaser philosophy" for the long form.
 */

import Phaser from "phaser";
import { installWxShim } from "./wx-shim";
import { MainScene } from "./scenes/MainScene";

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement | null;
if (!canvas) {
  throw new Error("#game-canvas missing from index.html");
}

const WIDTH = 360;
const HEIGHT = 640;
canvas.width = WIDTH;
canvas.height = HEIGHT;

installWxShim({ canvas });

new Phaser.Game({
  type: Phaser.CANVAS,
  canvas,
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: "#0f172a",
  // Pixel-art friendly default. Disable if you want anti-aliased text.
  pixelArt: false,
  // Disable the "Phaser v3.xx · Built ... · ..." console banner so the
  // dashboard browser console stays clean for game logs.
  banner: false,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 600 },
      // Show body outlines in dev for debug; set false before shipping.
      debug: false,
    },
  },
  scale: {
    // We already match the phone-frame canvas exactly, so no extra
    // scaling needed. If the dashboard ever lets you resize the device
    // frame, change mode to FIT and Phaser will letterbox.
    mode: Phaser.Scale.NONE,
  },
  scene: [MainScene],
});
