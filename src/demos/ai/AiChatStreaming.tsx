import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowDown, ArrowUp, Check, Copy, RotateCcw, Sparkles, Square } from 'lucide-react'

/** 実際のプロジェクトでは Vercel AI SDK の useChat などのストリームに置き換える(ここではローカルで疑似ストリーミング) */
const ANSWERS: { q: string; icon: string; a: string }[] = [
  {
    q: 'React でデバウンス付きの検索ボックスを作るには？',
    icon: '⚛️',
    a: `入力のたびに API を叩かないよう、**値の確定を遅らせる** のがポイントです。

\`\`\`tsx
function useDebounce<T>(value: T, ms = 300) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return v
}

const q = useDebounce(query)
useEffect(() => { if (q) search(q) }, [q])
\`\`\`

- \`setTimeout\` をクリーンアップで必ず解除する
- 300ms 前後が体感的にちょうど良い
- 古いリクエストは \`AbortController\` でキャンセルする`,
  },
  {
    q: '東京・大阪・福岡を比較する表を作って',
    icon: '🗾',
    a: `主要3都市をざっくり比較しました。

| 都市 | 人口(万人) | 平均家賃(1K) | 名物 |
| --- | ---: | ---: | --- |
| 東京 | 1,400 | 8.9万円 | もんじゃ焼き |
| 大阪 | 880 | 6.2万円 | たこ焼き |
| 福岡 | 510 | 5.4万円 | 豚骨ラーメン |

> 家賃は駅徒歩10分圏内の目安です。**生活コスト重視なら福岡**、仕事の選択肢なら東京が有利です。`,
  },
  {
    q: '週末の作業計画をチェックリストにして',
    icon: '🗓️',
    a: `無理のない週末プランです。

### 土曜日
- [x] 午前: 溜まったメールの整理(30分)
- [ ] 昼: デザインレビューの資料作成
- [ ] 夕方: ジムで軽く運動

### 日曜日
1. 来週のタスクを **3つだけ** 選ぶ
2. カレンダーに集中時間をブロック
3. 夜は早めに休む 🌙`,
  },
  {
    q: '2026年のUIデザインのトレンドは？',
    icon: '🎨',
    a: `注目のトレンドを3つ挙げます。

1. **Liquid Glass** — 背景を屈折させる厚いガラス表現。光の縁取りで奥行きを出す
2. **ベントーグリッド** — 大小のタイルで情報を整理するレイアウト
3. **AIネイティブUI** — ストリーミング表示や *思考過程* の可視化が標準に

どれも「**情報の階層をはっきりさせる**」ことが共通点です。`,
  },
]

const FALLBACK = (q: string) => `「${q}」について整理しますね。

- まず **目的** と **制約** を明確にする
- 小さく試して、結果を見てから広げる
- 迷ったら \`ユーザーにとっての価値\` に立ち返る

もう少し具体的な条件を教えてもらえれば、手順やコード例まで出せます。`

type Msg = { id: number; role: 'user' | 'assistant'; text: string; done: boolean; q?: string }

function CodeBlock({ children }: { children: ReactNode }) {
  const el = children as ReactElement<{ className?: string; children?: ReactNode }>
  const lang = /language-(\w+)/.exec(el?.props?.className ?? '')?.[1] ?? 'text'
  const code = String(el?.props?.children ?? '').replace(/\n$/, '')
  const [ok, setOk] = useState(false)
  return (
    <div className="my-3 overflow-hidden rounded-lg border border-white/10 bg-black/60">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5 font-mono text-[11px] text-zinc-400">
        <span>{lang}</span>
        <button
          type="button"
          className="inline-flex items-center gap-1 hover:text-white"
          onClick={() => {
            navigator.clipboard?.writeText(code).catch(() => {})
            setOk(true)
            setTimeout(() => setOk(false), 1200)
          }}
        >
          {ok ? <Check size={12} /> : <Copy size={12} />} {ok ? 'コピー済み' : 'コピー'}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-[12px] leading-relaxed text-emerald-200">
        <code>{code}</code>
      </pre>
    </div>
  )
}

const MD_CLASS =
  'text-[13.5px] leading-relaxed text-zinc-200 [&_a]:text-violet-300 [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-violet-400/60 [&_blockquote]:pl-3 [&_blockquote]:text-zinc-400 [&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:font-semibold [&_h3]:text-white [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_strong]:text-white [&_table]:my-3 [&_table]:w-full [&_table]:text-[12.5px] [&_td]:border-t [&_td]:border-white/10 [&_td]:px-2 [&_td]:py-1.5 [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:text-zinc-400 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_.contains-task-list]:list-none [&_.contains-task-list]:pl-1 [&_input]:mr-1.5 [&_input]:accent-violet-500 [&_:not(pre)>code]:rounded [&_:not(pre)>code]:bg-white/10 [&_:not(pre)>code]:px-1 [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-[12px] [&_:not(pre)>code]:text-violet-200'

