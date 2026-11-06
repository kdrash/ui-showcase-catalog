import { useState, type MouseEvent } from 'react'
import { motion, useMotionTemplate, useMotionValue } from 'motion/react'
import { Check, Command } from 'lucide-react'

/**
 * Dark Tech (Linear / Vercel 風)
 * ほぼ黒 #08090a の背景 + マスクしたグリッド + 上部のブランド色グロー (#5e6ad2)。
 * カードは 1px の白 8% ボーダー + 上辺の内側ハイライト。マウス位置にスポットライトと
 * ボーダーの発光が追従する (mask-composite で枠線部分だけを光らせるテクニック)。
 */
export function StyleDarkTech() {
  const [notify, setNotify] = useState(true)
  const [volume, setVolume] = useState(48)
  const [following, setFollowing] = useState(false)

  const mx = useMotionValue(-400)
  const my = useMotionValue(-400)
  const spotlight = useMotionTemplate`radial-gradient(260px circle at ${mx}px ${my}px, rgba(94,106,210,0.16), transparent 70%)`
  const borderGlow = useMotionTemplate`radial-gradient(180px circle at ${mx}px ${my}px, rgba(140,150,255,0.9), transparent 70%)`

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    mx.set(e.clientX - r.left)
    my.set(e.clientY - r.top)
  }

  return (
    <div className="relative grid h-full w-full place-items-center overflow-hidden font-sans text-[#f7f8f8]" style={{ background: '#08090a' }}>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(ellipse at center, #000 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, #000 30%, transparent 75%)',
        }}
      />
      <div className="absolute inset-x-0 top-0 h-48" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(94,106,210,0.35), transparent 70%)' }} />

      <div
        onMouseMove={onMove}
        onMouseLeave={() => {
          mx.set(-400)
          my.set(-400)
        }}
        className="relative w-[300px] rounded-xl p-5"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015)), #0d0e10',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 0 0 1px rgba(0,0,0,0.6), 0 24px 48px -12px rgba(0,0,0,0.9)',
        }}
      >
        {/* cursor-following border glow (padding:1px + mask-composite で枠だけ表示) */}
        <motion.div
          className="pointer-events-none absolute -inset-px rounded-xl"
          style={{
            background: borderGlow,
            padding: 1,
            WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
            WebkitMaskComposite: 'xor',
            mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
            maskComposite: 'exclude',
          }}
        />
        <motion.div className="pointer-events-none absolute inset-0 rounded-xl" style={{ background: spotlight }} />

        <div className="relative">
          {/* header */}
          <div className="flex items-center gap-3">
            <div
              className="grid h-9 w-9 place-items-center rounded-full text-xs font-semibold"
              style={{ background: 'linear-gradient(135deg,#5e6ad2,#b78bf0)' }}
            >
              MS
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Mika Sato</p>
              <p className="font-mono text-xs text-[#8a8f98]">@mika · design-eng</p>
            </div>
            <span className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px] text-[#d0d6e0]">PRO</span>
          </div>

          {/* stats */}
          <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.06]">
            {[
              ['128', 'posts'],
              ['2.4k', 'followers'],
              ['312', 'following'],
            ].map(([value, label]) => (
              <div key={label} className="bg-[#0d0e10] px-3 py-2">
                <p className="font-mono text-sm tabular-nums">{value}</p>
                <p className="text-[11px] text-[#8a8f98]">{label}</p>
              </div>
            ))}
          </div>

          {/* toggle */}
          <div className="mt-4 flex items-center justify-between">
            <span className="text-[13px] text-[#d0d6e0]">Notifications</span>
            <button
              role="switch"
              aria-checked={notify}
              aria-label="Notifications"
              onClick={() => setNotify((v) => !v)}
              className="relative h-[18px] w-8 rounded-full transition-colors duration-200"
              style={{ background: notify ? '#5e6ad2' : '#2a2b2f' }}
            >
              <motion.span
                className="absolute left-0.5 top-0.5 h-3.5 w-3.5 rounded-full bg-white"
                animate={{ x: notify ? 14 : 0 }}
                transition={{ type: 'spring', stiffness: 600, damping: 35 }}
              />
            </button>
          </div>

          {/* slider */}
          <div className="mt-4">
            <div className="mb-2 flex justify-between text-[13px]">
              <span className="text-[#d0d6e0]">Volume</span>
              <span className="font-mono text-xs text-[#8a8f98]">{volume}%</span>
            </div>
            <div className="relative h-3.5">
              <input
                type="range"
                min={0}
                max={100}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label="Volume"
                className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
              />
              <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[#26272b]" />
              <div className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[#5e6ad2]" style={{ width: `${volume}%` }} />
              <div
                className="absolute top-0 h-3.5 w-3.5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.5)] transition-shadow peer-focus-visible:shadow-[0_0_0_4px_rgba(94,106,210,0.35)] peer-active:shadow-[0_0_0_4px_rgba(94,106,210,0.35)]"
                style={{ left: `calc(${volume}% - ${volume * 0.14}px)` }}
              />
            </div>
          </div>

          {/* input with kbd hint */}
          <div className="relative mt-4">
            <input
              placeholder="Set status…"
              className="h-9 w-full rounded-lg border border-[#24262b] bg-[#111214] pl-3 pr-14 text-[13px] text-[#f7f8f8] outline-none transition placeholder:text-[#62666d] focus:border-[#5e6ad2] focus:shadow-[0_0_0_3px_rgba(94,106,210,0.25)]"
            />
            <kbd className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5 rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-[#8a8f98]">
              <Command size={10} />K
            </kbd>
          </div>

          {/* buttons */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => setFollowing((f) => !f)}
              className="flex h-8 items-center justify-center gap-1.5 rounded-lg bg-[#f7f8f8] text-[13px] font-medium text-[#08090a] transition hover:bg-white hover:shadow-[0_0_0_4px_rgba(94,106,210,0.25)] active:scale-[0.98]"
            >
              {following && <Check size={14} />}
              {following ? 'Following' : 'Follow'}
            </button>
            <button className="h-8 rounded-lg border border-[#2c2e33] bg-[#1b1c1f] text-[13px] font-medium text-[#d0d6e0] transition hover:bg-[#232427] active:scale-[0.98]">
              Message
            </button>
          </div>

          {/* footer */}
          <div className="mt-4 flex items-center gap-2 font-mono text-[11px] text-[#62666d]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4cb782] opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#4cb782]" />
            </span>
            online · last deploy 2m ago
          </div>
        </div>
      </div>
    </div>
  )
}
