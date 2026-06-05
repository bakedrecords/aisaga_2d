import { Input } from "./Input";
import type { Scene, SceneManager } from "./Scene";

/** Fixed simulation step in seconds (60 updates per second). */
const STEP = 1 / 60;
/** Cap on how much time a single frame may advance, to avoid a "spiral of death". */
const MAX_FRAME_TIME = 0.25;

/**
 * Owns the canvas, the input and the main loop. Updates run on a fixed
 * timestep (deterministic physics) while rendering happens once per frame.
 */
export class Game implements SceneManager {
  private readonly ctx: CanvasRenderingContext2D;
  /** Shared input; exposed so on-screen/touch controls can feed it. */
  readonly input: Input;
  private scene: Scene;
  private pendingScene: Scene | null = null;
  private lastTime = 0;
  private accumulator = 0;
  private running = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    scene: Scene,
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not get a 2D rendering context from the canvas.");
    }
    this.ctx = ctx;
    this.input = new Input();
    this.scene = scene;
  }

  get width(): number {
    return this.canvas.width;
  }

  get height(): number {
    return this.canvas.height;
  }

  /** Request a scene change; applied after the current update finishes. */
  changeScene(scene: Scene): void {
    this.pendingScene = scene;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
  }

  private readonly frame = (time: number): void => {
    if (!this.running) return;

    const frameTime = Math.min((time - this.lastTime) / 1000, MAX_FRAME_TIME);
    this.lastTime = time;
    this.accumulator += frameTime;

    while (this.accumulator >= STEP) {
      this.scene.update(STEP, this.input, this);
      // Consume edge-triggered input (wasPressed) per step, so a single press
      // can't be processed twice when a frame runs multiple catch-up steps —
      // which would otherwise spend both jumps of a double jump on one tap.
      this.input.endFrame();
      this.accumulator -= STEP;
      // Stop stepping the old scene the moment a transition is requested.
      if (this.pendingScene) break;
    }

    if (this.pendingScene) {
      this.scene = this.pendingScene;
      this.pendingScene = null;
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.scene.render(this.ctx);

    requestAnimationFrame(this.frame);
  };
}
