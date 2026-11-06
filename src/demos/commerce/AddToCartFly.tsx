import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Minus, Plus, ShoppingBag, X } from 'lucide-react'
import { art } from '../_shared/art'

const ITEMS = [
  { id: 1, name: '陶器のマグ', price: 2800, img: art('gradient', 1, 400, 400) },
  { id: 2, name: 'リネンのクロス', price: 1900, img: art('geometric', 2, 400, 400) },
  { id: 3, name: '真鍮のスプーン', price: 1500, img: art('landscape', 3, 400, 400) },
  { id: 4, name: '木のトレイ', price: 4200, img: art('gradient', 6, 400, 400) },
]
type Flyer = { key: number; img: string; x: number; y: number; dx: number; dy: number; size: number }

export function AddToCartFly() {
  const rootRef = useRef<HTMLDivElement>(null)
  const cartRef = useRef<HTMLButtonElement>(null)
  const [cart, setCart] = useState<Record<number, number>>({})
  const [flyers, setFlyers] = useState<Flyer[]>([])
  const [bump, setBump] = useState(0)
  const [open, setOpen] = useState(false)
  const count = Object.values(cart).reduce((a, b) => a + b, 0)
  const total = ITEMS.reduce((s, it) => s + (cart[it.id] ?? 0) * it.price, 0)

  /** 商品画像の位置からカートアイコンの位置まで、放物線で飛ばす */
  const add = (id: number, imgEl: HTMLElement) => {
    const root = rootRef.current!.getBoundingClientRect()
    const a = imgEl.getBoundingClientRect()
    const b = cartRef.current!.getBoundingClientRect()
    const size = Math.min(a.width, 90)
    const x = a.left - root.left + a.width / 2 - size / 2
    const y = a.top - root.top + a.height / 2 - size / 2
    const dx = b.left - root.left + b.width / 2 - size / 2 - x
    const dy = b.top - root.top + b.height / 2 - size / 2 - y
    const it = ITEMS.find((i) => i.id === id)!
    setFlyers((f) => [...f, { key: Date.now() + Math.random(), img: it.img, x, y, dx, dy, size }])
    setTimeout(() => {
      setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }))
      setBump((n) => n + 1)
    }, 700)
  }
  const setQty = (id: number, q: number) =>
    setCart((c) => {
      const n = { ...c }
      if (q <= 0) delete n[id]
      else n[id] = q
      return n
    })

  return (
    <div ref={rootRef} className="@container relative h-full w-full overflow-hidden bg-white font-['Noto_Sans_JP',Inter,sans-serif] text-stone-800">
      <header className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
        <span className="font-[Playfair_Display] text-lg font-bold italic">kurashi.</span>
        <button ref={cartRef} onClick={() => setOpen(true)} className="relative rounded-full p-2 hover:bg-stone-100" aria-label="カート">
          <motion.span key={bump} animate={bump ? { rotate: [0, -14, 10, -6, 0], scale: [1, 1.15, 1] } : {}} transition={{ duration: 0.5 }} className="block">
            <ShoppingBag size={20} />
          </motion.span>
          <AnimatePresence>
            {count > 0 && (
              <motion.span
                key={bump}
                initial={{ scale: 0.4 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 600, damping: 14 }}
                className="absolute -top-0.5 -right-0.5 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white"
              >
                {count}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </header>

      <div className="grid h-[calc(100%-57px)] grid-cols-2 gap-3 overflow-y-auto p-4 @2xl:grid-cols-4">
        {ITEMS.map((it) => (
          <div key={it.id} className="flex flex-col gap-2">
            <img data-img src={it.img} alt="" className="aspect-square w-full rounded-xl object-cover" />
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{it.name}</span>
              <span className="text-stone-500">¥{it.price.toLocaleString()}</span>
            </div>
            <button
              onClick={(e) => add(it.id, e.currentTarget.parentElement!.querySelector('[data-img]') as HTMLElement)}
              className="rounded-lg bg-stone-900 py-2 text-xs font-semibold text-white transition hover:bg-orange-500 active:scale-95"
            >
              カートに入れる
            </button>
          </div>
        ))}
      </div>

      {/* 飛んでいくサムネイル: x は等速、y は上に膨らむ放物線 */}
      {flyers.map((f) => (
        <motion.img
          key={f.key}
          src={f.img}
          className="pointer-events-none absolute z-30 rounded-xl object-cover shadow-xl"
          style={{ left: f.x, top: f.y, width: f.size, height: f.size }}
          initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
          animate={{ x: [0, f.dx * 0.4, f.dx], y: [0, Math.max(8 - f.y, Math.min(f.dy, 0) - 60), f.dy], scale: [1, 0.7, 0.15], opacity: [1, 1, 0.6] }}
          transition={{ duration: 0.75, ease: 'easeInOut', times: [0, 0.45, 1] }}
          onAnimationComplete={() => setFlyers((fs) => fs.filter((x) => x.key !== f.key))}
        />
      ))}

      {/* デモ内のスライドオーバー・ミニカート */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="absolute inset-0 z-40 bg-stone-900/30 backdrop-blur-[2px]"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="absolute top-0 right-0 bottom-0 z-50 flex w-[min(320px,85%)] flex-col bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-stone-100 p-4">
                <span className="font-semibold">カート ({count})</span>
                <button onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-stone-100" aria-label="閉じる">
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {count === 0 && <p className="pt-10 text-center text-xs text-stone-400">カートは空です</p>}
                {ITEMS.filter((it) => cart[it.id]).map((it) => (
                  <motion.div layout key={it.id} className="flex items-center gap-3">
                    <img src={it.img} alt="" className="h-12 w-12 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium">{it.name}</div>
                      <div className="text-[11px] text-stone-500">¥{(it.price * cart[it.id]).toLocaleString()}</div>
                    </div>
                    <div className="flex items-center rounded-full border border-stone-200">
                      <button onClick={() => setQty(it.id, cart[it.id] - 1)} className="p-1.5" aria-label="減らす">
                        <Minus size={11} />
                      </button>
                      <span className="w-5 text-center text-xs tabular-nums">{cart[it.id]}</span>
                      <button onClick={() => setQty(it.id, cart[it.id] + 1)} className="p-1.5" aria-label="増やす">
                        <Plus size={11} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="border-t border-stone-100 p-4">
                <div className="mb-3 flex justify-between text-sm">
                  <span>小計</span>
                  <span className="font-bold">¥{total.toLocaleString()}</span>
                </div>
                <button className="w-full rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white hover:bg-orange-600">レジに進む</button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
