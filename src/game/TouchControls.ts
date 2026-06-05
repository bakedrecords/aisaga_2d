import type { Input } from "../engine/Input";

interface ButtonDef {
  label: string;
  code: string;
  className: string;
}

/**
 * A virtual joystick for movement + aim. Dragging the knob past a deadzone
 * presses the matching direction keys (KeyA/KeyD/ArrowUp/ArrowDown), so the
 * game logic is unchanged.
 */
class Joystick {
  private readonly base = document.createElement("div");
  private readonly knob = document.createElement("div");
  private pointerId: number | null = null;
  private cx = 0;
  private cy = 0;
  private active = new Set<string>();
  private static readonly RADIUS = 50;
  private static readonly DEADZONE = 0.36;

  constructor(private readonly input: Input) {
    this.base.className = "tc-stick";
    this.knob.className = "tc-knob";
    this.base.appendChild(this.knob);
    document.body.appendChild(this.base);

    this.base.addEventListener("pointerdown", this.onDown);
    window.addEventListener("pointermove", this.onMove);
    window.addEventListener("pointerup", this.onUp);
    window.addEventListener("pointercancel", this.onUp);
    this.base.addEventListener("touchstart", (e) => e.preventDefault(), { passive: false });
    this.base.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  private readonly onDown = (e: PointerEvent): void => {
    e.preventDefault();
    this.pointerId = e.pointerId;
    const r = this.base.getBoundingClientRect();
    this.cx = r.left + r.width / 2;
    this.cy = r.top + r.height / 2;
    this.moveTo(e.clientX, e.clientY);
  };

  private readonly onMove = (e: PointerEvent): void => {
    if (this.pointerId !== e.pointerId) return;
    this.moveTo(e.clientX, e.clientY);
  };

  private readonly onUp = (e: PointerEvent): void => {
    if (this.pointerId !== e.pointerId) return;
    this.pointerId = null;
    this.knob.style.transform = "translate(0px, 0px)";
    this.knob.classList.remove("tc-active");
    this.apply(0, 0);
  };

  private moveTo(clientX: number, clientY: number): void {
    let dx = clientX - this.cx;
    let dy = clientY - this.cy;
    const dist = Math.hypot(dx, dy);
    if (dist > Joystick.RADIUS) {
      dx = (dx / dist) * Joystick.RADIUS;
      dy = (dy / dist) * Joystick.RADIUS;
    }
    this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
    this.apply(dx / Joystick.RADIUS, dy / Joystick.RADIUS);
  }

  private apply(nx: number, ny: number): void {
    const want = new Set<string>();
    if (nx <= -Joystick.DEADZONE) want.add("KeyA");
    else if (nx >= Joystick.DEADZONE) want.add("KeyD");
    if (ny <= -Joystick.DEADZONE) want.add("ArrowUp");
    else if (ny >= Joystick.DEADZONE) want.add("ArrowDown");

    for (const k of want) if (!this.active.has(k)) this.input.pressKey(k, true);
    for (const k of this.active) if (!want.has(k)) this.input.releaseKey(k);
    this.active = want;
    this.knob.classList.toggle("tc-active", want.size > 0);
  }
}

/**
 * On-screen touch controls for phones/tablets. A virtual joystick handles
 * movement/aim; the rest are buttons feeding virtual key presses into Input.
 */
export class TouchControls {
  constructor(private readonly input: Input) {
    if (!TouchControls.isTouchDevice()) return;
    document.body.classList.add("touch");
    this.build();
  }

  private static isTouchDevice(): boolean {
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }

  private build(): void {
    new Joystick(this.input);
    document.body.append(
      this.group("tc-actions", [
        { label: "JUMP", code: "Space", className: "tc-jump" },
        { label: "SHOT", code: "KeyJ", className: "tc-shot" },
      ]),
      this.group("tc-special", [{ label: "BOMB", code: "KeyK", className: "tc-bomb" }]),
      this.group("tc-menu", [{ label: "TITLE", code: "KeyT", className: "tc-title" }]),
    );
  }

  private group(name: string, buttons: ButtonDef[]): HTMLDivElement {
    const wrap = document.createElement("div");
    wrap.className = `tc-group ${name}`;
    for (const def of buttons) wrap.appendChild(this.button(def));
    return wrap;
  }

  private button(def: ButtonDef): HTMLButtonElement {
    const el = document.createElement("button");
    el.className = `tc-btn ${def.className}`;
    el.textContent = def.label;
    el.setAttribute("aria-label", def.code);

    const press = (e: Event) => {
      e.preventDefault();
      this.input.pressKey(def.code, true);
      el.classList.add("tc-active");
    };
    const release = (e: Event) => {
      e.preventDefault();
      this.input.releaseKey(def.code);
      el.classList.remove("tc-active");
    };
    const opts: AddEventListenerOptions = { passive: false };

    el.addEventListener("pointerdown", press);
    el.addEventListener("pointerup", release);
    el.addEventListener("pointercancel", release);
    el.addEventListener("touchstart", press, opts);
    el.addEventListener("touchend", release, opts);
    el.addEventListener("touchcancel", release, opts);
    el.addEventListener("contextmenu", (e) => e.preventDefault());
    return el;
  }
}
