import { useEffect, useRef, useState } from 'react'
import { Application, DisplacementFilter, Particle, ParticleContainer, Sprite, Texture } from 'pixi.js'

const WORDS = ['PIXI', '創造', 'HELLO', '✦']
const COUNT = 4000

function glowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.25, 'rgba(255,255,255,.55)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 64, 64)
  return Texture.from(c)
}
function noiseTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  const img = g.createImageData(256, 256)
  for (let y = 0; y < 256; y++)
    for (let x = 0; x < 256; x++) {
      const i = (y * 256 + x) * 4
      img.data[i] = 128 + 127 * Math.sin(x * 0.07 + Math.sin(y * 0.05) * 2)
      img.data[i + 1] = 128 + 127 * Math.cos(y * 0.06 + Math.sin(x * 0.04) * 2)
      img.data[i + 3] = 255
    }
  g.putImageData(img, 0, 0)
  return Texture.from(c)
}
/** 文字をオフスクリーンCanvasに描いて、塗られたピクセルの座標を集める */
function sampleText(text: string, w: number, h: number, n: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')!
  g.fillStyle = '#fff'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.font = `900 ${Math.min(h * 0.62, (w / Math.max(2, text.length)) * 1.5)}px Inter, "Noto Sans JP", sans-serif`
  g.fillText(text, w / 2, h / 2)
  const d = g.getImageData(0, 0, w, h).data
  const pts: [number, number][] = []
  const step = 3
  for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) if (d[(y * w + x) * 4 + 3] > 128) pts.push([x, y])
  return Array.from({ length: n }, (_, i) => pts.length ? pts[(i * 7919) % pts.length] : ([w / 2, h / 2] as [number, number]))
}

