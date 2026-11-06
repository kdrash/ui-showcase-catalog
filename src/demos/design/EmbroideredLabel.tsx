import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

const fabrics = [
  { name: 'natural', paper: '#e5d4a8', thread: '#2a594b', accent: '#a94c32', ground: '#5e6550' },
  { name: 'indigo', paper: '#273a56', thread: '#f3e7c9', accent: '#d47c60', ground: '#46455b' },
  { name: 'forest', paper: '#42654e', thread: '#f5e2ab', accent: '#e1ac63', ground: '#373c32' },
] as const

const badge = 'M70 27H350a26 26 0 0 1 26 26v122l-166 53L44 175V53a26 26 0 0 1 26-26Z'

export function EmbroideredLabel() {
  const { t } = useTranslation('demoControls', { keyPrefix: 'embroidery' })
  const [fabricIndex, setFabricIndex] = useState(0)
  const fabric = fabrics[fabricIndex]
  const weave = useId()
  const trim = useId()

  return (
    <div className="@container relative isolate flex h-full w-full flex-col overflow-hidden px-[6%] pt-4 pb-[var(--solo-footer-clearance,1rem)] text-[#ffefcf]"
      style={{ backgroundColor: fabric.ground }}>
      <div aria-hidden="true" className="absolute inset-0 -z-10 [background:repeating-linear-gradient(126deg,#fff1_0_1px,#0001_1px_3px,transparent_3px_6px)]" />
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-current/45 pb-2 font-mono text-[9px] tracking-[.17em]">
        <span>FIELD NOTES / PATCH SERIES</span>
        <div role="group" aria-label={t('group')} className="flex gap-1">
          {fabrics.map(({ name }, index) => (
            <button key={name} type="button" aria-pressed={fabricIndex === index} onClick={() => setFabricIndex(index)}
              className="rounded-sm border border-current/45 px-2.5 py-1 font-sans aria-pressed:bg-white/20">{t(name)}</button>
          ))}
        </div>
      </header>
      <figure className="flex min-h-0 flex-1 items-center justify-center overflow-hidden py-2">
        <svg role="img" aria-label={t('image', { fabric: t(fabric.name) })} viewBox="0 0 420 260" className="h-full max-h-130 w-full -rotate-5 drop-shadow-[0_10px_12px_#0007]">
          <defs>
            <pattern id={weave} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
              <path d="M0 0v6M3 0v6" stroke="#000" strokeOpacity=".21" strokeWidth=".65" />
              <path d="M0 0h6M0 3h6" stroke="#fff" strokeOpacity=".22" strokeWidth=".65" />
            </pattern>
            <pattern id={trim} width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(43)">
              <path d="M0 0v4" stroke="#fff" strokeOpacity=".42" strokeWidth="1.4" />
            </pattern>
          </defs>
          <path d={badge} fill={fabric.paper} stroke="#292925" strokeWidth="10" strokeLinejoin="round" />
          <path d={badge} fill={`url(#${weave})`} stroke={fabric.thread} strokeWidth="4" strokeLinejoin="round" />
          <path d={badge} fill="none" stroke={`url(#${trim})`} strokeWidth="4" />
          <path d="M70 39H350a14 14 0 0 1 14 14v113l-154 49-154-49V53a14 14 0 0 1 14-14Z"
            fill="none" stroke={fabric.thread} strokeWidth="1.6" strokeDasharray="4 3" />
          <circle cx="251" cy="79" r="21" fill={fabric.accent} />
          <circle cx="251" cy="79" r="21" fill={`url(#${trim})`} />
          <path d="m106 128 55-57 38 39 26-27 53 45H106Z" fill={fabric.thread} stroke={fabric.thread} strokeLinejoin="round" strokeWidth="3" />
          <path d="m106 128 55-57 38 39 26-27 53 45H106Z" fill={`url(#${trim})`} />
          <path d="m146 90 15-15 15 16-13-6-7 5-4-3Z" fill={fabric.paper} />
          <path d="M113 141h194" stroke={fabric.thread} strokeDasharray="3 2" />
          <text x="210" y="167" textAnchor="middle" fill={fabric.thread} fontFamily="Georgia,serif" fontSize="23" fontWeight="bold" letterSpacing="4">NORTH RIDGE</text>
          <text x="210" y="187" textAnchor="middle" fill={fabric.thread} fontFamily="monospace" fontSize="9" letterSpacing="3">OUTDOOR CLUB</text>
        </svg>
      </figure>
      <footer className="flex flex-wrap justify-between gap-2 border-t border-current/45 pt-2 font-mono text-[9px] tracking-[.15em]">
        <span>TWILL · SATIN STITCH</span><span>{t('fabric', { fabric: t(fabric.name) })}</span>
      </footer>
    </div>
  )
}
