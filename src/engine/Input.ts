/** Keys we fully own, so the browser doesn't also scroll the page on them. */
const HANDLED_KEYS = new Set([
  "Space",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
]);

/**
 * Tracks keyboard state. `isDown` reports held keys; `wasPressed` reports keys
 * that went down since the last `endFrame()` (edge-triggered, ignores OS
 * key-repeat). Uses `KeyboardEvent.code` so controls are layout-independent.
 */
export class Input {
  private readonly held = new Set<string>();
  private readonly pressed = new Set<string>();

  constructor(target: Window = window) {
    target.addEventListener("keydown", (e) => {
      if (!this.held.has(e.code)) this.pressed.add(e.code);
      this.held.add(e.code);
      if (HANDLED_KEYS.has(e.code)) e.preventDefault();
    });
    target.addEventListener("keyup", (e) => this.held.delete(e.code));
    // Drop all state when focus is lost so keys don't get "stuck".
    target.addEventListener("blur", () => {
      this.held.clear();
      this.pressed.clear();
    });
  }

  isDown(code: string): boolean {
    return this.held.has(code);
  }

  wasPressed(code: string): boolean {
    return this.pressed.has(code);
  }

  /** Inject a key press from on-screen/touch controls (mirrors a keydown).
   *  `force` always registers an edge — used by touch buttons so a missed
   *  release (stuck `held`) can't swallow the next tap. */
  pressKey(code: string, force = false): void {
    if (force || !this.held.has(code)) this.pressed.add(code);
    this.held.add(code);
  }

  /** Release a virtual key (mirrors a keyup). */
  releaseKey(code: string): void {
    this.held.delete(code);
  }

  /** Horizontal movement axis: -1 (left), 0, or +1 (right). */
  horizontal(): number {
    return (
      (this.isDown("ArrowRight") || this.isDown("KeyD") ? 1 : 0) -
      (this.isDown("ArrowLeft") || this.isDown("KeyA") ? 1 : 0)
    );
  }

  /** Clears edge-triggered state. Called once per frame after updates run. */
  endFrame(): void {
    this.pressed.clear();
  }
}