export function AiChatStreaming() {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [atBottom, setAtBottom] = useState(true)
  const timer = useRef<number | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const stick = useRef(true)
  const nextId = useRef(1)

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), [])

  // 自動スクロール: 一番下にいるときだけ追従(上にスクロールしたら止める)
  useEffect(() => {
    const el = scroller.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [msgs])

  const stream = (assistantId: number, full: string) => {
    let i = 0
    setStreaming(true)
    const tick = () => {
      i = Math.min(full.length, i + 2 + Math.floor(Math.random() * 4))
      setMsgs((m) => m.map((x) => (x.id === assistantId ? { ...x, text: full.slice(0, i), done: i >= full.length } : x)))
      if (i < full.length) timer.current = window.setTimeout(tick, 22)
      else setStreaming(false)
    }
    timer.current = window.setTimeout(tick, 700) // 最初のトークンまでの「考え中」
  }

  const ask = (q: string) => {
    if (!q.trim() || streaming) return
    const full = ANSWERS.find((a) => a.q === q)?.a ?? FALLBACK(q.trim())
    const uid = nextId.current++
    const aid = nextId.current++
    stick.current = true
    setMsgs((m) => [...m, { id: uid, role: 'user', text: q.trim(), done: true }, { id: aid, role: 'assistant', text: '', done: false, q }])
    setInput('')
    stream(aid, full)
  }

  const stop = () => {
    if (timer.current) clearTimeout(timer.current)
    setStreaming(false)
    setMsgs((m) => m.map((x) => (x.done ? x : { ...x, done: true, text: x.text + (x.text ? ' …' : '(停止しました)') })))
  }

  const regenerate = (m: Msg) => {
    if (streaming || !m.q) return
    const full = ANSWERS.find((a) => a.q === m.q)?.a ?? FALLBACK(m.q)
    setMsgs((all) => all.map((x) => (x.id === m.id ? { ...x, text: '', done: false } : x)))
    stick.current = true
    stream(m.id, full)
  }

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#0b0b10] text-zinc-100">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl" />
      <header className="relative flex items-center gap-2 border-b border-white/5 px-4 py-2.5 text-sm">
        <span className="grid h-6 w-6 place-items-center rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-500">
          <Sparkles size={13} />
        </span>
        <span className="font-semibold">Assistant</span>
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-zinc-400">demo-model · streaming</span>
        {msgs.length > 0 && (
          <button type="button" onClick={() => (stop(), setMsgs([]))} className="ml-auto text-xs text-zinc-500 hover:text-zinc-200">
            新しいチャット
          </button>
        )}
      </header>

      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget
          const b = el.scrollHeight - el.scrollTop - el.clientHeight < 40
          stick.current = b
          setAtBottom(b)
        }}
        className="thin-scroll relative flex-1 overflow-y-auto px-4 py-4"
      >
        {msgs.length === 0 ? (
          <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center gap-4 text-center">
            <div>
              <div className="text-xl font-semibold">何をお手伝いしましょう？</div>
              <div className="mt-1 text-xs text-zinc-500">候補をクリックすると、回答がストリーミングで表示されます</div>
            </div>
            <div className="grid w-full grid-cols-2 gap-2">
              {ANSWERS.map((a) => (
                <button
                  key={a.q}
                  type="button"
                  onClick={() => ask(a.q)}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left text-[12.5px] text-zinc-300 transition hover:border-violet-400/40 hover:bg-violet-500/10"
                >
                  <span className="mr-1">{a.icon}</span>
                  {a.q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-4">
            {msgs.map((m) =>
              m.role === 'user' ? (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-violet-600 px-3.5 py-2 text-[13.5px]"
                >
                  {m.text}
                </motion.div>
              ) : (
                <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="group flex gap-3">
                  <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500">
                    <Sparkles size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    {m.text === '' && !m.done ? (
                      <div className="flex h-7 items-center gap-1">
                        {[0, 1, 2].map((i) => (
                          <motion.span
                            key={i}
                            className="h-1.5 w-1.5 rounded-full bg-zinc-400"
                            animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className={MD_CLASS}>
                        <Markdown remarkPlugins={[remarkGfm]} components={{ pre: ({ children }) => <CodeBlock>{children}</CodeBlock> }}>
                          {m.text}
                        </Markdown>
                        {!m.done && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-violet-300 align-middle" />}
                      </div>
                    )}
                    {m.done && m.text && (
                      <div className="mt-1 flex gap-1 text-zinc-500 opacity-70 transition group-hover:opacity-100">
                        <IconBtn label="コピー" onClick={() => navigator.clipboard?.writeText(m.text).catch(() => {})}>
                          <Copy size={13} />
                        </IconBtn>
                        <IconBtn label="再生成" onClick={() => regenerate(m)}>
                          <RotateCcw size={13} />
                        </IconBtn>
                      </div>
                    )}
                  </div>
                </motion.div>
              ),
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {!atBottom && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            onClick={() => {
              const el = scroller.current
              if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
            }}
            className="absolute bottom-20 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/10 bg-zinc-800/90 p-1.5 text-zinc-200 shadow-lg backdrop-blur"
          >
            <ArrowDown size={15} />
          </motion.button>
        )}
      </AnimatePresence>

      <form
        className="relative px-4 pb-3"
        onSubmit={(e) => {
          e.preventDefault()
          ask(input)
        }}
      >
        <div className="mx-auto flex max-w-2xl items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] py-1.5 pr-1.5 pl-4 focus-within:border-violet-400/50">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="メッセージを入力…"
            className="min-w-0 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-zinc-500"
          />
          {streaming ? (
            <button type="button" onClick={stop} title="停止" className="grid h-8 w-8 place-items-center rounded-xl bg-white text-zinc-900">
              <Square size={12} fill="currentColor" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              title="送信"
              className="grid h-8 w-8 place-items-center rounded-xl bg-violet-500 text-white transition disabled:bg-white/10 disabled:text-zinc-500"
            >
              <ArrowUp size={16} />
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  const [ok, setOk] = useState(false)
  return (
    <button
      type="button"
      title={label}
      onClick={() => {
        onClick()
        setOk(true)
        setTimeout(() => setOk(false), 1000)
      }}
      className="rounded-md p-1.5 hover:bg-white/10 hover:text-zinc-200"
    >
      {ok ? <Check size={13} /> : children}
    </button>
  )
}
