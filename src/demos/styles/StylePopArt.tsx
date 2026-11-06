import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

/**
 * ポップアート・コミック
 * ハーフトーン網点(radial-gradient のドット)、太い黒線、原色ベタ、集中線(repeating-conic-gradient)、
 * 吹き出しと爆発(POW!)の多角形。フォントは Impact 系の極太。押すと「POW!」が飛び出す。
 */
const RED = '#ff2a2a'
const YEL = '#ffe600'
const BLU = '#1e90ff'
const INK = '#0d0d0d'
const COMIC = '"Bangers", Impact, "Arial Black", sans-serif'

const halftone = (color: string, bg: string, size = 10, dot = 2.4) => ({
  backgroundColor: bg,
  backgroundImage: `radial-gradient(${color} ${dot}px, transparent ${dot + 0.4}px)`,
  backgroundSize: `${size}px ${size}px`,
})

const BURST =
  'polygon(50% 0%, 61% 22%, 85% 8%, 78% 33%, 100% 38%, 81% 53%, 97% 75%, 71% 70%, 66% 98%, 50% 77%, 33% 100%, 29% 71%, 3% 78%, 19% 54%, 0% 36%, 23% 31%, 14% 6%, 39% 22%)'

export function StylePopArt() {
  const [notify, setNotify] = useState(true)
  const [volume, setVolume] = useState(75)
  const [pow, setPow] = useState(0)
  const [following, setFollowing] = useState(false)

  return (
    <div className="relative grid h-full w-full place-items-center overflow-hidden" style={{ fontFamily: COMIC, color: INK }}>
      {/* 集中線 */}
      <div className="absolute inset-0" style={{ background: `repeating-conic-gradient(from 0deg at 50% 50%, ${YEL} 0deg 6deg, #fff3a0 6deg 12deg)` }} />
      <div className="absolute inset-0" style={{ ...halftone('rgba(255,42,42,0.35)', 'transparent', 12, 3), maskImage: 'radial-gradient(circle at 50% 50%, transparent 30%, #000 75%)' }} />

      {/* speech bubble */}
      <div className="absolute left-4 top-4 z-10 max-w-[150px] rounded-[50%] border-[3px] border-black bg-white px-4 py-3 text-center text-[16px] leading-tight tracking-wide">
        WOW! IT&apos;S MIKA!
        <span className="absolute -bottom-4 right-8 h-0 w-0" style={{ borderLeft: '10px solid transparent', borderRight: '6px solid transparent', borderTop: `18px solid ${INK}` }} />
        <span className="absolute -bottom-[11px] right-[34px] h-0 w-0" style={{ borderLeft: '7px solid transparent', borderRight: '4px solid transparent', borderTop: '13px solid #fff' }} />
      </div>

      <div className="relative w-[290px] border-[4px] border-black bg-white p-3 shadow-[8px_8px_0_#0d0d0d]">
        {/* panel header */}
        <div className="flex items-center gap-3 border-[3px] border-black p-2" style={halftone('rgba(30,144,255,.55)', '#bfe1ff', 8, 2)}>
          <div className="grid h-14 w-14 place-items-center rounded-full border-[3px] border-black text-[22px] text-white" style={{ ...halftone('rgba(0,0,0,.25)', RED, 6, 1.6), textShadow: `2px 2px 0 ${INK}` }}>
            MS
          </div>
          <div>
            <p className="text-[30px] leading-none tracking-wide text-white" style={{ WebkitTextStroke: `1.5px ${INK}`, textShadow: `3px 3px 0 ${INK}` }}>
              MIKA SATO
            </p>
            <p className="mt-0.5 inline-block bg-[#ffe600] px-1 text-[13px] tracking-widest" style={{ border: `2px solid ${INK}` }}>
              DESIGNER!
            </p>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
          {[
            ['128', 'POSTS', YEL],
            ['2.4K', 'FANS', '#ff8fa3'],
            ['312', 'PALS', '#9be7ff'],
          ].map(([v, l, c]) => (
            <div key={l} className="border-[3px] border-black py-0.5" style={halftone('rgba(0,0,0,.18)', c, 7, 1.4)}>
              <p className="text-[22px] leading-none">{v}</p>
              <p className="text-[11px] tracking-widest">{l}</p>
            </div>
          ))}
        </div>

        <div className="mt-2 flex items-center justify-between">
          <span className="text-[16px] tracking-wider">NOTIFICATIONS</span>
          <button
            role="switch"
            aria-checked={notify}
            aria-label="Notifications"
            onClick={() => setNotify((v) => !v)}
            className="relative h-8 w-16 border-[3px] border-black"
            style={notify ? halftone('rgba(0,0,0,.25)', RED, 6, 1.5) : { background: '#fff' }}
          >
            <motion.span
              className="absolute top-[2px] grid h-5 w-6 place-items-center border-[3px] border-black bg-white text-[10px]"
              animate={{ left: notify ? 32 : 2 }}
              transition={{ type: 'spring', stiffness: 700, damping: 25 }}
            >
              {notify ? '!' : ''}
            </motion.span>
          </button>
        </div>

        <div className="mt-2 flex items-center gap-2 text-[16px]">
          <span>VOL</span>
          <div className="relative h-5 flex-1 border-[3px] border-black bg-white">
            <input type="range" value={volume} onChange={(e) => setVolume(+e.target.value)} aria-label="Volume" className="absolute inset-0 z-10 w-full cursor-pointer opacity-0" />
            <div className="h-full" style={{ width: `${volume}%`, ...halftone('rgba(0,0,0,.3)', BLU, 6, 1.5) }} />
          </div>
          <span className="w-7 text-right">{volume}</span>
        </div>

        <div className="relative mt-2 grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              setFollowing((f) => !f)
              setPow((n) => n + 1)
            }}
            className="h-11 border-[3px] border-black text-[20px] tracking-wider text-white shadow-[4px_4px_0_#0d0d0d] transition active:translate-x-1 active:translate-y-1 active:shadow-none"
            style={{ background: RED, textShadow: `2px 2px 0 ${INK}` }}
          >
            {following ? 'FOLLOWING!' : 'FOLLOW!'}
          </button>
          <button className="h-11 border-[3px] border-black bg-white text-[20px] tracking-wider shadow-[4px_4px_0_#0d0d0d] transition active:translate-x-1 active:translate-y-1 active:shadow-none">
            MESSAGE
          </button>
          <AnimatePresence>
            {pow > 0 && (
              <motion.div
                key={pow}
                initial={{ scale: 0, rotate: -30, opacity: 1 }}
                animate={{ scale: 1, rotate: -8, opacity: 1 }}
                exit={{ scale: 1.4, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 12 }}
                onAnimationComplete={() => setTimeout(() => setPow(0), 500)}
                className="pointer-events-none absolute -left-6 -top-16 grid h-28 w-28 place-items-center"
              >
                <div className="absolute inset-0 bg-black" style={{ clipPath: BURST }} />
                <div className="absolute inset-[5px]" style={{ clipPath: BURST, background: YEL }} />
                <span className="relative text-[30px] text-[#ff2a2a]" style={{ WebkitTextStroke: `1.5px ${INK}` }}>
                  POW!
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
