import type { Input } from "../engine/Input";
import type { Scene } from "../engine/Scene";
import { Vector2 } from "../engine/Vector2";
import { Player } from "./Player";

/** The main gameplay scene. Replace or extend this as the game takes shape. */
export class PlayScene implements Scene {
  private readonly bounds: Vector2;
  private readonly player: Player;

  constructor(width: number, height: number) {
    this.bounds = new Vector2(width, height);
    this.player = new Player(width / 2, height / 2);
  }

  update(dt: number, input: Input): void {
    this.player.update(dt, input, this.bounds);
  }

  render(ctx: CanvasRenderingContext2D): void {
    // Background.
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, this.bounds.x, this.bounds.y);

    this.player.render(ctx);

    // On-screen hint.
    ctx.fillStyle = "#94a3b8";
    ctx.font = "16px system-ui, sans-serif";
    ctx.fillText("WASD / 矢印キーで移動", 16, 28);
  }
}
