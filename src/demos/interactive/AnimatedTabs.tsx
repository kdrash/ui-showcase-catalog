import { useId, useState } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { ChartBar, LayoutGrid, Settings } from 'lucide-react'

const tabs = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'analytics', label: 'Analytics', icon: ChartBar },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const
type TabId = (typeof tabs)[number]['id']

const nav = ['Home', 'Projects', 'Deployments', 'Logs', 'Usage']

function Panel({ id }: { id: TabId }) {
  if (id === 'overview')
    return (
      <div className="grid grid-cols-3 gap-2">
        {[
          ['Visitors', '24.8k', '+12%'],
          ['Revenue', '¥1.2M', '+8%'],
          ['Bounce', '32%', '-3%'],
        ].map(([k, v, d]) => (
          <div key={k} className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-[10px] text-zinc-500">{k}</p>
            <p className="text-lg font-semibold text-white">{v}</p>
            <p className="text-[10px] text-emerald-400">{d}</p>
          </div>
        ))}
      </div>
    )
  if (id === 'analytics')
    return (
      <div className="flex h-[76px] items-end gap-1.5 rounded-xl border border-white/10 bg-white/5 p-3">
        {[40, 65, 30, 80, 55, 90, 70, 45, 85, 60].map((h, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={{ height: `${h}%` }}
            transition={{ delay: i * 0.03, type: 'spring', bounce: 0.3 }}
            className="flex-1 rounded-sm bg-gradient-to-t from-indigo-500 to-fuchsia-400"
          />
        ))}
      </div>
    )
  return (
    <div className="space-y-1.5 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-zinc-300">
      {['メール通知', '2段階認証', 'ベータ機能'].map((s, i) => (
        <div key={s} className="flex items-center justify-between">
          {s}
          <span className={`h-4 w-7 rounded-full p-0.5 ${i !== 2 ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
            <span className={`block size-3 rounded-full bg-white ${i !== 2 ? 'translate-x-3' : ''}`} />
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * layoutId で「選択中の背景ピル」「ホバー背景」「下線」がタブ間をスライドする。
 * LayoutGroup id で名前空間を分けて、同じデモが複数描画されても干渉しないようにする。
 */
export function AnimatedTabs() {
  const gid = useId()
  const [active, setActive] = useState<TabId>('overview')
  const [dir, setDir] = useState(1)
  const [hovered, setHovered] = useState<string | null>(null)
  const [navActive, setNavActive] = useState('Projects')

  const select = (id: TabId) => {
    setDir(tabs.findIndex((t) => t.id === id) > tabs.findIndex((t) => t.id === active) ? 1 : -1)
    setActive(id)
  }

  return (
    <LayoutGroup id={gid}>
      <div className="relative flex h-full w-full flex-col items-center gap-5 overflow-hidden bg-zinc-950 p-5 text-sm">
        {/* Vercel 風: ホバー背景が追従 + アクティブ下線 */}
        <nav className="flex w-full max-w-md border-b border-white/10" onMouseLeave={() => setHovered(null)}>
          {nav.map((n) => (
            <button
              key={n}
              onMouseEnter={() => setHovered(n)}
              onClick={() => setNavActive(n)}
              className={`relative px-3 pb-2.5 pt-1.5 text-xs transition-colors ${
                navActive === n ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {hovered === n && (
                <motion.span
                  layoutId="hover-bg"
                  className="absolute inset-x-0 bottom-1.5 top-0 rounded-md bg-white/10"
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                />
              )}
              <span className="relative">{n}</span>
              {navActive === n && (
                <motion.span layoutId="underline" className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-white" />
              )}
            </button>
          ))}
        </nav>

        {/* ピル型セグメントタブ */}
        <div className="flex rounded-full border border-white/10 bg-white/5 p-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => select(id)} className="relative rounded-full px-4 py-1.5">
              {active === id && (
                <motion.span
                  layoutId="pill"
                  className="absolute inset-0 rounded-full bg-white shadow"
                  transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
                />
              )}
              <span
                className={`relative z-10 flex items-center gap-1.5 text-xs font-medium transition-colors ${
                  active === id ? 'text-zinc-900' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Icon size={14} /> {label}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full max-w-md">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={active}
              custom={dir}
              variants={{
                enter: (d: number) => ({ x: d * 40, opacity: 0, filter: 'blur(4px)' }),
                center: { x: 0, opacity: 1, filter: 'blur(0px)' },
                exit: (d: number) => ({ x: d * -40, opacity: 0, filter: 'blur(4px)' }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
            >
              <Panel id={active} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </LayoutGroup>
  )
}
