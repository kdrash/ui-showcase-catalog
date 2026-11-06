import { useRef, type PointerEvent, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { Bot, ChartLine, Lock, Plug, Users, Zap } from 'lucide-react'

/* ---- 各機能のミニイラスト ---- */
const SyncArt = () => (
  <div className="flex h-full items-end justify-center gap-1.5">
    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
      <motion.span
        key={i}
        className="w-2.5 rounded-full bg-gradient-to-t from-sky-500/30 to-sky-300"
        animate={{ height: ['20%', '85%', '35%'] }}
        transition={{ duration: 1.4, repeat: Infinity, repeatType: 'mirror', delay: i * 0.12, ease: 'easeInOut' }}
      />
    ))}
  </div>
)
const LockArt = () => (
  <svg viewBox="0 0 100 70" className="h-full w-full">
    <motion.circle
      cx="50" cy="35" r="28" fill="none" stroke="rgb(167 139 250 / .5)" strokeWidth="1.5" strokeDasharray="4 6"
      animate={{ rotate: 360 }} transition={{ duration: 12, repeat: Infinity, ease: 'linear' }} style={{ originX: '50px', originY: '35px' }}
    />
    <rect x="38" y="33" width="24" height="20" rx="4" fill="rgb(167 139 250)" />
    <path d="M43 33v-6a7 7 0 0 1 14 0v6" fill="none" stroke="rgb(167 139 250)" strokeWidth="3" />
    <circle cx="50" cy="42" r="2.5" fill="#0a0a0f" />
  </svg>
)
const AiArt = () => (
  <div className="flex h-full flex-col justify-center gap-2 px-2">
    {[90, 70, 82, 45].map((w, i) => (
      <motion.span
        key={i}
        className="h-2 rounded-full bg-gradient-to-r from-fuchsia-400/80 via-fuchsia-300/40 to-transparent"
        initial={{ width: 0 }}
        animate={{ width: [`0%`, `${w}%`, `${w}%`] }}
        transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.25, times: [0, 0.4, 1] }}
      />
    ))}
  </div>
)
const CursorArt = () => (
  <div className="relative h-full">
    {[
      { c: '#34d399', n: 'Aoi', path: { x: [10, 70, 40, 10], y: [10, 30, 50, 10] } },
      { c: '#f472b6', n: 'Ken', path: { x: [90, 30, 80, 90], y: [45, 15, 20, 45] } },
    ].map((u) => (
      <motion.div key={u.n} className="absolute" animate={u.path} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}>
        <svg width="14" height="14" viewBox="0 0 14 14">
          <path d="M1 1l11 5-5 1.5L5 13z" fill={u.c} />
        </svg>
        <span className="ml-3 rounded px-1 text-[9px] font-semibold text-black" style={{ background: u.c }}>
          {u.n}
        </span>
      </motion.div>
    ))}
  </div>
)
const ChartArt = () => (
  <svg viewBox="0 0 120 60" className="h-full w-full">
    <motion.path
      d="M2 52 C 20 48, 26 30, 42 34 S 64 50, 78 26 S 104 14, 118 6"
      fill="none" stroke="url(#fg-g)" strokeWidth="2.5" strokeLinecap="round"
      animate={{ pathLength: [0, 1, 1] }} transition={{ duration: 3, repeat: Infinity, times: [0, 0.6, 1] }}
    />
    <defs>
      <linearGradient id="fg-g" x1="0" x2="1">
        <stop offset="0" stopColor="#34d399" />
        <stop offset="1" stopColor="#a3e635" />
      </linearGradient>
    </defs>
  </svg>
)
const OrbitArt = () => (
  <div className="relative grid h-full place-items-center">
    <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-400/90 text-[10px] font-black text-black">N</span>
    <motion.div className="absolute h-[70px] w-[70px]" animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}>
      {['#60a5fa', '#f472b6', '#34d399', '#fbbf24'].map((c, i) => (
        <span
          key={c}
          className="absolute h-3.5 w-3.5 rounded-md"
          style={{ background: c, left: `${50 + 50 * Math.cos((i * Math.PI) / 2)}%`, top: `${50 + 50 * Math.sin((i * Math.PI) / 2)}%`, transform: 'translate(-50%,-50%)' }}
        />
      ))}
    </motion.div>
  </div>
)

