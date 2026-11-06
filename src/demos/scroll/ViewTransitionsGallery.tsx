import { useId, useState, type CSSProperties } from 'react'
import { flushSync } from 'react-dom'
import { ArrowLeft, ArrowUpDown, Shuffle } from 'lucide-react'
import { art } from '../_shared/art'

/**
 * View Transitions API(document.startViewTransition)で、
 *  - グリッドのサムネイル → 詳細画面へ画像とタイトルがモーフィング(共有要素遷移)
 *  - シャッフル / 並び替えで各タイルが新しい位置へスライド
 * を実現。React の state 更新は flushSync で同期的に DOM へ反映させるのがポイント。
 * 同じページにデモが2つ表示されても名前が衝突しないよう useId で view-transition-name を一意にしている。
 * 非対応ブラウザでは普通に切り替わるだけ(フォールバック)。
 */

type Item = { id: number; title: string; place: string; kind: 'landscape' | 'gradient' | 'geometric' }
const ITEMS: Item[] = [
  { id: 1, title: 'Violet Hour', place: 'Hokkaido', kind: 'landscape' },
  { id: 2, title: 'Deep Blue', place: 'Okinawa', kind: 'landscape' },
  { id: 3, title: 'Fern Valley', place: 'Yakushima', kind: 'landscape' },
  { id: 4, title: 'Dune Light', place: 'Tottori', kind: 'landscape' },
  { id: 5, title: 'Soft Noise', place: 'Studio', kind: 'gradient' },
  { id: 6, title: 'Bauhaus 06', place: 'Tokyo', kind: 'geometric' },
  { id: 7, title: 'Mist', place: 'Nagano', kind: 'landscape' },
  { id: 8, title: 'Neon Bloom', place: 'Osaka', kind: 'gradient' },
]

const CSS = `
::view-transition-group(*.vtg-card) { animation-duration: .5s; animation-timing-function: cubic-bezier(.2,.8,.2,1); }
::view-transition-old(*.vtg-card), ::view-transition-new(*.vtg-card) { height: 100%; object-fit: cover; }
`

function withTransition(update: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown }
  if (!doc.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) return update()
  doc.startViewTransition(() => flushSync(update))
}

export function ViewTransitionsGallery() {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [items, setItems] = useState(ITEMS)
  const [open, setOpen] = useState<Item | null>(null)
  const vt = (part: string, id: number) => ({ viewTransitionName: `vt${uid}-${part}-${id}`, viewTransitionClass: 'vtg-card' }) as CSSProperties

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#faf9f7] text-zinc-900">
      <style>{CSS}</style>
      {open ? (
        <div className="absolute inset-0 flex flex-col sm:flex-row">
          <div className="relative min-h-0 flex-1 overflow-hidden" style={vt('img', open.id)}>
            <img src={art(open.kind, open.id, 1200, 900)} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="flex flex-col justify-between gap-3 p-5 sm:w-[42%]">
            <div>
              <p className="font-mono text-[11px] tracking-widest text-zinc-400">No.{String(open.id).padStart(2, '0')}</p>
              <h3 className="mt-1 w-fit font-['Playfair_Display'] text-3xl font-bold" style={vt('title', open.id)}>
                {open.title}
              </h3>
              <p className="mt-1 text-sm text-zinc-500">{open.place}</p>
              <p className="mt-3 hidden text-[13px] leading-relaxed text-zinc-600 sm:block">
                サムネイルとこの画像は同じ view-transition-name を持つため、ブラウザが位置とサイズの差分を自動でアニメーションします。
              </p>
            </div>
            <button
              type="button"
              onClick={() => withTransition(() => setOpen(null))}
              className="inline-flex w-fit items-center gap-1.5 rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-700"
            >
              <ArrowLeft size={14} /> 一覧へ戻る
            </button>
          </div>
        </div>
      ) : (
        <div className="thin-scroll absolute inset-0 overflow-y-auto p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-['Playfair_Display'] text-xl font-bold">Gallery</h3>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => withTransition(() => setItems((s) => [...s].sort(() => Math.random() - 0.5)))}
                className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs hover:bg-zinc-100"
              >
                <Shuffle size={12} /> シャッフル
              </button>
              <button
                type="button"
                onClick={() => withTransition(() => setItems((s) => [...s].sort((a, b) => a.title.localeCompare(b.title))))}
                className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs hover:bg-zinc-100"
              >
                <ArrowUpDown size={12} /> 名前順
              </button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2.5">
            {items.map((it) => (
              <button
                key={it.id}
                type="button"
                onClick={() => withTransition(() => setOpen(it))}
                className="group text-left"
                style={vt('card', it.id)}
              >
                <div className="aspect-[4/5] overflow-hidden rounded-lg" style={vt('img', it.id)}>
                  <img src={art(it.kind, it.id, 400, 500)} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                </div>
                <div className="mt-1 w-fit truncate text-[12px] font-semibold" style={vt('title', it.id)}>
                  {it.title}
                </div>
              </button>
            ))}
          </div>
          <p className="mt-3 text-center text-[11px] text-zinc-400">画像をクリックすると詳細へモーフィング</p>
        </div>
      )}
    </div>
  )
}
