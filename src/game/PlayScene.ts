import type { Input } from "../engine/Input";
import type { Scene, SceneManager } from "../engine/Scene";
import type { Bullet } from "./Bullet";
import { Camera } from "./Camera";
import { Boss, Brute, type Enemy, type EnemyContext, Flyer, Shooter, Walker } from "./enemies";
import { Level } from "./Level";
import { Particles } from "./Particles";
import { Pickup, type PickupConfig } from "./Pickup";
import { Player } from "./Player";
import { sound } from "./Sound";
import { type EnemyKind, type PickupDef, type StageDef, STAGES } from "./stages";
import { TitleScene } from "./TitleScene";

const CLEAR_BONUS = 500;
const DEFAULT_LIVES = 3;
const BOMB_DAMAGE = 8;

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
  private bombFlash = 0;
  private score = 0;
  private lives = DEFAULT_LIVES;
  private state: State = "playing";

  constructor(
    private readonly viewWidth: number,
    private readonly viewHeight: number,
    private readonly stageIndex: number,
    private readonly startScore: number,
    private readonly startLives = DEFAULT_LIVES,
  ) {
    this.stageDef = STAGES[Math.min(stageIndex, STAGES.length - 1)];
    this.reset();
  }

  private get isLastStage(): boolean {
    return this.stageIndex >= STAGES.length - 1;
  }

  /** Enemies/boss within this horizontal distance of the player are active. */
  private get activationRange(): number {
    return this.viewWidth * 1.3;
  }

  private reset(): void {
    this.level = new Level(this.stageDef, this.viewHeight);
    this.camera = new Camera(this.viewWidth, this.level.width);
    this.player = new Player(120, this.level.groundY - 44);
    this.enemies = this.stageDef.enemies.map((e) => this.createEnemy(e.type, e.x));
    this.pickups = this.stageDef.pickups.map(
      (p) => new Pickup(p.x, this.level.groundY, toPickupConfig(p)),
    );
    this.boss = this.level.isBossStage
      ? new Boss(this.level.width - 320, this.level.groundY)
      : null;
    this.playerBullets = [];
    this.enemyBullets = [];
    this.particles = new Particles();
    this.score = this.startScore;
    this.lives = this.startLives;
    this.state = "playing";
    sound.setBgm(true);
  }

  /** On losing a life, rebuild the stage and send the player to the start. */
  private respawnAtStart(): void {
    this.player.respawn(120, this.level.groundY - 44);
    this.enemies = this.stageDef.enemies.map((e) => this.createEnemy(e.type, e.x));
    this.pickups = this.stageDef.pickups.map(
      (p) => new Pickup(p.x, this.level.groundY, toPickupConfig(p)),
    );
    this.boss = this.level.isBossStage
      ? new Boss(this.level.width - 320, this.level.groundY)
      : null;
    this.playerBullets = [];
    this.enemyBullets = [];
    this.particles = new Particles();
    this.bombFlash = 0;
    this.camera.follow(this.player.centerX);
  }

  private createEnemy(kind: EnemyKind, x: number): Enemy {
    const g = this.level.groundY;
    if (kind === "shooter") return new Shooter(x, g);
    if (kind === "flyer") return new Flyer(x, g);
    if (kind === "brute") return new Brute(x, g);
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

    if (input.wasPressed("KeyK") && this.player.consumeBomb()) {
      this.detonateBomb();
    }

    const ctx: EnemyContext = {
      dt,
      level: this.level,
      playerCenter: this.player.center,
      fire: (b) => this.enemyBullets.push(b),
      audio: sound,
    };
    // Enemies (and the boss) only think while the player is nearby, so placed
    // encounters trigger as you reach them instead of swarming from afar.
    const range = this.activationRange;
    for (const e of this.enemies) {
      if (Math.abs(e.center.x - this.player.centerX) <= range) e.update(ctx);
    }
    if (
      this.boss &&
      this.boss.alive &&
      Math.abs(this.boss.center.x - this.player.centerX) <= range
    ) {
      this.boss.update(ctx);
    }

    for (const b of this.playerBullets) b.update(dt);
    for (const b of this.enemyBullets) b.update(dt);
    for (const p of this.pickups) p.update(dt);
    this.particles.update(dt);
    if (this.bombFlash > 0) this.bombFlash -= dt;

    this.handlePlayerBullets();
    this.handleEnemyBullets();
    this.handleContact();
    this.handleSpikes();
    this.handlePickups();
    this.cull();

    this.camera.follow(this.player.centerX);
    this.camera.update(dt);

    this.checkWinLose();
  }

  private updateEndState(input: Input, game: SceneManager): void {
    if (this.state === "won") {
      if (["Space", "Enter", "KeyJ"].some((k) => input.wasPressed(k))) {
        game.changeScene(
          new PlayScene(
            this.viewWidth, this.viewHeight, this.stageIndex + 1, this.score, this.lives,
          ),
        );
      }
      return;
    }
    // On the lost/complete screen, jump/shoot or R retries; T returns to title.
    const retry = ["Space", "Enter", "KeyJ", "KeyR"].some((k) => input.wasPressed(k));
    if (retry) {
      const index = this.state === "complete" ? 0 : this.stageIndex;
      const score = this.state === "complete" ? 0 : this.startScore;
      game.changeScene(
        new PlayScene(this.viewWidth, this.viewHeight, index, score, DEFAULT_LIVES),
      );
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
    this.particles.burst(b.pos, "#fef9c3", 5, 160, { life: 0.25, size: 2, gravity: 0 });
    b.kill();
  }

  /** The bomb special ability: a screen-wide blast centered on the player. */
  private detonateBomb(): void {
    const c = this.player.center;
    const radius = Math.hypot(this.viewWidth, this.viewHeight) * 0.6;
    for (const e of this.targets()) {
      if (e.alive && e.center.add(c.scale(-1)).length <= radius) {
        this.hurtEnemy(e, BOMB_DAMAGE);
      }
    }
    this.particles.burst(c, "#fde047", 80, 920, { life: 0.7, size: 7, gravity: 60 });
    this.particles.burst(c, "#fb923c", 64, 760, { life: 0.7, size: 7, gravity: 60 });
    this.particles.burst(c, "#f87171", 44, 540, { life: 0.6, size: 6, gravity: 60 });
    sound.explosion();
    this.camera.shake(30);
    this.bombFlash = 0.18;
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
    const drop = rollDrop();
    if (drop) this.pickups.push(new Pickup(e.center.x - 14, this.level.groundY, drop));
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

  private handleSpikes(): void {
    const hurt = this.player.hurtBounds;
    for (const s of this.level.spikes) {
      if (hurt.intersects(s)) this.hitPlayer();
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
      if (!p.alive || !box.intersects(p.bounds)) continue;
      const c = p.config;
      if (c.kind === "weapon") this.player.pickupWeapon(c.weapon);
      else if (c.kind === "health") this.player.heal(1);
      else if (c.kind === "bomb") this.player.addBomb();
      else this.score += c.value;
      sound.pickup();
      p.alive = false;
    }
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
      this.camera.shake(16);
      sound.explosion();
      if (this.lives > 1) {
        this.lives -= 1;
        this.respawnAtStart();
      } else {
        this.lives = 0;
        this.particles.burst(this.player.center, "#fca5a5", 26, 340, { life: 0.6, size: 4 });
        this.state = "lost";
        sound.gameover();
        sound.setBgm(false);
      }
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
    ctx.fillStyle = this.level.theme.sky;
    ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);
    this.drawParallax(ctx);

    ctx.save();
    ctx.translate(-Math.round(this.camera.x) + this.camera.shakeX, this.camera.shakeY);
    this.drawLevel(ctx);
    this.drawSpikes(ctx);
    if (!this.level.isBossStage) this.drawGoal(ctx);
    for (const p of this.pickups) p.render(ctx);
    for (const e of this.enemies) e.render(ctx);
    if (this.boss && this.boss.alive) this.boss.render(ctx);
    for (const b of this.playerBullets) b.render(ctx);
    for (const b of this.enemyBullets) b.render(ctx);
    this.particles.render(ctx);
    this.player.render(ctx);
    ctx.restore();

    if (this.bombFlash > 0) {
      ctx.fillStyle = `rgba(253, 230, 138, ${Math.min(0.5, this.bombFlash * 2.6)})`;
      ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);
    }

    this.drawHud(ctx);
    if (
      this.boss &&
      this.boss.alive &&
      Math.abs(this.boss.center.x - this.player.centerX) <= this.activationRange
    ) {
      this.drawBossBar(ctx);
    }
    this.drawBanner(ctx);
  }

  private drawParallax(ctx: CanvasRenderingContext2D): void {
    this.parallaxLayer(ctx, this.level.theme.far, 0.2, 300, 560, 80);
    this.parallaxLayer(ctx, this.level.theme.hill, 0.4, 240, 480, 30);
  }

  private parallaxLayer(
    ctx: CanvasRenderingContext2D,
    color: string,
    factor: number,
    radius: number,
    spacing: number,
    yOffset: number,
  ): void {
    ctx.fillStyle = color;
    const offset = (this.camera.x * factor) % spacing;
    for (let i = -1; i * spacing - offset < this.viewWidth + spacing; i++) {
      const cx = i * spacing - offset + spacing / 2;
      ctx.beginPath();
      ctx.arc(cx, this.level.groundY + yOffset, radius, Math.PI, 0);
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

  private drawSpikes(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "#cbd5e1";
    for (const s of this.level.spikes) {
      const teeth = Math.max(1, Math.floor(s.w / 14));
      const tw = s.w / teeth;
      for (let i = 0; i < teeth; i++) {
        const x = s.x + i * tw;
        ctx.beginPath();
        ctx.moveTo(x, s.bottom);
        ctx.lineTo(x + tw / 2, s.y);
        ctx.lineTo(x + tw, s.bottom);
        ctx.closePath();
        ctx.fill();
      }
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
    for (let i = 0; i < this.player.maxHp; i++) {
      ctx.fillStyle = i < this.player.hp ? "#ef4444" : "#475569";
      ctx.fillRect(16 + i * 24, 16, 18, 18);
    }

    ctx.textAlign = "left";
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "16px system-ui, sans-serif";
    ctx.fillText(`× ${this.lives}`, 16 + this.player.maxHp * 24 + 6, 31);

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "20px system-ui, sans-serif";
    ctx.fillText(`SCORE ${this.score}`, 16, 60);

    ctx.textAlign = "center";
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "16px system-ui, sans-serif";
    ctx.fillText(this.stageDef.name, this.viewWidth / 2, 28);

    ctx.textAlign = "right";
    ctx.fillStyle = "#fde047";
    ctx.font = "18px system-ui, sans-serif";
    const ammo = this.player.hasInfiniteAmmo ? "∞" : String(this.player.weaponAmmo);
    ctx.fillText(`${this.player.weaponName}  ${ammo}`, this.viewWidth - 16, 28);

    ctx.fillStyle = this.player.bombs > 0 ? "#fbbf24" : "#475569";
    ctx.font = "15px system-ui, sans-serif";
    ctx.fillText(`BOMB ×${this.player.bombs}  [K]`, this.viewWidth - 16, 52);

    ctx.textAlign = "left";
    ctx.fillStyle = "#94a3b8";
    ctx.font = "13px system-ui, sans-serif";
    ctx.fillText(
      "移動 A/D  ジャンプ Space  照準 ↑↓+方向  ショット J  ボム K",
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

function toPickupConfig(def: PickupDef): PickupConfig {
  if (def.kind === "weapon") return { kind: "weapon", weapon: def.weapon };
  if (def.kind === "health") return { kind: "health" };
  if (def.kind === "bomb") return { kind: "bomb" };
  return { kind: "score", value: def.value };
}

function rollDrop(): PickupConfig | null {
  const r = Math.random();
  if (r < 0.1) return { kind: "weapon", weapon: "flame" };
  if (r < 0.16) return { kind: "bomb" };
  if (r < 0.24) return { kind: "health" };
  if (r < 0.34) return { kind: "score", value: 200 };
  return null;
}
