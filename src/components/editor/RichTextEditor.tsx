'use client';

import React, { useCallback, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';

const lowlight = createLowlight(common);

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxHeight?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Tulis deskripsi di sini...',
  disabled = false,
  maxHeight = '400px',
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      Image.configure({
        allowBase64: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editable: !disabled,
    // Handle paste events
    editorProps: {
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          
          // Check if item is an image
          if (item.type.indexOf('image') !== -1) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) {
              const reader = new FileReader();
              reader.onload = (e) => {
                const base64 = e.target?.result as string;
                view.dispatch(
                  view.state.tr.replaceSelectionWith(
                    view.state.schema.nodes.image.create({ src: base64 })
                  )
                );
              };
              reader.readAsDataURL(file);
            }
            return true;
          }
        }
        return false;
      },
    },
  });

  const toggleBold = useCallback(() => editor?.chain().focus().toggleBold().run(), [editor]);

  // Sync editor content when value is reset externally (e.g. empty string after form reset)
  useEffect(() => {
    if (!editor) return;
    // Only sync when value is empty (reset) to avoid fighting with user typing
    if (value === '' || value === '<p></p>') {
      const current = editor.getHTML();
      if (current !== '<p></p>' && current !== '') {
        editor.commands.setContent('');
      }
    }
  }, [value, editor]);
  const toggleItalic = useCallback(() => editor?.chain().focus().toggleItalic().run(), [editor]);
  const toggleUnderline = useCallback(() => editor?.chain().focus().toggleUnderline().run(), [editor]);
  const toggleStrike = useCallback(() => editor?.chain().focus().toggleStrike().run(), [editor]);
  const toggleCode = useCallback(() => editor?.chain().focus().toggleCode().run(), [editor]);
  const toggleCodeBlock = useCallback(() => editor?.chain().focus().toggleCodeBlock().run(), [editor]);
  const toggleBulletList = useCallback(() => editor?.chain().focus().toggleBulletList().run(), [editor]);
  const toggleOrderedList = useCallback(() => editor?.chain().focus().toggleOrderedList().run(), [editor]);
  const toggleBlockquote = useCallback(() => editor?.chain().focus().toggleBlockquote().run(), [editor]);
  const setLink = useCallback(() => {
    const url = window.prompt('Masukkan URL:');
    if (url) {
      editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  }, [editor]);
  const removeLink = useCallback(() => editor?.chain().focus().unsetLink().run(), [editor]);
  const insertTable = useCallback(() => {
    const rows = prompt('Berapa baris? (default: 3)', '3');
    const cols = prompt('Berapa kolom? (default: 3)', '3');
    
    if (rows && cols) {
      const rowCount = Math.max(1, Math.min(20, parseInt(rows) || 3));
      const colCount = Math.max(1, Math.min(10, parseInt(cols) || 3));
      editor?.chain().focus().insertTable({ rows: rowCount, cols: colCount, withHeaderRow: true }).run();
    }
  }, [editor]);
  const insertImage = useCallback(() => {
    const url = window.prompt('Masukkan URL gambar:');
    if (url) {
      editor?.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  const isActive = (name: string, attrs?: any) => editor.isActive(name, attrs);

  return (
    <div className="border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
      <style>{`
        .ProseMirror {
          outline: none;
        }

        .ProseMirror table {
          border-collapse: collapse;
          margin: 0;
          overflow: hidden;
          table-layout: fixed;
          width: 100%;
        }

        .ProseMirror td,
        .ProseMirror th {
          border: 1px solid #ccc;
          box-sizing: border-box;
          min-width: 1em;
          padding: 6px 8px;
          position: relative;
          vertical-align: top;
        }

        .dark .ProseMirror td,
        .dark .ProseMirror th {
          border-color: #555;
        }

        .ProseMirror th {
          background-color: #f3f4f6;
          font-weight: bold;
          text-align: left;
        }

        .dark .ProseMirror th {
          background-color: #374151;
        }

        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }

        .ProseMirror li {
          margin: 0.25rem 0;
        }

        .ProseMirror ul li {
          list-style-type: disc;
        }

        .ProseMirror ol li {
          list-style-type: decimal;
        }

        .ProseMirror blockquote {
          border-left: 3px solid #ccc;
          margin: 0.5rem 0;
          padding-left: 1rem;
          opacity: 0.8;
        }

        .dark .ProseMirror blockquote {
          border-left-color: #555;
        }

        .ProseMirror code {
          background-color: #f3f4f6;
          border-radius: 0.25rem;
          font-family: monospace;
          padding: 0.2em 0.4em;
        }

        .dark .ProseMirror code {
          background-color: #374151;
        }

        .ProseMirror pre {
          background-color: #f3f4f6;
          border-radius: 0.5rem;
          font-family: monospace;
          margin: 0.5rem 0;
          overflow-x: auto;
          padding: 1rem;
        }

        .dark .ProseMirror pre {
          background-color: #1f2937;
        }

        .ProseMirror img {
          height: auto;
          max-width: 100%;
        }
      `}</style>
      {/* Toolbar */}
      <div className="bg-gray-50 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600 p-3 flex flex-wrap gap-1 overflow-x-auto">
        {/* Text Formatting */}
        <div className="flex gap-1 border-r border-gray-300 dark:border-gray-600 pr-2">
          <button
            type="button"
            onClick={toggleBold}
            className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
              isActive('bold') ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
            }`}
            title="Bold (Ctrl+B)"
            disabled={disabled}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6V4zm0 10h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6v-8z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={toggleItalic}
            className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
              isActive('italic') ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
            }`}
            title="Italic (Ctrl+I)"
            disabled={disabled}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={toggleUnderline}
            className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
              isActive('underline') ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
            }`}
            title="Underline (Ctrl+U)"
            disabled={disabled}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5 3v10a7 7 0 0 0 7 7 7 7 0 0 0 7-7V3m-2 0v10a5 5 0 0 1-5 5 5 5 0 0 1-5-5V3m-2 18h14" />
            </svg>
          </button>
          <button
            type="button"
            onClick={toggleStrike}
            className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
              isActive('strike') ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
            }`}
            title="Strikethrough"
            disabled={disabled}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 12h18M5 6h14M5 18h14" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
          </button>
        </div>

        {/* Lists */}
        <div className="flex gap-1 border-r border-gray-300 dark:border-gray-600 pr-2">
          <button
            type="button"
            onClick={toggleBulletList}
            className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
              isActive('bulletList') ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
            }`}
            title="Bullet List"
            disabled={disabled}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="4" cy="6" r="1" />
              <path d="M8 6h12M4 12h0M8 12h12M4 18h0M8 18h12" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
          <button
            type="button"
            onClick={toggleOrderedList}
            className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
              isActive('orderedList') ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
            }`}
            title="Ordered List"
            disabled={disabled}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <text x="4" y="8" fontSize="10" fontWeight="bold">1.</text>
              <text x="4" y="14" fontSize="10" fontWeight="bold">2.</text>
              <text x="4" y="20" fontSize="10" fontWeight="bold">3.</text>
              <path d="M8 6h12M8 12h12M8 18h12" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
        </div>

        {/* Code & Blockquote */}
        <div className="flex gap-1 border-r border-gray-300 dark:border-gray-600 pr-2">
          <button
            type="button"
            onClick={toggleCode}
            className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
              isActive('code') ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
            }`}
            title="Inline Code"
            disabled={disabled}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9.4 16.6L4.8 12l4.6-4.6M14.6 16.6l4.6-4.6-4.6-4.6" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
          </button>
          <button
            type="button"
            onClick={toggleCodeBlock}
            className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
              isActive('codeBlock') ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
            }`}
            title="Code Block"
            disabled={disabled}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
              <path d="M9 9l-2 2 2 2M15 9l2 2-2 2M12 7v10" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
          <button
            type="button"
            onClick={toggleBlockquote}
            className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
              isActive('blockquote') ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
            }`}
            title="Blockquote"
            disabled={disabled}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 21c3 0 7-1 7-8V5c0-1.25-4.5-5-7-5s-6 3.75-6 5c0 1 0 2 .5 3.5.5 1.5 1 2 1 4v3c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
              <path d="M15 21c3 0 7-1 7-8V5c0-1.25-4.5-5-7-5s-6 3.75-6 5c0 1 0 2 .5 3.5.5 1.5 1 2 1 4v3c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
            </svg>
          </button>
        </div>

        {/* Links & Media */}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={setLink}
            className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
              isActive('link') ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
            }`}
            title="Add Link"
            disabled={disabled}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.658 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </button>
          {isActive('link') && (
            <button
              onClick={removeLink}
              className="p-2 rounded hover:bg-red-200 dark:hover:bg-red-900 text-red-600 dark:text-red-300 transition-colors"
              title="Remove Link"
              type="button"
              disabled={disabled}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <button
            type="button"
            onClick={insertImage}
            className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
            title="Insert Image atau Paste (Ctrl+V)"
            disabled={disabled}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={insertTable}
            className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
            title="Insert Table (Atur ukuran tabel)"
            disabled={disabled}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
              <path d="M3 9h18M3 15h18M9 3v18M15 3v18" stroke="currentColor" strokeWidth="1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Editor */}
      <div
        className="prose prose-sm dark:prose-invert max-w-none p-4 overflow-y-auto bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        style={{ maxHeight }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default RichTextEditor;
