import { useState } from 'react'
import { motion } from 'motion/react'
import { ArrowUpRight } from 'lucide-react'

/**
 * Neo-Brutalism
 * 太い黒枠 (3px) + ずらしたベタ影 (box-shadow: 4〜8px 4〜8px 0 #000) + 原色ベタ塗り + Space Grotesk。
 * ホバーで影が伸びて浮き、押すと影が 0 になって沈む。少し傾けたステッカーで遊び心。
 */
const STATS = [
  ['128', 'Posts', '#a3e635'],
  ['2.4k', 'Fans', '#60a5fa'],
  ['312', 'Follow', '#fb7185'],
] as const

const pushBtn =
  'h-10 rounded-md border-[3px] border-black font-bold shadow-[4px_4px_0_#000] transition-all duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-none'

export function StyleNeoBrutalism() {
  const [notify, setNotify] = useState(true)
  const [volume, setVolume] = useState(64)
  const [following, setFollowing] = useState(false)

  return (
    <div
      className="relative grid h-full w-full place-items-center overflow-hidden text-black"
      style={{
        backgroundColor: '#ffde59',
        backgroundImage: 'radial-gradient(rgba(0,0,0,0.18) 1.2px, transparent 1.2px)',
        backgroundSize: '16px 16px',
        fontFamily: "'Space Grotesk', Inter, sans-serif",
      }}
    >
      <motion.div
        initial={false}
        animate={{ rotate: -1.5 }}
        whileHover={{ rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 18 }}
        className="relative w-[300px] rounded-[10px] border-[3px] border-black bg-white p-4 shadow-[8px_8px_0_#000]"
      >
        {/* sticker */}
        <div className="absolute -right-3 -top-3 rotate-12 rounded-full border-[3px] border-black bg-[#90e0ff] px-2 py-0.5 text-[11px] font-bold shadow-[2px_2px_0_#000]">
          NEW!
        </div>

        {/* header */}
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-md border-[3px] border-black bg-[#ff90e8] text-lg font-bold shadow-[3px_3px_0_#000]">
            MS
          </div>
          <div>
            <p className="text-xl font-bold leading-none tracking-tight">Mika Sato</p>
            <span className="mt-1.5 inline-block border-2 border-black bg-[#a3e635] px-1.5 text-[11px] font-bold uppercase">
              Product Designer
            </span>
          </div>
        </div>

        {/* stats */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {STATS.map(([value, label, color]) => (
            <div
              key={label}
              className="rounded-md border-[2.5px] border-black py-1 text-center shadow-[3px_3px_0_#000]"
              style={{ background: color }}
            >
              <p className="text-base font-bold leading-tight">{value}</p>
              <p className="text-[10px] font-bold uppercase">{label}</p>
            </div>
          ))}
        </div>

        {/* toggle */}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wide">Notifications</span>
          <button
            role="switch"
            aria-checked={notify}
            aria-label="Notifications"
            onClick={() => setNotify((v) => !v)}
            className="relative h-7 w-12 border-[3px] border-black transition-colors"
            style={{ background: notify ? '#a3e635' : '#ffffff' }}
          >
            <motion.span
              className="absolute left-[3px] top-[3px] h-4 w-4 bg-black"
              animate={{ x: notify ? 20 : 0 }}
              transition={{ type: 'spring', stiffness: 600, damping: 30 }}
            />
          </button>
        </div>

        {/* slider */}
        <div className="mt-3">
          <div className="mb-1.5 flex justify-between text-xs font-bold uppercase tracking-wide">
            <span>Volume</span>
            <span>{volume}</span>
          </div>
          <div className="relative h-6">
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label="Volume"
              className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
            />
            <div className="absolute inset-x-0 top-1/2 h-4 -translate-y-1/2 overflow-hidden rounded-sm border-[3px] border-black bg-white">
              <div className="h-full bg-[#ff90e8]" style={{ width: `${volume}%` }} />
            </div>
            <div
              className="absolute top-0 h-6 w-6 border-[3px] border-black bg-[#ffde59] shadow-[2px_2px_0_#000]"
              style={{ left: `calc(${volume}% - ${volume * 0.24}px)` }}
            />
          </div>
        </div>

        {/* input */}
        <input
          placeholder="Type your status..."
          className="mt-4 h-10 w-full rounded-md border-[3px] border-black bg-white px-3 text-sm font-medium text-black outline-none transition-all placeholder:text-black/40 focus:-translate-x-0.5 focus:-translate-y-0.5 focus:shadow-[4px_4px_0_#000]"
        />

        {/* buttons */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => setFollowing((f) => !f)}
            className={`${pushBtn} flex items-center justify-center gap-1 bg-[#ff90e8] text-sm`}
          >
            {following ? 'Following!' : 'Follow'} <ArrowUpRight size={16} strokeWidth={3} />
          </button>
          <button className={`${pushBtn} bg-white text-sm`}>Message</button>
        </div>
      </motion.div>
    </div>
  )
}
