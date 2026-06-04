import type { Input } from "../engine/Input";
import type { Scene, SceneManager } from "../engine/Scene";
import type { Vector2 } from "../engine/Vector2";
import type { Bullet } from "./Bullet";
import { Camera } from "./Camera";
import { Boss, type Enemy, type EnemyContext, Flyer, Shooter, Walker } from "./enemies";
import { Level } from "./Level";
import { Particles } from "./Particles";
import { Pickup } from "./Pickup";
import { Player } from "./Player";
import { sound } from "./Sound";
import { type EnemyKind, type StageDef, STAGES } from "./stages";
import { TitleScene } from "./TitleScene";
import { PICKUP_WEAPONS } from "./weapons";

const CLEAR_BONUS = 500;
const ROCKET_RADIUS = 92;
const DROP_CHANCE = 0.18;

type State = "playing" | "won" | "lost" | "complete";

/** The main run-and-gun gameplay: clear the stage, survive, beat the boss. */
export class PlayScene implements Scene {
  private readonly stageDef: StageDef;
  private level!: Level;
  private camera!: Camera;
  private player!: Player;
  private enemies: Enemy[] = [];
  private boss: Boss | null = null;
  private playerBullets: Bullet[] = [];
  private enemyBullets: Bullet[] = [];
  private pickups: Pickup[] = [];
  private particles = new Particles();
  private spawnTimer = 0;
  private score = 0;
  private state: State = "playing";

  constructor(
    private readonly viewWidth: number,
    private readonly viewHeight: number,
    private readonly stageIndex: number,
    private readonly startScore: number,
  ) {
    this.stageDef = STAGES[Math.min(stageIndex, STAGES.length - 1)];
    this.reset();
  }

  private get isLastStage(): boolean {
    return this.stageIndex >= STAGES.length - 1;
  }

  private reset(): void {
    this.level = new Level(this.stageDef, this.viewHeight);
    this.camera = new Camera(this.viewWidth, this.level.width);
    this.player = new Player(120, this.level.groundY - 44);
    this.enemies = this.stageDef.enemies.map((e) => this.createEnemy(e.type, e.x));
    this.pickups = this.stageDef.pickups.map(
      (p) => new Pickup(p.x, this.level.groundY, p.weapon),
    );
    this.boss = this.level.isBossStage
      ? new Boss(this.level.width - 320, this.level.groundY)
      : null;
    this.playerBullets = [];
    this.enemyBullets = [];
    this.particles = new Particles();
    this.spawnTimer = this.stageDef.spawnInterval;
    this.score = this.startScore;
    this.state = "playing";
    sound.setBgm(true);
  }

  private createEnemy(kind: EnemyKind, x: number): Enemy {
    const g = this.level.groundY;
    if (kind === "shooter") return new Shooter(x, g);
    if (kind === "flyer") return new Flyer(x, g);
    return new Walker(x, g);
  }

  private targets(): Enemy[] {
    return this.boss && this.boss.alive ? [...this.enemies, this.boss] : this.enemies;
  }

  update(dt: number, input: Input, game: SceneManager): void {
    if (this.state !== "playing") {
      this.updateEndState(input, game);
      return;
    }

    sound.update();
    this.player.update(dt, input, this.level, this.playerBullets, sound);

    const ctx: EnemyContext = {
      dt,
      level: this.level,
      playerCenter: this.player.center,
      fire: (b) => this.enemyBullets.push(b),
      audio: sound,
    };
    for (const e of this.enemies) e.update(ctx);
    if (this.boss && this.boss.alive) this.boss.update(ctx);

    for (const b of this.playerBullets) b.update(dt);
    for (const b of this.enemyBullets) b.update(dt);
    for (const p of this.pickups) p.update(dt);
    this.particles.update(dt);

    this.handlePlayerBullets();
    this.handleEnemyBullets();
    this.handleContact();
    this.handlePickups();
    this.spawnEnemies(dt);
    this.cull();

    this.camera.follow(this.player.centerX);
    this.camera.update(dt);

    this.checkWinLose();
  }

  private updateEndState(input: Input, game: SceneManager): void {
    if (this.state === "won") {
      if (["Space", "Enter", "KeyJ"].some((k) => input.wasPressed(k))) {
        game.changeScene(
          new PlayScene(this.viewWidth, this.viewHeight, this.stageIndex + 1, this.score),
        );
      }
      return;
    }
    // "lost" or "complete": R retries, T goes to the title.
    if (input.wasPressed("KeyR")) {
      const index = this.state === "complete" ? 0 : this.stageIndex;
      const score = this.state === "complete" ? 0 : this.startScore;
      game.changeScene(new PlayScene(this.viewWidth, this.viewHeight, index, score));
    } else if (input.wasPressed("KeyT")) {
      game.changeScene(new TitleScene());
    }
  }

  private handlePlayerBullets(): void {
    const targets = this.targets();
    for (const b of this.playerBullets) {
      if (!b.alive) continue;
      const box = b.bounds;
      if (this.level.solids.some((s) => box.intersects(s))) {
        this.onBulletImpact(b);
        continue;
      }
      for (const e of targets) {
        if (!e.alive || !box.intersects(e.bounds)) continue;
        if (!b.explosive) this.hurtEnemy(e, b.damage);
        this.onBulletImpact(b);
        break;
      }
    }
  }

