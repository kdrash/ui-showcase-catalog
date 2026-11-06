import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger, useGSAP)

/**
 * Apple 製品ページ風の「画像シーケンスをスクロールでコマ送り」する演出。
 * 実際のサイトでは連番画像(jpg/webp)を使うが、ここでは Canvas 2D で 60 コマを事前描画している。
 * GSAP ScrollTrigger(scroller = カード内のスクロール要素, scrub)で frame を 0→59 に補間し、
 * sticky なキャンバスに drawImage する。見出しも同じスクロールでフェードイン/アウト。
 */

const FRAMES = 60
const W = 800
const H = 600

type Layer = { name: string; fill: string; side: string; draw?: (c: CanvasRenderingContext2D, s: number) => void }

const rr = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  c.beginPath()
  c.roundRect(x, y, w, h, r)
}

const LAYERS: Layer[] = [
  { name: 'Case', fill: '#cbd5e1', side: '#64748b' },
  {
    name: 'Battery',
    fill: '#18181b',
    side: '#09090b',
    draw: (c, s) => {
      c.fillStyle = '#facc15'
      c.font = `bold ${s * 0.12}px Inter`
      c.textAlign = 'center'
      c.fillText('Li-ion 410mAh', 0, s * 0.04)
    },
  },
  {
    name: 'Logic board',
    fill: '#166534',
    side: '#052e16',
    draw: (c, s) => {
      c.fillStyle = '#0f172a'
      c.fillRect(-s * 0.22, -s * 0.22, s * 0.3, s * 0.3)
      c.fillStyle = '#a3a3a3'
      for (let i = 0; i < 5; i++) c.fillRect(s * 0.14, -s * 0.3 + i * s * 0.12, s * 0.16, s * 0.07)
      c.strokeStyle = '#fbbf24'
      c.lineWidth = 2
      c.beginPath()
      c.moveTo(-s * 0.35, s * 0.25)
      c.lineTo(s * 0.05, s * 0.25)
      c.lineTo(s * 0.05, s * 0.1)
      c.stroke()
    },
  },
  {
    name: 'Display',
    fill: '#020617',
    side: '#000',
    draw: (c, s) => {
      const g = c.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2)
      g.addColorStop(0, '#f472b6')
      g.addColorStop(1, '#6366f1')
      c.strokeStyle = g
      c.lineWidth = s * 0.06
      c.beginPath()
      c.arc(0, 0, s * 0.28, -Math.PI / 2, Math.PI)
      c.stroke()
      c.fillStyle = '#fff'
      c.font = `bold ${s * 0.13}px Inter`
      c.textAlign = 'center'
      c.fillText('10:09', 0, s * 0.05)
    },
  },
  { name: 'Glass', fill: 'rgba(255,255,255,0.12)', side: 'rgba(255,255,255,0.25)' },
]

function renderFrame(ctx: CanvasRenderingContext2D, t: number) {
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  const bg = ctx.createRadialGradient(W / 2, H * 0.55, 20, W / 2, H / 2, W * 0.7)
  bg.addColorStop(0, '#27272a')
  bg.addColorStop(1, '#09090b')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
  const explode = Math.sin(ease * Math.PI) // 0 → 1 → 0.2(最後は少し戻る)
  const spread = 14 + explode * 70
  const a = -0.6 + ease * Math.PI * 1.2 // 回転
  const s = 230
  const n = LAYERS.length
  // 影
  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  ctx.beginPath()
  ctx.ellipse(W / 2, H * 0.78, s * 0.75, s * 0.18, 0, 0, Math.PI * 2)
  ctx.filter = 'blur(18px)'
  ctx.fill()
  ctx.filter = 'none'

  LAYERS.forEach((L, i) => {
    const oy = H * 0.52 - (i - (n - 1) / 2) * spread
    const thick = L.name === 'Glass' ? 4 : 10
    // 等角投影した回転平面
    const m = (dy: number) => ctx.setTransform(Math.cos(a), Math.sin(a) * 0.5, -Math.sin(a), Math.cos(a) * 0.5, W / 2, oy + dy)
    m(thick)
    ctx.fillStyle = L.side
    rr(ctx, -s / 2, -s / 2, s, s, s * 0.24)
    ctx.fill()
    m(0)
    ctx.fillStyle = L.fill
    rr(ctx, -s / 2, -s / 2, s, s, s * 0.24)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'
    ctx.lineWidth = 1.5
    ctx.stroke()
    L.draw?.(ctx, s)
    // ラベル(分解時のみ)
    if (explode > 0.35) {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.globalAlpha = Math.min(1, (explode - 0.35) * 3)
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'
      ctx.beginPath()
      ctx.moveTo(W / 2 + s * 0.62, oy)
      ctx.lineTo(W / 2 + s * 0.85, oy)
      ctx.stroke()
      ctx.fillStyle = '#e4e4e7'
      ctx.font = '600 15px Inter'
      ctx.textAlign = 'left'
      ctx.fillText(L.name, W / 2 + s * 0.88, oy + 5)
      ctx.globalAlpha = 1
    }
  })
}

