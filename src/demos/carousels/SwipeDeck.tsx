import { useState } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'motion/react'
import { Heart, MapPin, RotateCcw, X } from 'lucide-react'

type Profile = { id: number; name: string; age: number; emoji: string; bg: string; tags: string[]; km: number }

const PROFILES: Profile[] = [
  { id: 1, name: 'Hana', age: 26, emoji: '👩‍🎨', bg: 'linear-gradient(160deg,#fda4af,#be185d)', tags: ['アート', 'カフェ'], km: 2 },
  { id: 2, name: 'Ren', age: 29, emoji: '🧗', bg: 'linear-gradient(160deg,#86efac,#15803d)', tags: ['登山', 'キャンプ'], km: 5 },
  { id: 3, name: 'Mio', age: 24, emoji: '🎧', bg: 'linear-gradient(160deg,#a5b4fc,#4338ca)', tags: ['音楽', 'フェス'], km: 1 },
  { id: 4, name: 'Sota', age: 31, emoji: '👨‍🍳', bg: 'linear-gradient(160deg,#fdba74,#c2410c)', tags: ['料理', 'ワイン'], km: 8 },
  { id: 5, name: 'Yui', age: 27, emoji: '📚', bg: 'linear-gradient(160deg,#67e8f9,#0e7490)', tags: ['読書', '映画'], km: 3 },
]

type Dir = 1 | -1

function SwipeCard({
  profile,
  depth,
  onSwipe,
}: {
  profile: Profile
  depth: number
  onSwipe: (dir: Dir) => void
}) {
  const isTop = depth === 0
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-220, 220], [-18, 18])
  const likeOpacity = useTransform(x, [20, 110], [0, 1])
  const nopeOpacity = useTransform(x, [-110, -20], [1, 0])

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden rounded-3xl shadow-xl"
      style={{ x, rotate, zIndex: 10 - depth, background: profile.bg }}
      initial={{ scale: 0.85, y: 30, opacity: 0 }}
      animate={{ scale: 1 - depth * 0.05, y: depth * 14, opacity: depth > 2 ? 0 : 1 }}
      variants={{
        // rotate は x から useTransform で連動するので x だけ飛ばせばよい
        exit: (dir: Dir) => ({ x: dir * 420, opacity: 0, transition: { duration: 0.35 } }),
      }}
      exit="exit"
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      drag={isTop ? 'x' : false}
      dragMomentum={false}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > 110 || Math.abs(info.velocity.x) > 650) {
          onSwipe(info.offset.x > 0 ? 1 : -1)
        } else {
          animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 })
        }
      }}
    >
      <div className={`flex h-full flex-col ${isTop ? 'cursor-grab active:cursor-grabbing' : ''}`}>
        <div className="flex flex-1 items-center justify-center text-8xl drop-shadow-lg">{profile.emoji}</div>
        <div className="bg-gradient-to-t from-black/60 to-transparent p-4 text-white">
          <div className="text-2xl font-bold">
            {profile.name} <span className="font-light">{profile.age}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-white/80">
            <MapPin size={12} /> {profile.km} km 先
          </div>
          <div className="mt-2 flex gap-1.5">
            {profile.tags.map((t) => (
              <span key={t} className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] backdrop-blur">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
      {isTop && (
        <>
          <motion.div
            style={{ opacity: likeOpacity }}
            className="pointer-events-none absolute left-4 top-5 -rotate-12 rounded-lg border-4 border-emerald-400 px-2 text-2xl font-black tracking-wider text-emerald-400"
          >
            LIKE
          </motion.div>
          <motion.div
            style={{ opacity: nopeOpacity }}
            className="pointer-events-none absolute right-4 top-5 rotate-12 rounded-lg border-4 border-rose-500 px-2 text-2xl font-black tracking-wider text-rose-500"
          >
            NOPE
          </motion.div>
        </>
      )}
    </motion.div>
  )
}

/**
 * Tinder 風スワイプデッキ。Motion の drag="x" + useTransform で回転と LIKE/NOPE の透明度を連動。
 * 閾値(移動量 or 速度)を超えたら AnimatePresence の exit で画面外へ飛ばす。
 */
export function SwipeDeck() {
  const [cards, setCards] = useState(PROFILES)
  const [exitDir, setExitDir] = useState<Dir>(1)
  const [log, setLog] = useState<string | null>(null)

  const swipe = (dir: Dir) => {
    const top = cards[0]
    if (!top) return
    setExitDir(dir)
    setCards((cs) => cs.slice(1))
    setLog(`${top.name} を ${dir === 1 ? 'LIKE ❤️' : 'NOPE ✕'}`)
  }

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-4 overflow-hidden bg-gradient-to-b from-rose-50 to-orange-50">
      <div className="relative h-[250px] w-[190px]">
        <AnimatePresence custom={exitDir}>
          {cards.slice(0, 4).map((p, i) => (
            <SwipeCard key={p.id} profile={p} depth={i} onSwipe={swipe} />
          ))}
        </AnimatePresence>
        {cards.length === 0 && (
          <div className="absolute inset-0 grid place-items-center rounded-3xl border-2 border-dashed border-rose-200 text-center text-sm text-rose-400">
            <div>
              すべて見ました 🎉
              <button
                onClick={() => {
                  setCards(PROFILES)
                  setLog(null)
                }}
                className="mx-auto mt-2 flex items-center gap-1 rounded-full bg-rose-500 px-3 py-1 text-xs text-white"
              >
                <RotateCcw size={12} /> もう一度
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-5">
        <button
          onClick={() => swipe(-1)}
          className="grid h-12 w-12 place-items-center rounded-full bg-white text-rose-500 shadow-lg transition hover:scale-110 active:scale-95"
          aria-label="NOPE"
        >
          <X size={22} strokeWidth={3} />
        </button>
        <span className="w-28 truncate text-center text-[11px] text-zinc-500">{log ?? 'ドラッグで左右に'}</span>
        <button
          onClick={() => swipe(1)}
          className="grid h-12 w-12 place-items-center rounded-full bg-white text-emerald-500 shadow-lg transition hover:scale-110 active:scale-95"
          aria-label="LIKE"
        >
          <Heart size={22} fill="currentColor" />
        </button>
      </div>
    </div>
  )
}
