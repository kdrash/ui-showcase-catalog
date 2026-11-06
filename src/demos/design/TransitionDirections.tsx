import { useId, useState } from 'react'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react'
import { ArrowLeft, ArrowUpRight, Play } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const directions = ['page', 'image', 'curtain'] as const
const transitionDuration = .68
const pageEase = [.25, .72, .35, 1] as const

function exitPage(rotation: number) {
  return (effect: number | null) => ({
    rotateY: effect === 0 ? rotation : 0,
    opacity: 0,
    transition: { duration: effect === null ? 0 : transitionDuration, ease: pageEase },
  })
}

const pageExit = { leaveIndex: exitPage(78), leaveDetail: exitPage(-78) }

function ArchiveImage({ className, label }: { className: string; label: string }) {
  return (
    <div className={`relative isolate overflow-hidden bg-[#182a29] ${className}`} role="img" aria-label={label}>
      <div className="absolute top-[12%] right-[14%] aspect-square w-[32%] rounded-full bg-[#f2986d]" />
      <div className="absolute inset-0 bg-[#598077] [clip-path:polygon(0_69%,28%_38%,52%_57%,84%_32%,100%_54%,100%_100%,0_100%)]" />
      <div className="absolute right-0 bottom-0 h-[64%] w-[84%] bg-[#d9d3ac] [clip-path:polygon(0_100%,0_82%,17%_82%,17%_65%,33%_65%,33%_48%,50%_48%,50%_31%,67%_31%,67%_15%,84%_15%,84%_0,100%_0,100%_100%)]" />
      <div className="absolute inset-0 opacity-30 [background:repeating-linear-gradient(0deg,transparent_0_3px,#142321_3px_4px)]" />
    </div>
  )
}

export function TransitionDirections() {
  const { t } = useTranslation('demoControls', { keyPrefix: 'transitions' })
  const [direction, setDirection] = useState(0)
  const [detail, setDetail] = useState(false)
  const [previewMotion, setPreviewMotion] = useState(false)
  const [curtain, setCurtain] = useState<'idle' | 'closing' | 'opening'>('idle')
  const reduced = useReducedMotion()
  const groupId = useId()
  const photo = direction === 1
  const page = direction === 0
  const animate = !reduced || previewMotion
  const duration = animate && direction !== 2 ? transitionDuration : 0
  const imageId = photo ? 'archive-image' : undefined

  function changePage(preview = false) {
    if (curtain !== 'idle') return
    setPreviewMotion(preview)
    if ((!reduced || preview) && direction === 2) setCurtain('closing')
    else setDetail((visible) => !visible)
  }

  return (
    <div className="@container flex h-full w-full flex-col overflow-hidden bg-[#1b211f]">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 p-2">
        <div role="group" aria-label={t('group')} className="flex flex-wrap gap-1">
          {directions.map((label, index) => (
            <button key={label} type="button" aria-pressed={direction === index} disabled={curtain !== 'idle'}
              onClick={() => setDirection(index)}
              className="rounded-full px-3 py-1.5 text-[11px] text-stone-300 hover:bg-white/10 aria-pressed:bg-white/15 aria-pressed:text-white">{t(label)}</button>
          ))}
        </div>
        <button type="button" onClick={() => changePage(true)} disabled={curtain !== 'idle'}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#dce6c9] px-3 py-1.5 text-[11px] font-semibold text-[#1b211f] hover:bg-[#f0f5df] disabled:opacity-60">
          <Play size={12} aria-hidden="true" /> {t('play')}
        </button>
      </div>
      <LayoutGroup id={groupId}>
        <div className="relative isolate min-h-0 flex-1 overflow-hidden bg-[#cbd3ba] [perspective:1100px]">
          <AnimatePresence initial={false} mode="popLayout" custom={duration > 0 ? direction : null}>
            {detail ? (
              <motion.article key="detail"
                className="absolute inset-0 origin-left overflow-y-auto bg-[#e8e6cb] px-[7%] py-5 text-[#182a29]"
                initial={animate && page ? { rotateY: -78, opacity: .55 } : { opacity: photo ? .92 : 1 }}
                animate={{ rotateY: 0, opacity: 1 }} exit="leaveDetail" variants={pageExit}
                transition={{ duration, ease: pageEase }}>
                <button type="button" onClick={() => changePage()} disabled={curtain !== 'idle'} className="mb-4 inline-flex items-center gap-2 border-b border-current pb-1 font-mono text-[10px] tracking-wider"><ArrowLeft size={13} /> INDEX</button>
                <motion.div layoutId={imageId} transition={{ duration }}>
                  <ArchiveImage className="h-[clamp(7rem,28cqw,24rem)] w-full" label={t('artwork')} />
                </motion.div>
                <div className="mt-4 grid gap-2 @lg:grid-cols-2">
                  <h2 className="font-serif text-[clamp(1.65rem,5cqw,3.7rem)] leading-none">The Last Step</h2>
                  <p className="max-w-60 text-xs leading-5">{t('caption')} Studio Archive / Plate 01</p>
                </div>
              </motion.article>
            ) : (
              <motion.article key="index"
                className="absolute inset-0 origin-left overflow-y-auto bg-[#e8e6cb] px-[7%] py-5 text-[#182a29]"
                initial={animate && page ? { rotateY: 68, opacity: .55 } : { opacity: 1 }}
                animate={{ rotateY: 0, opacity: 1 }} exit="leaveIndex" variants={pageExit}
                transition={{ duration, ease: pageEase }}>
                <div className="flex justify-between border-b border-[#182a29]/45 pb-2 font-mono text-[9px] tracking-widest"><span>STUDIO ARCHIVE</span><span>VOL. 01 / 03</span></div>
                <h2 className="my-4 font-serif text-[clamp(1.85rem,6cqw,4.25rem)] leading-none tracking-tight">Selected Works</h2>
                <button type="button" onClick={() => changePage()} disabled={curtain !== 'idle'} className="block w-full max-w-95 text-left focus-visible:outline-2 focus-visible:outline-offset-4">
                  <motion.div layoutId={imageId} transition={{ duration }}>
                    <ArchiveImage className="h-[clamp(5rem,17cqw,11rem)] w-full" label={t('artwork')} />
                  </motion.div>
                  <span className="mt-2 flex items-center justify-between border-b border-[#182a29]/45 pb-2 font-serif text-sm">01 / The Last Step <ArrowUpRight size={16} /></span>
                </button>
              </motion.article>
            )}
          </AnimatePresence>
          {curtain !== 'idle' && (
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 flex">
              {[-1, 1].map((side) => (
                <motion.div key={side} className="h-full w-1/2 bg-[#761e35] [background-image:repeating-linear-gradient(90deg,#451025_0%,#8d2845_6%,#67162f_12%)]"
                  initial={{ x: `${side * 102}%` }} animate={{ x: curtain === 'closing' ? '0%' : `${side * 102}%` }}
                  transition={{ duration: curtain === 'closing' ? .27 : .46, ease: 'easeInOut' }}
                  onAnimationComplete={side === -1 ? () => {
                    if (curtain === 'closing') {
                      setDetail((visible) => !visible)
                      setCurtain('opening')
                    } else setCurtain('idle')
                  } : undefined} />
              ))}
            </div>
          )}
        </div>
      </LayoutGroup>
    </div>
  )
}
