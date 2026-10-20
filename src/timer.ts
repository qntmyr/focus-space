export type Mode = "focus" | "short" | "long";

export const DURATIONS: Record<Mode, number> = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 };

export class Pomodoro {
  mode: Mode = "focus";
  remaining = DURATIONS.focus;
  running = false;
  private endAt = 0;
  private handle: number | undefined;

  constructor(
    private onTick: (remaining: number) => void,
    private onDone: (mode: Mode) => void,
  ) {}

  setMode(mode: Mode): void {
    this.pause();
    this.mode = mode;
    this.remaining = DURATIONS[mode];
    this.onTick(this.remaining);
  }

  toggle(): void {
    this.running ? this.pause() : this.start();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.endAt = Date.now() + this.remaining * 1000;
    const step = () => {
      this.remaining = Math.max(0, Math.round((this.endAt - Date.now()) / 1000));
      this.onTick(this.remaining);
      if (this.remaining <= 0) {
        this.running = false;
        const done = this.mode;
        this.setMode(done === "focus" ? "short" : "focus");
        this.onDone(done);
        return;
      }
      this.handle = window.setTimeout(step, 250);
    };
    step();
  }

  pause(): void {
    this.running = false;
    window.clearTimeout(this.handle);
  }

  reset(): void {
    this.setMode(this.mode);
  }
}

export function format(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
