import { useEffect, useRef, useState } from 'react'
import Matter from 'matter-js'

const TAGS = [
  ['React', '#61dafb'], ['Three.js', '#ffffff'], ['GSAP', '#88ce02'], ['Motion', '#ff4fd8'], ['TypeScript', '#3178c6'],
  ['Tailwind', '#38bdf8'], ['WebGL', '#f87171'], ['Figma', '#a259ff'], ['Rust', '#f97316'], ['Node.js', '#5fa04e'],
  ['D3.js', '#f9a03c'], ['Vite', '#bd34fe'], ['GLSL', '#5586a4'], ['Next.js', '#e4e4e7'], ['Tone.js', '#22d3ee'],
  ['Matter.js', '#76f09b'], ['Svelte', '#ff3e00'], ['Python', '#ffd43b'],
] as const

type Pill = { id: number; label: string; color: string; body: Matter.Body; w: number; h: number }

/** Matter.js の剛体に DOM のピルを同期させる「降ってくるスキルタグ」 */
export function MatterPhysicsTags() {
  const boxRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<Matter.Engine | null>(null)
  const [pills, setPills] = useState<Pill[]>([])
  const pillsRef = useRef<Pill[]>([])
  const elRefs = useRef(new Map<number, HTMLDivElement>())
  const nextId = useRef(0)

  const spawn = (count: number) => {
    const engine = engineRef.current
    const box = boxRef.current
    if (!engine || !box) return
    const W = box.clientWidth
    const scale = Math.min(1, Math.max(0.75, W / 640))
    const added: Pill[] = []
    for (let i = 0; i < count; i++) {
      const [label, color] = TAGS[(nextId.current + i) % TAGS.length]
      const h = 38 * scale
      const w = (label.length * 9.5 + 40) * scale
      const body = Matter.Bodies.rectangle(40 + Math.random() * (W - 80), -60 - i * 50, w, h, {
        chamfer: { radius: h / 2 },
        restitution: 0.45,
        friction: 0.2,
        angle: (Math.random() - 0.5) * 0.8,
      })
      added.push({ id: nextId.current++, label, color, body, w, h })
    }
    Matter.Composite.add(engine.world, added.map((p) => p.body))
    pillsRef.current = [...pillsRef.current, ...added].slice(-60)
    setPills(pillsRef.current)
  }

  useEffect(() => {
    const box = boxRef.current!
    const engine = Matter.Engine.create({ gravity: { x: 0, y: 1 } })
    engineRef.current = engine
    const walls: Matter.Body[] = []
    const buildWalls = () => {
      Matter.Composite.remove(engine.world, walls.splice(0))
      const W = box.clientWidth
      const H = box.clientHeight
      const t = 200
      walls.push(
        Matter.Bodies.rectangle(W / 2, H + t / 2, W * 3, t, { isStatic: true }),
        Matter.Bodies.rectangle(-t / 2, H / 2 - 400, t, H * 3, { isStatic: true }),
        Matter.Bodies.rectangle(W + t / 2, H / 2 - 400, t, H * 3, { isStatic: true }),
      )
      Matter.Composite.add(engine.world, walls)
    }
    buildWalls()
    const ro = new ResizeObserver(buildWalls)
    ro.observe(box)

    const mouse = Matter.Mouse.create(box)
    // Matter は wheel を preventDefault するのでページスクロールを妨げないよう外す
    box.removeEventListener('wheel', (mouse as unknown as { mousewheel: EventListener }).mousewheel)
    const mc = Matter.MouseConstraint.create(engine, { mouse, constraint: { stiffness: 0.2, render: { visible: false } } })
    Matter.Composite.add(engine.world, mc)

    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(now - last, 16.6)
      last = now
      Matter.Engine.update(engine, dt)
      for (const p of pillsRef.current) {
        const el = elRefs.current.get(p.id)
        if (!el) continue
        const { x, y } = p.body.position
        el.style.transform = `translate(${x - p.w / 2}px, ${y - p.h / 2}px) rotate(${p.body.angle}rad)`
      }
    }
    raf = requestAnimationFrame(tick)
    spawn(14)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      Matter.Mouse.clearSourceEvents(mouse)
      Matter.World.clear(engine.world, false)
      Matter.Engine.clear(engine)
      engineRef.current = null
      pillsRef.current = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const shake = () => {
    for (const p of pillsRef.current)
      Matter.Body.setVelocity(p.body, { x: (Math.random() - 0.5) * 18, y: -10 - Math.random() * 10 })
  }
  const tilt = (dir: number) => {
    const engine = engineRef.current
    if (!engine) return
    engine.gravity.x = dir * 0.6
    setTimeout(() => engineRef.current && (engineRef.current.gravity.x = 0), 900)
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[radial-gradient(ellipse_at_top,#1e1b4b,#09090b_70%)] select-none">
      <div className="pointer-events-none absolute top-3 left-4">
        <div className="font-[Space_Grotesk] text-xl font-bold tracking-tight text-white/90">My Stack</div>
        <div className="text-[11px] text-white/45">ドラッグで投げられます</div>
      </div>
      <div ref={boxRef} className="absolute inset-0 cursor-grab active:cursor-grabbing">
        {pills.map((p) => (
          <div
            key={p.id}
            ref={(el) => {
              if (el) elRefs.current.set(p.id, el)
              else elRefs.current.delete(p.id)
            }}
            className="absolute top-0 left-0 flex items-center justify-center gap-2 rounded-full border border-white/15 font-semibold text-zinc-900 shadow-[0_6px_20px_-6px_rgba(0,0,0,.6)] will-change-transform"
            style={{ width: p.w, height: p.h, background: p.color, fontSize: p.h * 0.4, transform: 'translate(-999px,-999px)' }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-black/40" />
            {p.label}
          </div>
        ))}
      </div>
      <div className="absolute top-3 right-3 z-10 flex gap-1.5">
        {[
          ['＋ 追加', () => spawn(4)],
          ['← 傾ける', () => tilt(-1)],
          ['傾ける →', () => tilt(1)],
          ['シェイク', shake],
        ].map(([label, fn]) => (
          <button
            key={label as string}
            type="button"
            onClick={fn as () => void}
            className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur transition hover:bg-white/20 active:scale-95"
          >
            {label as string}
          </button>
        ))}
      </div>
    </div>
  )
}
