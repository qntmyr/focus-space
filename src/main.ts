import { load, save, type State } from "./store";
import { Pomodoro, DURATIONS, format, type Mode } from "./timer";
import { Soundscape } from "./sounds";

const $ = <T extends HTMLElement>(sel: string): T => {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`missing ${sel}`);
  return el;
};

const state: State = load();
const sounds = new Soundscape();

const editor = $<HTMLTextAreaElement>("#editor");
const journal = $<HTMLTextAreaElement>("#journal");
const docTitle = $<HTMLInputElement>("#docTitle");
const intent = $<HTMLInputElement>("#intent");
const font = $<HTMLSelectElement>("#font");
const wordCount = $<HTMLSpanElement>("#wordCount");
const saveState = $<HTMLSpanElement>("#saveState");
const workspace = $<HTMLElement>("#workspace");
const clock = $<HTMLOutputElement>("#clock");
const startPause = $<HTMLButtonElement>("#startPause");
const sessionsEl = $<HTMLSpanElement>("#sessions");
const soundsPanel = $<HTMLElement>("#soundsPanel");
const toggleSounds = $<HTMLButtonElement>("#toggleSounds");
const toggleJournal = $<HTMLButtonElement>("#toggleJournal");
const lofiUrl = $<HTMLInputElement>("#lofiUrl");
const lofiFrame = $<HTMLDivElement>("#lofiFrame");
const lofiToggle = $<HTMLButtonElement>("#lofiToggle");

function persist(): void {
  saveState.textContent = "Saving…";
  save(state, () => (saveState.textContent = "Saved locally"));
}

/* ---------- theme & layout ---------- */
function applyTheme(): void {
  document.documentElement.dataset.theme = state.theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", state.theme === "dark" ? "#0f1115" : "#f6f5f1");
}
function applyLayout(): void {
  workspace.classList.toggle("journal-hidden", !state.journalVisible);
  toggleJournal.setAttribute("aria-pressed", String(state.journalVisible));
  workspace.style.setProperty("--left", `${state.split}fr`);
  workspace.style.setProperty("--right", `${1 - state.split}fr`);
}
$("#toggleTheme").addEventListener("click", () => {
  state.theme = state.theme === "dark" ? "light" : "dark";
  applyTheme();
  persist();
});
toggleJournal.addEventListener("click", () => {
  state.journalVisible = !state.journalVisible;
  applyLayout();
  persist();
});
$("#focusMode").addEventListener("click", () => {
  document.body.classList.toggle("zen");
  editor.focus();
});

/* resizable divider */
const divider = $<HTMLDivElement>("#divider");
divider.addEventListener("pointerdown", (e) => {
  divider.setPointerCapture(e.pointerId);
  const rect = workspace.getBoundingClientRect();
  const move = (ev: PointerEvent) => {
    state.split = Math.min(0.8, Math.max(0.3, (ev.clientX - rect.left) / rect.width));
    applyLayout();
  };
  const up = () => {
    divider.removeEventListener("pointermove", move);
    divider.removeEventListener("pointerup", up);
    persist();
  };
  divider.addEventListener("pointermove", move);
  divider.addEventListener("pointerup", up);
});
divider.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
    state.split = Math.min(0.8, Math.max(0.3, state.split + (e.key === "ArrowLeft" ? -0.05 : 0.05)));
    applyLayout();
    persist();
  }
});

/* ---------- editor & journal ---------- */
function countWords(text: string): number {
  return (text.trim().match(/\S+/g) ?? []).length;
}
function updateCount(): void {
  const n = countWords(editor.value);
  wordCount.textContent = `${n} ${n === 1 ? "word" : "words"}`;
}
editor.value = state.doc;
journal.value = state.journal;
docTitle.value = state.title;
intent.value = state.intent;
font.value = state.font;
editor.dataset.font = state.font;
updateCount();

editor.addEventListener("input", () => {
  state.doc = editor.value;
  updateCount();
  persist();
});
journal.addEventListener("input", () => {
  state.journal = journal.value;
  persist();
});
docTitle.addEventListener("input", () => {
  state.title = docTitle.value;
  persist();
});
intent.addEventListener("input", () => {
  state.intent = intent.value;
  persist();
});
font.addEventListener("change", () => {
  state.font = font.value as State["font"];
  editor.dataset.font = state.font;
  persist();
});

// Tab inserts two spaces in the editor instead of leaving it.
editor.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    const { selectionStart: s, selectionEnd: en } = editor;
    editor.setRangeText("  ", s, en, "end");
    editor.dispatchEvent(new Event("input"));
  }
});

