import { Check, Disc3, RotateCcw } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useLoadingPreview } from './useLoadingPreview'

const phases = ['spin', 'read', 'verify'] as const
const segments = Array.from({ length: 20 }, (_, index) => index)

export function OpticalDiscLoader() {
  const { t } = useTranslation('demoControls', { keyPrefix: 'loading' })
  const reduced = useReducedMotion()
  const { ref, id, progress, done, running, restart } = useLoadingPreview(5100)
  const phase = progress < 23 ? 0 : progress < 81 ? 1 : 2

  return (
    <div ref={ref} className="@container h-full w-full overflow-y-auto bg-[#0d1324] px-3 pt-3 pb-[var(--solo-footer-clearance,0.75rem)] text-[#e4eeff] [background:radial-gradient(ellipse_at_18%_46%,#2b4377,transparent_62%),#0d1324]">
      <div className="mx-auto flex min-h-full max-w-5xl flex-col justify-center gap-3">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#b6c9f5]/40 pb-2">
          <p className="inline-flex items-center gap-2 font-mono text-[10px] font-bold tracking-[.18em]"><Disc3 size={14} aria-hidden="true" /> DATAROOM / OPTICAL DRIVE</p>
          <button type="button" onClick={restart} className="inline-flex items-center gap-1.5 rounded-full border border-[#b6c9f5]/55 bg-[#263b64] px-2.5 py-1 text-[10px] font-bold hover:bg-[#3a5689]">
            <RotateCcw size={12} aria-hidden="true" /> {t('restart')}
          </button>
        </header>
        <div className="grid flex-1 items-center gap-2 @min-[28rem]:grid-cols-[.95fr_1.05fr] @min-[28rem]:gap-6 @min-[28rem]:py-1.5">
          <div aria-hidden="true" className="relative mx-auto aspect-square w-[clamp(7rem,29cqw,9rem)] @min-[28rem]:w-[clamp(7.4rem,34cqw,15rem)]">
            <div className="absolute -inset-3 rounded-full border border-[#9ebaf0]/25" />
            <motion.div key={id} className="absolute inset-0 rounded-full border-2 border-[#e2edff] shadow-[0_8px_28px_#090f22,0_0_26px_#8bb4ff52] [background:repeating-radial-gradient(circle,transparent_0_3px,#222a535e_4px_5px),conic-gradient(from_52deg,#5c638b,#9edcf2,#e5e4ff,#feaece,#f4edb1,#98e6db,#55688d,#c1d5fa,#5c638b)]"
              initial={{ rotate: 0 }} animate={running && !reduced ? { rotate: 360 } : { rotate: 0 }}
              transition={running && !reduced ? { duration: 1.65, repeat: Infinity, ease: 'linear' } : { duration: 0 }}>
              <div className="absolute inset-[14%] rounded-full border border-white/75" />
              <div className="absolute inset-[24%] rounded-full border border-white/60" />
              <div className="absolute top-[20%] left-[24%] -rotate-14 font-mono text-[clamp(.45rem,1.4cqw,.86rem)] font-black tracking-widest text-[#1a2748]">OPTIC 07</div>
              <div className="absolute inset-[39%] rounded-full border-2 border-[#dae7ff] bg-[#7182a7]">
                <div className="absolute inset-[27%] rounded-full bg-[#1a2847]" />
              </div>
            </motion.div>
            <div className="absolute inset-0 grid place-items-center rounded-full" style={{ transform: `rotate(${reduced ? -75 : -75 + progress * 2.55}deg)` }}>
              <span className="absolute -top-4 size-2 rounded-full border border-white bg-[#8ef1ff] shadow-[0_0_10px_#8ef1ff]" />
            </div>
          </div>
          <div className="min-w-0 rounded-xl border border-[#a3badc]/45 bg-[#121d36]/90 p-2.5 shadow-[inset_0_1px_0_#d4e5ff47,0_8px_20px_#050a1b50] @min-[28rem]:p-4">
            <p className="font-mono text-[9px] tracking-[.22em] text-[#9bbbfa]">DISC CONTROL / SLOT A</p>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
              <h2 role="status" className="flex items-center gap-1.5 text-[clamp(1.15rem,4.5cqw,2.25rem)] leading-tight font-black tracking-tight">
                {done && <Check size={18} className="text-[#a6f4cb]" aria-hidden="true" />}
                {t(done ? 'optical.ready' : `optical.${phases[phase]}`)}
              </h2>
              <output aria-hidden="true" className="font-mono text-lg text-[#aaf4ee] tabular-nums">{progress}%</output>
            </div>
            <div role="progressbar" aria-label={t('optical.progress')} aria-valuenow={progress} className="mt-2 grid grid-cols-20 gap-0.5 rounded-sm border border-[#829ac0]/45 bg-[#080f21] p-1">
              {segments.map((index) => <span key={index} className={`h-3 rounded-xs ${progress > index * 5 ? 'bg-[#8fe1ec] shadow-[0_0_5px_#8fe1ec88]' : 'bg-[#293552]'}`} />)}
            </div>
            <ol className="mt-2.5 flex flex-wrap gap-1 font-mono text-[9px]">
              {phases.map((name, index) => <li key={name} className={`rounded-sm border px-1.5 py-0.5 ${index === phase && !done ? 'border-[#92cde9] bg-[#27456c] text-white' : 'border-[#8fa4c4]/35 text-[#a9b8d0]'}`} aria-current={index === phase && !done ? 'step' : undefined}>0{index + 1} {t(`optical.${name}`)}</li>)}
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
