import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, MessageSquare, Paperclip, Plus } from 'lucide-react'

type Card = { id: string; title: string; tag: keyof typeof TAGS; who: number; comments: number; files: number }
type ColId = 'todo' | 'doing' | 'review' | 'done'

const TAGS = {
  design: 'bg-pink-500/15 text-pink-300 ring-pink-500/30',
  dev: 'bg-sky-500/15 text-sky-300 ring-sky-500/30',
  bug: 'bg-red-500/15 text-red-300 ring-red-500/30',
  docs: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
}
const COLS: { id: ColId; label: string; dot: string }[] = [
  { id: 'todo', label: '未着手', dot: 'bg-zinc-400' },
  { id: 'doing', label: '進行中', dot: 'bg-sky-400' },
  { id: 'review', label: 'レビュー', dot: 'bg-amber-400' },
  { id: 'done', label: '完了', dot: 'bg-emerald-400' },
]
const AVATAR = ['from-pink-400 to-rose-500', 'from-sky-400 to-indigo-500', 'from-emerald-400 to-teal-500', 'from-amber-400 to-orange-500']
const NAMES = ['MK', 'YT', 'AS', 'RH']

let seq = 20
const c = (title: string, tag: Card['tag'], who: number, comments = 0, files = 0): Card => ({ id: `c${seq++}`, title, tag, who, comments, files })

const INITIAL: Record<ColId, Card[]> = {
  todo: [c('オンボーディング画面のワイヤー', 'design', 0, 3, 1), c('料金ページの文言見直し', 'docs', 2), c('Safariでモーダルが閉じない', 'bug', 1, 5)],
  doing: [c('検索APIのページネーション', 'dev', 1, 2, 2), c('ダークモードの配色トークン', 'design', 3, 1)],
  review: [c('通知設定のフォーム', 'dev', 2, 4)],
  done: [c('ロゴの差し替え', 'design', 0, 0, 3), c('READMEの更新', 'docs', 3)],
}