$("#download").addEventListener("click", () => {
  const blob = new Blob([`# ${state.title}\n\n${state.doc}`], { type: "text/markdown" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${state.title.replace(/[^\w\-]+/g, "-").toLowerCase() || "untitled"}.md`;
  a.click();
  URL.revokeObjectURL(a.href);
});

function parkThought(): void {
  if (!state.journalVisible) {
    state.journalVisible = true;
    applyLayout();
  }
  const stamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const prefix = journal.value && !journal.value.endsWith("\n") ? "\n" : "";
  journal.value += `${prefix}- ${stamp} `;
  state.journal = journal.value;
  journal.focus();
  journal.selectionStart = journal.selectionEnd = journal.value.length;
  persist();
}
$("#brainDump").addEventListener("click", parkThought);

$("#journalDate").textContent = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

/* ---------- timer ---------- */
const today = new Date().toDateString();
if (state.sessionsDate !== today) {
  state.sessionsDate = today;
  state.sessions = 0;
}
function renderSessions(): void {
  sessionsEl.textContent = "●".repeat(state.sessions % 4) + "○".repeat((4 - (state.sessions % 4)) % 4);
  sessionsEl.title = `${state.sessions} focus session${state.sessions === 1 ? "" : "s"} today`;
}
renderSessions();

const pomodoro = new Pomodoro(
  (remaining) => {
    clock.textContent = format(remaining);
    document.title = pomodoro.running ? `${format(remaining)} · Focus Space` : "Focus Space";
    startPause.textContent = pomodoro.running ? "Pause" : remaining === DURATIONS[pomodoro.mode] ? "Start" : "Resume";
  },
  (mode) => {
    if (mode === "focus") {
      state.sessions += 1;
      renderSessions();
      persist();
    }
    sounds.chime();
    document.body.classList.add("flash");
    window.setTimeout(() => document.body.classList.remove("flash"), 2000);
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(mode === "focus" ? "Focus session done. Take a break." : "Break over. Back to it.");
    }
    syncModeButtons();
  },
);

const modeButtons = Array.from(document.querySelectorAll<HTMLButtonElement>(".mode"));
function syncModeButtons(): void {
  modeButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === pomodoro.mode)));
}
modeButtons.forEach((b) =>
  b.addEventListener("click", () => {
    pomodoro.setMode(b.dataset.mode as Mode);
    syncModeButtons();
  }),
);
startPause.addEventListener("click", () => {
  if ("Notification" in window && Notification.permission === "default") void Notification.requestPermission();
  pomodoro.toggle();
  startPause.textContent = pomodoro.running ? "Pause" : "Resume";
});
$("#reset").addEventListener("click", () => pomodoro.reset());

/* ---------- sounds ---------- */
toggleSounds.addEventListener("click", () => {
  const open = soundsPanel.hidden;
  soundsPanel.hidden = !open;
  toggleSounds.setAttribute("aria-expanded", String(open));
});
document.querySelectorAll<HTMLElement>(".sound[data-sound]").forEach((el) => {
  const name = el.dataset.sound!;
  const range = el.querySelector<HTMLInputElement>("input[type=range]")!;
  range.value = String(Math.round((state.sounds[name] ?? 0) * 100));
  range.addEventListener("input", () => {
    const level = Number(range.value) / 100;
    state.sounds[name] = level;
    sounds.setLevel(name, level);
    persist();
  });
});
// Browsers only allow audio after a user gesture: restore saved levels on first interaction.
const restoreSounds = () => {
  Object.entries(state.sounds).forEach(([name, level]) => level > 0 && sounds.setLevel(name, level));
  window.removeEventListener("pointerdown", restoreSounds);
  window.removeEventListener("keydown", restoreSounds);
};
if (Object.values(state.sounds).some((l) => l > 0)) {
  window.addEventListener("pointerdown", restoreSounds);
  window.addEventListener("keydown", restoreSounds);
}

lofiUrl.value = state.lofiUrl;
lofiUrl.addEventListener("change", () => {
  state.lofiUrl = lofiUrl.value.trim();
  persist();
});
function youtubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/|live\/|embed\/)([\w-]{11})/);
  return m ? m[1] : null;
}
lofiToggle.addEventListener("click", () => {
  if (!lofiFrame.hidden) {
    lofiFrame.innerHTML = "";
    lofiFrame.hidden = true;
    lofiToggle.textContent = "Play";
    return;
  }
  const id = youtubeId(lofiUrl.value);
  if (!id) {
    lofiUrl.focus();
    lofiUrl.reportValidity();
    return;
  }
  lofiFrame.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1" allow="autoplay; encrypted-media" title="Lo-fi stream"></iframe>`;
  lofiFrame.hidden = false;
  lofiToggle.textContent = "Stop";
});

/* ---------- shortcuts ---------- */
window.addEventListener("keydown", (e) => {
  const typing = (e.target as HTMLElement).matches("textarea, input, select");
  if (e.key === "Escape" && document.body.classList.contains("zen")) {
    document.body.classList.remove("zen");
    return;
  }
  if (typing) return;
  switch (e.key.toLowerCase()) {
    case " ":
      e.preventDefault();
      startPause.click();
      break;
    case "j":
      toggleJournal.click();
      break;
    case "s":
      toggleSounds.click();
      break;
    case "z":
      $("#focusMode").click();
      break;
    case "b":
      parkThought();
      break;
  }
});

/* ---------- boot ---------- */
applyTheme();
applyLayout();
syncModeButtons();
clock.textContent = format(pomodoro.remaining);

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => void navigator.serviceWorker.register("./sw.js"));
}
