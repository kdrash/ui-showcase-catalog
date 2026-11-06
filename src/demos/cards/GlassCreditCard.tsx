import { useId, useState } from 'react'
import { motion } from 'motion/react'
import { Eye, EyeOff, Wifi } from 'lucide-react'

const BLOBS = [
  { className: 'left-[8%] top-[10%] h-40 w-40 bg-fuchsia-500', x: [0, 60, -20], y: [0, 30, 60], d: 9 },
  { className: 'right-[6%] top-[18%] h-44 w-44 bg-cyan-400', x: [0, -50, 10], y: [0, 50, -10], d: 11 },
  { className: 'bottom-[0%] left-[35%] h-36 w-36 bg-amber-400', x: [0, 40, -40], y: [0, -40, 10], d: 8 },
]

function Chip() {
  const id = useId()
  return (
    <svg width="40" height="30" viewBox="0 0 40 30" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="1" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="39" height="29" rx="6" fill={`url(#${id})`} stroke="#92400e" strokeOpacity=".4" />
      <path d="M0 10h12M0 20h12M28 10h12M28 20h12M12 0v30M28 0v30M12 15h16" stroke="#92400e" strokeOpacity=".45" />
    </svg>
  )
}

/**
 * Glassmorphism: backdrop-filter: blur() + 半透明の白 + 白い細ボーダー。
 * 背後で Motion がカラフルなぼかし円(blob)をゆっくり動かし、ガラス越しの色の揺らぎを見せる。
 */
export function GlassCreditCard() {
  const [show, setShow] = useState(false)

  return (
    <div className="relative grid h-full w-full place-items-center overflow-hidden bg-[#0f0c29]">
      {BLOBS.map((b, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full opacity-80 blur-2xl ${b.className}`}
          animate={{ x: b.x, y: b.y }}
          transition={{ duration: b.d, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
        />
      ))}

      <motion.div
        whileHover={{ y: -6, rotateX: 6, rotateY: -6 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        style={{ transformPerspective: 800 }}
        className="relative h-[180px] w-[290px] overflow-hidden rounded-2xl border border-white/30 bg-white/10 p-5 text-white shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-transparent" />
        <div className="relative flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-sm font-semibold tracking-wide">Aurora Bank</span>
            <Wifi size={20} className="rotate-90 opacity-80" />
          </div>
          <div className="flex items-center gap-3">
            <Chip />
            <button
              onClick={() => setShow((s) => !s)}
              className="rounded-full p-1 text-white/70 hover:bg-white/15 hover:text-white"
              aria-label="番号を表示"
            >
              {show ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <div className="font-mono text-lg tracking-[0.14em]">
            {show ? '4829 1173 5620 1024' : '4829 •••• •••• 1024'}
          </div>
          <div className="flex items-end justify-between text-[10px] uppercase tracking-wider text-white/70">
            <div>
              <div>Card Holder</div>
              <div className="text-xs font-semibold text-white">Taro Yamada</div>
            </div>
            <div>
              <div>Expires</div>
              <div className="text-xs font-semibold text-white">08/29</div>
            </div>
            <div className="flex">
              <span className="h-7 w-7 rounded-full bg-rose-500/90" />
              <span className="-ml-3 h-7 w-7 rounded-full bg-amber-400/90 mix-blend-screen" />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
