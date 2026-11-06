import { AnimatePresence, motion } from 'motion/react'
import { useId, useState, type ComponentType } from 'react'
import {
  BarChart3,
  Bell,
  ChevronsLeft,
  FolderKanban,
  Home,
  Inbox,
  Search,
  Settings,
  type LucideProps,
} from 'lucide-react'

/**
 * 折りたたみ式サイドバーのアプリシェル (Linear / Vercel 風ダーク)。
 * - サイドバー幅を Motion の animate={{ width }} + spring で伸縮
 * - アクティブ項目の背景は layoutId で項目間をスライド
 * - ラベルは AnimatePresence でフェード、折りたたみ時はホバーでツールチップ
 * - メイン領域は AnimatePresence mode="wait" でページ切替、@container でレスポンシブ
 */

type NavId = 'home' | 'inbox' | 'projects' | 'analytics' | 'settings'
const NAV: { id: NavId; label: string; icon: ComponentType<LucideProps>; badge?: number }[] = [
  { id: 'home', label: 'ホーム', icon: Home },
  { id: 'inbox', label: '受信箱', icon: Inbox, badge: 3 },
  { id: 'projects', label: 'プロジェクト', icon: FolderKanban },
  { id: 'analytics', label: '分析', icon: BarChart3 },
  { id: 'settings', label: '設定', icon: Settings },
]

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${on ? 'justify-end bg-violet-500' : 'justify-start bg-zinc-700'}`}
    >
      <motion.span layout transition={{ type: 'spring', stiffness: 600, damping: 32 }} className="h-4 w-4 rounded-full bg-white" />
    </button>
  )
}

function Page({ id }: { id: NavId }) {
  const [toggles, setToggles] = useState({ notify: true, dark: true, beta: false })
  if (id === 'home')
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-semibold">おかえりなさい 👋</h4>
        <div className="grid grid-cols-1 gap-2 @sm:grid-cols-3">
          {[
            ['進行中', '12'],
            ['完了', '48'],
            ['レビュー待ち', '5'],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
              <p className="text-[10px] text-zinc-500">{k}</p>
              <p className="text-lg font-semibold">{v}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
          <p className="mb-2 text-[11px] font-medium text-zinc-400">最近のアクティビティ</p>
          {['デザインレビューを完了', 'v2.1 をデプロイ', '新しいメンバーが参加'].map((t, i) => (
            <div key={t} className="flex items-center gap-2 py-1 text-[11px] text-zinc-300">
              <span className={`h-1.5 w-1.5 rounded-full ${['bg-emerald-400', 'bg-violet-400', 'bg-amber-400'][i]}`} />
              {t}
              <span className="ml-auto text-zinc-600">{i + 1}h</span>
            </div>
          ))}
        </div>
      </div>
    )
  if (id === 'inbox')
    return (
      <div className="divide-y divide-white/5 rounded-xl border border-white/5 bg-white/[0.03]">
        {[
          ['AK', '新しいデザイン案が届きました', true],
          ['MS', 'PR #128 がマージされました', true],
          ['YT', '来週のミーティングについて', true],
          ['RN', '請求書を送付しました', false],
        ].map(([a, t, unread]) => (
          <div key={String(t)} className="flex items-center gap-2.5 px-3 py-2.5">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-zinc-800 text-[10px] font-bold">{a}</span>
            <p className={`truncate text-[11px] ${unread ? 'font-semibold text-zinc-100' : 'text-zinc-500'}`}>{t}</p>
            {unread && <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-violet-400" />}
          </div>
        ))}
      </div>
    )
  if (id === 'projects')
    return (
      <div className="grid grid-cols-1 gap-2 @md:grid-cols-2">
        {[
          ['Website リニューアル', 72, 'bg-violet-500'],
          ['モバイルアプリ', 45, 'bg-cyan-500'],
          ['デザインシステム', 90, 'bg-emerald-500'],
          ['API v3', 20, 'bg-amber-500'],
        ].map(([name, pct, color]) => (
          <div key={String(name)} className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
            <p className="text-[11px] font-medium">{name}</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={`h-full rounded-full ${color}`}
              />
            </div>
            <p className="mt-1 text-right text-[10px] text-zinc-500">{pct}%</p>
          </div>
        ))}
      </div>
    )
  if (id === 'analytics')
    return (
      <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
        <p className="mb-3 text-[11px] font-medium text-zinc-400">週間アクティブユーザー</p>
        <div className="flex h-28 items-end gap-1.5">
          {[40, 65, 50, 80, 72, 95, 60].map((h, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${h}%` }}
              transition={{ delay: i * 0.05, type: 'spring', stiffness: 200, damping: 20 }}
              className="flex-1 rounded-t-md bg-gradient-to-t from-violet-600 to-fuchsia-400"
            />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[9px] text-zinc-600">
          {['月', '火', '水', '木', '金', '土', '日'].map((d) => (
            <span key={d} className="flex-1 text-center">
              {d}
            </span>
          ))}
        </div>
      </div>
    )
  return (
    <div className="space-y-1 rounded-xl border border-white/5 bg-white/[0.03] p-1">
      {(
        [
          ['notify', '通知を受け取る'],
          ['dark', 'ダークモード'],
          ['beta', 'ベータ機能'],
        ] as const
      ).map(([key, label]) => (
        <div key={key} className="flex items-center justify-between rounded-lg px-3 py-2.5 text-[11px]">
          {label}
          <Toggle on={toggles[key]} onChange={() => setToggles((t) => ({ ...t, [key]: !t[key] }))} />
        </div>
      ))}
    </div>
  )
}

