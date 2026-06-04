import type { Input } from "./Input";

/**
 * A self-contained piece of the game (a menu, a level, a game-over screen...).
 * Add more scenes as the game grows and swap between them in `Game`.
 */
export interface Scene {
  /** Advance the simulation by `dt` seconds (a fixed step). */
  update(dt: number, input: Input): void;
  /** Draw the current state. The canvas is already cleared. */
  render(ctx: CanvasRenderingContext2D): void;
}
