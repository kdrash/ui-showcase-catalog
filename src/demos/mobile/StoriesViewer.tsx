import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Heart, Pause, Send, X } from 'lucide-react'
import { PhoneFrame } from './PhoneFrame'
import { art, type ArtKind } from '../_shared/art'

type Slide = { kind: ArtKind; seed: number; text?: string }
type User = { name: string; time: string; color: string; slides: Slide[] }

const USERS: User[] = [
  { name: 'haru.trip', time: '2時間前', color: 'from-amber-400 to-rose-500', slides: [{ kind: 'landscape', seed: 3, text: '朝焼けの砂丘 🏜️' }, { kind: 'landscape', seed: 0, text: '夜は星がすごい…' }, { kind: 'gradient', seed: 3 }] },
  { name: 'mio_design', time: '5時間前', color: 'from-violet-500 to-fuchsia-500', slides: [{ kind: 'geometric', seed: 5, text: '新作ポスター完成!' }, { kind: 'geometric', seed: 1, text: 'ボツ案もかわいい' }] },
  { name: 'kenta.cafe', time: '8時間前', color: 'from-emerald-400 to-sky-500', slides: [{ kind: 'gradient', seed: 6, text: '本日のスペシャル ☕' }, { kind: 'landscape', seed: 2 }, { kind: 'gradient', seed: 2, text: '20時まで営業中' }] },
]
const DURATION = 4500

export function StoriesViewer() {
  const [u, setU] = useState(0)
  const [s, setS] = useState(0)
  const [dir, setDir] = useState(1)
  const [paused, setPaused] = useState(false)
  const [liked, setLiked] = useState(false)
  const bars = useRef<(HTMLDivElement | null)[]>([])
  const progress = useRef(0)
  const down = useRef<{ x: number; t: number } | null>(null)
  const holdTimer = useRef<number | undefined>(undefined)

  const user = USERS[u]
  const goUser = (d: number) => {
    const n = (u + d + USERS.length) % USERS.length
    setDir(d)
    setU(n)
    setS(0)
    setLiked(false)
  }
  const next = () => (s < user.slides.length - 1 ? setS(s + 1) : goUser(1))
  const prev = () => (s > 0 ? setS(s - 1) : goUser(-1))

  // 進行状況: rAF で DOM を直接更新(毎フレーム再レンダーしない)
  useEffect(() => {
    progress.current = 0
    let last = performance.now()
    let raf = 0
    const loop = (now: number) => {
      if (!pausedRef.current) progress.current += (now - last) / DURATION
      last = now
      bars.current.forEach((b, i) => {
        if (b) b.style.transform = `scaleX(${i < s ? 1 : i > s ? 0 : Math.min(1, progress.current)})`
      })
      if (progress.current >= 1) return nextRef.current()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [u, s])
  const pausedRef = useRef(paused)
  pausedRef.current = paused
  const nextRef = useRef(next)
  nextRef.current = next

  return (
    <PhoneFrame dark island={false} screenClass="bg-black" bg="bg-[radial-gradient(circle_at_50%_0%,#4c1d95,#0a0a0a_65%)]">
      <div
        className="absolute inset-0 touch-none select-none"
        style={{ perspective: 900 }}
        onPointerDown={(e) => {
          down.current = { x: e.clientX, t: performance.now() }
          holdTimer.current = window.setTimeout(() => setPaused(true), 180)
        }}
        onPointerUp={(e) => {
          clearTimeout(holdTimer.current)
          const d = down.current
          down.current = null
          setPaused(false)
          if (!d) return
          const dx = e.clientX - d.x
          if (Math.abs(dx) > 45) return goUser(dx < 0 ? 1 : -1)
          if (performance.now() - d.t > 220) return
          const r = e.currentTarget.getBoundingClientRect()
          if (e.clientX - r.left < r.width / 3) prev()
          else next()
        }}
        onPointerLeave={() => {
          clearTimeout(holdTimer.current)
          down.current = null
          setPaused(false)
        }}
      >
        <AnimatePresence initial={false} custom={dir}>
          <motion.div
            key={u}
            custom={dir}
            variants={{
              enter: (d: number) => ({ x: `${d * 100}%`, rotateY: d * 50, opacity: 0.6 }),
              center: { x: '0%', rotateY: 0, opacity: 1 },
              exit: (d: number) => ({ x: `${-d * 100}%`, rotateY: -d * 50, opacity: 0.6 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.45, ease: [0.3, 0.7, 0.3, 1] }}
            style={{ transformOrigin: dir > 0 ? 'left center' : 'right center' }}
            className="absolute inset-0 overflow-hidden"
          >
            <AnimatePresence initial={false}>
              <motion.img
                key={s}
                src={art(user.slides[s].kind, user.slides[s].seed, 420, 900)}
                initial={{ opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="absolute inset-0 h-full w-full object-cover"
                draggable={false}
                alt=""
              />
            </AnimatePresence>
            <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/60 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/60 to-transparent" />
            {user.slides[s].text && (
              <motion.div
                key={`${u}-${s}`}
                initial={{ opacity: 0, y: 10, rotate: -3 }}
                animate={{ opacity: 1, y: 0, rotate: -3 }}
                transition={{ delay: 0.2 }}
                className="absolute top-[42%] left-1/2 -translate-x-1/2 rounded-lg bg-white px-3 py-1.5 text-[13px] font-bold whitespace-nowrap text-zinc-900 shadow-xl"
              >
                {user.slides[s].text}
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* overlay UI */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-2.5 pt-11">
          <div className="flex gap-1">
            {user.slides.map((_, i) => (
              <div key={`${u}-${i}`} className="h-[2.5px] flex-1 overflow-hidden rounded-full bg-white/35">
                <div ref={(el) => void (bars.current[i] = el)} className="h-full origin-left bg-white" style={{ transform: 'scaleX(0)' }} />
              </div>
            ))}
          </div>
          <div className="mt-2.5 flex items-center gap-2 text-white">
            <div className={`rounded-full bg-gradient-to-tr p-[2px] ${user.color}`}>
              <div className="grid h-7 w-7 place-items-center rounded-full border-2 border-black bg-zinc-800 text-[11px] font-bold">{user.name[0].toUpperCase()}</div>
            </div>
            <span className="text-[12px] font-semibold">{user.name}</span>
            <span className="text-[11px] text-white/60">{user.time}</span>
            {paused && <Pause size={12} className="ml-1" fill="white" />}
            <X size={18} className="ml-auto" />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-5 z-10 flex items-center gap-2.5 px-3 text-white" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
          <div className="flex-1 rounded-full border border-white/50 px-3 py-2 text-[11px] text-white/80">メッセージを送信</div>
          <motion.button whileTap={{ scale: 0.7 }} onClick={() => setLiked((l) => !l)} aria-label="いいね">
            <Heart size={20} className={liked ? 'fill-rose-500 text-rose-500' : ''} />
          </motion.button>
          <Send size={19} />
        </div>
      </div>
    </PhoneFrame>
  )
}
