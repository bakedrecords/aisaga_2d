import { Rect } from "../engine/Rect";
import { getSprite } from "./sprites";

const WIDTH = 28;
const HEIGHT = 24;

export type PickupConfig =
  | { kind: "weapon" } // grants the character's special weapon
  | { kind: "health" }
  | { kind: "bomb" }
  | { kind: "score"; value: number };

/** Sprite id + on-screen height for each pickup kind (sliced from the UI
 *  sheet). The artwork is drawn centred on the pickup's hit box. */
const SPRITES: Record<PickupConfig["kind"], { id: string; h: number }> = {
  weapon: { id: "item_w", h: 34 },
  health: { id: "item_drink", h: 38 },
  bomb: { id: "item_s", h: 36 },
  score: { id: "item_gold", h: 30 },
};

const DROP_GRAVITY = 900;

/** A floating crate the player walks into: a weapon, health, a bomb or score.
 *  When dropped in mid-air (e.g. from a downed flyer) it falls straight down
 *  from the kill height and then rests/bobs on the ground. */
export class Pickup {
  alive = true;
  private t = Math.random() * Math.PI * 2;
  private readonly restTop: number;
  private cy: number;
  private vy = 0;
  private landed: boolean;

  constructor(
    private readonly x: number,
    groundY: number,
    readonly config: PickupConfig,
    spawnY?: number,
  ) {
    this.restTop = groundY - HEIGHT - 2;
    if (spawnY !== undefined && spawnY < this.restTop) {
      this.cy = spawnY;
      this.landed = false;
    } else {
      this.cy = this.restTop;
      this.landed = true;
    }
  }

  private get y(): number {
    return this.landed ? this.restTop - Math.sin(this.t) * 3 : this.cy;
  }

  update(dt: number): void {
    this.t += dt * 4;
    if (!this.landed) {
      this.vy += DROP_GRAVITY * dt;
      this.cy += this.vy * dt;
      if (this.cy >= this.restTop) {
        this.cy = this.restTop;
        this.landed = true;
      }
    }
  }

  get bounds(): Rect {
    return new Rect(this.x, this.y, WIDTH, HEIGHT);
  }

  private get color(): string {
    switch (this.config.kind) {
      case "weapon": return "#fb923c";
      case "health": return "#4ade80";
      case "bomb": return "#fbbf24";
      default: return "#38bdf8";
    }
  }

  private get label(): string {
    switch (this.config.kind) {
      case "weapon": return "W";
      case "health": return "+";
      case "bomb": return "B";
      default: return "$";
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const cx = this.x + WIDTH / 2;
    const cy = this.y + HEIGHT / 2;
    const spec = SPRITES[this.config.kind];
    const img = getSprite(spec.id);
    if (img) {
      const { width, height } = img as unknown as { width: number; height: number };
      const h = spec.h;
      const w = h * (width / height);
      // soft glow halo so pickups read against the busy backdrop
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.ellipse(cx, cy, w * 0.5, h * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
      return;
    }

    // Fallback: the original coloured box when the sprite hasn't loaded.
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
