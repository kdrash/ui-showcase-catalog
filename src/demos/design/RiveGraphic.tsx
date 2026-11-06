import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Fit, Layout, RuntimeLoader, useRive, useStateMachineInput } from '@rive-app/react-canvas'
import riveWasm from '@rive-app/canvas/rive.wasm?url'
import riveFallbackWasm from '@rive-app/canvas/rive_fallback.wasm?url'
import scene from './assets/rive-avatars.riv?url'
import license from './assets/rive-LICENSE.txt?url&no-inline'

RuntimeLoader.setWasmUrl(riveWasm)
RuntimeLoader.setWasmFallbackUrl(riveFallbackWasm)

const layout = new Layout({ fit: Fit.Contain })
const stateMachine = 'avatar'
const moods = [
  { label: 'calm', heading: 'Still', paper: '#e0e9dd', ink: '#244a35', mouth: 'M123 156h34' },
  { label: 'happy', heading: 'Bright', paper: '#f6e5b9', ink: '#63431c', mouth: 'M121 153q19 24 38 0' },
  { label: 'sad', heading: 'Blue', paper: '#dbe5f0', ink: '#263c5d', mouth: 'M122 165q18-21 36 0' },
] as const

export function RiveGraphic() {
  const { t } = useTranslation('demoControls', { keyPrefix: 'expression' })
  const [mood, setMood] = useState(0)
  const [open, setOpen] = useState(false)
  const [failed, setFailed] = useState(false)
  const { rive, RiveComponent } = useRive({
    src: scene,
    artboard: 'Avatar 1',
    stateMachine,
    autoplay: true,
    layout,
    shouldDisableRiveListeners: true,
    onLoadError: () => setFailed(true),
  })
  const happy = useStateMachineInput(rive, stateMachine, 'isHappy')
  const sad = useStateMachineInput(rive, stateMachine, 'isSad')
  const current = moods[mood]
  const live = !failed && happy !== null && sad !== null

  useEffect(() => {
    if (happy && sad) {
      happy.value = mood === 1
      sad.value = mood === 2
    }
  }, [happy, mood, sad])

  return (
    <div className="@container relative isolate flex h-full w-full flex-col overflow-hidden px-[6%] pt-4 pb-[var(--solo-footer-clearance,1rem)] transition-colors motion-reduce:transition-none"
      style={{ backgroundColor: current.paper, color: current.ink }}>
      <div className="absolute inset-x-0 top-[12%] bottom-[17%] -z-10 flex justify-center @lg:left-[28%]" aria-hidden="true">
        <div className="absolute top-1/2 aspect-square h-[80%] max-w-[85%] -translate-y-1/2 rounded-full border border-current/25 [background:radial-gradient(ellipse_at_center,transparent_50%,currentColor_350%)]" />
        {!live && (
          <svg viewBox="0 0 280 280" className="absolute inset-0 h-full w-full opacity-70">
            <circle cx="140" cy="130" r="60" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="120" cy="124" r="4" fill="currentColor" /><circle cx="160" cy="124" r="4" fill="currentColor" />
            <path d={current.mouth} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <path d="M69 224c24-43 118-43 142 0" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        )}
        <RiveComponent className={`h-full w-full ${live ? 'opacity-100' : 'opacity-0'}`} />
      </div>
      <header className="relative flex items-center justify-between border-b border-current/50 pb-2">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
          className="group flex items-center gap-2 font-mono text-[10px] font-bold tracking-[.16em]">
          <span aria-hidden="true" className="grid size-6 place-items-center rounded-full border border-current text-base leading-none transition-transform group-aria-expanded:rotate-45 motion-reduce:transition-none">+</span>
          EXPRESSION INDEX
        </button>
        <span className="font-mono text-[9px] tracking-[.17em]">RIVE / 01–03</span>
        {open && (
          <nav aria-label={t('index')} className="absolute top-full left-0 z-10 grid w-40 gap-1 border border-current/30 p-2 shadow-md" style={{ backgroundColor: current.paper }}>
            {moods.map(({ label, heading }, index) => (
              <button key={heading} type="button" aria-current={mood === index ? 'true' : undefined}
                onClick={() => { setMood(index); setOpen(false) }} className="px-2 py-1.5 text-left text-xs hover:bg-black/10 aria-[current=true]:font-bold">{t(label)} / {heading}</button>
            ))}
          </nav>
        )}
      </header>
      <div className="pointer-events-none flex flex-1 flex-col justify-center">
        <p className="font-mono text-[10px] font-bold tracking-[.22em]">PLATE 0{mood + 1} / MOTION PORTRAITS</p>
        <h2 className="mt-2 font-serif text-[clamp(2.6rem,10cqw,8rem)] leading-[.88] tracking-[-.08em] italic">{current.heading}.</h2>
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-current/50 pt-2">
        <div role="group" aria-label={t('group')} className="flex gap-1">
          {moods.map(({ label, heading }, index) => (
            <button key={heading} type="button" onClick={() => setMood(index)} aria-pressed={mood === index}
              className="rounded-full border border-current/60 px-2.5 py-1 text-[10px] aria-pressed:bg-black/10">{t(label)}</button>
          ))}
        </div>
        <span role="status" className="font-mono text-[9px] tracking-wide">{live ? 'RIVE / LIVE' : failed || rive ? 'SVG / PREVIEW' : 'RIVE / LOADING'}</span>
        <a href={license} target="_blank" rel="noreferrer" className="font-mono text-[9px] underline underline-offset-2">RIVE SAMPLE · MIT</a>
      </footer>
    </div>
  )
}
