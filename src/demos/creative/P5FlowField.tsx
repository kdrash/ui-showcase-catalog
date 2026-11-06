import { useEffect, useRef, useState } from 'react'
import p5 from 'p5'
import { Download, Pause, Play, Shuffle } from 'lucide-react'

const PALETTES = [
  { name: 'Ember', bg: '#0b0710', colors: ['#ff6b35', '#f7c548', '#ff006e', '#fb5607'] },
  { name: 'Ocean', bg: '#03111d', colors: ['#00b4d8', '#90e0ef', '#caf0f8', '#0077b6'] },
  { name: 'Moss', bg: '#0c120c', colors: ['#a7c957', '#6a994e', '#f2e8cf', '#386641'] },
  { name: 'Candy', bg: '#fdf6ec', colors: ['#ff7aa2', '#7a5cff', '#2ec4b6', '#ffbf69'] },
]

/** p5.js(インスタンスモード)の Perlin ノイズ流れ場ジェネラティブアート */
export function P5FlowField() {
  const hostRef = useRef<HTMLDivElement>(null)
  const sketchRef = useRef<p5 | null>(null)
  const [palette, setPalette] = useState(0)
  const [seed, setSeed] = useState(42)
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)

  useEffect(() => {
    const host = hostRef.current!
    const pal = PALETTES[palette]
    const N = 1400
    const sketch = (p: p5) => {
      let pts: { x: number; y: number; c: number; life: number }[] = []
      let cols: ReturnType<p5['color']>[] = []
      const reset = () => {
        cols = pal.colors.map((c) => {
          const k = p.color(c)
          k.setAlpha(28)
          return k
        })
        p.randomSeed(seed)
        p.noiseSeed(seed)
        p.background(pal.bg)
        pts = Array.from({ length: N }, () => ({ x: p.random(p.width), y: p.random(p.height), c: Math.floor(p.random(pal.colors.length)), life: p.random(80, 400) }))
      }
      p.setup = () => {
        p.createCanvas(host.clientWidth, host.clientHeight)
        p.pixelDensity(Math.min(2, window.devicePixelRatio))
        reset()
      }
      p.draw = () => {
        if (pausedRef.current) return
        const s = 0.0028
        p.strokeWeight(1.1)
        for (const pt of pts) {
          const a = p.noise(pt.x * s, pt.y * s, p.frameCount * 0.0015) * p.TWO_PI * 2.2
          const nx = pt.x + Math.cos(a) * 1.6
          const ny = pt.y + Math.sin(a) * 1.6
          p.stroke(cols[pt.c])
          p.line(pt.x, pt.y, nx, ny)
          pt.x = nx
          pt.y = ny
          if (--pt.life < 0 || nx < 0 || ny < 0 || nx > p.width || ny > p.height) {
            pt.x = p.random(p.width)
            pt.y = p.random(p.height)
            pt.life = p.random(80, 400)
          }
        }
      }
      ;(p as unknown as { _reset: () => void })._reset = reset
    }
    const inst = new p5(sketch, host)
    sketchRef.current = inst
    let w = host.clientWidth
    let h = host.clientHeight
    const ro = new ResizeObserver(() => {
      if (Math.abs(host.clientWidth - w) < 2 && Math.abs(host.clientHeight - h) < 2) return
      w = host.clientWidth
      h = host.clientHeight
      inst.resizeCanvas(w, h)
      ;(inst as unknown as { _reset?: () => void })._reset?.()
    })
    ro.observe(host)
    return () => {
      ro.disconnect()
      inst.remove()
      sketchRef.current = null
    }
  }, [palette, seed])

  const togglePause = () => {
    pausedRef.current = !pausedRef.current
    setPaused(pausedRef.current)
  }

  const pal = PALETTES[palette]
  const light = palette === 3
  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: pal.bg }}>
      <div ref={hostRef} className="absolute inset-0 [&_canvas]:block" />
      <div
        className={`absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border p-1 shadow-xl backdrop-blur-md ${
          light ? 'border-black/10 bg-white/70 text-zinc-800' : 'border-white/10 bg-black/45 text-white'
        }`}
      >
        {PALETTES.map((pl, i) => (
          <button
            key={pl.name}
            type="button"
            title={pl.name}
            onClick={() => setPalette(i)}
            className={`flex h-7 items-center gap-0.5 rounded-full px-1.5 transition ${i === palette ? (light ? 'bg-black/10' : 'bg-white/15') : ''}`}
          >
            {pl.colors.slice(0, 3).map((c) => (
              <span key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
            ))}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-current opacity-20" />
        <button type="button" title="シードを変更" onClick={() => setSeed(Math.floor(Math.random() * 99999))} className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/15">
          <Shuffle size={14} />
        </button>
        <button type="button" title={paused ? '再開' : '一時停止'} onClick={togglePause} className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/15">
          {paused ? <Play size={14} /> : <Pause size={14} />}
        </button>
        <button type="button" title="PNGで保存" onClick={() => sketchRef.current?.saveCanvas(`flow-field-${seed}`, 'png')} className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/15">
          <Download size={14} />
        </button>
        <span className="pr-2 pl-1 font-mono text-[10px] opacity-60">#{seed}</span>
      </div>
    </div>
  )
}
