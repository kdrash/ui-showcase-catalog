import { useEffect, useState } from 'react'
import { ArrowUpRight, RotateCcw } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'

const bars = ['#d4c6a7', '#d0a24c', '#749997', '#719477', '#a2667e', '#b4624e', '#536889']

export function SignalLost500() {
  const { t, i18n } = useTranslation('demoControls', { keyPrefix: 'signalLost' })
  const reduced = useReducedMotion()
  const [state, setState] = useState<'fault' | 'checking' | 'restored'>('fault')

  useEffect(() => {
    if (state !== 'checking') return
    const timer = window.setTimeout(() => setState('restored'), 1450)
    return () => window.clearTimeout(timer)
  }, [state])

  return (
    <div className="@container h-full w-full overflow-y-auto bg-[#242328] px-3 pt-3 pb-[var(--solo-footer-clearance,0.75rem)] text-[#f0dfbb] [background:radial-gradient(ellipse_at_22%_15%,#46434b,transparent_76%),#242328] @md:px-5">
      <section className="mx-auto flex min-h-full max-w-4xl flex-col justify-center">
        <header className="flex flex-wrap items-center justify-between gap-2 border-y border-[#8a7c6c] py-1.5">
          <p className="flex items-center gap-1.5 font-mono text-[9px] font-black tracking-[.19em] @sm:text-[10px]">
            <span className="size-2 rounded-full border border-[#f5dbaf]/50" style={{ background: state === 'restored' ? '#a4c787' : '#e18a58' }} /> SIGNAL ROOM / CHANNEL 05
          </p>
          <p className="font-mono text-[8px] font-bold tracking-widest text-[#dbbf99]">SERVICE MONITOR</p>
        </header>
        <div className="my-2.5 grid items-center gap-3 @min-[28rem]:grid-cols-[1.2fr_1fr] @sm:gap-4">
          <div aria-hidden="true" className="rounded-[1.05rem] border-3 border-[#73685e] bg-[#b6a17d] p-2 shadow-[0_4px_0_#19171a,inset_0_2px_0_#ecd4a7] @sm:p-2.5">
            <div className="relative isolate mx-auto h-[clamp(7.8rem,34cqw,14.5rem)] overflow-hidden rounded-[.78rem] border-3 border-[#242523] bg-[#1a272a] text-[#f8efd6] shadow-[inset_0_0_0_2px_#100f0e]">
              {state === 'restored' ? (
                <svg viewBox="0 0 480 210" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
                  <path d="M0 0h480v210H0z" fill="#2c5557" /><circle cx="342" cy="76" r="48" fill="#e3a369" />
                  <path d="m0 132 69-35 41 34 78-64 79 75 81-30 132 55v43H0Z" fill="#55776b" />
                  <path d="m0 176 71-24 57 13 71-37 74 37 104-19 103 20v44H0Z" fill="#314849" />
                </svg>
              ) : (
                <div className="absolute inset-0 flex flex-col">
                  <div className="grid grow grid-cols-7">{bars.map((color) => <span key={color} style={{ backgroundColor: color }} />)}</div>
                  <div className="h-[19%] bg-[repeating-linear-gradient(90deg,#3f3c34_0%_14.285%,#141b21_14.285%_28.57%,#617576_28.57%_42.855%)]" />
                </div>
              )}
              <div className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] shadow-[inset_0_0_22px_11px_#1b1a17a0] [background-image:repeating-linear-gradient(transparent_0_2px,#16161b45_2px_3px)]" />
              {state === 'checking' && !reduced && (
                <motion.div className="absolute inset-x-0 top-0 z-20 h-[16%] bg-linear-to-b from-transparent to-[#f3f1d770]"
                  initial={{ top: '-16%' }} animate={{ top: '100%' }} transition={{ duration: .65, repeat: Infinity, ease: 'linear' }} />
              )}
              <div className="absolute inset-0 z-30 grid place-content-center px-2 text-center">
                <span className="border border-[#eee2bc]/50 bg-[#1b2528] px-2 py-1 font-mono text-[clamp(.65rem,2.4cqw,1.18rem)] font-bold tracking-[.18em] shadow-[2px_2px_0_#141d2170]">
                  {state === 'fault' ? '500 / NO SIGNAL' : state === 'checking' ? 'TUNING…' : 'SIGNAL RESTORED'}
                </span>
              </div>
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-2 px-1 font-mono text-[8px] font-black tracking-widest text-[#29231f]">
              <span>FIELD MONITOR / FM–05</span>
              <span className="h-1.5 w-10 [background:repeating-linear-gradient(90deg,#52453c_0_2px,transparent_2px_4px)]" />
            </div>
          </div>
          <div className="min-w-0">
            <div role="status">
              <p className="font-mono text-[9px] font-black tracking-[.15em] text-[#edaa7e]">{state === 'restored' ? '200 / OK' : '500 / INTERNAL SERVER ERROR'}</p>
              <h2 className="mt-0.5 text-[clamp(1.2rem,4.4cqw,2.7rem)] leading-tight font-black tracking-tight text-balance">{t(state)}</h2>
              <p className="mt-1 max-w-[46ch] text-[clamp(.69rem,1.9cqw,.9rem)] leading-snug text-[#ebd8ba]">{t(`${state}Hint`)}</p>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <button type="button" aria-disabled={state === 'checking'} onClick={() => {
                if (state !== 'checking') setState(state === 'fault' ? 'checking' : 'fault')
              }} className="inline-flex min-h-9 items-center gap-1.5 rounded-xs border border-[#ffcd8f] bg-[#f3c488] px-2.5 py-1 text-[11px] font-black text-[#392721] shadow-[2px_2px_0_#a96948] hover:bg-[#ffe1b8] aria-disabled:opacity-75">
                <RotateCcw size={14} aria-hidden="true" />{t(state === 'fault' ? 'retry' : state === 'restored' ? 'reset' : 'wait')}
              </button>
              <a href={`?lang=${i18n.resolvedLanguage}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-xs border border-[#948673] px-2 py-1 text-[11px] font-bold text-[#f1ddbf] hover:bg-[#4b4444]">
                {t('home')}<ArrowUpRight size={13} aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
        <footer aria-hidden="true" className="flex justify-between gap-2 border-t border-[#8a7c6c] pt-1.5 font-mono text-[8px] font-semibold tracking-widest text-[#d2bfa4]">
          <span>TRANSMISSION LOG</span><span>REF. SR-500</span>
        </footer>
      </section>
    </div>
  )
}
