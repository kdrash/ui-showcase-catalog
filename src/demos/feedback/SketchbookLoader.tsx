import { useLayoutEffect, useRef, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import rough from 'roughjs'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useLoadingPreview } from './useLoadingPreview'

const pen = rough.generator({ options: { disableMultiStroke: true, disableMultiStrokeFill: true, fixedDecimalPlaceDigits: 2 } })
const [hatching, outline] = pen.toPaths(pen.path('M162 128Q160 63 221 21Q255 77 210 136L189 152Z', {
  seed: 16, stroke: '#514567', fill: '#b9a3d9', fillStyle: 'hachure', hachureGap: 5, fillWeight: 1, roughness: 1.55,
}))
const [windowFill, windowLine] = pen.toPaths(pen.ellipse(203, 86, 33, 28, {
  seed: 27, stroke: '#584a70', fill: '#f0af97', fillStyle: 'solid', roughness: 1.75,
}))
const fins = pen.toPaths(pen.path('M163 113 134 141l30 5m43-14 7 32 18-36', { seed: 22, stroke: '#514567', strokeWidth: 2.2, roughness: 1.9 }))
const trail = pen.toPaths(pen.path('M169 152Q124 161 97 197m82-36q-39 16-57 45m-3-37q-33-4-60 7', { seed: 36, stroke: '#bd644e', strokeWidth: 2.1, roughness: 1.8 }))
const stars = pen.toPaths(pen.path('M79 85v27m-13-14h26M280 34v32m-15-17h31M285 125v22m-10-12h21', { seed: 47, stroke: '#bc8d43', strokeWidth: 2.1, roughness: 1.7 }))
const phases = ['outline', 'fill', 'sign'] as const
const cues = [0, .39, .75, .96]
const strokes = [[outline, ...fins, windowLine], [hatching], [...trail, ...stars]].flatMap((paths, phase) =>
  // Rough.js packs separate pen strokes into a single path. Split at each pen lift.
  paths.flatMap(({ d, stroke, strokeWidth }) => (d.match(/M[^M]+/g) ?? []).map((segment) => ({
    d: segment, stroke, strokeWidth, phase,
  }))),
)

function measureStrokes(svg: SVGSVGElement) {
  const paths = Array.from(svg.querySelectorAll<SVGPathElement>('path[data-ink]'))
    .sort((a, b) => Number(a.dataset.ink) - Number(b.dataset.ink))
  const lengths = paths.map((path) => path.getTotalLength())
  const starts = paths.map((path) => path.getPointAtLength(0))
  const ends = paths.map((path, index) => path.getPointAtLength(lengths[index]))
  const liftLengths = starts.map((point, index) => {
    const previous = ends[index - 1] ?? point
    return Math.min(32, Math.hypot(point.x - previous.x, point.y - previous.y) * .32)
  })
  const weights = phases.map((_, phase) => strokes.reduce((sum, stroke, index) =>
    stroke.phase === phase ? sum + lengths[index] + liftLengths[index] : sum, 0))
  const clocks = cues.slice(0, -1)

  return paths.map((path, index) => {
    const { phase } = strokes[index]
    const scale = (cues[phase + 1] - cues[phase]) / weights[phase]
    const liftStart = clocks[phase]
    const inkStart = liftStart + liftLengths[index] * scale
    const end = inkStart + lengths[index] * scale
    clocks[phase] = end
    return { path, length: lengths[index], from: ends[index - 1] ?? starts[index], to: starts[index], liftStart, inkStart, end }
  })
}

const clampUnit = (value: number) => Math.max(0, Math.min(1, value))

