import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'

const marks = [
  { name: 'seed', word: 'SEED', ink: '#153436', paper: '#c8dfb8', radius: [84, 82, 77, 76], stretch: .58 },
  { name: 'bloom', word: 'BLOOM', ink: '#521d35', paper: '#ffb7bd', radius: [95, 51, 95, 51], stretch: 1 },
  { name: 'nova', word: 'NOVA', ink: '#231751', paper: '#e0d0ff', radius: [110, 40, 54, 40], stretch: 1 },
] as const

function outline(mark: typeof marks[number]) {
  return Array.from({ length: 16 }, (_, i) => {
    const angle = (i / 8 - .5) * Math.PI
    const radius = mark.radius[i % mark.radius.length]
    return `${(130 + Math.cos(angle) * radius * mark.stretch).toFixed(2)},${(130 + Math.sin(angle) * radius).toFixed(2)}`
  }).join(' ')
}

const outlines = marks.map(outline)
const softEase = [.36, .08, .28, 1] as const

export function MorphingIdentity() {
  const { t } = useTranslation('demoControls', { keyPrefix: 'morph' })
  const [{ selected, previewMotion }, setSelection] = useState({ selected: 0, previewMotion: false })
  const reduceMotion = useReducedMotion()
  const mark = marks[selected]

  return (
    <div className="@container relative isolate flex h-full w-full flex-col overflow-hidden px-[6%] pt-4 pb-[var(--solo-footer-clearance,1rem)] transition-colors duration-500 motion-reduce:transition-none"
      style={{ color: mark.ink, backgroundColor: mark.paper }}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-current/45 pb-2 font-mono text-[9px] font-bold tracking-[.15em]">
        <span>FIELD / VISUAL IDENTITY</span><span>ONE MARK · THREE FORMS</span>
      </header>
      <div className="relative grid min-h-0 flex-1 grid-rows-[1fr_auto] items-center gap-1 py-2 @lg:grid-cols-[1.1fr_1fr] @lg:grid-rows-1 @lg:gap-6">
        <svg role="img" aria-label={t('image', { shape: t(mark.name) })} viewBox="0 0 260 260" className="mx-auto h-full min-h-0 w-full max-w-110">
          <circle cx="130" cy="130" r="112" fill="none" stroke="currentColor" strokeWidth=".75" strokeDasharray="2 3" opacity=".48" />
          <path d="M6 130h248M130 6v248" stroke="currentColor" strokeWidth=".65" opacity=".4" />
          <motion.polygon initial={false} animate={{ points: outlines[selected] }} fill="currentColor"
            transition={{ duration: !reduceMotion || previewMotion ? .85 : 0, ease: softEase }} />
          <circle cx="130" cy="130" r="5" fill={mark.paper} />
        </svg>
        <div className="text-center @lg:text-left">
          <p className="font-mono text-[9px] tracking-[.19em]">FORM 0{selected + 1} / {t(mark.name)}</p>
          <h2 className="text-[clamp(1.7rem,7cqw,5.2rem)] leading-none font-black tracking-[-.085em]">{mark.word}</h2>
        </div>
      </div>
      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-current/45 pt-2">
        <div role="group" aria-label={t('group')} className="flex gap-1">
          {marks.map(({ name }, index) => (
            <button key={name} type="button" aria-pressed={selected === index} onClick={() => setSelection({ selected: index, previewMotion: false })}
              className="rounded-full border border-current/45 px-2.5 py-1 text-[10px] font-bold aria-pressed:bg-black/15">{t(name)}</button>
          ))}
        </div>
        {reduceMotion ? (
          <button type="button" onClick={() => setSelection({ selected: (selected + 1) % marks.length, previewMotion: true })}
            className="rounded-full border border-current/45 px-2.5 py-1 text-[10px] font-bold hover:bg-black/10">{t('preview')}</button>
        ) : <span className="font-mono text-[9px] tracking-wider">16 VERTICES / SVG</span>}
      </footer>
    </div>
  )
}
