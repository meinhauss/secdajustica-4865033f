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
  Sparkles, SpellCheck, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import { sanitizeRichHtml } from "@/lib/sanitize";
import { toast } from "sonner";
import { ai } from "@/lib/ai";
import { PROMPTS, SYSTEM_JURIDICO } from "@/lib/ai/prompts";
import { useEffect, useRef, useState } from "react";
import { aplicarVariaveis, VARIAVEIS_DISPONIVEIS, type ModeloContext } from "@/lib/modelosVars";
import { SNIPPETS_PADRAO, SNIPPETS_INFO } from "@/lib/snippets";

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  disabled?: boolean;
  /** Habilita atalhos /desp, /sent etc. e autocompletar {{variavel}}. */
  smart?: boolean;
  /** Contexto para substituir variáveis dos snippets. */
  context?: ModeloContext;
  /** Snippets adicionais (mesclados aos padrão). Chave sem a barra. */
  snippets?: Record<string, string>;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  minHeight = "120px",
  disabled,
  smart,
  context,
  snippets,
}: RichTextEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [varMenu, setVarMenu] = useState<{ open: boolean; top: number; left: number; query: string; from: number }>(
    { open: false, top: 0, left: 0, query: "", from: 0 }
  );
  const [varIdx, setVarIdx] = useState(0);
  const [aiBusy, setAiBusy] = useState<null | "melhorar" | "corrigir">(null);
  const snippetMap = { ...SNIPPETS_PADRAO, ...(snippets || {}) };
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: sanitizeRichHtml(value) || "",
    editable: !disabled,
    editorProps: {
      transformPastedHTML: (html) => sanitizeRichHtml(html),
      attributes: {
        class: cn(
          "prose prose-sm max-w-none focus:outline-none px-3 py-2 text-foreground caret-foreground dark:prose-invert",
          "prose-headings:font-semibold prose-p:my-1 prose-ul:my-1 prose-ol:my-1",
          "[&_.ProseMirror]:text-foreground [&_.ProseMirror_*]:text-foreground dark:[&_.ProseMirror_*]:!text-foreground",
        ),
        style: `min-height: ${minHeight}`,
      },
    },
    onUpdate: ({ editor }) => {
      const html = sanitizeRichHtml(editor.getHTML());
      // Treat empty editor (just <p></p>) as empty string
      onChange(html === "<p></p>" ? "" : html);

      if (!smart) return;

      // Detectar padrão de variável: {{query
      const { from } = editor.state.selection;
      const $pos = editor.state.doc.resolve(from);
      const textBefore = $pos.parent.textBetween(0, $pos.parentOffset, "\n", "\0");
      const varMatch = textBefore.match(/\{\{(\w*)$/);
      if (varMatch) {
        const coords = editor.view.coordsAtPos(from);
        const rect = containerRef.current?.getBoundingClientRect();
        setVarMenu({
          open: true,
          top: coords.bottom - (rect?.top || 0) + 4,
          left: coords.left - (rect?.left || 0),
          query: varMatch[1],
          from: from - varMatch[0].length,
        });
        setVarIdx(0);
      } else if (varMenu.open) {
        setVarMenu((v) => ({ ...v, open: false }));
      }

      // Detectar snippet: /atalho seguido de espaço
      const snipMatch = textBefore.match(/(?:^|\s)\/(\w+)\s$/);
      if (snipMatch) {
        const key = snipMatch[1].toLowerCase();
        const template = snippetMap[key];
        if (template) {
          const expanded = aplicarVariaveis(template, context || {});
          const startDel = from - snipMatch[0].length + (snipMatch[0].startsWith(" ") ? 1 : 0);
          editor.chain().focus()
            .deleteRange({ from: startDel, to: from })
            .insertContent(expanded.replace(/\n/g, "<br/>"))
            .run();
        }
      }
    },
  });

  // Sync external value changes (skip re-setting when the change came from this editor)
  useEffect(() => {
    if (!editor) return;
    if (editor.isFocused) return; // don't clobber caret while the user is typing
    const current = sanitizeRichHtml(editor.getHTML());
    const next = sanitizeRichHtml(value) || "";
    const norm = (s: string) => (s === "<p></p>" ? "" : s);
    if (norm(next) === norm(current)) return;
    editor.commands.setContent(next, { emitUpdate: false });
  }, [value, editor]);

  const varsFiltradas = smart
    ? VARIAVEIS_DISPONIVEIS.filter((v) => v.key.toLowerCase().includes(varMenu.query.toLowerCase()))
    : [];

  const insertVariable = (key: string) => {
    if (!editor) return;
    editor.chain().focus()
      .deleteRange({ from: varMenu.from, to: editor.state.selection.from })
      .insertContent(`{{${key}}} `)
      .run();
    setVarMenu((v) => ({ ...v, open: false }));
  };

  const runAI = async (kind: "melhorar" | "corrigir") => {
    if (!editor) return;
    const plain = editor.getText().trim();
    if (!plain) { toast.error("Escreva algo antes."); return; }
    setAiBusy(kind);
    const prompt = kind === "melhorar" ? PROMPTS.melhorarRedacao(plain) : PROMPTS.corrigirGramatica(plain);
    const res = await ai.run({
      operation: kind === "melhorar" ? "custom" : "revisar_gramatica",
      prompt,
      options: { systemInstruction: SYSTEM_JURIDICO, temperature: kind === "corrigir" ? 0.2 : 0.4 },
    });
    setAiBusy(null);
    if (!res.ok) { toast.error(res.error?.message || "Falha na IA."); return; }
    const html = (res.data as string)
      .split(/\n{2,}/)
      .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
      .join("");
    editor.commands.setContent(sanitizeRichHtml(html));
    onChange(sanitizeRichHtml(html));
    toast.success(kind === "melhorar" ? "Redação melhorada." : "Texto corrigido.");
  };

  if (!editor) return null;


  return (
    <div
      ref={containerRef}
      className={cn(
        "relative rounded-xl border border-input bg-background text-foreground overflow-visible",
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
        <span className="mx-1 h-5 w-px bg-border" />
        <Button
          type="button" variant="ghost" size="sm"
          className="h-8 px-2 gap-1 text-primary hover:text-primary hover:bg-primary/10"
          onClick={() => runAI("melhorar")}
          disabled={!!aiBusy}
          title="Reescreve mantendo sentido jurídico"
        >
          {aiBusy === "melhorar" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          <span className="text-xs">Melhorar</span>
        </Button>
        <Button
          type="button" variant="ghost" size="sm"
          className="h-8 px-2 gap-1 text-primary hover:text-primary hover:bg-primary/10"
          onClick={() => runAI("corrigir")}
          disabled={!!aiBusy}
          title="Corrige ortografia e gramática"
        >
          {aiBusy === "corrigir" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SpellCheck className="h-3.5 w-3.5" />}
          <span className="text-xs">Corrigir</span>
        </Button>
      </div>
      <div className="relative bg-background">
        {(!value || value === "") && placeholder && (
          <div className="pointer-events-none absolute left-3 top-2 text-sm text-muted-foreground">{placeholder}</div>
        )}
        <EditorContent editor={editor} />
      </div>
      {smart && varMenu.open && varsFiltradas.length > 0 && (
        <div
          className="absolute z-50 min-w-[220px] rounded-md border border-border bg-popover shadow-lg py-1 text-sm"
          style={{ top: varMenu.top, left: varMenu.left }}
        >
          <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">Variáveis</div>
          {varsFiltradas.slice(0, 8).map((v, i) => (
            <button
              key={v.key}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); insertVariable(v.key); }}
              onMouseEnter={() => setVarIdx(i)}
              className={cn(
                "w-full text-left px-3 py-1.5 hover:bg-accent",
                i === varIdx && "bg-accent"
              )}
            >
              <span className="font-mono text-xs text-primary">{`{{${v.key}}}`}</span>
              <span className="ml-2 text-muted-foreground text-xs">{v.label}</span>
            </button>
          ))}
        </div>
      )}
      {smart && (
        <div className="border-t border-border bg-muted/20 px-2 py-1 text-[10px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
          <span className="font-medium">Atalhos:</span>
          {SNIPPETS_INFO.slice(0, 6).map((s) => (
            <span key={s.atalho}><code className="font-mono">{s.atalho}</code> {s.descricao}</span>
          ))}
          <span>· digite <code className="font-mono">{`{{`}</code> para variáveis</span>
        </div>
      )}
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
const URL_REGEX = /(https?:\/\/[^\s<>"')]+)/g;

function linkifyPlain(text: string): string {
  // Preserva quebras de linha do texto puro convertendo \n em <p>,
  // evitando que relatos da ouvidoria apareçam embaralhados sem espaçamento.
  const lines = text.split(/\r?\n/);
  const paragraphs = lines.map((line) => {
    const escaped = line
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(URL_REGEX, (url) => `<a href="${url}">${url}</a>`);
    return `<p>${escaped || "&nbsp;"}</p>`;
  });
  return paragraphs.join("");
}

function linkifyHtml(html: string): string {
  // Only linkify text nodes that are not already inside an <a> tag.
  if (typeof document === "undefined") return html;
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  const walker = document.createTreeWalker(wrapper, NodeFilter.SHOW_TEXT, null);
  const textNodes: Text[] = [];
  let node = walker.nextNode() as Text | null;
  while (node) {
    if (!node.parentElement?.closest("a")) textNodes.push(node);
    node = walker.nextNode() as Text | null;
  }
  textNodes.forEach((tn) => {
    const text = tn.nodeValue || "";
    if (!URL_REGEX.test(text)) return;
    URL_REGEX.lastIndex = 0;
    const span = document.createElement("span");
    span.innerHTML = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(URL_REGEX, (url) => `<a href="${url}">${url}</a>`);
    tn.replaceWith(...Array.from(span.childNodes));
  });
  return wrapper.innerHTML;
}

export function RichTextView({ html, className }: RichTextViewProps) {
  const value = html ?? "";
  const looksLikeHtml = /<\/?[a-z][^>]*>/i.test(value);
  const raw = looksLikeHtml ? linkifyHtml(value) : linkifyPlain(value);
  const clean = sanitizeRichHtml(raw);
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none break-words text-foreground dark:prose-invert",
        "prose-p:my-3 prose-headings:my-4 prose-ul:my-3 prose-ol:my-3 prose-li:my-1",
        "[&_p]:whitespace-pre-wrap [&_li]:whitespace-pre-wrap [&_h1]:whitespace-pre-wrap [&_h2]:whitespace-pre-wrap [&_h3]:whitespace-pre-wrap [&_h4]:whitespace-pre-wrap [&_blockquote]:whitespace-pre-wrap",
        "[&_p:empty]:min-h-[1em] [&_p:empty]:before:content-['\\00a0']",
        "[&_br]:block [&_br]:content-['']",
        "[&_*]:text-foreground dark:[&_*]:!text-foreground",
        "[&_a]:!text-primary [&_a]:underline [&_a]:break-all",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
