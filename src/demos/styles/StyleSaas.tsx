import { useRef, useState, type MouseEvent } from 'react'
import { motion } from 'motion/react'
import { ArrowRight, Check, Sparkles } from 'lucide-react'

/**
 * SaaS モダン(Linear / Vercel 風)
 * ほぼ黒の背景 + 細い方眼 + 上からの紫グロー。カードは 1px の半透明ボーダーに
 * マウス位置を追うボーダースポットライト(radial-gradient を mask で枠だけ見せる)。
 * 見出しは白→グレーのグラデーション文字、ボタンは白ベタ(グロー付き)と暗いゴースト。
 */
const STATS = [
  ['128', 'Posts'],
  ['2.4k', 'Followers'],
  ['312', 'Following'],
] as const

export function StyleSaas() {
  const cardRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: 150, y: 0 })
  const [notify, setNotify] = useState(true)
  const [volume, setVolume] = useState(72)
  const [following, setFollowing] = useState(false)

  const onMove = (e: MouseEvent) => {
    const r = cardRef.current?.getBoundingClientRect()
    if (r) setPos({ x: e.clientX - r.left, y: e.clientY - r.top })
  }

  return (
    <div
      className="relative grid h-full w-full place-items-center overflow-hidden text-[#f7f8f8]"
      style={{ background: '#08090a', fontFamily: 'Inter, sans-serif' }}
    >
      {/* grid + glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 0%, #000 30%, transparent 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[600px] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
        style={{ background: 'radial-gradient(closest-side, #5e6ad2, transparent)' }}
      />

      <div
        ref={cardRef}
        onMouseMove={onMove}
        className="group relative w-[310px] rounded-2xl p-px"
        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.04))' }}
      >
        {/* border spotlight */}
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `radial-gradient(220px circle at ${pos.x}px ${pos.y}px, rgba(139,148,255,0.9), transparent 60%)`,
            WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            padding: 1,
          }}
        />
        <div className="relative rounded-[15px] p-5" style={{ background: 'linear-gradient(180deg,#111214,#0b0c0d)' }}>
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-[#b4bcd0]">
            <Sparkles size={11} className="text-[#8b94ff]" /> New profile v2.0
            <ArrowRight size={11} />
          </div>
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-[#5e6ad2] to-[#b06ab3] text-sm font-semibold shadow-[0_0_24px_rgba(94,106,210,0.5)]">
              MS
            </div>
            <div>
              <p
                className="bg-clip-text text-[19px] font-semibold tracking-[-0.02em] text-transparent"
                style={{ backgroundImage: 'linear-gradient(180deg,#ffffff 30%,#8a8f98)' }}
              >
                Mika Sato
              </p>
              <p className="text-xs text-[#8a8f98]">Product Designer · Tokyo</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.08]">
            {STATS.map(([v, l]) => (
              <div key={l} className="bg-[#0e0f11] py-2 text-center">
                <p className="text-[15px] font-medium tabular-nums">{v}</p>
                <p className="text-[10px] uppercase tracking-wider text-[#62666d]">{l}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between text-[13px]">
            <span className="text-[#b4bcd0]">Notifications</span>
            <button
              role="switch"
              aria-checked={notify}
              aria-label="Notifications"
              onClick={() => setNotify((v) => !v)}
              className="relative h-5 w-9 rounded-full border border-white/10 transition-colors"
              style={{ background: notify ? '#5e6ad2' : '#1c1d20', boxShadow: notify ? '0 0 12px rgba(94,106,210,.6)' : 'none' }}
            >
              <motion.span
                className="absolute left-[2px] top-[2px] h-3.5 w-3.5 rounded-full bg-white"
                animate={{ x: notify ? 16 : 0 }}
                transition={{ type: 'spring', stiffness: 600, damping: 35 }}
              />
            </button>
          </div>

          <div className="mt-3">
            <div className="mb-1.5 flex justify-between text-[13px]">
              <span className="text-[#b4bcd0]">Volume</span>
              <span className="font-mono text-[11px] text-[#62666d]">{volume}%</span>
            </div>
            <div className="relative h-3">
              <input
                type="range"
                value={volume}
                onChange={(e) => setVolume(+e.target.value)}
                aria-label="Volume"
                className="absolute inset-0 z-10 w-full cursor-pointer opacity-0"
              />
              <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[#1c1d20]" />
              <div
                className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full"
                style={{ width: `${volume}%`, background: 'linear-gradient(90deg,#5e6ad2,#b4a1ff)' }}
              />
              <div
                className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white shadow-[0_0_10px_rgba(180,161,255,.9)]"
                style={{ left: `calc(${volume}% - ${volume * 0.12}px)` }}
              />
            </div>
          </div>

          <input
            placeholder="Set status… ⌘S"
            className="mt-4 h-9 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-[13px] text-white outline-none transition placeholder:text-[#62666d] focus:border-[#5e6ad2] focus:shadow-[0_0_0_3px_rgba(94,106,210,0.25)]"
          />

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => setFollowing((f) => !f)}
              className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-white text-[13px] font-medium text-black shadow-[0_0_20px_rgba(255,255,255,0.25)] transition hover:shadow-[0_0_28px_rgba(255,255,255,0.45)]"
            >
              {following && <Check size={14} />}
              {following ? 'Following' : 'Follow'}
            </button>
            <button className="h-9 rounded-lg border border-white/10 bg-white/[0.04] text-[13px] font-medium text-[#e6e6e6] transition hover:bg-white/[0.08]">
              Message
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
