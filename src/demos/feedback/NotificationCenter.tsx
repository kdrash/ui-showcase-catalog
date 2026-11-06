import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { AtSign, Bell, CheckCheck, GitPullRequest, Heart, Package, ShieldExclamationPoint, X, type LucideIcon } from 'lucide-react'

type N = { id: number; icon: LucideIcon; color: string; title: string; body: string; time: string; read: boolean }

const POOL: Omit<N, 'id' | 'time' | 'read'>[] = [
  { icon: AtSign, color: '#6366f1', title: '田中さんがあなたをメンション', body: '「デザインレビューの件、確認お願いします」' },
  { icon: Heart, color: '#ec4899', title: '投稿に12件のいいね', body: '「新しいオフィスの写真」が人気です' },
  { icon: GitPullRequest, color: '#10b981', title: 'PR #482 がマージされました', body: 'feat: 通知センターを追加' },
  { icon: Package, color: '#f59e0b', title: 'ご注文の商品を発送しました', body: '明日 14〜16時 にお届け予定' },
  { icon: ShieldExclamationPoint, color: '#ef4444', title: '新しい端末からのログイン', body: 'macOS · 東京 · 心当たりがなければ確認を' },
]

let uid = 0
const make = (k: number, time: string, read = false): N => ({ ...POOL[k % POOL.length], id: ++uid, time, read })

export function NotificationCenter() {
  const [items, setItems] = useState<N[]>(() => [make(0, '2分前'), make(2, '15分前'), make(1, '1時間前', true), make(3, '昨日', true)])
  const [open, setOpen] = useState(true)
  const [tab, setTab] = useState<'all' | 'unread'>('all')
  const [listRef] = useAutoAnimate<HTMLUListElement>({ duration: 260 })
  const next = useRef(4)

  useEffect(() => {
    const id = setInterval(() => {
      setItems((xs) => [make(next.current++, 'たった今'), ...xs].slice(0, 7))
    }, 5000)
    return () => clearInterval(id)
  }, [])

  const unread = items.filter((n) => !n.read).length
  const shown = tab === 'all' ? items : items.filter((n) => !n.read)

  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-slate-100 to-indigo-100 font-sans text-zinc-800">
      <header className="flex h-12 items-center justify-between border-b border-white/60 bg-white/70 px-4 backdrop-blur">
        <div className="text-sm font-bold tracking-tight">
          <span className="text-indigo-600">◆</span> Workspace
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className={`relative grid h-9 w-9 place-items-center rounded-full transition ${open ? 'bg-indigo-50 text-indigo-600' : 'text-zinc-600 hover:bg-zinc-100'}`}
          aria-label="通知"
        >
          <motion.span key={items[0]?.id} animate={{ rotate: [0, -18, 14, -8, 4, 0] }} transition={{ duration: 0.7 }}>
            <Bell size={18} />
          </motion.span>
          <AnimatePresence>
            {unread > 0 && (
              <motion.span
                key={unread}
                initial={{ scale: 0.4 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white"
              >
                {unread}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </header>

      <div className="p-4 text-xs text-zinc-500">
        <div className="h-3 w-40 rounded bg-white/70" />
        <div className="mt-2 h-3 w-56 rounded bg-white/70" />
        <div className="mt-2 h-3 w-32 rounded bg-white/70" />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            style={{ originX: 1, originY: 0 }}
            className="absolute top-14 right-3 w-[min(340px,calc(100%-24px))] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl shadow-indigo-900/15"
          >
            <div className="flex items-center justify-between px-3 pt-3">
              <div className="text-sm font-semibold">通知</div>
              <button
                onClick={() => setItems((xs) => xs.map((n) => ({ ...n, read: true })))}
                className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:underline disabled:text-zinc-300"
                disabled={!unread}
              >
                <CheckCheck size={12} /> すべて既読
              </button>
            </div>
            <div className="mt-2 flex gap-1 border-b border-zinc-100 px-3">
              {(['all', 'unread'] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} className={`relative px-2 pb-2 text-xs ${tab === t ? 'font-semibold text-zinc-900' : 'text-zinc-400'}`}>
                  {t === 'all' ? 'すべて' : `未読 ${unread}`}
                  {tab === t && <motion.div layoutId="nc-tab" className="absolute inset-x-0 -bottom-px h-0.5 bg-indigo-600" />}
                </button>
              ))}
            </div>
            <ul ref={listRef} className="max-h-[200px] overflow-y-auto">
              {shown.map((n) => (
                <li
                  key={n.id}
                  onClick={() => setItems((xs) => xs.map((x) => (x.id === n.id ? { ...x, read: true } : x)))}
                  className={`group relative flex cursor-pointer gap-2.5 border-b border-zinc-50 px-3 py-2.5 transition hover:bg-zinc-50 ${n.read ? '' : 'bg-indigo-50/40'}`}
                >
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full" style={{ background: n.color + '1a', color: n.color }}>
                    <n.icon size={15} />
                  </div>
                  <div className="min-w-0 flex-1 pr-4">
                    <div className={`truncate text-[12px] ${n.read ? 'text-zinc-600' : 'font-semibold'}`}>{n.title}</div>
                    <div className="truncate text-[11px] text-zinc-500">{n.body}</div>
                    <div className="mt-0.5 text-[10px] text-zinc-400">{n.time}</div>
                  </div>
                  {!n.read && <span className="absolute top-3.5 right-3 h-2 w-2 rounded-full bg-indigo-500 group-hover:hidden" />}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setItems((xs) => xs.filter((x) => x.id !== n.id))
                    }}
                    className="absolute top-2.5 right-2 hidden rounded p-0.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 group-hover:block"
                    aria-label="削除"
                  >
                    <X size={13} />
                  </button>
                </li>
              ))}
              {shown.length === 0 && <li className="py-8 text-center text-xs text-zinc-400">🎉 未読の通知はありません</li>}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
