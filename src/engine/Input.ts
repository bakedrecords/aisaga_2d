import { Vector2 } from "./Vector2";

/**
 * Tracks which keys are currently held down and exposes convenient queries.
 * Uses `KeyboardEvent.code` so the layout is physical (WASD works on any
 * keyboard layout).
 */
export class Input {
  private readonly held = new Set<string>();

  constructor(target: Window = window) {
    target.addEventListener("keydown", (e) => this.held.add(e.code));
    target.addEventListener("keyup", (e) => this.held.delete(e.code));
    // Release everything when focus is lost so keys don't get "stuck".
    target.addEventListener("blur", () => this.held.clear());
  }

  isDown(code: string): boolean {
    return this.held.has(code);
  }

  /** Movement direction from WASD / arrow keys, normalized to length <= 1. */
  direction(): Vector2 {
    const x =
      (this.isDown("ArrowRight") || this.isDown("KeyD") ? 1 : 0) -
      (this.isDown("ArrowLeft") || this.isDown("KeyA") ? 1 : 0);
    const y =
      (this.isDown("ArrowDown") || this.isDown("KeyS") ? 1 : 0) -
      (this.isDown("ArrowUp") || this.isDown("KeyW") ? 1 : 0);
    return new Vector2(x, y).normalized();
  }
}
