// Shared game logic — runs both on WeChat (via src/game.js) and in the
// browser preview (via web-preview/src/main.ts).
//
// Contract: `startGame(canvas, ctx)` takes a 2D canvas + context obtained
// by the caller (wx.createCanvas vs document.createElement) and runs the
// game loop on it. NO platform-specific calls (wx.*, document.*) are
// allowed in this file — both shims expose enough API surface that this
// file can stay platform-agnostic.
//
// Right now this is a tiny "tap to move ball" demo, which is enough to
// validate canvas + input on both runtimes. Replace freely with Phaser /
// Pixi / custom code once the wiring is proven.

const STATE = {
  width: 360,
  height: 640,
  ball: { x: 180, y: 320, r: 24, vx: 0, vy: 0 },
  target: { x: 180, y: 320 },
  score: 0,
  startedAt: Date.now(),
};

function step() {
  // Trivial physics: ease ball toward target, count score on overshoot.
  const b = STATE.ball;
  const dx = STATE.target.x - b.x;
  const dy = STATE.target.y - b.y;
  b.vx += dx * 0.04;
  b.vy += dy * 0.04;
  b.vx *= 0.85;
  b.vy *= 0.85;
  b.x += b.vx;
  b.y += b.vy;

  if (Math.abs(dx) < 2 && Math.abs(dy) < 2 && Math.hypot(b.vx, b.vy) < 0.5) {
    // settled
  }
}

function render(ctx) {
  const { width, height, ball, score, startedAt } = STATE;

  // background
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, "#84cc16");
  g.addColorStop(1, "#365314");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  // target marker
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.beginPath();
  ctx.arc(STATE.target.x, STATE.target.y, 36, 0, Math.PI * 2);
  ctx.fill();

  // ball
  ctx.fillStyle = "#fde047";
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#facc15";
  ctx.lineWidth = 3;
  ctx.stroke();

  // HUD
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, width, 44);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText("WxGame · Phaser-ready scaffold", 12, 28);
  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  ctx.fillText(`${seconds}s · taps: ${score}`, width - 130, 28);
}

export function startGame(canvas, ctx) {
  STATE.width = canvas.width;
  STATE.height = canvas.height;
  STATE.ball.x = canvas.width / 2;
  STATE.ball.y = canvas.height / 2;
  STATE.target.x = canvas.width / 2;
  STATE.target.y = canvas.height / 2;

  let raf;
  function loop() {
    step();
    render(ctx);
    raf = requestAnimationFrame(loop);
  }
  loop();

  function onTap(x, y) {
    STATE.target.x = x;
    STATE.target.y = y;
    STATE.score += 1;
  }

  return {
    onTap,
    stop() {
      cancelAnimationFrame(raf);
    },
  };
}
