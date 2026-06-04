import type { Input } from "../engine/Input";
import type { Scene } from "../engine/Scene";
import type { Bullet } from "./Bullet";
import { Camera } from "./Camera";
import { Enemy } from "./Enemy";
import { Level } from "./Level";
import { Player } from "./Player";

const LEVEL_WIDTH = 2400;
const SPAWN_INTERVAL = 2.5; // seconds between enemy spawns
const MAX_ENEMIES = 6;
const BULLET_DAMAGE = 1;
const KILL_SCORE = 100;

/** The main run-and-gun gameplay: player vs. enemies on a scrolling level. */
export class PlayScene implements Scene {
  private level!: Level;
  private camera!: Camera;
  private player!: Player;
  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private spawnTimer = 0;
  private score = 0;
  private gameOver = false;

  constructor(
    private readonly viewWidth: number,
    private readonly viewHeight: number,
  ) {
    this.reset();
  }

  private reset(): void {
    this.level = new Level(LEVEL_WIDTH, this.viewHeight);
    this.camera = new Camera(this.viewWidth, this.level.width);
    this.player = new Player(120, this.level.groundY - 44);
    this.bullets = [];
    this.enemies = [
      new Enemy(900, this.level.groundY - 42),
      new Enemy(1400, this.level.groundY - 42),
    ];
    this.spawnTimer = SPAWN_INTERVAL;
    this.score = 0;
    this.gameOver = false;
  }

  update(dt: number, input: Input): void {
    if (this.gameOver) {
      if (input.wasPressed("KeyR")) this.reset();
      return;
    }

    this.player.update(dt, input, this.level, this.bullets);
    for (const enemy of this.enemies) {
      enemy.update(dt, this.player.centerX, this.level);
    }
    for (const bullet of this.bullets) {
      bullet.update(dt);
    }

    this.handleCollisions();
    this.spawnEnemies(dt);
    this.cull();
    this.camera.follow(this.player.centerX);

    if (!this.player.alive) this.gameOver = true;
  }

  private handleCollisions(): void {
    for (const bullet of this.bullets) {
      if (!bullet.alive) continue;
      const box = bullet.bounds;

      // Bullets stop at walls/floor.
      if (this.level.solids.some((solid) => box.intersects(solid))) {
        bullet.kill();
        continue;
      }

      // Bullets hit enemies.
      for (const enemy of this.enemies) {
        if (!enemy.alive || !box.intersects(enemy.bounds)) continue;
        enemy.damage(BULLET_DAMAGE);
        bullet.kill();
        if (!enemy.alive) this.score += KILL_SCORE;
        break;
      }
    }

    // Walking into an enemy hurts the player.
    const playerBox = this.player.bounds;
    for (const enemy of this.enemies) {
      if (enemy.alive && playerBox.intersects(enemy.bounds)) {
        this.player.hit();
      }
    }
  }

  private spawnEnemies(dt: number): void {
    this.spawnTimer -= dt;
    const liveCount = this.enemies.reduce((n, e) => n + (e.alive ? 1 : 0), 0);
    if (this.spawnTimer <= 0 && liveCount < MAX_ENEMIES) {
      this.spawnTimer = SPAWN_INTERVAL;
      // Spawn ahead of the player, but within the level.
      const spawnX = Math.min(
        this.player.centerX + this.viewWidth,
        this.level.width - 60,
      );
      this.enemies.push(new Enemy(spawnX, this.level.groundY - 42));
    }
  }

  private cull(): void {
    this.bullets = this.bullets.filter(
      (b) => b.alive && b.bounds.right > 0 && b.bounds.x < this.level.width,
    );
    this.enemies = this.enemies.filter((e) => e.alive);
  }

  render(ctx: CanvasRenderingContext2D): void {
    // Sky.
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);
    this.drawParallax(ctx);

    // World (offset by the camera).
    ctx.save();
    ctx.translate(-Math.round(this.camera.x), 0);
    this.drawLevel(ctx);
    for (const enemy of this.enemies) enemy.render(ctx);
    for (const bullet of this.bullets) bullet.render(ctx);
    this.player.render(ctx);
    ctx.restore();

    this.drawHud(ctx);
    if (this.gameOver) this.drawGameOver(ctx);
  }

  /** Distant hills that scroll slower than the world for a parallax feel. */
  private drawParallax(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "#14532d";
    const spacing = 480;
    const offset = (this.camera.x * 0.4) % spacing;
    for (let i = -1; i * spacing - offset < this.viewWidth + spacing; i++) {
      const cx = i * spacing - offset + spacing / 2;
      ctx.beginPath();
      ctx.arc(cx, this.level.groundY + 30, 240, Math.PI, 0);
      ctx.fill();
    }
  }

  private drawLevel(ctx: CanvasRenderingContext2D): void {
    for (const solid of this.level.solids) {
      ctx.fillStyle = "#3f3f46";
      ctx.fillRect(solid.x, solid.y, solid.w, solid.h);
      ctx.fillStyle = "#52525b"; // top-edge highlight
      ctx.fillRect(solid.x, solid.y, solid.w, 6);
    }
  }

  private drawHud(ctx: CanvasRenderingContext2D): void {
    // HP.
    for (let i = 0; i < this.player.maxHp; i++) {
      ctx.fillStyle = i < this.player.hp ? "#ef4444" : "#475569";
      ctx.fillRect(16 + i * 26, 16, 20, 20);
    }

    // Score.
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "20px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`SCORE ${this.score}`, 16, 64);

    // Controls.
    ctx.fillStyle = "#94a3b8";
    ctx.font = "13px system-ui, sans-serif";
    ctx.fillText(
      "移動 A/D・矢印   ジャンプ Space/W   ショット J（押しっぱなしで連射）",
      16,
      this.viewHeight - 16,
    );
  }

  private drawGameOver(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);

    ctx.fillStyle = "#f8fafc";
    ctx.textAlign = "center";
    ctx.font = "48px system-ui, sans-serif";
    ctx.fillText("GAME OVER", this.viewWidth / 2, this.viewHeight / 2 - 8);
    ctx.font = "20px system-ui, sans-serif";
    ctx.fillText(
      `SCORE ${this.score}  —  R でリスタート`,
      this.viewWidth / 2,
      this.viewHeight / 2 + 32,
    );
  }
}
