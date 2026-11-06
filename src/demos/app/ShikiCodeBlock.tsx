import { useEffect, useState } from 'react'
import { createHighlighter, createJavaScriptRegexEngine, type Highlighter, type ShikiTransformer } from 'shiki'
import { Check, Copy, FileCode2, Moon, Sun, Terminal } from 'lucide-react'

// ハイライターは1つだけ作って使い回す(JS正規表現エンジン = WASM不要で軽量)
let hlPromise: Promise<Highlighter> | null = null
const getHL = () =>
  (hlPromise ??= createHighlighter({
    themes: ['github-dark', 'github-light'],
    langs: ['tsx', 'bash'],
    engine: createJavaScriptRegexEngine(),
  }))

const PM = {
  npm: 'npm install motion lucide-react',
  pnpm: 'pnpm add motion lucide-react',
  yarn: 'yarn add motion lucide-react',
  bun: 'bun add motion lucide-react',
}
type Pm = keyof typeof PM

const CODE = `import { motion } from 'motion/react'
import { Sparkles } from 'lucide-react'

export function Badge({ label }: { label: string }) {
  return (
    <span className="badge">
    <motion.span
      className="badge"
      whileHover={{ scale: 1.05 }}
    >
      <Sparkles size={14} />
      {label}
    </motion.span>
  )
}`
const REMOVED = new Set([6])
const ADDED = new Set([7, 8, 9, 10])
const FOCUS = new Set([7, 8, 9, 10])

const lineTransformer: ShikiTransformer = {
  line(node, line) {
    node.properties['data-line'] = line
    if (ADDED.has(line)) this.addClassToHast(node, 'diff-add')
    if (REMOVED.has(line)) this.addClassToHast(node, 'diff-remove')
    if (FOCUS.has(line)) this.addClassToHast(node, 'hl')
  },
  pre(node) {
    this.addClassToHast(node, 'shiki-pre')
  },
}

const CSS = `
.skb .shiki-pre{margin:0;padding:12px 0;background:transparent!important;font:12.5px/1.65 'JetBrains Mono',monospace;counter-reset:ln;overflow-x:auto}
.skb .shiki-pre .line{display:inline-block;width:100%;padding:0 16px 0 0;position:relative}
.skb .shiki-pre.numbered .line::before{counter-increment:ln;content:counter(ln);display:inline-block;width:2.4em;margin-right:1.2em;text-align:right;opacity:.35}
.skb .line.hl{background:color-mix(in oklab,#8b5cf6 12%,transparent)}
.skb .line.diff-add{background:color-mix(in oklab,#22c55e 16%,transparent)}
.skb .line.diff-add::after{content:'+';position:absolute;left:2.6em;color:#22c55e}
.skb .line.diff-remove{background:color-mix(in oklab,#ef4444 16%,transparent);opacity:.75}
.skb .line.diff-remove::after{content:'−';position:absolute;left:2.6em;color:#ef4444}
`

function CopyBtn({ text, dark }: { text: string; dark: boolean }) {
  const [ok, setOk] = useState(false)
  return (
    <button
      type="button"
      title="コピー"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
        } catch {
          /* clipboard 不可の環境 */
        }
        setOk(true)
        setTimeout(() => setOk(false), 1400)
      }}
      className={`grid h-7 w-7 place-items-center rounded-md border transition ${dark ? 'border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white' : 'border-zinc-200 text-zinc-500 hover:bg-zinc-100'}`}
    >
      {ok ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
    </button>
  )
}

export function ShikiCodeBlock() {
  const [dark, setDark] = useState(true)
  const [pm, setPm] = useState<Pm>('npm')
  const [html, setHtml] = useState({ cmd: '', code: '' })

  useEffect(() => {
    let alive = true
    getHL().then((hl) => {
      if (!alive) return
      const theme = dark ? 'github-dark' : 'github-light'
      setHtml({
        cmd: hl.codeToHtml(PM[pm], { lang: 'bash', theme, transformers: [{ pre: (n) => void (n.properties.class = 'shiki-pre') }] }),
        code: hl.codeToHtml(CODE, { lang: 'tsx', theme, transformers: [lineTransformer] }).replace('shiki-pre', 'shiki-pre numbered'),
      })
    })
    return () => {
      alive = false
    }
  }, [dark, pm])

  const card = dark ? 'border-white/10 bg-[#0d1117]' : 'border-zinc-200 bg-white'
  const bar = dark ? 'border-white/10 bg-white/[0.03] text-zinc-400' : 'border-zinc-200 bg-zinc-50 text-zinc-500'

  return (
    <div className={`skb relative flex h-full w-full flex-col gap-3 overflow-hidden p-4 font-sans transition-colors ${dark ? 'bg-zinc-950 text-zinc-200' : 'bg-zinc-100 text-zinc-800'}`}>
      <style>{CSS}</style>
      <div className="flex items-center">
        <div>
          <div className="text-[14px] font-semibold">インストール</div>
          <div className={`text-[11px] ${dark ? 'text-zinc-500' : 'text-zinc-500'}`}>Shiki(VS Code と同じ文法)でハイライトしたドキュメント用コードブロック</div>
        </div>
        <button
          type="button"
          onClick={() => setDark((d) => !d)}
          className={`ml-auto flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${dark ? 'border-white/10 hover:bg-white/10' : 'border-zinc-300 hover:bg-white'}`}
        >
          {dark ? <Moon size={12} /> : <Sun size={12} />} {dark ? 'Dark' : 'Light'}
        </button>
      </div>

      <div className={`overflow-hidden rounded-xl border ${card}`}>
        <div className={`flex items-center gap-1 border-b px-2 ${bar}`}>
          <Terminal size={13} className="mx-1" />
          {(Object.keys(PM) as Pm[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setPm(k)}
              className={`relative px-2.5 py-2 text-[12px] transition ${pm === k ? (dark ? 'text-white' : 'text-zinc-900') : 'hover:opacity-80'}`}
            >
              {k}
              {pm === k && <span className="absolute inset-x-1.5 -bottom-px h-0.5 rounded bg-violet-500" />}
            </button>
          ))}
          <div className="ml-auto">
            <CopyBtn text={PM[pm]} dark={dark} />
          </div>
        </div>
        <div className="px-4 [&_.shiki-pre]:py-2.5" dangerouslySetInnerHTML={{ __html: html.cmd }} />
      </div>

      <div className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border ${card}`}>
        <div className={`flex items-center gap-2 border-b px-3 py-1.5 text-[12px] ${bar}`}>
          <FileCode2 size={13} className="text-sky-500" />
          <span className="font-mono">components/Badge.tsx</span>
          <span className="rounded bg-emerald-500/15 px-1.5 text-[10px] text-emerald-500">+4</span>
          <span className="rounded bg-red-500/15 px-1.5 text-[10px] text-red-500">−1</span>
          <div className="ml-auto">
            <CopyBtn text={CODE} dark={dark} />
          </div>
        </div>
        <div className="thin-scroll min-h-0 flex-1 overflow-auto" dangerouslySetInnerHTML={{ __html: html.code || '<div style="padding:16px;opacity:.5;font-size:12px">highlighting…</div>' }} />
      </div>
    </div>
  )
}
