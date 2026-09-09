"use client";

import { useCallback, useEffect, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Code,
  Link2,
  Link2Off,
  Undo2,
  Redo2,
} from "lucide-react";

const HEADING_LEVELS = [1, 2, 3, 4] as const;
type HeadingLevel = (typeof HEADING_LEVELS)[number];

// Only http(s) and mailto are allowed through. This blocks javascript: and
// data: URLs, which would otherwise be stored and later rendered on the
// public site.
const safeHref = (raw: string): string | null => {
  const value = raw.trim();
  if (!value) return null;

  // A bare domain is the common case when pasting, so assume https.
  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)
    ? value
    : `https://${value}`;

  try {
    const url = new URL(withScheme);
    if (!["http:", "https:", "mailto:"].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
};

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={!!active}
      title={label}
      className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "bg-black text-white"
          : "border border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-black"
      }`}
    >
      {children}
    </button>
  );
}

function LinkDialog({
  editor,
  onClose,
}: {
  editor: Editor;
  onClose: () => void;
}) {
  const existingHref = (editor.getAttributes("link").href as string) || "";
  const existingTarget = editor.getAttributes("link").target as
    | string
    | undefined;

  const { from, to } = editor.state.selection;
  const selectedText = editor.state.doc.textBetween(from, to, " ");

  const [text, setText] = useState(selectedText);
  const [url, setUrl] = useState(existingHref);
  const [newTab, setNewTab] = useState(
    existingHref ? existingTarget === "_blank" : true
  );
  const [error, setError] = useState("");

  const apply = () => {
    const href = safeHref(url);
    if (!href) {
      setError("Enter a valid http(s) or mailto link");
      return;
    }

    const label = text.trim() || href;
    const attrs = {
      href,
      target: newTab ? "_blank" : null,
      rel: newTab ? "noopener noreferrer" : null,
    };

    const chain = editor.chain().focus();

    if (selectedText && label === selectedText) {
      // Keep the existing selection, just mark it as a link.
      chain.extendMarkRange("link").setLink(attrs).run();
    } else {
      // Replace the selection (or insert at the cursor) with the link text.
      chain
        .extendMarkRange("link")
        .insertContent({
          type: "text",
          text: label,
          marks: [{ type: "link", attrs }],
        })
        .run();
    }

    onClose();
  };

  return (
    <div className="absolute left-0 top-full z-20 mt-2 w-80 rounded-xl border border-gray-200 bg-white p-4 shadow-2xl">
      <p className="mb-3 text-sm font-semibold text-gray-800">
        {existingHref ? "Edit link" : "Add link"}
      </p>

      <label className="mb-1 block text-xs text-gray-500">Link text</label>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Text to display"
        className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
      />

      <label className="mb-1 block text-xs text-gray-500">URL</label>
      <input
        value={url}
        autoFocus
        onChange={(e) => {
          setUrl(e.target.value);
          setError("");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            apply();
          }
          if (e.key === "Escape") onClose();
        }}
        placeholder="https://example.com"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
      />

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      <label className="mt-3 flex items-center gap-2 text-xs text-gray-600">
        <input
          type="checkbox"
          checked={newTab}
          onChange={(e) => setNewTab(e.target.checked)}
        />
        Open in new tab
      </label>

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-gray-300 px-4 py-2 text-xs text-gray-600 transition hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={apply}
          className="rounded-lg bg-black px-4 py-2 text-xs font-medium text-white transition hover:bg-gray-900"
        >
          Apply
        </button>
      </div>
    </div>
  );
}

export default function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const [linkOpen, setLinkOpen] = useState(false);

  const editor = useEditor({
    // Rendered only on the client; without this Next warns about SSR mismatch.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        link: false, // configured separately below
      }),
      Underline,
      // inclusive:false stops the link mark from extending onto text typed
      // immediately after it — otherwise the rest of the sentence silently
      // becomes part of the hyperlink.
      Link.extend({ inclusive: false }).configure({
        openOnClick: false,
        autolink: true,
        // Mirrors safeHref: nothing but http(s)/mailto is storable.
        protocols: ["http", "https", "mailto"],
        HTMLAttributes: { rel: "noopener noreferrer" },
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "blog-editor min-h-[320px] w-full rounded-b-xl bg-white px-4 py-3 text-sm text-gray-800 outline-none",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Load content when an existing blog is opened for editing. Guarded so
  // typing does not fight the controlled value on every keystroke.
  useEffect(() => {
    if (!editor) return;
    const incoming = value || "";
    if (incoming !== editor.getHTML()) {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  const toggleLink = useCallback(() => {
    if (!editor) return;
    setLinkOpen((open) => !open);
  }, [editor]);

  if (!editor) {
    return (
      <div className="min-h-[380px] rounded-xl border border-gray-300 bg-gray-50" />
    );
  }

  return (
    <div className="rounded-xl border border-gray-300 focus-within:border-black">
      {/* ================= TOOLBAR ================= */}
      <div className="relative flex flex-wrap items-center gap-1 rounded-t-xl border-b border-gray-200 bg-gray-50 px-3 py-2">
        {HEADING_LEVELS.map((level: HeadingLevel) => (
          <ToolbarButton
            key={level}
            label={`Heading ${level}`}
            active={editor.isActive("heading", { level })}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level }).run()
            }
          >
            H{level}
          </ToolbarButton>
        ))}

        <ToolbarButton
          label="Paragraph"
          active={editor.isActive("paragraph")}
          onClick={() => editor.chain().focus().setParagraph().run()}
        >
          P
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-gray-300" />

        <ToolbarButton
          label="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={14} />
        </ToolbarButton>

        <ToolbarButton
          label="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={14} />
        </ToolbarButton>

        <ToolbarButton
          label="Underline"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon size={14} />
        </ToolbarButton>

        <ToolbarButton
          label="Strikethrough"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough size={14} />
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-gray-300" />

        <ToolbarButton
          label="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={14} />
        </ToolbarButton>

        <ToolbarButton
          label="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={14} />
        </ToolbarButton>

        <ToolbarButton
          label="Blockquote"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote size={14} />
        </ToolbarButton>

        <ToolbarButton
          label="Inline code"
          active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code size={14} />
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-gray-300" />

        <ToolbarButton
          label="Add or edit link"
          active={editor.isActive("link") || linkOpen}
          onClick={toggleLink}
        >
          <Link2 size={14} />
        </ToolbarButton>

        <ToolbarButton
          label="Remove link"
          disabled={!editor.isActive("link")}
          onClick={() => editor.chain().focus().unsetLink().run()}
        >
          <Link2Off size={14} />
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-gray-300" />

        <ToolbarButton
          label="Undo"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 size={14} />
        </ToolbarButton>

        <ToolbarButton
          label="Redo"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 size={14} />
        </ToolbarButton>

        {linkOpen && (
          <LinkDialog editor={editor} onClose={() => setLinkOpen(false)} />
        )}
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
