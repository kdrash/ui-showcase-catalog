import { useEffect, useState } from 'react'
import { ArrowDown, ArrowRight, Ticket } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'

const destinations = [
  { id: 'harbor', fare: 240, code: 'EB 04' },
  { id: 'park', fare: 310, code: 'EB 07' },
  { id: 'observatory', fare: 380, code: 'EB 09' },
] as const

export function StationTicketMachine() {
  const { t, i18n } = useTranslation('demoControls', { keyPrefix: 'ticketMachine' })
  const reduced = useReducedMotion()
  const [selected, setSelected] = useState(0)
  const [phase, setPhase] = useState<'select' | 'printing' | 'issued' | 'taken'>('select')
  const locked = phase === 'printing' || phase === 'issued'
  const destination = destinations[selected]
  const yen = new Intl.NumberFormat(i18n.resolvedLanguage, { style: 'currency', currency: 'JPY' })

  useEffect(() => {
    if (phase !== 'printing') return
    const timer = window.setTimeout(() => setPhase('issued'), 950)
    return () => window.clearTimeout(timer)
  }, [phase])

  return (
    <div className="@container h-full w-full overflow-y-auto bg-[#e6b481] px-3 pt-3 pb-[var(--solo-footer-clearance,0.75rem)] text-[#14272c] [background-image:radial-gradient(#4e33294f_0.6px,transparent_0.8px)] [background-size:5px_5px]">
      <div className="mx-auto flex min-h-full max-w-3xl items-center">
        <section className="w-full rounded-xl border-3 border-[#433d39] bg-[#e4dbc8] p-2.5 shadow-[0_5px_0_#58443c,inset_0_2px_0_#fff6df]">
          <header className="flex flex-wrap items-center justify-between gap-1.5 rounded-sm bg-[#21343b] px-2.5 py-2 text-[#fff0cf]">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-full bg-[#df7b41] text-[#1f2b2d]"><Ticket size={17} aria-hidden="true" /></span>
              <div><p className="font-mono text-[8px] font-bold tracking-[.2em]">EAST BAY LINE / EB 01</p><h2 className="text-sm leading-tight font-black">{t('title')}</h2></div>
            </div>
            <span className="rounded-sm border border-[#eed1a4]/65 px-1.5 font-mono text-[9px] font-bold">01 / TICKET</span>
          </header>
          <div className="mt-2 grid gap-2 @min-[28rem]:grid-cols-[1.15fr_1fr]">
            <div className="min-w-0 rounded-md border-2 border-[#7f7970] bg-[#f6edda] p-2">
              <p className="mb-1 text-[10px] font-bold">{t('choose')}</p>
              <div className="grid gap-1.5" role="group" aria-label={t('choose')}>
                {destinations.map(({ id, fare, code }, index) => (
                  <button type="button" key={id} aria-pressed={selected === index} disabled={locked}
                    onClick={() => { setSelected(index); setPhase('select') }}
                    className="flex min-h-8 items-center justify-between gap-1 rounded-sm border border-[#8d8478] bg-[#fff9eb] px-1.5 text-left text-[11px] font-bold shadow-[0_2px_0_#9d8a75] hover:bg-[#ffedcb] active:translate-y-px aria-pressed:border-[#496357] aria-pressed:bg-[#c9e0c3] disabled:cursor-default disabled:shadow-none">
                    <span className="min-w-0"><span className="mr-1 font-mono text-[9px] text-[#465b59]">{code}</span>{t(id)}</span>
                    <span className="shrink-0 font-mono tabular-nums">{yen.format(fare)}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="min-w-0 rounded-md border-2 border-[#7f7970] bg-[#c4b9a6] p-2">
              <div role="status" className="flex min-h-8 items-center gap-1.5 rounded-sm border-2 border-[#415451] bg-[#203e3c] px-2 py-1 text-[11px] font-bold leading-tight text-[#def4c4]">
                <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-[#a8ef8d] shadow-[0_0_6px_#a8ef8d]" />{t(phase)}
              </div>
              <div className="relative mx-auto mt-1.5 flex h-[4.65rem] max-w-52 items-start justify-center overflow-hidden rounded-sm border-t-4 border-[#263438] bg-[#343735] shadow-[inset_0_4px_10px_#000b]">
                {locked ? (
                  <motion.button type="button" disabled={phase !== 'issued'} aria-label={t('take')} onClick={() => setPhase('taken')}
                    initial={reduced ? false : { y: '-100%' }} animate={{ y: phase === 'issued' ? '8%' : '-56%' }}
                    transition={{ duration: reduced ? 0 : .42, ease: 'easeOut' }}
                    className="w-[84%] rounded-b-sm border-2 border-[#cfa178] bg-[#ffe7b2] px-2 pt-2 pb-1 text-left text-[#4c332d] shadow-md focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white">
                    <span className="block border-b border-dashed border-[#b27554] pb-0.5 font-mono text-[8px] font-bold tracking-wider">EAST BAY LINE · SINGLE</span>
                    <span className="mt-1 flex items-center gap-1 text-[11px] leading-tight font-black"><span>EB 01</span><ArrowRight size={11} aria-hidden="true" />{t(destination.id)}</span>
                    <span className="font-mono text-[9px] tabular-nums">{yen.format(destination.fare)}</span>
                  </motion.button>
                ) : <ArrowDown size={18} className="mt-6 text-[#f6ead0]/55" aria-hidden="true" />}
              </div>
              <button type="button" disabled={locked} onClick={() => setPhase('printing')}
                className="mt-1.5 w-full rounded-sm border border-[#875033] bg-[#f6a86e] px-2 py-1 text-[11px] font-black shadow-[inset_0_1px_0_#fff5d2,0_2px_0_#875033] hover:bg-[#ffc097] active:translate-y-px disabled:opacity-65">
                {t('print', { fare: yen.format(destination.fare) })}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
