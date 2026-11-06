import type { CSSProperties, PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'

const finishes = [
  {
    id: 'foil', note: '01 / HOT FOIL',
    stock: 'bg-[#29251e] text-[#e9c88a] shadow-black/50',
    artwork: 'bg-[linear-gradient(118deg,#826038,#ffe2a1_28%,#694721_48%,#fbe7bb_59%,#9b7846_78%)] bg-clip-text text-transparent',
  },
  {
    id: 'deboss', note: '02 / BLIND DEBOSS',
    stock: 'bg-[#dfd4bb] text-[#4c3c2b] shadow-black/30',
    artwork: 'text-[#b5a78d] [text-shadow:0_1px_0_#fff1d1,0_-1px_0_#766a54]',
  },
  {
    id: 'vellum', note: '03 / VELLUM',
    stock: 'border border-white/60 bg-[#e7e6db]/70 text-[#242525] shadow-black/30 backdrop-blur-[6px]',
    artwork: 'text-[#403f3b]',
  },
] as const

const centeredLight = { '--light-x': '54%', '--light-y': '20%' } as CSSProperties

function aimLight(event: PointerEvent<HTMLElement>) {
  const ticket = event.currentTarget
  const rect = ticket.getBoundingClientRect()
  ticket.style.setProperty('--light-x', `${(event.clientX - rect.left) / rect.width * 100}%`)
  ticket.style.setProperty('--light-y', `${(event.clientY - rect.top) / rect.height * 100}%`)
}

export function MaterialTickets() {
  const { t } = useTranslation('demoControls', { keyPrefix: 'tickets' })
  return (
    <div className="@container h-full w-full overflow-y-auto bg-[#171716] p-4 text-[#eee5d7] @lg:p-7">
      <div className="mx-auto flex min-h-full max-w-6xl flex-col justify-center gap-4">
        <header className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="font-mono text-[9px] tracking-[.25em] text-[#c4a876]">AFTER FORM / PRESS PROOFS</p>
            <h2 className="font-serif text-[clamp(1.5rem,4cqw,3rem)] tracking-tight">{t('title')}</h2>
          </div>
          <p className="text-xs text-stone-400">{t('hint')}</p>
        </header>
        <div className="grid grid-cols-1 gap-3 @lg:grid-cols-3">
          {finishes.map((finish) => (
            <figure key={finish.id} className="min-w-0">
              <div className="relative isolate rounded-md bg-[#49413b] p-3 @lg:p-4">
                <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden rounded-md">
                  <div className="absolute top-[28%] -left-6 h-18 w-[120%] -rotate-13 bg-[#a54e40]" />
                  <div className="absolute -right-9 bottom-0 h-28 w-28 rounded-full bg-[#aaa477]" />
                </div>
                <div onPointerMove={aimLight} style={centeredLight}
                  className={`relative isolate flex min-h-30 flex-col justify-between overflow-hidden rounded-[2px] px-4 py-3 shadow-xl ${finish.stock}`}>
                  <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(ellipse_at_var(--light-x)_var(--light-y),#fff9d968,transparent_72%)] mix-blend-soft-light" />
                  <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-15 [background:repeating-linear-gradient(115deg,transparent_0_2px,#8c7758_2px_3px)]" />
                  <div className="flex items-center justify-between border-b border-current/30 pb-1 font-mono text-[8px] tracking-widest">
                    <span>STUDIO MUSEUM</span><span>№ 014</span>
                  </div>
                  <p className={`py-3 font-serif text-[clamp(1.5rem,4.1cqw,3rem)] leading-none tracking-[-.05em] ${finish.artwork}`}
                    style={finish.id === 'foil' ? { backgroundSize: '180% 180%', backgroundPosition: 'var(--light-x) var(--light-y)' } : undefined}>After Form</p>
                  <div className="flex justify-between border-t border-dashed border-current/45 pt-1.5 font-mono text-[8px] tracking-wider">
                    <span>10 APR 2027</span><span>ADMIT ONE</span>
                  </div>
                </div>
              </div>
              <figcaption className="flex flex-wrap justify-between gap-x-2 py-2 text-[11px]">
                <span>{t(finish.id)}</span><span className="font-mono text-[9px] tracking-wider text-stone-400">{finish.note}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </div>
  )
}
