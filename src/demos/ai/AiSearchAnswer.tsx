import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowRight, Layers, Plus, Sparkles } from 'lucide-react'

type Source = { domain: string; title: string; color: string }
type QA = { q: string; sources: Source[]; answer: string; related: string[] }

const DATA: QA[] = [
  {
    q: 'リモートワークで生産性を上げるには？',
    sources: [
      { domain: 'worklab.jp', title: '在宅勤務の生産性調査 2026', color: '#6366f1' },
      { domain: 'hbr-japan.com', title: '集中時間を守るチームの習慣', color: '#ef4444' },
      { domain: 'note.com', title: '1年間フルリモートで学んだこと', color: '#10b981' },
      { domain: 'mhlw.go.jp', title: 'テレワークガイドライン', color: '#0ea5e9' },
    ],
    answer:
      'リモートワークの生産性は「集中時間の確保」と「非同期コミュニケーション」で大きく変わります[1]。\n\nまず、午前中に2時間ほど通知を切った集中ブロックを設けるチームは、そうでないチームより成果物の完了率が約20%高いという調査があります[2]。また、会議を減らしてドキュメントで意思決定する文化が、時差や生活リズムの違いを吸収します[3]。\n\n環境面では、作業場所と休憩場所を分けることや、始業・終業の儀式を決めることが推奨されています[4][3]。',
    related: ['非同期コミュニケーションのコツは？', '在宅勤務の運動不足を解消するには？', 'オンライン会議を短くする方法'],
  },
  {
    q: '非同期コミュニケーションのコツは？',
    sources: [
      { domain: 'gitlab.com', title: 'Async-first ハンドブック', color: '#f97316' },
      { domain: 'zenn.dev', title: '「返事は明日でいい」文化の作り方', color: '#3b82f6' },
      { domain: 'worklab.jp', title: 'チャット疲れの実態', color: '#6366f1' },
    ],
    answer:
      '非同期コミュニケーションのコツは「1通で完結させる」ことです[1]。背景・期限・期待する返答を最初のメッセージにまとめると、往復回数が減ります[2]。\n\nまた、すぐの返信を期待しないルールを明文化すると、チャット疲れが減り集中時間が増えることが報告されています[3]。',
    related: ['リモートワークで生産性を上げるには？', 'ドキュメント文化の始め方', 'Slackの通知設定のおすすめ'],
  },
]

type Tok = { t: 'text'; v: string } | { t: 'cite'; n: number }
const tokenize = (s: string): Tok[] =>
  s.split(/(\[\d+\])/).filter(Boolean).flatMap((p): Tok[] => {
    const m = /^\[(\d+)\]$/.exec(p)
    return m ? [{ t: 'cite', n: +m[1] }] : [...p].map((c) => ({ t: 'text', v: c }))
  })

export function AiSearchAnswer() {
  const [idx, setIdx] = useState(0)
  const [shown, setShown] = useState(0)
  const [hover, setHover] = useState<number | null>(null)
  const qa = DATA[idx]
  const toks = useMemo(() => tokenize(qa.answer), [qa])
  const done = shown >= toks.length

  useEffect(() => {
    setShown(0)
    let i = 0
    let id = 0
    const start = window.setTimeout(function tick() {
      i += 3
      setShown(i)
      if (i < toks.length) id = window.setTimeout(tick, 28)
    }, 900)
    return () => (clearTimeout(start), clearTimeout(id))
  }, [toks])

  // 表示済みトークンを段落に分けて描画
  const paras: Tok[][] = [[]]
  toks.slice(0, shown).forEach((tk) => {
    if (tk.t === 'text' && tk.v === '\n') {
      if (paras[paras.length - 1].length) paras.push([])
    } else paras[paras.length - 1].push(tk)
  })

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#fbfaf7] text-zinc-900">
      <div className="thin-scroll h-full overflow-y-auto px-5 py-4">
        <motion.h2 key={qa.q} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-lg font-semibold tracking-tight">
          {qa.q}
        </motion.h2>

        <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500">
          <Layers size={13} /> 情報源
        </div>
        <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {qa.sources.map((s, i) => (
            <motion.a
              key={qa.q + s.domain}
              href="#"
              onClick={(e) => e.preventDefault()}
              onMouseEnter={() => setHover(i + 1)}
              onMouseLeave={() => setHover(null)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, scale: hover === i + 1 ? 1.03 : 1 }}
              transition={{ delay: hover === null ? i * 0.08 : 0 }}
              className={`rounded-xl border bg-white p-2.5 text-[11px] shadow-sm transition-colors ${
                hover === i + 1 ? 'border-teal-500 ring-2 ring-teal-500/20' : 'border-zinc-200'
              }`}
            >
              <div className="line-clamp-2 leading-snug font-medium text-zinc-800">{s.title}</div>
              <div className="mt-1.5 flex items-center gap-1.5 text-zinc-500">
                <span className="grid h-3.5 w-3.5 place-items-center rounded-full text-[8px] font-bold text-white" style={{ background: s.color }}>
                  {s.domain[0].toUpperCase()}
                </span>
                <span className="truncate">{s.domain}</span>
                <span className="ml-auto text-zinc-400">{i + 1}</span>
              </div>
            </motion.a>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500">
          <Sparkles size={13} className={done ? '' : 'animate-pulse text-teal-600'} /> 回答
        </div>
        <div className="mt-1 text-[13.5px] leading-[1.85] text-zinc-800">
          {shown === 0 && (
            <div className="mt-2 space-y-2">
              {[92, 100, 70].map((w, i) => (
                <div key={i} className="h-3 animate-pulse rounded bg-zinc-200" style={{ width: `${w}%` }} />
              ))}
            </div>
          )}
          {paras.map((p, pi) => (
            <p key={pi} className="mb-2">
              {p.map((tk, i) =>
                tk.t === 'text' ? (
                  tk.v
                ) : (
                  <motion.button
                    key={i}
                    type="button"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    onMouseEnter={() => setHover(tk.n)}
                    onMouseLeave={() => setHover(null)}
                    className={`mx-0.5 inline-grid h-4 min-w-4 -translate-y-0.5 place-items-center rounded-full px-1 align-middle text-[9.5px] font-semibold transition-colors ${
                      hover === tk.n ? 'bg-teal-600 text-white' : 'bg-zinc-200 text-zinc-600'
                    }`}
                  >
                    {tk.n}
                  </motion.button>
                ),
              )}
              {pi === paras.length - 1 && !done && shown > 0 && <span className="ml-0.5 inline-block h-3.5 w-1 animate-pulse bg-teal-600 align-middle" />}
            </p>
          ))}
        </div>

        {done && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 border-t border-zinc-200 pt-3">
            <div className="mb-1 text-[11px] font-semibold text-zinc-500">関連する質問</div>
            {qa.related.map((r) => {
              const target = DATA.findIndex((d) => d.q === r)
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => target >= 0 && setIdx(target)}
                  className="group flex w-full items-center justify-between border-b border-zinc-100 py-2 text-left text-[13px] text-zinc-700 hover:text-teal-700"
                >
                  {r}
                  {target >= 0 ? <ArrowRight size={14} className="text-zinc-400 group-hover:text-teal-600" /> : <Plus size={14} className="text-zinc-300" />}
                </button>
              )
            })}
          </motion.div>
        )}
      </div>
    </div>
  )
}