/** PixiJS v8 の ParticleContainer で数千個の発光パーティクル(カーソル追従/文字形成) */
export function PixiParticles() {
  const hostRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<'follow' | 'text'>('text')
  const [word, setWord] = useState(0)
  const [haze, setHaze] = useState(true)
  const [fps, setFps] = useState(0)
  const api = useRef<{ setMode: (m: 'follow' | 'text', w: number) => void; setHaze: (b: boolean) => void } | null>(null)

  useEffect(() => {
    const host = hostRef.current!
    let destroyed = false
    let ready = false
    const app = new Application()
    const cleanups: (() => void)[] = []
    ;(async () => {
      await app.init({ resizeTo: host, backgroundAlpha: 0, antialias: false, autoDensity: true, resolution: Math.min(2, window.devicePixelRatio), preference: 'webgl' })
      if (destroyed) {
        app.destroy(true)
        return
      }
      ready = true
      host.appendChild(app.canvas)
      const tex = glowTexture()
      const container = new ParticleContainer({ texture: tex, dynamicProperties: { position: true, color: false, rotation: false, vertex: false } })
      container.blendMode = 'add'
      const W = () => app.screen.width
      const H = () => app.screen.height
      const ps: { p: Particle; vx: number; vy: number; tx: number; ty: number }[] = []
      const hues = [0xf472b6, 0x818cf8, 0x22d3ee, 0xfbbf24, 0xa78bfa]
      for (let i = 0; i < COUNT; i++) {
        const s = 0.08 + Math.random() * 0.16
        const p = new Particle({ texture: tex, x: Math.random() * W(), y: Math.random() * H(), scaleX: s, scaleY: s, anchorX: 0.5, anchorY: 0.5, tint: hues[i % hues.length], alpha: 0.9 })
        container.addParticle(p)
        ps.push({ p, vx: 0, vy: 0, tx: 0, ty: 0 })
      }
      app.stage.addChild(container)
      const noise = new Sprite(noiseTexture())
      noise.texture.source.addressMode = 'repeat'
      noise.scale.set(2)
      app.stage.addChild(noise)
      noise.renderable = false
      const disp = new DisplacementFilter({ sprite: noise, scale: 18 })
      container.filters = [disp]

      let mode: 'follow' | 'text' = 'text'
      let wordIdx = 0
      const retarget = () => {
        const pts = sampleText(WORDS[wordIdx], Math.floor(W()), Math.floor(H()), COUNT)
        ps.forEach((q, i) => {
          q.tx = pts[i][0] + (Math.random() - 0.5) * 2
          q.ty = pts[i][1] + (Math.random() - 0.5) * 2
        })
      }
      retarget()
      api.current = {
        setMode: (m, w) => {
          mode = m
          wordIdx = w
          if (m === 'text') retarget()
          else ps.forEach((q) => ((q.vx += (Math.random() - 0.5) * 12), (q.vy += (Math.random() - 0.5) * 12)))
        },
        setHaze: (b) => (container.filters = b ? [disp] : []),
      }
      const mouse = { x: W() / 2, y: H() / 2, active: false }
      const onMove = (e: PointerEvent) => {
        const r = host.getBoundingClientRect()
        mouse.x = e.clientX - r.left
        mouse.y = e.clientY - r.top
        mouse.active = true
      }
      const onLeave = () => (mouse.active = false)
      host.addEventListener('pointermove', onMove)
      host.addEventListener('pointerleave', onLeave)
      cleanups.push(() => {
        host.removeEventListener('pointermove', onMove)
        host.removeEventListener('pointerleave', onLeave)
      })
      let lastW = W()
      let lastH = H()
      let t = 0
      let fpsT = 0
      app.ticker.add((tk) => {
        const dt = Math.min(tk.deltaTime, 2)
        t += dt / 60
        if (Math.abs(W() - lastW) > 2 || Math.abs(H() - lastH) > 2) {
          lastW = W()
          lastH = H()
          if (mode === 'text') retarget()
        }
        noise.x = (noise.x - 0.6 * dt) % 512
        noise.y = (noise.y - 0.4 * dt) % 512
        const cx = mouse.active ? mouse.x : W() / 2 + Math.cos(t * 0.8) * W() * 0.25
        const cy = mouse.active ? mouse.y : H() / 2 + Math.sin(t * 1.1) * H() * 0.25
        for (const q of ps) {
          const p = q.p
          if (mode === 'text') {
            q.vx += (q.tx - p.x) * 0.012
            q.vy += (q.ty - p.y) * 0.012
            if (mouse.active) {
              const dx = p.x - mouse.x
              const dy = p.y - mouse.y
              const d2 = dx * dx + dy * dy
              if (d2 < 4200) {
                const f = (4200 - d2) / 4200
                q.vx += dx * f * 0.25
                q.vy += dy * f * 0.25
              }
            }
            q.vx *= 0.86
            q.vy *= 0.86
          } else {
            const dx = cx - p.x
            const dy = cy - p.y
            const d = Math.sqrt(dx * dx + dy * dy) + 20
            q.vx += (dx / d) * 0.35 - (dy / d) * 0.25
            q.vy += (dy / d) * 0.35 + (dx / d) * 0.25
            q.vx *= 0.97
            q.vy *= 0.97
          }
          p.x += q.vx * dt
          p.y += q.vy * dt
        }
        fpsT += tk.deltaMS
        if (fpsT > 500) {
          fpsT = 0
          setFps(Math.round(app.ticker.FPS))
        }
      })
    })()
    return () => {
      destroyed = true
      cleanups.forEach((f) => f())
      api.current = null
      if (ready) app.destroy(true, { children: true, texture: true })
    }
  }, [])

  useEffect(() => api.current?.setMode(mode, word), [mode, word])
  useEffect(() => api.current?.setHaze(haze), [haze])

  return (
    <div className="relative h-full w-full overflow-hidden bg-[radial-gradient(ellipse_at_center,#1a1035,#05040b_70%)]">
      <div ref={hostRef} className="absolute inset-0 [&_canvas]:block" onClick={() => mode === 'text' && setWord((w) => (w + 1) % WORDS.length)} />
      <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full border border-white/10 bg-black/40 p-1 text-[11px] backdrop-blur">
        {(['text', 'follow'] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)} className={`rounded-full px-2.5 py-1 transition ${mode === m ? 'bg-white text-black' : 'text-white/70'}`}>
            {m === 'text' ? '文字を形成' : 'カーソル追従'}
          </button>
        ))}
        <button type="button" onClick={() => setHaze((h) => !h)} className={`rounded-full px-2.5 py-1 transition ${haze ? 'text-fuchsia-300' : 'text-white/50'}`}>
          Displacement {haze ? 'ON' : 'OFF'}
        </button>
      </div>
      <div className="absolute top-3 right-3 rounded-md bg-black/50 px-2 py-1 font-mono text-[10px] text-emerald-300">
        {COUNT.toLocaleString()} sprites · {fps} FPS
      </div>
      {mode === 'text' && <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-white/40">クリックで文字を切替 ・ カーソルで散らす</div>}
    </div>
  )
}
