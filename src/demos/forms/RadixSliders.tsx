import { useMemo, useState } from 'react'
import { Slider } from 'radix-ui'
import { Volume, Volume1, Volume2, VolumeX } from 'lucide-react'

const MAX = 50000
// 価格分布(ダミー)
const HIST = Array.from({ length: 32 }, (_, i) => {
  const x = i / 31
  return 0.15 + Math.exp(-((x - 0.28) ** 2) / 0.02) * 0.8 + Math.exp(-((x - 0.7) ** 2) / 0.01) * 0.45
})
const QUALITY = ['低', '標準', '高', '最高', '4K']
const yen = (n: number) => '¥' + n.toLocaleString('ja-JP')

const thumb =
  'group relative block h-5 w-5 rounded-full border-2 border-white bg-fuchsia-500 shadow-lg shadow-fuchsia-500/40 outline-none transition hover:scale-110 focus-visible:ring-4 focus-visible:ring-fuchsia-500/30'

export function RadixSliders() {
  const [price, setPrice] = useState([8000, 26000])
  const [q, setQ] = useState([2])
  const [vol, setVol] = useState([65])
  const count = useMemo(
    () => Math.round(HIST.reduce((s, h, i) => s + ((i / 31) * MAX >= price[0] && (i / 31) * MAX <= price[1] ? h * 40 : 0), 0)),
    [price],
  )
  const VolIcon = vol[0] === 0 ? VolumeX : vol[0] < 34 ? Volume : vol[0] < 67 ? Volume1 : Volume2

  return (
    <div className="relative flex h-full w-full gap-4 overflow-hidden bg-zinc-950 p-5 font-sans text-zinc-100">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        {/* 価格帯 */}
        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-sm font-semibold">価格帯</span>
            <span className="text-xs text-zinc-400">{count} 件の商品</span>
          </div>
          <div className="flex h-16 items-end gap-[2px] px-2.5">
            {HIST.map((h, i) => {
              const v = (i / 31) * MAX
              const on = v >= price[0] && v <= price[1]
              return <div key={i} className={`flex-1 rounded-t-sm transition-colors ${on ? 'bg-fuchsia-500/70' : 'bg-zinc-800'}`} style={{ height: `${h * 100}%` }} />
            })}
          </div>
          <Slider.Root
            value={price}
            onValueChange={setPrice}
            min={0}
            max={MAX}
            step={500}
            minStepsBetweenThumbs={4}
            className="relative -mt-0.5 flex h-5 touch-none items-center select-none"
          >
            <Slider.Track className="relative h-1 grow rounded-full bg-zinc-800">
              <Slider.Range className="absolute h-full rounded-full bg-fuchsia-500" />
            </Slider.Track>
            {price.map((p, i) => (
              <Slider.Thumb key={i} className={thumb} aria-label={i ? '上限' : '下限'}>
                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded-md bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold whitespace-nowrap text-zinc-900 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100 group-active:opacity-100">
                  {yen(p)}
                </span>
              </Slider.Thumb>
            ))}
          </Slider.Root>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {price.map((p, i) => (
              <div key={i} className="rounded-lg border border-white/10 px-3 py-1.5">
                <div className="text-[10px] text-zinc-500">{i ? '最高' : '最低'}</div>
                <div className="font-mono text-sm">{yen(p)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 段階スライダー */}
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-sm font-semibold">画質</span>
            <span className="rounded bg-sky-500/15 px-2 py-0.5 text-xs text-sky-300">{QUALITY[q[0]]}</span>
          </div>
          <Slider.Root value={q} onValueChange={setQ} min={0} max={4} step={1} className="relative flex h-5 touch-none items-center select-none">
            <Slider.Track className="relative h-1.5 grow rounded-full bg-zinc-800">
              <Slider.Range className="absolute h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-300" />
            </Slider.Track>
            <Slider.Thumb aria-label="画質" className="block h-5 w-5 rounded-md border-2 border-white bg-sky-500 shadow-lg outline-none focus-visible:ring-4 focus-visible:ring-sky-500/30" />
          </Slider.Root>
          <div className="mt-1.5 flex justify-between px-[7px]">
            {QUALITY.map((l, i) => (
              <button
                key={l}
                type="button"
                onClick={() => setQ([i])}
                className={`flex w-0 flex-col items-center gap-1 text-[10px] whitespace-nowrap ${i <= q[0] ? 'text-sky-300' : 'text-zinc-600'}`}
              >
                <span className={`h-1.5 w-px ${i <= q[0] ? 'bg-sky-400' : 'bg-zinc-600'}`} />
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 縦スライダー */}
      <div className="flex w-16 shrink-0 flex-col items-center gap-2 rounded-2xl border border-white/10 bg-zinc-900 py-3">
        <span className="font-mono text-xs">{vol[0]}</span>
        <Slider.Root
          value={vol}
          onValueChange={setVol}
          orientation="vertical"
          max={100}
          className="relative flex w-10 flex-1 touch-none flex-col items-center select-none"
        >
          <Slider.Track className="relative w-10 grow overflow-hidden rounded-xl bg-zinc-800">
            <Slider.Range className="absolute w-full bg-gradient-to-t from-emerald-500 to-lime-300" />
          </Slider.Track>
          <Slider.Thumb aria-label="音量" className="block h-1 w-6 rounded-full bg-white/80 outline-none" />
        </Slider.Root>
        <button type="button" onClick={() => setVol([vol[0] ? 0 : 65])} className="text-zinc-400 hover:text-white" aria-label="ミュート">
          <VolIcon size={18} />
        </button>
      </div>
    </div>
  )
}
