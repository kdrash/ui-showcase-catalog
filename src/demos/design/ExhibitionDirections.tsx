import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const directions = ['swiss', 'catalog', 'retro'] as const

const art = 'data:image/svg+xml,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 760">
  <defs>
    <linearGradient id="bg" x2="1" y2="1"><stop stop-color="#201e1a"/><stop offset="1" stop-color="#786f60"/></linearGradient>
    <linearGradient id="stone" x2=".86" y2=".78"><stop stop-color="#fff3d8"/><stop offset=".33" stop-color="#bdb39e"/><stop offset=".78" stop-color="#5d5548"/><stop offset="1" stop-color="#211e19"/></linearGradient>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".79" numOctaves="3" stitchTiles="stitch"/></filter>
  </defs>
  <rect width="720" height="760" fill="url(#bg)"/>
  <ellipse cx="366" cy="665" rx="275" ry="45" fill="#251f19" opacity=".75"/>
  <path d="M122 650V413C122 242 231 116 401 116H549V270H411C327 270 275 330 275 413V650Z" fill="#403b32" transform="translate(33 7)"/>
  <path d="M122 650V413C122 242 231 116 401 116H549V270H411C327 270 275 330 275 413V650Z" fill="url(#stone)"/>
  <path d="M149 635V417C149 259 248 142 404 142H522M177 635V418C177 279 267 168 408 168H522M205 635V416C205 296 282 194 411 194H522M233 635V416C233 312 303 221 413 221H522" fill="none" stroke="#f2e5c8" stroke-opacity=".36" stroke-width="2"/>
  <circle cx="476" cy="426" r="83" fill="url(#stone)"/>
  <rect width="720" height="760" filter="url(#grain)" opacity=".19" style="mix-blend-mode:soft-light"/>
</svg>`)

export function ExhibitionDirections() {
  const { t } = useTranslation('demoControls', { keyPrefix: 'exhibition' })
  const [direction, setDirection] = useState(0)
  const swiss = direction === 0
  const book = direction === 1

  return (
    <div className="@container flex h-full w-full flex-col overflow-hidden bg-[#171713]">
      <div role="group" aria-label={t('group')} className="z-10 flex shrink-0 flex-wrap gap-1 border-b border-white/15 px-2 py-2 @sm:px-4">
        {directions.map((label, index) => (
          <button key={label} type="button" aria-pressed={direction === index} onClick={() => setDirection(index)}
            className="rounded-full px-2.5 py-1.5 text-[10px] font-semibold text-stone-300 hover:bg-white/10 aria-pressed:bg-[#f3ebdc] aria-pressed:text-stone-900 @sm:px-4 @sm:text-xs">
            {t(label)}
          </button>
        ))}
      </div>
      <div className="relative min-h-0 flex-1 overflow-y-auto">
        <article key={direction} className={swiss
          ? 'grid min-h-full grid-cols-1 grid-rows-[auto_1fr_auto] bg-[#eae5da] px-[6%] py-5 text-[#1d211d] @xl:grid-cols-[1.1fr_1fr]'
          : book
            ? 'grid min-h-full grid-cols-[minmax(0,1fr)_4rem] grid-rows-[auto_1fr_auto] gap-x-4 bg-[#f3eadb] px-[7%] py-5 text-[#44352b] @xl:grid-cols-[1fr_1.4fr_6rem]'
            : 'isolate grid min-h-full grid-cols-1 grid-rows-[auto_1fr_auto] bg-[#121522] px-[6%] py-5 text-[#edf2fc] @xl:grid-cols-[1fr_1.1fr]'}>
          <header className={`z-10 col-span-full flex flex-wrap justify-between gap-x-3 border-b pb-2 font-mono text-[10px] tracking-widest ${swiss ? 'border-[#242421]' : book ? 'border-[#8e796a]/60' : 'border-[#c4f96d]/60 text-[#c4f96d]'}`}>
            <span>STUDIO MUSEUM · 企画展</span><span>2027.04.10–06.20</span>
          </header>
          <div className={`z-10 min-w-0 self-center ${swiss ? 'py-6 @xl:pr-6' : book ? 'col-start-2 row-start-2 justify-self-end @xl:col-start-3' : 'py-6'}`}>
            <p className={`text-[10px] tracking-[.18em] ${book ? 'hidden' : swiss ? 'font-mono text-[#b22519]' : 'font-mono text-[#c4f96d]'}`}>EXHIBITION 01 / 形と光の習作</p>
            <h2 className={swiss
              ? 'mt-2 text-[clamp(2.7rem,11cqw,8rem)] leading-[.79] font-black tracking-[-.085em]'
              : book
                ? 'font-serif text-[clamp(1.7rem,5cqw,4rem)] leading-none font-bold tracking-[.12em] [writing-mode:vertical-rl]'
                : 'mt-2 text-[clamp(2.9rem,11cqw,8rem)] leading-[.79] font-black tracking-[-.065em] italic'}>
              {book ? <span lang="ja">かたちの余白</span> : <>AFTER<br />FORM<span className={swiss ? 'text-[#b22519]' : 'text-[#c4f96d]'}>.</span></>}
            </h2>
            {!book && <p className="mt-4 text-xs tracking-wide">{t('intro')}</p>}
          </div>
          <figure className={swiss
            ? 'relative my-2 min-h-36 overflow-hidden @xl:my-4 @xl:min-h-60'
            : book
              ? 'col-start-1 row-start-2 my-4 grid min-h-56 content-center justify-items-center @xl:col-start-2'
              : 'absolute inset-0 -z-10 overflow-hidden @xl:left-[38%]'}>
            <img src={art} alt={t('image')}
              className={swiss ? 'absolute inset-0 h-full w-full object-cover object-[50%_41%] grayscale'
                : book ? 'max-h-[48vh] w-[min(100%,19rem)] border border-stone-500/25 object-contain'
                  : 'h-full w-full object-cover object-[50%_52%] opacity-65 [filter:hue-rotate(185deg)_saturate(.7)]'} />
            {!swiss && !book && <div className="absolute inset-0 bg-linear-to-r from-[#121522] via-[#121522]/25 to-transparent" />}
            {book && <figcaption lang="ja" className="mt-2 text-center font-serif text-[10px] tracking-[.14em]">図版 01　《形と光の習作》</figcaption>}
          </figure>
          {book && <div className="col-start-1 row-start-2 hidden self-end pb-6 font-serif @xl:block">
            <p className="text-2xl tracking-[-.03em]">After Form</p>
            <p className="mt-3 max-w-38 text-sm leading-7">{t('intro')}</p>
          </div>}
          <footer className={`z-10 col-span-full flex flex-wrap items-center justify-between gap-x-4 border-t pt-2 text-[10px] tracking-wider ${swiss ? 'border-[#242421] font-bold' : book ? 'border-[#8e796a]/60 font-serif' : 'border-[#c4f96d]/60 font-mono text-[#c4f96d]'}`}>
            <span>{book ? 'After Form — ' : ''}{t('venue')}</span><span>10:00–18:00</span>
            {book && <p className="mt-2 w-full @xl:hidden">{t('intro')}</p>}
          </footer>
        </article>
      </div>
    </div>
  )
}
