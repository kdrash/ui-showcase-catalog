import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUp, Check, ChevronDown, FileText, Globe, Image as ImageIcon, Paperclip, Sparkles, Square, X, Zap } from 'lucide-react'

const MODELS = [
  { id: 'pro', name: 'Pro', note: '高精度・長文向け', icon: Sparkles },
  { id: 'fast', name: 'Fast', note: '速い・安い', icon: Zap },
  { id: 'vision', name: 'Vision', note: '画像も理解', icon: ImageIcon },
]
const COMMANDS = [
  { cmd: '/summarize', label: '要約する', hint: '長文を3行に要約' },
  { cmd: '/translate', label: '翻訳する', hint: '日本語⇄英語' },
  { cmd: '/code', label: 'コードを書く', hint: '言語を指定して生成' },
  { cmd: '/search', label: 'Web検索', hint: '最新情報を調べる' },
  { cmd: '/image', label: '画像を生成', hint: 'プロンプトから画像' },
]
const FILES = [
  { name: 'デザイン仕様書.pdf', size: '2.4 MB', icon: FileText },
  { name: 'screenshot.png', size: '840 KB', icon: ImageIcon },
  { name: 'sales_2026.csv', size: '120 KB', icon: FileText },
]
const MAX = 2000

export function AiPromptBox() {
  const [text, setText] = useState('')
  const [files, setFiles] = useState<typeof FILES>([FILES[0]])
  const [model, setModel] = useState(MODELS[0])
  const [modelOpen, setModelOpen] = useState(false)
  const [sel, setSel] = useState(0)
  const [web, setWeb] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState<string[]>([])
  const ta = useRef<HTMLTextAreaElement>(null)
  const timer = useRef<number | null>(null)

  // 先頭が "/xxx" (空白なし) のときだけスラッシュコマンドメニュー
  const slash = /^\/(\S*)$/.exec(text)
  const matches = slash ? COMMANDS.filter((c) => c.cmd.startsWith('/' + slash[1])) : []
  const menuOpen = matches.length > 0

  useLayoutEffect(() => {
    const el = ta.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = Math.min(el.scrollHeight, 132) + 'px'
  }, [text])
  useEffect(() => setSel(0), [slash?.[1]])
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), [])

  const pick = (c: (typeof COMMANDS)[number]) => {
    setText(c.cmd + ' ')
    ta.current?.focus()
  }
  const submit = () => {
    if (busy) {
      if (timer.current) clearTimeout(timer.current)
      setBusy(false)
      return
    }
    if (!text.trim()) return
    setSent((s) => [text.trim(), ...s].slice(0, 2))
    setText('')
    setBusy(true)
    timer.current = window.setTimeout(() => setBusy(false), 3200)
  }

  const tokens = Math.ceil(text.length / 1.8)

  return (
    <div className="relative flex h-full w-full flex-col justify-end overflow-hidden bg-zinc-50 p-4 text-zinc-900">
      <div className="absolute inset-0 bg-[radial-gradient(#e4e4e7_1px,transparent_1px)] [background-size:16px_16px] opacity-60" />
      <div className="relative mx-auto mb-3 flex w-full max-w-xl flex-col gap-2">
        <AnimatePresence initial={false}>
          {sent.map((s, i) => (
            <motion.div
              key={s + i}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="ml-auto max-w-[80%] truncate rounded-xl bg-zinc-900 px-3 py-1.5 text-xs text-white"
            >
              {s}
            </motion.div>
          ))}
        </AnimatePresence>
        {busy && (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Sparkles size={13} className="animate-spin text-violet-500 [animation-duration:2s]" />
            <span className="bg-[linear-gradient(90deg,#71717a,#e4e4e7,#71717a)] bg-[length:200%_100%] bg-clip-text text-transparent [animation:shimmer_1.6s_linear_infinite]">
              {model.name} が回答を生成中…
            </span>
            <style>{'@keyframes shimmer{from{background-position:200% 0}to{background-position:-200% 0}}'}</style>
          </div>
        )}
      </div>

      <div className="relative mx-auto w-full max-w-xl">
        {/* スラッシュコマンド */}
        <AnimatePresence>
          {menuOpen && (
            <motion.ul
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6 }}
              className="absolute bottom-full left-0 z-20 mb-2 w-64 overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 shadow-xl"
              role="listbox"
            >
              <li className="px-2 py-1 text-[10px] font-medium tracking-wide text-zinc-400">コマンド</li>
              {matches.map((c, i) => (
                <li
                  key={c.cmd}
                  role="option"
                  aria-selected={i === sel}
                  onMouseEnter={() => setSel(i)}
                  onMouseDown={(e) => (e.preventDefault(), pick(c))}
                  className={`flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-xs ${i === sel ? 'bg-zinc-100' : ''}`}
                >
                  <span>
                    <span className="font-mono text-violet-600">{c.cmd}</span> <span className="text-zinc-700">{c.label}</span>
                  </span>
                  <span className="text-[10px] text-zinc-400">{c.hint}</span>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>

        <div className="rounded-2xl border border-zinc-200 bg-white p-2 shadow-[0_8px_30px_-12px_rgba(0,0,0,.25)] focus-within:border-zinc-400">
          {files.length > 0 && (
            <div className="mb-1.5 flex flex-wrap gap-1.5 px-1 pt-0.5">
              <AnimatePresence>
                {files.map((f) => (
                  <motion.span
                    key={f.name}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 py-1 pr-1 pl-2 text-[11px]"
                  >
                    <f.icon size={12} className="text-zinc-500" />
                    <span className="max-w-32 truncate">{f.name}</span>
                    <span className="text-zinc-400">{f.size}</span>
                    <button type="button" onClick={() => setFiles((fs) => fs.filter((x) => x !== f))} className="rounded p-0.5 hover:bg-zinc-200">
                      <X size={11} />
                    </button>
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
          )}
          <textarea
            ref={ta}
            rows={1}
            value={text}
            maxLength={MAX}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (menuOpen) {
                if (e.key === 'ArrowDown') return e.preventDefault(), setSel((s) => (s + 1) % matches.length)
                if (e.key === 'ArrowUp') return e.preventDefault(), setSel((s) => (s - 1 + matches.length) % matches.length)
                if (e.key === 'Enter' || e.key === 'Tab') return e.preventDefault(), pick(matches[sel])
                if (e.key === 'Escape') return setText(text + ' ')
              }
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                submit()
              }
            }}
            placeholder="質問や指示を入力…「/」でコマンド、Shift+Enterで改行"
            className="block w-full resize-none bg-transparent px-2 py-1 text-sm leading-6 outline-none placeholder:text-zinc-400"
          />
          <div className="mt-1 flex items-center gap-1">
            <button
              type="button"
              title="ファイルを添付"
              onClick={() => setFiles((fs) => (fs.length >= FILES.length ? fs : [...fs, FILES.find((f) => !fs.includes(f))!]))}
              className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100"
            >
              <Paperclip size={15} />
            </button>
            <button
              type="button"
              onClick={() => setWeb((v) => !v)}
              className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] transition ${web ? 'bg-sky-100 text-sky-700' : 'text-zinc-500 hover:bg-zinc-100'}`}
            >
              <Globe size={13} /> Web検索
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setModelOpen((o) => !o)}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-zinc-600 hover:bg-zinc-100"
              >
                <model.icon size={13} /> {model.name} <ChevronDown size={12} />
              </button>
              <AnimatePresence>
                {modelOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="absolute bottom-full left-0 z-20 mb-2 w-48 rounded-xl border border-zinc-200 bg-white p-1 shadow-xl"
                  >
                    {MODELS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => (setModel(m), setModelOpen(false))}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-zinc-100"
                      >
                        <m.icon size={14} className="text-zinc-500" />
                        <span className="flex-1">
                          <span className="font-medium">{m.name}</span>
                          <span className="block text-[10px] text-zinc-400">{m.note}</span>
                        </span>
                        {m.id === model.id && <Check size={13} />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <span className={`ml-auto text-[10px] tabular-nums ${text.length > MAX * 0.9 ? 'text-red-500' : 'text-zinc-400'}`}>
              {text.length}/{MAX} · 約{tokens} tokens
            </span>
            <motion.button
              type="button"
              onClick={submit}
              disabled={!busy && !text.trim()}
              layout
              title={busy ? '停止' : '送信'}
              className={`grid h-8 place-items-center rounded-full text-white transition-colors disabled:bg-zinc-200 disabled:text-zinc-400 ${
                busy ? 'w-8 bg-zinc-900' : 'w-8 bg-violet-600'
              }`}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={busy ? 'stop' : 'send'} initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: 90 }}>
                  {busy ? <Square size={11} fill="currentColor" /> : <ArrowUp size={16} />}
                </motion.span>
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  )
}
