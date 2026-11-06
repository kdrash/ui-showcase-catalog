import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useAnimate, useMotionValue, useTransform, animate } from 'motion/react'
import { ArrowRight, Check, Loader, Trash, X } from 'lucide-react'

type S = 'idle' | 'loading' | 'success' | 'error'

function MorphButton({ fail, label }: { fail?: boolean; label: string }) {
  const [s, setS] = useState<S>('idle')
  const [scope, anim] = useAnimate()
  useEffect(() => {
    if (s === 'loading') {
      const t = setTimeout(() => setS(fail ? 'error' : 'success'), 1400)
      return () => clearTimeout(t)
    }
    if (s === 'error') anim(scope.current, { x: [0, -8, 8, -6, 6, -3, 0] }, { duration: 0.45 })
    if (s === 'success' || s === 'error') {
      const t = setTimeout(() => setS('idle'), 1800)
      return () => clearTimeout(t)
    }
  }, [s, fail, anim, scope])

  const bg = s === 'success' ? '#10b981' : s === 'error' ? '#ef4444' : '#18181b'
  return (
    <div className="flex h-11 justify-center">
      <motion.button
        ref={scope}
        layout
        onClick={() => s === 'idle' && setS('loading')}
        animate={{ backgroundColor: bg }}
        transition={{ layout: { type: 'spring', stiffness: 400, damping: 30 } }}
        style={{ borderRadius: 999 }}
        className={`flex h-11 items-center justify-center overflow-hidden text-sm font-semibold text-white shadow-lg ${s === 'loading' ? 'w-11' : 'px-5'}`}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={s}
            initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-1.5 whitespace-nowrap"
          >
            {s === 'idle' && label}
            {s === 'loading' && <Loader size={18} className="animate-spin" />}
            {s === 'success' && (
              <>
                <Check size={16} strokeWidth={3} /> 送信しました
              </>
            )}
            {s === 'error' && (
              <>
                <X size={16} strokeWidth={3} /> 失敗しました
              </>
            )}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </div>
  )
}

function HoldButton() {
  const p = useMotionValue(0)
  const width = useTransform(p, (v) => `${v * 100}%`)
  const labelColor = useTransform(p, [0, 0.5, 0.51], ['#e11d48', '#e11d48', '#ffffff'])
  const [done, setDone] = useState(false)
  const ctl = useRef<ReturnType<typeof animate> | null>(null)
  const start = () => {
    if (done) return
    ctl.current?.stop()
    ctl.current = animate(p, 1, { duration: 1.4 * (1 - p.get()), ease: 'linear', onComplete: () => setDone(true) })
  }
  const cancel = () => {
    if (done) return
    ctl.current?.stop()
    ctl.current = animate(p, 0, { duration: 0.35 })
  }
  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => {
      setDone(false)
      p.set(0)
    }, 1800)
    return () => clearTimeout(t)
  }, [done, p])
  return (
    <button
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      className="relative h-11 w-full touch-none overflow-hidden rounded-xl border border-rose-200 bg-rose-50 text-sm font-semibold text-rose-600 select-none"
    >
      <motion.div className="absolute inset-y-0 left-0 bg-rose-500" style={{ width }} />
      <span className="relative inline-flex items-center gap-1.5 mix-blend-normal">
        {done ? (
          <span className="text-white">
            <Check size={15} className="mr-1 inline" />
            削除しました
          </span>
        ) : (
          <motion.span style={{ color: labelColor }} className="inline-flex items-center gap-1.5">
            <Trash size={15} /> 長押しで削除
          </motion.span>
        )}
      </span>
    </button>
  )
}

function SlideToConfirm() {
  const track = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const [ok, setOk] = useState(false)
  const KNOB = 44
  const max = () => (track.current?.offsetWidth ?? 240) - KNOB - 8
  const textOpacity = useTransform(x, [0, 120], [1, 0])
  const fill = useTransform(x, (v) => v + KNOB + 4)
  useEffect(() => {
    if (!ok) return
    const t = setTimeout(() => {
      setOk(false)
      animate(x, 0, { type: 'spring', stiffness: 300, damping: 30 })
    }, 1800)
    return () => clearTimeout(t)
  }, [ok, x])
  return (
    <div ref={track} className="relative h-[52px] w-full overflow-hidden rounded-full bg-zinc-800 p-1 select-none">
      <motion.div className="absolute inset-y-1 left-1 rounded-full bg-gradient-to-r from-emerald-500/30 to-emerald-400/70" style={{ width: fill }} />
      <motion.div style={{ opacity: textOpacity }} className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-zinc-400">
        <span className="bg-gradient-to-r from-zinc-500 via-white to-zinc-500 bg-[length:200%_100%] bg-clip-text text-transparent [animation:sb-shine_2.2s_linear_infinite]">
          スライドして支払う ›››
        </span>
      </motion.div>
      {ok && <div className="pointer-events-none absolute inset-0 grid place-items-center text-sm font-semibold text-white">¥3,980 支払い完了</div>}
      <motion.div
        drag={ok ? false : 'x'}
        dragConstraints={track}
        dragElastic={0}
        dragMomentum={false}
        style={{ x, width: KNOB, height: KNOB }}
        onDragEnd={() => {
          if (x.get() > max() * 0.85) {
            animate(x, max(), { duration: 0.15 })
            setOk(true)
          } else animate(x, 0, { type: 'spring', stiffness: 500, damping: 30 })
        }}
        className="relative z-10 grid cursor-grab touch-none place-items-center rounded-full bg-white text-zinc-900 shadow-lg active:cursor-grabbing"
      >
        {ok ? <Check size={18} strokeWidth={3} className="text-emerald-600" /> : <ArrowRight size={18} />}
      </motion.div>
    </div>
  )
}

export function SubmitButtonStates() {
  return (
    <div className="relative grid h-full w-full grid-cols-2 gap-3 overflow-auto bg-gradient-to-br from-zinc-100 to-zinc-200 p-4 font-sans">
      <style>{'@keyframes sb-shine{to{background-position:-200% 0}}'}</style>
      <section className="flex flex-col justify-center gap-4 rounded-2xl bg-white p-4 shadow-sm">
        <div className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">送信ボタンの状態遷移</div>
        <MorphButton label="送信する" />
        <MorphButton label="エラーになる送信" fail />
      </section>
      <section className="flex flex-col justify-center gap-4 rounded-2xl bg-white p-4 shadow-sm">
        <div className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">誤操作防止</div>
        <HoldButton />
        <SlideToConfirm />
      </section>
    </div>
  )
}
