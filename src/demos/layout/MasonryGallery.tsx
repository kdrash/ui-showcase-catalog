import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useId, useMemo, useRef, useState, type ComponentType } from 'react'
import { Building2, Heart, Leaf, Orbit, Shapes, type LucideProps } from 'lucide-react'

/**
 * フィルター付きマソンリー(Pinterest風)ギャラリー。
 * - ResizeObserver で幅から列数を決め、各アイテムを「一番低い列」に配置(JSマソンリー)
 * - 各タイルは absolute + Motion の animate={{ x, y }} で、フィルター時に新しい位置へスプリング移動
 * - AnimatePresence で消える/現れるタイルをスケール+フェード
 * - 画像の代わりに CSS グラデーションを使用
 */

type Cat = 'Nature' | 'Abstract' | 'City' | 'Space'
const CATS: ('All' | Cat)[] = ['All', 'Nature', 'Abstract', 'City', 'Space']
const ICONS: Record<Cat, ComponentType<LucideProps>> = { Nature: Leaf, Abstract: Shapes, City: Building2, Space: Orbit }
const HUES: Record<Cat, number> = { Nature: 140, Abstract: 300, City: 30, Space: 230 }

const TITLES: Record<Cat, string[]> = {
  Nature: ['森の朝', '苔むす岩', '夏の葉', '湖畔', '山の稜線'],
  Abstract: ['流体', 'ノイズ', '幾何学', 'グラデーション', 'ゆらぎ'],
  City: ['夜の交差点', '高層ビル', '路地裏', 'ネオン'],
  Space: ['星雲', '月面', '銀河', '軌道'],
}

const ITEMS = (Object.keys(TITLES) as Cat[]).flatMap((cat, ci) =>
  TITLES[cat].map((title, i) => {
    const hue = HUES[cat] + ((i * 23) % 50) - 25
    return {
      id: `${cat}-${i}`,
      cat,
      title,
      h: 90 + ((i * 47 + ci * 31) % 110),
      likes: 12 + ((i * 37 + ci * 11) % 240),
      bg: `linear-gradient(${120 + i * 30}deg, hsl(${hue} 85% 72%), hsl(${hue + 40} 75% 52%))`,
    }
  }),
).sort((a, b) => (a.id.length * 7 + a.h) % 13 - ((b.id.length * 7 + b.h) % 13))

export function MasonryGallery() {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const innerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [filter, setFilter] = useState<(typeof CATS)[number]>('All')
  const [liked, setLiked] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    const el = innerRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { positions, totalH, colW } = useMemo(() => {
    const cols = width < 420 ? 2 : width < 720 ? 3 : 4
    const gap = 10
    const colW = width > 0 ? (width - gap * (cols - 1)) / cols : 0
    const heights = new Array(cols).fill(0) as number[]
    const visible = ITEMS.filter((it) => filter === 'All' || it.cat === filter)
    const positions = visible.map((item) => {
      const c = heights.indexOf(Math.min(...heights))
      const pos = { item, x: c * (colW + gap), y: heights[c] }
      heights[c] += item.h + gap
      return pos
    })
    return { positions, totalH: Math.max(0, ...heights), colW }
  }, [width, filter])

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden bg-[#faf7f2] text-zinc-900"
      style={{ fontFamily: "Inter, 'Noto Sans JP', sans-serif" }}
    >
      <div className="flex shrink-0 gap-1 overflow-x-auto px-3 pb-2 pt-3">
        {CATS.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`relative shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${filter === c ? 'text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            {filter === c && (
              <motion.span
                layoutId={`masonry-chip-${uid}`}
                className="absolute inset-0 rounded-full bg-zinc-900"
                transition={{ type: 'spring', stiffness: 500, damping: 34 }}
              />
            )}
            <span className="relative">{c}</span>
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3">
        <div ref={innerRef} className="relative" style={{ height: totalH }}>
          <AnimatePresence>
            {colW > 0 &&
              positions.map(({ item, x, y }) => {
                const Icon = ICONS[item.cat]
                const isLiked = liked.has(item.id)
                return (
                  <motion.figure
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.85, x, y }}
                    animate={{ opacity: 1, scale: 1, x, y }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                    style={{ width: colW, height: item.h, background: item.bg }}
                    className="group absolute left-0 top-0 overflow-hidden rounded-2xl shadow-sm"
                  >
                    <Icon
                      size={40}
                      strokeWidth={1.2}
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white/50 transition-transform duration-500 group-hover:scale-125"
                    />
                    <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/50 to-transparent p-2.5 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <span>
                        <span className="block text-[9px] uppercase tracking-widest opacity-70">{item.cat}</span>
                        <span className="text-xs font-semibold">{item.title}</span>
                      </span>
                      <motion.button
                        whileTap={{ scale: 1.4 }}
                        onClick={() =>
                          setLiked((s) => {
                            const n = new Set(s)
                            if (n.has(item.id)) n.delete(item.id)
                            else n.add(item.id)
                            return n
                          })
                        }
                        className="flex items-center gap-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] backdrop-blur"
                      >
                        <Heart size={11} className={isLiked ? 'fill-rose-500 text-rose-500' : ''} />
                        {item.likes + (isLiked ? 1 : 0)}
                      </motion.button>
                    </figcaption>
                  </motion.figure>
                )
              })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
