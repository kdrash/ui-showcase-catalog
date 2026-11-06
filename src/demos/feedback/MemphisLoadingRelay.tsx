import { Circle, RotateCcw, Square, Triangle } from 'lucide-react'
import { easeIn, easeInOut, easeOut, interpolate, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useLoadingPreview } from './useLoadingPreview'

const pieces = [
  { icon: Circle, color: '#ff8eb9', tilt: -12 },
  { icon: Triangle, color: '#a2d7f6', tilt: 14 },
  { icon: Square, color: '#d8ef71', tilt: -10 },
] as const
const beats = [0, .3, .69, .84, 1]
const easings = [easeOut, easeIn, easeOut, easeIn]
const bounce = interpolate(beats, [-24, -42, 0, -9, 0], { ease: easings })
const turn = pieces.map(({ tilt }) => interpolate(beats, [tilt, -tilt, 4, -3, 0], { ease: easeInOut }))
const settleTime = .28
const startTimes = [.04, .355, .67]

export function MemphisLoadingRelay() {
  const { t } = useTranslation('demoControls', { keyPrefix: 'loading' })
  const reduced = useReducedMotion()
  const { ref, progress, done, restart } = useLoadingPreview(4500, { smooth: !reduced })

  return (
    <div ref={ref} className="@container h-full w-full overflow-y-auto bg-[#fff0b4] px-3 pt-3 pb-[var(--solo-footer-clearance,0.75rem)] text-[#211924] [background-image:radial-gradient(circle,#3d2b5930_1px,transparent_1.6px)] [background-size:11px_11px]">
      <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center gap-3">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <span className="border-2 border-[#211924] bg-[#fff9eb] px-2 py-1 font-mono text-[9px] font-black tracking-[.16em] shadow-[2px_2px_0_#211924]">PLAY OBJECTS / WAITING ROOM</span>
          <button type="button" onClick={restart} className="inline-flex items-center gap-1.5 border-2 border-[#211924] bg-[#bda4ff] px-2 py-1 text-[10px] font-black shadow-[2px_2px_0_#211924] active:translate-y-0.5 active:shadow-none">
            <RotateCcw size={12} aria-hidden="true" /> {t('replay')}
          </button>
        </header>
        <section className="overflow-hidden border-3 border-[#211924] bg-[#bda4ff] p-2.5 shadow-[4px_4px_0_#211924] @sm:p-4">
          <div className="relative isolate overflow-hidden border-2 border-[#211924] bg-[#fff7e1] px-3 pt-3 pb-2">
            <svg aria-hidden="true" viewBox="0 0 400 150" preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 -z-10 h-full w-full">
              <path d="m10 96 19-20 15 23 21-23 16 18M320 31l15 17 14-21 16 16 14-16" fill="none" stroke="#6e55b4" strokeWidth="5" strokeLinejoin="round" />
              <circle cx="47" cy="26" r="14" fill="#ffd252" /><circle cx="360" cy="124" r="21" fill="#ff8eb9" />
              <path d="M85 16h29m-21 9h20M310 113h-25m25 10h-15" stroke="#211924" strokeWidth="3" strokeDasharray="2 4" />
            </svg>
            <div aria-hidden="true" className="mx-auto grid h-[clamp(5.1rem,25cqw,9rem)] w-fit grid-cols-3 items-end gap-2 @sm:gap-4">
              {pieces.map(({ icon: Icon, color }, index) => {
                const step = (progress / 100 - startTimes[index]) / settleTime
                const seated = step >= 1
                return (
                  <div key={color} className="grid h-full min-w-0 items-end border-b-3 border-[#211924] px-1 pb-1">
                    <div className="col-start-1 row-start-1 size-[clamp(2.35rem,12cqw,4.7rem)] rounded-sm border-2 border-dashed border-[#211924]/45 bg-[#211924]/6" />
                    <div className="col-start-1 row-start-1 grid size-[clamp(2.35rem,12cqw,4.7rem)] place-items-center border-3 border-[#211924] shadow-[3px_3px_0_#211924]"
                      style={{
                        backgroundColor: color,
                        visibility: reduced && !seated ? 'hidden' : 'visible',
                        transform: reduced ? undefined : `translateY(${bounce(step)}px) rotate(${turn[index](step)}deg)`,
                      }}>
                      <Icon aria-hidden="true" className="size-[55%]" strokeWidth={2.8} />
                    </div>
                  </div>
                )
              })}
            </div>
            <div role="progressbar" aria-label={t('memphis.working')} className="sr-only" hidden={done} />
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <h2 role="status" className="inline-block border-2 border-[#211924] bg-[#d8ef71] px-2 py-0.5 text-[clamp(.95rem,3.2cqw,1.75rem)] leading-tight font-black shadow-[2px_2px_0_#211924]">
              {t(done ? 'memphis.done' : 'memphis.working')}
            </h2>
            <p className="text-[10px] font-bold">{t(done ? 'memphis.completeNote' : 'memphis.waitNote')}</p>
          </div>
        </section>
      </div>
    </div>
  )
}
