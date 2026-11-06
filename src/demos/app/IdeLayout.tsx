import { useState, type ReactNode } from 'react'
import { Group, Panel, Separator } from 'react-resizable-panels'
import { ChevronDown, ChevronRight, FileCode2, FileJson, FileText, Folder, FolderOpen, Palette, X } from 'lucide-react'

type FsNode = { name: string; children?: FsNode[] }
const TREE: FsNode[] = [
  {
    name: 'src',
    children: [
      { name: 'components', children: [{ name: 'Button.tsx' }, { name: 'Card.tsx' }, { name: 'Modal.tsx' }] },
      { name: 'hooks', children: [{ name: 'useTheme.ts' }] },
      { name: 'App.tsx' },
      { name: 'main.tsx' },
      { name: 'index.css' },
    ],
  },
  { name: 'public', children: [{ name: 'favicon.svg' }] },
  { name: 'package.json' },
  { name: 'README.md' },
]

const SOURCES: Record<string, string[]> = {
  'App.tsx': [
    "import { Button } from './components/Button'",
    "import { useTheme } from './hooks/useTheme'",
    '',
    'export function App() {',
    '  const { theme, toggle } = useTheme()',
    '  return (',
    '    <main data-theme={theme}>',
    '      <h1>Hello IDE 👋</h1>',
    '      <Button onClick={toggle}>テーマ切替</Button>',
    '    </main>',
    '  )',
    '}',
  ],
  'Button.tsx': ['type Props = React.ComponentProps<"button">', '', 'export function Button(props: Props) {', '  return <button className="btn" {...props} />', '}'],
  'useTheme.ts': ["import { useState } from 'react'", '', 'export function useTheme() {', "  const [theme, set] = useState<'light' | 'dark'>('dark')", "  return { theme, toggle: () => set((t) => (t === 'dark' ? 'light' : 'dark')) }", '}'],
  'package.json': ['{', '  "name": "my-app",', '  "scripts": { "dev": "vite", "build": "vite build" }', '}'],
}

function icon(name: string) {
  if (name.endsWith('.tsx') || name.endsWith('.ts')) return <FileCode2 size={14} className="text-sky-400" />
  if (name.endsWith('.json')) return <FileJson size={14} className="text-yellow-400" />
  if (name.endsWith('.css')) return <Palette size={14} className="text-pink-400" />
  return <FileText size={14} className="text-zinc-400" />
}

