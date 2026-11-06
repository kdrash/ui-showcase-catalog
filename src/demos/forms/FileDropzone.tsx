import { useCallback, useEffect, useRef, useState } from 'react'
import { useDropzone, type FileRejection } from 'react-dropzone'
import { AnimatePresence, motion } from 'motion/react'
import { CloudUpload, File as FileIcon, FileText, Film, Image as ImageIcon, Music, Sparkles, X, CircleCheck } from 'lucide-react'
import { art } from '../_shared/art'

type Item = { id: string; file: File; preview?: string; progress: number; error?: string }

const MAX = 5 * 1024 * 1024
const iconFor = (t: string) =>
  t.startsWith('image/') ? ImageIcon : t.startsWith('video/') ? Film : t.startsWith('audio/') ? Music : t.includes('pdf') || t.startsWith('text/') ? FileText : FileIcon
const size = (b: number) => (b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`)

async function sampleFiles() {
  const svg = decodeURIComponent(art('landscape', 2, 400, 300).split(',')[1])
  return [
    new File([svg], 'sunset.svg', { type: 'image/svg+xml' }),
    new File(['# 議事録\n- 決定事項'.repeat(200)], '議事録_1106.md', { type: 'text/markdown' }),
    new File([new Uint8Array(2_400_000)], 'demo-video.mp4', { type: 'video/mp4' }),
  ]
}

export function FileDropzone() {
  const [items, setItems] = useState<Item[]>([])
  const urls = useRef(new Set<string>())

  const add = useCallback((files: File[], rejected: FileRejection[] = []) => {
    const next: Item[] = files.map((file) => {
      let preview: string | undefined
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file)
        urls.current.add(preview)
      }
      return { id: crypto.randomUUID(), file, preview, progress: 0 }
    })
    const bad: Item[] = rejected.map((r) => ({
      id: crypto.randomUUID(),
      file: r.file,
      progress: 0,
      error: r.errors[0]?.code === 'file-too-large' ? '5MBを超えています' : r.errors[0]?.message,
    }))
    setItems((prev) => [...next, ...bad, ...prev].slice(0, 8))
  }, [])

  // 擬似アップロード
  useEffect(() => {
    const t = setInterval(() => {
      setItems((prev) =>
        prev.some((i) => !i.error && i.progress < 100)
          ? prev.map((i) => (i.error || i.progress >= 100 ? i : { ...i, progress: Math.min(100, i.progress + 4 + Math.random() * 10) }))
          : prev,
      )
    }, 180)
    return () => clearInterval(t)
  }, [])

  const seeded = useRef(false)
  useEffect(() => {
    if (!seeded.current) {
      seeded.current = true
      sampleFiles().then((f) => add(f))
    }
    const set = urls.current
    return () => set.forEach((u) => URL.revokeObjectURL(u))
  }, [add])

  const remove = (it: Item) => {
    if (it.preview) {
      URL.revokeObjectURL(it.preview)
      urls.current.delete(it.preview)
    }
    setItems((p) => p.filter((x) => x.id !== it.id))
  }

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject, open } = useDropzone({
    onDrop: (a, r) => add(a, r),
    maxSize: MAX,
    noClick: true,
  })

  const zone = isDragReject
    ? 'border-rose-400 bg-rose-500/10'
    : isDragAccept || isDragActive
      ? 'border-sky-400 bg-sky-500/10 scale-[1.01]'
      : 'border-white/15 bg-white/[0.02] hover:border-white/30'

  return (
    <div className="relative flex h-full w-full flex-col gap-3 overflow-hidden bg-zinc-950 p-4 font-sans text-zinc-100">
      <div {...getRootProps()} className={`flex shrink-0 items-center gap-4 rounded-xl border-2 border-dashed p-4 transition-all ${zone}`}>
        <input {...getInputProps()} />
        <motion.div
          animate={isDragActive ? { y: [-2, -8, -2] } : { y: 0 }}
          transition={{ repeat: isDragActive ? Infinity : 0, duration: 0.9 }}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-500/15 text-sky-300"
        >
          <CloudUpload size={22} />
        </motion.div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{isDragActive ? 'ここにドロップしてアップロード' : 'ファイルをドラッグ&ドロップ'}</div>
          <div className="text-xs text-zinc-500">画像・動画・ドキュメント / 1ファイル 5MB まで</div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={open} className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-200">
            ファイルを選択
          </button>
          <button
            type="button"
            onClick={() => sampleFiles().then((f) => add(f.slice(0, 2)))}
            title="サンプルを追加"
            className="rounded-lg border border-white/15 px-2 py-1.5 text-xs text-zinc-300 hover:bg-white/10"
          >
            <Sparkles size={14} />
          </button>
        </div>
      </div>

      <ul className="thin-scroll min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {items.map((it) => {
            const Icon = iconFor(it.file.type)
            const done = it.progress >= 100
            return (
              <motion.li
                key={it.id}
                layout
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40 }}
                className={`flex items-center gap-3 rounded-lg border p-2 ${it.error ? 'border-rose-500/40 bg-rose-500/5' : 'border-white/10 bg-zinc-900'}`}
              >
                {it.preview ? (
                  <img src={it.preview} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" />
                ) : (
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-white/5 text-zinc-400">
                    <Icon size={17} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-medium">{it.file.name}</span>
                    <span className="shrink-0 text-zinc-500">
                      {it.error ? <span className="text-rose-300">{it.error}</span> : done ? <span className="inline-flex items-center gap-1 text-emerald-300"><CircleCheck size={12} />完了</span> : `${Math.floor(it.progress)}%`}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full transition-[width] duration-200 ${it.error ? 'bg-rose-500' : done ? 'bg-emerald-400' : 'bg-sky-400'}`}
                        style={{ width: `${it.error ? 100 : it.progress}%` }}
                      />
                    </div>
                    <span className="w-14 shrink-0 text-right text-[10px] text-zinc-500">{size(it.file.size)}</span>
                  </div>
                </div>
                <button type="button" onClick={() => remove(it)} aria-label="削除" className="rounded p-1 text-zinc-500 hover:bg-white/10 hover:text-white">
                  <X size={14} />
                </button>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>
    </div>
  )
}
