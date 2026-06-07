import type { Input } from "../engine/Input";
import { Rect } from "../engine/Rect";
import { clamp, Vector2 } from "../engine/Vector2";
import { Bullet } from "./Bullet";
import type { Bomb, Character, WeaponSpec } from "./characters";
import type { Level } from "./Level";
import type { Sound } from "./Sound";
import { getSprite, type SpriteConfig } from "./sprites";

const WIDTH = 42;
const STAND_H = 66;
const MOVE_SPEED = 230;
const JUMP_SPEED = 700;
const GRAVITY = 1700;
const MAX_HP = 5;
const HIT_INVULN = 1.2;
const RESPAWN_INVULN = 2;
const MAX_BOMBS = 3;
const DASH_SPEED = 840;
const DASH_TIME = 0.6;
const SLASH_TIME = 0.12;

const UP_KEYS = ["ArrowUp", "KeyW"];
const DOWN_KEYS = ["ArrowDown", "KeyS"];
const FIRE_KEYS = ["KeyJ", "KeyZ"];

/** A melee swing request, applied to enemies by the scene. */
export interface MeleeHit {
  x: number;
  y: number;
  angle: number; // centre direction of the arc
  range: number;
  arc: number;
  damage: number;
}

/** The player. Movement is shared; weapons/bomb come from the chosen Character. */
export class Player {
  private x: number;
  private y: number;
  private vx = 0;
  private vy = 0;
  private facing = 1;
  private onGround = false;
  private fireCooldown = 0;
  private invuln = 0;
  private jumpsUsed = 0;
  private slashTimer = 0;
  private slashAngle = 0;
  private dashTimer = 0;
  private airJumpFx = false;
  private pendingMelee: MeleeHit | null = null;
  private special = false; // using the pickup weapon instead of the main attack
  private ammo = 0;
  private animTime = 0; // drives sprite animation frame selection
  private shootFx = 0; // brief timer so the "shoot" pose lingers after firing
  private bombPose = 0; // shows the bomb charge pose while > 0
  private bombPoseDur = 0; // total wind-up length, for picking the pose phase
  private actionLock = 0; // ignores move/jump/shoot input while > 0 (bomb wind-up)
  private downed = false; // knocked out: drawn lying on the ground (death pause)

  hp = MAX_HP;
  bombs = 1;

  constructor(
    x: number,
    y: number,
    private readonly character: Character,
  ) {
    this.x = x;
    this.y = y;
  }

  get maxHp(): number {
    return MAX_HP;
  }
  get alive(): boolean {
    return this.hp > 0;
  }
  get centerX(): number {
    return this.x + WIDTH / 2;
  }
  get facingDir(): number {
    return this.facing;
  }
  get center(): Vector2 {
    return new Vector2(this.x + WIDTH / 2, this.y + STAND_H / 2);
  }
  get bounds(): Rect {
    return new Rect(this.x, this.y, WIDTH, STAND_H);
  }
  get hurtBounds(): Rect {
    return this.bounds;
  }
  get weaponName(): string {
    return this.special ? this.character.special.name : this.character.normal.name;
  }
  get weaponAmmo(): number {
    return this.ammo;
  }
  get hasInfiniteAmmo(): boolean {
    return !this.special;
  }
  get bomb(): Bomb {
    return this.character.bomb;
  }
  private get maxJumps(): number {
    return 1 + (this.character.airJumps ?? 0);
  }

  update(dt: number, input: Input, level: Level, bullets: Bullet[], audio: Sound): void {
    if (this.invuln > 0) this.invuln -= dt;
    if (this.slashTimer > 0) this.slashTimer -= dt;
    if (this.shootFx > 0) this.shootFx -= dt;
    if (this.bombPose > 0) this.bombPose -= dt;
    if (this.actionLock > 0) this.actionLock -= dt;
    this.animTime += dt;

    // During the bomb wind-up the player is rooted in place (no input acts).
    const locked = this.actionLock > 0;
    const move = locked ? 0 : input.horizontal();
    this.vx = move * MOVE_SPEED;
    if (move !== 0) this.facing = move;

    if (this.onGround) this.jumpsUsed = 0;
    if (!locked && input.wasPressed("Space") && this.jumpsUsed < this.maxJumps) {
      if (!this.onGround) this.airJumpFx = true; // a mid-air (double) jump
      this.vy = -JUMP_SPEED;
      this.onGround = false;
      this.jumpsUsed += 1;
      audio.jump();
    }

    this.vy += GRAVITY * dt;

    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      this.vx = this.facing * DASH_SPEED;
      this.vy = 0; // a flat horizontal lunge
    }

