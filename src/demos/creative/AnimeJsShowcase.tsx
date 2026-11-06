import { useEffect, useRef, useState } from 'react'
import { animate, createDrawable, spring, createTimeline, stagger } from 'animejs'

type Tab = 'grid' | 'draw' | 'spring' | 'timeline'
const TABS: { id: Tab; label: string }[] = [
  { id: 'grid', label: 'Stagger Grid' },
  { id: 'draw', label: 'SVG Draw' },
  { id: 'spring', label: 'Spring' },
  { id: 'timeline', label: 'Timeline' },
]
const COLS = 17
const ROWS = 9
type Revertible = { revert: () => unknown }

/** anime.js v4 の stagger / createDrawable / spring / createTimeline のショーケース */
export function AnimeJsShowcase() {
  const [tab, setTab] = useState<Tab>('grid')
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#141018] text-white">
      <div className="flex items-center gap-1 px-3 pt-3">
        <span className="mr-2 font-mono text-sm font-bold text-[#ff4b4b]">anime.js</span>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${tab === t.id ? 'bg-[#ff4b4b] text-white' : 'text-white/55 hover:bg-white/10'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="relative flex-1">
        {tab === 'grid' && <GridTab />}
        {tab === 'draw' && <DrawTab />}
        {tab === 'spring' && <SpringTab />}
        {tab === 'timeline' && <TimelineTab />}
      </div>
    </div>
  )
}

function GridTab() {
  const ref = useRef<HTMLDivElement>(null)
  const anims = useRef<Revertible[]>([])
  const ripple = (from: number) => {
    const dots = ref.current?.querySelectorAll('.dot')
    if (!dots) return
    anims.current.push(
      animate(dots, {
        scale: [{ to: 0.25, ease: 'outSine', duration: 250 }, { to: 1, ease: 'outElastic(1, .45)', duration: 900 }],
        translateY: [{ to: -10, ease: 'outSine', duration: 250 }, { to: 0, ease: 'outElastic(1, .45)', duration: 900 }],
        backgroundColor: [{ to: '#ff4b4b', duration: 200 }, { to: '#ffb86b', duration: 400 }, { to: '#3b3245', duration: 700 }],
        delay: stagger(55, { grid: [COLS, ROWS], from }),
      }),
    )
  }
  useEffect(() => {
    ripple(Math.floor((COLS * ROWS) / 2))
    const list = anims.current
    return () => list.forEach((a) => a.revert())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div className="grid h-full place-items-center p-4">
      <div ref={ref} className="grid w-full max-w-xl gap-[1.6%]" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
        {Array.from({ length: COLS * ROWS }, (_, i) => (
          <button key={i} type="button" aria-label={`dot ${i}`} onClick={() => ripple(i)} className="dot aspect-square rounded-full bg-[#3b3245]" />
        ))}
      </div>
      <div className="pointer-events-none absolute bottom-2 text-[10px] text-white/40">ドットをクリックするとそこから波紋が広がります</div>
    </div>
  )
}

function DrawTab() {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => {
    const paths = createDrawable(ref.current!.querySelectorAll('.ln'))
    const a = animate(paths, {
      draw: ['0 0', '0 1', '1 1'],
      ease: 'inOutQuad',
      duration: 2600,
      delay: stagger(140),
      loop: true,
      loopDelay: 400,
    })
    return () => {
      a.revert()
    }
  }, [])
  const stroke = { fill: 'none', strokeWidth: 3, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  return (
    <div className="grid h-full place-items-center p-3">
      <svg ref={ref} viewBox="0 0 400 200" className="h-full max-h-[260px] w-full">
        <circle className="ln" cx="290" cy="70" r="32" stroke="#ffb86b" {...stroke} />
        <path className="ln" d="M10 170 L90 80 L140 130 L200 50 L270 140 L310 105 L390 170" stroke="#ff4b4b" {...stroke} />
        <path className="ln" d="M10 185 C60 165 90 200 140 182 S220 165 260 185 S340 200 390 180" stroke="#5eead4" {...stroke} />
        <path className="ln" d="M60 40 l12 0 M66 34 l0 12 M340 150 l10 0 M345 145 l0 10" stroke="#fff" {...stroke} strokeWidth={2} />
        <path className="ln" d="M178 118 q8 -14 16 0 q8 14 16 0" stroke="#c4b5fd" {...stroke} />
      </svg>
    </div>
  )
}

function SpringTab() {
  const area = useRef<HTMLDivElement>(null)
  const blob = useRef<HTMLDivElement>(null)
  const [stiffness, setStiffness] = useState(140)
  const [damping, setDamping] = useState(7)
  const last = useRef<Revertible | null>(null)
  useEffect(() => () => void last.current?.revert(), [])
  const go = (e: React.PointerEvent) => {
    const r = area.current!.getBoundingClientRect()
    const x = e.clientX - r.left - r.width / 2
    const y = e.clientY - r.top - r.height / 2
    last.current = animate(blob.current!, {
      x,
      y,
      scale: [{ to: 1.25, duration: 120 }, { to: 1 }],
      borderRadius: ['30% 70% 70% 30% / 30% 30% 70% 70%', '50%'],
      ease: spring({ stiffness, damping }),
    })
  }
  return (
    <div ref={area} onPointerDown={go} className="relative h-full cursor-crosshair">
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff14_1px,transparent_1px)] [background-size:18px_18px]" />
      <div className="absolute top-1/2 left-1/2 -mt-8 -ml-8">
        <div ref={blob} className="h-16 w-16 rounded-full bg-gradient-to-br from-[#ff4b4b] to-[#ffb86b] shadow-[0_0_40px_#ff4b4b88]" />
      </div>
      <div onPointerDown={(e) => e.stopPropagation()} className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-4 rounded-full bg-black/40 px-4 py-1.5 text-[10px] text-white/70 backdrop-blur">
        <label className="flex items-center gap-2">
          stiffness {stiffness}
          <input type="range" min={30} max={400} value={stiffness} onChange={(e) => setStiffness(+e.target.value)} className="w-20 accent-[#ff4b4b]" />
        </label>
        <label className="flex items-center gap-2">
          damping {damping}
          <input type="range" min={2} max={30} value={damping} onChange={(e) => setDamping(+e.target.value)} className="w-20 accent-[#ff4b4b]" />
        </label>
      </div>
      <div className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 text-[10px] text-white/40">どこかをクリックするとスプリングで移動</div>
    </div>
  )
}

