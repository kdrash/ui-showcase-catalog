import { motion, useScroll, useTransform, type MotionValue } from 'motion/react'
import { useRef } from 'react'

/**
 * スクロールに合わせて文章が1語ずつ浮かび上がる演出(Motion)。
 * sticky な段落 + useScroll({ container, target }) の進捗を、単語ごとの区間 [i/n, (i+1)/n] に分割して
 * opacity と blur を useTransform でマッピングする。
 */

const TEXT =
  'We believe great interfaces feel inevitable. Every pixel earns its place, every motion explains something, and nothing ever asks you to wait. 道具は、使う人のために。'

function Word({ children, range, progress, accent }: { children: string; range: [number, number]; progress: MotionValue<number>; accent: boolean }) {
  const opacity = useTransform(progress, range, [0.12, 1])
  const blur = useTransform(progress, range, [6, 0])
  const filter = useTransform(blur, (b) => `blur(${b}px)`)
  const y = useTransform(progress, range, [8, 0])
  return (
    <motion.span style={{ opacity, filter, y }} className={`mr-[0.28em] inline-block ${accent ? 'text-amber-300' : ''}`}>
      {children}
    </motion.span>
  )
}

export function TextRevealScroll() {
  const scroller = useRef<HTMLDivElement>(null)
  const target = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ container: scroller, target, offset: ['start start', 'end end'] })
  const bar = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])
  const words = TEXT.split(' ')
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0c0c0f] text-white">
      <div ref={scroller} className="thin-scroll absolute inset-0 overflow-y-auto [container-type:size]">
        <div ref={target} className="relative h-[520cqh]">
          <div className="sticky top-0 flex h-[100cqh] flex-col justify-center px-[7%]">
            <p className="mb-4 font-mono text-[11px] tracking-[0.3em] text-zinc-500">MANIFESTO — ↓ スクロール</p>
            <p className="font-['Space_Grotesk'] text-[clamp(20px,4.6cqw,46px)] leading-[1.15] font-semibold tracking-tight">
              {words.map((w, i) => {
                const start = (i / words.length) * 0.9
                return (
                  <Word key={i} progress={scrollYProgress} range={[start, start + 0.9 / words.length + 0.04]} accent={/inevitable|wait|道具/.test(w)}>
                    {w}
                  </Word>
                )
              })}
            </p>
            <div className="mt-6 h-px w-full bg-white/10">
              <motion.div style={{ width: bar }} className="h-px bg-amber-300" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
