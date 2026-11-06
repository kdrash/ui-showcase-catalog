import { useRef, useState } from 'react'
import { TransformComponent, TransformWrapper, type ReactZoomPanPinchContentRef } from 'react-zoom-pan-pinch'
import { RotateCcw, Star, ZoomIn, ZoomOut } from 'lucide-react'
import { art } from '../_shared/art'

const IMAGES = [
  art('landscape', 0, 1200, 900),
  art('landscape', 1, 1200, 900),
  art('geometric', 2, 1200, 900),
  art('gradient', 5, 1200, 900),
  art('landscape', 6, 1200, 900),
]

export function ProductGalleryZoom() {
  const [idx, setIdx] = useState(0)
  const [scale, setScale] = useState(1)
  const api = useRef<ReactZoomPanPinchContentRef>(null)

  const pick = (i: number) => {
    setIdx(i)
    api.current?.resetTransform(0)
  }

  return (
    <div className="@container relative h-full w-full overflow-y-auto bg-white font-['Noto_Sans_JP',Inter,sans-serif] text-zinc-800">
      <div className="grid gap-5 p-4 @3xl:grid-cols-[1.5fr_1fr] @3xl:p-6">
        <div className="flex flex-col-reverse gap-3 @xl:flex-row">
          {/* サムネイル */}
          <div className="flex gap-2 @xl:flex-col">
            {IMAGES.map((src, i) => (
              <button
                key={i}
                onClick={() => pick(i)}
                className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg ring-offset-2 transition ${i === idx ? 'ring-2 ring-zinc-900' : 'opacity-60 hover:opacity-100'}`}
              >
                <img src={src} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
          {/* メイン: ホイール / ピンチ / ダブルクリックでズーム、ドラッグでパン */}
          <div className="relative aspect-[4/3] min-w-0 flex-1 overflow-hidden rounded-2xl bg-zinc-100">
            <TransformWrapper
              ref={api}
              minScale={1}
              maxScale={5}
              doubleClick={{ mode: 'toggle', step: 1.4 }}
              wheel={{ step: 0.15 }}
              onTransform={(_, s) => setScale(s.scale)}
            >
              {({ zoomIn, zoomOut, resetTransform }) => (
                <>
                  <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%', height: '100%' }}>
                    <img src={IMAGES[idx]} alt="商品画像" className="h-full w-full object-cover" draggable={false} />
                  </TransformComponent>
                  <div className="absolute right-3 bottom-3 flex items-center gap-1 rounded-full bg-white/90 p-1 shadow-lg backdrop-blur">
                    <button onClick={() => zoomOut()} className="rounded-full p-1.5 hover:bg-zinc-100" aria-label="縮小">
                      <ZoomOut size={15} />
                    </button>
                    <span className="w-11 text-center text-[11px] font-semibold tabular-nums">{Math.round(scale * 100)}%</span>
                    <button onClick={() => zoomIn()} className="rounded-full p-1.5 hover:bg-zinc-100" aria-label="拡大">
                      <ZoomIn size={15} />
                    </button>
                    <button onClick={() => resetTransform()} className="rounded-full p-1.5 hover:bg-zinc-100" aria-label="リセット">
                      <RotateCcw size={14} />
                    </button>
                  </div>
                  <span className="pointer-events-none absolute top-3 left-3 rounded-full bg-black/50 px-2.5 py-1 text-[10px] text-white backdrop-blur">
                    ダブルクリック / ホイールで拡大・ドラッグで移動
                  </span>
                </>
              )}
            </TransformWrapper>
          </div>
        </div>

        {/* 商品情報 */}
        <div className="flex flex-col gap-3">
          <p className="text-[11px] tracking-[0.2em] text-zinc-400 uppercase">Hokuto Studio</p>
          <h2 className="text-xl font-bold tracking-tight">アートプリント「山の稜線」</h2>
          <div className="flex items-center gap-1 text-xs text-zinc-500">
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} size={13} className={i < 4 ? 'fill-amber-400 text-amber-400' : 'text-zinc-300'} />
            ))}
            <span className="ml-1">4.6 (128件)</span>
          </div>
          <p className="text-2xl font-bold">¥12,800 <span className="text-xs font-normal text-zinc-500">税込</span></p>
          <p className="text-[13px] leading-relaxed text-zinc-600">
            ジクレー印刷による高精細なアートプリント。細部まで拡大して、紙の質感や色の重なりを確かめてください。
          </p>
          <div className="flex gap-2 text-xs">
            {['A3', 'A2', 'B1'].map((s, i) => (
              <span key={s} className={`rounded-md border px-3 py-1.5 ${i === 1 ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200'}`}>
                {s}
              </span>
            ))}
          </div>
          <button className="mt-1 rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white hover:bg-zinc-700">カートに入れる</button>
        </div>
      </div>
    </div>
  )
}
