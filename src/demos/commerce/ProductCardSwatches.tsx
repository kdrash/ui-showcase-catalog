import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Heart, Plus, Star } from 'lucide-react'

type Swatch = { name: string; main: string; sub: string }
type Product = {
  name: string
  brand: string
  price: number
  sale?: number
  sizes: string[]
  swatches: Swatch[]
  draw: (s: Swatch) => ReactNode
}

const Sneaker = (s: Swatch) => (
  <svg viewBox="0 0 220 140" className="h-full w-full drop-shadow-[0_14px_14px_rgba(0,0,0,.18)]">
    <path d="M18 104 L22 82 Q28 60 52 58 L86 54 Q100 38 118 40 L140 46 Q160 70 196 80 Q210 86 206 104 Z" fill={s.main} />
    <path d="M86 54 Q100 38 118 40 L140 46 Q132 58 110 62 Q96 64 86 54Z" fill={s.sub} opacity=".9" />
    <path d="M60 84 Q110 66 160 84" stroke={s.sub} strokeWidth="7" fill="none" strokeLinecap="round" />
    {[0, 1, 2, 3].map((i) => (
      <line key={i} x1={96 + i * 9} y1={50 + i * 2} x2={104 + i * 9} y2={62 + i * 2} stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
    ))}
    <path d="M14 104 L208 104 Q210 118 196 120 L26 120 Q12 118 14 104Z" fill="#f8fafc" stroke="#e2e8f0" />
    <path d="M18 112 L204 112" stroke="#cbd5e1" strokeDasharray="4 5" />
  </svg>
)
const Tote = (s: Swatch) => (
  <svg viewBox="0 0 220 140" className="h-full w-full drop-shadow-[0_14px_14px_rgba(0,0,0,.18)]">
    <path d="M80 50 Q80 14 110 14 Q140 14 140 50" fill="none" stroke={s.sub} strokeWidth="7" strokeLinecap="round" />
    <path d="M58 46 L162 46 L172 128 L48 128 Z" fill={s.main} />
    <path d="M58 46 L162 46 L163 58 L57 58 Z" fill={s.sub} />
    <rect x="94" y="80" width="32" height="22" rx="3" fill="none" stroke={s.sub} strokeWidth="2" />
    <text x="110" y="95" textAnchor="middle" fontSize="9" fontWeight="700" fill={s.sub} fontFamily="Inter">TSUMU</text>
  </svg>
)
const Bottle = (s: Swatch) => (
  <svg viewBox="0 0 220 140" className="h-full w-full drop-shadow-[0_14px_14px_rgba(0,0,0,.18)]">
    <rect x="94" y="8" width="32" height="18" rx="5" fill={s.sub} />
    <rect x="98" y="24" width="24" height="10" fill="#cbd5e1" />
    <rect x="84" y="32" width="52" height="102" rx="16" fill={s.main} />
    <rect x="92" y="44" width="6" height="74" rx="3" fill="#fff" opacity=".35" />
    <rect x="84" y="78" width="52" height="16" fill={s.sub} opacity=".55" />
  </svg>
)

const PRODUCTS: Product[] = [
  {
    name: 'Kumo Runner 2',
    brand: 'ASHIOTO',
    price: 16500,
    sale: 13200,
    sizes: ['24', '25', '26', '27', '28'],
    swatches: [
      { name: 'セージ', main: '#86a789', sub: '#3f5f45' },
      { name: 'コーラル', main: '#f08a7e', sub: '#9b3b31' },
      { name: 'ミッドナイト', main: '#334155', sub: '#94a3b8' },
      { name: 'クリーム', main: '#efe6d2', sub: '#b8996a' },
    ],
    draw: Sneaker,
  },
  {
    name: 'Daily Tote',
    brand: 'TSUMU',
    price: 8800,
    sizes: ['S', 'M', 'L'],
    swatches: [
      { name: 'キナリ', main: '#e9dfc9', sub: '#8a6d3b' },
      { name: 'インディゴ', main: '#3b4f8f', sub: '#1e2a52' },
      { name: 'テラコッタ', main: '#c66b3d', sub: '#6e3418' },
    ],
    draw: Tote,
  },
  {
    name: 'Mizu Bottle',
    brand: 'SHIZUKU',
    price: 4400,
    sale: 3520,
    sizes: ['500ml', '750ml'],
    swatches: [
      { name: 'グレイシャー', main: '#a5d8e6', sub: '#2c6e80' },
      { name: 'マット黒', main: '#27272a', sub: '#71717a' },
      { name: 'ミモザ', main: '#f6d55c', sub: '#a67c00' },
      { name: 'ローズ', main: '#f4b6c2', sub: '#b04c64' },
    ],
    draw: Bottle,
  },
]

