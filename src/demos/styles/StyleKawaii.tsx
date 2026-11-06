import { useMemo, useState } from 'react'
import { motion } from 'motion/react'

/**
 * ゆめかわ・パステル
 * ピンク×ラベンダー×ミントの淡いグラデーション、ふわふわ浮かぶハート・星・雲、
 * 大きな角丸(28px)と白い点線ステッチ、ぷっくりしたグラデーションのピルボタン、ハートのつまみ。
 */
const ROUND = '"Hiragino Maru Gothic ProN", "Arial Rounded MT Bold", "Noto Sans JP", sans-serif'
const PINK = '#ff8fc7'
const LAV = '#b89cff'
const TEXT = '#7a4d8f'

const DECO = ['♡', '☆', '✿', '♡', '✧', '☁', '♡', '★', '✦', '♡']

export function StyleKawaii() {
  const [notify, setNotify] = useState(true)
  const [volume, setVolume] = useState(70)
  const [following, setFollowing] = useState(false)
  const items = useMemo(() => DECO.map((c, i) => ({ c, x: (i * 41) % 96, y: (i * 29) % 90, s: 14 + ((i * 7) % 18), d: 3 + (i % 4) })), [])

  return (
    <div
      className="relative grid h-full w-full place-items-center overflow-hidden"
      style={{ fontFamily: ROUND, color: TEXT, background: 'linear-gradient(135deg,#ffd6ec 0%,#e8dcff 45%,#cdf5e6 100%)' }}
    >
      {items.map((it, i) => (
        <motion.span
          key={i}
          className="absolute select-none"
          style={{ left: `${it.x}%`, top: `${it.y}%`, fontSize: it.s, color: [PINK, LAV, '#7fdcc0', '#ffc46b'][i % 4], textShadow: '0 0 8px #fff' }}
          animate={{ y: [0, -10, 0], rotate: [0, 10, -6, 0] }}
          transition={{ duration: it.d, repeat: Infinity, ease: 'easeInOut', delay: i * 0.2 }}
        >
          {it.c}
        </motion.span>
      ))}

      <div className="relative w-[290px] rounded-[30px] bg-white/80 p-2 shadow-[0_10px_30px_rgba(184,156,255,.45)] backdrop-blur-sm">
        <div className="rounded-[24px] border-2 border-dashed border-[#ffb6dc] p-4">
          {/* cat ears avatar */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="absolute -top-2 left-1 h-0 w-0 -rotate-12" style={{ borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderBottom: `16px solid ${PINK}` }} />
              <span className="absolute -top-2 right-1 h-0 w-0 rotate-12" style={{ borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderBottom: `16px solid ${PINK}` }} />
              <div className="relative grid h-14 w-14 place-items-center rounded-full text-[18px] font-bold text-white" style={{ background: `linear-gradient(135deg, ${PINK}, ${LAV})`, boxShadow: '0 0 0 3px #fff, 0 0 0 5px #ffd6ec' }}>
                ᵔᴗᵔ
              </div>
            </div>
            <div>
              <p className="text-[19px] font-bold">みかちゃん ♡</p>
              <p className="text-[12px] text-[#b07cc6]">ゆめかわデザイナー ☁︎</p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
            {[
              ['128', 'とうこう', '#ffe0f0'],
              ['2.4k', 'ふぁん', '#ece4ff'],
              ['312', 'ふぉろー', '#dcf8ee'],
            ].map(([v, l, bg]) => (
              <div key={l} className="rounded-2xl py-1.5" style={{ background: bg }}>
                <p className="text-[15px] font-bold">{v}</p>
                <p className="text-[10px]">{l}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between text-[13px] font-bold">
            <span>おしらせ 🔔</span>
            <button
              role="switch"
              aria-checked={notify}
              aria-label="おしらせ"
              onClick={() => setNotify((v) => !v)}
              className="relative h-7 w-14 rounded-full transition-colors"
              style={{ background: notify ? `linear-gradient(90deg,${PINK},${LAV})` : '#efe6f5', boxShadow: 'inset 0 2px 4px rgba(122,77,143,.15)' }}
            >
              <motion.span
                className="absolute top-[3px] grid h-[22px] w-[22px] place-items-center rounded-full bg-white text-[12px] shadow"
                style={{ color: notify ? PINK : '#c9b6d6' }}
                animate={{ left: notify ? 31 : 3, rotate: notify ? 360 : 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              >
                ♥
              </motion.span>
            </button>
          </div>

          <div className="mt-3 relative h-6">
            <input type="range" value={volume} onChange={(e) => setVolume(+e.target.value)} aria-label="Volume" className="absolute inset-0 z-10 w-full cursor-pointer opacity-0" />
            <div className="absolute inset-x-0 top-1/2 h-2.5 -translate-y-1/2 rounded-full bg-[#f3e9f8]" />
            <div className="absolute left-0 top-1/2 h-2.5 -translate-y-1/2 rounded-full" style={{ width: `${volume}%`, background: `linear-gradient(90deg,#ffc2e2,${PINK},${LAV})` }} />
            <span className="absolute top-1/2 -translate-y-1/2 text-[22px] leading-none" style={{ left: `calc(${volume}% - ${volume * 0.2}px)`, color: PINK, textShadow: '0 0 0 #fff, 0 2px 4px rgba(255,143,199,.6)' }}>
              ♥
            </span>
          </div>

          <input
            placeholder="きょうのきぶんは？ ✧"
            className="mt-3 h-10 w-full rounded-full border-2 border-[#ffd6ec] bg-white px-4 text-[13px] outline-none placeholder:text-[#d0a9df] focus:border-[#ff8fc7]"
          />

          <div className="mt-3 grid grid-cols-2 gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              whileHover={{ y: -2 }}
              onClick={() => setFollowing((f) => !f)}
              className="h-10 rounded-full text-[14px] font-bold text-white"
              style={{ background: `linear-gradient(180deg,#ffb3da,${PINK})`, boxShadow: '0 5px 0 #e56aa9, 0 8px 14px rgba(255,143,199,.5)' }}
            >
              {following ? 'ふぉろー中 ♡' : 'ふぉろー ♡'}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              whileHover={{ y: -2 }}
              className="h-10 rounded-full text-[14px] font-bold text-white"
              style={{ background: `linear-gradient(180deg,#d2c2ff,${LAV})`, boxShadow: '0 5px 0 #9479e0, 0 8px 14px rgba(184,156,255,.5)' }}
            >
              おてがみ ✉
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  )
}
