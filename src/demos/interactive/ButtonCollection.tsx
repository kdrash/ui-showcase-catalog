import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, useTransform, type AnimationPlaybackControls } from 'motion/react'
import { ArrowRight, Check, LoaderCircle } from 'lucide-react'

/* キーフレームと @property はこのデモ専用のクラス名(bc-*)で定義 */
const css = `
.bc-shine::after{content:'';position:absolute;inset:0;background:linear-gradient(110deg,transparent 30%,rgba(255,255,255,.55) 50%,transparent 70%);transform:translateX(-120%);animation:bc-shine 2.6s ease-in-out infinite}
@keyframes bc-shine{0%,40%{transform:translateX(-120%)}80%,100%{transform:translateX(120%)}}
@property --bc-angle{syntax:'<angle>';initial-value:0deg;inherits:false}
.bc-gborder{background:conic-gradient(from var(--bc-angle),#f43f5e,#f59e0b,#22c55e,#3b82f6,#a855f7,#f43f5e);animation:bc-spin 3s linear infinite}
@keyframes bc-spin{to{--bc-angle:360deg}}
.bc-neon{color:#22d3ee;border:1.5px solid #22d3ee;text-shadow:0 0 6px #22d3ee;box-shadow:0 0 8px rgba(34,211,238,.5),inset 0 0 8px rgba(34,211,238,.3);transition:all .25s}
.bc-neon:hover{background:#22d3ee;color:#0a0a0a;text-shadow:none;box-shadow:0 0 12px #22d3ee,0 0 40px #22d3ee,0 0 80px rgba(34,211,238,.6)}
`

function Cell({ label, className = '', children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={`flex min-h-[110px] flex-col items-center justify-center gap-2.5 rounded-xl p-3 ${className}`}>
      {children}
      <span className="text-[10px] font-medium uppercase tracking-wider opacity-55">{label}</span>
    </div>
  )
}

/** Material 風リップル: クリック位置から円が広がる */
function RippleButton() {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number; size: number }[]>([])
  const next = useRef(0)
  return (
    <button
      onPointerDown={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        const size = Math.max(r.width, r.height) * 2.2
        setRipples((rs) => [...rs, { id: next.current++, x: e.clientX - r.left, y: e.clientY - r.top, size }])
      }}
      className="relative overflow-hidden rounded-md bg-indigo-600 px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-white shadow-[0_3px_6px_rgba(79,70,229,.4)]"
    >
      <span className="relative z-10">Ripple</span>
      {ripples.map((rp) => (
        <motion.span
          key={rp.id}
          className="pointer-events-none absolute rounded-full bg-white"
          style={{ left: rp.x - rp.size / 2, top: rp.y - rp.size / 2, width: rp.size, height: rp.size }}
          initial={{ scale: 0, opacity: 0.35 }}
          animate={{ scale: 1, opacity: 0 }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
          onAnimationComplete={() => setRipples((rs) => rs.filter((x) => x.id !== rp.id))}
        />
      ))}
    </button>
  )
}

/** Submit → スピナー → 完了 にモーフ */
function LoadingMorph() {
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle')
  useEffect(() => {
    if (state === 'idle') return
    const t = setTimeout(() => setState(state === 'loading' ? 'done' : 'idle'), state === 'loading' ? 1400 : 1600)
    return () => clearTimeout(t)
  }, [state])
  return (
    <motion.button
      onClick={() => state === 'idle' && setState('loading')}
      animate={{ width: state === 'loading' ? 40 : 112, backgroundColor: state === 'done' ? '#16a34a' : '#18181b' }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      className="flex h-10 items-center justify-center overflow-hidden rounded-full text-xs font-medium text-white"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={state}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.15 }}
          className="flex items-center gap-1.5 whitespace-nowrap"
        >
          {state === 'idle' && 'Submit'}
          {state === 'loading' && <LoaderCircle size={18} className="animate-spin" />}
          {state === 'done' && (
            <>
              <Check size={15} strokeWidth={3} /> Done
            </>
          )}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  )
}

