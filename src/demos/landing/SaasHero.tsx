import { useRef } from 'react'
import { motion, useMotionValue, useScroll, useSpring, useTransform } from 'motion/react'
import { ArrowRight, ChevronRight, Play, Sparkles } from 'lucide-react'

const LOGOS = ['Northwind', 'LUMEN', 'quanta', 'Orbitly', 'HALCYON', 'Vertex', 'kumo.', 'Arcadia']
const BARS = [38, 52, 44, 68, 57, 80, 74, 92, 70, 86, 98, 90]

/** 製品スクリーンショット(HTML/CSSだけで作ったダッシュボード) */
function AppMock() {
  return (
    <div className="flex h-full w-full overflow-hidden rounded-xl border border-white/10 bg-[#0b0b12] text-left text-[10px] text-zinc-400">
      <aside className="hidden w-36 shrink-0 flex-col gap-1 border-r border-white/5 p-3 @2xl:flex">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-zinc-100">
          <span className="h-4 w-4 rounded bg-gradient-to-br from-indigo-400 to-fuchsia-500" /> Flowline
        </div>
        {['受信トレイ', 'マイタスク', 'ワークフロー', 'レポート', '自動化', '設定'].map((t, i) => (
          <div key={t} className={`rounded-md px-2 py-1.5 ${i === 2 ? 'bg-white/10 text-zinc-100' : ''}`}>
            {t}
          </div>
        ))}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-3">
        <div className="flex items-center justify-between">
          <div className="text-[12px] font-semibold text-zinc-100">ワークフロー概要</div>
          <div className="flex gap-1.5">
            <span className="rounded-md border border-white/10 px-2 py-1">今週</span>
            <span className="rounded-md bg-indigo-500 px-2 py-1 text-white">+ 新規</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            ['完了タスク', '1,284', '+12%'],
            ['自動化率', '73%', '+8%'],
            ['平均リードタイム', '2.4日', '-18%'],
          ].map(([k, v, d]) => (
            <div key={k} className="rounded-lg border border-white/5 bg-white/[0.03] p-2">
              <div>{k}</div>
              <div className="mt-1 text-[15px] font-semibold text-zinc-100">{v}</div>
              <div className="text-emerald-400">{d}</div>
            </div>
          ))}
        </div>
        <div className="flex min-h-0 flex-1 gap-2">
          <div className="flex flex-1 items-end gap-1 rounded-lg border border-white/5 bg-white/[0.03] p-2">
            {BARS.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-gradient-to-t from-indigo-500/40 to-fuchsia-400"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="hidden w-40 flex-col gap-1.5 rounded-lg border border-white/5 bg-white/[0.03] p-2 @xl:flex">
            {['請求書の承認', 'LP改修レビュー', '週次レポート', '採用面接の調整'].map((t, i) => (
              <div key={t} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${['bg-emerald-400', 'bg-amber-400', 'bg-indigo-400', 'bg-pink-400'][i]}`} />
                <span className="truncate">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function SaasHero() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ container: ref })
  const hover = useMotionValue(0)
  const tilt = useTransform([scrollYProgress, hover], ([p, h]: number[]) => (1 - Math.min(1, p * 2.2)) * 26 * (1 - h))
  const rotateX = useSpring(tilt, { stiffness: 110, damping: 20 })
  const scale = useTransform(rotateX, [26, 0], [0.9, 1])
  const hintOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0])

  return (
    <div ref={ref} className="@container relative h-full w-full overflow-x-hidden overflow-y-auto bg-[#06060a] font-[Inter,'Noto_Sans_JP',sans-serif] text-white">
      <style>{`@keyframes saas-marquee{to{transform:translateX(-50%)}}`}</style>
      {/* 背景グリッド + 光 */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[700px] opacity-60"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.06) 1px,transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage: 'radial-gradient(ellipse 60% 50% at 50% 0%, black, transparent)',
        }}
      />
      <div className="pointer-events-none absolute top-[-180px] left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-indigo-600/30 blur-[100px]" />

      <section className="relative mx-auto flex max-w-5xl flex-col items-center px-5 pt-12 text-center @3xl:pt-16">
        <motion.a
          href="#"
          onClick={(e) => e.preventDefault()}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pr-3 pl-1 text-xs text-zinc-300 backdrop-blur hover:border-white/20"
        >
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/20 px-2 py-0.5 text-indigo-200">
            <Sparkles size={11} /> v3.0
          </span>
          AIワークフロー自動化をリリース
          <ChevronRight size={13} className="transition group-hover:translate-x-0.5" />
        </motion.a>
        <motion.h1
          initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ delay: 0.1, duration: 0.7 }}
          className="mt-5 bg-gradient-to-b from-white via-white to-zinc-500 bg-clip-text text-[clamp(30px,7cqw,64px)] leading-[1.1] font-bold tracking-tight text-transparent"
        >
          チームの仕事を、
          <br />
          <span className="bg-gradient-to-r from-indigo-300 via-fuchsia-300 to-orange-200 bg-clip-text">ひとつの流れに。</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 max-w-xl text-[13px] leading-relaxed text-zinc-400 @2xl:text-[15px]"
        >
          Flowline はタスク・ドキュメント・承認フローを一つにまとめ、繰り返し作業を AI が自動化するワークスペースです。
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6 flex flex-wrap justify-center gap-3"
        >
          <button className="group inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 shadow-[0_0_30px_rgba(129,140,248,.45)] transition hover:bg-zinc-200">
            無料で始める <ArrowRight size={15} className="transition group-hover:translate-x-0.5" />
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-zinc-200 transition hover:bg-white/10">
            <Play size={14} /> デモを見る
          </button>
        </motion.div>
        <p className="mt-3 text-[11px] text-zinc-500">クレジットカード不要・14日間すべての機能を無料で</p>

        {/* 3Dに傾いたスクリーンショット: スクロール or ホバーで正面に */}
        <div className="relative mt-10 w-full [perspective:1200px]">
          <div className="absolute inset-x-[10%] top-[10%] bottom-0 rounded-full bg-gradient-to-r from-indigo-500/40 via-fuchsia-500/40 to-orange-400/30 blur-[70px]" />
          <motion.div
            onHoverStart={() => hover.set(1)}
            onHoverEnd={() => hover.set(0)}
            style={{ rotateX, scale, transformOrigin: '50% 0%' }}
            className="relative aspect-[16/9] w-full rounded-2xl border border-white/15 bg-white/5 p-1.5 shadow-2xl shadow-indigo-950/60 backdrop-blur"
          >
            <AppMock />
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/10 via-transparent to-transparent" />
          </motion.div>
        </div>
      </section>

      {/* ロゴのマーキー */}
      <section className="relative py-10">
        <p className="mb-5 text-center text-[11px] tracking-[0.2em] text-zinc-500 uppercase">8,000社以上のチームが利用中</p>
        <div className="overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_15%,black_85%,transparent)]">
          <div className="flex w-max animate-[saas-marquee_28s_linear_infinite] gap-12 hover:[animation-play-state:paused]">
            {[...LOGOS, ...LOGOS].map((l, i) => (
              <span key={i} className="text-xl font-semibold whitespace-nowrap text-zinc-500 transition hover:text-zinc-200">
                {l}
              </span>
            ))}
          </div>
        </div>
      </section>
      <div className="pointer-events-none sticky bottom-2 flex justify-center">
        <motion.span
          style={{ opacity: hintOpacity }}
          className="rounded-full bg-white/10 px-3 py-1 text-[10px] text-zinc-300 backdrop-blur"
        >
          スクロールすると画面が起き上がります ↓
        </motion.span>
      </div>
    </div>
  )
}
