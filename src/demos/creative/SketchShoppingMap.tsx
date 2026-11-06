import { useState } from 'react'
import rough from 'roughjs'
import { BookOpen, Coffee, Flower2 } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'

const stops = [
  { id: 'cafe', x: 168, y: 83, fill: '#e8a78b', icon: Coffee, route: 'M75 241 Q120 238 144 206 L148 147 Q149 116 168 109' },
  { id: 'books', x: 366, y: 69, fill: '#a7b8e9', icon: BookOpen, route: 'M75 241 Q120 238 144 206 L148 147 Q210 128 291 133 Q355 137 364 97' },
  { id: 'flowers', x: 402, y: 217, fill: '#a9d29b', icon: Flower2, route: 'M75 241 Q119 238 163 241 Q230 248 289 232 Q324 222 367 223' },
] as const

const pen = rough.generator()
const streets = [
  'M30 247 Q114 230 164 241 Q237 254 290 232 Q383 203 488 230',
  'M148 240 Q137 198 149 152 Q164 111 155 32',
  'M145 151 Q211 125 289 133 Q352 141 400 105 Q445 76 495 85',
  'M365 224 Q350 166 367 118 Q379 78 367 30',
]
const outlines = [
  ...streets.flatMap((d, index) => pen.toPaths(pen.path(d, { seed: 41 + index, stroke: '#ac8568', strokeWidth: 1.5, roughness: 1.2 }))),
  ...stops.flatMap(({ x, y, fill }, index) => pen.toPaths(pen.rectangle(x - 27, y - 23, 54, 48,
    { seed: 20 + index, stroke: '#55463c', fill, fillStyle: 'hachure', hachureGap: 4, roughness: 1.6 }))),
  ...[[80, 81], [92, 112], [264, 64], [235, 191], [464, 166], [470, 193]].flatMap(([x, y], index) =>
    pen.toPaths(pen.ellipse(x, y, 26, 22, { seed: 81 + index, stroke: '#608a65', fill: '#b9d49c', fillStyle: 'zigzag', hachureGap: 4, roughness: 1.7 }))),
]

export function SketchShoppingMap() {
  const { t } = useTranslation('demoControls', { keyPrefix: 'sketchMap' })
  const reduced = useReducedMotion()
  const [selected, setSelected] = useState<number | null>(null)
  const stop = selected === null ? undefined : stops[selected]

  return (
    <div className="@container h-full w-full overflow-y-auto bg-[#f2ead6] px-3 pt-3 pb-[var(--solo-footer-clearance,0.75rem)] text-[#44392f] [background-image:linear-gradient(#9282ab1c_1px,transparent_1px),linear-gradient(90deg,#9282ab1c_1px,transparent_1px)] [background-size:15px_15px]">
      <div className="mx-auto flex min-h-full max-w-5xl flex-col justify-center gap-2">
        <header className="flex flex-wrap items-end justify-between gap-2 border-b-2 border-dashed border-[#a7886b] pb-2">
          <div><p className="font-mono text-[9px] font-bold tracking-[.2em] text-[#9e493d]">WALKING NOTES / NO. 04</p><h2 className="font-serif text-[clamp(1.3rem,4.3cqw,2.65rem)] leading-tight font-black italic">{t('title')}</h2></div>
          <span className="rotate-3 bg-[#f6d46a] px-2 py-1 text-[10px] font-bold shadow-[1px_2px_0_#a9844377]">{t('hint')}</span>
        </header>
        <div className="grid items-center gap-3 py-2 @lg:grid-cols-[minmax(0,1fr)_minmax(8rem,.36fr)]">
          <div className="relative mx-auto aspect-[520/285] w-full max-w-170">
            <svg aria-hidden="true" viewBox="0 0 520 285" className="absolute inset-0 h-full w-full">
              {streets.map((d) => <path key={d} d={d} fill="none" stroke="#f4d492" strokeWidth="23" strokeLinecap="round" opacity=".65" />)}
              {outlines.map(({ d, fill, stroke, strokeWidth }, index) => <path key={index} d={d} fill={fill ?? 'none'} stroke={stroke} strokeWidth={strokeWidth} />)}
              <path d="M30 27h24m-12-12v24m-7-15 7-9 6 8M493 126q7-12 14 0-7 8-14 0Z" fill="none" stroke="#835e4c" strokeWidth="2" strokeLinecap="round" />
              <text x="36" y="56" fontFamily="monospace" fontSize="12" fill="#66533e">N</text>
              {stop && <motion.path key={stop.id} d={stop.route} fill="none" stroke="#bf4d46" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
                initial={reduced ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: .8, ease: 'easeInOut' }} />}
              <circle cx="75" cy="241" r="7" fill="#fffbeb" stroke="#b94f42" strokeWidth="3" />
              <text x="75" y="266" textAnchor="middle" fontFamily="monospace" fontSize="11" fontWeight="bold" fill="#9e493d">{t('start')}</text>
            </svg>
            {stops.map(({ id, x, y, icon: Icon }, index) => (
              <button key={id} type="button" aria-label={t(`${id}.name`)} aria-pressed={selected === index}
                onClick={() => setSelected(index)}
                className="absolute grid size-[clamp(1.55rem,6cqw,2.4rem)] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[42%_49%_43%_48%] border-2 border-[#665044] bg-[#fffbef]/95 shadow-[1px_2px_0_#70554455] hover:-rotate-6 aria-pressed:border-[#bf4d46] aria-pressed:text-[#9d3b34]"
                style={{ left: `${x / 520 * 100}%`, top: `${y / 285 * 100}%` }}><Icon size={15} aria-hidden="true" /></button>
            ))}
          </div>
          <aside aria-live="polite" className="relative min-h-24 rotate-1 border border-[#c7a45b]/65 bg-[#fff1ac] px-3 py-2 shadow-[2px_3px_0_#b68e5266]">
            <span aria-hidden="true" className="absolute -top-1.5 left-1/2 h-3 w-11 -translate-x-1/2 -rotate-6 bg-[#eca98e]/75" />
            {stop ? (
              <>
                <p className="font-mono text-[9px] font-bold tracking-[.13em] text-[#9e493d]">NOTE / 0{(selected ?? 0) + 1}</p>
                <h3 className="font-serif text-base leading-tight font-black">{t(`${stop.id}.name`)}</h3>
                <p className="mt-1 text-[11px] leading-snug">{t(`${stop.id}.note`)}</p>
              </>
            ) : <p className="py-2 text-xs font-semibold">{t('intro')}</p>}
          </aside>
        </div>
      </div>
    </div>
  )
}
