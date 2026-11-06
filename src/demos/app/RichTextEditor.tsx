import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import { Placeholder } from '@tiptap/extensions'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import Highlight from '@tiptap/extension-highlight'
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Highlighter,
  Italic,
  List,
  ListChecks,
  ListOrdered,
  Quote,
  Redo2,
  SquareCode,
  Strikethrough,
  Undo2,
  type LucideIcon,
} from 'lucide-react'

const CONTENT = `
<h1>📝 週次ミーティングメモ</h1>
<p>今週は<strong>新しいオンボーディング</strong>のリリース準備を中心に進めました。テキストを選択すると<mark>バブルメニュー</mark>が出ます。</p>
<h2>決定事項</h2>
<ul><li>ベータ版は <code>11/20</code> に社内公開</li><li>チュートリアルは3ステップに短縮</li></ul>
<h2>TODO</h2>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="true"><p>デザインレビュー</p></li>
  <li data-type="taskItem" data-checked="false"><p>文言の最終チェック</p></li>
  <li data-type="taskItem" data-checked="false"><p>計測イベントの追加</p></li>
</ul>
<blockquote><p>「最初の30秒で価値を伝える」 — プロダクト原則 #3</p></blockquote>
<pre><code>const done = tasks.filter((t) => t.checked)</code></pre>
<p></p>
`

const CSS = `
.rte .ProseMirror{outline:none;min-height:100%;padding:18px 26px 40px;color:#27272a;font-size:14px;line-height:1.75}
.rte .ProseMirror h1{font-size:22px;font-weight:700;margin:0 0 6px;letter-spacing:-.01em;color:#09090b}
.rte .ProseMirror h2{font-size:16px;font-weight:700;margin:14px 0 2px;color:#18181b}
.rte .ProseMirror p{margin:4px 0}
.rte .ProseMirror ul,.rte .ProseMirror ol{padding-left:1.4em;margin:4px 0}
.rte .ProseMirror ul{list-style:disc}.rte .ProseMirror ol{list-style:decimal}
.rte .ProseMirror ul[data-type=taskList]{list-style:none;padding-left:.2em}
.rte .ProseMirror ul[data-type=taskList] li{display:flex;gap:8px;align-items:flex-start}
.rte .ProseMirror ul[data-type=taskList] li>label{margin-top:5px}
.rte .ProseMirror ul[data-type=taskList] li>label input{accent-color:#7c3aed;width:15px;height:15px}
.rte .ProseMirror ul[data-type=taskList] li[data-checked=true]>div{text-decoration:line-through;color:#a1a1aa}
.rte .ProseMirror blockquote{border-left:3px solid #c4b5fd;padding-left:12px;color:#52525b;margin:10px 0;font-style:italic}
.rte .ProseMirror code{background:#f4f4f5;border-radius:4px;padding:1px 5px;font-family:'JetBrains Mono',monospace;font-size:12.5px;color:#be185d}
.rte .ProseMirror pre{background:#18181b;color:#e4e4e7;border-radius:10px;padding:12px 14px;margin:10px 0}
.rte .ProseMirror pre code{background:none;color:inherit;padding:0}
.rte .ProseMirror mark{background:#fef08a;border-radius:3px;padding:0 2px}
.rte .ProseMirror p.is-empty::before{content:attr(data-placeholder);color:#a1a1aa;float:left;height:0;pointer-events:none}
`

function Btn({ icon: Icon, active, onClick, title }: { icon: LucideIcon; active?: boolean; onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`grid h-7 w-7 place-items-center rounded-md transition ${active ? 'bg-violet-100 text-violet-700' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'}`}
    >
      <Icon size={15} />
    </button>
  )
}