const FEATURES: { icon: ReactNode; title: string; text: string; art: ReactNode; span?: string }[] = [
  { icon: <Zap size={15} />, title: '瞬時に同期', text: 'すべてのデバイスで 50ms 以内に変更が反映。', art: <SyncArt />, span: '@3xl:col-span-2' },
  { icon: <Lock size={15} />, title: 'エンドツーエンド暗号化', text: 'データは保存時・転送時ともに暗号化。', art: <LockArt /> },
  { icon: <Bot size={15} />, title: 'AI要約', text: '長いスレッドも3行に要約して共有。', art: <AiArt /> },
  { icon: <Users size={15} />, title: 'リアルタイム共同編集', text: '誰がどこを触っているか一目でわかる。', art: <CursorArt /> },
  { icon: <ChartLine size={15} />, title: '分析ダッシュボード', text: 'チームの生産性をグラフで可視化。', art: <ChartArt /> },
  { icon: <Plug size={15} />, title: '120以上の連携', text: 'Slack・GitHub・Notion などとつながる。', art: <OrbitArt />, span: '@3xl:col-span-2' },
]

export function FeatureGridGlow() {
  const gridRef = useRef<HTMLDivElement>(null)
  /** カーソル位置を各カード基準の座標に変換して CSS 変数へ(全カードの枠が同時に光る) */
  const onMove = (e: PointerEvent) => {
    gridRef.current?.querySelectorAll<HTMLElement>('[data-glow]').forEach((el) => {
      const r = el.getBoundingClientRect()
      el.style.setProperty('--x', `${e.clientX - r.left}px`)
      el.style.setProperty('--y', `${e.clientY - r.top}px`)
    })
  }
  return (
    <div className="@container relative h-full w-full overflow-y-auto bg-[#07070b] font-[Inter,'Noto_Sans_JP',sans-serif] text-white">
      <div className="mx-auto max-w-5xl px-5 py-8">
        <div className="mb-6 text-center">
          <p className="text-[11px] tracking-[0.25em] text-zinc-500 uppercase">Features</p>
          <h2 className="mt-2 text-[clamp(20px,4cqw,34px)] font-bold tracking-tight">必要なものは、すべてここに。</h2>
        </div>
        <div ref={gridRef} onPointerMove={onMove} className="group/grid grid grid-cols-1 gap-3 @lg:grid-cols-2 @3xl:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              data-glow
              className={`relative rounded-2xl p-px [--x:-999px] [--y:-999px] ${f.span ?? ''}`}
              style={{
                background:
                  'radial-gradient(320px circle at var(--x) var(--y), rgba(167,139,250,.9), rgba(56,189,248,.35) 30%, transparent 60%), rgba(255,255,255,.08)',
              }}
            >
              <div className="relative h-full overflow-hidden rounded-[15px] bg-[#0c0c12] p-4">
                {/* 内側のやわらかい光 */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/grid:opacity-100"
                  style={{ background: 'radial-gradient(240px circle at var(--x) var(--y), rgba(167,139,250,.12), transparent 60%)' }}
                />
                <div className="relative h-20">{f.art}</div>
                <div className="relative mt-3 flex items-center gap-2 text-sm font-semibold">
                  <span className="grid h-6 w-6 place-items-center rounded-md bg-white/10 text-zinc-200">{f.icon}</span>
                  {f.title}
                </div>
                <p className="relative mt-1.5 text-xs leading-relaxed text-zinc-400">{f.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