  private onBulletImpact(b: Bullet): void {
    if (b.explosive) {
      this.explodeAt(b.pos, ROCKET_RADIUS, b.damage);
    } else {
      this.particles.burst(b.pos, "#fef9c3", 5, 160, { life: 0.25, size: 2, gravity: 0 });
    }
    b.kill();
  }

  private explodeAt(pos: Vector2, radius: number, damage: number): void {
    this.particles.burst(pos, "#fdba74", 26, 380, { life: 0.5, size: 4, gravity: 120 });
    this.particles.burst(pos, "#f87171", 14, 260, { life: 0.45, size: 5, gravity: 120 });
    sound.explosion();
    this.camera.shake(16);
    for (const e of this.targets()) {
      if (e.alive && e.center.add(pos.scale(-1)).length <= radius) {
        this.hurtEnemy(e, damage);
      }
    }
  }

  private hurtEnemy(e: Enemy, damage: number): void {
    const wasAlive = e.alive;
    e.damage(damage);
    if (wasAlive && !e.alive) this.onEnemyKilled(e);
  }

  private onEnemyKilled(e: Enemy): void {
    this.score += e.score;
    if (e.isBoss) {
      this.particles.burst(e.center, "#fdba74", 60, 460, { life: 0.8, size: 6, gravity: 120 });
      this.particles.burst(e.center, "#f87171", 40, 360, { life: 0.8, size: 6, gravity: 120 });
      sound.explosion();
      this.camera.shake(20);
      return;
    }
    this.particles.burst(e.center, "#f87171", 16, 320, { life: 0.5, size: 4 });
    sound.explosion();
    this.camera.shake(6);
    if (Math.random() < DROP_CHANCE) {
      const w = PICKUP_WEAPONS[Math.floor(Math.random() * PICKUP_WEAPONS.length)] ?? "machinegun";
      this.pickups.push(new Pickup(e.center.x - 14, this.level.groundY, w));
    }
  }

  private handleEnemyBullets(): void {
    const hurt = this.player.hurtBounds;
    for (const b of this.enemyBullets) {
      if (!b.alive) continue;
      const box = b.bounds;
      if (this.level.solids.some((s) => box.intersects(s))) {
        this.particles.burst(b.pos, "#fecaca", 4, 140, { life: 0.2, size: 2, gravity: 0 });
        b.kill();
        continue;
      }
      if (box.intersects(hurt)) {
        this.hitPlayer();
        b.kill();
      }
    }
  }

  private handleContact(): void {
    const hurt = this.player.hurtBounds;
    for (const e of this.targets()) {
      if (e.alive && e.bounds.intersects(hurt)) this.hitPlayer();
    }
  }

  private hitPlayer(): void {
    const before = this.player.hp;
    this.player.hit();
    if (this.player.hp < before) {
      this.particles.burst(this.player.center, "#fca5a5", 12, 260, { life: 0.4, size: 3 });
      sound.playerHit();
      this.camera.shake(10);
    }
  }

  private handlePickups(): void {
    const box = this.player.bounds;
    for (const p of this.pickups) {
      if (p.alive && box.intersects(p.bounds)) {
        this.player.pickupWeapon(p.weapon);
        sound.pickup();
        p.alive = false;
      }
    }
  }

  private spawnEnemies(dt: number): void {
    this.spawnTimer -= dt;
    const live = this.enemies.reduce((n, e) => n + (e.alive ? 1 : 0), 0);
    if (this.spawnTimer > 0 || live >= this.stageDef.maxEnemies) return;
    this.spawnTimer = this.stageDef.spawnInterval;
    const kinds = this.stageDef.spawnTypes;
    const kind = kinds[Math.floor(Math.random() * kinds.length)] ?? "walker";
    const limit = this.level.isBossStage ? this.level.width - 80 : this.level.goalX - 60;
    const spawnX = Math.min(this.player.centerX + this.viewWidth * 0.8, limit);
    this.enemies.push(this.createEnemy(kind, spawnX));
  }

  private cull(): void {
    this.playerBullets = this.playerBullets.filter((b) => b.alive && this.inWorld(b));
    this.enemyBullets = this.enemyBullets.filter((b) => b.alive && this.inWorld(b));
    this.enemies = this.enemies.filter((e) => e.alive);
    this.pickups = this.pickups.filter((p) => p.alive);
  }

  private inWorld(b: Bullet): boolean {
    const r = b.bounds;
    return r.right > 0 && r.x < this.level.width && r.bottom > -40 && r.y < this.viewHeight + 80;
  }

  private checkWinLose(): void {
    if (!this.player.alive) {
      this.state = "lost";
      sound.gameover();
      sound.setBgm(false);
      return;
    }
    const cleared = this.level.isBossStage
      ? !!this.boss && !this.boss.alive
      : this.player.centerX >= this.level.goalX;
    if (cleared) {
      this.score += CLEAR_BONUS;
      this.state = this.isLastStage ? "complete" : "won";
      sound.clear();
      sound.setBgm(false);
    }
  }

