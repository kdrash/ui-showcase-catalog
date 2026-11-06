import { useRef, type PointerEvent } from 'react'
import { ArrowRight } from 'lucide-react'

/**
 * グリッド線 + マウス追従スポットライト (Vercel / Linear 風ダーク)
 * - linear-gradient 2枚で 40px グリッド線を描画、mask-image で周辺をフェード
 * - 明るいグリッドをもう1枚重ね、mask に radial-gradient(at var(--x) var(--y)) → カーソル周辺だけ光る
 * - pointermove で CSS 変数を直接書き換えるので React の再レンダーなし
 */

const gridLines = (alpha: number) =>
  `linear-gradient(to right, rgba(255,255,255,${alpha}) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,${alpha}) 1px, transparent 1px)`

export function GridSpotlight() {
  const rootRef = useRef<HTMLDivElement>(null)

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = rootRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--x', `${e.clientX - r.left}px`)
    el.style.setProperty('--y', `${e.clientY - r.top}px`)
    el.style.setProperty('--o', '1')
  }

  return (
    <div
      ref={rootRef}
      onPointerMove={onMove}
      onPointerLeave={() => rootRef.current?.style.setProperty('--o', '0')}
      className="relative h-full w-full overflow-hidden bg-[#0a0a0a] [--o:0] [--x:50%] [--y:50%]"
    >
      {/* ベースのグリッド (周辺フェード) */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: gridLines(0.06),
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 80%)',
        }}
      />
      {/* カーソル周辺だけ明るいグリッド */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: 'var(--o)',
          backgroundImage: gridLines(0.22),
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(180px circle at var(--x) var(--y), black, transparent)',
          WebkitMaskImage: 'radial-gradient(180px circle at var(--x) var(--y), black, transparent)',
        }}
      />
      {/* スポットライトのグロー */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: 'var(--o)',
          background: 'radial-gradient(500px circle at var(--x) var(--y), rgba(120,119,198,0.18), transparent 45%)',
        }}
      />
      {/* 上部のライトビーム */}
      <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-2/3 -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl" />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
        <a className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-zinc-300 transition hover:border-white/20">
          <span className="rounded-full bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300">NEW</span>
          v2.0 is live
          <ArrowRight size={12} className="transition group-hover:translate-x-0.5" />
        </a>
        <h3 className="mt-5 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-4xl font-semibold tracking-tighter text-transparent md:text-5xl">
          Build the future,
          <br />
          faster.
        </h3>
        <p className="mt-3 max-w-sm text-sm text-zinc-400">マウスを動かすとカーソル周辺のグリッドだけが光ります。</p>
        <div className="mt-6 flex gap-3">
          <button className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200">
            Deploy now
          </button>
          <button className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white transition hover:bg-white/5">
            Read docs
          </button>
        </div>
      </div>
    </div>
  )
}
