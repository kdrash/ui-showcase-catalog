import { useEffect, useState } from 'react'
import { CircleAlert, CircleCheck, Disc3, RotateCcw } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'

const bezelButton = 'inline-flex min-h-7 items-center justify-center gap-1.5 rounded-md border border-[#7b809c] bg-linear-to-b from-white to-[#c5cbe2] px-2.5 py-1 text-[10px] font-black text-[#30364f] shadow-[0_2px_0_#868fa9,inset_0_1px_0_#fff] hover:from-[#f6e4fc] active:translate-y-px aria-disabled:opacity-65'

export function DiscReadRecovery() {
  const { t } = useTranslation('demoControls', { keyPrefix: 'discRecovery' })
  const reduced = useReducedMotion()
  const [phase, setPhase] = useState<'fault' | 'ejected' | 'reading' | 'ready'>('fault')
  const StatusIcon = phase === 'fault' ? CircleAlert : phase === 'ready' ? CircleCheck : Disc3
  const action = phase === 'ejected' ? 'insert' : phase === 'reading' ? 'wait' : 'eject'

  useEffect(() => {
    if (phase !== 'reading') return
    const timer = window.setTimeout(() => setPhase((current) => current === 'reading' ? 'ready' : current), 1550)
    return () => window.clearTimeout(timer)
  }, [phase])

  return (
    <div className="@container h-full w-full overflow-y-auto bg-[#292a45] px-3 pt-3 pb-[var(--solo-footer-clearance,0.75rem)] text-[#343852] [background:radial-gradient(ellipse_at_50%_75%,#7a6b97,transparent_72%),#292a45]">
      <div className="mx-auto flex min-h-full max-w-3xl items-center">
        <section className="w-full rounded-2xl border-2 border-[#eff3ff] bg-linear-to-b from-[#f2edf8] via-[#b9c4df] to-[#949bb8] p-2.5 shadow-[0_7px_0_#15172b,0_10px_24px_#13132699,inset_0_3px_0_#fff]">
          <header className="flex flex-wrap items-center justify-between gap-1.5 border-b border-[#898fa9] pb-2">
            <p className="flex items-center gap-1.5 font-mono text-[10px] font-black tracking-[.18em]"><Disc3 size={14} aria-hidden="true" />NOVA DISC / RX-02</p>
            <button type="button" onClick={() => setPhase('fault')} className={bezelButton}>
              <RotateCcw size={12} aria-hidden="true" />{t('reset')}
            </button>
          </header>
          <div className="mt-2 grid items-center gap-2.5 @min-[27rem]:grid-cols-[.9fr_1.1fr]">
            <div aria-hidden="true" className="relative isolate flex h-[clamp(7rem,27cqw,12rem)] items-center justify-center overflow-hidden rounded-xl border border-[#8b94ae] bg-[#d8dff2] shadow-[inset_0_4px_12px_#505f8f4d]">
              <div className="absolute inset-x-[10%] bottom-[13%] h-[17%] rounded-[50%] border-3 border-[#acb7d3] bg-[#272e47] shadow-[0_3px_1px_#f4f7ff]" />
              <motion.div initial={false} animate={{ y: phase === 'ejected' ? -13 : 4, opacity: phase === 'ejected' ? .56 : 1 }}
                transition={{ duration: reduced ? 0 : .26 }} className="relative aspect-square w-[clamp(5.3rem,22cqw,9rem)]">
                <motion.div initial={false} animate={phase === 'reading' && !reduced ? { rotate: 360 } : { rotate: 0 }}
                  transition={phase === 'reading' && !reduced ? { duration: .72, ease: 'linear', repeat: Infinity } : { duration: 0 }}
                  className="absolute inset-0 rounded-full border-2 border-[#f1f4ff] shadow-[0_5px_9px_#3339557a] [background:repeating-radial-gradient(circle,transparent_0_3px,#675f9050_4px_5px),conic-gradient(from_50deg,#9c9fc1,#fbddfa,#d2f4f0,#8e95bc,#f5e8b5,#e4e5fb,#9c9fc1)]">
                  <div className="absolute inset-[17%] rounded-full border border-white/75" />
                  <span className="absolute inset-x-0 top-[20%] text-center font-mono text-[8px] font-black">NOVA</span>
                  <div className="absolute inset-[41%] rounded-full border border-white bg-[#b0b9d6]"><div className="absolute inset-[24%] rounded-full bg-[#647395]" /></div>
                </motion.div>
              </motion.div>
            </div>
            <div className="min-w-0">
              <div role="status" className="min-h-[5.5rem] rounded-lg border-3 border-[#596680] bg-[#d8efce] p-2 text-[#243e32] shadow-[inset_0_3px_9px_#425d4b62,0_1px_0_#fff8]">
                <p className="flex items-center gap-1 font-mono text-[9px] font-bold tracking-[.18em]"><StatusIcon size={13} aria-hidden="true" />{phase === 'fault' ? 'E-04 / READ ERROR' : 'OPTICAL / SLOT 01'}</p>
                <h2 className="mt-1 text-[clamp(.95rem,3cqw,1.45rem)] leading-tight font-black">{t(phase)}</h2>
                <p className="mt-0.5 text-[10px] leading-snug">{t(`${phase}Hint`)}</p>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span aria-hidden="true" className="flex items-center gap-1.5 font-mono text-[9px] font-bold tracking-widest">
                  <span className={`size-2 rounded-full border border-[#474a6a] ${phase === 'fault' ? 'bg-[#bd3a63]' : phase === 'ready' ? 'bg-[#32874d]' : 'bg-[#ffda77]'}`} />DRIVE
                </span>
                <button type="button" aria-disabled={phase === 'reading'} className={bezelButton}
                  onClick={() => {
                    if (phase !== 'reading') setPhase(phase === 'ejected' ? 'reading' : 'ejected')
                  }}>
                  {t(action)}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
