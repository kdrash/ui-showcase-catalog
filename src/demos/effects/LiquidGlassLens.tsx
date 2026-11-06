import { Fragment, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { House, Music, Search, Settings } from 'lucide-react'
import { art } from '../_shared/art'

const BG = art('landscape', 5, 1400, 900)

/**
 * 角丸矩形のふち(bezel)だけ内側へ屈折させる変位マップを Canvas で生成。
 * R = x方向, G = y方向(128 が変位ゼロ)。feDisplacementMap に渡す。
 */
function useDisplacementMap(w: number, h: number, radius: number, bezel: number) {
  return useMemo(() => {
    if (w < 2 || h < 2) return ''
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const ctx = c.getContext('2d')!
    const img = ctx.createImageData(w, h)
    const r = Math.min(radius, w / 2, h / 2)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const px = x + 0.5 - w / 2
        const py = y + 0.5 - h / 2
        const qx = Math.abs(px) - (w / 2 - r)
        const qy = Math.abs(py) - (h / 2 - r)
        const sdf = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r
        const d = -sdf // 縁からの内側距離
        let dx = 0
        let dy = 0
        if (d > 0 && d < bezel) {
          let nx: number
          let ny: number
          if (qx > 0 && qy > 0) {
            const l = Math.hypot(qx, qy) || 1
            nx = (Math.sign(px) * qx) / l
            ny = (Math.sign(py) * qy) / l
          } else if (qx > qy) {
            nx = Math.sign(px)
            ny = 0
          } else {
            nx = 0
            ny = Math.sign(py)
          }
          const t = 1 - d / bezel
          const mag = t * t * (3 - 2 * t)
          dx = -nx * mag // 内側の画素を引き込む(屈折)
          dy = -ny * mag
        }
        const i = (y * w + x) * 4
        img.data[i] = 128 + dx * 127
        img.data[i + 1] = 128 + dy * 127
        img.data[i + 2] = 128
        img.data[i + 3] = 255
      }
    ctx.putImageData(img, 0, 0)
    return c.toDataURL()
  }, [w, h, radius, bezel])
}

