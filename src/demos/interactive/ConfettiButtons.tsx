import { useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'

type Fire = ReturnType<typeof confetti.create>
type Origin = { x: number; y: number }

/**
 * canvas-confetti を、プレビュー内に置いた <canvas> に confetti.create() でバインドして使う。
 * (通常はページ全体に出すなら confetti() を直接呼ぶだけで OK)
 */
export function ConfettiButtons() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fireRef = useRef<Fire | null>(null)
  const timers = useRef<number[]>([])
  const rafs = useRef<number[]>([])

  useEffect(() => {
    const fire = confetti.create(canvasRef.current!, { resize: true, useWorker: false, disableForReducedMotion: true })
    fireRef.current = fire
    const t = timers.current
    const r = rafs.current
    return () => {
      t.forEach((id) => clearInterval(id))
      r.forEach((id) => cancelAnimationFrame(id))
      fire.reset()
      fireRef.current = null
    }
  }, [])

  /** ボタンの中心を canvas 内の 0〜1 座標に変換 */
  const originOf = (el: HTMLElement): Origin => {
    const b = el.getBoundingClientRect()
    const c = canvasRef.current!.getBoundingClientRect()
    return { x: (b.left + b.width / 2 - c.left) / c.width, y: (b.top + b.height / 2 - c.top) / c.height }
  }

  const effects: { label: string; emoji: string; bg: string; run: (o: Origin) => void }[] = [
    {
      label: 'Burst',
      emoji: '🎉',
      bg: 'bg-rose-200',
      run: (origin) => fireRef.current?.({ particleCount: 110, spread: 75, startVelocity: 38, origin }),
    },
    {
      label: 'Realistic',
      emoji: '🎊',
      bg: 'bg-amber-200',
      run: (origin) => {
        const f = fireRef.current
        if (!f) return
        const total = 220
        const shot = (ratio: number, opts: confetti.Options) =>
          f({ origin, ...opts, particleCount: Math.floor(total * ratio) })
        shot(0.25, { spread: 26, startVelocity: 55 })
        shot(0.2, { spread: 60 })
        shot(0.35, { spread: 100, decay: 0.91, scalar: 0.8 })
        shot(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 })
        shot(0.1, { spread: 120, startVelocity: 45 })
      },
    },
    {
      label: 'Fireworks',
      emoji: '🎆',
      bg: 'bg-indigo-200',
      run: () => {
        const end = Date.now() + 2500
        const id = window.setInterval(() => {
          const f = fireRef.current
          if (!f || Date.now() > end) return clearInterval(id)
          for (const side of [0.1, 0.6]) {
            f({
              particleCount: 40,
              startVelocity: 28,
              spread: 360,
              ticks: 60,
              origin: { x: side + Math.random() * 0.3, y: Math.random() * 0.4 },
            })
          }
        }, 260)
        timers.current.push(id)
      },
    },
    {
      label: 'Cannons',
      emoji: '🏫',
      bg: 'bg-emerald-200',
      run: () => {
        const end = Date.now() + 1800
        const colors = ['#f43f5e', '#ffffff', '#3b82f6']
        const frame = () => {
          const f = fireRef.current
          if (!f) return
          f({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.8 }, colors })
          f({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.8 }, colors })
          if (Date.now() < end) rafs.current.push(requestAnimationFrame(frame))
        }
        frame()
      },
    },
    {
      label: 'Emoji',
      emoji: '🦄',
      bg: 'bg-fuchsia-200',
      run: (origin) => {
        const shapes = ['🦄', '✨', '🌈'].map((text) => confetti.shapeFromText({ text, scalar: 2 }))
        fireRef.current?.({ shapes, scalar: 2, particleCount: 36, spread: 100, startVelocity: 32, origin })
      },
    },
    {
      label: 'Stars',
      emoji: '⭐',
      bg: 'bg-sky-200',
      run: (origin) => {
        const opts = {
          spread: 360,
          ticks: 60,
          gravity: 0,
          decay: 0.94,
          startVelocity: 22,
          shapes: ['star'] as confetti.Shape[],
          colors: ['#FFE400', '#FFBD00', '#E89400', '#FFCA6C', '#FDFFB8'],
          origin,
        }
        fireRef.current?.({ ...opts, particleCount: 30, scalar: 1.3 })
        fireRef.current?.({ ...opts, particleCount: 12, scalar: 0.8, shapes: ['circle'] })
      },
    },
  ]

  return (
    <div className="relative grid h-full w-full place-items-center overflow-hidden bg-[#f6f0ff] p-4">
      <div className="grid grid-cols-3 gap-3">
        {effects.map(({ label, emoji, bg, run }) => (
          <button
            key={label}
            onClick={(e) => run(originOf(e.currentTarget))}
            className={`flex flex-col items-center gap-1 rounded-[22px] px-4 py-3 text-xs font-bold text-zinc-700 transition-transform active:scale-95 ${bg} shadow-[inset_-5px_-5px_10px_rgba(0,0,0,.08),inset_5px_5px_10px_rgba(255,255,255,.7),0_10px_20px_rgba(120,80,200,.15)] hover:-translate-y-0.5`}
          >
            <span className="text-2xl">{emoji}</span>
            {label}
          </button>
        ))}
      </div>
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
    </div>
  )
}
