import { useId, useRef, type PointerEvent } from 'react'

/**
 * ラバランプ風メタボール (SVG フィルター + CSS)
 * - SVG <filter>: feGaussianBlur でぼかし → feColorMatrix でアルファを急峻にして「くっつく」形に
 * - その filter を CSS `filter: url(#id)` で丸の集合に適用 → 近づいた丸同士がヌルっと融合
 * - 丸は @keyframes で上下にゆらゆら。1つはマウスに追従 (CSS変数) して他と融合する
 */

const css = `
.goo-blob { position: absolute; border-radius: 9999px; }
.goo-a { width: 22%; aspect-ratio: 1; left: 12%; animation: goo-rise 11s ease-in-out infinite alternate; }
.goo-b { width: 16%; aspect-ratio: 1; left: 38%; animation: goo-rise 8s ease-in-out -3s infinite alternate; }
.goo-c { width: 26%; aspect-ratio: 1; left: 58%; animation: goo-rise 13s ease-in-out -6s infinite alternate; }
.goo-d { width: 13%; aspect-ratio: 1; left: 80%; animation: goo-rise 9s ease-in-out -1s infinite alternate; }
.goo-e { width: 18%; aspect-ratio: 1; left: 28%; animation: goo-rise 15s ease-in-out -9s infinite alternate-reverse; }
.goo-cursor {
  width: 14%; aspect-ratio: 1; left: 0; top: 0;
  transform: translate(calc(var(--mx, -200px) - 50%), calc(var(--my, -200px) - 50%));
  transition: transform .18s ease-out;
}
@keyframes goo-rise {
  0%   { top: 105%; transform: translateY(0) scale(.9); }
  50%  { transform: translateY(-10%) scale(1.1); }
  100% { top: -25%; transform: translateY(0) scale(.95); }
}
@media (prefers-reduced-motion: reduce) { :root:not([data-motion=full]) .goo-blob { animation-duration: 60s; } } :root[data-motion=reduce] .goo-blob { animation-duration: 60s; }
`

export function GooeyBlobs() {
  const rawId = useId()
  const filterId = `goo-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`
  const rootRef = useRef<HTMLDivElement>(null)

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = rootRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - r.left}px`)
    el.style.setProperty('--my', `${e.clientY - r.top}px`)
  }

  return (
    <div
      ref={rootRef}
      onPointerMove={onMove}
      className="relative h-full w-full overflow-hidden bg-gradient-to-b from-[#1a0b2e] via-[#3b0d3f] to-[#5c1430]"
    >
      <style>{css}</style>
      <svg className="absolute h-0 w-0" aria-hidden>
        <defs>
          <filter id={filterId}>
            <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 28 -11" />
          </filter>
        </defs>
      </svg>

      <div className="absolute inset-0" style={{ filter: `url(#${filterId})` }}>
        <div className="goo-blob goo-a bg-gradient-to-br from-orange-400 to-pink-500" />
        <div className="goo-blob goo-b bg-gradient-to-br from-amber-300 to-orange-500" />
        <div className="goo-blob goo-c bg-gradient-to-br from-pink-500 to-fuchsia-600" />
        <div className="goo-blob goo-d bg-gradient-to-br from-rose-400 to-orange-400" />
        <div className="goo-blob goo-e bg-gradient-to-br from-fuchsia-500 to-rose-500" />
        <div className="goo-blob goo-cursor bg-gradient-to-br from-yellow-300 to-orange-500" />
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-6 text-center">
        <h3 className="text-3xl text-white italic" style={{ fontFamily: "'Playfair Display', serif" }}>
          Liquid motion
        </h3>
        <p className="mt-1 text-xs text-white/60">マウスで動かす玉が他の玉とヌルっと融合します</p>
      </div>
    </div>
  )
}
