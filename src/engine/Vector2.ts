/** A small immutable 2D vector used for positions, velocities and directions. */
export class Vector2 {
  constructor(
    public readonly x = 0,
    public readonly y = 0,
  ) {}

  add(v: Vector2): Vector2 {
    return new Vector2(this.x + v.x, this.y + v.y);
  }

  scale(s: number): Vector2 {
    return new Vector2(this.x * s, this.y * s);
  }

  get length(): number {
    return Math.hypot(this.x, this.y);
  }

  /** Returns a unit-length copy, or a zero vector when the length is zero. */
  normalized(): Vector2 {
    const len = this.length;
    return len === 0 ? new Vector2() : new Vector2(this.x / len, this.y / len);
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
