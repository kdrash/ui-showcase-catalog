import { motion, useScroll, useSpring } from 'motion/react'
import { useRef } from 'react'
import { Flag, Globe2, Rocket, Sparkles, Trophy, Users } from 'lucide-react'

/**
 * スクロールで線が伸びる縦タイムライン。
 * - useScroll({ container, target, offset }) の進捗で中央線を scaleY
 * - 各イベントは whileInView で左右からスライドイン、ドットが点灯
 * - Tailwind v4 のコンテナクエリ(@container / @xl:)で、狭い幅では片側、広い幅では左右交互レイアウト
 */

const EVENTS = [
  { year: '2019', title: 'プロジェクト始動', body: '3人のチームで小さなプロトタイプから開発をスタート。', icon: Flag },
  { year: '2020', title: 'ベータ版公開', body: '最初の1,000人のユーザーがウェイトリストから参加。', icon: Rocket },
  { year: '2021', title: 'チーム拡大', body: 'デザイナーとエンジニアが加わり、20名体制に。', icon: Users },
  { year: '2022', title: 'グローバル展開', body: '12言語に対応し、40ヶ国で利用可能に。', icon: Globe2 },
  { year: '2023', title: 'アワード受賞', body: 'ベストデザイン賞を受賞。UIの評価が高まる。', icon: Trophy },
  { year: '2024', title: '次のステージへ', body: 'AI機能を統合した新バージョンをリリース。', icon: Sparkles },
]

export function AnimatedTimeline() {
  const ref = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ container: ref, target: listRef, offset: ['start 70%', 'end 60%'] })
  const scaleY = useSpring(scrollYProgress, { stiffness: 140, damping: 26 })

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-[#0a0a12] text-white"
      style={{ fontFamily: "Inter, 'Noto Sans JP', sans-serif" }}
    >
      <div className="pointer-events-none absolute -left-20 top-0 h-60 w-60 rounded-full bg-violet-700/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-60 w-60 rounded-full bg-cyan-600/20 blur-3xl" />
      <div ref={ref} className="@container relative h-full overflow-y-auto overscroll-contain px-5 pb-24 pt-8">
        <header className="mb-8 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-violet-300/70">History</p>
          <h3 className="mt-1 text-2xl font-bold">私たちのあゆみ</h3>
          <p className="mt-1 text-xs text-zinc-500">↓ スクロールすると線が伸びます</p>
        </header>

        <div ref={listRef} className="relative mx-auto max-w-2xl">
          {/* track + progress line */}
          <div className="absolute left-4 top-0 h-full w-px bg-white/10 @xl:left-1/2" />
          <motion.div
            style={{ scaleY }}
            className="absolute left-4 top-0 h-full w-[2px] origin-top -translate-x-[0.5px] bg-gradient-to-b from-violet-500 via-fuchsia-500 to-cyan-400 shadow-[0_0_12px_rgba(168,85,247,0.8)] @xl:left-1/2"
          />

          {EVENTS.map((e, i) => {
            const left = i % 2 === 0
            return (
              <div
                key={e.year}
                className={`relative mb-8 pl-12 last:mb-0 ${left ? '@xl:w-1/2 @xl:pl-0 @xl:pr-10 @xl:text-right' : '@xl:ml-[50%] @xl:w-1/2 @xl:pl-10'}`}
              >
                <motion.span
                  initial={{ scale: 0.4, backgroundColor: '#27272a', boxShadow: '0 0 0 0 rgba(168,85,247,0)' }}
                  whileInView={{ scale: 1, backgroundColor: '#a855f7', boxShadow: '0 0 0 6px rgba(168,85,247,0.18)' }}
                  viewport={{ root: ref, amount: 1, margin: '0px 0px -35% 0px' }}
                  transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                  className={`absolute left-4 top-3 grid h-7 w-7 -translate-x-1/2 place-items-center rounded-full text-white ${left ? '@xl:left-auto @xl:right-0 @xl:translate-x-1/2' : '@xl:left-0'}`}
                >
                  <e.icon size={13} />
                </motion.span>
                <motion.div
                  initial={{ opacity: 0, x: left ? -40 : 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ root: ref, amount: 0.6 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur"
                >
                  <p className="font-mono text-xs font-semibold text-cyan-300">{e.year}</p>
                  <h4 className="mt-0.5 font-semibold">{e.title}</h4>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-400">{e.body}</p>
                </motion.div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