/** 長押しで確定: 押している間だけ進捗が溜まる。塗り部分のテキストは clip-path で白に */
function HoldToConfirm() {
  const progress = useMotionValue(0)
  const [done, setDone] = useState(false)
  const ctrl = useRef<AnimationPlaybackControls | null>(null)
  const clipPath = useTransform(progress, (v) => `inset(0 ${100 - v * 100}% 0 0)`)

  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => {
      setDone(false)
      progress.set(0)
    }, 1500)
    return () => clearTimeout(t)
  }, [done, progress])
  useEffect(() => () => ctrl.current?.stop(), [])

  const start = () => {
    if (done) return
    ctrl.current?.stop()
    ctrl.current = animate(progress, 1, {
      duration: 1.2 * (1 - progress.get()),
      ease: 'linear',
      onComplete: () => setDone(true),
    })
  }
  const cancel = () => {
    if (done) return
    ctrl.current?.stop()
    ctrl.current = animate(progress, 0, { duration: 0.3 })
  }
  const label = done ? '削除しました' : '長押しで削除'

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      className="relative select-none overflow-hidden rounded-lg border border-rose-300 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-600"
    >
      {label}
      <motion.span
        aria-hidden
        style={{ clipPath }}
        className="absolute inset-0 grid place-items-center bg-rose-500 text-white"
      >
        {label}
      </motion.span>
    </motion.button>
  )
}

export function ButtonCollection() {
  return (
    <div className="@container relative h-full w-full overflow-hidden bg-zinc-100">
      <style>{css}</style>
      <div className="grid h-full grid-cols-2 gap-2 overflow-y-auto p-2.5 @lg:grid-cols-3 @2xl:grid-cols-5">
        <Cell label="Shine sweep" className="bg-zinc-900 text-white">
          <button className="bc-shine relative overflow-hidden rounded-lg bg-gradient-to-b from-zinc-700 to-zinc-800 px-5 py-2.5 text-xs font-semibold text-white ring-1 ring-white/10">
            Upgrade
          </button>
        </Cell>

        <Cell label="Gradient border" className="bg-zinc-900 text-white">
          <button className="bc-gborder rounded-full p-[2px]">
            <span className="block rounded-full bg-zinc-950 px-5 py-2 text-xs font-semibold text-white">Generate ✦</span>
          </button>
        </Cell>

        <Cell label="Neon glow" className="bg-[#0a0a12] text-cyan-200">
          <button className="bc-neon rounded px-5 py-2 text-xs font-bold uppercase tracking-[0.2em]" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            Launch
          </button>
        </Cell>

        <Cell label="Glass" className="bg-[linear-gradient(135deg,#f472b6,#818cf8,#22d3ee)] text-white">
          <button className="rounded-xl border border-white/40 bg-white/20 px-5 py-2.5 text-xs font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,.5),0_8px_24px_rgba(0,0,0,.15)] backdrop-blur-md transition hover:bg-white/30">
            Continue
          </button>
        </Cell>

        <Cell label="3D press" className="bg-white text-zinc-700">
          <button className="rounded-xl bg-rose-500 px-5 py-2.5 text-xs font-bold text-white shadow-[0_6px_0_#9f1239] transition-all duration-75 active:translate-y-[6px] active:shadow-[0_0_0_#9f1239]">
            PRESS ME
          </button>
        </Cell>

        <Cell label="Neo-brutalism" className="bg-[#fde68a] text-zinc-900">
          <button className="border-2 border-black bg-[#a7f3d0] px-5 py-2 text-xs font-black uppercase shadow-[4px_4px_0_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
            Click!
          </button>
        </Cell>

        <Cell label="Ripple · Material" className="bg-white text-zinc-700">
          <RippleButton />
        </Cell>

        <Cell label="Slide fill" className="bg-white text-zinc-700">
          <button className="group relative overflow-hidden rounded-full border border-zinc-900 px-5 py-2 text-xs font-semibold text-zinc-900 transition-colors duration-300 hover:text-white">
            <span className="absolute inset-0 translate-y-full rounded-full bg-zinc-900 transition-transform duration-300 ease-out group-hover:translate-y-0" />
            <span className="relative flex items-center gap-1.5">
              Explore
              <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
            </span>
          </button>
        </Cell>

        <Cell label="Loading morph" className="bg-white text-zinc-700">
          <LoadingMorph />
        </Cell>

        <Cell label="Hold to confirm" className="bg-white text-zinc-700">
          <HoldToConfirm />
        </Cell>
      </div>
    </div>
  )
}
