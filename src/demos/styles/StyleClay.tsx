import { useState, type CSSProperties } from 'react'
import { motion } from 'motion/react'

/**
 * Claymorphism
 * 粘土のような「ぷっくり」立体感。
 *   外側: 色付きのふんわりドロップシャドウ
 *   内側: 右下に濃い色の inset shadow + 左上に白い inset highlight
 * パステルカラー + 大きな角丸 + 押すとむにっと縮むバネアニメーション。
 */
const clay = (bg: string, shade: string, glow: string): CSSProperties => ({
  background: bg,
  boxShadow: `0 10px 20px -6px ${glow}, inset -5px -5px 10px ${shade}, inset 5px 5px 10px rgba(255,255,255,0.75)`,
})

const C = {
  white: clay('#ffffff', 'rgba(170,150,255,0.35)', 'rgba(150,120,255,0.35)'),
  lavender: clay('#a78bfa', 'rgba(91,33,182,0.45)', 'rgba(139,92,246,0.55)'),
  pink: clay('#ffb3d1', 'rgba(219,90,150,0.4)', 'rgba(255,120,180,0.5)'),
  mint: clay('#b8f2d0', 'rgba(60,170,110,0.35)', 'rgba(80,200,140,0.45)'),
  peach: clay('#ffd6a5', 'rgba(220,140,60,0.35)', 'rgba(255,170,90,0.45)'),
  sky: clay('#bde0fe', 'rgba(80,140,220,0.35)', 'rgba(100,160,255,0.45)'),
}

const insetWell: CSSProperties = {
  background: '#efe9fd',
  boxShadow: 'inset 4px 4px 10px rgba(150,120,255,0.3), inset -4px -4px 10px rgba(255,255,255,0.95)',
}

const STATS = [
  ['128', 'Posts', C.mint],
  ['2.4k', 'Fans', C.peach],
  ['312', 'Following', C.sky],
] as const

const squish = {
  whileHover: { scale: 1.04 },
  whileTap: { scale: 0.92 },
  transition: { type: 'spring' as const, stiffness: 400, damping: 12 },
}

export function StyleClay() {
  const [notify, setNotify] = useState(true)
  const [volume, setVolume] = useState(60)
  const [following, setFollowing] = useState(false)

  return (
    <div
      className="relative grid h-full w-full place-items-center overflow-hidden text-[#4b3f72]"
      style={{
        background: 'linear-gradient(135deg, #ffe4f1 0%, #ece4ff 50%, #dcf3ff 100%)',
        fontFamily: "ui-rounded, 'Hiragino Maru Gothic ProN', Quicksand, Nunito, Inter, sans-serif",
      }}
    >
      {/* decorative clay balls */}
      <motion.div
        className="absolute left-[8%] top-[10%] h-14 w-14 rounded-full"
        style={C.pink}
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[8%] right-[7%] h-20 w-20 rounded-full"
        style={C.mint}
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div
        className="relative w-[300px] rounded-[36px] p-5"
        style={{
          background: '#fdfaff',
          boxShadow:
            '0 30px 60px -15px rgba(150,120,255,0.5), inset -10px -10px 20px rgba(170,150,255,0.3), inset 10px 10px 20px rgba(255,255,255,0.95)',
        }}
      >
        {/* header */}
        <div className="flex items-center gap-3">
          <motion.div {...squish} className="grid h-14 w-14 place-items-center rounded-full text-2xl" style={C.pink}>
            🐻
          </motion.div>
          <div>
            <p className="text-base font-extrabold">Mika Sato</p>
            <p className="text-xs font-semibold text-[#8f84b5]">Product Designer</p>
          </div>
        </div>

        {/* stats */}
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {STATS.map(([value, label, style]) => (
            <motion.div key={label} {...squish} className="rounded-[20px] py-2 text-center" style={style}>
              <p className="text-[15px] font-extrabold">{value}</p>
              <p className="text-[10px] font-bold opacity-70">{label}</p>
            </motion.div>
          ))}
        </div>

        {/* toggle */}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[13px] font-bold">Notifications</span>
          <button
            role="switch"
            aria-checked={notify}
            aria-label="Notifications"
            onClick={() => setNotify((v) => !v)}
            className="relative h-[30px] w-14 rounded-full transition-[background] duration-300"
            style={notify ? C.mint : insetWell}
          >
            <motion.span
              className="absolute left-[3px] top-[3px] h-6 w-6 rounded-full"
              style={C.white}
              animate={{ x: notify ? 26 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 18 }}
            />
          </button>
        </div>

        {/* slider */}
        <div className="mt-4">
          <div className="mb-2 flex justify-between text-[13px] font-bold">
            <span>Volume</span>
            <span className="text-[#8f84b5]">{volume}%</span>
          </div>
          <div className="relative h-[26px]">
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label="Volume"
              className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
            />
            <div className="absolute inset-x-0 top-1/2 h-4 -translate-y-1/2 rounded-full p-[3px]" style={insetWell}>
              <div className="h-full rounded-full" style={{ ...C.lavender, width: `${volume}%` }} />
            </div>
            <div
              className="absolute top-0 h-[26px] w-[26px] rounded-full"
              style={{ ...C.white, left: `calc(${volume}% - ${volume * 0.26}px)` }}
            />
          </div>
        </div>

        {/* input */}
        <input
          placeholder="How are you feeling?"
          className="mt-4 h-11 w-full rounded-[18px] px-4 text-[13px] font-semibold text-[#4b3f72] outline-none placeholder:text-[#b3a9d6] focus:ring-2 focus:ring-[#c4b5fd]"
          style={insetWell}
        />

        {/* buttons */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <motion.button
            {...squish}
            onClick={() => setFollowing((f) => !f)}
            className="h-11 rounded-full text-[13px] font-extrabold text-white"
            style={{ ...C.lavender, textShadow: '0 1px 2px rgba(91,33,182,0.4)' }}
          >
            {following ? 'Following ✓' : 'Follow'}
          </motion.button>
          <motion.button {...squish} className="h-11 rounded-full text-[13px] font-extrabold text-[#7c5cf0]" style={C.white}>
            Message
          </motion.button>
        </div>
      </div>
    </div>
  )
}
