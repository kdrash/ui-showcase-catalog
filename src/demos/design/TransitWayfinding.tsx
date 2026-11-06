import { useState } from 'react'
import { ArrowDownRight, ArrowUp, TrainFront } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const routes = [
  { code: 'A', platform: '1', color: '#ffcf51', ja: '中央駅', en: 'Central', stops: ['北口 / North Gate', '美術館前 / Museum', '中央駅 / Central'] },
  { code: 'B', platform: '4', color: '#b6dfb6', ja: 'みなと埠頭', en: 'Harbor Pier', stops: ['市場 / Market', '水辺公園 / Waterfront', 'みなと埠頭 / Harbor Pier'] },
] as const

export function TransitWayfinding() {
  const { t } = useTranslation('demoControls', { keyPrefix: 'transit' })
  const [routeIndex, setRouteIndex] = useState(0)
  const route = routes[routeIndex]
  const Arrow = routeIndex === 0 ? ArrowUp : ArrowDownRight

  return (
    <div className="@container h-full w-full overflow-y-auto bg-[#101b2d] p-3 pb-[var(--solo-footer-clearance,0.75rem)] text-[#f5f4e8] @lg:p-6 @lg:pb-[var(--solo-footer-clearance,1.5rem)]">
      <article className="mx-auto flex min-h-full max-w-5xl flex-col justify-center gap-3">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-white/30 pb-2">
          <p className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-[.14em]"><TrainFront size={15} aria-hidden="true" /> 東湾線 / EAST BAY LINE</p>
          <div role="group" aria-label={t('group')} className="flex gap-1">
            {routes.map(({ code, color, en }, index) => (
              <button key={code} type="button" aria-pressed={routeIndex === index} onClick={() => setRouteIndex(index)}
                className="inline-flex items-center gap-1.5 rounded-sm border border-white/30 px-2 py-1 text-[10px] aria-pressed:bg-white/15">
                <span className="size-2 rounded-full" style={{ background: color }} /> {code} {en}
              </button>
            ))}
          </div>
        </header>
        <div className="grid grid-cols-[1fr_auto] overflow-hidden rounded-sm bg-[#2446a3] shadow-[0_8px_20px_#0005]">
          <div className="grid content-center px-[8%] py-6">
            <div className="mb-3 flex items-center gap-2 font-mono text-[10px] tracking-widest">
              <span className="grid size-5 place-items-center rounded-full font-black text-[#14203e]" style={{ background: route.color }}>{route.code}</span>
              <span>方面 / TOWARDS</span>
            </div>
            <h2 lang="ja" className="text-[clamp(1.45rem,7.2cqw,5.6rem)] leading-none font-black tracking-[-.06em]">{route.ja}</h2>
            <p lang="en" className="mt-2 text-[clamp(.95rem,3cqw,2rem)] font-bold tracking-tight">{route.en}</p>
          </div>
          <div className="flex w-[clamp(4.4rem,24cqw,16rem)] flex-col items-center justify-center gap-1 px-2 py-4 text-[#14203e]" style={{ background: route.color }}>
            <Arrow className="size-[clamp(2rem,7cqw,5.5rem)]" strokeWidth={2.5} aria-hidden="true" />
            <strong className="text-[clamp(1.35rem,6cqw,4.5rem)] leading-none">{route.platform}</strong>
            <span className="text-center font-mono text-[8px] font-black tracking-wider">番線 / PLATFORM</span>
          </div>
        </div>
        <ol aria-label={t('stops')} className="grid grid-cols-3 gap-2 border-y border-white/25 py-3">
          {route.stops.map((stop, index) => (
            <li key={stop} className="flex min-w-0 flex-col gap-1 text-[10px] leading-tight @lg:text-xs">
              <span className="flex items-center gap-1 font-mono text-[9px] opacity-85">
                <span className="size-2 rounded-full border border-current" style={{ color: route.color, background: index === 2 ? route.color : undefined }} />
                {route.code}{index + 1}
              </span>
              {stop}
            </li>
          ))}
        </ol>
      </article>
    </div>
  )
}