const yen = (n: number) => `¥${n.toLocaleString('ja-JP')}`

function Card({ p }: { p: Product }) {
  const [sw, setSw] = useState(0)
  const [size, setSize] = useState<string | null>(null)
  const [liked, setLiked] = useState(false)
  const [added, setAdded] = useState(false)
  const s = p.swatches[sw]
  const add = () => {
    if (!size) return
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:shadow-xl">
      <div className="relative aspect-[4/3] overflow-hidden" style={{ background: `linear-gradient(160deg, ${s.main}22, ${s.main}55)` }}>
        {p.sale && (
          <span className="absolute top-3 left-3 z-10 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
            -{Math.round((1 - p.sale / p.price) * 100)}%
          </span>
        )}
        <motion.button
          whileTap={{ scale: 0.8 }}
          onClick={() => setLiked((v) => !v)}
          aria-label="お気に入り"
          className="absolute top-2.5 right-2.5 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/90 shadow"
        >
          <motion.span key={String(liked)} initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 12 }}>
            <Heart size={15} className={liked ? 'fill-rose-500 text-rose-500' : 'text-stone-500'} />
          </motion.span>
        </motion.button>
        <AnimatePresence mode="popLayout">
          <motion.div
            key={sw}
            initial={{ opacity: 0, x: 30, rotate: -4 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="absolute inset-3 transition-transform duration-500 group-hover:scale-105"
          >
            {p.draw(s)}
          </motion.div>
        </AnimatePresence>
        {/* ホバーで出るクイック追加 */}
        <div className="absolute inset-x-3 bottom-3 translate-y-[140%] transition duration-300 group-hover:translate-y-0">
          <button
            onClick={add}
            className={`flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold backdrop-blur transition ${
              added ? 'bg-emerald-500 text-white' : size ? 'bg-stone-900/90 text-white hover:bg-stone-900' : 'bg-white/90 text-stone-500'
            }`}
          >
            {added ? <Check size={14} /> : <Plus size={14} />}
            {added ? 'カートに追加しました' : size ? `サイズ ${size} をカートへ` : 'サイズを選択してください'}
          </button>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <div className="flex items-center justify-between text-[10px] tracking-widest text-stone-400">
          {p.brand}
          <span className="flex items-center gap-0.5 tracking-normal text-stone-500">
            <Star size={11} className="fill-amber-400 text-amber-400" /> 4.8
          </span>
        </div>
        <div className="text-sm font-semibold text-stone-900">{p.name}</div>
        <div className="flex items-baseline gap-2 text-sm">
          <span className={p.sale ? 'font-bold text-rose-600' : 'font-bold text-stone-900'}>{yen(p.sale ?? p.price)}</span>
          {p.sale && <span className="text-xs text-stone-400 line-through">{yen(p.price)}</span>}
        </div>
        <div className="flex items-center gap-1.5">
          {p.swatches.map((c, i) => (
            <button
              key={c.name}
              title={c.name}
              onClick={() => setSw(i)}
              className={`h-5 w-5 rounded-full ring-offset-2 transition ${i === sw ? 'ring-2 ring-stone-900' : 'ring-1 ring-stone-200 hover:scale-110'}`}
              style={{ background: `linear-gradient(135deg, ${c.main} 50%, ${c.sub} 50%)` }}
            />
          ))}
          <span className="ml-1 text-[11px] text-stone-500">{s.name}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {p.sizes.map((z) => (
            <button
              key={z}
              onClick={() => setSize(z)}
              className={`min-w-8 rounded-md border px-1.5 py-1 text-[11px] transition ${
                size === z ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 text-stone-600 hover:border-stone-400'
              }`}
            >
              {z}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ProductCardSwatches() {
  return (
    <div className="@container relative h-full w-full overflow-y-auto bg-[#f7f5f0] p-4 font-['Noto_Sans_JP',Inter,sans-serif]">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-bold text-stone-800">新着アイテム</h3>
        <span className="text-[11px] text-stone-500">色を選ぶと商品画像が切り替わります</span>
      </div>
      <div className="grid grid-cols-2 gap-3 @2xl:grid-cols-3">
        {PRODUCTS.map((p) => (
          <Card key={p.name} p={p} />
        ))}
      </div>
    </div>
  )
}
