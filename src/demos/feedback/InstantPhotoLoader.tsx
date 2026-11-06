import { useId } from 'react'
import { Camera, RotateCcw } from 'lucide-react'
import { useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useLoadingPreview } from './useLoadingPreview'

const phases = ['exposure', 'develop', 'fix'] as const

export function InstantPhotoLoader() {
  const { t } = useTranslation('demoControls', { keyPrefix: 'loading' })
  const reduced = useReducedMotion()
  const sky = useId()
  const { ref, progress, done, restart } = useLoadingPreview(5800)
  const phase = progress < 25 ? 0 : progress < 76 ? 1 : 2
  const development = reduced ? [0, .4, .8, 1][done ? 3 : phase] : progress / 100
  const filter = `blur(${(1 - development) * 6}px) saturate(${.18 + development * .82}) contrast(${.4 + development * .6})`

  return (
    <div ref={ref} className="@container h-full w-full overflow-y-auto bg-[#202f29] px-3 pt-3 pb-[var(--solo-footer-clearance,0.75rem)] text-[#f5e9d2] [background-image:radial-gradient(ellipse_at_15%_90%,#6f3c2b,transparent_65%)]">
      <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center gap-3">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ede3c8]/35 pb-2">
          <p className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-[.18em]"><Camera size={15} aria-hidden="true" /> SUNROOM FILM / 01</p>
          <button type="button" onClick={restart} className="inline-flex items-center gap-1.5 rounded-full border border-[#ede3c8]/50 px-2.5 py-1 text-[10px] font-bold hover:bg-[#f8edce] hover:text-[#30291e]">
            <RotateCcw size={12} aria-hidden="true" /> {t('replay')}
          </button>
        </header>
        <div className="grid items-center gap-3 @min-[28rem]:grid-cols-[1.05fr_1fr] @md:gap-6">
          <figure className="mx-auto w-[min(100%,10.5rem)] -rotate-2 bg-[#f7efda] p-2.5 text-[#443d2f] shadow-[3px_8px_17px_#1f1615a0] @min-[28rem]:w-[min(100%,13rem)] @lg:w-[min(100%,16rem)]">
            <div className="relative aspect-[4/3] overflow-hidden bg-[#e8d4ba]">
              <svg role="img" aria-label={t('photo.image')} viewBox="0 0 320 240" className="h-full w-full" style={{ filter, opacity: .06 + development * .94 }}>
                <defs>
                  <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
                    <stop stopColor="#4a3a63" /><stop offset=".58" stopColor="#c97870" /><stop offset="1" stopColor="#f7c779" />
                  </linearGradient>
                </defs>
                <path d="M0 0h320v240H0z" fill={`url(#${sky})`} />
                <circle cx="220" cy="98" r="44" fill="#ffe299" />
                <path d="m0 157 59-53 23 17 22-11 44 41 35-14 38 13 43-42 56 47v85H0z" fill="#96515a" />
                <path d="m0 169 64-8 47 19 33-8 35 14 89-32 52 12v74H0z" fill="#62414e" />
                <path d="m0 217 72-32 50 8 38 14 59-16 46-10 55 12v47H0z" fill="#303942" />
                <path d="M144 240q17-21 34-25t45-15q-24 14-35 19t-18 21Z" fill="#d49a71" />
                <path d="M38 240v-38q0-5 4-5t4 5v17q9-1 9-10v-4q0-4 3-4t3 4v5q0 15-15 15v15Z" fill="#212d33" />
                <path d="m39 62 62-10m152 13 38-6m-242 15 34-6" stroke="#ffcb9b" strokeWidth="1.5" opacity=".55" />
              </svg>
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-30 mix-blend-multiply [background-image:radial-gradient(#815c58_0.5px,transparent_0.65px)] [background-size:3px_3px]" />
            </div>
            <figcaption className="mt-2 flex items-center justify-between gap-1 px-0.5 font-mono text-[8px] font-semibold tracking-[.14em]">
              <span>01 / LAST LIGHT</span><span>35° N</span>
            </figcaption>
          </figure>
          <div className="border-y border-[#ede3c8]/35 py-2.5 @md:py-4">
            <p className="font-mono text-[9px] font-semibold tracking-[.18em] text-[#f3ba88]">INSTANT COLOR / ISO 800</p>
            <h2 role="status" className="mt-1 font-serif text-[clamp(1.15rem,4.5cqw,2.5rem)] leading-tight">{t(done ? 'photo.done' : `photo.${phases[phase]}`)}</h2>
            <div className="mt-2.5 flex items-center gap-2">
              <div role="progressbar" aria-label={t('photo.progress')} aria-valuenow={progress} className="grid grow grid-cols-12 gap-0.5 rounded-sm border border-[#ede3c8]/50 p-0.5">
                {Array.from({ length: 12 }, (_, index) => <span key={index} className="h-2" style={{ backgroundColor: (index + 1) / 12 <= development ? '#edb17f' : '#ede3c82b' }} />)}
              </div>
              <span aria-hidden="true" className="w-[4ch] text-right font-mono text-[10px] tabular-nums">{progress}%</span>
            </div>
            <p className="mt-2 text-[10px] text-[#f5e9d2]/85">{t('photo.note')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
