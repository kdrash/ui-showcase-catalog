import { useEffect, useRef, useState } from 'react'
import Zdog from 'zdog'

const TAU = Zdog.TAU as number

/** Zdog の擬似3Dで描く「ゆるい惑星くん」。ドラッグで回転、離すと自動回転 */
export function ZdogIllustration() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [spin, setSpin] = useState(true)
  const spinRef = useRef(spin)
  spinRef.current = spin

  useEffect(() => {
    const canvas = canvasRef.current!
    let dragging = false
    const illo = new Zdog.Illustration({
      element: canvas,
      resize: true,
      dragRotate: true,
      rotate: { x: -0.25, y: 0.4 },
      onDragStart: () => (dragging = true),
      onDragEnd: () => (dragging = false),
    })
    const fit = () => {
      illo.setMeasuredSize()
      illo.zoom = Math.min(illo.width, illo.height) / 300
    }
    fit()

    // 惑星
    const planet = new Zdog.Shape({ addTo: illo, stroke: 120, color: '#ffb4a2' })
    new Zdog.Shape({ addTo: planet, stroke: 100, translate: { z: 6 }, color: '#ffcdb2' })
    const face = new Zdog.Anchor({ addTo: illo, translate: { z: 60 } })
    for (const x of [-16, 16]) {
      new Zdog.Ellipse({ addTo: face, diameter: 7, quarters: 2, rotate: { z: -TAU / 4 }, translate: { x, y: -4 }, stroke: 4, color: '#3d2c2e' })
      new Zdog.Shape({ addTo: face, stroke: 10, translate: { x: x * 1.7, y: 8, z: -4 }, color: '#ff8fa3' })
    }
    new Zdog.Ellipse({ addTo: face, diameter: 12, quarters: 2, rotate: { z: TAU / 4 }, translate: { y: 8 }, stroke: 3.5, color: '#3d2c2e' })
    // 模様のクレーター
    ;[
      { x: -35, y: -30, z: 42, s: 14 },
      { x: 40, y: 25, z: 38, s: 10 },
      { x: -20, y: 45, z: -40, s: 16 },
      { x: 30, y: -40, z: -38, s: 12 },
    ].forEach((c) => new Zdog.Shape({ addTo: illo, stroke: c.s, translate: c, color: '#e5989b' }))
    // リング
    const ringAnchor = new Zdog.Anchor({ addTo: illo, rotate: { x: TAU / 4 - 0.35, y: 0.2 } })
    new Zdog.Ellipse({ addTo: ringAnchor, diameter: 190, stroke: 7, color: '#b5838d' })
    new Zdog.Ellipse({ addTo: ringAnchor, diameter: 172, stroke: 3, color: '#ffd6a5' })
    // 旗
    const flag = new Zdog.Anchor({ addTo: illo, translate: { y: -58 }, rotate: { z: 0.2 } })
    new Zdog.Shape({ addTo: flag, path: [{ y: 0 }, { y: -36 }], stroke: 2.5, color: '#6d597a' })
    new Zdog.Shape({ addTo: flag, path: [{ y: -36 }, { x: 18, y: -30 }, { y: -24 }], fill: true, stroke: 2, color: '#43aa8b' })
    // 衛星
    const orbit = new Zdog.Anchor({ addTo: illo, rotate: { x: 0.5, z: 0.3 } })
    const moon = new Zdog.Shape({ addTo: orbit, stroke: 26, translate: { x: 125 }, color: '#bde0fe' })
    new Zdog.Shape({ addTo: moon, stroke: 6, translate: { x: -5, y: -4, z: 9 }, color: '#a2d2ff' })
    // 星
    const stars = new Zdog.Anchor({ addTo: illo })
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * TAU
      const b = Math.acos(Math.random() * 2 - 1)
      const r = 170 + Math.random() * 40
      new Zdog.Shape({
        addTo: stars,
        stroke: 2 + Math.random() * 3,
        translate: { x: r * Math.sin(b) * Math.cos(a), y: r * Math.cos(b), z: r * Math.sin(b) * Math.sin(a) },
        color: i % 3 ? '#fff1c1' : '#ffffff',
      })
    }

    const ro = new ResizeObserver(fit)
    ro.observe(canvas)
    let raf = 0
    let t = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      t += 1 / 60
      if (spinRef.current && !dragging) illo.rotate.y += 0.008
      orbit.rotate.y += 0.02
      moon.rotate.y -= 0.02
      planet.translate.y = face.translate.y = Math.sin(t * 2) * 3
      flag.rotate.z = 0.2 + Math.sin(t * 3) * 0.06
      illo.updateRenderGraph()
    }
    tick()
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      illo.setResize(false)
    }
  }, [])

  return (
    <div className="relative h-full w-full overflow-hidden bg-[radial-gradient(circle_at_50%_40%,#4a3f6b,#1d1630_70%)]">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full cursor-grab active:cursor-grabbing" />
      <div className="pointer-events-none absolute top-3 left-4 font-[Space_Grotesk] text-white">
        <div className="text-lg font-bold">Planet Pon</div>
        <div className="text-[11px] text-white/50">ドラッグで回転 ・ Zdog の擬似3D</div>
      </div>
      <button
        type="button"
        onClick={() => setSpin((s) => !s)}
        className="absolute top-3 right-3 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] text-white backdrop-blur hover:bg-white/20"
      >
        自動回転 {spin ? 'ON' : 'OFF'}
      </button>
    </div>
  )
}
