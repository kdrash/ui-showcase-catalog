import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createSwapy } from 'swapy'
import { CheckCircle2, Circle, CloudSun, GripHorizontal, TrendingUp, Users } from 'lucide-react'

type Item = { id: string }
const ITEMS: Item[] = [{ id: 'revenue' }, { id: 'chart' }, { id: 'users' }, { id: 'todo' }, { id: 'weather' }]

function Shell({ title, icon, children, tone }: { title: string; icon: ReactNode; children: ReactNode; tone: string }) {
  return (
    <div className={`flex h-full flex-col rounded-2xl border border-white/10 p-3 shadow-lg shadow-black/30 ${tone}`}>
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-white/70">
        {icon}
        {title}
        <span data-swapy-handle className="ml-auto cursor-grab rounded p-0.5 text-white/40 hover:bg-white/10 hover:text-white active:cursor-grabbing" title="ドラッグして入れ替え">
          <GripHorizontal size={14} />
        </span>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  )
}

function Todo() {
  const [todos, setTodos] = useState([
    { t: '週次レポート提出', d: true },
    { t: 'デザインQA', d: false },
    { t: '採用面接 15:00', d: false },
  ])
  return (
    <div className="space-y-1.5">
      {todos.map((x, i) => (
        <button
          key={x.t}
          type="button"
          onClick={() => setTodos((ts) => ts.map((y, j) => (j === i ? { ...y, d: !y.d } : y)))}
          className="flex w-full items-center gap-2 text-left text-[12px]"
        >
          {x.d ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Circle size={14} className="text-white/40" />}
          <span className={x.d ? 'text-white/40 line-through' : 'text-white/90'}>{x.t}</span>
        </button>
      ))}
    </div>
  )
}

const BARS = [32, 45, 38, 60, 52, 74, 68, 90, 82, 96]

const WIDGETS: Record<string, () => ReactNode> = {
  revenue: () => (
    <Shell title="今月の売上" icon={<TrendingUp size={13} />} tone="bg-gradient-to-br from-violet-600/40 to-fuchsia-600/20">
      <div className="text-[26px] leading-none font-bold tracking-tight text-white">¥4,281,900</div>
      <div className="mt-1.5 text-[11px] text-emerald-300">▲ 12.4% 先月比</div>
    </Shell>
  ),
  chart: () => (
    <Shell title="週間アクティブ" icon={<TrendingUp size={13} />} tone="bg-zinc-900">
      <div className="flex h-full items-end gap-1 pb-1">
        {BARS.map((b, i) => (
          <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-sky-500/40 to-sky-400" style={{ height: `${b}%` }} />
        ))}
      </div>
    </Shell>
  ),
  users: () => (
    <Shell title="新規ユーザー" icon={<Users size={13} />} tone="bg-zinc-900">
      <div className="text-[24px] leading-none font-bold text-white">+1,204</div>
      <div className="mt-2 flex -space-x-1.5">
        {['from-pink-400 to-rose-500', 'from-sky-400 to-indigo-500', 'from-emerald-400 to-teal-500', 'from-amber-400 to-orange-500'].map((g) => (
          <span key={g} className={`h-6 w-6 rounded-full bg-gradient-to-br ring-2 ring-zinc-900 ${g}`} />
        ))}
      </div>
    </Shell>
  ),
  todo: () => (
    <Shell title="今日のタスク" icon={<CheckCircle2 size={13} />} tone="bg-zinc-900">
      <Todo />
    </Shell>
  ),
  weather: () => (
    <Shell title="東京" icon={<CloudSun size={13} />} tone="bg-gradient-to-br from-sky-500/50 to-indigo-600/30">
      <div className="flex items-center gap-2">
        <CloudSun size={34} className="text-amber-200" />
        <div>
          <div className="text-[24px] leading-none font-bold text-white">18°</div>
          <div className="text-[11px] text-white/70">晴れ時々くもり</div>
        </div>
      </div>
    </Shell>
  ),
}

// グリッドのスロット配置(スロットIDは固定、中身のアイテムが入れ替わる)
const SLOT_CLASS: Record<string, string> = {
  s1: 'col-span-2 row-span-1',
  s2: 'col-span-2 row-span-2',
  s3: 'col-span-1 row-span-1',
  s4: 'col-span-1 row-span-1',
  s5: 'col-span-4 row-span-1',
}

export function SwapyDashboard() {
  const container = useRef<HTMLDivElement>(null)
  const [swaps, setSwaps] = useState(0)

  useEffect(() => {
    // 固定アイテムなので DOM の入れ替えは swapy に任せる(React 側は再描画しても子の並びを変えない)
    const s = createSwapy(container.current!, { animation: 'dynamic', swapMode: 'hover' })
    s.onSwapEnd((e) => e.hasChanged && setSwaps((n) => n + 1))
    return () => s.destroy()
  }, [])

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[radial-gradient(ellipse_at_top,#27272a,#09090b_70%)] p-4 font-sans">
      <div className="mb-3 flex items-center text-[12px] text-zinc-400">
        <span className="font-semibold text-zinc-100">ダッシュボード</span>
        <span className="ml-2">右上の ⠿ をドラッグしてウィジェットを入れ替え</span>
        <span className="ml-auto rounded-full bg-white/5 px-2 py-0.5 tabular-nums">入れ替え {swaps} 回</span>
      </div>
      <div ref={container} className="grid min-h-0 flex-1 grid-cols-4 grid-rows-3 gap-3">
        {ITEMS.map(({ id: itemId }, i) => ({ slotId: `s${i + 1}`, itemId })).map(({ slotId, itemId }) => (
          <div key={slotId} data-swapy-slot={slotId} className={`rounded-2xl bg-white/[0.03] outline-dashed outline-1 outline-transparent data-[swapy-highlighted]:outline-violet-400/70 ${SLOT_CLASS[slotId]}`}>
            {itemId && (
              <div key={itemId} data-swapy-item={itemId} className="h-full">
                {WIDGETS[itemId]()}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
