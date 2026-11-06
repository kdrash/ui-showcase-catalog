import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Bell, CalendarDays, Mail, MessageCircle, Package, X, type LucideIcon } from 'lucide-react'

type Notice = { id: number; app: string; icon: LucideIcon; color: string; title: string; body: string; time: string }

const POOL: Omit<Notice, 'id' | 'time'>[] = [
  { app: 'メッセージ', icon: MessageCircle, color: '#22c55e', title: 'Aoi', body: '今夜のご飯どうする？🍣' },
  { app: 'カレンダー', icon: CalendarDays, color: '#ef4444', title: 'デザインレビュー', body: '15:00 から 会議室B' },
  { app: 'メール', icon: Mail, color: '#3b82f6', title: '請求書が届きました', body: '10月分のご利用明細のお知らせ' },
  { app: '配達', icon: Package, color: '#f59e0b', title: 'まもなくお届け', body: 'ドライバーが近くにいます' },
  { app: 'リマインダー', icon: Bell, color: '#a855f7', title: '植物に水やり', body: 'モンステラ・パキラ' },
]

const MAX = 4
const CARD_H = 64
const GAP = 8

/**
 * iOS 風の通知スタック。Motion で
 * - 折りたたみ時: y を 9px ずつ、scale を 5% ずつ小さく重ねる
 * - ホバー(タッチはタップ)で: y = index × (高さ + gap) に展開
 * 新着は AnimatePresence で上から入り、×で右へ消える。
 */
export function StackedNotifications() {
  const nextId = useRef(3)
  const [items, setItems] = useState<Notice[]>(() =>
    POOL.slice(0, 3).map((n, i) => ({ ...n, id: i, time: `${(i + 1) * 4}分前` })),
  )
  const [expanded, setExpanded] = useState(false)

  const add = () => {
    const base = POOL[nextId.current % POOL.length]
    const n: Notice = { ...base, id: nextId.current++, time: 'たった今' }
    setItems((xs) => [n, ...xs].slice(0, MAX))
  }

  return (
    <div className="relative flex h-full w-full flex-col items-center overflow-hidden bg-[linear-gradient(160deg,#4c1d95,#be185d_55%,#f59e0b)] pt-6 text-zinc-900">
      <div className="text-center text-white">
        <div className="text-xs font-medium opacity-80">11月5日 水曜日</div>
        <div className="text-5xl font-semibold tracking-tight">9:41</div>
      </div>

      <div
        className="relative mt-5 w-[290px]"
        style={{ height: expanded ? items.length * (CARD_H + GAP) : CARD_H + 24 }}
        onPointerEnter={(e) => e.pointerType === 'mouse' && setExpanded(true)}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setExpanded(false)}
        onPointerUp={(e) => e.pointerType !== 'mouse' && setExpanded((v) => !v)}
      >
        <AnimatePresence initial={false}>
          {items.map((n, i) => {
            const Icon = n.icon
            return (
              <motion.div
                key={n.id}
                className="absolute inset-x-0 top-0 rounded-2xl bg-white/75 px-3 py-2.5 shadow-lg backdrop-blur-xl"
                style={{ height: CARD_H, zIndex: MAX - i, transformOrigin: 'top center' }}
                initial={{ opacity: 0, y: -40, scale: 0.9 }}
                animate={
                  expanded
                    ? { opacity: 1, y: i * (CARD_H + GAP), scale: 1 }
                    : { opacity: i < 3 ? 1 : 0, y: i * 9, scale: 1 - i * 0.05 }
                }
                exit={{ opacity: 0, x: 120, transition: { duration: 0.2 } }}
                transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              >
                <motion.div
                  className="flex h-full items-center gap-2.5"
                  animate={{ opacity: expanded || i === 0 ? 1 : 0 }}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white" style={{ background: n.color }}>
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between text-[10px] text-zinc-500">
                      <span className="uppercase tracking-wide">{n.app}</span>
                      <span>{n.time}</span>
                    </div>
                    <div className="truncate text-[13px] font-semibold leading-tight">{n.title}</div>
                    <div className="truncate text-xs text-zinc-600">{n.body}</div>
                  </div>
                  {expanded && (
                    <button
                      onPointerUp={(e) => e.stopPropagation()}
                      onClick={() => setItems((xs) => xs.filter((x) => x.id !== n.id))}
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-zinc-900/10 text-zinc-600 hover:bg-zinc-900/20"
                      aria-label="通知を消す"
                    >
                      <X size={12} />
                    </button>
                  )}
                </motion.div>
              </motion.div>
            )
          })}
        </AnimatePresence>
        {items.length > 1 && !expanded && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-white/70">
            +{items.length - 1} 件 · hover で展開
          </div>
        )}
      </div>

      <button
        onClick={add}
        className="absolute bottom-4 rounded-full bg-white/20 px-4 py-1.5 text-xs font-medium text-white backdrop-blur-md transition hover:bg-white/30 active:scale-95"
      >
        ＋ 通知を受け取る
      </button>
    </div>
  )
}
