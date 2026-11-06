import { useEffect, useRef } from 'react'
import '@fontsource-variable/roboto-flex/full.css'

const WORD = 'PRESSURE'

/** 可変フォント(Roboto Flex)の wght / wdth / opsz をカーソルとの距離で1文字ずつ変える */
export function TextPressure() {
  const rootRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<HTMLDivElement>(null)
  const spans = useRef<HTMLSpanElement[]>([])

  useEffect(() => {
    const root = rootRef.current!
    const line = lineRef.current!
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 }
    let hovering = false
    let t = 0
    let raf = 0
    const fit = () => {
      line.style.fontSize = `${Math.min(root.clientWidth / (WORD.length * 0.62), root.clientHeight * 0.48)}px`
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(root)
    const onMove = (e: PointerEvent) => {
      const r = root.getBoundingClientRect()
      mouse.tx = e.clientX - r.left
      mouse.ty = e.clientY - r.top
      hovering = true
    }
    const onLeave = () => (hovering = false)
    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerleave', onLeave)
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const rr = root.getBoundingClientRect()
      if (!hovering) {
        t += 0.016
        mouse.tx = rr.width * (0.5 + Math.sin(t * 0.9) * 0.42)
        mouse.ty = rr.height * 0.45
      }
      mouse.x += (mouse.tx - mouse.x) * 0.12
      mouse.y += (mouse.ty - mouse.y) * 0.12
      const maxD = rr.width * 0.32
      for (const s of spans.current) {
        const b = s.getBoundingClientRect()
        const cx = b.left - rr.left + b.width / 2
        const cy = b.top - rr.top + b.height / 2
        const d = Math.hypot(mouse.x - cx, (mouse.y - cy) * 0.6)
        const k = Math.max(0, 1 - d / maxD)
        const e = k * k * (3 - 2 * k)
        s.style.fontVariationSettings = `'wght' ${Math.round(150 + 850 * e)}, 'wdth' ${Math.round(40 + 111 * e)}, 'opsz' ${Math.round(8 + 136 * e)}, 'slnt' ${(-10 * e).toFixed(1)}`
        s.style.color = `color-mix(in oklab, #f5f5f4 ${Math.round(100 - e * 100)}%, #ff5a36)`
      }
    }
    loop()
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return (
    <div ref={rootRef} className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#0d0d0c] select-none">
      <div
        ref={lineRef}
        className="flex leading-none whitespace-nowrap text-stone-100"
        style={{ fontFamily: "'Roboto Flex Variable', sans-serif", fontVariationSettings: "'wght' 150, 'wdth' 40" }}
      >
        {WORD.split('').map((c, i) => (
          <span
            key={i}
            ref={(el) => {
              if (el) spans.current[i] = el
            }}
            className="inline-block"
          >
            {c}
          </span>
        ))}
      </div>
      <div className="mt-4 text-[11px] tracking-[0.25em] text-stone-500 uppercase">wght · wdth · opsz · slnt — カーソルに近い文字ほど太く広く</div>
    </div>
  )
}
