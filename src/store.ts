const KEY = "focus-space:v1";

export interface State {
  title: string;
  doc: string; // HTML produced by the editor (plain text from older versions is migrated on load)
  journal: string;
  intent: string;
  font: "sans" | "serif" | "mono";
  theme: "system" | "light" | "dark";
  focusMinutes: number;
  journalVisible: boolean;
  mobilePane: "write" | "journal";
  split: number; // fraction of width for the left pane
  sounds: Record<string, number>;
  lofiUrl: string;
  sessionsDate: string;
  sessions: number;
}

export const LOFI_GIRL = "https://www.youtube.com/watch?v=jfKfPfyJRdk";

export const defaults: State = {
  title: "Untitled document",
  doc: "",
  journal: "",
  intent: "",
  font: "sans",
  theme: "system",
  focusMinutes: 25,
  journalVisible: true,
  mobilePane: "write",
  split: 0.66,
  sounds: {},
  lofiUrl: LOFI_GIRL,
  sessionsDate: "",
  sessions: 0,
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Plain text saved by the first version becomes paragraphs. */
export function textToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaults };
    const saved = JSON.parse(raw) as Partial<State>;
    const state = { ...defaults, ...saved };
    if (state.doc && !/^\s*</.test(state.doc)) state.doc = textToHtml(state.doc);
    return state;
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
