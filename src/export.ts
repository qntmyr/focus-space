// Export the document as Markdown, plain text, Word (.docx) or PDF (via the print dialog).
import type { Editor, JSONContent } from "@tiptap/core";
import { toMarkdown } from "./editor";

export type Format = "md" | "txt" | "docx" | "pdf";

function slug(title: string): string {
  return title.replace(/[^\w\-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "untitled";
}

async function download(blob: Blob, filename: string): Promise<void> {
  const { saveAs } = await import("file-saver");
  saveAs(blob, filename);
}

export async function exportDocument(editor: Editor, title: string, format: Format): Promise<void> {
  const base = slug(title);
  switch (format) {
    case "md":
      return download(new Blob([`# ${title}\n\n${toMarkdown(editor.getHTML())}\n`], { type: "text/markdown;charset=utf-8" }), `${base}.md`);
    case "txt":
      return download(new Blob([`${title}\n\n${editor.getText({ blockSeparator: "\n\n" })}\n`], { type: "text/plain;charset=utf-8" }), `${base}.txt`);
    case "docx":
      return download(await toDocx(editor.getJSON(), title), `${base}.docx`);
    case "pdf":
      return printToPdf(title);
  }
}

/* ---------- PDF: the browser's print dialog, with a print stylesheet that keeps only the document ---------- */
function printToPdf(title: string): void {
  const previous = document.title;
  document.title = title; // becomes the suggested PDF file name
  window.print();
  window.setTimeout(() => (document.title = previous), 1000);
}

/* ---------- DOCX: walk the TipTap JSON and build Word paragraphs ---------- */
async function toDocx(doc: JSONContent, title: string): Promise<Blob> {
  const docx = await import("docx");
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ExternalHyperlink } = docx;

  type Run = InstanceType<typeof TextRun> | InstanceType<typeof ExternalHyperlink>;
  const paragraphs: InstanceType<typeof Paragraph>[] = [];

  const headingFor = (level: number) =>
    level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3;
  const alignFor = (align?: string) =>
    align === "center" ? AlignmentType.CENTER : align === "right" ? AlignmentType.RIGHT : align === "justify" ? AlignmentType.JUSTIFIED : AlignmentType.LEFT;

  function runs(nodes: JSONContent[] | undefined, mono = false): Run[] {
    const out: Run[] = [];
    for (const n of nodes ?? []) {
      if (n.type === "hardBreak") {
        out.push(new TextRun({ break: 1 }));
        continue;
      }
      if (n.type !== "text") continue;
      const marks = new Map((n.marks ?? []).map((m) => [m.type, m.attrs ?? {}]));
      const run = new TextRun({
        text: n.text ?? "",
        bold: marks.has("bold"),
        italics: marks.has("italic"),
        underline: marks.has("underline") ? {} : undefined,
        strike: marks.has("strike"),
        highlight: marks.has("highlight") ? "yellow" : undefined,
        font: mono || marks.has("code") ? "Consolas" : undefined,
        style: marks.has("link") ? "Hyperlink" : undefined,
      });
      if (marks.has("link")) out.push(new ExternalHyperlink({ children: [run], link: String(marks.get("link")!.href ?? "") }));
      else out.push(run);
    }
    return out;
  }

  function walk(node: JSONContent, ctx: { list?: "bullet" | "ordered" | "task"; level: number; quote?: boolean; checked?: boolean }): void {
    switch (node.type) {
      case "heading":
        paragraphs.push(new Paragraph({ heading: headingFor(node.attrs?.level ?? 1), alignment: alignFor(node.attrs?.textAlign), children: runs(node.content) }));
        break;
      case "paragraph": {
        const children = runs(node.content);
        if (ctx.list === "task") children.unshift(new TextRun({ text: ctx.checked ? "☑ " : "☐ " }));
        paragraphs.push(
          new Paragraph({
            children,
            alignment: alignFor(node.attrs?.textAlign),
            bullet: ctx.list === "bullet" ? { level: ctx.level } : undefined,
            numbering: ctx.list === "ordered" ? { reference: "numbers", level: ctx.level } : undefined,
            indent: ctx.list === "task" || ctx.quote ? { left: 720 * (ctx.level + 1) } : undefined,
            border: ctx.quote ? { left: { style: docx.BorderStyle.SINGLE, size: 12, color: "5B6CFF", space: 8 } } : undefined,
            spacing: { after: 120 },
          }),
        );
        break;
      }
      case "bulletList":
        node.content?.forEach((li) => walk(li, { ...ctx, list: "bullet", level: ctx.list ? ctx.level + 1 : 0 }));
        break;
      case "orderedList":
        node.content?.forEach((li) => walk(li, { ...ctx, list: "ordered", level: ctx.list ? ctx.level + 1 : 0 }));
        break;
      case "taskList":
        node.content?.forEach((li) => walk(li, { ...ctx, list: "task", level: ctx.list ? ctx.level + 1 : 0 }));
        break;
      case "listItem":
      case "taskItem":
        node.content?.forEach((child, i) =>
          walk(child, {
            ...ctx,
            checked: node.attrs?.checked === true,
            // only the first paragraph of an item carries the bullet / checkbox
            list: i === 0 || child.type !== "paragraph" ? ctx.list : undefined,
          }),
        );
        break;
      case "blockquote":
        node.content?.forEach((child) => walk(child, { ...ctx, quote: true }));
        break;
      case "codeBlock":
        for (const line of (node.content?.map((c) => c.text ?? "").join("") || "").split("\n")) {
          paragraphs.push(new Paragraph({ children: [new TextRun({ text: line, font: "Consolas", size: 20 })], shading: { fill: "F0EFE9" } }));
        }
        break;
      case "horizontalRule":
        paragraphs.push(new Paragraph({ border: { bottom: { style: docx.BorderStyle.SINGLE, size: 6, color: "CCCCCC" } }, spacing: { after: 200 } }));
        break;
      default:
        node.content?.forEach((child) => walk(child, ctx));
    }
  }

  paragraphs.push(new Paragraph({ text: title, heading: HeadingLevel.TITLE }));
  doc.content?.forEach((n) => walk(n, { level: 0 }));

  const file = new Document({
    creator: "Focus Space",
    title,
    numbering: {
      config: [
        {
          reference: "numbers",
          levels: [0, 1, 2].map((level) => ({
            level,
            format: docx.LevelFormat.DECIMAL,
            text: `%${level + 1}.`,
            alignment: AlignmentType.START,
            style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } },
          })),
        },
      ],
    },
    sections: [{ children: paragraphs }],
  });
  return Packer.toBlob(file);
}