  // ---- rendering ---------------------------------------------------------

  render(ctx: CanvasRenderingContext2D): void {
    const theme = this.level.theme;
    ctx.fillStyle = theme.sky;
    ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);
    this.drawParallax(ctx);

    ctx.save();
    ctx.translate(-Math.round(this.camera.x) + this.camera.shakeX, this.camera.shakeY);
    this.drawLevel(ctx);
    if (!this.level.isBossStage) this.drawGoal(ctx);
    for (const p of this.pickups) p.render(ctx);
    for (const e of this.enemies) e.render(ctx);
    if (this.boss && this.boss.alive) this.boss.render(ctx);
    for (const b of this.playerBullets) b.render(ctx);
    for (const b of this.enemyBullets) b.render(ctx);
    this.particles.render(ctx);
    this.player.render(ctx);
    ctx.restore();

    this.drawHud(ctx);
    if (this.boss && this.boss.alive) this.drawBossBar(ctx);
    this.drawBanner(ctx);
  }

  private drawParallax(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.level.theme.hill;
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
      ctx.fillStyle = this.level.theme.ground;
      ctx.fillRect(solid.x, solid.y, solid.w, solid.h);
      ctx.fillStyle = this.level.theme.edge;
      ctx.fillRect(solid.x, solid.y, solid.w, 6);
    }
  }

  private drawGoal(ctx: CanvasRenderingContext2D): void {
    const x = this.level.goalX;
    const top = this.level.groundY - 170;
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(x, top, 6, 170);
    ctx.fillStyle = this.state === "won" || this.state === "complete" ? "#4ade80" : "#fbbf24";
    ctx.beginPath();
    ctx.moveTo(x + 6, top);
    ctx.lineTo(x + 48, top + 16);
    ctx.lineTo(x + 6, top + 32);
    ctx.closePath();
    ctx.fill();
  }

  private drawHud(ctx: CanvasRenderingContext2D): void {
    // HP.
    for (let i = 0; i < this.player.maxHp; i++) {
      ctx.fillStyle = i < this.player.hp ? "#ef4444" : "#475569";
      ctx.fillRect(16 + i * 24, 16, 18, 18);
    }

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "20px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`SCORE ${this.score}`, 16, 60);

    // Stage name.
    ctx.textAlign = "center";
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "16px system-ui, sans-serif";
    ctx.fillText(this.stageDef.name, this.viewWidth / 2, 28);

    // Weapon + ammo.
    ctx.textAlign = "right";
    ctx.fillStyle = "#fde047";
    ctx.font = "18px system-ui, sans-serif";
    const ammo = this.player.hasInfiniteAmmo ? "∞" : String(this.player.weaponAmmo);
    ctx.fillText(`${this.player.weaponName}  ${ammo}`, this.viewWidth - 16, 28);

    // Controls.
    ctx.textAlign = "left";
    ctx.fillStyle = "#94a3b8";
    ctx.font = "13px system-ui, sans-serif";
    ctx.fillText(
      "移動 A/D   ジャンプ Space   照準 ↑/↓+方向   しゃがみ ↓   ショット J",
      16,
      this.viewHeight - 16,
    );
  }

  private drawBossBar(ctx: CanvasRenderingContext2D): void {
    if (!this.boss) return;
    const w = 360;
    const x = (this.viewWidth - w) / 2;
    const y = 40;
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(x - 2, y - 2, w + 4, 14);
    ctx.fillStyle = "#7f1d1d";
    ctx.fillRect(x, y, w, 10);
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(x, y, w * Math.max(0, this.boss.hp / this.boss.maxHp), 10);
    ctx.fillStyle = "#fca5a5";
    ctx.textAlign = "center";
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText("BOSS", this.viewWidth / 2, y - 6);
    ctx.textAlign = "left";
  }

  private drawBanner(ctx: CanvasRenderingContext2D): void {
    if (this.state === "playing") return;

    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);

    let title = "GAME OVER";
    let color = "#f87171";
    let sub = "R: リトライ    T: タイトル";
    if (this.state === "won") {
      title = "STAGE CLEAR!";
      color = "#4ade80";
      sub = "次のステージへ: Space";
    } else if (this.state === "complete") {
      title = "GAME COMPLETE!";
      color = "#fbbf24";
      sub = "R: もう一度    T: タイトル";
    }

    ctx.textAlign = "center";
    ctx.fillStyle = color;
    ctx.font = "bold 48px system-ui, sans-serif";
    ctx.fillText(title, this.viewWidth / 2, this.viewHeight / 2 - 8);

    ctx.fillStyle = "#f8fafc";
    ctx.font = "20px system-ui, sans-serif";
    ctx.fillText(`SCORE ${this.score}`, this.viewWidth / 2, this.viewHeight / 2 + 30);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "15px system-ui, sans-serif";
    ctx.fillText(sub, this.viewWidth / 2, this.viewHeight / 2 + 62);
    ctx.textAlign = "left";
  }
}
