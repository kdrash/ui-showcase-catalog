import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { art, type ArtKind } from '../_shared/art'

const KINDS: ArtKind[] = ['landscape', 'gradient', 'geometric']
const IMAGES = Array.from({ length: 12 }, (_, i) => art(KINDS[i % 3], i + 2, 320, 400))

/** カーソルの軌跡に画像が次々と現れては消える(Codrops 風 Image Trail) */
export function ImageTrailCursor() {
  const rootRef = useRef<HTMLDivElement>(null)
  const imgsRef = useRef<HTMLImageElement[]>([])
  const counterRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const root = rootRef.current!
    const imgs = imgsRef.current
    let idx = 0
    let z = 1
    let last = { x: -9999, y: -9999 }
    let hovering = false
    let t = 0

    const spawn = (x: number, y: number) => {
      const { width } = root.getBoundingClientRect()
      const w = Math.max(84, Math.min(170, width * 0.17))
      const h = w * 1.25
      const img = imgs[idx % imgs.length]
      const dx = x - last.x
      const dy = y - last.y
      const far = Math.abs(dx) > 400 || Math.abs(dy) > 400
      idx++
      if (counterRef.current) counterRef.current.textContent = String((idx - 1) % imgs.length + 1).padStart(2, '0')
      gsap.killTweensOf(img)
      gsap.set(img, {
        width: w,
        height: h,
        x: x - w / 2 - (far ? 0 : dx * 0.4),
        y: y - h / 2 - (far ? 0 : dy * 0.4),
        zIndex: z++,
        opacity: 1,
        scale: 0.55,
        rotate: gsap.utils.random(-14, 14),
        filter: 'brightness(1.6) saturate(0.4)',
      })
      gsap
        .timeline()
        .to(img, { duration: 0.6, ease: 'expo.out', x: x - w / 2, y: y - h / 2, scale: 1, filter: 'brightness(1) saturate(1)' })
        .to(img, { duration: 0.9, ease: 'power3.in', opacity: 0, scale: 0.2, rotate: '+=12' }, 0.5)
    }

    const check = (x: number, y: number) => {
      const threshold = Math.max(48, root.clientWidth * 0.09)
      if (Math.hypot(x - last.x, y - last.y) > threshold) {
        spawn(x, y)
        last = { x, y }
      }
    }
    const onMove = (e: PointerEvent) => {
      hovering = true
      const r = root.getBoundingClientRect()
      check(e.clientX - r.left, e.clientY - r.top)
    }
    const onLeave = () => (hovering = false)
    // ホバーしていない間は自動で8の字に動かしてデモ表示
    const tick = (_time: number, dt: number) => {
      if (hovering) return
      t += dt / 1000
      const w = root.clientWidth
      const h = root.clientHeight
      check(w / 2 + Math.sin(t * 1.4) * w * 0.34, h / 2 + Math.sin(t * 2.8) * h * 0.26)
    }
    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerleave', onLeave)
    gsap.ticker.add(tick)
    return () => {
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerleave', onLeave)
      gsap.ticker.remove(tick)
      gsap.killTweensOf(imgs)
    }
  }, [])

  return (
    <div ref={rootRef} className="relative h-full w-full cursor-crosshair overflow-hidden bg-[#0c0b0a] select-none [container-type:inline-size]">
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="font-['Playfair_Display'] text-[clamp(40px,12cqw,120px)] leading-none font-black tracking-tight text-[#f3eee6] italic">
            Image Trail
          </div>
          <div className="mt-3 text-xs tracking-[0.35em] text-[#f3eee6]/50 uppercase">move your cursor · カーソルを動かす</div>
        </div>
      </div>
      {IMAGES.map((src, i) => (
        <img
          key={i}
          ref={(el) => {
            if (el) imgsRef.current[i] = el
          }}
          src={src}
          alt=""
          draggable={false}
          className="pointer-events-none absolute top-0 left-0 rounded-md object-cover opacity-0 shadow-2xl shadow-black/60 will-change-transform"
        />
      ))}
      <div className="pointer-events-none absolute bottom-3 left-4 z-[9999] font-mono text-[11px] text-[#f3eee6]/60">
        <span ref={counterRef}>01</span> / {String(IMAGES.length).padStart(2, '0')}
      </div>
      <div className="pointer-events-none absolute right-4 bottom-3 z-[9999] font-mono text-[11px] text-[#f3eee6]/60">GSAP · Image Trail</div>
    </div>
  )
}
