import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Quote, Heading1, Heading2,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Indent, Outdent, Undo, Redo,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import { sanitizeRichHtml } from "@/lib/sanitize";
import { useEffect } from "react";

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  disabled?: boolean;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  minHeight = "120px",
  disabled,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value || "",
    editable: !disabled,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none focus:outline-none px-3 py-2 dark:prose-invert",
          "prose-headings:font-semibold prose-p:my-1 prose-ul:my-1 prose-ol:my-1",
        ),
        style: `min-height: ${minHeight}`,
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // Treat empty editor (just <p></p>) as empty string
      onChange(html === "<p></p>" ? "" : html);
    },
  });

  // Sync external value changes
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const next = value || "";
    if (next !== current && next !== (current === "<p></p>" ? "" : current)) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-input bg-background overflow-hidden",
        "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-1 py-1">
        <Toggle size="sm" pressed={editor.isActive("bold")} onPressedChange={() => editor.chain().focus().toggleBold().run()} aria-label="Negrito">
          <Bold className="h-3.5 w-3.5" />
        </Toggle>
        <Toggle size="sm" pressed={editor.isActive("italic")} onPressedChange={() => editor.chain().focus().toggleItalic().run()} aria-label="Itálico">
          <Italic className="h-3.5 w-3.5" />
        </Toggle>
        <Toggle size="sm" pressed={editor.isActive("underline")} onPressedChange={() => editor.chain().focus().toggleUnderline().run()} aria-label="Sublinhado">
          <UnderlineIcon className="h-3.5 w-3.5" />
        </Toggle>
        <Toggle size="sm" pressed={editor.isActive("strike")} onPressedChange={() => editor.chain().focus().toggleStrike().run()} aria-label="Tachado">
          <Strikethrough className="h-3.5 w-3.5" />
        </Toggle>
        <span className="mx-1 h-5 w-px bg-border" />
        <Toggle size="sm" pressed={editor.isActive("heading", { level: 1 })} onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} aria-label="Título 1">
          <Heading1 className="h-3.5 w-3.5" />
        </Toggle>
        <Toggle size="sm" pressed={editor.isActive("heading", { level: 2 })} onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} aria-label="Título 2">
          <Heading2 className="h-3.5 w-3.5" />
        </Toggle>
        <span className="mx-1 h-5 w-px bg-border" />
        <Toggle size="sm" pressed={editor.isActive("bulletList")} onPressedChange={() => editor.chain().focus().toggleBulletList().run()} aria-label="Lista">
          <List className="h-3.5 w-3.5" />
        </Toggle>
        <Toggle size="sm" pressed={editor.isActive("orderedList")} onPressedChange={() => editor.chain().focus().toggleOrderedList().run()} aria-label="Lista numerada">
          <ListOrdered className="h-3.5 w-3.5" />
        </Toggle>
        <Toggle size="sm" pressed={editor.isActive("blockquote")} onPressedChange={() => editor.chain().focus().toggleBlockquote().run()} aria-label="Citação">
          <Quote className="h-3.5 w-3.5" />
        </Toggle>
        <span className="mx-1 h-5 w-px bg-border" />
        <Toggle size="sm" pressed={editor.isActive({ textAlign: "left" })} onPressedChange={() => editor.chain().focus().setTextAlign("left").run()} aria-label="Alinhar à esquerda">
          <AlignLeft className="h-3.5 w-3.5" />
        </Toggle>
        <Toggle size="sm" pressed={editor.isActive({ textAlign: "center" })} onPressedChange={() => editor.chain().focus().setTextAlign("center").run()} aria-label="Centralizar">
          <AlignCenter className="h-3.5 w-3.5" />
        </Toggle>
        <Toggle size="sm" pressed={editor.isActive({ textAlign: "right" })} onPressedChange={() => editor.chain().focus().setTextAlign("right").run()} aria-label="Alinhar à direita">
          <AlignRight className="h-3.5 w-3.5" />
        </Toggle>
        <Toggle size="sm" pressed={editor.isActive({ textAlign: "justify" })} onPressedChange={() => editor.chain().focus().setTextAlign("justify").run()} aria-label="Justificar">
          <AlignJustify className="h-3.5 w-3.5" />
        </Toggle>
        <span className="mx-1 h-5 w-px bg-border" />
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => editor.chain().focus().sinkListItem("listItem").run()} aria-label="Aumentar recuo">
          <Indent className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => editor.chain().focus().liftListItem("listItem").run()} aria-label="Diminuir recuo">
          <Outdent className="h-3.5 w-3.5" />
        </Button>
        <span className="mx-1 h-5 w-px bg-border" />
        <select
          className="h-8 rounded-md border border-input bg-background px-1 text-xs"
          value={
            editor.isActive("textStyle", { fontSize: "0.875rem" }) ? "sm" :
            editor.isActive("textStyle", { fontSize: "1.125rem" }) ? "lg" :
            editor.isActive("textStyle", { fontSize: "1.5rem" }) ? "xl" : "base"
          }
          onChange={(e) => {
            const map: Record<string, string> = { sm: "0.875rem", base: "1rem", lg: "1.125rem", xl: "1.5rem" };
            (editor.chain().focus() as any).setMark("textStyle", { fontSize: map[e.target.value] }).run();
          }}
          aria-label="Tamanho da fonte"
        >
          <option value="sm">Pequeno</option>
          <option value="base">Normal</option>
          <option value="lg">Grande</option>
          <option value="xl">Muito grande</option>
        </select>
        <span className="mx-1 h-5 w-px bg-border" />
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => editor.chain().focus().undo().run()} aria-label="Desfazer">
          <Undo className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => editor.chain().focus().redo().run()} aria-label="Refazer">
          <Redo className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="relative bg-background">
        {(!value || value === "") && placeholder && (
          <div className="pointer-events-none absolute left-3 top-2 text-sm text-muted-foreground">{placeholder}</div>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

export interface RichTextViewProps {
  html: string | null | undefined;
  className?: string;
}

/**
 * Safe renderer for rich text content. Sanitizes HTML before rendering.
 * If the content is plain text, renders it as-is preserving line breaks.
 */
export function RichTextView({ html, className }: RichTextViewProps) {
  const value = html ?? "";
  const looksLikeHtml = /<\/?[a-z][^>]*>/i.test(value);
  if (!looksLikeHtml) {
    return <div className={cn("whitespace-pre-wrap break-words", className)}>{value}</div>;
  }
  const clean = sanitizeRichHtml(value);
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none break-words dark:prose-invert",
        "prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
