import { load, save, LOFI_GIRL, type State } from "./store";
import { Pomodoro, DURATIONS, format, type Mode } from "./timer";
import { Soundscape } from "./sounds";
import { createEditor } from "./editor";
import { exportDocument, type Format } from "./export";

const $ = <T extends HTMLElement>(sel: string): T => {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`missing ${sel}`);
  return el;
};

const state: State = load();
const sounds = new Soundscape();

const writePane = $<HTMLElement>("#writePane");
const journal = $<HTMLTextAreaElement>("#journal");
const docTitle = $<HTMLInputElement>("#docTitle");
const intent = $<HTMLInputElement>("#intent");
const font = $<HTMLSelectElement>("#font");
const theme = $<HTMLSelectElement>("#theme");
const focusLength = $<HTMLSelectElement>("#focusLength");
const wordCount = $<HTMLSpanElement>("#wordCount");
const saveState = $<HTMLSpanElement>("#saveState");
const workspace = $<HTMLElement>("#workspace");
const clock = $<HTMLOutputElement>("#clock");
const startPause = $<HTMLButtonElement>("#startPause");
const sessionsEl = $<HTMLSpanElement>("#sessions");
const toggleJournal = $<HTMLButtonElement>("#toggleJournal");
const lofiUrl = $<HTMLInputElement>("#lofiUrl");
const lofiFrame = $<HTMLDivElement>("#lofiFrame");
const lofiToggle = $<HTMLButtonElement>("#lofiToggle");

function persist(): void {
  saveState.textContent = "Saving…";
  save(state, () => (saveState.textContent = "Saved locally"));
}

/* ---------- theme & layout ---------- */
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
function applyTheme(): void {
  const resolved = state.theme === "system" ? (darkQuery.matches ? "dark" : "light") : state.theme;
  document.documentElement.dataset.theme = resolved;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved === "dark" ? "#0f1115" : "#f6f5f1");
}
darkQuery.addEventListener("change", applyTheme);
theme.value = state.theme;
theme.addEventListener("change", () => {
  state.theme = theme.value as State["theme"];
  applyTheme();
  persist();
});

function applyLayout(): void {
  workspace.classList.toggle("journal-hidden", !state.journalVisible);
  workspace.classList.toggle("show-journal", state.mobilePane === "journal");
  toggleJournal.setAttribute("aria-pressed", String(state.journalVisible));
  workspace.style.setProperty("--left", `${state.split}fr`);
  workspace.style.setProperty("--right", `${1 - state.split}fr`);
  document.querySelectorAll<HTMLButtonElement>(".tab").forEach((t) => t.setAttribute("aria-pressed", String(t.dataset.pane === state.mobilePane)));
}
toggleJournal.addEventListener("click", () => {
  state.journalVisible = !state.journalVisible;
  applyLayout();
  persist();
});
document.querySelectorAll<HTMLButtonElement>(".tab").forEach((t) =>
  t.addEventListener("click", () => {
    state.mobilePane = t.dataset.pane as State["mobilePane"];
    applyLayout();
    persist();
  }),
);
$("#focusMode").addEventListener("click", () => {
  document.body.classList.toggle("zen");
  editor.commands.focus();
});

/* popovers: one open at a time, close on outside click or Escape */
const menus = Array.from(document.querySelectorAll<HTMLElement>(".menu"));
function closeMenus(except?: HTMLElement): void {
  for (const m of menus) {
    if (m === except) continue;
    m.querySelector<HTMLElement>(".popover")!.hidden = true;
    m.querySelector("button")!.setAttribute("aria-expanded", "false");
  }
}
for (const m of menus) {
  const trigger = m.querySelector<HTMLButtonElement>(":scope > button")!;
  const panel = m.querySelector<HTMLElement>(".popover")!;
  trigger.addEventListener("click", () => {
    const open = panel.hidden;
    closeMenus(m);
    panel.hidden = !open;
    trigger.setAttribute("aria-expanded", String(open));
  });
  panel.querySelector(".closePopover")?.addEventListener("click", () => closeMenus());
}
document.addEventListener("pointerdown", (e) => {
  if (!(e.target as HTMLElement).closest(".menu")) closeMenus();
});

