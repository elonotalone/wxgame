import Phaser from "phaser";

/**
 * MainScene — vibe-coding starter scene for wxgame.
 *
 * What it does:
 *   - Renders a gradient sky + ground.
 *   - Listens for taps (mouse / touch).
 *   - Each tap spawns a small physics-enabled square at the cursor that
 *     bounces with gravity and fades out after ~3 seconds.
 *   - Shows tap count + uptime in a top-bar HUD.
 *
 * Why this demo: it exercises four engine subsystems in <100 lines —
 * input, arcade physics (bodies + gravity + bounds), graphics texture
 * generation (no external assets needed), and tween-based fade. If this
 * renders + responds to taps inside the dashboard preview iframe, the
 * Phaser → wx-shim wiring is healthy for any future game.
 *
 * Asset philosophy: zero external asset files. All textures are
 * generated procedurally from `Phaser.Graphics`. This keeps the first-
 * load bundle tiny and means HMR is instant on `game-logic` edits —
 * no waiting on asset preload screens during iteration.
 */
export class MainScene extends Phaser.Scene {
  private taps = 0;
  private hudText!: Phaser.GameObjects.Text;
  private startedAt = 0;

  constructor() {
    super({ key: "MainScene" });
  }

  preload(): void {
    // Build a 32×32 square texture entirely in code so we don't need
    // any image files for the demo. Real games will swap this for
    // `this.load.image('hero', 'assets/hero.png')` etc. — and to keep
    // the WeChat upload payload small, prefer atlases over loose PNGs.
    const g = this.add.graphics();
    g.fillStyle(0xfde047, 1);
    g.fillRoundedRect(0, 0, 32, 32, 6);
    g.lineStyle(2, 0xfacc15, 1);
    g.strokeRoundedRect(1, 1, 30, 30, 6);
    g.generateTexture("block", 32, 32);
    g.destroy();
  }

  create(): void {
    const { width, height } = this.scale;
    this.startedAt = this.time.now;

    // ── Background: vertical gradient via two stacked rectangles ──
    // Phaser doesn't ship a gradient primitive; using two rects is
    // cheaper than a graphics texture for a static background.
    this.add.rectangle(0, 0, width, height, 0x84cc16).setOrigin(0, 0);
    this.add.rectangle(0, height * 0.7, width, height * 0.3, 0x365314).setOrigin(0, 0);

    // ── HUD: top status bar ──
    this.add.rectangle(0, 0, width, 44, 0x000000, 0.55).setOrigin(0, 0);
    this.add.text(12, 12, "WxGame · Phaser 3", {
      fontFamily: "sans-serif",
      fontSize: "16px",
      fontStyle: "bold",
      color: "#ffffff",
    });
    this.hudText = this.add.text(width - 12, 12, "", {
      fontFamily: "sans-serif",
      fontSize: "13px",
      color: "#ffffff",
    }).setOrigin(1, 0);

    // Hint at center until first tap.
    const hint = this.add.text(width / 2, height / 2, "tap anywhere", {
      fontFamily: "sans-serif",
      fontSize: "16px",
      color: "#ffffff",
    }).setOrigin(0.5).setAlpha(0.65);
    this.input.once("pointerdown", () => {
      this.tweens.add({ targets: hint, alpha: 0, duration: 400, onComplete: () => hint.destroy() });
    });

    // ── Tap → spawn falling block ──
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.taps += 1;
      this.spawnBlock(pointer.x, pointer.y);
    });
  }

  private spawnBlock(x: number, y: number): void {
    const block = this.physics.add.image(x, y, "block");
    block.setBounce(0.55, 0.55);
    block.setCollideWorldBounds(true);
    block.setVelocity(Phaser.Math.Between(-180, 180), Phaser.Math.Between(-260, -80));
    block.setAngularVelocity(Phaser.Math.Between(-240, 240));

    // Fade out + cleanup after 3s. Without this, taps would accumulate
    // until the physics body count tanks the framerate; cap visual
    // lifetime at ~3s and let GC reclaim the rest.
    this.tweens.add({
      targets: block,
      alpha: 0,
      delay: 2200,
      duration: 800,
      onComplete: () => block.destroy(),
    });
  }

  update(_time: number, _delta: number): void {
    const seconds = ((this.time.now - this.startedAt) / 1000).toFixed(1);
    this.hudText.setText(`${seconds}s · taps: ${this.taps}`);
  }
}
