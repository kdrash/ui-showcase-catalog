import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { art } from '../_shared/art'

type CardSpec = {
  title: string
  sub: string
  img: string
  back: { heading: string; body: string; bg: string; fg: string }
  pixel: string
  grid: number
}

const CARDS: CardSpec[] = [
  {
    title: 'Dusk Ridge',
    sub: 'Photo 01',
    img: art('landscape', 0, 400, 520),
    back: { heading: '夕暮れの稜線', body: '標高 2,180m。日没の17分後、空は一番深い紫になる。', bg: '#1e1b4b', fg: '#fde68a' },
    pixel: '#f472b6',
    grid: 10,
  },
  {
    title: 'Ocean Bloom',
    sub: 'Photo 02',
    img: art('gradient', 1, 400, 520),
    back: { heading: 'Ocean Bloom', body: 'Grain, light and salt. A study of colour in motion.', bg: '#e0f2fe', fg: '#075985' },
    pixel: '#0ea5e9',
    grid: 14,
  },
  {
    title: 'Bauhaus 06',
    sub: 'Print 03',
    img: art('geometric', 6, 400, 520),
    back: { heading: '形は機能に従う', body: '円・三角・四角。最小の要素で最大の構成を。', bg: '#fff1f2', fg: '#134e4a' },
    pixel: '#111111',
    grid: 7,
  },
]

function PixelCard({ spec }: { spec: CardSpec }) {
  const [flipped, setFlipped] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)
  const tlRef = useRef<gsap.core.Timeline | null>(null)

  const run = (toBack: boolean) => {
    const cells = gridRef.current?.children
    if (!cells) return
    tlRef.current?.kill()
    const n = spec.grid * spec.grid
    const each = 0.28 / n
    tlRef.current = gsap
      .timeline()
      .set(cells, { opacity: 0 })
      .to(cells, { opacity: 1, duration: 0, stagger: { each, from: 'random' } })
      .call(() => setFlipped(toBack))
      .to(cells, { opacity: 0, duration: 0, stagger: { each, from: 'random' } }, '+=0.05')
  }

  useEffect(() => () => void tlRef.current?.kill(), [])

  return (
    <div
      className="relative aspect-[4/5] w-full cursor-pointer overflow-hidden rounded-xl shadow-xl ring-1 shadow-black/40 ring-white/10"
      onPointerEnter={() => run(true)}
      onPointerLeave={() => run(false)}
      onClick={() => run(!flipped)}
    >
      {!flipped ? (
        <div className="absolute inset-0">
          <img src={spec.img} alt="" className="h-full w-full object-cover" draggable={false} />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-white">
            <div className="font-mono text-[10px] tracking-widest opacity-70 uppercase">{spec.sub}</div>
            <div className="text-sm font-semibold">{spec.title}</div>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col justify-between p-4" style={{ background: spec.back.bg, color: spec.back.fg }}>
          <div className="font-mono text-[10px] tracking-widest uppercase opacity-70">{spec.sub} — info</div>
          <div>
            <div className="text-lg leading-tight font-bold">{spec.back.heading}</div>
            <p className="mt-2 text-[12px] leading-relaxed opacity-80">{spec.back.body}</p>
          </div>
          <div className="text-[11px] font-semibold">View →</div>
        </div>
      )}
      <div
        ref={gridRef}
        className="pointer-events-none absolute inset-0 grid"
        style={{ gridTemplateColumns: `repeat(${spec.grid}, 1fr)`, gridTemplateRows: `repeat(${spec.grid}, 1fr)` }}
      >
        {Array.from({ length: spec.grid * spec.grid }, (_, i) => (
          <div key={i} style={{ background: spec.pixel, opacity: 0 }} />
        ))}
      </div>
    </div>
  )
}

/** ホバーでピクセルがランダムに埋まり、別のカードへ切り替わる */
export function PixelTransition() {
  return (
    <div className="relative grid h-full w-full place-items-center overflow-hidden bg-[radial-gradient(circle_at_30%_20%,#27272a,#09090b)] p-5">
      <div className="grid w-full max-w-[640px] grid-cols-3 gap-4">
        {CARDS.map((c) => (
          <PixelCard key={c.title} spec={c} />
        ))}
      </div>
      <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] text-zinc-500">
        hover / tap でピクセル遷移
      </div>
    </div>
  )
}