function CardView({ card, overlay }: { card: Card; overlay?: boolean }) {
  return (
    <div
      className={`group rounded-lg border border-white/10 bg-zinc-900 p-2.5 text-left shadow-sm ${
        overlay ? 'rotate-2 scale-105 shadow-2xl shadow-black/60 ring-1 ring-sky-400/50' : 'hover:border-white/20'
      }`}
    >
      <div className="flex items-start justify-between gap-1">
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ${TAGS[card.tag]}`}>{card.tag}</span>
        <GripVertical size={13} className="text-zinc-600 opacity-0 transition group-hover:opacity-100" />
      </div>
      <p className="mt-1.5 text-[12.5px] leading-snug text-zinc-100">{card.title}</p>
      <div className="mt-2 flex items-center gap-2.5 text-[10px] text-zinc-500">
        {card.comments > 0 && (
          <span className="flex items-center gap-0.5">
            <MessageSquare size={11} /> {card.comments}
          </span>
        )}
        {card.files > 0 && (
          <span className="flex items-center gap-0.5">
            <Paperclip size={11} /> {card.files}
          </span>
        )}
        <span className={`ml-auto grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br text-[8px] font-bold text-white ${AVATAR[card.who]}`}>
          {NAMES[card.who]}
        </span>
      </div>
    </div>
  )
}

function SortableCard({ card }: { card: Card }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`cursor-grab touch-none active:cursor-grabbing ${isDragging ? 'opacity-30' : ''}`}
      {...attributes}
      {...listeners}
    >
      <CardView card={card} />
    </div>
  )
}

function Column({ col, cards, onAdd }: { col: (typeof COLS)[number]; cards: Card[]; onAdd: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id })
  return (
    <div className={`flex min-w-0 flex-1 flex-col rounded-xl border bg-zinc-900/40 p-2 transition ${isOver ? 'border-sky-400/40 bg-sky-400/5' : 'border-white/5'}`}>
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className={`h-2 w-2 rounded-full ${col.dot}`} />
        <span className="text-xs font-semibold text-zinc-200">{col.label}</span>
        <span className="rounded-full bg-white/5 px-1.5 text-[10px] text-zinc-400">{cards.length}</span>
        <button type="button" onClick={onAdd} className="ml-auto rounded p-0.5 text-zinc-500 hover:bg-white/10 hover:text-zinc-200" title="カードを追加">
          <Plus size={14} />
        </button>
      </div>
      <SortableContext items={cards.map((x) => x.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="thin-scroll flex min-h-16 flex-1 flex-col gap-2 overflow-y-auto pb-1">
          {cards.map((card) => (
            <SortableCard key={card.id} card={card} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}

export function KanbanBoard() {
  const [board, setBoard] = useState(INITIAL)
  const [active, setActive] = useState<Card | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const findCol = (id: string): ColId | undefined =>
    id in board ? (id as ColId) : (Object.keys(board) as ColId[]).find((k) => board[k].some((x) => x.id === id))

  const onStart = (e: DragStartEvent) => {
    const col = findCol(String(e.active.id))
    setActive(col ? board[col].find((x) => x.id === e.active.id)! : null)
  }

  const onOver = ({ active: a, over }: DragOverEvent) => {
    if (!over) return
    const from = findCol(String(a.id))
    const to = findCol(String(over.id))
    if (!from || !to || from === to) return
    setBoard((b) => {
      const card = b[from].find((x) => x.id === a.id)!
      const overIdx = b[to].findIndex((x) => x.id === over.id)
      const idx = overIdx < 0 ? b[to].length : overIdx
      return { ...b, [from]: b[from].filter((x) => x.id !== a.id), [to]: [...b[to].slice(0, idx), card, ...b[to].slice(idx)] }
    })
  }

  const onEnd = ({ active: a, over }: DragEndEvent) => {
    setActive(null)
    if (!over) return
    const col = findCol(String(a.id))
    if (!col || col !== findCol(String(over.id))) return
    const oldI = board[col].findIndex((x) => x.id === a.id)
    const newI = board[col].findIndex((x) => x.id === over.id)
    if (oldI !== newI && newI >= 0) setBoard((b) => ({ ...b, [col]: arrayMove(b[col], oldI, newI) }))
  }

  const add = (col: ColId) => {
    const titles = ['新しいタスク', 'ユーザーインタビュー', 'E2Eテストを追加', 'アイコンの書き出し']
    setBoard((b) => ({ ...b, [col]: [...b[col], c(titles[seq % titles.length], (['dev', 'design', 'docs'] as const)[seq % 3], seq % 4)] }))
  }

  const total = Object.values(board).flat().length

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-zinc-950 p-3 font-sans text-zinc-100">
      <div className="mb-3 flex items-center gap-3 px-1">
        <div>
          <div className="text-sm font-semibold">Sprint 24 · プロダクトボード</div>
          <div className="text-[11px] text-zinc-500">ドラッグで並べ替え・列間移動(キーボード: Space → 矢印)</div>
        </div>
        <div className="ml-auto flex -space-x-1.5">
          {NAMES.map((n, i) => (
            <span key={n} className={`grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br text-[9px] font-bold ring-2 ring-zinc-950 ${AVATAR[i]}`}>
              {n}
            </span>
          ))}
        </div>
        <span className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-zinc-400">{total} tasks</span>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onStart} onDragOver={onOver} onDragEnd={onEnd} onDragCancel={() => setActive(null)}>
        <div className="flex min-h-0 flex-1 gap-2">
          {COLS.map((col) => (
            <Column key={col.id} col={col} cards={board[col.id]} onAdd={() => add(col.id)} />
          ))}
        </div>
        <DragOverlay>{active ? <CardView card={active} overlay /> : null}</DragOverlay>
      </DndContext>
    </div>
  )
}
