import { useId, useRef, useState, type MouseEvent } from 'react'
import { Undo2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const stamps = ['star', 'heart', 'circle', 'bow'] as const
type Stamp = typeof stamps[number]
type Sticker = { id: number; stamp: Stamp; x: number; y: number }

function Decal({ stamp }: { stamp: Stamp }) {
  const rainbow = useId()
  return (
    <svg aria-hidden="true" className="h-full w-full drop-shadow-[0_2px_2px_#4c264b70]" viewBox="0 0 80 80">
      <defs>
        <linearGradient id={rainbow} x2="1" y2="1"><stop stopColor="#fff4b2" /><stop offset=".37" stopColor="#ffa1de" /><stop offset=".66" stopColor="#a6cbff" /><stop offset="1" stopColor="#bcf6df" /></linearGradient>
      </defs>
      {stamp === 'star' && <path d="m40 5 10 23 25 2-19 17 6 26-22-14-23 14 7-26L5 30l25-2Z" fill={`url(#${rainbow})`} stroke="#fff" strokeWidth="4" strokeLinejoin="round" />}
      {stamp === 'heart' && <><path d="M40 69 13 44C-4 26 13 7 29 13c5 2 9 6 11 10 3-4 6-8 12-10 17-6 32 13 16 31Z" fill="#f55ea9" stroke="#fff" strokeWidth="4" /><path d="M16 28q1-9 11-8" fill="none" stroke="#ffedfb" strokeWidth="5" strokeLinecap="round" /></>}
      {stamp === 'circle' && <><path d="M71 35C70 11 38 4 19 17 0 29 6 60 27 69c20 10 45-4 46-27" fill="none" stroke="#e1398d" strokeWidth="4" strokeLinecap="round" /><path d="M74 32C66 6 34 8 17 19 0 37 10 65 28 70c16 6 44-5 45-25" fill="none" stroke="#ef6ea9" strokeWidth="2" strokeLinecap="round" /></>}
      {stamp === 'bow' && <><path d="m38 40-24-20C5 11 5 52 14 54l24-12m4-2 24-20c9-9 9 32 0 34L42 42M38 43 24 68l-5-12 12-9m11-4 14 25 5-12-12-9" fill="#9a83f3" stroke="#fff" strokeWidth="3.5" strokeLinejoin="round" /><circle cx="40" cy="39" r="8" fill="#ffb3d8" stroke="#fff" strokeWidth="3" /></>}
    </svg>
  )
}

export function PurikuraStickerAlbum() {
  const { t } = useTranslation('demoControls', { keyPrefix: 'purikura' })
  const [page, setPage] = useState(0)
  const [stamp, setStamp] = useState<Stamp>('star')
  const [pages, setPages] = useState<Sticker[][]>([[], []])
  const nextSticker = useRef(0)
  const stickers = pages[page]

  function place(event: MouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const position = (offset: number, size: number) => Math.max(9, Math.min(91, offset / size * 100))
    const x = event.detail ? position(event.clientX - rect.left, rect.width) : 50
    const y = event.detail ? position(event.clientY - rect.top, rect.height) : 50
    const item = { id: nextSticker.current++, stamp, x, y }
    setPages((current) => current.map((stickers, index) => index === page ? [...stickers, item] : stickers))
  }

  function remove(id: number) {
    setPages((current) => current.map((stickers, index) => index === page ? stickers.filter((sticker) => sticker.id !== id) : stickers))
  }

  return (
    <div className="@container h-full w-full overflow-y-auto bg-[#ebc8e7] px-3 pt-3 pb-[var(--solo-footer-clearance,0.75rem)] text-[#63365b] [background-image:repeating-linear-gradient(45deg,#fff5_0_2px,transparent_2px_10px)]">
      <div className="mx-auto flex min-h-full max-w-4xl flex-col justify-center rounded-[1.25rem] border-2 border-white bg-[#fff2fb] p-3 shadow-[0_4px_0_#d798c6,0_8px_18px_#7c49774d]">
        <header className="flex flex-wrap items-end justify-between gap-2 border-b border-dashed border-[#d386b4] pb-2">
          <div><p className="font-mono text-[9px] font-bold tracking-[.2em]">KIRA KIRA / STICKER ALBUM</p><h2 className="font-serif text-xl leading-tight font-black italic">{t('title')}</h2></div>
          <div role="group" aria-label={t('pages')} className="flex gap-1">
            {[0, 1].map((index) => (
              <button key={index} type="button" aria-pressed={page === index} onClick={() => setPage(index)}
                className="rounded-full border border-[#d39ac2] px-2 py-1 font-mono text-[10px] font-bold aria-pressed:bg-[#e990c3] aria-pressed:text-[#47223b]">
                {t('page', { number: index + 1 })}
              </button>
            ))}
          </div>
        </header>
        <div className="grid items-center gap-3 pt-3 @lg:grid-cols-[minmax(0,1fr)_12rem]">
          <div className="relative mx-auto aspect-[1.52] w-full max-w-114 overflow-hidden rounded-[.85rem] border-5 border-white bg-[#e0d5fa] shadow-[0_2px_5px_#6b406344]">
            <svg aria-hidden="true" viewBox="0 0 456 300" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
              <rect width="456" height="300" fill={page === 0 ? '#bcdcf2' : '#e0b9ee'} />
              <circle cx="366" cy="76" r="57" fill={page === 0 ? '#fff0c1' : '#ffd1e6'} />
              <path d="M0 223C76 142 128 214 206 192S356 158 456 219v81H0Z" fill={page === 0 ? '#a6dfd4' : '#b49fe1'} />
              <path d="M19 266C54 200 118 201 156 266M296 273c32-66 114-66 150 0" fill={page === 0 ? '#ef9ec6' : '#f0c483'} />
              <g transform="translate(105 65)">
                <path d="M7 98C0 54 15 9 57 6s74 27 72 72l-8 56H11Z" fill={page === 0 ? '#5f4269' : '#4d437f'} />
                <ellipse cx="68" cy="77" rx="46" ry="47" fill="#ffe6d6" />
                <path d="M23 66C17 43 36 22 55 20c31-4 53 8 59 29L60 38 48 59Z" fill={page === 0 ? '#5f4269' : '#4d437f'} />
                <circle cx="52" cy="77" r="4" fill="#382b52" /><circle cx="83" cy="77" r="4" fill="#382b52" />
                <path d="M59 92q8 9 17 0" fill="none" stroke="#a64d72" strokeWidth="3" strokeLinecap="round" />
                <ellipse cx="39" cy="89" rx="8" ry="4" fill="#ffadba" /><ellipse cx="96" cy="89" rx="8" ry="4" fill="#ffadba" />
              </g>
              <g transform="translate(230 79)">
                <path d="M15 87C9 46 22 11 66 8c47-2 66 35 66 77v59H15Z" fill={page === 0 ? '#8a5665' : '#a55580'} />
                <ellipse cx="74" cy="79" rx="44" ry="46" fill="#ffe2d4" />
                <path d="M29 68c-7-29 15-50 38-51s46 10 52 33l-30-3-15-13-16 20Z" fill={page === 0 ? '#8a5665' : '#a55580'} />
                <circle cx="59" cy="80" r="4" fill="#382b52" /><circle cx="89" cy="80" r="4" fill="#382b52" />
                <path d="M67 96q8 8 17 0" fill="none" stroke="#a64d72" strokeWidth="3" strokeLinecap="round" />
                <path d="m98 39 21-18m-18 25 24-10" stroke="#fff4ce" strokeWidth="5" strokeLinecap="round" />
              </g>
              <text x="20" y="277" fill="#fff" stroke="#9e5ba8" strokeWidth="2" paintOrder="stroke" fontFamily="Georgia,serif" fontStyle="italic" fontWeight="bold" fontSize="25">{page === 0 ? 'Best friends!' : 'After school!'}</text>
              <path d="m28 44 10-3 3-11 4 11 10 4-10 3-4 12-3-12ZM392 161l10-3 4-12 3 12 12 3-12 4-3 12-4-12Z" fill="#fff6dc" />
            </svg>
            <button type="button" onClick={place} aria-label={t('place')} className="absolute inset-0 z-10 cursor-crosshair focus-visible:outline-3 focus-visible:outline-inset focus-visible:outline-[#a33280]" />
            {stickers.map(({ id, stamp: shape, x, y }) => (
              <button key={id} type="button" aria-label={t('remove', { sticker: t(shape) })} onClick={() => remove(id)}
                className="absolute z-20 size-[clamp(1.8rem,8cqw,4rem)] -translate-x-1/2 -translate-y-1/2 hover:scale-105"
                style={{ left: `${x}%`, top: `${y}%`, rotate: `${(id % 5 - 2) * 8}deg` }}><Decal stamp={shape} /></button>
            ))}
          </div>
          <div className="grid gap-2">
            <div role="group" aria-label={t('stickers')} className="grid grid-cols-4 gap-1 @lg:grid-cols-2">
              {stamps.map((shape) => (
                <button key={shape} type="button" aria-label={t(shape)} aria-pressed={stamp === shape} onClick={() => setStamp(shape)}
                  className="flex flex-col items-center rounded-lg border border-[#e4aed0] bg-white/75 px-1 py-1 text-[9px] font-bold aria-pressed:border-[#9c4689] aria-pressed:bg-[#f5c4e5]">
                  <span className="size-7"><Decal stamp={shape} /></span><span>{t(shape)}</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] leading-snug">{t('hint')}</p>
            <div className="flex items-center justify-between gap-1">
              <output className="font-mono text-[9px] tabular-nums">{t('count', { count: stickers.length })}</output>
              <button type="button" disabled={!stickers.length} onClick={() => { const last = stickers.at(-1); if (last) remove(last.id) }}
                className="inline-flex items-center gap-1 rounded-full border border-[#d39ac2] px-2 py-1 text-[10px] font-bold disabled:opacity-50"><Undo2 size={12} /> {t('undo')}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
