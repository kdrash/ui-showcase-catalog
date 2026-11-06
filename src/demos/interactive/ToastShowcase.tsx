import { useState, type CSSProperties } from 'react'
import { Toaster, toast } from 'sonner'
import { AlertTriangle, Bell, CheckCircle2, Info, MessageCircle, RotateCcw, Upload, XCircle } from 'lucide-react'

/** このデモ専用の Toaster。toasterId を合わせたトーストだけがここに出る */
const TOASTER_ID = 'toast-showcase'
const o = { toasterId: TOASTER_ID }

type Pos = 'top-right' | 'bottom-right' | 'top-center' | 'bottom-center'

const actions = [
  {
    label: 'Default',
    icon: Bell,
    run: () => toast('イベントを作成しました', { ...o, description: '2026年11月5日(木) 14:00〜15:00' }),
  },
  { label: 'Success', icon: CheckCircle2, run: () => toast.success('変更を保存しました', o) },
  {
    label: 'Error',
    icon: XCircle,
    run: () => toast.error('アップロードに失敗しました', { ...o, description: 'ファイルサイズが 10MB を超えています' }),
  },
  { label: 'Warning', icon: AlertTriangle, run: () => toast.warning('ストレージ残り 5% です', o) },
  { label: 'Info', icon: Info, run: () => toast.info('新しいバージョンが利用可能です', o) },
  {
    label: 'Action',
    icon: RotateCcw,
    run: () =>
      toast('メッセージを削除しました', {
        ...o,
        action: { label: '元に戻す', onClick: () => toast.success('復元しました', o) },
      }),
  },
  {
    label: 'Promise',
    icon: Upload,
    run: () =>
      toast.promise(
        new Promise<{ name: string }>((resolve) => setTimeout(() => resolve({ name: 'report.pdf' }), 1800)),
        { ...o, loading: 'アップロード中…', success: (d) => `${d.name} をアップロードしました`, error: '失敗しました' },
      ),
  },
  {
    label: 'Custom',
    icon: MessageCircle,
    run: () =>
      toast.custom(
        (id) => (
          <div className="flex w-[300px] items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-xl">
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-pink-400 to-orange-300 text-sm font-bold text-white">
              S
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-900">Sora からのメッセージ</p>
              <p className="truncate text-xs text-zinc-500">デザインレビューの件、15時からで大丈夫？</p>
            </div>
            <button
              onClick={() => toast.dismiss(id)}
              className="rounded-lg bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white"
            >
              返信
            </button>
          </div>
        ),
        o,
      ),
  },
]

export function ToastShowcase() {
  const [position, setPosition] = useState<Pos>('bottom-right')
  const [rich, setRich] = useState(true)

  return (
    <div className="relative h-full w-full overflow-hidden bg-zinc-50 p-4 text-zinc-800">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px]">
        <select
          value={position}
          onChange={(e) => setPosition(e.target.value as Pos)}
          className="rounded-md border border-zinc-200 bg-white px-2 py-1"
        >
          <option value="bottom-right">bottom-right</option>
          <option value="top-right">top-right</option>
          <option value="top-center">top-center</option>
          <option value="bottom-center">bottom-center</option>
        </select>
        <label className="flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2 py-1">
          <input type="checkbox" checked={rich} onChange={(e) => setRich(e.target.checked)} />
          richColors
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {actions.map(({ label, icon: Icon, run }) => (
          <button
            key={label}
            onClick={run}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
          >
            <Icon size={14} className="text-zinc-500" />
            {label}
          </button>
        ))}
      </div>

      {/* position:absolute に上書きしてプレビュー枠内に表示 */}
      <Toaster
        id={TOASTER_ID}
        position={position}
        richColors={rich}
        closeButton
        hotkey={[]}
        offset={16}
        style={{ position: 'absolute', '--width': '300px' } as CSSProperties}
      />
    </div>
  )
}
