/**
 * Synthesized sound effects + a simple looping BGM, built on the Web Audio API.
 * No audio assets needed. Safe in non-browser environments (every method is a
 * no-op until an AudioContext is unlocked by a user gesture).
 */
export class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private bgmOn = false;
  private nextNoteTime = 0;
  private step = 0;

  constructor() {
    if (typeof window === "undefined") return;
    const unlock = () => this.unlock();
    window.addEventListener("keydown", unlock);
    window.addEventListener("pointerdown", unlock);
  }

  private unlock(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.25;
    this.master.connect(this.ctx.destination);
    this.music = this.ctx.createGain();
    this.music.gain.value = 0.45;
    this.music.connect(this.master);
    this.nextNoteTime = this.ctx.currentTime;
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    at = 0,
    target: AudioNode | null = null,
  ): void {
    if (!this.ctx || !this.master) return;
    const start = this.ctx.currentTime + at;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    env.gain.setValueAtTime(gain, start);
    env.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(env);
    env.connect(target ?? this.master);
    osc.start(start);
    osc.stop(start + dur);
  }

  private noise(dur: number, gain: number): void {
    if (!this.ctx || !this.master) return;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const env = this.ctx.createGain();
    env.gain.value = gain;
    src.connect(env);
    env.connect(this.master);
    src.start();
  }

  shoot(kind: string): void {
    if (kind === "flame") this.noise(0.06, 0.16);
    else if (kind === "laser") this.tone(300, 0.14, "sawtooth", 0.16);
    else if (kind === "dark") this.tone(150, 0.09, "square", 0.18);
    else this.tone(820, 0.05, "square", 0.2);
  }

  enemyShoot(): void {
    this.tone(300, 0.08, "sawtooth", 0.13);
  }

  jump(): void {
    this.tone(520, 0.12, "sine", 0.2);
  }

  explosion(): void {
    this.noise(0.3, 0.5);
    this.tone(90, 0.3, "sawtooth", 0.25);
  }

  playerHit(): void {
    this.tone(130, 0.25, "square", 0.3);
  }

  pickup(): void {
    this.tone(660, 0.08, "square", 0.22, 0);
    this.tone(990, 0.1, "square", 0.22, 0.09);
  }

  clear(): void {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, "triangle", 0.18, i * 0.12));
  }

  gameover(): void {
    [392, 311, 247].forEach((f, i) => this.tone(f, 0.3, "triangle", 0.2, i * 0.18));
  }

  setBgm(on: boolean): void {
    this.bgmOn = on;
    if (this.ctx) this.nextNoteTime = Math.max(this.nextNoteTime, this.ctx.currentTime);
  }

  /** Keeps the BGM step sequencer fed. Call once per frame. */
  update(): void {
    if (!this.ctx || !this.music || !this.bgmOn) return;
    const lookahead = 0.1;
    while (this.nextNoteTime < this.ctx.currentTime + lookahead) {
      this.scheduleStep(this.nextNoteTime);
      this.nextNoteTime += 0.15;
      this.step = (this.step + 1) % 16;
    }
  }

  private scheduleStep(time: number): void {
    if (!this.ctx || !this.music) return;
    // A driving minor bassline.
    const bass = [110, 110, 165, 110, 110, 196, 147, 110];
    const f = bass[this.step % bass.length] ?? 110;
    const at = time - this.ctx.currentTime;
    this.tone(f, 0.14, "triangle", 0.18, at, this.music);
    // A blip on the off-beats for movement.
    if (this.step % 2 === 0) {
      this.tone(f * 2, 0.06, "square", 0.05, at, this.music);
    }
  }
}

/** Shared sound instance, persisted across scenes (unlocks on first input). */
export const sound = new Sound();