/* resizable divider */
const divider = $<HTMLDivElement>("#divider");
divider.addEventListener("pointerdown", (e) => {
  divider.setPointerCapture(e.pointerId);
  const rect = workspace.getBoundingClientRect();
  const move = (ev: PointerEvent) => {
    state.split = Math.min(0.85, Math.max(0.4, (ev.clientX - rect.left) / rect.width));
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
    state.split = Math.min(0.85, Math.max(0.4, state.split + (e.key === "ArrowLeft" ? -0.05 : 0.05)));
    applyLayout();
    persist();
  }
});

/* ---------- editor & journal ---------- */
function renderCount(n: number): void {
  wordCount.textContent = `${n} ${n === 1 ? "word" : "words"}`;
}
const editor = createEditor($("#editor"), $("#toolbar"), state.doc, (html, words) => {
  state.doc = html;
  renderCount(words);
  persist();
});
renderCount(editor.storage.characterCount.words());

journal.value = state.journal;
docTitle.value = state.title;
intent.value = state.intent;
font.value = state.font;
writePane.dataset.font = state.font;

journal.addEventListener("input", () => {
  state.journal = journal.value;
  persist();
});
const proseMirror = $<HTMLElement>("#editor .ProseMirror");
proseMirror.dataset.printTitle = state.title;
docTitle.addEventListener("input", () => {
  state.title = docTitle.value;
  proseMirror.dataset.printTitle = state.title;
  persist();
});
intent.addEventListener("input", () => {
  state.intent = intent.value;
  persist();
});
font.addEventListener("change", () => {
  state.font = font.value as State["font"];
  writePane.dataset.font = state.font;
  persist();
});

document.querySelectorAll<HTMLButtonElement>(".exportOption").forEach((b) =>
  b.addEventListener("click", async () => {
    closeMenus();
    b.disabled = true;
    try {
      await exportDocument(editor, state.title, b.dataset.format as Format);
    } catch (err) {
      console.error(err);
      saveState.textContent = "Export failed";
    } finally {
      b.disabled = false;
    }
  }),
);

function parkThought(): void {
  state.journalVisible = true;
  state.mobilePane = "journal";
  applyLayout();
  const stamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const prefix = journal.value && !journal.value.endsWith("\n") ? "\n" : "";
  journal.value += `${prefix}- ${stamp} `;
  state.journal = journal.value;
  journal.focus();
  journal.selectionStart = journal.selectionEnd = journal.value.length;
  persist();
}
$("#brainDump").addEventListener("click", parkThought);

$("#journalDate").textContent = new Date().toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

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

DURATIONS.focus = state.focusMinutes * 60;
focusLength.value = String(state.focusMinutes);
focusLength.addEventListener("change", () => {
  state.focusMinutes = Number(focusLength.value);
  DURATIONS.focus = state.focusMinutes * 60;
  if (pomodoro.mode === "focus" && !pomodoro.running) pomodoro.reset();
  persist();
});

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
pomodoro.reset();

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
const ranges = Array.from(document.querySelectorAll<HTMLElement>(".sound[data-sound]")).map((el) => {
  const name = el.dataset.sound!;
  const range = el.querySelector<HTMLInputElement>("input[type=range]")!;
  range.value = String(Math.round((state.sounds[name] ?? 0) * 100));
  range.addEventListener("input", () => {
    const level = Number(range.value) / 100;
    state.sounds[name] = level;
    sounds.setLevel(name, level);
    persist();
  });
  return { name, range };
});
$("#muteAll").addEventListener("click", () => {
  for (const { name, range } of ranges) {
    range.value = "0";
    state.sounds[name] = 0;
    sounds.setLevel(name, 0);
  }
  persist();
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
$("#lofiGirl").addEventListener("click", () => {
  lofiUrl.value = state.lofiUrl = LOFI_GIRL;
  persist();
  if (lofiFrame.hidden) lofiToggle.click();
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
  const typing = !!(e.target as HTMLElement).closest("textarea, input, select, [contenteditable]");
  if (e.key === "Escape") {
    closeMenus();
    document.body.classList.remove("zen");
    return;
  }
  if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
  switch (e.key.toLowerCase()) {
    case " ":
      e.preventDefault();
      startPause.click();
      break;
    case "j":
      toggleJournal.click();
      break;
    case "s":
      $("#toggleSounds").click();
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

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => void navigator.serviceWorker.register("./sw.js"));
}
