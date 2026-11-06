import { motion, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import { art } from '../_shared/art'

/**
 * ズームパララックス:中央の画像と周囲の画像が異なる倍率で拡大し、最後は中央の1枚が画面いっぱいに。
 * sticky なステージ上の各画像に、useScroll の進捗 → useTransform で scale(1→4〜9) を割り当てる。
 */

const PICS = [
  { seed: 0, kind: 'landscape' as const, pos: 'top-[37.5%] left-[37.5%] w-[25%] h-[25%]', scale: 4 },
  { seed: 5, kind: 'gradient' as const, pos: 'top-[8%] left-[42%] w-[30%] h-[26%]', scale: 5 },
  { seed: 2, kind: 'landscape' as const, pos: 'top-[30%] left-[14%] w-[20%] h-[42%]', scale: 6 },
  { seed: 7, kind: 'geometric' as const, pos: 'top-[38%] left-[64.5%] w-[22%] h-[24%]', scale: 5 },
  { seed: 4, kind: 'landscape' as const, pos: 'top-[64.5%] left-[39%] w-[18%] h-[24%]', scale: 6 },
  { seed: 3, kind: 'gradient' as const, pos: 'top-[66%] left-[59%] w-[24%] h-[22%]', scale: 8 },
  { seed: 6, kind: 'landscape' as const, pos: 'top-[10%] left-[17%] w-[22%] h-[18%]', scale: 9 },
]

export function ZoomParallax() {
  const scroller = useRef<HTMLDivElement>(null)
  const target = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ container: scroller, target, offset: ['start start', 'end end'] })
  const s4 = useTransform(scrollYProgress, [0, 1], [1, 4])
  const s5 = useTransform(scrollYProgress, [0, 1], [1, 5])
  const s6 = useTransform(scrollYProgress, [0, 1], [1, 6])
  const s8 = useTransform(scrollYProgress, [0, 1], [1, 8])
  const s9 = useTransform(scrollYProgress, [0, 1], [1, 9])
  const map: Record<number, typeof s4> = { 4: s4, 5: s5, 6: s6, 8: s8, 9: s9 }
  const captionOpacity = useTransform(scrollYProgress, [0.75, 0.95], [0, 1])
  const hintOpacity = useTransform(scrollYProgress, [0, 0.08], [1, 0])

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0a0a0a] text-white">
      <div ref={scroller} className="thin-scroll absolute inset-0 overflow-y-auto [container-type:size]">
        <div ref={target} className="relative h-[460cqh]">
          <div className="sticky top-0 h-[100cqh] overflow-hidden">
            {PICS.map((p, i) => (
              <motion.div key={i} style={{ scale: map[p.scale] }} className="absolute inset-0 flex items-center justify-center will-change-transform">
                <div className={`absolute overflow-hidden rounded-md ${p.pos}`}>
                  <img src={art(p.kind, p.seed, 800, 600)} alt="" className="h-full w-full object-cover" />
                </div>
              </motion.div>
            ))}
            <motion.div style={{ opacity: captionOpacity }} className="pointer-events-none absolute inset-0 grid place-items-center">
              <h2 className="font-['Playfair_Display'] text-[clamp(30px,8cqw,72px)] italic drop-shadow-[0_4px_30px_rgba(0,0,0,.6)]">Into the view.</h2>
            </motion.div>
            <motion.p style={{ opacity: hintOpacity }} className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs backdrop-blur">
              ↓ スクロール
            </motion.p>
          </div>
        </div>
      </div>
    </div>
  )
}
