import { Rect } from "../engine/Rect";
import { WEAPONS, type WeaponId } from "./weapons";

const WIDTH = 28;
const HEIGHT = 24;

/** A weapon crate the player can walk into to swap weapons. */
export class Pickup {
  alive = true;
  private t = Math.random() * Math.PI * 2;

  constructor(
    private readonly x: number,
    private readonly groundY: number,
    readonly weapon: WeaponId,
  ) {}

  private get y(): number {
    // Bob gently above the ground.
    return this.groundY - HEIGHT - 2 - Math.sin(this.t) * 3;
  }

  update(dt: number): void {
    this.t += dt * 4;
  }

  get bounds(): Rect {
    return new Rect(this.x, this.y, WIDTH, HEIGHT);
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { x, y } = { x: this.x, y: this.y };
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(x - 1, y - 1, WIDTH + 2, HEIGHT + 2);
    ctx.fillStyle = WEAPONS[this.weapon].color;
    ctx.fillRect(x, y, WIDTH, HEIGHT);
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(this.weapon.charAt(0).toUpperCase(), x + WIDTH / 2, y + HEIGHT - 7);
    ctx.textAlign = "left";
  }
}
