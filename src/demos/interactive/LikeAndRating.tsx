import { useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Hand, Heart, Star } from 'lucide-react'

const burstColors = ['#f43f5e', '#fb923c', '#facc15', '#a855f7']

/** いいね時に飛び散るパーティクル + 広がるリング */
function Burst() {
  return (
    <>
      <motion.span
        className="pointer-events-none absolute inset-0 rounded-full border-2 border-rose-400"
        initial={{ scale: 0.2, opacity: 1 }}
        animate={{ scale: 2.4, opacity: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2
        const r = i % 2 ? 22 : 30
        return (
          <motion.span
            key={i}
            className="pointer-events-none absolute left-1/2 top-1/2 -ml-[3px] -mt-[3px] size-1.5 rounded-full"
            style={{ backgroundColor: burstColors[i % burstColors.length] }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(a) * r, y: Math.sin(a) * r, opacity: 0, scale: 0.3 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        )
      })}
    </>
  )
}

/** 数字が上下にロールするカウンター */
function RollingNumber({ value, dir }: { value: number; dir: number }) {
  return (
    <span className="relative inline-flex h-5 min-w-8 overflow-hidden text-sm font-semibold tabular-nums">
      <AnimatePresence mode="popLayout" initial={false} custom={dir}>
        <motion.span
          key={value}
          custom={dir}
          variants={{
            enter: (d: number) => ({ y: d * 18, opacity: 0 }),
            center: { y: 0, opacity: 1 },
            exit: (d: number) => ({ y: d * -18, opacity: 0 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

function HeartLike() {
  const [liked, setLiked] = useState(false)
  const [count, setCount] = useState(128)
  const [dir, setDir] = useState(1)
  const [burst, setBurst] = useState(0)

  const toggle = () => {
    const next = !liked
    setLiked(next)
    setDir(next ? 1 : -1)
    setCount((c) => c + (next ? 1 : -1))
    if (next) setBurst((b) => b + 1)
  }

  return (
    <button onClick={toggle} className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm">
      <span className="relative grid size-6 place-items-center">
        {burst > 0 && <Burst key={burst} />}
        <motion.span
          animate={liked ? { scale: [1, 1.45, 0.9, 1] } : { scale: 1 }}
          transition={{ duration: 0.45 }}
          className="grid place-items-center"
        >
          <Heart
            size={22}
            className={`transition-colors ${liked ? 'fill-rose-500 text-rose-500' : 'text-zinc-400'}`}
          />
        </motion.span>
      </span>
      <RollingNumber value={count} dir={dir} />
    </button>
  )
}

const labels = ['評価してください', 'いまいち', 'ふつう', 'よい', 'とてもよい', '最高！']

function StarRating() {
  const [rating, setRating] = useState(3)
  const [hover, setHover] = useState(0)
  const shown = hover || rating

  return (
    <div className="flex flex-col items-center gap-1.5" onMouseLeave={() => setHover(0)}>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <motion.button
            key={n}
            aria-label={`${n} stars`}
            onMouseEnter={() => setHover(n)}
            onClick={() => setRating(n)}
            whileHover={{ scale: 1.2, rotate: -10 }}
            whileTap={{ scale: 0.85 }}
          >
            <motion.span
              key={`${n}-${rating}`}
              initial={n <= rating ? { scale: 0.3 } : false}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 12, delay: n * 0.05 }}
              className="block"
            >
              <Star
                size={26}
                className={`transition-colors ${n <= shown ? 'fill-amber-400 text-amber-400' : 'text-zinc-300'}`}
              />
            </motion.span>
          </motion.button>
        ))}
      </div>
      <div className="h-4 overflow-hidden text-[11px] font-medium text-zinc-500">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={shown}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="block"
          >
            {labels[shown]}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  )
}

/** Medium 風の拍手: 押すたびに +1 が浮かび上がる */
function Clap() {
  const [count, setCount] = useState(42)
  const [floats, setFloats] = useState<number[]>([])
  const id = useRef(0)
  const clap = () => {
    setCount((c) => c + 1)
    const k = id.current++
    setFloats((f) => [...f, k])
  }
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <motion.button
          whileTap={{ scale: 0.88, rotate: -8 }}
          onClick={clap}
          className="grid size-12 place-items-center rounded-full border border-emerald-200 bg-white text-emerald-600 shadow-sm"
        >
          <Hand size={20} />
        </motion.button>
        <AnimatePresence>
          {floats.map((k) => (
            <motion.span
              key={k}
              initial={{ y: 0, opacity: 1, scale: 0.6 }}
              animate={{ y: -48, opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              onAnimationComplete={() => setFloats((f) => f.filter((x) => x !== k))}
              className="pointer-events-none absolute inset-x-0 -top-1 mx-auto grid size-7 place-items-center rounded-full bg-emerald-500 text-[10px] font-bold text-white"
            >
              +1
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
      <span className="text-sm font-semibold tabular-nums text-zinc-700">{count}</span>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-w-[150px] flex-1 flex-col items-center justify-center gap-3 rounded-3xl bg-white/60 p-4 shadow-[0_10px_30px_rgba(190,24,93,.08)] backdrop-blur">
      {children}
      <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">{title}</span>
    </div>
  )
}

export function LikeAndRating() {
  return (
    <div className="relative flex h-full w-full flex-wrap content-center items-stretch justify-center gap-3 overflow-hidden bg-gradient-to-br from-rose-50 via-orange-50 to-violet-100 p-4">
      <Panel title="Like burst">
        <HeartLike />
      </Panel>
      <Panel title="Star rating">
        <StarRating />
      </Panel>
      <Panel title="Clap +1">
        <Clap />
      </Panel>
    </div>
  )
}
