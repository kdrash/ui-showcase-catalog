import { useRef, type ReactNode } from 'react'
import { motion, useAnimationFrame, useMotionValue, useTransform } from 'motion/react'
import { Box, Cloud, Cpu, Feather, Flame, Gem, Globe, Hexagon, Layers, Rocket, Star, Zap } from 'lucide-react'

const wrap = (min: number, max: number, v: number) => {
  const r = max - min
  return ((((v - min) % r) + r) % r) + min
}

const LOGOS = [
  { icon: Hexagon, name: 'Hexa' },
  { icon: Rocket, name: 'Launchly' },
  { icon: Cloud, name: 'Nimbus' },
  { icon: Flame, name: 'Ignite' },
  { icon: Gem, name: 'Facet' },
  { icon: Layers, name: 'Stackr' },
  { icon: Globe, name: 'Orbis' },
]

const REVIEWS = [
  { text: '導入して3日で効果が出た', user: '@miki' },
  { text: 'UIが本当に気持ちいい', user: '@tanaka_dev' },
  { text: 'もう手放せません', user: '@yuko' },
  { text: 'チーム全員がハマった', user: '@kenji' },
  { text: 'ドキュメントが神', user: '@sora' },
  { text: '速すぎて笑った', user: '@hina' },
]

const REVIEW_ICONS = [Star, Zap, Cpu, Box, Feather, Star]

/**
 * Motion の useAnimationFrame で毎フレーム x(%) を進め、wrap で -50%〜0% をループ。
 * コンテンツを2回並べることで継ぎ目なく無限に流れる。ホバーで速度を 0 へ滑らかに減速。
 */
function MarqueeRow({ children, speed, reverse }: { children: ReactNode; speed: number; reverse?: boolean }) {
  const x = useMotionValue(0)
  const factor = useRef(1)
  const target = useRef(1)
  const translate = useTransform(x, (v) => `${v}%`)

  useAnimationFrame((_, delta) => {
    // 目標速度へ補間(ホバーで減速→停止、離すと加速)
    factor.current += (target.current - factor.current) * Math.min(1, delta / 250)
    const dir = reverse ? 1 : -1
    x.set(wrap(-50, 0, x.get() + dir * speed * factor.current * (delta / 1000)))
  })

  return (
    <div
      className="overflow-hidden py-1.5"
      onMouseEnter={() => (target.current = 0)}
      onMouseLeave={() => (target.current = 1)}
      style={{
        maskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
      }}
    >
      <motion.div className="flex w-max" style={{ x: translate }}>
        {children}
        {children}
      </motion.div>
    </div>
  )
}

export function InfiniteMarquee() {
  return (
    <div className="relative flex h-full w-full flex-col justify-center gap-2 overflow-hidden bg-[#09090b] text-white">
      <p className="mb-2 text-center text-[10px] uppercase tracking-[0.3em] text-zinc-500">
        Trusted by teams worldwide
      </p>
      <MarqueeRow speed={4}>
        {LOGOS.map(({ icon: Icon, name }) => (
          <div key={name} className="pr-3">
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-zinc-300 transition hover:border-white/30 hover:text-white">
              <Icon size={18} />
              <span className="text-sm font-semibold tracking-tight">{name}</span>
            </div>
          </div>
        ))}
      </MarqueeRow>
      <MarqueeRow speed={3} reverse>
        {REVIEWS.map((r, i) => {
          const Icon = REVIEW_ICONS[i]
          return (
            <div key={r.user} className="pr-3">
              <div className="w-56 rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent p-3">
                <div className="mb-1.5 flex items-center gap-2 text-xs text-zinc-400">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-indigo-500/20 text-indigo-300">
                    <Icon size={12} />
                  </span>
                  {r.user}
                </div>
                <p className="text-sm text-zinc-200">“{r.text}”</p>
              </div>
            </div>
          )
        })}
      </MarqueeRow>
      <p className="mt-2 text-center text-[10px] text-zinc-600">hover で減速して停止</p>
    </div>
  )
}
