import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const swatches = [
  { label: 'mustard', color: '#cf8d35' },
  { label: 'olive', color: '#6d7752' },
  { label: 'terracotta', color: '#a44e3a' },
] as const

export function MidCenturyFurniture() {
  const { t } = useTranslation('demoControls', { keyPrefix: 'furniture' })
  const [swatch, setSwatch] = useState(0)
  const selectedColor = t(swatches[swatch].label)

  return (
    <div className="@container h-full w-full overflow-y-auto bg-[#e9ddc4] text-[#2c332a]">
      <article className="mx-auto grid min-h-full max-w-6xl grid-rows-[auto_1fr_auto] px-[6%] py-4">
        <header className="flex items-center justify-between border-b border-[#4d5140]/55 pb-2">
          <p className="font-serif text-sm font-bold tracking-tight">FORM &amp; TIMBER</p>
          <p className="font-mono text-[9px] tracking-widest">COLLECTION 01 / 1957</p>
        </header>
        <div className="grid items-center gap-4 py-4 @lg:grid-cols-[1fr_1.2fr]">
          <section>
            <p className="text-[9px] font-bold tracking-[.22em] text-[#833d2e]">THE LIVING ROOM SERIES</p>
            <h2 className="mt-3 font-serif text-[clamp(2rem,7.8cqw,5.8rem)] leading-[.85] tracking-[-.07em]">Make room<br />for <i>slow.</i></h2>
            <p className="mt-3 max-w-65 text-xs leading-5">{t('caption')}</p>
            <div role="group" aria-label={t('group')} className="mt-4 flex items-center gap-2.5">
              {swatches.map(({ label, color }, index) => (
                <button key={label} type="button" aria-label={t(label)} title={t(label)} aria-pressed={index === swatch}
                  onClick={() => setSwatch(index)} style={{ background: color }}
                  className="size-6 rounded-full border border-[#4d5140]/40 outline-offset-3 aria-pressed:outline aria-pressed:outline-[#33392b]" />
              ))}
              <span className="text-[10px]">{selectedColor}</span>
            </div>
          </section>
          <figure className="relative overflow-hidden rounded-t-[6rem] bg-[#a8aa81]">
            <svg role="img" aria-label={t('image', { color: selectedColor })} viewBox="0 0 500 410" className="mx-auto block max-h-[min(48vh,38rem)] w-full">
              <circle cx="322" cy="127" r="87" fill="#ded1a4" />
              <path d="M0 305c168-25 316-29 500 11v94H0Z" fill="#7e805f" />
              <ellipse cx="266" cy="347" rx="139" ry="22" fill="#606346" />
              <path d="M126 241l44 7-31 99-10 2-3-13 11-85ZM304 260l27-10 40 92-11 7-11-4-37-73Z" fill="#664432" />
              <path d="M168 243l10 8 6 66-13 2-11-61ZM332 244l10-11 46 69-13 5-14-11-29-43Z" fill="#513b2c" />
              <path d="M132 241 321 222 363 254 173 290Z" fill="#7a5137" />
              <path d="M160 283 350 249M150 274 340 242M140 265l182-27" fill="none" stroke="#a97c54" strokeWidth="2" opacity=".8" />
              <path d="M283 109c38-15 77 3 76 31-1 28-21 65-43 88l-111 10 22-88c7-25 35-32 56-41Z" fill={swatches[swatch].color} className="transition-[fill] motion-reduce:transition-none" stroke="#4e3d30" strokeWidth="3" />
              <path d="M121 234c29-32 121-30 182-22 30 4 54 15 58 32 4 13-19 23-52 28-64 10-143 11-176-7-16-8-19-20-12-31Z" fill={swatches[swatch].color} className="transition-[fill] motion-reduce:transition-none" stroke="#4e3d30" strokeWidth="3" />
              <path d="M131 241c44 22 171 13 210-8M224 199c36-4 81-34 110-69" fill="none" stroke="#fff2c6" strokeWidth="2" opacity=".37" />
            </svg>
            <figcaption className="absolute right-2 bottom-2 bg-[#e9ddc4] px-2 py-1 font-mono text-[8px] tracking-wide">FIG. 01 · THE SUNDAY CHAIR</figcaption>
          </figure>
        </div>
        <footer className="flex justify-between border-t border-[#4d5140]/55 pt-2 text-[9px] font-bold tracking-widest"><span>WALNUT / WOOL</span><span>DESIGNED FOR LIVING</span></footer>
      </article>
    </div>
  )
}