export function ImageSequenceScrub() {
  const root = useRef<HTMLDivElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)

  useGSAP(
    () => {
      // 60コマを事前レンダリング(=連番画像のプリロードに相当)
      const frames = Array.from({ length: FRAMES }, (_, i) => {
        const c = document.createElement('canvas')
        c.width = W
        c.height = H
        renderFrame(c.getContext('2d')!, i / (FRAMES - 1))
        return c
      })
      const view = canvas.current!
      const vctx = view.getContext('2d')!
      const draw = (i: number) => vctx.drawImage(frames[i], 0, 0)
      draw(0)

      const state = { frame: 0 }
      const st = { trigger: track.current!, scroller: scroller.current!, start: 'top top', end: 'bottom bottom', scrub: 0.4 }
      gsap.to(state, {
        frame: FRAMES - 1,
        snap: 'frame',
        ease: 'none',
        scrollTrigger: st,
        onUpdate: () => draw(state.frame),
      })
      const tl = gsap.timeline({ scrollTrigger: { ...st, scrub: true } })
      tl.to('.seq-h1', { opacity: 0, y: -30, duration: 1 })
        .fromTo('.seq-h2', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1 }, 1.2)
        .to('.seq-h2', { opacity: 0, y: -30, duration: 1 }, 3)
        .fromTo('.seq-h3', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1 }, 4)
        .to({}, { duration: 1 })
    },
    { scope: root },
  )

  return (
    <div ref={root} className="relative h-full w-full overflow-hidden bg-[#09090b] text-white">
      <div ref={scroller} className="thin-scroll absolute inset-0 overflow-y-auto [container-type:size]">
        <div ref={track} className="relative h-[500cqh]">
          <div className="sticky top-0 h-[100cqh] overflow-hidden">
            <canvas ref={canvas} width={W} height={H} className="absolute inset-0 h-full w-full object-cover" />
            <div className="pointer-events-none absolute inset-x-0 top-[9%] text-center font-['Inter']">
              <div className="seq-h1 absolute inset-x-0">
                <h2 className="text-[clamp(26px,6cqw,52px)] font-bold tracking-tight">Pulse Watch.</h2>
                <p className="mt-1 text-sm text-zinc-400">スクロールして、中身を見てみよう ↓</p>
              </div>
              <h2 className="seq-h2 absolute inset-x-0 text-[clamp(22px,5cqw,44px)] font-bold tracking-tight opacity-0">
                5層、<span className="text-pink-400">わずか 9.8mm。</span>
              </h2>
              <h2 className="seq-h3 absolute inset-x-0 text-[clamp(22px,5cqw,44px)] font-bold tracking-tight opacity-0">
                <span className="bg-gradient-to-r from-pink-300 to-indigo-300 bg-clip-text text-transparent">すべてが、計算どおり。</span>
              </h2>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
