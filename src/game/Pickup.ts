import { Rect } from "../engine/Rect";
import { WEAPONS, type WeaponId } from "./weapons";

const WIDTH = 28;
const HEIGHT = 24;

export type PickupConfig =
  | { kind: "weapon"; weapon: WeaponId }
  | { kind: "health" }
  | { kind: "bomb" }
  | { kind: "score"; value: number };

/** A floating crate the player walks into: a weapon, health, a bomb or score. */
export class Pickup {
  alive = true;
  private t = Math.random() * Math.PI * 2;

  constructor(
    private readonly x: number,
    private readonly groundY: number,
    readonly config: PickupConfig,
  ) {}

  private get y(): number {
    return this.groundY - HEIGHT - 2 - Math.sin(this.t) * 3;
  }

  update(dt: number): void {
    this.t += dt * 4;
  }

  get bounds(): Rect {
    return new Rect(this.x, this.y, WIDTH, HEIGHT);
  }

  private get color(): string {
    const c = this.config;
    if (c.kind === "weapon") return WEAPONS[c.weapon].color;
    if (c.kind === "health") return "#4ade80";
    if (c.kind === "bomb") return "#fbbf24";
    return "#38bdf8";
  }

  private get label(): string {
    const c = this.config;
    if (c.kind === "weapon") return c.weapon.charAt(0).toUpperCase();
    if (c.kind === "health") return "+";
    if (c.kind === "bomb") return "B";
    return "$";
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { x, y } = { x: this.x, y: this.y };
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(x - 1, y - 1, WIDTH + 2, HEIGHT + 2);
    ctx.fillStyle = this.color;
    ctx.fillRect(x, y, WIDTH, HEIGHT);
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 15px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(this.label, x + WIDTH / 2, y + HEIGHT - 6);
    ctx.textAlign = "left";
  }
}
