import type { Input } from "../engine/Input";

interface ButtonDef {
  label: string;
  code: string;
  className: string;
}

/**
 * On-screen touch controls for phones/tablets. Built only on touch devices;
 * each button feeds virtual key presses into the shared Input, so the game
 * logic is identical to the keyboard version.
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
    document.body.append(
      this.group("tc-dpad", [
        { label: "◀", code: "KeyA", className: "tc-left" },
        { label: "▶", code: "KeyD", className: "tc-right" },
        { label: "▲", code: "ArrowUp", className: "tc-up" },
        { label: "▼", code: "ArrowDown", className: "tc-down" },
      ]),
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

    // Press/release are idempotent (Input uses a Set), so wiring both pointer
    // and touch events is safe — and preventing the touch default stops the
    // long-press text selection / callout that could swallow inputs.
    const press = (e: Event) => {
      e.preventDefault();
      this.input.pressKey(def.code);
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
