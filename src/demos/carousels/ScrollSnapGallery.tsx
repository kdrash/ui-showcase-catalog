import { useRef, useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'

const ARTICLES = [
  { tag: 'Architecture', title: '光を設計する家', author: '山本 葵', read: '6 min', bg: 'linear-gradient(160deg,#d6d3d1,#78716c)', mark: '◐' },
  { tag: 'Food', title: '発酵と、時間の味', author: '佐藤 湊', read: '4 min', bg: 'linear-gradient(160deg,#fed7aa,#c2410c)', mark: '◒' },
  { tag: 'Travel', title: '北の果ての灯台へ', author: '中村 凛', read: '9 min', bg: 'linear-gradient(160deg,#bae6fd,#0c4a6e)', mark: '◓' },
  { tag: 'Design', title: '余白は語る', author: '小林 蓮', read: '5 min', bg: 'linear-gradient(160deg,#e9d5ff,#581c87)', mark: '◑' },
  { tag: 'Music', title: 'レコード針の哲学', author: '加藤 陽', read: '7 min', bg: 'linear-gradient(160deg,#fecaca,#7f1d1d)', mark: '●' },
  { tag: 'Craft', title: '手のひらの陶芸', author: '伊藤 結', read: '3 min', bg: 'linear-gradient(160deg,#d9f99d,#3f6212)', mark: '○' },
]

/**
 * ライブラリなしの CSS Scroll Snap カルーセル。
 * scroll-snap-type: x mandatory + scroll-snap-align: start。進捗バーと矢印だけ少量の JS。
 */
export function ScrollSnapGallery() {
  const ref = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)

  const onScroll = () => {
    const el = ref.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setProgress(max > 0 ? el.scrollLeft / max : 0)
  }

  const scrollByCard = (dir: 1 | -1) => {
    const el = ref.current
    const card = el?.querySelector<HTMLElement>('[data-card]')
    if (!el || !card) return
    el.scrollBy({ left: dir * (card.offsetWidth + 16), behavior: 'smooth' })
  }

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#f4efe6] py-4 text-stone-900">
      <div className="mb-3 flex items-end justify-between px-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-stone-500">Issue No.24 — Autumn</p>
          <h3 className="text-2xl italic leading-none" style={{ fontFamily: 'Playfair Display' }}>
            The Slow Journal
          </h3>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => scrollByCard(-1)}
            className="grid h-8 w-8 place-items-center border border-stone-900 transition hover:bg-stone-900 hover:text-[#f4efe6]"
            aria-label="前へ"
          >
            <ArrowLeft size={14} />
          </button>
          <button
            onClick={() => scrollByCard(1)}
            className="grid h-8 w-8 place-items-center border border-stone-900 transition hover:bg-stone-900 hover:text-[#f4efe6]"
            aria-label="次へ"
          >
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      <div
        ref={ref}
        onScroll={onScroll}
        className="flex min-h-0 flex-1 snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {ARTICLES.map((a) => (
          <article
            key={a.title}
            data-card
            className="group flex w-[62%] shrink-0 snap-start flex-col sm:w-[40%]"
          >
            <div
              className="relative min-h-0 flex-1 overflow-hidden"
              style={{ background: a.bg }}
            >
              <span className="absolute right-3 top-2 text-5xl text-white/70 transition-transform duration-500 group-hover:rotate-180">
                {a.mark}
              </span>
              <span className="absolute bottom-2 left-3 bg-[#f4efe6] px-1.5 py-0.5 text-[10px] uppercase tracking-widest">
                {a.tag}
              </span>
            </div>
            <h4 className="mt-2 text-lg leading-tight" style={{ fontFamily: 'Playfair Display' }}>
              {a.title}
            </h4>
            <p className="text-[11px] text-stone-500">
              {a.author} · {a.read}
            </p>
          </article>
        ))}
      </div>

      <div className="mx-5 mt-3 h-px bg-stone-300">
        <div className="h-px bg-stone-900 transition-[width] duration-150" style={{ width: `${Math.max(progress, 0.06) * 100}%` }} />
      </div>
    </div>
  )
}
