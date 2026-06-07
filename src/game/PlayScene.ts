import type { Input } from "../engine/Input";
import type { Scene, SceneManager } from "../engine/Scene";
import type { Bullet } from "./Bullet";
import { Camera } from "./Camera";
import { CHARACTERS, type Character, type CharacterId } from "./characters";
import { Boss, Brute, type Enemy, type EnemyContext, Flyer, Shooter, Walker } from "./enemies";
import { Level } from "./Level";
import { Particles } from "./Particles";
import { Pickup, type PickupConfig } from "./Pickup";
import { type MeleeHit, Player } from "./Player";
import { sound } from "./Sound";
import { getSprite } from "./sprites";
import { type EnemyKind, type PickupDef, type StageDef, STAGES } from "./stages";
import { TitleScene } from "./TitleScene";

const CLEAR_BONUS = 500;
export const DEFAULT_LIVES = 3;
const BOMB_DAMAGE = 8;
const BOMB_FIRE_TIME = 0.55;
const SUMMON_TIME = 1.0;
const DASH_SHOCK_TIME = 0.35;
const HEAL_FX_TIME = 0.85;
const TIME_RIPPLE_TIME = 0.6;

type State = "playing" | "won" | "lost" | "complete";

/** The main run-and-gun gameplay: clear the stage, survive, beat the boss. */
export class PlayScene implements Scene {
  private readonly stageDef: StageDef;
  private readonly character: Character;
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
  private bombFire: { cx: number; cy: number; t: number } | null = null;
  private summonFx: { cx: number; footY: number; t: number } | null = null;
  private dashShock: { cx: number; cy: number; t: number } | null = null;
  private healFx: { cx: number; cy: number; t: number } | null = null;
  private timeRipple: { cx: number; cy: number; t: number } | null = null;
  private timeStop = 0;
  private dashDamage = 0;
  private dashHits = new Set<unknown>();
  private score = 0;
  private lives = DEFAULT_LIVES;
  private state: State = "playing";

