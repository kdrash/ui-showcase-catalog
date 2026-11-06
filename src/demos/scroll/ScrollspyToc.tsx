import { useEffect, useRef, useState } from 'react'

/**
 * ドキュメント/ブログ記事でよく見る「スクロールスパイ付き目次」。
 *  - IntersectionObserver(root = 記事のスクロール要素)で今読んでいる見出しを検出し、目次をハイライト
 *  - スクロール率を SVG の円(stroke-dashoffset)で読了リングとして表示
 *  - 目次クリックで scrollTo({ behavior: 'smooth' }) でジャンプ
 */

const SECTIONS = [
  { id: 'intro', title: 'はじめに', body: 'スクロールスパイは、長い記事の中で「いまどこを読んでいるか」を示すナビゲーションです。目次が現在地に追従することで、全体の構造を見失わずに読み進められます。' },
  { id: 'observer', title: 'IntersectionObserver', body: '各見出しのセクションを監視し、ビューポートの上部40%に入ったものをアクティブにします。rootMargin を "0px 0px -60% 0px" にするのがコツです。scroll イベントで毎回 getBoundingClientRect を呼ぶより軽量です。' },
  { id: 'progress', title: '読了リング', body: 'scrollTop / (scrollHeight - clientHeight) を 0〜1 の進捗にし、円周 × (1 - 進捗) を stroke-dashoffset に設定します。残り時間の目安も一緒に出すと親切です。' },
  { id: 'jump', title: 'スムーズジャンプ', body: '目次をクリックしたら element.offsetTop を使って scrollTo({ top, behavior: "smooth" }) で移動。CSS の scroll-margin-top で固定ヘッダー分の余白を確保しましょう。' },
  { id: 'a11y', title: 'アクセシビリティ', body: 'アクティブな目次リンクには aria-current="true" を付け、キーボードでもフォーカスできるよう button か a 要素を使います。prefers-reduced-motion ではスムーズスクロールを切りましょう。' },
  { id: 'outro', title: 'まとめ', body: '目次・進捗・ジャンプの3点セットで、長文ページの読みやすさは大きく変わります。ドキュメントサイトやテックブログにぜひ。' },
]
const R = 16
const C = 2 * Math.PI * R

export function ScrollspyToc() {
  const scroller = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(SECTIONS[0].id)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const root = scroller.current!
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (hit) setActive(hit.target.id.replace(/^spy-/, ''))
      },
      { root, rootMargin: '0px 0px -60% 0px' },
    )
    root.querySelectorAll('section').forEach((s) => io.observe(s))
    const onScroll = () => {
      const max = root.scrollHeight - root.clientHeight
      setProgress(max > 0 ? root.scrollTop / max : 0)
      if (root.scrollTop >= max - 2) setActive(SECTIONS[SECTIONS.length - 1].id)
    }
    root.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      io.disconnect()
      root.removeEventListener('scroll', onScroll)
    }
  }, [])

  const jump = (id: string) => {
    const root = scroller.current!
    const el = root.querySelector<HTMLElement>(`#spy-${id}`)
    if (el) root.scrollTo({ top: el.offsetTop - 12, behavior: 'smooth' })
  }
  const minutesLeft = Math.max(0, Math.ceil((1 - progress) * 4))

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-white text-zinc-800">
      <aside className="hidden w-[170px] shrink-0 flex-col border-r border-zinc-100 bg-zinc-50/70 p-4 min-[420px]:flex">
        <div className="mb-4 flex items-center gap-2.5">
          <svg width="40" height="40" viewBox="0 0 40 40" className="-rotate-90">
            <circle cx="20" cy="20" r={R} fill="none" stroke="#e4e4e7" strokeWidth="3.5" />
            <circle
              cx="20"
              cy="20"
              r={R}
              fill="none"
              stroke="#4f46e5"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - progress)}
              style={{ transition: 'stroke-dashoffset .15s linear' }}
            />
          </svg>
          <div className="leading-tight">
            <div className="text-sm font-bold tabular-nums">{Math.round(progress * 100)}%</div>
            <div className="text-[10px] text-zinc-500">残り約 {minutesLeft} 分</div>
          </div>
        </div>
        <p className="mb-2 text-[10px] font-semibold tracking-widest text-zinc-400">ON THIS PAGE</p>
        <nav className="relative flex flex-col border-l border-zinc-200">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-current={active === s.id}
              onClick={() => jump(s.id)}
              className={`-ml-px border-l-2 py-1.5 pl-3 text-left text-[12px] transition ${
                active === s.id ? 'border-indigo-600 font-semibold text-indigo-600' : 'border-transparent text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {s.title}
            </button>
          ))}
        </nav>
      </aside>
      <div ref={scroller} className="thin-scroll relative flex-1 overflow-y-auto scroll-smooth px-6 py-5">
        <p className="text-[11px] font-semibold text-indigo-600">GUIDE · 4 min read</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">スクロールスパイ目次の作り方</h2>
        <p className="mt-1 text-xs text-zinc-400">↓ スクロールすると左の目次が追従します</p>
        {SECTIONS.map((s, i) => (
          <section key={s.id} id={`spy-${s.id}`} className="pt-6">
            <h3 className="text-lg font-bold text-zinc-900">
              <span className="mr-2 font-mono text-sm text-indigo-400">{String(i + 1).padStart(2, '0')}</span>
              {s.title}
            </h3>
            <p className="mt-2 text-[13px] leading-7 text-zinc-600">{s.body}</p>
            <div className="mt-3 h-20 rounded-xl bg-gradient-to-br from-indigo-50 to-sky-50 ring-1 ring-indigo-100" />
          </section>
        ))}
        <div className="h-32" />
      </div>
    </div>
  )
}