function Toolbar({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h1: e.isActive('heading', { level: 1 }),
      h2: e.isActive('heading', { level: 2 }),
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      strike: e.isActive('strike'),
      code: e.isActive('code'),
      mark: e.isActive('highlight'),
      ul: e.isActive('bulletList'),
      ol: e.isActive('orderedList'),
      task: e.isActive('taskList'),
      quote: e.isActive('blockquote'),
      pre: e.isActive('codeBlock'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
      chars: e.state.doc.textContent.length,
      blocks: e.state.doc.childCount,
    }),
  })
  const ch = () => editor.chain().focus()
  const Sep = () => <span className="mx-1 h-5 w-px bg-zinc-200" />
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-zinc-200 bg-white/80 px-2 py-1.5 backdrop-blur">
      <Btn icon={Undo2} title="元に戻す" onClick={() => s.canUndo && ch().undo().run()} />
      <Btn icon={Redo2} title="やり直す" onClick={() => s.canRedo && ch().redo().run()} />
      <Sep />
      <Btn icon={Heading1} title="見出し1" active={s.h1} onClick={() => ch().toggleHeading({ level: 1 }).run()} />
      <Btn icon={Heading2} title="見出し2" active={s.h2} onClick={() => ch().toggleHeading({ level: 2 }).run()} />
      <Sep />
      <Btn icon={Bold} title="太字 (Ctrl+B)" active={s.bold} onClick={() => ch().toggleBold().run()} />
      <Btn icon={Italic} title="斜体 (Ctrl+I)" active={s.italic} onClick={() => ch().toggleItalic().run()} />
      <Btn icon={Strikethrough} title="取り消し線" active={s.strike} onClick={() => ch().toggleStrike().run()} />
      <Btn icon={Highlighter} title="マーカー" active={s.mark} onClick={() => ch().toggleHighlight().run()} />
      <Btn icon={Code} title="インラインコード" active={s.code} onClick={() => ch().toggleCode().run()} />
      <Sep />
      <Btn icon={List} title="箇条書き" active={s.ul} onClick={() => ch().toggleBulletList().run()} />
      <Btn icon={ListOrdered} title="番号付き" active={s.ol} onClick={() => ch().toggleOrderedList().run()} />
      <Btn icon={ListChecks} title="タスクリスト" active={s.task} onClick={() => ch().toggleTaskList().run()} />
      <Btn icon={Quote} title="引用" active={s.quote} onClick={() => ch().toggleBlockquote().run()} />
      <Btn icon={SquareCode} title="コードブロック" active={s.pre} onClick={() => ch().toggleCodeBlock().run()} />
      <span className="ml-auto pr-1 text-[11px] text-zinc-400 tabular-nums">
        {s.chars} 文字 · {s.blocks} ブロック
      </span>
    </div>
  )
}

export function RichTextEditor() {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),

      Placeholder.configure({ placeholder: '「/」ではなく、ツールバーかMarkdown記法(# や - [ ])で書けます…' }),
    ],
    content: CONTENT,
    immediatelyRender: true,
  })

  return (
    <div className="rte relative flex h-full w-full flex-col overflow-hidden bg-gradient-to-b from-zinc-100 to-zinc-200 font-sans">
      <style>{CSS}</style>
      {editor && (
        <>
          <Toolbar editor={editor} />
          <BubbleMenu editor={editor} options={{ placement: 'top', offset: 8 }}>
            <div className="flex items-center gap-0.5 rounded-lg border border-zinc-700 bg-zinc-900 p-1 text-white shadow-xl">
              {(
                [
                  [Bold, 'bold', () => editor.chain().focus().toggleBold().run()],
                  [Italic, 'italic', () => editor.chain().focus().toggleItalic().run()],
                  [Strikethrough, 'strike', () => editor.chain().focus().toggleStrike().run()],
                  [Highlighter, 'highlight', () => editor.chain().focus().toggleHighlight().run()],
                  [Code, 'code', () => editor.chain().focus().toggleCode().run()],
                ] as const
              ).map(([Icon, name, fn]) => (
                <button
                  key={name}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={fn}
                  className={`grid h-7 w-7 place-items-center rounded-md ${editor.isActive(name) ? 'bg-violet-500 text-white' : 'text-zinc-300 hover:bg-white/10'}`}
                >
                  <Icon size={14} />
                </button>
              ))}
            </div>
          </BubbleMenu>
        </>
      )}
      <div className="thin-scroll relative min-h-0 flex-1 overflow-y-auto px-3 pt-3">
        <div className="mx-auto min-h-full max-w-2xl rounded-t-xl bg-white shadow-sm ring-1 ring-zinc-200">
          <EditorContent editor={editor} className="h-full" />
        </div>
      </div>
    </div>
  )
}