export function SketchbookLoader() {
  const { t } = useTranslation('demoControls', { keyPrefix: 'loading' })
  const reduced = useReducedMotion()
  const drawing = useRef<SVGSVGElement>(null)
  const [timeline, setTimeline] = useState<ReturnType<typeof measureStrokes>>([])
  const { ref, id, progress, done, running, restart } = useLoadingPreview(5900, { smooth: !reduced })
  const elapsed = progress / 100
  const phase = elapsed < cues[1] ? 0 : elapsed < cues[2] ? 1 : 2
  const time = reduced && !done ? cues[phase] : elapsed

  useLayoutEffect(() => {
    if (drawing.current) setTimeline(measureStrokes(drawing.current))
  }, [])

  const active = running && !reduced && timeline.find(({ liftStart, end }) => time >= liftStart && time < end)
  let pencil: { x: number; y: number; lift: number } | undefined
  if (active) {
    if (time < active.inkStart) {
      const portion = (time - active.liftStart) / (active.inkStart - active.liftStart)
      const lift = Math.sin(Math.PI * portion)
      pencil = {
        x: active.from.x + (active.to.x - active.from.x) * portion,
        y: active.from.y + (active.to.y - active.from.y) * portion - 7 * lift,
        lift,
      }
    } else {
      const amount = (time - active.inkStart) / (active.end - active.inkStart)
      const { x, y } = active.path.getPointAtLength(amount * active.length)
      pencil = { x, y, lift: 0 }
    }
  }

  const ink = (layer: number) => strokes.map(({ d, stroke, strokeWidth, phase }, index) => {
    if (phase !== layer) return null
    const timing = timeline[index]
    const amount = timing ? clampUnit((time - timing.inkStart) / (timing.end - timing.inkStart)) : 0
    return <path key={index} data-ink={index} d={d} fill="none" stroke={stroke} strokeWidth={strokeWidth}
      strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - amount} visibility={amount === 0 ? 'hidden' : 'visible'} />
  })

  return (
    <div ref={ref} className="@container h-full w-full overflow-y-auto bg-[#f3ecd9] px-3 pt-3 pb-[var(--solo-footer-clearance,0.75rem)] text-[#4b3d43] [background-image:repeating-linear-gradient(transparent_0_17px,#91a9c137_17px_18px)]">
      <div className="mx-auto flex min-h-full max-w-4xl flex-col justify-center gap-3">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-dashed border-[#8c6862]/55 pb-2">
          <p className="font-mono text-[9px] font-bold tracking-[.18em]">LITTLE PLANET / FIELD SKETCH 04</p>
          <button type="button" onClick={restart} className="inline-flex items-center gap-1.5 rounded-[45%_14%_36%_12%] border-2 border-[#796254] bg-[#fff4bd] px-2 py-1 text-[10px] font-bold hover:bg-[#fae69b]">
            <RotateCcw size={12} aria-hidden="true" /> {t('replay')}
          </button>
        </header>
        <div className="grid items-center gap-2 @min-[28rem]:grid-cols-[1.45fr_1fr]">
          <div className="relative mx-auto aspect-[340/218] w-full max-w-66 @min-[28rem]:max-w-94">
            <svg ref={drawing} viewBox="0 0 340 218" aria-hidden="true" className="absolute inset-0 h-full w-full">
              <path d="M32 182C102 154 213 173 307 184M112 29l46 11m87 150 50-6" fill="none" stroke="#9a7b7e" strokeWidth="1" strokeDasharray="3 3" opacity=".65" />
              <g>{ink(1)}</g>
              <path d={windowFill.d} fill={windowFill.fill} opacity={clampUnit((time - cues[1]) / (cues[2] - cues[1]))} />
              <g>{ink(0)}</g>
              <g>{ink(2)}</g>
              {pencil && (
                <g data-pencil="" transform={`translate(${pencil.x} ${pencil.y})`} opacity={1 - pencil.lift * .45}>
                  <path d="M0 0 2-7 16-21 21-16 7-2Z" fill="#e5b778" stroke="#75473f" strokeWidth="1.3" strokeLinejoin="round" />
                  <path d="m14-19 2-2 5 5-2 2Z" fill="#ce766d" stroke="#75473f" strokeWidth="1.1" />
                  <path d="m0 0 1-4 3 3Z" fill="#543e50" />
                </g>
              )}
            </svg>
            {done && (
              <motion.span key={id} initial={reduced ? false : { scale: 1.6, opacity: .15 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 410, damping: 24 }}
                className="absolute right-[5%] bottom-[12%] rotate-[-12deg] rounded-[30%_13%_27%_18%] border-3 border-[#a24d40] px-2 py-0.5 font-mono text-xs font-black tracking-wider text-[#a24d40]">DONE!</motion.span>
            )}
          </div>
          <div className="relative -rotate-1 border border-[#d4b77d] bg-[#fff1b9] p-2.5 shadow-[2px_3px_0_#a6865855] @sm:p-3">
            <span aria-hidden="true" className="absolute -top-1.5 left-[36%] h-3 w-13 rotate-3 bg-[#eab89c]/80" />
            <h2 role="status" className="font-serif text-[clamp(1.15rem,4cqw,2.2rem)] leading-tight font-bold text-[#573b3d]">{t(done ? 'sketch.done' : `sketch.${phases[phase]}`)}</h2>
            <div role="progressbar" aria-label={t('sketch.progress')} aria-valuenow={Math.floor(progress)} className="mt-2 h-2 rounded-[20%_15%_27%_20%] border border-[#a07366] p-px">
              <div className="h-full rounded-full bg-[#ba6550]" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-[10px] leading-snug">{t(done ? 'sketch.completeNote' : 'sketch.note')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