function highlight(line: string): ReactNode {
  const parts = line.split(/('[^']*'|"[^"]*"|\b(?:import|from|export|function|const|return|type)\b|<\/?[A-Za-z]+|\/\/.*)/g)
  return parts.map((p, i) =>
    /^['"]/.test(p) ? (
      <span key={i} className="text-amber-300">{p}</span>
    ) : /^(import|from|export|function|const|return|type)$/.test(p) ? (
      <span key={i} className="text-violet-400">{p}</span>
    ) : /^<\/?[A-Za-z]/.test(p) ? (
      <span key={i} className="text-sky-300">{p}</span>
    ) : (
      <span key={i}>{p}</span>
    ),
  )
}

function Tree({ nodes, depth, open, toggle, active, onOpen }: { nodes: FsNode[]; depth: number; open: Set<string>; toggle: (p: string) => void; active: string; onOpen: (n: string) => void }) {
  return (
    <>
      {nodes.map((n) => {
        const isDir = !!n.children
        const isOpen = open.has(n.name)
        return (
          <div key={n.name}>
            <button
              type="button"
              onClick={() => (isDir ? toggle(n.name) : onOpen(n.name))}
              className={`flex w-full items-center gap-1 py-[3px] pr-2 text-left text-[12px] ${active === n.name ? 'bg-sky-500/20 text-white' : 'text-zinc-300 hover:bg-white/5'}`}
              style={{ paddingLeft: 8 + depth * 12 }}
            >
              {isDir ? (isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />) : <span className="w-3" />}
              {isDir ? isOpen ? <FolderOpen size={14} className="text-amber-300" /> : <Folder size={14} className="text-amber-300" /> : icon(n.name)}
              <span className="truncate">{n.name}</span>
            </button>
            {isDir && isOpen && <Tree nodes={n.children!} depth={depth + 1} open={open} toggle={toggle} active={active} onOpen={onOpen} />}
          </div>
        )
      })}
    </>
  )
}

const Handle = ({ v }: { v?: boolean }) => (
  <Separator className={`group relative bg-black/40 transition-colors hover:bg-sky-500 data-[separator=active]:bg-sky-500 ${v ? 'h-1' : 'w-1'}`} />
)

export function IdeLayout() {
  const [open, setOpen] = useState(new Set(['src', 'components', 'hooks']))
  const [tabs, setTabs] = useState(['App.tsx', 'Button.tsx'])
  const [active, setActive] = useState('App.tsx')
  const openFile = (n: string) => {
    setTabs((t) => (t.includes(n) ? t : [...t, n]))
    setActive(n)
  }
  const close = (n: string) => {
    const rest = tabs.filter((t) => t !== n)
    setTabs(rest)
    if (active === n) setActive(rest.at(-1) ?? '')
  }
  const src = SOURCES[active] ?? [`// ${active}`, '// (デモ用のダミーファイルです)']

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#1e1e1e] font-sans text-zinc-300">
      <div className="flex h-7 items-center gap-3 border-b border-black/40 bg-[#2d2d30] px-3 text-[11px] text-zinc-400">
        <span className="flex gap-1.5">
          <i className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <i className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <i className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </span>
        <span>ファイル 編集 表示 実行</span>
        <span className="mx-auto">my-app — {active}</span>
      </div>
      <Group orientation="horizontal" className="min-h-0 flex-1">
        <Panel defaultSize="22" minSize={120} collapsible collapsedSize={0}>
          <div className="thin-scroll h-full overflow-auto bg-[#252526] py-1">
            <div className="px-3 pb-1 text-[10px] font-semibold tracking-wider text-zinc-500">EXPLORER</div>
            <Tree
              nodes={TREE}
              depth={0}
              open={open}
              toggle={(p) => setOpen((s) => (s.has(p) ? new Set([...s].filter((x) => x !== p)) : new Set([...s, p])))}
              active={active}
              onOpen={openFile}
            />
          </div>
        </Panel>
        <Handle />
        <Panel minSize={200}>
          <Group orientation="vertical">
            <Panel defaultSize="68" minSize={80}>
              <div className="flex h-full flex-col">
                <div className="flex bg-[#252526]">
                  {tabs.map((t) => (
                    <div
                      key={t}
                      onClick={() => setActive(t)}
                      className={`group flex cursor-pointer items-center gap-1.5 border-r border-black/30 px-3 py-1.5 text-[12px] ${active === t ? 'border-t-2 border-t-sky-500 bg-[#1e1e1e] text-white' : 'text-zinc-500'}`}
                    >
                      {icon(t)}
                      {t}
                      <button type="button" onClick={(e) => (e.stopPropagation(), close(t))} className="rounded opacity-0 group-hover:opacity-100 hover:bg-white/10">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="thin-scroll min-h-0 flex-1 overflow-auto py-2 font-mono text-[12px] leading-[1.6]">
                  {active ? (
                    src.map((l, i) => (
                      <div key={i} className="flex whitespace-pre hover:bg-white/[0.03]">
                        <span className="w-10 shrink-0 pr-3 text-right text-zinc-600">{i + 1}</span>
                        <span>{highlight(l)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="grid h-full place-items-center text-zinc-600">ファイルを開いてください</div>
                  )}
                </div>
              </div>
            </Panel>
            <Handle v />
            <Panel minSize={40}>
              <div className="flex h-full flex-col bg-[#1e1e1e]">
                <div className="flex gap-4 border-b border-white/5 px-3 py-1 text-[11px] text-zinc-500">
                  <span className="border-b border-zinc-300 text-zinc-200">ターミナル</span>
                  <span>問題 <b className="rounded-full bg-sky-600 px-1 text-[9px] text-white">2</b></span>
                  <span>出力</span>
                </div>
                <div className="thin-scroll flex-1 overflow-auto px-3 py-1 font-mono text-[11.5px]">
                  <div className="text-zinc-500">$ npm run dev</div>
                  <div>
                    <span className="text-emerald-400">VITE v8.3.6</span> ready in 312 ms
                  </div>
                  <div>
                    ➜ Local: <span className="text-sky-400">http://localhost:5173/</span>
                  </div>
                  <div className="text-zinc-500">[hmr] update /src/App.tsx</div>
                </div>
              </div>
            </Panel>
          </Group>
        </Panel>
        <Handle />
        <Panel defaultSize="26" minSize={120} collapsible collapsedSize={0}>
          <div className="flex h-full flex-col bg-[#252526]">
            <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider text-zinc-500">PREVIEW</div>
            <div className="m-2 mt-0 grid flex-1 place-items-center rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-900 ring-1 ring-white/10">
              <div className="text-center">
                <div className="text-[15px] font-bold text-white">Hello IDE 👋</div>
                <button type="button" className="mt-2 rounded-md bg-sky-600 px-3 py-1 text-[11px] text-white">
                  テーマ切替
                </button>
              </div>
            </div>
          </div>
        </Panel>
      </Group>
      <div className="flex h-5 items-center gap-3 bg-[#007acc] px-3 text-[10px] text-white">
        <span>⎇ main</span>
        <span>✓ 0 ⚠ 2</span>
        <span className="ml-auto">TypeScript React · UTF-8 · LF</span>
      </div>
    </div>
  )
}