export function AppShellSidebar() {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [collapsed, setCollapsed] = useState(false)
  const [active, setActive] = useState<NavId>('home')
  const current = NAV.find((n) => n.id === active)!

  return (
    <div
      className="relative flex h-full w-full overflow-hidden bg-zinc-950 text-zinc-100"
      style={{ fontFamily: "Inter, 'Noto Sans JP', sans-serif" }}
    >
      <motion.aside
        animate={{ width: collapsed ? 56 : 176 }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="relative z-10 flex h-full shrink-0 flex-col border-r border-white/5 bg-zinc-900/60 p-2"
      >
        <div className="mb-3 flex h-9 items-center gap-2 px-1.5">
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xs font-black">
            U
          </div>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                className="whitespace-nowrap text-sm font-semibold"
              >
                Acme UI
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setActive(n.id)}
              className={`group relative flex h-9 items-center gap-3 rounded-lg px-2.5 text-[12px] transition-colors ${active === n.id ? 'text-white' : 'text-zinc-400 hover:text-zinc-100'}`}
            >
              {active === n.id && (
                <motion.span
                  layoutId={`nav-active-${uid}`}
                  className="absolute inset-0 rounded-lg bg-white/[0.08] ring-1 ring-white/10"
                  transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                />
              )}
              <n.icon size={16} className="relative shrink-0" />
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    className="relative whitespace-nowrap"
                  >
                    {n.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {n.badge && (
                <span
                  className={`grid place-items-center rounded-full bg-violet-500 px-1 text-[9px] font-bold text-white ${collapsed ? 'absolute right-1 top-1 h-3.5 min-w-3.5' : 'relative ml-auto h-4 min-w-4'}`}
                >
                  {n.badge}
                </span>
              )}
              {collapsed && (
                <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md bg-zinc-800 px-2 py-1 text-[11px] text-white opacity-0 shadow-lg ring-1 ring-white/10 transition-opacity group-hover:opacity-100">
                  {n.label}
                </span>
              )}
            </button>
          ))}
        </nav>

        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex h-9 items-center gap-3 rounded-lg px-2.5 text-[12px] text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
        >
          <motion.span animate={{ rotate: collapsed ? 180 : 0 }} className="shrink-0">
            <ChevronsLeft size={16} />
          </motion.span>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="whitespace-nowrap">
                折りたたむ
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </motion.aside>

      <main className="@container flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-3 border-b border-white/5 px-4">
          <p className="truncate text-xs text-zinc-500">
            Workspace <span className="mx-1 text-zinc-700">/</span>
            <span className="text-zinc-200">{current.label}</span>
          </p>
          <div className="ml-auto hidden items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.03] px-2 py-1 text-[11px] text-zinc-500 @sm:flex">
            <Search size={12} /> 検索… <kbd className="ml-3 rounded bg-white/5 px-1 font-mono text-[9px]">⌘K</kbd>
          </div>
          <button className="relative ml-auto text-zinc-400 hover:text-white @sm:ml-0">
            <Bell size={15} />
            <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-rose-500" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <Page id={active} />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
