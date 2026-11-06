import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

const covers = [
  { issue: '001', word: 'NOISE', title: 'issue1', ink: '#191717', paper: '#d9ef5f', accent: '#ed674a' },
  { issue: '002', word: 'AFTER', title: 'issue2', ink: '#361929', paper: '#f2a6c1', accent: '#fb7f38' },
] as const

export function UndergroundZine() {
  const { t } = useTranslation('demoControls', { keyPrefix: 'zine' })
  const [issue, setIssue] = useState(0)
  const cover = covers[issue]
  const dots = useId()

  return (
    <div className="@container flex h-full w-full flex-col overflow-y-auto bg-[#282520] p-3 pb-[var(--solo-footer-clearance,0.75rem)] @lg:p-5 @lg:pb-[var(--solo-footer-clearance,1.25rem)]">
      <article className="relative isolate mx-auto flex min-h-88 w-full max-w-5xl flex-1 flex-col justify-between overflow-hidden px-[6%] py-4"
        style={{ background: cover.paper, color: cover.ink }}>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-25 [background:repeating-linear-gradient(174deg,transparent_0_3px,#422d281f_3px_4px)]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/2 h-1 -rotate-2 border-t border-black/20 bg-white/15" />
        <header className="z-10 flex flex-wrap items-center justify-between gap-2 border-b-2 border-current pb-2">
          <span className="font-mono text-[10px] font-black tracking-[.15em]">BASEMENT PRESS / コピー誌</span>
          <div role="group" aria-label={t('group')} className="flex gap-1">
            {covers.map(({ issue: number }, index) => (
              <button key={number} type="button" aria-pressed={issue === index} onClick={() => setIssue(index)}
                className="border border-current px-2 py-1 font-mono text-[9px] font-black aria-pressed:bg-black/15">
                VOL. {number}
              </button>
            ))}
          </div>
        </header>
        <div className="relative flex min-h-64 flex-1 flex-col items-start justify-center gap-2 py-7">
          <svg aria-hidden="true" viewBox="0 0 380 340" className="absolute inset-y-0 right-0 -z-10 h-full max-w-[76%] rotate-8">
            <defs>
              <pattern id={dots} width="5" height="5" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.35" fill={cover.ink} />
              </pattern>
            </defs>
            <path d="M29 51 330 31l20 250L41 305Z" fill="#fbf3d9" />
            <path d="M55 78 304 60l16 197L67 279Z" fill={cover.accent} />
            <path d="M55 78 304 60l16 197L67 279Z" fill={`url(#${dots})`} opacity=".58" />
            <circle cx="189" cy="170" r="83" fill={cover.ink} />
            <circle cx="189" cy="170" r="57" fill="none" stroke="#fbf3d9" strokeDasharray="2 3" strokeWidth="2" />
            <circle cx="189" cy="170" r="28" fill={cover.paper} />
            <circle cx="189" cy="170" r="5" fill={cover.ink} />
            <path d="m83 65-39 32-6-12 38-34Zm234 198-43 36 9 10 45-36Z" fill="#fce39c" opacity=".86" />
            <path d="m286 112 32-22m-25 36 49-7m-40 21 31 9M73 234l25-27m-17 41 34-16" stroke="#fbf3d9" strokeWidth="4" strokeLinecap="round" />
          </svg>
          <p className="-rotate-4 bg-[#fbf3d9] px-2 py-1 font-mono text-[10px] font-black tracking-[.12em]">INDEPENDENT SOUND · {cover.issue}</p>
          <h2 className="-rotate-4 bg-[#fbf3d9] px-2 text-[clamp(3.5rem,15cqw,10rem)] leading-[.83] font-black tracking-[-.12em]">
            {cover.word}<span style={{ color: cover.accent }}>!</span>
          </h2>
          <p className="rotate-3 px-2 py-1 font-serif text-[clamp(.95rem,3cqw,1.7rem)] font-black" style={{ background: cover.ink, color: cover.paper }}>{t(cover.title)}</p>
        </div>
        <footer className="flex flex-wrap justify-between gap-2 border-t-2 border-current pt-2 font-mono text-[9px] font-black tracking-[.14em]">
          <span>PHOTO CUTOUT / 2-INK PRINT</span><span>NO RULES. NO GLOSS.</span>
        </footer>
      </article>
    </div>
  )
}
