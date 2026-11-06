import { useRef, type CSSProperties, type PointerEvent } from 'react'

const INITIAL = {
  '--mx': '50%',
  '--my': '50%',
  '--rx': '0deg',
  '--ry': '0deg',
  '--pos': '50% 50%',
  '--o': '0',
} as CSSProperties

/**
 * ホログラム(箔押し)カード。React の再レンダーを使わず、pointermove で CSS 変数を直接更新。
 * - 虹色の repeating-linear-gradient を background-position で動かし mix-blend-mode: color-dodge
 * - 光のハイライトは radial-gradient(at var(--mx) var(--my)) を overlay 合成
 * - transform: rotateX(var(--rx)) rotateY(var(--ry)) で傾ける
 */
export function HoloCard() {
  const ref = useRef<HTMLDivElement>(null)

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    el.style.setProperty('--mx', `${px * 100}%`)
    el.style.setProperty('--my', `${py * 100}%`)
    el.style.setProperty('--rx', `${(0.5 - py) * 24}deg`)
    el.style.setProperty('--ry', `${(px - 0.5) * 24}deg`)
    el.style.setProperty('--pos', `${px * 100}% ${py * 100}%`)
    el.style.setProperty('--o', '1')
  }

  const onLeave = () => {
    const el = ref.current
    if (!el) return
    for (const [k, v] of Object.entries(INITIAL)) el.style.setProperty(k, String(v))
  }

  return (
    <div className="relative grid h-full w-full place-items-center overflow-hidden bg-[radial-gradient(circle_at_50%_40%,#1f2937,#030712_75%)]">
      <div style={{ perspective: 800 }}>
        <div
          ref={ref}
          onPointerMove={onMove}
          onPointerLeave={onLeave}
          className="relative h-[300px] w-[215px] cursor-pointer rounded-[18px] p-[7px] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)]"
          style={{
            ...INITIAL,
            transform: 'rotateX(var(--rx)) rotateY(var(--ry))',
            transition: 'transform 0.15s ease-out',
            background: 'linear-gradient(135deg,#e5e7eb,#9ca3af 30%,#f3f4f6 50%,#6b7280 70%,#d1d5db)',
          }}
        >
          {/* カード本体 */}
          <div className="relative flex h-full flex-col overflow-hidden rounded-[12px] bg-gradient-to-b from-indigo-950 to-slate-900 p-2.5 text-white">
            <div className="flex items-baseline justify-between px-1">
              <span className="text-sm font-bold tracking-wide">Nebula Fox</span>
              <span className="text-xs font-bold text-rose-300">
                HP <span className="text-base">120</span>
              </span>
            </div>
            <div className="relative mt-1.5 grid h-[118px] place-items-center overflow-hidden rounded-md border-2 border-amber-200/70 bg-[radial-gradient(circle_at_50%_60%,#7c3aed,#1e1b4b_70%)]">
              <span className="text-7xl drop-shadow-[0_0_18px_rgba(167,139,250,0.9)]">🦊</span>
              <span className="absolute left-2 top-1 text-[8px] text-white/80">✦ ✧ ✦</span>
            </div>
            <div className="mt-2 space-y-1.5 px-1 text-[10px]">
              <div className="flex justify-between border-b border-white/10 pb-1">
                <span>⚡ Star Dash</span>
                <span className="font-bold">40</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-1">
                <span>🌌 Cosmic Howl</span>
                <span className="font-bold">90</span>
              </div>
              <p className="pt-0.5 text-[8.5px] italic leading-snug text-white/60">
                星雲の尾を持つ狐。満月の夜にだけ姿を見せるという。
              </p>
            </div>
            <div className="mt-auto flex justify-between px-1 text-[8px] text-white/50">
              <span>★ RARE HOLO</span>
              <span>042/150</span>
            </div>

            {/* 虹色の箔 */}
            <div
              className="pointer-events-none absolute inset-0 transition-opacity duration-300"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(115deg,#ff3cac 0%,#ffd23f 7%,#3cffd0 14%,#3c8cff 21%,#b13cff 28%,#ff3cac 35%),repeating-linear-gradient(45deg,rgba(255,255,255,.12) 0 1px,transparent 1px 5px)',
                backgroundSize: '300% 300%, auto',
                backgroundPosition: 'var(--pos), 0 0',
                mixBlendMode: 'color-dodge',
                opacity: 'calc(0.12 + var(--o) * 0.38)',
              }}
            />
            {/* 光の反射 */}
            <div
              className="pointer-events-none absolute inset-0 transition-opacity duration-300"
              style={{
                background: 'radial-gradient(circle at var(--mx) var(--my), rgba(255,255,255,0.65), transparent 45%)',
                mixBlendMode: 'overlay',
                opacity: 'var(--o)',
              }}
            />
          </div>
        </div>
      </div>
      <p className="absolute bottom-3 text-[10px] text-white/40">カードの上でカーソルを動かす</p>
    </div>
  )
}
