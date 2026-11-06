import { useEffect, useId, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Clock, Flame, X } from 'lucide-react'

type Recipe = {
  id: string
  title: string
  emoji: string
  bg: string
  time: string
  kcal: number
  desc: string
  tags: string[]
}

const RECIPES: Recipe[] = [
  {
    id: 'ramen',
    title: '濃厚味噌ラーメン',
    emoji: '🍜',
    bg: 'linear-gradient(135deg,#fed7aa,#fb923c)',
    time: '25分',
    kcal: 680,
    desc: '炒めた野菜の甘みと合わせ味噌のコク。仕上げにバターとコーンを乗せて北海道風に。',
    tags: ['味噌', 'もやし', 'バター', 'コーン'],
  },
  {
    id: 'sushi',
    title: '手まり寿司',
    emoji: '🍣',
    bg: 'linear-gradient(135deg,#fecdd3,#fb7185)',
    time: '30分',
    kcal: 420,
    desc: 'ラップでくるっと丸めるだけ。カラフルなネタでおもてなしにもぴったり。',
    tags: ['酢飯', 'サーモン', 'まぐろ', '大葉'],
  },
  {
    id: 'curry',
    title: 'スパイスカレー',
    emoji: '🍛',
    bg: 'linear-gradient(135deg,#fde68a,#d97706)',
    time: '40分',
    kcal: 750,
    desc: 'クミンとコリアンダーをテンパリング。玉ねぎを飴色まで炒めるのがポイント。',
    tags: ['クミン', '玉ねぎ', '鶏もも', 'トマト'],
  },
]

/**
 * Motion の layoutId による共有要素トランジション。
 * 一覧のカード・画像・タイトルと、詳細パネルの同名要素に同じ layoutId を付けると
 * Motion が位置とサイズの差を自動で補間してくれる。(useId で接頭辞を付けて複数インスタンスでも衝突しない)
 */
export function ExpandableCards() {
  const uid = useId()
  const [active, setActive] = useState<Recipe | null>(null)

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setActive(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])

  return (
    <div className="relative h-full w-full overflow-hidden bg-stone-100 p-5 text-stone-900">
      <p className="text-[10px] uppercase tracking-[0.25em] text-stone-400">Today’s Recipes</p>
      <h3 className="mb-4 text-lg font-bold">今日のレシピ</h3>

      <ul className="grid grid-cols-3 gap-3">
        {RECIPES.map((r) => (
          <motion.li
            key={r.id}
            layoutId={`${uid}-card-${r.id}`}
            onClick={() => setActive(r)}
            className="cursor-pointer list-none bg-white p-2 shadow-sm transition-shadow hover:shadow-md"
            style={{ borderRadius: 16 }}
          >
            <motion.div
              layoutId={`${uid}-img-${r.id}`}
              className="grid aspect-square place-items-center text-4xl"
              style={{ background: r.bg, borderRadius: 12 }}
            >
              {r.emoji}
            </motion.div>
            <motion.h4 layoutId={`${uid}-title-${r.id}`} className="mt-2 truncate text-xs font-semibold">
              {r.title}
            </motion.h4>
            <p className="mt-0.5 flex items-center gap-1 text-[10px] text-stone-400">
              <Clock size={10} /> {r.time}
            </p>
          </motion.li>
        ))}
      </ul>

      <AnimatePresence>
        {active && (
          <motion.div
            key="backdrop"
            className="absolute inset-0 bg-stone-900/30 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActive(null)}
          />
        )}
        {active && (
          <div key="panel" className="pointer-events-none absolute inset-0 grid place-items-center p-4">
            <motion.div
              layoutId={`${uid}-card-${active.id}`}
              className="pointer-events-auto relative w-full max-w-[340px] overflow-hidden bg-white shadow-2xl"
              style={{ borderRadius: 24 }}
            >
              <motion.div
                layoutId={`${uid}-img-${active.id}`}
                className="grid h-28 place-items-center text-6xl"
                style={{ background: active.bg, borderRadius: 0 }}
              >
                {active.emoji}
              </motion.div>
              <button
                onClick={() => setActive(null)}
                className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-white/80 text-stone-700 hover:bg-white"
                aria-label="閉じる"
              >
                <X size={14} />
              </button>
              <div className="p-4">
                <motion.h4 layoutId={`${uid}-title-${active.id}`} className="text-lg font-bold">
                  {active.title}
                </motion.h4>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: 0.12 } }}
                  exit={{ opacity: 0, transition: { duration: 0.05 } }}
                >
                  <div className="mt-1 flex gap-3 text-xs text-stone-500">
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {active.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <Flame size={12} /> {active.kcal} kcal
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-stone-600">{active.desc}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {active.tags.map((t) => (
                      <span key={t} className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600">
                        {t}
                      </span>
                    ))}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
