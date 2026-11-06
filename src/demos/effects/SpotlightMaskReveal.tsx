import { useEffect, useRef, type ReactNode } from 'react'
import { art } from '../_shared/art'

const NIGHT = art('landscape', 4, 1400, 900)

function Hero({ blueprint }: { blueprint?: boolean }) {
  const line = blueprint ? 'border-white/70 border-dashed' : 'border-transparent'
  const Box = ({ children, label, className = '' }: { children: ReactNode; label: string; className?: string }) => (
    <div className={`relative border ${line} ${className}`}>
      {blueprint && <span className="absolute -top-4 left-0 font-mono text-[9px] whitespace-nowrap text-white/80">{label}</span>}
      {children}
    </div>
  )
  return (
    <div
      className="absolute inset-0 flex flex-col justify-center px-[7%]"
      style={
        blueprint
          ? {
              background: '#0b3a8a',
              backgroundImage:
                'linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)',
              backgroundSize: '80px 80px, 80px 80px, 16px 16px, 16px 16px',
              color: 'white',
            }
          : { backgroundImage: `linear-gradient(90deg, rgba(8,8,20,.85) 20%, rgba(8,8,20,.2)), url("${NIGHT}")`, backgroundSize: 'cover', color: 'white' }
      }
    >
      <Box label="eyebrow / 12px / tracking .3em" className="w-fit">
        <div className={`text-[11px] tracking-[0.3em] uppercase ${blueprint ? 'font-mono' : 'text-pink-300'}`}>Studio — Night Edition</div>
      </Box>
      <Box label="h1 / Playfair Display 900 / clamp(32px, 8cqw, 76px)" className="mt-5 w-fit">
        <h2
          className="font-['Playfair_Display'] text-[clamp(30px,8cqw,76px)] leading-[1.05] font-black"
          style={blueprint ? { color: 'transparent', WebkitTextStroke: '1px white' } : undefined}
        >
          見えない設計図を、
          <br />
          のぞいてみる。
        </h2>
      </Box>
      <Box label="p / 14px / max-w 36ch / opacity .7" className="mt-4 w-fit">
        <p className={`max-w-[36ch] text-sm ${blueprint ? 'font-mono text-white/90' : 'text-white/70'}`}>
          {blueprint ? 'grid 80px · baseline 8px · margin 7% · contrast 12.4:1' : 'カーソルの光で、完成したデザインの裏にある構造が浮かび上がります。'}
        </p>
      </Box>
      <Box label="button / h 40 / radius 999" className="mt-6 w-fit">
        <span
          className={`inline-flex h-10 items-center rounded-full px-5 text-sm font-semibold ${
            blueprint ? 'border border-white font-mono' : 'bg-white text-zinc-900'
          }`}
        >
          Explore →
        </span>
      </Box>
      {blueprint && (
        <svg className="pointer-events-none absolute inset-0 h-full w-full" fill="none" stroke="white" strokeWidth="1">
          <circle cx="78%" cy="38%" r="70" strokeDasharray="4 4" opacity=".7" />
          <circle cx="78%" cy="38%" r="4" fill="white" />
          <line x1="78%" y1="10%" x2="78%" y2="90%" opacity=".35" />
          <line x1="55%" y1="38%" x2="98%" y2="38%" opacity=".35" />
          <text x="79%" y="12%" fill="white" stroke="none" fontSize="10" fontFamily="JetBrains Mono">sun Ø140</text>
          <text x="58%" y="94%" fill="white" stroke="none" fontSize="10" fontFamily="JetBrains Mono">REV.04 — SCALE 1:1</text>
        </svg>
      )}
    </div>
  )
}

/** カーソル周りだけ「設計図レイヤー」が見えるマスク・スポットライト */
export function SpotlightMaskReveal() {
  const rootRef = useRef<HTMLDivElement>(null)
  const maskRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current!
    const mask = maskRef.current!
    const target = { x: 0, y: 0, r: 120 }
    const cur = { x: 0, y: 0, r: 0 }
    let hovering = false
    let pressed = false
    let raf = 0
    let t = 0
    const onMove = (e: PointerEvent) => {
      const r = root.getBoundingClientRect()
      hovering = true
      target.x = e.clientX - r.left
      target.y = e.clientY - r.top
    }
    const onLeave = () => (hovering = false)
    const onDown = () => (pressed = true)
    const onUp = () => (pressed = false)
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const w = root.clientWidth
      const h = root.clientHeight
      if (!hovering) {
        t += 0.012
        target.x = w * (0.5 + Math.sin(t) * 0.32)
        target.y = h * (0.5 + Math.sin(t * 1.7) * 0.25)
      }
      target.r = Math.min(w, h) * (pressed ? 0.75 : 0.3)
      cur.x += (target.x - cur.x) * 0.12
      cur.y += (target.y - cur.y) * 0.12
      cur.r += (target.r - cur.r) * 0.1
      const g = `radial-gradient(circle ${cur.r.toFixed(1)}px at ${cur.x.toFixed(1)}px ${cur.y.toFixed(1)}px, #000 55%, transparent 100%)`
      mask.style.maskImage = g
      mask.style.webkitMaskImage = g
    }
    loop()
    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerleave', onLeave)
    root.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    return () => {
      cancelAnimationFrame(raf)
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerleave', onLeave)
      root.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
    }
  }, [])

  return (
    <div ref={rootRef} className="relative h-full w-full cursor-none overflow-hidden bg-black select-none [container-type:inline-size]">
      <Hero />
      <div ref={maskRef} className="absolute inset-0" style={{ maskImage: 'radial-gradient(circle 0px at 0 0, #000, transparent)' }}>
        <Hero blueprint />
      </div>
      <div className="pointer-events-none absolute right-3 bottom-2 font-mono text-[10px] text-white/50">hover to reveal · press to widen</div>
    </div>
  )
}
