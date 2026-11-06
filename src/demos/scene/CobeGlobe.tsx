import { useEffect, useRef, type CSSProperties } from 'react'
import createGlobe from 'cobe'
import { Globe2 } from 'lucide-react'

/**
 * COBE(5KB の WebGL 地球儀)
 * - v2 は内部ループを持たないので、自前の requestAnimationFrame で globe.update({ phi, theta }) を呼ぶ
 * - ドラッグで回転(慣性付き)、離すと自動回転に戻る
 * - markers / arcs に id を付けると CSS Anchor Positioning 用の anchor(--cobe-<id>)と
 *   表裏の可視度変数(--cobe-visible-<id>)が公開されるので、HTML ラベルを追従させられる
 */

const CITIES = [
  { id: 'demo-tokyo', name: 'Tokyo', loc: [35.68, 139.69] as [number, number] },
  { id: 'demo-sf', name: 'San Francisco', loc: [37.77, -122.42] as [number, number] },
  { id: 'demo-ny', name: 'New York', loc: [40.71, -74.0] as [number, number] },
  { id: 'demo-london', name: 'London', loc: [51.5, -0.12] as [number, number] },
  { id: 'demo-sg', name: 'Singapore', loc: [1.35, 103.82] as [number, number] },
  { id: 'demo-sydney', name: 'Sydney', loc: [-33.87, 151.21] as [number, number] },
  { id: 'demo-sp', name: 'São Paulo', loc: [-23.55, -46.63] as [number, number] },
]

export function CobeGlobe() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drag = useRef<{ x: number; y: number } | null>(null)
  const vel = useRef({ phi: 0, theta: 0 })
  const angle = useRef({ phi: 2.4, theta: 0.3 })

  useEffect(() => {
    const canvas = canvasRef.current!
    const wrap = wrapRef.current!
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    let size = wrap.clientWidth
    const globe = createGlobe(canvas, {
      devicePixelRatio: dpr,
      width: size * dpr,
      height: size * dpr,
      phi: angle.current.phi,
      theta: angle.current.theta,
      dark: 1,
      diffuse: 1.4,
      mapSamples: 16000,
      mapBrightness: 5,
      mapBaseBrightness: 0.02,
      baseColor: [0.22, 0.24, 0.4],
      markerColor: [0.98, 0.45, 0.72],
      glowColor: [0.35, 0.4, 0.9],
      markers: CITIES.map((c) => ({ location: c.loc, size: c.id === 'demo-tokyo' ? 0.09 : 0.05, id: c.id })),
      arcs: CITIES.slice(1).map((c) => ({ from: CITIES[0].loc, to: c.loc })),
      arcColor: [0.55, 0.75, 1],
      arcWidth: 0.6,
      arcHeight: 0.25,
      markerElevation: 0.02,
    })
    const ro = new ResizeObserver(() => {
      size = wrap.clientWidth
      globe.update({ width: size * dpr, height: size * dpr })
    })
    ro.observe(wrap)
    let raf = 0
    const tick = () => {
      if (!drag.current) {
        angle.current.phi += 0.0035 + vel.current.phi
        vel.current.phi *= 0.94
        angle.current.theta += vel.current.theta
        vel.current.theta *= 0.9
      }
      angle.current.theta = Math.max(-0.6, Math.min(0.8, angle.current.theta))
      globe.update({ phi: angle.current.phi, theta: angle.current.theta })
      raf = requestAnimationFrame(tick)
    }
    tick()
    canvas.style.opacity = '1'
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      globe.destroy()
    }
  }, [])

  return (
    <div className="relative flex h-full w-full items-center overflow-hidden bg-[radial-gradient(circle_at_75%_50%,#1e1b4b_0%,#05050f_65%)] text-white">
      <div className="relative z-10 w-[46%] shrink-0 pl-6">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-indigo-200">
          <Globe2 size={12} /> Global edge network
        </div>
        <h3 className="mt-3 text-2xl leading-tight font-bold tracking-tight">
          世界 <span className="bg-gradient-to-r from-pink-300 to-indigo-300 bg-clip-text text-transparent">7都市</span>
          <br />
          から最速で配信
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-white/55">ドラッグで地球儀を回せます。都市ラベルは裏側に回ると自動で消えます。</p>
      </div>
      <div
        ref={wrapRef}
        className="absolute top-1/2 right-[-6%] aspect-square w-[66%] max-w-[560px] -translate-y-1/2 cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, y: e.clientY }
          ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          if (!drag.current) return
          const dx = (e.clientX - drag.current.x) / 180
          const dy = (e.clientY - drag.current.y) / 260
          angle.current.phi += dx
          angle.current.theta += dy
          vel.current = { phi: dx * 0.5, theta: dy * 0.3 }
          drag.current = { x: e.clientX, y: e.clientY }
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        <canvas ref={canvasRef} className="h-full w-full opacity-0 transition-opacity duration-1000" />
        {CITIES.map((c) => (
          <div
            key={c.id}
            className="pointer-events-none absolute -translate-x-1/2 rounded-full border border-white/15 bg-black/50 px-2 py-0.5 text-[10px] whitespace-nowrap text-white backdrop-blur transition-[opacity,filter] duration-300"
            style={
              {
                positionAnchor: `--cobe-${c.id}`,
                bottom: 'anchor(top)',
                left: 'anchor(center)',
                marginBottom: 6,
                opacity: `var(--cobe-visible-${c.id}, 0)`,
                filter: `blur(calc((1 - var(--cobe-visible-${c.id}, 0)) * 6px))`,
              } as CSSProperties
            }
          >
            {c.name}
          </div>
        ))}
      </div>
    </div>
  )
}
