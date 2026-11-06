import { ShoppingBag, Star } from 'lucide-react'

const PRODUCTS = [
  {
    name: 'Cloud Runner',
    cat: 'Sneakers',
    price: '¥18,700',
    emoji: '👟',
    bg: 'linear-gradient(160deg,#c7d2fe,#6366f1)',
    desc: '雲のように軽いクッションで、毎日のランを快適に。',
    colors: ['#6366f1', '#f43f5e', '#111827'],
  },
  {
    name: 'Pulse Pro',
    cat: 'Headphones',
    price: '¥32,000',
    emoji: '🎧',
    bg: 'linear-gradient(160deg,#fecdd3,#e11d48)',
    desc: 'アクティブノイキャン搭載。最大40時間再生。',
    colors: ['#e11d48', '#f5f5f4', '#1c1917'],
  },
  {
    name: 'Snap One',
    cat: 'Camera',
    price: '¥54,800',
    emoji: '📷',
    bg: 'linear-gradient(160deg,#bbf7d0,#059669)',
    desc: 'ポケットに入るフルサイズ。旅の記録にどうぞ。',
    colors: ['#059669', '#78716c'],
  },
  {
    name: 'Tide Watch',
    cat: 'Watch',
    price: '¥27,500',
    emoji: '⌚',
    bg: 'linear-gradient(160deg,#fde68a,#d97706)',
    desc: '200m 防水。サーフィンにも使えるタフな一本。',
    colors: ['#d97706', '#0ea5e9', '#fafafa'],
  },
]

/**
 * Tailwind の group / group-hover だけで作るホバーリビールカード(JS なし)。
 * 情報パネルを translate-y で下に隠しておき、ホバーで 0 に戻して説明とボタンを出す。
 */
export function HoverRevealCards() {
  return (
    <div className="relative grid h-full w-full grid-cols-4 items-center gap-3 overflow-hidden bg-zinc-100 p-5">
      {PRODUCTS.map((p) => (
        <div
          key={p.name}
          className="group relative h-[240px] cursor-pointer overflow-hidden rounded-2xl shadow-sm transition-shadow duration-500 hover:shadow-xl"
          style={{ background: p.bg }}
        >
          <span className="absolute left-3 top-3 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-zinc-700 backdrop-blur">
            {p.cat}
          </span>
          <div className="absolute inset-x-0 top-6 grid place-items-center text-[72px] drop-shadow-xl transition-transform duration-500 ease-out group-hover:-translate-y-4 group-hover:-rotate-12 group-hover:scale-90">
            {p.emoji}
          </div>

          <div className="absolute inset-x-0 bottom-0 translate-y-[calc(100%-58px)] bg-white/95 p-3 backdrop-blur transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)] group-hover:translate-y-0">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-bold text-zinc-900">{p.name}</div>
                <div className="text-xs font-semibold text-zinc-500">{p.price}</div>
              </div>
              <span className="flex items-center gap-0.5 text-[10px] text-amber-500">
                <Star size={10} fill="currentColor" /> 4.8
              </span>
            </div>
            <p className="mt-2 text-[11px] leading-snug text-zinc-500 opacity-0 transition-opacity delay-100 duration-300 group-hover:opacity-100">
              {p.desc}
            </p>
            <div className="mt-2 flex gap-1">
              {p.colors.map((c) => (
                <span key={c} className="h-3 w-3 rounded-full ring-1 ring-black/10" style={{ background: c }} />
              ))}
            </div>
            <button className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-zinc-900 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700">
              <ShoppingBag size={12} /> カートに追加
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