/** 背景シーン(本体とガラス内のコピーで同じものを描く) */
function Scene() {
  return (
    <div className="absolute inset-0" style={{ backgroundImage: `url("${BG}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white">
        <div className="font-['Space_Grotesk'] text-[clamp(44px,12cqw,130px)] leading-[0.85] font-bold tracking-tighter drop-shadow-lg">
          LIQUID
          <br />
          GLASS
        </div>
        <div className="mt-4 flex gap-2">
          {['#f43f5e', '#f59e0b', '#22c55e', '#0ea5e9', '#a855f7'].map((c) => (
            <span key={c} className="h-3 w-10 rounded-full" style={{ background: c }} />
          ))}
        </div>
      </div>
      <div
        className="absolute inset-x-0 top-[12%] h-6 opacity-70"
        style={{ background: 'repeating-linear-gradient(90deg, #fff 0 10px, transparent 10px 22px)' }}
      />
    </div>
  )
}

function Glass({
  x,
  y,
  w,
  h,
  radius,
  size,
  children,
  onPointerDown,
  className = '',
}: {
  x: number
  y: number
  w: number
  h: number
  radius: number
  size: { w: number; h: number }
  children?: ReactNode
  onPointerDown?: (e: React.PointerEvent) => void
  className?: string
}) {
  const id = 'lg' + useId().replace(/:/g, '')
  const map = useDisplacementMap(Math.round(w), Math.round(h), radius, Math.min(w, h) * 0.2)
  const s = Math.min(w, h) * 0.4
  return (
    <div
      className={`absolute ${className}`}
      style={{ left: x, top: y, width: w, height: h, borderRadius: radius }}
      onPointerDown={onPointerDown}
    >
      <svg width="0" height="0" className="absolute">
        <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feImage href={map} colorInterpolationFilters="sRGB" x="0" y="0" width={w} height={h} preserveAspectRatio="none" result="map" />
          {[
            ['R', 1, '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0'],
            ['G', 1.04, '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0'],
            ['B', 1.08, '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0'],
          ].map(([c, k, m]) => (
            <Fragment key={c as string}>
              <feDisplacementMap colorInterpolationFilters="sRGB" in="SourceGraphic" in2="map" scale={s * (k as number)} xChannelSelector="R" yChannelSelector="G" result={`d${c}`} />
              <feColorMatrix in={`d${c}`} type="matrix" values={m as string} result={`c${c}`} />
            </Fragment>
          ))}
          <feBlend in="cR" in2="cG" mode="screen" result="rg" />
          <feBlend in="rg" in2="cB" mode="screen" />
        </filter>
      </svg>
      {/* 屈折した背景のコピー(少し拡大) */}
      <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: radius, filter: `url(#${id}) saturate(1.2) brightness(1.06)` }}>
        <div
          className="absolute [container-type:inline-size]"
          style={{
            left: -x,
            top: -y,
            width: size.w,
            height: size.h,
            transform: 'scale(1.12)',
            transformOrigin: `${x + w / 2}px ${y + h / 2}px`,
          }}
        >
          <Scene />
        </div>
      </div>
      {/* スペキュラー(縁のハイライト)と影 */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          borderRadius: radius,
          boxShadow:
            'inset 0 0 0 1px rgba(255,255,255,.45), inset 1.5px 2px 1px -0.5px rgba(255,255,255,.85), inset -1px -2px 2px rgba(255,255,255,.35), inset 0 -10px 20px -12px rgba(0,0,0,.35), 0 12px 32px rgba(0,0,0,.28)',
          background: 'linear-gradient(160deg, rgba(255,255,255,.22), rgba(255,255,255,0) 40%, rgba(255,255,255,.06))',
        }}
      />
      {children && <div className="relative h-full w-full">{children}</div>}
    </div>
  )
}

/** Apple 2025 風「Liquid Glass」— SVG feDisplacementMap による屈折レンズとガラスのツールバー */
export function LiquidGlassLens() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [active, setActive] = useState(0)
  const drag = useRef<{ dx: number; dy: number } | null>(null)
  const placed = useRef(false)

  useLayoutEffect(() => {
    const el = rootRef.current!
    const ro = new ResizeObserver(() => {
      const s = { w: el.clientWidth, h: el.clientHeight }
      setSize(s)
      if (!placed.current) {
        placed.current = true
        const d = Math.min(170, s.h * 0.48)
        setPos({ x: s.w * 0.62 - d / 2, y: s.h * 0.4 - d / 2 })
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const lens = Math.round(Math.min(170, size.h * 0.48))
  const bar = { w: Math.min(280, size.w - 32), h: 56 }

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!drag.current || !rootRef.current) return
      const r = rootRef.current.getBoundingClientRect()
      setPos({
        x: Math.max(-lens / 3, Math.min(r.width - (lens * 2) / 3, e.clientX - r.left - drag.current.dx)),
        y: Math.max(-lens / 3, Math.min(r.height - (lens * 2) / 3, e.clientY - r.top - drag.current.dy)),
      })
    }
    const up = () => (drag.current = null)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [lens])

  const icons = [House, Search, Music, Settings]

  return (
    <div ref={rootRef} className="relative h-full w-full overflow-hidden bg-black select-none [container-type:inline-size]">
      <Scene />
      {size.w > 0 && (
        <>
          <Glass
            x={pos.x}
            y={pos.y}
            w={lens}
            h={lens}
            radius={lens / 2}
            size={size}
            className="z-10 cursor-grab touch-none active:cursor-grabbing"
            onPointerDown={(e) => {
              const r = rootRef.current!.getBoundingClientRect()
              drag.current = { dx: e.clientX - r.left - pos.x, dy: e.clientY - r.top - pos.y }
            }}
          />
          <Glass x={(size.w - bar.w) / 2} y={size.h - bar.h - 16} w={bar.w} h={bar.h} radius={bar.h / 2} size={size}>
            <div className="flex h-full items-center justify-around px-2">
              {icons.map((Icon, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActive(i)}
                  className={`grid h-10 w-14 place-items-center rounded-full transition ${
                    active === i ? 'bg-white/35 text-white shadow-inner' : 'text-white/85 hover:bg-white/15'
                  }`}
                >
                  <Icon size={20} strokeWidth={2.2} className="drop-shadow" />
                </button>
              ))}
            </div>
          </Glass>
        </>
      )}
      <div className="pointer-events-none absolute top-3 left-4 rounded-full bg-black/30 px-2.5 py-1 text-[11px] text-white/90 backdrop-blur">
        レンズをドラッグ
      </div>
    </div>
  )
}
