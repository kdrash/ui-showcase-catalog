import { useState } from 'react'
import { AnimatePresence, motion, type Transition } from 'motion/react'
import { ArrowUpRight } from 'lucide-react'

const spring: Transition = { type: 'spring', stiffness: 260, damping: 20 }
type Variant = 'cross' | 'arrow' | 'spin' | 'squeeze'

/** 3本線のアイコン。variant ごとに開いた状態の形が変わる */
function Burger({ open, variant, color = '#fafafa' }: { open: boolean; variant: Variant; color?: string }) {
  const line = 'absolute left-0 h-[2px] w-full rounded-full'
  const top =
    variant === 'arrow'
      ? { y: open ? 4 : -6, x: open ? -3 : 0, rotate: open ? -40 : 0, width: open ? '60%' : '100%' }
      : variant === 'squeeze'
        ? { y: open ? 0 : -6, rotate: 0 }
        : { y: open ? 0 : -6, rotate: open ? 45 : 0 }
  const bottom =
    variant === 'arrow'
      ? { y: open ? -4 : 6, x: open ? -3 : 0, rotate: open ? 40 : 0, width: open ? '60%' : '100%' }
      : variant === 'squeeze'
        ? { y: open ? 0 : 6, rotate: 0 }
        : { y: open ? 0 : 6, rotate: open ? -45 : 0 }
  const mid = variant === 'arrow' ? { opacity: 1, scaleX: 1 } : variant === 'squeeze' ? { opacity: 1, scaleX: open ? 1 : 0.6 } : { opacity: open ? 0 : 1, scaleX: open ? 0 : 1 }
  return (
    <motion.div animate={{ rotate: variant === 'spin' && open ? 180 : 0 }} transition={spring} className="relative h-[14px] w-6">
      <motion.span className={`${line} top-1/2 origin-center`} style={{ background: color, originX: variant === 'arrow' ? 0 : 0.5 }} animate={top} transition={spring} />
      <motion.span className={`${line} top-1/2`} style={{ background: color }} animate={mid} transition={spring} />
      <motion.span className={`${line} top-1/2 origin-center`} style={{ background: color, originX: variant === 'arrow' ? 0 : 0.5 }} animate={bottom} transition={spring} />
    </motion.div>
  )
}

const LINKS = ['ホーム', '作品', '私たちについて', 'ジャーナル', 'お問い合わせ']

export function HamburgerOverlayMenu() {
  const [toggles, setToggles] = useState<Record<Variant, boolean>>({ cross: false, arrow: true, spin: false, squeeze: true })
  const [menu, setMenu] = useState(false)

  return (
    <div className="@container relative h-full w-full overflow-hidden bg-[#111114] font-sans text-white">
      {/* アイコンの比較 */}
      <div className="flex h-full flex-col items-center justify-center gap-6 p-6">
        <div className="text-xs tracking-[0.3em] text-zinc-500 uppercase">Hamburger morphs</div>
        <div className="flex gap-3">
          {(Object.keys(toggles) as Variant[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setToggles((t) => ({ ...t, [v]: !t[v] }))}
              className="flex h-16 w-16 flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-white/25"
            >
              <Burger open={toggles[v]} variant={v} />
              <span className="text-[9px] text-zinc-500">{v}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-500">右上のボタンでフルスクリーンメニュー</p>
      </div>

      {/* オーバーレイ */}
      <AnimatePresence>
        {menu && (
          <motion.nav
            key="overlay"
            className="absolute inset-0 z-10 flex flex-col justify-center bg-[#e9ff70] px-8 text-zinc-950"
            initial={{ clipPath: 'circle(0% at calc(100% - 36px) 34px)' }}
            animate={{ clipPath: 'circle(150% at calc(100% - 36px) 34px)' }}
            exit={{ clipPath: 'circle(0% at calc(100% - 36px) 34px)' }}
            transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
          >
            <ul className="space-y-1">
              {LINKS.map((l, i) => (
                <li key={l} className="overflow-hidden">
                  <motion.a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      setMenu(false)
                    }}
                    initial={{ y: '110%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '110%', transition: { duration: 0.2, delay: (LINKS.length - i) * 0.03 } }}
                    transition={{ delay: 0.25 + i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="group flex items-baseline gap-3 text-[clamp(26px,7cqw,52px)] leading-[1.15] font-black tracking-tight"
                  >
                    <span className="font-mono text-xs font-normal text-zinc-600">0{i + 1}</span>
                    <span className="transition group-hover:translate-x-2 group-hover:italic">{l}</span>
                    <ArrowUpRight className="opacity-0 transition group-hover:opacity-100" size={26} />
                  </motion.a>
                </li>
              ))}
            </ul>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.7 } }}
              exit={{ opacity: 0 }}
              className="absolute bottom-5 left-8 flex gap-4 text-xs text-zinc-700"
            >
              <span>Instagram</span>
              <span>X</span>
              <span>hello@studio.jp</span>
            </motion.div>
          </motion.nav>
        )}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => setMenu((m) => !m)}
        aria-label={menu ? 'メニューを閉じる' : 'メニューを開く'}
        className={`absolute top-3 right-3 z-20 grid h-12 w-12 place-items-center rounded-full transition-colors ${menu ? 'bg-zinc-950' : 'bg-white/10 hover:bg-white/20'}`}
      >
        <Burger open={menu} variant="cross" />
      </button>
    </div>
  )
}
