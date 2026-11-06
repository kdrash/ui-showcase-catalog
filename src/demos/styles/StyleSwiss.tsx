import { useState } from 'react'
import { motion } from 'motion/react'

/**
 * Swiss / International Typographic Style
 * 赤 #e30613・黒 #111・白の 3 色のみ。角丸ゼロ・影ゼロ。
 * 巨大で詰めたサンセリフ (letter-spacing -0.045em, line-height 0.85) と、
 * 極小の大文字ラベル (letter-spacing 0.12em)、太い罫線でグリッドを組む。
 */
export function StyleSwiss() {
  const [notify, setNotify] = useState(true)
  const [volume, setVolume] = useState(62)
  const [following, setFollowing] = useState(false)

  return (
    <div
      className="relative grid h-full w-full place-items-center overflow-hidden bg-[#e9e6df] text-[#111]"
      style={{ fontFamily: "'Helvetica Neue', Helvetica, Inter, Arial, sans-serif" }}
    >
      {/* poster geometry */}
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#e30613]" />
      <div className="absolute bottom-0 left-0 h-3 w-1/2 bg-[#111]" />

      <div className="relative w-[300px] bg-white p-5">
        <div className="flex items-start justify-between">
          <div className="h-2 w-16 bg-[#e30613]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.14em]">Nº 01 / Profil</span>
        </div>

        <div className="mt-3 flex items-end justify-between">
          <h3 className="text-[36px] font-extrabold uppercase leading-[0.85] tracking-[-0.045em]">
            Mika
            <br />
            Sato
          </h3>
          <div className="grid h-14 w-14 place-items-center rounded-full bg-[#e30613] text-sm font-bold text-white">MS</div>
        </div>
        <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[#6b6b6b]">Product Designer — Tokyo</p>

        <div className="mt-3 h-1 bg-[#111]" />
        <div className="mt-2.5 grid grid-cols-3">
          {[
            ['128', 'Posts'],
            ['2.4k', 'Followers'],
            ['312', 'Following'],
          ].map(([value, label], i) => (
            <div key={label} className={i > 0 ? 'border-l border-[#111] pl-2.5' : ''}>
              <p className="text-[26px] font-bold leading-none tracking-[-0.04em] tabular-nums">{value}</p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.14em]">{label}</p>
            </div>
          ))}
        </div>
        <div className="mt-2.5 h-px bg-[#111]" />

        {/* rows */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em]">Notifications</span>
          <button
            role="switch"
            aria-checked={notify}
            aria-label="Notifications"
            onClick={() => setNotify((v) => !v)}
            className="relative h-5 w-10 border-2 border-[#111] transition-colors"
            style={{ background: notify ? '#e30613' : '#fff' }}
          >
            <motion.span
              className="absolute left-0.5 top-0.5 h-3 w-3"
              animate={{ x: notify ? 20 : 0, backgroundColor: notify ? '#ffffff' : '#111111' }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <span className="w-[86px] text-[10px] font-bold uppercase tracking-[0.14em]">Volume</span>
          <div className="relative h-4 flex-1">
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label="Volume"
              className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
            />
            <div className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-[#111]" />
            <div className="absolute left-0 top-1/2 h-1 -translate-y-1/2 bg-[#e30613]" style={{ width: `${volume}%` }} />
            <div
              className="absolute top-0.5 h-3 w-3 bg-[#e30613]"
              style={{ left: `calc(${volume}% - ${volume * 0.12}px)` }}
            />
          </div>
          <span className="w-6 text-right text-sm font-bold tabular-nums">{volume}</span>
        </div>

        <div className="mt-2 flex items-center gap-3">
          <span className="w-[86px] text-[10px] font-bold uppercase tracking-[0.14em]">Status</span>
          <input
            placeholder="Available"
            className="h-7 min-w-0 flex-1 border-b-2 border-[#111] bg-transparent text-[13px] font-medium text-[#111] outline-none transition-colors placeholder:text-[#9a9a9a] focus:border-[#e30613]"
          />
        </div>

        <div className="mt-4 grid grid-cols-[1.4fr_1fr] gap-2">
          <button
            onClick={() => setFollowing((f) => !f)}
            className="group flex h-10 items-center justify-between bg-[#e30613] px-3 text-[12px] font-bold uppercase tracking-[0.1em] text-white transition-colors hover:bg-[#111]"
          >
            {following ? 'Following' : 'Follow'}
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </button>
          <button className="h-10 border-2 border-[#111] text-[12px] font-bold uppercase tracking-[0.1em] transition-colors hover:bg-[#111] hover:text-white">
            Message
          </button>
        </div>
      </div>
    </div>
  )
}
