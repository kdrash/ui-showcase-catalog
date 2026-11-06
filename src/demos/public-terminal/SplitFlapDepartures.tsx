import { useEffect, useState } from 'react'
import { ArrowRight, PlaneTakeoff } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'

const boards = [
  [['08:10', 'SK 021', 'moonBay', 'A3'], ['08:25', 'SK 108', 'northPoint', 'B1'], ['08:40', 'SK 316', 'glassHarbor', 'A8']],
  [['09:05', 'SK 405', 'glassHarbor', 'B4'], ['09:20', 'SK 116', 'moonBay', 'A1'], ['09:55', 'SK 302', 'northPoint', 'B2']],
  [['10:15', 'SK 239', 'northPoint', 'A2'], ['10:30', 'SK 614', 'glassHarbor', 'B5'], ['10:45', 'SK 038', 'moonBay', 'A6']],
] as const
const columns = ['time', 'flight', 'destination', 'gate'] as const
const face = 'absolute inset-x-0 h-1/2 overflow-hidden rounded-[2px] bg-[#262824] [backface-visibility:hidden]'
const letters = 'absolute inset-x-0 flex h-[200%] items-center justify-center px-0.5 leading-none'
const flipDuration = .19

function SplitFlap({ value, previous, delay, turning }: { value: string; previous: string; delay: number; turning: boolean }) {
  const flipping = turning && value !== previous
  return (
    <div aria-hidden="true" className="relative h-[clamp(1.85rem,6cqw,2.7rem)] rounded-xs border border-[#0a0c0a] bg-[#171a17] [perspective:450px]">
      <div className={`${face} top-0 bg-[#30322b]`}><span className={`${letters} top-0`}>{value}</span></div>
      <div className={`${face} bottom-0`}><span className={`${letters} bottom-0`}>{flipping ? previous : value}</span></div>
      {flipping && (
        <>
          <motion.div initial={{ rotateX: 0 }} animate={{ rotateX: -90 }}
            transition={{ duration: flipDuration, delay, ease: 'easeIn' }} className={`${face} top-0 z-10 origin-bottom bg-[#30322b]`}>
            <span className={`${letters} top-0`}>{previous}</span>
          </motion.div>
          <motion.div initial={{ rotateX: 90 }} animate={{ rotateX: 0 }}
            transition={{ duration: flipDuration, delay: delay + flipDuration, ease: 'easeOut' }} className={`${face} bottom-0 z-10 origin-top`}>
            <span className={`${letters} bottom-0`}>{value}</span>
          </motion.div>
        </>
      )}
      <span className="pointer-events-none absolute inset-x-0 top-1/2 z-20 border-t border-[#0a0c0a]" />
      <span className="pointer-events-none absolute top-1/2 left-px z-20 h-1 w-px -translate-y-1/2 bg-[#a2a084]" />
      <span className="pointer-events-none absolute top-1/2 right-px z-20 h-1 w-px -translate-y-1/2 bg-[#a2a084]" />
    </div>
  )
}

export function SplitFlapDepartures() {
  const { t } = useTranslation('demoControls', { keyPrefix: 'departureBoard' })
  const reduced = useReducedMotion()
  const [board, setBoard] = useState({ current: 0, previous: 0, turning: false })
  const { current, previous, turning } = board

  useEffect(() => {
    if (!turning) return
    const timer = window.setTimeout(() => setBoard((state) => ({ ...state, turning: false })), 690)
    return () => window.clearTimeout(timer)
  }, [turning])

  return (
    <div className="@container h-full w-full overflow-y-auto bg-[#c0b89f] px-3 pt-3 pb-[var(--solo-footer-clearance,0.75rem)] text-[#f5efdb] [background-image:repeating-linear-gradient(0deg,transparent_0_17px,#5a54441f_17px_18px)]">
      <div className="mx-auto flex min-h-full max-w-4xl items-center">
        <section className="w-full rounded-md border-3 border-[#302e28] bg-[#171b18] p-2 shadow-[0_5px_0_#605749,inset_0_1px_0_#7a7462] @sm:p-3">
          <header className="flex flex-wrap items-center justify-between gap-1.5 border-b border-[#615c4a] pb-2">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-xs bg-[#f2c46a] text-[#25231d]"><PlaneTakeoff size={17} aria-hidden="true" /></span>
              <div><p className="font-mono text-[8px] font-bold tracking-[.16em] text-[#f4d299]">SKYLINE AIRPORT / T1</p><h2 className="text-sm leading-tight font-black">{t('title')}</h2></div>
            </div>
            <button type="button" aria-disabled={turning} onClick={() => setBoard((state) => state.turning ? state : {
              previous: state.current, current: (state.current + 1) % boards.length, turning: !reduced,
            })} className="inline-flex items-center gap-1 rounded-xs border border-[#ada588] bg-[#32372c] px-2 py-1 text-[10px] font-bold hover:bg-[#4c4c37] aria-disabled:opacity-65">
              {t('next')}<ArrowRight size={13} aria-hidden="true" />
            </button>
          </header>
          <table className="mt-1 w-full table-fixed border-separate border-spacing-x-0.5 border-spacing-y-1 font-mono">
            <caption className="sr-only">{t('title')}</caption>
            <colgroup><col className="w-[21%]" /><col className="w-[23%]" /><col className="w-[40%]" /><col className="w-[16%]" /></colgroup>
            <thead><tr>{columns.map((label) => <th key={label} scope="col" className="pb-0.5 text-center text-[clamp(.5rem,2cqw,.7rem)] font-bold text-[#e5c791]">{t(label)}</th>)}</tr></thead>
            <tbody className="text-[clamp(.55rem,2.3cqw,1.05rem)] font-bold">
              {boards[current].map((flight, row) => (
                <tr key={row}>
                  {flight.map((data, column) => {
                    const before = boards[previous][row][column]
                    const value = column === 2 ? t(data) : data
                    return (
                      <td key={column} className={column === 3 ? 'text-[#f1c876]' : undefined}>
                        <span className="sr-only">{value}</span>
                        <SplitFlap key={current} value={value} previous={column === 2 ? t(before) : before}
                          delay={row * .07 + column * .042} turning={turning && !reduced} />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-1 flex items-center justify-between gap-1 border-t border-[#615c4a] pt-1 font-mono text-[8px] font-semibold tracking-widest text-[#dbcba5]">
            <span>MECHANICAL DISPLAY / T1</span>
            <span role="status">{t('board', { index: current + 1, total: boards.length })}</span>
          </div>
        </section>
      </div>
    </div>
  )
}
