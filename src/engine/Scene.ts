import type { Input } from "./Input";

/** What a scene is allowed to ask the host (the `Game`) to do. */
export interface SceneManager {
  /** Logical canvas size, handy when constructing the next scene. */
  readonly width: number;
  readonly height: number;
  /** Switch to another scene (applied after the current update finishes). */
  changeScene(scene: Scene): void;
}

/**
 * A self-contained piece of the game (title, level, game-over screen...).
 * Add more scenes as the game grows and switch with `game.changeScene(...)`.
 */
export interface Scene {
  /** Advance the simulation by `dt` seconds (a fixed step). */
  update(dt: number, input: Input, game: SceneManager): void;
  /** Draw the current state. The canvas is already cleared. */
  render(ctx: CanvasRenderingContext2D): void;
}
