/** Animation frame indices into a single-row sprite sheet. */
export interface SpriteAnims {
  idle: number[];
  run: number[];
  shoot: number[]; // firing the main gun
  jump?: number[];
  magic?: number[]; // firing the special weapon (e.g. A's fire magic)
}

export interface SpriteConfig {
  frameW: number;
  frameH: number;
  fps: number;
  anims: SpriteAnims;
}

const sheets = new Map<string, CanvasImageSource>();

/** Register an already-loaded image (used by the headless screenshot tests). */
export function setSprite(id: string, image: CanvasImageSource): void {
  sheets.set(id, image);
}

export function getSprite(id: string): CanvasImageSource | undefined {
  return sheets.get(id);
}

/** Load a sprite sheet in the browser. No-op (safe) without a DOM. */
export function loadSprite(id: string, url: string): void {
  if (typeof Image === "undefined") return;
  const img = new Image();
  img.addEventListener("load", () => sheets.set(id, img));
  img.src = url;
}
