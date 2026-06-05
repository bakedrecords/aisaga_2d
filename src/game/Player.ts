import type { Input } from "../engine/Input";
import { Rect } from "../engine/Rect";
import { clamp, Vector2 } from "../engine/Vector2";
import { Bullet } from "./Bullet";
import type { Bomb, Character, WeaponSpec } from "./characters";
import type { Level } from "./Level";
import type { Sound } from "./Sound";

const WIDTH = 28;
const STAND_H = 44;
const CROUCH_H = 28;
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
  private crouching = false;
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
  get center(): Vector2 {
    return new Vector2(this.x + WIDTH / 2, this.y + STAND_H / 2);
  }
  get bounds(): Rect {
    return new Rect(this.x, this.y, WIDTH, STAND_H);
  }
  get hurtBounds(): Rect {
    if (!this.crouching) return this.bounds;
    return new Rect(this.x, this.y + (STAND_H - CROUCH_H), WIDTH, CROUCH_H);
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

    this.crouching = this.onGround && DOWN_KEYS.some((k) => input.isDown(k));

    const move = this.crouching ? 0 : input.horizontal();
    this.vx = move * MOVE_SPEED;
    if (move !== 0) this.facing = move;

    if (this.onGround) this.jumpsUsed = 0;
    if (!this.crouching && input.wasPressed("Space") && this.jumpsUsed < this.maxJumps) {
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

    this.updateShooting(dt, input, bullets, audio);
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
    return this.y + (this.crouching ? STAND_H - 14 : STAND_H * 0.4);
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
      // Fire forward (facing) and straight up at the same time.
      const forward = this.facing > 0 ? 0 : Math.PI;
      const muzzle = new Vector2(this.centerX + this.facing * 18, this.gunY());
      const fVel = new Vector2(Math.cos(forward), Math.sin(forward)).scale(spec.speed);
      bullets.push(this.makeBullet(muzzle, fVel, spec));
      const upMuzzle = new Vector2(this.centerX, this.y);
      bullets.push(this.makeBullet(upMuzzle, new Vector2(0, -spec.speed), spec));
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

  respawn(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.hp = MAX_HP;
    this.invuln = RESPAWN_INVULN;
    this.crouching = false;
    this.jumpsUsed = 0;
    this.slashTimer = 0;
    this.dashTimer = 0;
    this.airJumpFx = false;
    this.pendingMelee = null;
    this.special = false;
    this.ammo = 0;
    this.bombs = 1;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.invuln > 0 && Math.floor(this.invuln * 12) % 2 === 0) return;

    const h = this.crouching ? CROUCH_H : STAND_H;
    const top = this.crouching ? this.y + (STAND_H - CROUCH_H) : this.y;
    ctx.fillStyle = this.character.bodyColor;
    ctx.fillRect(this.x, top, WIDTH, h);

    ctx.fillStyle = "#e2e8f0";
    const gy = this.gunY();
    if (this.facing > 0) ctx.fillRect(this.x + WIDTH, gy - 2, 12, 5);
    else ctx.fillRect(this.x - 12, gy - 2, 12, 5);

    if (this.slashTimer > 0 && this.character.normal.melee) {
      this.drawSlash(ctx, this.character.normal.melee.range, this.character.normal.melee.arc);
    }
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
