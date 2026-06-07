import type { Input } from "../engine/Input";
import type { Scene, SceneManager } from "../engine/Scene";
import { Vector2 } from "../engine/Vector2";
import { Bullet } from "./Bullet";
import { Camera } from "./Camera";
import { type Bomb, CHARACTERS, type Character, type CharacterId } from "./characters";
import { Boss, Brute, type Enemy, type EnemyContext, Flyer, Shooter, Walker } from "./enemies";
import { EXPLOSION_FRAMES, FxLayer, HIT_FRAMES } from "./Fx";
import { Level } from "./Level";
import { Particles } from "./Particles";
import { Pickup, type PickupConfig } from "./Pickup";
import { showMvLink } from "./mvLink";
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
const SUMMON_LASER_GAP = 0.16; // delay before the second summon laser
const BOMB_WINDUP = 0.5; // charge time before a bomb fires

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
  private fx = new FxLayer();
  private bombFlash = 0;
  private bombFire: { cx: number; cy: number; t: number } | null = null;
  private summonFx: { cx: number; footY: number; face: number; t: number; shots: number } | null = null;
  private bombWindup: { bomb: Bomb; t: number } | null = null;
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
    showMvLink(false); // hide the title's MV credit during play
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
    this.player = new Player(120, this.level.groundY - 66, this.character);
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
    this.player.respawn(120, this.level.groundY - 66);
    this.bombWindup = null;
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
    this.bombWindup = null;
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

    // Bombs charge for BOMB_WINDUP (player rooted in a pose) before firing.
    if (input.wasPressed("KeyK") && !this.bombWindup && this.player.consumeBomb()) {
      this.bombWindup = { bomb: this.player.bomb, t: 0 };
      this.player.chargeBomb(BOMB_WINDUP);
    }
    if (this.bombWindup) {
      this.bombWindup.t += dt;
      if (this.bombWindup.t >= BOMB_WINDUP) {
        this.executeBomb(this.bombWindup.bomb);
        this.bombWindup = null;
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
    this.fx.update(dt);
    if (this.bombFlash > 0) this.bombFlash -= dt;
    if (this.bombFire) {
      this.bombFire.t += dt;
      if (this.bombFire.t >= BOMB_FIRE_TIME) this.bombFire = null;
    }
    if (this.summonFx) {
      this.summonFx.t += dt;
      // The second laser fires a beat after the first.
      if (this.summonFx.shots < 2 && this.summonFx.t >= SUMMON_LASER_GAP) {
        this.fireSummonLaser(this.summonFx.face);
        this.summonFx.shots = 2;
      }
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
          this.fx.spawn(HIT_FRAMES, b.pos.x, b.pos.y, { dur: 0.16, scale: 0.5, grow: 1.5, rot: Math.random() * Math.PI });
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
    this.fx.spawn(HIT_FRAMES, b.pos.x, b.pos.y, { dur: 0.16, scale: 0.55, grow: 1.5, rot: Math.random() * Math.PI });
    b.kill();
  }

  /** Fire the chosen bomb once its wind-up completes. */
  private executeBomb(bomb: Bomb): void {
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
    } else if (bomb.kind === "hammer") {
      this.hammerSlam(bomb.damage);
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
    this.fx.spawn(EXPLOSION_FRAMES, c.x, c.y, { dur: 0.55, scale: 2.2 });
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 40 + Math.random() * 130;
      this.fx.spawn(EXPLOSION_FRAMES, c.x + Math.cos(a) * r, c.y + Math.sin(a) * r, { dur: 0.4 + Math.random() * 0.25, scale: 1.0 + Math.random() * 0.7 });
    }
    sound.explosion();
    this.camera.shake(30);
    this.bombFlash = 0.18;
  }

  /** B's bomb: summon a demon and fire two forward lasers (boss-buster). */
  private summonDemon(): void {
    const c = this.player.center;
    const face = this.player.facingDir;
    // A lighter shock clears nearby foes; the forward lasers do the heavy hits.
    const radius = Math.hypot(this.viewWidth, this.viewHeight) * 0.4;
    for (const e of this.targets()) {
      if (e.alive && e.center.add(c.scale(-1)).length <= radius) this.hurtEnemy(e, 5);
    }
    this.summonFx = { cx: c.x, footY: c.y + 22, face, t: 0, shots: 1 };
    this.fireSummonLaser(face);
    this.particles.burst(c, "#a78bfa", 40, 360, { life: 0.7, size: 5, gravity: -40 });
    this.particles.burst(c, "#6d28d9", 30, 300, { life: 0.7, size: 5, gravity: -10 });
    sound.explosion();
    this.camera.shake(26);
  }

  /** A radial fan of heavy piercing lasers forward — the summon's main damage. */
  private fireSummonLaser(face: number): void {
    const pos = new Vector2(this.player.centerX + face * 22, this.player.center.y - 2);
    const forward = face > 0 ? 0 : Math.PI;
    const n = 5;
    const spread = 1.0; // ~57° fan
    for (let i = 0; i < n; i++) {
      const a = forward + (i - (n - 1) / 2) * (spread / (n - 1));
      const vel = new Vector2(Math.cos(a), Math.sin(a)).scale(1400);
      this.playerBullets.push(
        new Bullet(pos, vel, { radius: 11, damage: 12, color: "#0b1020", range: 1500, pierce: true, style: "laser" }),
      );
    }
    sound.shoot("laser");
  }

  /** E's bomb: a hammer ground slam — big damage to grounded enemies + shake. */
  private hammerSlam(damage: number): void {
    const gy = this.level.groundY;
    const reach = this.viewWidth * 0.7; // the ground shockwave's horizontal range
    for (const e of this.targets()) {
      // Grounded enemies within the shockwave; flyers (off the ground) are spared.
      const grounded = e.bounds.bottom >= gy - 36;
      if (e.alive && grounded && Math.abs(e.center.x - this.player.centerX) <= reach) {
        this.hurtEnemy(e, damage);
      }
    }
    // No sprite effect — the hammer pose (wind-up) sells it; just dust + shake.
    const at = new Vector2(this.player.centerX, gy - 4);
    this.particles.burst(at, "#cbd5e1", 44, 360, { life: 0.6, size: 5, gravity: 220 });
    this.particles.burst(at, "#94a3b8", 30, 240, { life: 0.7, size: 4, gravity: 160 });
    this.particles.burst(at, "#a78bfa", 18, 300, { life: 0.5, size: 4, gravity: 120 });
    for (let i = 0; i < 5; i++) {
      const ox = (Math.random() - 0.5) * reach * 1.3;
      this.fx.spawn(EXPLOSION_FRAMES, this.player.centerX + ox, gy - 12, { dur: 0.4 + Math.random() * 0.2, scale: 0.9 + Math.random() * 0.6 });
    }
    sound.explosion();
    this.camera.shake(44); // a heavy, screen-rattling impact
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
    const scale = e.bounds.w / 58; // size the blast to the enemy
    if (e.isBoss) {
      this.particles.burst(e.center, "#fdba74", 60, 460, { life: 0.8, size: 6, gravity: 120 });
      this.particles.burst(e.center, "#f87171", 40, 360, { life: 0.8, size: 6, gravity: 120 });
      // a cluster of explosions across the boss body
      for (let i = 0; i < 5; i++) {
        const ox = (Math.random() - 0.5) * e.bounds.w;
        const oy = (Math.random() - 0.5) * e.bounds.h;
        this.fx.spawn(EXPLOSION_FRAMES, e.center.x + ox, e.center.y + oy, { dur: 0.45 + Math.random() * 0.2, scale: scale * 0.7 });
      }
      sound.explosion();
      this.camera.shake(20);
      return;
    }
    this.particles.burst(e.center, "#f87171", 16, 320, { life: 0.5, size: 4 });
    this.fx.spawn(EXPLOSION_FRAMES, e.center.x, e.center.y, { dur: 0.4, scale: Math.max(0.6, scale) });
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
    for (const p of this.pickups) p.render(ctx);
    for (const e of this.enemies) e.render(ctx);
    if (this.boss && this.boss.alive) this.boss.render(ctx);
    for (const b of this.playerBullets) b.render(ctx);
    for (const b of this.enemyBullets) b.render(ctx);
    this.particles.render(ctx);
    this.fx.render(ctx);
    this.drawDashFx(ctx);
    this.drawTimeRipple(ctx);
    this.drawSummonDark(ctx); // dim the scene so the summon/lasers pop
    this.drawBombCharge(ctx); // charging glow behind the player during wind-up
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

  /** Cinematic dim while B's summon runs; the bright art shows through. */
  private drawSummonDark(ctx: CanvasRenderingContext2D): void {
    if (!this.summonFx) return;
    const p = this.summonFx.t / SUMMON_TIME;
    const a = p < 0.15 ? (p / 0.15) * 0.5 : p > 0.6 ? (1 - (p - 0.6) / 0.4) * 0.5 : 0.5;
    if (a <= 0) return;
    ctx.fillStyle = `rgba(6, 2, 16, ${Math.max(0, a)})`;
    ctx.fillRect(
      Math.round(this.camera.x) - this.camera.shakeX - 4,
      -this.camera.shakeY - 4,
      this.viewWidth + 8,
      this.viewHeight + 8,
    );
  }

  /** A pulsing, intensifying glow behind the player while a bomb charges. */
  private drawBombCharge(ctx: CanvasRenderingContext2D): void {
    if (!this.bombWindup) return;
    const p = this.bombWindup.t / BOMB_WINDUP;
    const c = this.player.center;
    const r = 8 + p * 26 + Math.sin(this.bombWindup.t * 32) * 3;
    ctx.save();
    ctx.globalAlpha = 0.2 + 0.4 * p;
    ctx.fillStyle = this.character.accent;
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.35 + 0.5 * p;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(c.x, c.y, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawParallax(ctx: CanvasRenderingContext2D): void {
    const bg = this.level.theme.bg ? getSprite(this.level.theme.bg) : undefined;
    if (bg) {
      this.drawScrollingBg(ctx, bg, 0.25);
      return;
    }
    // Fallback: procedural rolling hills until the panorama image is ready.
    this.parallaxLayer(ctx, this.level.theme.far, 0.2, 300, 560, 80);
    this.parallaxLayer(ctx, this.level.theme.hill, 0.4, 240, 480, 30);
  }

  /** Tile the scenic panorama across the screen, scrolling at `factor` × the
   *  camera. Every other copy is mirrored so the repeats meet seamlessly. */
  private drawScrollingBg(
    ctx: CanvasRenderingContext2D,
    img: CanvasImageSource,
    factor: number,
  ): void {
    const { width, height } = img as unknown as { width: number; height: number };
    const destH = this.viewHeight;
    const tw = width * (destH / height);
    const scroll = this.camera.x * factor;
    const first = Math.floor(scroll / tw) - 1;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    for (let i = first; i * tw - scroll < this.viewWidth; i++) {
      const x = i * tw - scroll;
      const mirror = ((i % 2) + 2) % 2 === 1;
      if (mirror) {
        ctx.save();
        ctx.translate(x + tw, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0, tw, destH);
        ctx.restore();
      } else {
        ctx.drawImage(img, x, 0, tw, destH);
      }
    }
    ctx.restore();
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
    const floor = this.level.theme.floor ? getSprite(this.level.theme.floor) : undefined;
    for (const solid of this.level.solids) {
      const isGround = solid.x === 0 && solid.y === this.level.groundY;
      if (floor) {
        if (isGround) this.drawFloor(ctx, floor, solid);
        else this.drawPlatform(ctx, floor, solid);
        continue;
      }
      ctx.fillStyle = this.level.theme.ground;
      ctx.fillRect(solid.x, solid.y, solid.w, solid.h);
      ctx.fillStyle = this.level.theme.edge;
      ctx.fillRect(solid.x, solid.y, solid.w, 6);
    }
  }

  /** Tile the seamless floor strip across the visible span of the ground. */
  private drawFloor(ctx: CanvasRenderingContext2D, img: CanvasImageSource, solid: { x: number; y: number; w: number; h: number }): void {
    ctx.fillStyle = "#0a0a0f"; // base behind any sub-pixel seam
    ctx.fillRect(solid.x, solid.y, solid.w, solid.h);
    this.tileStrip(ctx, img, solid.x, solid.y, solid.w, solid.h, solid.y, solid.h);
  }

  /** Texture a floating platform with the same street art: the strip's road
   *  surface is aligned to the platform top (drawn at ground scale on the same
   *  world grid as the floor), capped with a crisp landing edge and an
   *  underside shadow so it stays readable against the busy backdrop. */
  private drawPlatform(ctx: CanvasRenderingContext2D, img: CanvasImageSource, solid: { x: number; y: number; w: number; h: number; bottom: number }): void {
    const slabH = 64; // draw the strip at the same scale as the ground floor
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(solid.x, solid.y, solid.w, solid.h);
    // Anchor the strip's bottom (its road surface) to the platform bottom.
    this.tileStrip(ctx, img, solid.x, solid.y, solid.w, solid.h, solid.bottom - slabH, slabH);
    ctx.fillStyle = this.level.theme.edge;
    ctx.fillRect(solid.x, solid.y, solid.w, 2);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(solid.x, solid.bottom - 3, solid.w, 3);
  }

  /** Tile a horizontal strip image across a world-space band, anchored to the
   *  world grid (so adjacent surfaces line up) and clipped to a rect. Only the
   *  copies overlapping the camera window are drawn. */
  private tileStrip(
    ctx: CanvasRenderingContext2D,
    img: CanvasImageSource,
    clipX: number, clipY: number, clipW: number, clipH: number,
    top: number, destH: number,
  ): void {
    const { width, height } = img as unknown as { width: number; height: number };
    const tw = width * (destH / height);
    ctx.save();
    ctx.beginPath();
    ctx.rect(clipX, clipY, clipW, clipH);
    ctx.clip();
    ctx.imageSmoothingEnabled = true;
    const left = Math.max(clipX, this.camera.x - tw);
    const right = Math.min(clipX + clipW, this.camera.x + this.viewWidth + tw);
    const first = Math.floor(left / tw);
    for (let i = first; i * tw < right; i++) {
      ctx.drawImage(img, i * tw, top, tw, destH);
    }
    ctx.restore();
  }

  private drawHud(ctx: CanvasRenderingContext2D): void {
    // --- top-left: HP (hearts), lives portrait, score ---
    const heart = getSprite("item_heart");
    const ch = 20;
    let hx = 16;
    for (let i = 0; i < this.player.maxHp; i++) {
      if (heart) {
        const { width, height } = heart as unknown as { width: number; height: number };
        const w = ch * (width / height);
        ctx.globalAlpha = i < this.player.hp ? 1 : 0.22;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(heart, hx, 13, w, ch);
        ctx.globalAlpha = 1;
        hx += w + 3;
      } else {
        ctx.fillStyle = i < this.player.hp ? "#ef4444" : "#475569";
        ctx.fillRect(hx, 14, 18, 18);
        hx += 20;
      }
    }

    const ly = 40;
    let lx = 18;
    if (this.drawCharIcon(ctx, lx, ly - 2, 24)) lx += 26;
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "bold 15px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("×", lx, ly + 16);
    this.drawNumber(ctx, String(this.lives), lx + 13, ly + 2, 17);

    const gold = getSprite("item_gold");
    const sy = 66;
    let scx = 18;
    if (gold) {
      const { width, height } = gold as unknown as { width: number; height: number };
      const w = 20 * (width / height);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(gold, scx, sy - 3, w, 20);
      scx += w + 5;
    }
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 17px system-ui, sans-serif";
    this.drawNumber(ctx, String(this.score), scx, sy, 17);

    // --- top-center: stage name ---
    ctx.textAlign = "center";
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 16px system-ui, sans-serif";
    ctx.fillText(this.stageDef.name, this.viewWidth / 2, 26);

    // --- top-right: weapon name + ammo, skill stock ---
    const right = this.viewWidth - 16;
    ctx.textAlign = "right";
    ctx.fillStyle = "#fde047";
    ctx.font = "bold 22px system-ui, sans-serif";
    ctx.fillText(this.player.weaponName, right, 28);
    ctx.fillStyle = "#e2e8f0";
    if (this.player.hasInfiniteAmmo) {
      ctx.font = "bold 20px system-ui, sans-serif";
      ctx.fillText("∞", right, 54);
    } else {
      this.drawNumber(ctx, String(this.player.weaponAmmo), right, 38, 18, "right");
    }

    const sIcon = getSprite("item_s");
    const sky = 62;
    const cntStr = String(this.player.bombs);
    const nW = this.numberWidth(cntStr, 18);
    ctx.globalAlpha = this.player.bombs > 0 ? 1 : 0.45;
    this.drawNumber(ctx, cntStr, right, sky, 18, "right");
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 15px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("×", right - nW - 3, sky + 15);
    if (sIcon) {
      const { width, height } = sIcon as unknown as { width: number; height: number };
      const ih = 24;
      const iw = ih * (width / height);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(sIcon, right - nW - 14 - iw, sky - 3, iw, ih);
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = "left";
    ctx.fillStyle = "#94a3b8";
    ctx.font = "13px system-ui, sans-serif";
    ctx.fillText(
      "移動 A/D  ジャンプ Space  照準 ↑↓+方向  Attack J  Skill K",
      16,
      this.viewHeight - 16,
    );
  }

  /** Total on-screen width of a number rendered with the sprite font. */
  private numberWidth(text: string, h: number): number {
    let w = 0;
    for (const chr of text) {
      const img = getSprite("n" + chr);
      if (img) {
        const { width, height } = img as unknown as { width: number; height: number };
        w += h * (width / height) + 2;
      } else {
        w += h * 0.58;
      }
    }
    return Math.max(0, w - 2);
  }

  /** Draw an integer string with the sliced digit sprites (falls back to the
   *  canvas font when the glyphs aren't loaded). `y` is the glyph top. */
  private drawNumber(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    h: number,
    align: "left" | "right" = "left",
  ): void {
    let cx = align === "right" ? x - this.numberWidth(text, h) : x;
    const prevAlign = ctx.textAlign;
    ctx.textAlign = "left";
    for (const chr of text) {
      const img = getSprite("n" + chr);
      if (img) {
        const { width, height } = img as unknown as { width: number; height: number };
        const w = h * (width / height);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(img, cx, y, w, h);
        cx += w + 2;
      } else {
        ctx.fillText(chr, cx, y + h * 0.85);
        cx += h * 0.58;
      }
    }
    ctx.textAlign = prevAlign;
  }

  /** Draw the chosen character's idle frame as a small portrait. Returns false
   *  (so the caller can adjust layout) when the sheet isn't available. */
  private drawCharIcon(ctx: CanvasRenderingContext2D, x: number, y: number, h: number): boolean {
    const cfg = this.character.sprite;
    const sheet = cfg ? getSprite(this.character.id) : undefined;
    if (!cfg || !sheet) return false;
    const frame = cfg.anims.idle[0] ?? 0;
    const w = h * (cfg.frameW / cfg.frameH);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sheet, frame * cfg.frameW, 0, cfg.frameW, cfg.frameH, x, y, w, h);
    return true;
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
  if (r < 0.07) return { kind: "weapon" };
  if (r < 0.12) return { kind: "bomb" };
  if (r < 0.19) return { kind: "health" };
  if (r < 0.27) return { kind: "score", value: 200 };
  return null;
}
