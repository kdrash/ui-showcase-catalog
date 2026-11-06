import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

const palettes = [
  { label: 'sunset', paper: '#fc9d49', ink: '#4d1436', sun: '#fae282', wave: '#e44b52' },
  { label: 'blacklight', paper: '#a2ed79', ink: '#2b224a', sun: '#f2a7ff', wave: '#9984f6' },
] as const

export function PsychedelicFestival() {
  const { t } = useTranslation('demoControls', { keyPrefix: 'poster' })
  const [paletteIndex, setPaletteIndex] = useState(0)
  const palette = palettes[paletteIndex]
  const top = useId()
  const bottom = useId()

  return (
    <div className="@container flex h-full w-full flex-col overflow-hidden px-[5%] py-3 transition-colors motion-reduce:transition-none"
      style={{ backgroundColor: palette.paper, color: palette.ink }}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-current/60 pb-2">
        <p className="font-mono text-[9px] font-bold tracking-[.15em]">INDEPENDENT SOUND / VOL. 06</p>
        <div role="group" aria-label={t('palette')} className="flex gap-1">
          {palettes.map(({ label }, index) => (
            <button key={label} type="button" aria-pressed={paletteIndex === index} onClick={() => setPaletteIndex(index)}
              className="rounded-full border border-current/50 px-2.5 py-1 text-[9px] font-bold aria-pressed:bg-black/15">{t(label)}</button>
          ))}
        </div>
      </div>
      <figure className="relative isolate flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        <svg aria-hidden="true" className="absolute inset-0 h-full w-full" viewBox="0 0 720 480" preserveAspectRatio="xMidYMid slice">
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d="M-50 214C93 390 206 37 361 225S605 411 770 162"
              transform={`translate(0 ${i * 29 - 156})`} fill="none" stroke={i % 2 === 0 ? palette.wave : palette.ink}
              strokeWidth={i % 3 === 0 ? 12 : 4} opacity=".78" />
          ))}
        </svg>
        <svg role="img" aria-label="Solar Echoes" viewBox="0 0 560 340" className="relative h-full max-h-138 w-full">
          <defs>
            <path id={top} d="M54 155Q144 43 276 100T503 125" />
            <path id={bottom} d="M46 241Q158 148 286 204T511 206" />
          </defs>
          <path d="M42 173C17 104 103 47 195 45c45 0 59 31 91 28 59-5 88-37 150-25 55 10 99 51 94 117-4 66-33 122-108 134-57 9-77-27-139-18-53 8-98 42-169 24-70-18-95-62-72-132Z"
            fill={palette.sun} stroke={palette.ink} strokeWidth="4" />
          <text fill={palette.ink} fontFamily="Georgia,serif" fontSize="105" fontWeight="900" fontStyle="italic" letterSpacing="-8">
            <textPath href={`#${top}`} startOffset="50%" textAnchor="middle">SOLAR</textPath>
            <textPath href={`#${bottom}`} startOffset="50%" textAnchor="middle">ECHOES</textPath>
          </text>
          <path d="M103 257l8 19 20 7-20 7-8 20-8-20-20-7 20-7ZM455 65l7 16 17 6-17 6-7 17-7-17-16-6 16-6Z" fill={palette.ink} />
          <text x="284" y="258" textAnchor="middle" fill={palette.ink} fontFamily="monospace" fontSize="10" letterSpacing="3">TWO NIGHTS OF SOUND</text>
        </svg>
      </figure>
      <footer className="flex flex-wrap justify-between gap-2 border-t border-current/60 pt-2 font-mono text-[9px] font-bold tracking-[.16em]"><span>19–20 JUL 2027</span><span>DESERT STAGE / OPEN AIR</span></footer>
    </div>
  )
}