    this.x += this.vx * dt;
    this.resolveHorizontal(level);
    this.y += this.vy * dt;
    this.resolveVertical(level);
    this.x = clamp(this.x, 0, level.width - WIDTH);

    if (!locked) this.updateShooting(dt, input, bullets, audio);
  }

  /** Begin a bomb wind-up: hold the charge pose and ignore input for `dur`. */
  chargeBomb(dur: number): void {
    this.bombPose = dur;
    this.bombPoseDur = dur;
    this.actionLock = dur;
  }

  private resolveHorizontal(level: Level): void {
    const box = this.bounds;
    for (const solid of level.solids) {
      if (!box.intersects(solid)) continue;
      if (this.vx > 0) this.x = solid.x - WIDTH;
      else if (this.vx < 0) this.x = solid.right;
      this.vx = 0;
      box.x = this.x;
    }
  }

  private resolveVertical(level: Level): void {
    this.onGround = false;
    const box = this.bounds;
    for (const solid of level.solids) {
      if (!box.intersects(solid)) continue;
      if (this.vy > 0) {
        this.y = solid.y - STAND_H;
        this.onGround = true;
      } else if (this.vy < 0) {
        this.y = solid.bottom;
      }
      this.vy = 0;
      box.y = this.y;
    }
  }

  private aim(input: Input): Vector2 {
    const up = UP_KEYS.some((k) => input.isDown(k));
    const down = DOWN_KEYS.some((k) => input.isDown(k));
    const h = input.horizontal();

    let ax: number;
    let ay: number;
    if (up) {
      ay = -1;
      ax = h;
    } else if (down && !this.onGround) {
      ay = 1;
      ax = h;
    } else {
      ay = 0;
      ax = this.facing;
    }
    if (ax === 0 && ay === 0) ax = this.facing;
    return new Vector2(ax, ay).normalized();
  }

  private gunY(): number {
    return this.y + STAND_H * 0.4;
  }

  private updateShooting(dt: number, input: Input, bullets: Bullet[], audio: Sound): void {
    this.fireCooldown -= dt;
    const firing = FIRE_KEYS.some((k) => input.isDown(k));
    if (!firing || this.fireCooldown > 0) return;

    const spec = this.special ? this.character.special : this.character.normal;

    if (spec.melee) {
      const aim = this.aim(input);
      const angle = Math.atan2(aim.y, aim.x);
      this.pendingMelee = {
        x: this.centerX,
        y: this.y + STAND_H / 2,
        angle,
        range: spec.melee.range,
        arc: spec.melee.arc,
        damage: spec.damage,
      };
      this.slashAngle = angle;
      this.slashTimer = SLASH_TIME;
    } else if (spec.extraUp) {
      // Fire forward and diagonally up-forward at the same time.
      const forward = this.facing > 0 ? 0 : Math.PI;
      const diag = this.facing > 0 ? -Math.PI / 4 : (-3 * Math.PI) / 4;
      const muzzle = new Vector2(this.centerX + this.facing * 18, this.gunY());
      for (const angle of [forward, diag]) {
        const vel = new Vector2(Math.cos(angle), Math.sin(angle)).scale(spec.speed);
        bullets.push(this.makeBullet(muzzle, vel, spec));
      }
    } else {
      const aim = this.aim(input);
      const baseAngle = Math.atan2(aim.y, aim.x);
      const muzzle = new Vector2(this.centerX + aim.x * 18, this.gunY() + aim.y * 14);
      for (let i = 0; i < spec.pellets; i++) {
        const spread = spec.spread === 0 ? 0 : (Math.random() - 0.5) * spec.spread;
        const angle = baseAngle + spread;
        const vel = new Vector2(Math.cos(angle), Math.sin(angle)).scale(spec.speed);
        bullets.push(this.makeBullet(muzzle, vel, spec));
      }
    }

    this.fireCooldown = spec.fireDelay;
    this.shootFx = 0.14;
    audio.shoot(spec.melee ? "slash" : spec.style ?? "gun");

    if (this.special) {
      this.ammo -= 1;
      if (this.ammo <= 0) this.special = false;
    }
  }

  /** Fire a forward shotgun burst (the bomb ability for some characters). */
  fireBombShotgun(bullets: Bullet[], shot: WeaponSpec): void {
    const forward = this.facing > 0 ? 0 : Math.PI;
    const muzzle = new Vector2(this.centerX + this.facing * 20, this.gunY());
    for (let i = 0; i < shot.pellets; i++) {
      const offset = (i - (shot.pellets - 1) / 2) * shot.spread;
      const angle = forward + offset;
      const vel = new Vector2(Math.cos(angle), Math.sin(angle)).scale(shot.speed);
      bullets.push(this.makeBullet(muzzle, vel, shot));
    }
  }

  private makeBullet(pos: Vector2, vel: Vector2, spec: WeaponSpec): Bullet {
    return new Bullet(pos, vel, {
      radius: spec.radius,
      damage: spec.damage,
      color: spec.color,
      range: spec.range,
      pierce: spec.pierce,
      style: spec.style,
    });
  }

  pickupSpecial(): void {
    this.special = true;
    this.ammo = this.character.special.ammo;
  }

  hit(): void {
    if (this.invuln > 0 || this.dashTimer > 0) return;
    this.hp -= 1;
    this.invuln = HIT_INVULN;
  }

  /** Consume this frame's melee swing (applied to enemies by the scene). */
  takeMelee(): MeleeHit | null {
    const m = this.pendingMelee;
    this.pendingMelee = null;
    return m;
  }

  startDash(): void {
    this.dashTimer = DASH_TIME;
    this.vy = 0;
  }

  get isDashing(): boolean {
    return this.dashTimer > 0;
  }

  /** True once after a mid-air (double) jump, for a visual cue. */
  takeAirJump(): boolean {
    const a = this.airJumpFx;
    this.airJumpFx = false;
    return a;
  }

  heal(amount: number): void {
    this.hp = Math.min(MAX_HP, this.hp + amount);
  }

  addBomb(): void {
    this.bombs = Math.min(MAX_BOMBS, this.bombs + 1);
  }

  consumeBomb(): boolean {
    if (this.bombs <= 0) return false;
    this.bombs -= 1;
    return true;
  }

  /** Spend HP as a skill cost (no invulnerability — a deliberate self-cost). */
  spendHp(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
  }

  /** Mark the player as knocked out — drawn lying on the ground during the
   *  brief death pause before respawning. */
  down(): void {
    this.downed = true;
    this.vx = 0;
    this.vy = 0;
  }

  respawn(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.hp = MAX_HP;
    this.invuln = RESPAWN_INVULN;
    this.jumpsUsed = 0;
    this.slashTimer = 0;
    this.dashTimer = 0;
    this.bombPose = 0;
    this.actionLock = 0;
    this.airJumpFx = false;
    this.pendingMelee = null;
    this.special = false;
    this.ammo = 0;
    this.bombs = 1;
    this.downed = false;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.downed) {
      this.drawDowned(ctx);
      return;
    }
    if (this.invuln > 0 && Math.floor(this.invuln * 12) % 2 === 0) return;

    // Standalone pose overlay during the bomb wind-up (e.g. E's hammer),
    // stepping through the poses across the charge (raise -> swing down).
    const poses = this.character.bombPoseSprites;
    if (this.bombPose > 0 && poses && poses.length > 0) {
      const progress = this.bombPoseDur > 0 ? 1 - this.bombPose / this.bombPoseDur : 0;
      const idx = Math.min(poses.length - 1, Math.floor(progress * poses.length));
      const ov = getSprite(poses[idx]);
      if (ov) {
        this.drawOverlayPose(ctx, ov);
        return;
      }
    }

    const sheet = this.character.sprite ? getSprite(this.character.id) : undefined;
    if (this.character.sprite && sheet) {
      this.drawSprite(ctx, sheet, this.character.sprite);
    } else {
      this.drawBox(ctx);
    }

    if (this.slashTimer > 0 && this.character.normal.melee) {
      const slash = getSprite("slashE");
      if (slash) this.drawSlashSprite(ctx, slash, this.character.normal.melee.range);
      else this.drawSlash(ctx, this.character.normal.melee.range, this.character.normal.melee.arc);
    }
  }

  /** Knocked-out pose. Uses the character's collapsed "damage" frame from the
   *  sheet (downB/C/D/E); characters without one (A) tip their upright sprite
   *  over instead. */
  private drawDowned(ctx: CanvasRenderingContext2D): void {
    const cfg = this.character.sprite;
    const cx = this.centerX;
    const footY = this.y + STAND_H;
    const down = getSprite("down" + this.character.id);
    if (down && cfg) {
      const { width, height } = down as unknown as { width: number; height: number };
      const scale = (STAND_H * 1.3) / cfg.frameH; // same pixel scale as upright
      const dw = width * scale;
      const dh = height * scale;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      if (this.facing < 0) {
        ctx.translate(cx + dw / 2, footY - dh);
        ctx.scale(-1, 1);
        ctx.drawImage(down, 0, 0, dw, dh);
      } else {
        ctx.drawImage(down, cx - dw / 2, footY - dh, dw, dh);
      }
      ctx.restore();
      return;
    }

    // Fallback: tip the upright sprite a quarter-turn so it lies on the ground.
    const sheet = cfg ? getSprite(this.character.id) : undefined;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(cx, footY - 16);
    ctx.rotate(this.facing > 0 ? -Math.PI / 2 : Math.PI / 2);
    if (cfg && sheet) {
      const drawH = STAND_H * 1.3;
      const drawW = drawH * (cfg.frameW / cfg.frameH);
      const frame = cfg.anims.idle[0] ?? 0;
      ctx.drawImage(sheet, frame * cfg.frameW, 0, cfg.frameW, cfg.frameH, -drawW / 2, -drawH, drawW, drawH);
    } else {
      ctx.fillStyle = this.character.bodyColor;
      ctx.fillRect(-STAND_H / 2, -WIDTH / 2, STAND_H, WIDTH);
    }
    ctx.restore();
  }

  /** The melee swing as a slash-effect sprite, swept along the aim direction. */
  private drawSlashSprite(ctx: CanvasRenderingContext2D, img: CanvasImageSource, range: number): void {
    const { width, height } = img as unknown as { width: number; height: number };
    const w = range * 1.3; // the arc spans roughly the reach
    const h = w * (height / width);
    ctx.save();
    ctx.translate(this.centerX, this.y + STAND_H / 2);
    ctx.rotate(this.slashAngle); // art points right (+x) = a forward swing
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = Math.min(1, (this.slashTimer / SLASH_TIME) * 1.5);
    ctx.drawImage(img, -w * 0.12, -h / 2, w, h); // tail near the body, arc forward
    ctx.restore();
  }

  /** Fallback look when no sprite sheet is loaded: a coloured body + gun nub. */
  private drawBox(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.character.bodyColor;
    ctx.fillRect(this.x, this.y, WIDTH, STAND_H);

    ctx.fillStyle = "#e2e8f0";
    const gy = this.gunY();
    if (this.facing > 0) ctx.fillRect(this.x + WIDTH, gy - 2, 12, 5);
    else ctx.fillRect(this.x - 12, gy - 2, 12, 5);
  }

  /** Draw a standalone (already body-centred, foot-anchored) pose sprite. */
  private drawOverlayPose(ctx: CanvasRenderingContext2D, img: CanvasImageSource): void {
    const { width, height } = img as unknown as { width: number; height: number };
    const drawH = STAND_H * 1.5;
    const drawW = drawH * (width / height);
    const dx = this.centerX - drawW / 2;
    const dy = this.y + STAND_H - drawH;
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    if (this.facing < 0) {
      ctx.translate(dx + drawW, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, drawW, drawH);
    } else {
      ctx.drawImage(img, dx, dy, drawW, drawH);
    }
    ctx.restore();
  }

  /** Pick the current sheet frame from the active animation. */
  private spriteFrame(cfg: SpriteConfig): number {
    let frames: number[];
    if (this.bombPose > 0 && cfg.anims.bomb) frames = cfg.anims.bomb;
    else if (this.shootFx > 0) frames = this.special && cfg.anims.magic ? cfg.anims.magic : cfg.anims.shoot;
    else if (!this.onGround && cfg.anims.jump) frames = cfg.anims.jump;
    else if (this.onGround && Math.abs(this.vx) > 1) frames = cfg.anims.run;
    else frames = cfg.anims.idle;
    return frames[Math.floor(this.animTime * cfg.fps) % frames.length];
  }

  private drawSprite(ctx: CanvasRenderingContext2D, sheet: CanvasImageSource, cfg: SpriteConfig): void {
    const frame = this.spriteFrame(cfg);
    // Sprites overhang the hitbox a little (the box is just the hurt area).
    const drawH = STAND_H * 1.3;
    const drawW = drawH * (cfg.frameW / cfg.frameH);
    const dx = this.centerX - drawW / 2;
    const dy = this.y + STAND_H - drawH; // anchor the feet to the ground
    const sx = frame * cfg.frameW;

    ctx.imageSmoothingEnabled = false; // keep pixel art crisp when scaled up
    ctx.save();
    if (this.facing < 0) {
      ctx.translate(dx + drawW, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(sheet, sx, 0, cfg.frameW, cfg.frameH, 0, 0, drawW, drawH);
    } else {
      ctx.drawImage(sheet, sx, 0, cfg.frameW, cfg.frameH, dx, dy, drawW, drawH);
    }
    ctx.restore();
  }

  private drawSlash(ctx: CanvasRenderingContext2D, range: number, arc: number): void {
    const cx = this.centerX;
    const cy = this.y + STAND_H / 2;
    ctx.fillStyle = "rgba(241, 245, 249, 0.45)";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, range, this.slashAngle - arc / 2, this.slashAngle + arc / 2);
    ctx.closePath();
    ctx.fill();
  }
}