  constructor(
    private readonly viewWidth: number,
    private readonly viewHeight: number,
    private readonly stageIndex: number,
    private readonly startScore: number,
    private readonly startLives = DEFAULT_LIVES,
    private readonly characterId: CharacterId = "A",
  ) {
    this.stageDef = STAGES[Math.min(stageIndex, STAGES.length - 1)];
    this.character = CHARACTERS[characterId];
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
    this.player = new Player(120, this.level.groundY - 44, this.character);
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
    this.bombFire = null;
    this.summonFx = null;
    this.dashShock = null;
    this.healFx = null;
    this.timeRipple = null;
    this.timeStop = 0;
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
    if (input.wasPressed("KeyT")) {
      game.changeScene(new TitleScene());
      return;
    }

    sound.update();
    this.player.update(dt, input, this.level, this.playerBullets, sound);
    if (this.player.takeAirJump()) {
      this.particles.burst(this.player.center, "#e2e8f0", 8, 150, {
        life: 0.3, size: 3, gravity: 0,
      });
    }

    if (input.wasPressed("KeyK") && this.player.consumeBomb()) {
      const bomb = this.player.bomb;
      if (bomb.kind === "blast") {
        this.detonateBomb();
      } else if (bomb.kind === "shotgun") {
        this.player.fireBombShotgun(this.playerBullets, bomb.shot);
        sound.shoot(bomb.shot.style ?? "gun");
        this.camera.shake(8);
      } else if (bomb.kind === "heal") {
        this.player.heal(bomb.amount);
        const c = this.player.center;
        this.healFx = { cx: c.x, cy: c.y, t: 0 };
        this.particles.burst(c, "#86efac", 30, 240, { life: 0.7, size: 4, gravity: -80 });
        this.particles.burst(c, "#bbf7d0", 22, 150, { life: 0.85, size: 3, gravity: -50 });
        sound.pickup();
      } else if (bomb.kind === "timestop") {
        this.timeStop = bomb.duration;
        const c = this.player.center;
        this.timeRipple = { cx: c.x, cy: c.y, t: 0 };
        sound.explosion();
        this.camera.shake(10);
      } else if (bomb.kind === "summon") {
        this.summonDemon();
      } else {
        this.player.startDash();
        this.dashDamage = bomb.damage;
        this.dashHits = new Set();
        sound.explosion();
        this.camera.shake(12);
        const c = this.player.center;
        this.dashShock = { cx: c.x, cy: c.y + 18, t: 0 };
      }
    }

    const melee = this.player.takeMelee();
    if (melee) this.applyMelee(melee);
    if (this.player.isDashing) this.applyDash();

    const frozen = this.timeStop > 0;
    if (this.timeStop > 0) this.timeStop -= dt;

    const ctx: EnemyContext = {
      dt,
      level: this.level,
      playerCenter: this.player.center,
      fire: (b) => this.enemyBullets.push(b),
      audio: sound,
    };
    // Enemies (and the boss) only think while the player is nearby — and not
    // while time is stopped.
    const range = this.activationRange;
    if (!frozen) {
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
      for (const b of this.enemyBullets) b.update(dt);
    }

    for (const b of this.playerBullets) b.update(dt);
    for (const p of this.pickups) p.update(dt);
    this.particles.update(dt);
    if (this.bombFlash > 0) this.bombFlash -= dt;
    if (this.bombFire) {
      this.bombFire.t += dt;
      if (this.bombFire.t >= BOMB_FIRE_TIME) this.bombFire = null;
    }
    if (this.summonFx) {
      this.summonFx.t += dt;
      if (this.summonFx.t >= SUMMON_TIME) this.summonFx = null;
    }
    if (this.dashShock) {
      this.dashShock.t += dt;
      if (this.dashShock.t >= DASH_SHOCK_TIME) this.dashShock = null;
    }
    if (this.healFx) {
      this.healFx.t += dt;
      if (this.healFx.t >= HEAL_FX_TIME) this.healFx = null;
    }
    if (this.timeRipple) {
      this.timeRipple.t += dt;
      if (this.timeRipple.t >= TIME_RIPPLE_TIME) this.timeRipple = null;
    }

    this.handlePlayerBullets();
    if (!frozen) {
      this.handleEnemyBullets();
      this.handleContact();
    }
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
            this.characterId,
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
        new PlayScene(this.viewWidth, this.viewHeight, index, score, DEFAULT_LIVES, this.characterId),
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
      // Piercing shots (e.g. B's laser) pass through terrain too.
      if (!b.pierce && this.level.solids.some((s) => box.intersects(s))) {
        this.onBulletImpact(b);
        continue;
      }
      for (const e of targets) {
        if (!e.alive || !box.intersects(e.bounds)) continue;
        if (b.pierce) {
          if (b.hitTargets.has(e)) continue;
          b.hitTargets.add(e);
          this.hurtEnemy(e, b.damage);
          this.particles.burst(e.center, "#c4b5fd", 4, 160, { life: 0.2, size: 2, gravity: 0 });
        } else {
          this.hurtEnemy(e, b.damage);
          this.onBulletImpact(b);
          break;
        }
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
    this.particles.burst(c, "#fde047", 48, 820, { life: 0.6, size: 6, gravity: 60 });
    this.particles.burst(c, "#fb923c", 36, 620, { life: 0.6, size: 6, gravity: 60 });
    this.bombFire = { cx: c.x, cy: c.y, t: 0 };
    sound.explosion();
    this.camera.shake(30);
    this.bombFlash = 0.18;
  }

  /** B's bomb: summon a demon — a screen-wide dark blast under the summon art. */
  private summonDemon(): void {
    const c = this.player.center;
    const radius = Math.hypot(this.viewWidth, this.viewHeight) * 0.55;
    for (const e of this.targets()) {
      if (e.alive && e.center.add(c.scale(-1)).length <= radius) {
        this.hurtEnemy(e, BOMB_DAMAGE);
      }
    }
    this.particles.burst(c, "#a78bfa", 40, 360, { life: 0.7, size: 5, gravity: -40 });
    this.particles.burst(c, "#6d28d9", 30, 300, { life: 0.7, size: 5, gravity: -10 });
    this.summonFx = { cx: c.x, footY: c.y + 22, t: 0 };
    sound.explosion();
    this.camera.shake(26);
  }

  /** Apply a melee swing (a forward arc) to enemies in range. */
  private applyMelee(m: MeleeHit): void {
    const half = m.arc / 2;
    let hit = false;
    for (const e of this.targets()) {
      if (!e.alive) continue;
      const ec = e.center;
      // Measure to the enemy's nearest edge, not its centre, so a target whose
      // body is within the arc connects even when its centre sits just past the
      // range — matching the drawn arc.
      const b = e.bounds;
      const nx = Math.max(b.x, Math.min(m.x, b.right));
      const ny = Math.max(b.y, Math.min(m.y, b.bottom));
      const dist = Math.hypot(nx - m.x, ny - m.y);
      if (dist > m.range) continue;
      // Point-blank: skip the angle test so a touching enemy always connects.
      if (dist > 40) {
        const ang = Math.atan2(ec.y - m.y, ec.x - m.x);
        const diff = Math.abs(Math.atan2(Math.sin(ang - m.angle), Math.cos(ang - m.angle)));
        if (diff > half) continue;
      }
      this.hurtEnemy(e, m.damage);
      this.particles.burst(ec, "#f1f5f9", 8, 200, { life: 0.25, size: 3 });
      hit = true;
    }
    if (hit) this.camera.shake(4);
  }

  /** Damage enemies the player ploughs through during a dash. */
  private applyDash(): void {
    const box = this.player.bounds;
    for (const e of this.targets()) {
      if (!e.alive || this.dashHits.has(e) || !box.intersects(e.bounds)) continue;
      this.dashHits.add(e);
      this.hurtEnemy(e, this.dashDamage);
      this.particles.burst(e.center, "#e2e8f0", 12, 260, { life: 0.3, size: 3 });
    }
    this.particles.burst(this.player.center, this.character.accent, 2, 60, {
      life: 0.2, size: 3, gravity: 0,
    });
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
      if (c.kind === "weapon") this.player.pickupSpecial();
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
    this.drawDashFx(ctx);
    this.drawTimeRipple(ctx);
    this.player.render(ctx);
    this.drawBombFire(ctx);
    this.drawSummon(ctx);
    this.drawHealFx(ctx);
    ctx.restore();

    if (this.bombFlash > 0) {
      ctx.fillStyle = `rgba(253, 230, 138, ${Math.min(0.5, this.bombFlash * 2.6)})`;
      ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);
    }
    if (this.healFx && this.healFx.t < 0.2) {
      ctx.fillStyle = `rgba(134, 239, 172, ${(1 - this.healFx.t / 0.2) * 0.22})`;
      ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);
    }
    if (this.timeRipple && this.timeRipple.t < 0.16) {
      ctx.fillStyle = `rgba(207, 250, 254, ${(1 - this.timeRipple.t / 0.16) * 0.4})`;
      ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);
    }

    if (this.timeStop > 0) {
      ctx.fillStyle = "rgba(34, 211, 238, 0.12)";
      ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);
      ctx.textAlign = "center";
      ctx.fillStyle = "#67e8f9";
      ctx.font = "bold 22px system-ui, sans-serif";
      ctx.fillText("TIME STOP", this.viewWidth / 2, 104);
      ctx.textAlign = "left";
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

  /** The fire bomb: a central fireball that swells, plus a ring of flames
   *  bursting outward, all fading over BOMB_FIRE_TIME. */
  private drawBombFire(ctx: CanvasRenderingContext2D): void {
    if (!this.bombFire) return;
    const img = getSprite("fireBig");
    if (!img) return;
    const { cx, cy, t } = this.bombFire;
    const p = t / BOMB_FIRE_TIME; // 0..1
    const ease = 1 - (1 - p) * (1 - p); // ease-out
    const { width, height } = img as unknown as { width: number; height: number };
    const aspect = height / width;
    const draw = (x: number, y: number, size: number, rot: number, alpha: number) => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, -size / 2, (-size * aspect) / 2, size, size * aspect);
      ctx.restore();
    };
    // Ring of flames bursting outward (the art points right → points outward).
    const reach = ease * Math.min(this.viewWidth, this.viewHeight) * 0.55;
    const n = 8;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + 0.4;
      draw(cx + Math.cos(ang) * reach, cy + Math.sin(ang) * reach, 120 * (0.7 + 0.6 * ease), ang, 1 - p);
    }
    // Central swelling burst.
    draw(cx, cy, 200 + 280 * ease, 0, 1 - p * 0.8);
  }

  /** B's summon bomb: a magic circle on the ground with a demon rising above. */
  private drawSummon(ctx: CanvasRenderingContext2D): void {
    if (!this.summonFx) return;
    const { cx, footY, t } = this.summonFx;
    const p = t / SUMMON_TIME;
    const circle = getSprite("summonCircle");
    if (circle) {
      const { width, height } = circle as unknown as { width: number; height: number };
      const grow = Math.min(1, p / 0.2);
      const fade = p > 0.7 ? 1 - (p - 0.7) / 0.3 : 1;
      const w = 165 * (0.4 + 0.6 * grow), h = w * (height / width);
      ctx.save();
      ctx.globalAlpha = Math.max(0, fade) * 0.95;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(circle, cx - w / 2, footY - h / 2, w, h);
      ctx.restore();
    }
    const demon = getSprite("demonB");
    if (demon) {
      const { width, height } = demon as unknown as { width: number; height: number };
      const grow = 0.7 + 0.3 * Math.min(1, p / 0.35);
      const dh = 145 * grow, dw = dh * (width / height);
      const fadeIn = Math.min(1, p / 0.15);
      const fadeOut = p > 0.74 ? 1 - (p - 0.74) / 0.26 : 1;
      const bob = Math.sin(p * Math.PI) * 6;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(fadeIn, fadeOut));
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(demon, cx - dw / 2, footY - dh + 8 - bob, dw, dh);
      ctx.restore();
    }
  }

  /** E's dash bomb: streaks along the charge and a shockwave where it began. */
  private drawDashFx(ctx: CanvasRenderingContext2D): void {
    const streak = getSprite("dashE");
    if (this.player.isDashing && streak) {
      const c = this.player.center;
      const { width, height } = streak as unknown as { width: number; height: number };
      const h = 60, w = h * (width / height);
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.scale(this.player.facingDir, 1);
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = 0.85;
      ctx.drawImage(streak, -w / 2, -h / 2, w, h);
      ctx.globalAlpha = 0.4;
      ctx.drawImage(streak, -w / 2 - 26, -h / 2 + 5, w, h);
      ctx.restore();
    }
    const shock = getSprite("shockE");
    if (this.dashShock && shock) {
      const { cx, cy, t } = this.dashShock;
      const p = t / DASH_SHOCK_TIME;
      const { width, height } = shock as unknown as { width: number; height: number };
      const w = 200 * (0.6 + 0.7 * p), h = w * (height / width);
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - p);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(shock, cx - w / 2, cy - h / 2, w, h);
      ctx.restore();
    }
  }

  /** C's heal bomb: a green pillar/cross on the ground and a rising radiance. */
  private drawHealFx(ctx: CanvasRenderingContext2D): void {
    if (!this.healFx) return;
    const { cx, cy, t } = this.healFx;
    const p = t / HEAL_FX_TIME;
    const fade = p < 0.18 ? p / 0.18 : p > 0.6 ? 1 - (p - 0.6) / 0.4 : 1;
    ctx.save();
    ctx.globalAlpha = Math.max(0, fade);
    ctx.imageSmoothingEnabled = false;
    const pillar = getSprite("healPillar");
    if (pillar) {
      const { width, height } = pillar as unknown as { width: number; height: number };
      const w = 120 * (0.5 + 0.6 * Math.min(1, p / 0.3)), h = w * (height / width);
      ctx.drawImage(pillar, cx - w / 2, cy + 24 - h / 2, w, h);
    }
    const burst = getSprite("healBurst");
    if (burst) {
      const { width, height } = burst as unknown as { width: number; height: number };
      const h = 110 * (0.7 + 0.4 * Math.min(1, p / 0.4)), w = h * (width / height);
      ctx.drawImage(burst, cx - w / 2, cy + 18 - h - p * 16, w, h); // rising from the feet
    }
    ctx.restore();
  }

  /** D's timestop bomb: expanding cyan rings and radial freeze spikes. */
  private drawTimeRipple(ctx: CanvasRenderingContext2D): void {
    if (!this.timeRipple) return;
    const { cx, cy, t } = this.timeRipple;
    const p = t / TIME_RIPPLE_TIME;
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#67e8f9";
    for (let i = 0; i < 3; i++) {
      const rp = p - i * 0.13;
      if (rp <= 0) continue;
      ctx.globalAlpha = Math.max(0, 1 - rp) * 0.8;
      ctx.beginPath();
      ctx.arc(cx, cy, rp * 300, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = Math.max(0, 1 - p) * 0.8;
    ctx.strokeStyle = "#a5f3fc";
    ctx.lineWidth = 2;
    const rIn = 30 + p * 40, rOut = 70 + p * 120;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * rIn, cy + Math.sin(a) * rIn);
      ctx.lineTo(cx + Math.cos(a) * rOut, cy + Math.sin(a) * rOut);
      ctx.stroke();
    }
    ctx.restore();
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

    ctx.fillStyle = this.character.accent;
    ctx.font = "13px system-ui, sans-serif";
    ctx.fillText(`${this.character.name}・${this.character.attribute}`, 16, 80);

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
  if (def.kind === "weapon") return { kind: "weapon" };
  if (def.kind === "health") return { kind: "health" };
  if (def.kind === "bomb") return { kind: "bomb" };
  return { kind: "score", value: def.value };
}

function rollDrop(): PickupConfig | null {
  const r = Math.random();
  if (r < 0.1) return { kind: "weapon" };
  if (r < 0.16) return { kind: "bomb" };
  if (r < 0.24) return { kind: "health" };
  if (r < 0.34) return { kind: "score", value: 200 };
  return null;
}
