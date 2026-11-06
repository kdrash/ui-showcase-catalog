import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Copy, Heart, Pencil, Scissors, Share2, X } from 'lucide-react'

const ITEMS = [
  { icon: Copy, label: 'コピー', color: '#38bdf8' },
  { icon: Scissors, label: '切り取り', color: '#a78bfa' },
  { icon: Pencil, label: '編集', color: '#34d399' },
  { icon: Share2, label: '共有', color: '#fbbf24' },
  { icon: Heart, label: 'お気に入り', color: '#f472b6' },
  { icon: X, label: '削除', color: '#f87171' },
]
const R_IN = 34
const R_OUT = 96
const N = ITEMS.length
const GAP = 0.04

function wedge(i: number) {
  const a0 = (i / N) * Math.PI * 2 - Math.PI / 2 - Math.PI / N + GAP
  const a1 = ((i + 1) / N) * Math.PI * 2 - Math.PI / 2 - Math.PI / N - GAP
  const p = (r: number, a: number) => `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`
  return `M${p(R_IN, a0)} L${p(R_OUT, a0)} A${R_OUT} ${R_OUT} 0 0 1 ${p(R_OUT, a1)} L${p(R_IN, a1)} A${R_IN} ${R_IN} 0 0 0 ${p(R_IN, a0)}Z`
}

export function RadialMenu() {
  const root = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [log, setLog] = useState<string>('右クリック / 長押しでメニュー')
  const timer = useRef<number | undefined>(undefined)

  const openAt = (cx: number, cy: number) => {
    const r = root.current!.getBoundingClientRect()
    const x = Math.min(Math.max(cx - r.left, R_OUT + 6), r.width - R_OUT - 6)
    const y = Math.min(Math.max(cy - r.top, R_OUT + 6), r.height - R_OUT - 6)
    setPos({ x, y })
    setHover(null)
  }

  return (
    <div
      ref={root}
      onContextMenu={(e) => {
        e.preventDefault()
        openAt(e.clientX, e.clientY)
      }}
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse') return
        const { clientX, clientY } = e
        timer.current = window.setTimeout(() => openAt(clientX, clientY), 450)
      }}
      onPointerUp={() => clearTimeout(timer.current)}
      onClick={(e) => {
        if (e.target === e.currentTarget && pos) setPos(null)
      }}
      className="relative h-full w-full touch-none overflow-hidden bg-[#0d0f14] font-sans text-white select-none"
      style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.07) 1px, transparent 1px)', backgroundSize: '18px 18px' }}
    >
      <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
        {log}
      </div>
      {!pos && (
        <button
          type="button"
          onClick={(e) => {
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
            openAt(r.left + r.width / 2, r.top + r.height / 2)
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-dashed border-white/20 px-4 py-2 text-sm text-zinc-400 hover:border-white/40 hover:text-white"
        >
          ここをクリックして開く
        </button>
      )}
      <AnimatePresence>
        {pos && (
          <motion.div
            key={`${pos.x}-${pos.y}`}
            className="absolute"
            style={{ left: pos.x, top: pos.y }}
            initial={{ scale: 0.3, opacity: 0, rotate: -40 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 24 }}
          >
            <svg width={R_OUT * 2 + 8} height={R_OUT * 2 + 8} viewBox={`${-R_OUT - 4} ${-R_OUT - 4} ${R_OUT * 2 + 8} ${R_OUT * 2 + 8}`} className="-translate-x-1/2 -translate-y-1/2 overflow-visible drop-shadow-[0_10px_30px_rgba(0,0,0,.6)]">
              {ITEMS.map((it, i) => {
                const a = (i / N) * Math.PI * 2 - Math.PI / 2
                const r = (R_IN + R_OUT) / 2
                const on = hover === i
                const I = it.icon
                return (
                  <motion.g
                    key={it.label}
                    onPointerEnter={() => setHover(i)}
                    onPointerLeave={() => setHover(null)}
                    onClick={() => {
                      setLog(`「${it.label}」を選択しました`)
                      setPos(null)
                    }}
                    animate={{ scale: on ? 1.08 : 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className="cursor-pointer"
                  >
                    <path d={wedge(i)} fill={on ? it.color : 'rgba(39,39,42,.92)'} stroke="rgba(255,255,255,.08)" />
                    <foreignObject x={r * Math.cos(a) - 10} y={r * Math.sin(a) - 10} width={20} height={20} className="pointer-events-none">
                      <I size={20} color={on ? '#0a0a0a' : '#e4e4e7'} />
                    </foreignObject>
                  </motion.g>
                )
              })}
              <circle r={R_IN - 6} fill="#18181b" stroke="rgba(255,255,255,.12)" onClick={() => setPos(null)} className="cursor-pointer" />
              <text textAnchor="middle" dy="4" fontSize="10" fill="#d4d4d8" className="pointer-events-none">
                {hover !== null ? ITEMS[hover].label : '閉じる'}
              </text>
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
