import { useRef, useState } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const scores = [
  { name: 'simultaneous', headline: 0, image: 0, caption: 0 },
  { name: 'headlineFirst', headline: 0, image: .22, caption: .43 },
  { name: 'imageFirst', headline: .27, image: 0, caption: .51 },
] as const
const curve = [.18, .84, .3, 1] as const

export function EntranceChoreography() {
  const { t } = useTranslation('demoControls', { keyPrefix: 'entrance' })
  const [scoreIndex, setScoreIndex] = useState(0)
  const [{ take, previewMotion }, setPlayback] = useState({ take: 0, previewMotion: false })
  const preview = useRef<HTMLDivElement>(null)
  const visible = useInView(preview, { amount: .25, once: true })
  const reduceMotion = useReducedMotion()
  const score = scores[scoreIndex]
  const play = !reduceMotion || previewMotion
  const pending = play && take === 0 && !visible
  const tracks = [
    { name: 'headline', start: score.headline, color: '#fac3a5' },
    { name: 'image', start: score.image, color: '#d2c0ff' },
    { name: 'caption', start: score.caption, color: '#cce5a4' },
  ]

  return (
    <div ref={preview} className="@container flex h-full w-full flex-col overflow-hidden bg-[#25213e] text-[#fbf1e7]">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/20 px-[5%] py-2.5">
        <span className="font-mono text-[9px] tracking-[.19em]">MOTION STUDIES / ENTRANCE</span>
        <div role="group" aria-label={t('group')} className="flex flex-wrap gap-1">
          {scores.map(({ name }, index) => (
            <button key={name} type="button" aria-pressed={scoreIndex === index} onClick={() => {
              setScoreIndex(index)
              setPlayback((current) => ({ take: current.take + 1, previewMotion: false }))
            }}
              className="rounded-sm border border-white/25 px-2 py-1 text-[10px] aria-pressed:bg-[#fac3a5] aria-pressed:text-[#25213e]">{t(name)}</button>
          ))}
        </div>
      </header>
      <div key={take} className="relative isolate min-h-0 flex-1 overflow-hidden bg-[#3a3258]">
        <motion.div aria-hidden="true" className="absolute inset-0 -z-10 @lg:left-[32%]"
          initial={play ? { clipPath: 'inset(0 100% 0 0)' } : false}
          animate={{ clipPath: pending ? 'inset(0 100% 0 0)' : 'inset(0 0% 0 0)' }}
          transition={{ duration: play ? .62 : 0, delay: play ? score.image : 0, ease: curve }}>
          <svg viewBox="0 0 680 340" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
            <rect width="680" height="340" fill="#a299cb" />
            <circle cx="465" cy="139" r="81" fill="#f7ad87" />
            <path d="M0 285 165 197 272 228 411 115 563 209 680 176v164H0Z" fill="#6a619c" />
            <path d="M0 308 142 264 293 283 416 226 574 256 680 217v123H0Z" fill="#4c4379" />
            <path d="m310 340 155-117-54 117Z" fill="#d8a8a7" />
            <path d="M0 305h680m-680 15h680m-680 12h680" stroke="#292040" strokeWidth="1" opacity=".28" />
          </svg>
        </motion.div>
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-r from-[#25213e]/90 via-[#25213e]/40 to-transparent" />
        <div className="flex h-full flex-col justify-center px-[6%] py-4">
          <motion.div initial={play ? { y: 24, opacity: 0 } : false} animate={pending ? { y: 24, opacity: 0 } : { y: 0, opacity: 1 }}
            transition={{ duration: play ? .46 : 0, delay: play ? score.headline : 0, ease: curve }}>
            <p className="mb-2 font-mono text-[9px] font-bold tracking-[.19em] text-[#fac3a5]">FIELD RECORDINGS / SIDE A</p>
            <h2 className="font-serif text-[clamp(2.5rem,9cqw,7rem)] leading-[.84] tracking-[-.075em]">Out of<br /><i>Silence.</i></h2>
          </motion.div>
          <motion.p className="mt-4 text-[11px] text-[#fbf1e7]/90"
            initial={play ? { y: 7, opacity: 0 } : false} animate={pending ? { y: 7, opacity: 0 } : { y: 0, opacity: 1 }}
            transition={{ duration: play ? .37 : 0, delay: play ? score.caption : 0, ease: curve }}>{t('tagline')}</motion.p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 border-t border-white/20 px-[5%] pt-2.5 pb-[var(--solo-footer-clearance,0.625rem)]">
        <button type="button" onClick={() => setPlayback((current) => ({ take: current.take + 1, previewMotion: true }))}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-sm border border-white/25 px-2 py-1.5 text-[10px] hover:bg-white/10">
          <RotateCcw size={12} aria-hidden="true" /> {t(reduceMotion ? 'preview' : 'replay')}
        </button>
        <ul aria-label={t('timings')} className="grid min-w-0 flex-1 gap-0.5">
          {tracks.map(({ name, start, color }) => (
            <li key={name} className="grid grid-cols-[2.4rem_1fr_2.8rem] items-center gap-1 font-mono text-[8px]">
              <span>{t(name)}</span>
              <span className="relative h-1.5 bg-white/15"><span className="absolute h-full w-[33%]" style={{ left: `${start * 100}%`, backgroundColor: color }} /></span>
              <span className="text-right tabular-nums">{start.toFixed(2)}s</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
