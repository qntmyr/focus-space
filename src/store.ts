const KEY = "focus-space:v1";

export interface State {
  title: string;
  doc: string;
  journal: string;
  intent: string;
  font: "sans" | "serif" | "mono";
  theme: "light" | "dark";
  journalVisible: boolean;
  split: number; // fraction of width for the left pane
  sounds: Record<string, number>;
  lofiUrl: string;
  sessionsDate: string;
  sessions: number;
}

export const defaults: State = {
  title: "Untitled",
  doc: "",
  journal: "",
  intent: "",
  font: "sans",
  theme: window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  journalVisible: true,
  split: 0.6,
  sounds: {},
  lofiUrl: "",
  sessionsDate: "",
  sessions: 0,
};

export function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaults };
    return { ...defaults, ...(JSON.parse(raw) as Partial<State>) };
  } catch {
    return { ...defaults };
  }
}

let timer: number | undefined;
export function save(state: State, onSaved?: () => void): void {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      onSaved?.();
    } catch {
      /* storage unavailable: keep working in memory */
    }
  }, 250);
}
