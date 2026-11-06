import { useState } from 'react'
import { ArrowDown, Circle, Sparkle, Triangle } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'

const choices = [
  { id: 'spark', icon: Sparkle, color: '#ff83ba', number: '01' },
  { id: 'orbit', icon: Circle, color: '#9adff3', number: '02' },
  { id: 'zig', icon: Triangle, color: '#cfed78', number: '03' },
] as const

export function MemphisStickerMachine() {
  const { t } = useTranslation('demoControls', { keyPrefix: 'stickerMachine' })
  const reduceMotion = useReducedMotion()
  const [dispensed, setDispensed] = useState<{ index: number; number: number } | null>(null)
  const sticker = dispensed && choices[dispensed.index]
  const StickerIcon = sticker?.icon

  return (
    <div className="@container h-full w-full overflow-y-auto bg-[#fff0b4] px-3 pt-3 pb-[var(--solo-footer-clearance,0.75rem)] text-[#201a25] [background-image:radial-gradient(circle,#765f6338_1px,transparent_1.5px)] [background-size:12px_12px]">
      <div className="mx-auto flex min-h-full max-w-4xl flex-col justify-center gap-3">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <span className="border-2 border-[#201a25] bg-[#fff9eb] px-2 py-1 font-mono text-[9px] font-black tracking-[.16em] shadow-[2px_2px_0_#201a25]">PLAY OBJECTS / MEMPHIS SERIES</span>
          <span className="rotate-4 border-2 border-[#201a25] bg-[#ff83ba] px-2 py-0.5 text-[10px] font-black shadow-[2px_2px_0_#201a25]">★ 3 DESIGNS!</span>
        </header>
        <div className="relative grid overflow-hidden border-3 border-[#201a25] bg-[#a886e9] shadow-[5px_5px_0_#201a25] @lg:grid-cols-[.9fr_1.1fr]">
          <div className="relative isolate grid min-h-28 content-center overflow-hidden border-b-3 border-[#201a25] bg-[#fff8e4] p-3 @lg:border-r-3 @lg:border-b-0 @lg:p-6">
            <svg aria-hidden="true" viewBox="0 0 330 240" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 -z-10 h-full w-full">
              <path d="M258 9h44l23 37-28 44-61-15Z" fill="#fdbf44" stroke="#201a25" strokeWidth="4" />
              <circle cx="41" cy="207" r="32" fill="#ff83ba" stroke="#201a25" strokeWidth="4" />
              <path d="m225 179 19-19 17 25 23-17 16 22" fill="none" stroke="#201a25" strokeWidth="6" strokeLinejoin="round" />
              <path d="M14 27h36M17 39h16M127 208h32" stroke="#201a25" strokeWidth="3" strokeDasharray="2 4" />
            </svg>
            <div className="w-fit -rotate-4 border-2 border-[#201a25] bg-[#fef6de] px-3 py-2 shadow-[3px_3px_0_#201a25]">
              <h2 className="text-[clamp(1.9rem,7.2cqw,4.9rem)] leading-[.79] font-black tracking-[-.095em]">POP<br /><span className="text-[#9b3b75]">DROP!</span></h2>
              <p className="mt-1 font-mono text-[9px] font-black tracking-[.14em]">{t('title')}</p>
            </div>
          </div>
          <section className="p-3 @sm:p-4">
            <div role="group" aria-label={t('select')} className="grid grid-cols-3 gap-2">
              {choices.map(({ id, icon: Icon, color, number }, index) => (
                <button key={id} type="button" aria-label={t('dispense', { sticker: t(id) })} title={t('dispense', { sticker: t(id) })}
                  onClick={() => setDispensed((previous) => ({ index, number: (previous?.number ?? 0) + 1 }))}
                  className="grid min-w-0 justify-items-center gap-0.5 rounded-sm border-2 border-[#201a25] p-1 text-center shadow-[3px_3px_0_#201a25] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                  style={{ backgroundColor: color }}>
                  <Icon size={22} strokeWidth={2.5} aria-hidden="true" /><span className="text-[9px] leading-tight font-black @sm:text-[10px]">{t(id)}</span>
                  <span className="font-mono text-[8px]">{number}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 overflow-hidden rounded-md border-3 border-[#201a25] bg-[#1f192a] p-1.5 shadow-[inset_0_6px_0_#100d1b]">
              <div className="flex items-center justify-center gap-1 border-b-2 border-[#17131d] bg-[#f8c946] py-1 font-mono text-[9px] font-black tracking-widest"><ArrowDown size={12} /> {t('chute')}</div>
              <div className="grid h-21 place-items-center overflow-hidden" aria-hidden="true">
                {dispensed && sticker && StickerIcon ? (
                  <motion.div key={dispensed.number} initial={reduceMotion ? false : { y: -70, rotate: -12, opacity: .25 }}
                    animate={{ y: 0, rotate: dispensed.index % 2 ? -7 : 6, opacity: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 21 }}
                    className="flex w-fit items-center gap-2 rounded-[38%_18%_34%_22%] border-3 border-white px-3 py-2 text-xs font-black text-[#201a25] shadow-[0_3px_0_#0007]"
                    style={{ backgroundColor: sticker.color }}><StickerIcon size={26} />{t(sticker.id)}</motion.div>
                ) : <span className="font-mono text-[9px] tracking-widest text-[#e8dcfb]">· · ·</span>}
              </div>
            </div>
            <p role="status" className="mt-2 min-h-4 text-[10px] font-black">{sticker ? t('released', { sticker: t(sticker.id) }) : t('hint')}</p>
          </section>
        </div>
      </div>
    </div>
  )
}
