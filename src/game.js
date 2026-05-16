// WeChat mini game entry point. This file runs INSIDE the WeChat client
// after `miniprogram-ci upload` pushes /src/ to WeChat. Do NOT add
// document.* / window.* calls here — only the `wx.*` surface is real on
// device. Anything UI-related goes through the shared module
// `game-logic.js` which is canvas-agnostic.
//
// Browser preview lives in /web-preview/ — it imports the SAME
// game-logic.js but obtains canvas via `document.createElement` instead
// of `wx.createCanvas`. See web-preview/src/main.ts.

import { startGame } from "./game-logic.js";

const canvas = wx.createCanvas();
const ctx = canvas.getContext("2d");

const info = wx.getSystemInfoSync();
canvas.width = info.windowWidth;
canvas.height = info.windowHeight;

const game = startGame(canvas, ctx);

wx.onTouchStart((e) => {
  const t = e.touches[0];
  if (!t) return;
  game.onTap(t.clientX, t.clientY);
});
