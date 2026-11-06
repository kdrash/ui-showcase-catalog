import { motion, useScroll, useSpring, useTransform } from 'motion/react'
import { useRef, type RefObject } from 'react'
import { Layers, MousePointer2, Sparkles, Zap } from 'lucide-react'

/**
 * Motion の useScroll({ container }) を使ったスクロール演出。
 * - 上部のプログレスバー (scrollYProgress → useSpring → scaleX)
 * - ヒーローのパララックス (useTransform で y / scale / opacity をスクロール量にマッピング)
 * - whileInView + viewport.root でセクションのフェードイン
 * - target 指定の useScroll で、ギャラリー列ごとに異なる速度のパララックス
 */

const FEATURES = [
  { icon: Zap, title: '高速', body: 'スクロール量を MotionValue として受け取り、再レンダーなしで 60fps を維持。', color: 'from-amber-400 to-orange-500' },
  { icon: Layers, title: 'レイヤー', body: '要素ごとに異なる速度で動かすことで奥行きのあるパララックスに。', color: 'from-sky-400 to-indigo-500' },
  { icon: MousePointer2, title: 'インタラクティブ', body: 'whileInView で画面に入った瞬間にアニメーションを開始。', color: 'from-pink-400 to-rose-500' },
  { icon: Sparkles, title: 'なめらか', body: 'useSpring を挟むとプログレスバーが物理ベースで追従します。', color: 'from-emerald-400 to-teal-500' },
]

const COLS = [
  ['#fda4af', '#fdba74', '#fcd34d'],
  ['#a5b4fc', '#93c5fd', '#67e8f9'],
  ['#86efac', '#5eead4', '#c4b5fd'],
]

function ParallaxGallery({ root }: { root: RefObject<HTMLDivElement | null> }) {
  const target = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ container: root, target, offset: ['start end', 'end start'] })
  const y0 = useTransform(scrollYProgress, [0, 1], [60, -60])
  const y1 = useTransform(scrollYProgress, [0, 1], [-40, 40])
  const y2 = useTransform(scrollYProgress, [0, 1], [90, -90])
  const ys = [y0, y1, y2]
  return (
    <section ref={target} className="relative overflow-hidden px-6 py-16">
      <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Parallax columns</p>
      <div className="mx-auto grid max-w-md grid-cols-3 gap-3">
        {COLS.map((col, ci) => (
          <motion.div key={ci} style={{ y: ys[ci] }} className="flex flex-col gap-3">
            {col.map((c, i) => (
              <div
                key={i}
                className="rounded-2xl"
                style={{ height: 70 + ((ci + i) % 3) * 26, background: `linear-gradient(135deg, ${c}, white)` }}
              />
            ))}
          </motion.div>
        ))}
      </div>
    </section>
  )
}

export function ScrollReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollY, scrollYProgress } = useScroll({ container: ref })
  const progress = useSpring(scrollYProgress, { stiffness: 220, damping: 30, restDelta: 0.001 })
  const blobY = useTransform(scrollY, [0, 500], [0, -180])
  const blobY2 = useTransform(scrollY, [0, 500], [0, -60])
  const titleScale = useTransform(scrollY, [0, 260], [1, 0.82])
  const titleOpacity = useTransform(scrollY, [0, 220], [1, 0])

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-white text-zinc-900"
      style={{ fontFamily: "Inter, 'Noto Sans JP', sans-serif" }}
    >
      <motion.div style={{ scaleX: progress }} className="absolute inset-x-0 top-0 z-10 h-1 origin-left bg-zinc-900" />
      <div ref={ref} className="relative h-full overflow-y-auto overscroll-contain">
        {/* hero */}
        <section className="relative flex h-full items-center justify-center overflow-hidden">
          <motion.div
            style={{ y: blobY }}
            className="absolute -left-10 top-10 h-48 w-48 rounded-full bg-gradient-to-br from-fuchsia-300 to-violet-400 opacity-70 blur-2xl"
          />
          <motion.div
            style={{ y: blobY2 }}
            className="absolute -right-8 bottom-6 h-40 w-40 rounded-full bg-gradient-to-br from-sky-300 to-emerald-300 opacity-70 blur-2xl"
          />
          <motion.div style={{ scale: titleScale, opacity: titleOpacity }} className="relative text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-zinc-400">Motion · useScroll</p>
            <h3 className="mt-2 text-4xl font-bold tracking-tight">
              Scroll to
              <br />
              reveal.
            </h3>
            <p className="mt-3 text-xs text-zinc-500">↓ このエリアをスクロール</p>
          </motion.div>
        </section>

        {/* features */}
        <div className="space-y-4 px-6 py-6">
          {FEATURES.map((f, i) => (
            <motion.article
              key={f.title}
              initial={{ opacity: 0, y: 50, filter: 'blur(8px)' }}
              whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              viewport={{ root: ref, amount: 0.6 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: i % 2 ? 0.05 : 0 }}
              className="mx-auto flex max-w-md items-start gap-4 rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4"
            >
              <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white ${f.color}`}>
                <f.icon size={18} />
              </div>
              <div>
                <h4 className="font-semibold">{f.title}</h4>
                <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">{f.body}</p>
              </div>
            </motion.article>
          ))}
        </div>

        <ParallaxGallery root={ref} />

        <motion.section
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ root: ref, amount: 0.8 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="flex h-48 flex-col items-center justify-center gap-2"
        >
          <p className="text-2xl font-bold">That's it 👋</p>
          <p className="text-xs text-zinc-500">上に戻るとアニメーションが逆再生されます</p>
        </motion.section>
      </div>
    </div>
  )
}
