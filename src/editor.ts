import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import CharacterCount from "@tiptap/extension-character-count";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Typography from "@tiptap/extension-typography";
import TurndownService from "turndown";

interface Tool {
  label: string;
  title: string;
  run: (e: Editor) => void;
  active?: (e: Editor) => boolean;
  enabled?: (e: Editor) => boolean;
}

const SEP: Tool = { label: "|", title: "", run: () => {} };

const tools: Tool[] = [
  { label: "↶", title: "Undo (Ctrl+Z)", run: (e) => e.chain().focus().undo().run(), enabled: (e) => e.can().undo() },
  { label: "↷", title: "Redo (Ctrl+Shift+Z)", run: (e) => e.chain().focus().redo().run(), enabled: (e) => e.can().redo() },
  SEP,
  { label: "H1", title: "Heading 1 (Ctrl+Alt+1)", run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(), active: (e) => e.isActive("heading", { level: 1 }) },
  { label: "H2", title: "Heading 2 (Ctrl+Alt+2)", run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(), active: (e) => e.isActive("heading", { level: 2 }) },
  { label: "H3", title: "Heading 3 (Ctrl+Alt+3)", run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(), active: (e) => e.isActive("heading", { level: 3 }) },
  SEP,
  { label: "B", title: "Bold (Ctrl+B)", run: (e) => e.chain().focus().toggleBold().run(), active: (e) => e.isActive("bold") },
  { label: "I", title: "Italic (Ctrl+I)", run: (e) => e.chain().focus().toggleItalic().run(), active: (e) => e.isActive("italic") },
  { label: "U", title: "Underline (Ctrl+U)", run: (e) => e.chain().focus().toggleUnderline().run(), active: (e) => e.isActive("underline") },
  { label: "S̶", title: "Strikethrough (Ctrl+Shift+S)", run: (e) => e.chain().focus().toggleStrike().run(), active: (e) => e.isActive("strike") },
  { label: "▮", title: "Highlight (Ctrl+Shift+H)", run: (e) => e.chain().focus().toggleHighlight().run(), active: (e) => e.isActive("highlight") },
  { label: "‹›", title: "Inline code (Ctrl+E)", run: (e) => e.chain().focus().toggleCode().run(), active: (e) => e.isActive("code") },
  SEP,
  { label: "•", title: "Bullet list (Ctrl+Shift+8)", run: (e) => e.chain().focus().toggleBulletList().run(), active: (e) => e.isActive("bulletList") },
  { label: "1.", title: "Numbered list (Ctrl+Shift+7)", run: (e) => e.chain().focus().toggleOrderedList().run(), active: (e) => e.isActive("orderedList") },
  { label: "☑", title: "Task list (Ctrl+Shift+9)", run: (e) => e.chain().focus().toggleTaskList().run(), active: (e) => e.isActive("taskList") },
  { label: "❝", title: "Quote (Ctrl+Shift+B)", run: (e) => e.chain().focus().toggleBlockquote().run(), active: (e) => e.isActive("blockquote") },
  { label: "{ }", title: "Code block (Ctrl+Alt+C)", run: (e) => e.chain().focus().toggleCodeBlock().run(), active: (e) => e.isActive("codeBlock") },
  { label: "—", title: "Divider", run: (e) => e.chain().focus().setHorizontalRule().run() },
  SEP,
  { label: "⇤", title: "Align left", run: (e) => e.chain().focus().setTextAlign("left").run(), active: (e) => e.isActive({ textAlign: "left" }) },
  { label: "↔", title: "Align center", run: (e) => e.chain().focus().setTextAlign("center").run(), active: (e) => e.isActive({ textAlign: "center" }) },
  { label: "⇥", title: "Align right", run: (e) => e.chain().focus().setTextAlign("right").run(), active: (e) => e.isActive({ textAlign: "right" }) },
  SEP,
  {
    label: "🔗",
    title: "Link (Ctrl+K)",
    run: (e) => {
      const previous = e.getAttributes("link").href as string | undefined;
      const url = window.prompt("Link URL", previous ?? "https://");
      if (url === null) return;
      if (url === "") e.chain().focus().extendMarkRange("link").unsetLink().run();
      else e.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    },
    active: (e) => e.isActive("link"),
  },
  { label: "Tx", title: "Clear formatting", run: (e) => e.chain().focus().clearNodes().unsetAllMarks().run() },
];

export function createEditor(
  element: HTMLElement,
  toolbar: HTMLElement,
  content: string,
  onUpdate: (html: string, words: number) => void,
): Editor {
  const editor = new Editor({
    element,
    content,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({
        placeholder: ({ node }) =>
          node.type.name === "heading" ? "Heading" : "Write your document here. Use the toolbar or Markdown shortcuts: # heading, - list, [ ] task, > quote.",
      }),
      Link.configure({ openOnClick: false, autolink: true, defaultProtocol: "https" }),
      Underline,
      TaskList,
      TaskItem.configure({ nested: true }),
      CharacterCount,
      Highlight,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Typography,
    ],
    editorProps: { attributes: { spellcheck: "true" } },
    onUpdate: ({ editor: e }) => onUpdate(e.getHTML(), e.storage.characterCount.words()),
    onTransaction: () => refresh(),
  });

  const buttons: { tool: Tool; el: HTMLButtonElement }[] = [];
  for (const tool of tools) {
    if (tool === SEP) {
      const sep = document.createElement("span");
      sep.className = "sep";
      toolbar.appendChild(sep);
      continue;
    }
    const el = document.createElement("button");
    el.type = "button";
    el.textContent = tool.label;
    el.title = tool.title;
    el.setAttribute("aria-label", tool.title);
    // mousedown + preventDefault keeps the selection in the editor
    el.addEventListener("mousedown", (ev) => ev.preventDefault());
    el.addEventListener("click", () => tool.run(editor));
    toolbar.appendChild(el);
    buttons.push({ tool, el });
  }

  function refresh(): void {
    for (const { tool, el } of buttons) {
      if (tool.active) el.setAttribute("aria-pressed", String(tool.active(editor)));
      if (tool.enabled) el.disabled = !tool.enabled(editor);
    }
  }
  refresh();

  // Ctrl/Cmd+K for links, like most editors.
  element.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      tools.find((t) => t.title.startsWith("Link"))!.run(editor);
    }
  });

  return editor;
}

const turndown = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced", bulletListMarker: "-" });
turndown.addRule("taskItem", {
  filter: (node) => node.nodeName === "LI" && node.getAttribute("data-type") === "taskItem",
  replacement: (content, node) => {
    const checked = (node as HTMLElement).getAttribute("data-checked") === "true";
    return `- [${checked ? "x" : " "}] ${content.trim()}\n`;
  },
});
turndown.addRule("highlight", {
  filter: "mark",
  replacement: (content) => `==${content}==`,
});

export function toMarkdown(html: string): string {
  return turndown.turndown(html);
}