function TimelineTab() {
  const root = useRef<HTMLDivElement>(null)
  const tl = useRef<ReturnType<typeof createTimeline> | null>(null)
  useEffect(() => {
    const q = (s: string) => root.current!.querySelectorAll(s)
    tl.current = createTimeline({ loop: true, loopDelay: 900, defaults: { ease: 'outExpo', duration: 700 } })
      .add(q('.sq'), { x: [-140, 0], rotate: [-180, 0], opacity: [0, 1] })
      .add(q('.ci'), { scale: [0, 1], ease: 'outElastic(1, .5)', duration: 1000 }, '-=400')
      .add(q('.bar'), { scaleY: [0, 1], delay: stagger(70) }, '-=700')
      .add(q('.ch'), { y: [30, 0], opacity: [0, 1], delay: stagger(40) }, '-=600')
      .add(q('.sq, .ci, .bar, .ch'), { opacity: 0, duration: 500, ease: 'inQuad', delay: stagger(15) }, '+=1200')
    return () => {
      tl.current?.revert()
    }
  }, [])
  return (
    <div ref={root} className="flex h-full flex-col items-center justify-center gap-5">
      <div className="flex items-end gap-4">
        <div className="sq h-14 w-14 rounded-xl bg-[#ff4b4b] opacity-0" />
        <div className="ci h-14 w-14 scale-0 rounded-full bg-[#5eead4]" />
        <div className="flex h-14 items-end gap-1.5">
          {[30, 50, 22, 56, 40].map((h, i) => (
            <div key={i} className="bar w-3 origin-bottom scale-y-0 rounded-t bg-[#c4b5fd]" style={{ height: h }} />
          ))}
        </div>
      </div>
      <div className="font-[Space_Grotesk] text-3xl font-bold tracking-tight">
        {'createTimeline()'.split('').map((c, i) => (
          <span key={i} className="ch inline-block opacity-0">
            {c}
          </span>
        ))}
      </div>
      <button type="button" onClick={() => tl.current?.restart()} className="rounded-full border border-white/15 px-3 py-1 text-[11px] text-white/70 hover:bg-white/10">
        restart
      </button>
    </div>
  )
}
