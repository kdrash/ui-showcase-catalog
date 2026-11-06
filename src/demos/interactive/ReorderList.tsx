import { useRef, useState } from 'react'
import { AnimatePresence, Reorder, motion, useDragControls } from 'motion/react'
import { Check, GripVertical, Plus, X } from 'lucide-react'

type Task = { id: number; title: string; tag: string; color: string; done: boolean }

const initial: Task[] = [
  { id: 1, title: 'デザインレビュー', tag: 'Design', color: 'bg-pink-100 text-pink-700', done: false },
  { id: 2, title: 'API のエラーハンドリング', tag: 'Dev', color: 'bg-sky-100 text-sky-700', done: true },
  { id: 3, title: 'リリースノートを書く', tag: 'Docs', color: 'bg-amber-100 text-amber-700', done: false },
  { id: 4, title: 'ユーザーインタビュー', tag: 'Research', color: 'bg-emerald-100 text-emerald-700', done: false },
]
const extra = [
  { title: 'アイコンを差し替え', tag: 'Design', color: 'bg-pink-100 text-pink-700' },
  { title: 'E2E テスト追加', tag: 'Dev', color: 'bg-sky-100 text-sky-700' },
  { title: 'OGP 画像を作る', tag: 'Marketing', color: 'bg-violet-100 text-violet-700' },
]

function TaskRow({ task, onToggle, onRemove }: { task: Task; onToggle: () => void; onRemove: () => void }) {
  const controls = useDragControls()
  return (
    <Reorder.Item
      value={task}
      dragListener={false}
      dragControls={controls}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 60, transition: { duration: 0.2 } }}
      whileDrag={{ scale: 1.03, boxShadow: '0 16px 32px rgba(0,0,0,.12)' }}
      className="flex select-none items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5"
    >
      <button
        aria-label="ドラッグして並べ替え"
        onPointerDown={(e) => controls.start(e)}
        className="cursor-grab touch-none text-zinc-300 hover:text-zinc-500 active:cursor-grabbing"
      >
        <GripVertical size={16} />
      </button>
      <button
        onClick={onToggle}
        className={`grid size-5 shrink-0 place-items-center rounded-md border transition-colors ${
          task.done ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-300'
        }`}
      >
        <AnimatePresence>
          {task.done && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Check size={12} strokeWidth={3} />
            </motion.span>
          )}
        </AnimatePresence>
      </button>
      <span className="relative min-w-0 flex-1 truncate text-sm text-zinc-800">
        <span className={task.done ? 'text-zinc-400' : ''}>{task.title}</span>
        <motion.span
          className="absolute left-0 top-1/2 h-px w-full origin-left bg-zinc-400"
          initial={false}
          animate={{ scaleX: task.done ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />
      </span>
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${task.color}`}>{task.tag}</span>
      <button onClick={onRemove} className="text-zinc-300 hover:text-rose-500">
        <X size={14} />
      </button>
    </Reorder.Item>
  )
}

export function ReorderList() {
  const [tasks, setTasks] = useState(initial)
  const nextId = useRef(100)

  const add = () => {
    const e = extra[nextId.current % extra.length]
    setTasks((t) => [{ id: nextId.current++, done: false, ...e }, ...t].slice(0, 6))
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-zinc-100 p-4">
      <div className="mx-auto max-w-md">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">今日のタスク</h3>
            <p className="text-[11px] text-zinc-500">⋮⋮ をドラッグして並べ替え</p>
          </div>
          <button
            onClick={add}
            className="flex items-center gap-1 rounded-lg bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white active:scale-95"
          >
            <Plus size={14} /> 追加
          </button>
        </div>
        <Reorder.Group axis="y" values={tasks} onReorder={setTasks} className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {tasks.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                onToggle={() => setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))}
                onRemove={() => setTasks((ts) => ts.filter((x) => x.id !== t.id))}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>
      </div>
    </div>
  )
}
