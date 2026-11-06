import { useEffect, useRef, useState, type FormEvent, type PointerEvent } from 'react'
import { Eraser, Heart, Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const side = 24
const colors = ['#fff8f0', '#322d51', '#ef6499', '#f7b859', '#77a8f2', '#7bcda7', '#a684d7'] as const
const colorNames = ['paper', 'ink', 'pink', 'yellow', 'blue', 'mint', 'lilac'] as const
const heart = ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000']
type Point = { x: number; y: number }
type Post = { id: number; name: string; message: string; image: string; time: Date }

function pixelImage(pixels: Uint8Array) {
  const paths = colors.map((fill, color) => {
    let shape = ''
    pixels.forEach((value, index) => {
      if (value === color) shape += `M${index % side} ${Math.floor(index / side)}h1v1h-1z`
    })
    return `<path fill="${fill}" d="${shape}"/>`
  }).join('')
  return 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side} ${side}" shape-rendering="crispEdges">${paths}</svg>`)
}

const examplePixels = new Uint8Array(side * side)
for (let y = 0; y < side; y++) {
  for (let x = 0; x < side; x++) {
    const distance = (x - 11.5) ** 2 + (y - 11.5) ** 2
    const ring = Math.abs(y - 12 - (x - 12) * -.22) < 1 && x > 2 && x < 21
    if (ring) examplePixels[y * side + x] = 2
    else if (distance < 43) examplePixels[y * side + x] = y < 11 ? 4 : 6
    else if ((x * 7 + y * 13) % 67 === 0) examplePixels[y * side + x] = 3
  }
}
const exampleImage = pixelImage(examplePixels)
const sampleTime = new Date(2001, 6, 21, 21, 7)
const button = 'inline-flex items-center justify-center gap-1 rounded-none border border-[#8574a7] bg-[#f8f2ff] px-2 py-1 text-[10px] font-bold shadow-[inset_1px_1px_#fff,inset_-1px_-1px_#cfbfeb] hover:bg-[#e6d8ff] aria-pressed:bg-[#d3bffc]'

export function OekakiBoard() {
  const { t, i18n } = useTranslation('demoControls', { keyPrefix: 'oekaki' })
  const [pixels, setPixels] = useState(() => new Uint8Array(side * side))
  const [ink, setInk] = useState(1)
  const [cursor, setCursor] = useState<Point>({ x: 12, y: 12 })
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [posts, setPosts] = useState<Post[]>([])
  const canvas = useRef<HTMLCanvasElement>(null)
  const stroke = useRef<{ id: number; previous: Point } | null>(null)
  const nextPost = useRef(2)
  const dateFormat = new Intl.DateTimeFormat(i18n.resolvedLanguage, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  const log = [...posts, { id: 1, name: 'miki', message: t('sample'), image: exampleImage, time: sampleTime }]

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d')
    if (!ctx) return
    pixels.forEach((color, index) => {
      ctx.fillStyle = colors[color]
      ctx.fillRect(index % side, Math.floor(index / side), 1, 1)
    })
  }, [pixels])

  function paint(from: Point, to: Point) {
    const steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y), 1)
    setPixels((current) => {
      const next = current.slice()
      for (let step = 0; step <= steps; step++) {
        const x = Math.round(from.x + (to.x - from.x) * step / steps)
        const y = Math.round(from.y + (to.y - from.y) * step / steps)
        next[y * side + x] = ink
      }
      return next
    })
  }

  function point(event: PointerEvent<HTMLCanvasElement>): Point {
    const bounds = event.currentTarget.getBoundingClientRect()
    const cell = (offset: number, size: number) => Math.max(0, Math.min(side - 1, Math.floor(offset * side / size)))
    return { x: cell(event.clientX - bounds.left, bounds.width), y: cell(event.clientY - bounds.top, bounds.height) }
  }

  function post(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const entry = { id: nextPost.current++, name: name.trim() || t('anonymous'), message: message.trim(), image: pixelImage(pixels), time: new Date() }
    setPosts((current) => [entry, ...current])
    setMessage('')
  }

  return (
    <div className="@container h-full w-full overflow-y-auto bg-[#ddd0ff] px-3 pt-3 pb-[var(--solo-footer-clearance,0.75rem)] text-[#30254c] [background-image:radial-gradient(circle,#fff_1px,transparent_2px)] [background-size:16px_16px]">
      <div className="mx-auto max-w-4xl border-2 border-[#917ab8] bg-[#f5edff] shadow-[3px_3px_0_#aa95d3]">
        <header className="flex flex-wrap items-end justify-between gap-2 border-b-2 border-[#917ab8] bg-linear-to-r from-[#ffd8ee] via-[#e2d5ff] to-[#d8edff] px-3 py-2.5">
          <div><p className="font-mono text-[9px] font-bold tracking-[.15em]">★ LITTLE PLANET BBS ★</p><h2 className="text-lg leading-tight font-black text-[#514078]">{t('title')}</h2></div>
          <span className="border border-[#9a7ab8] bg-[#fff7ce] px-1.5 py-0.5 font-mono text-[9px] font-bold">24×24 PIXELS</span>
        </header>
        <div className="grid gap-3 p-3 @lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <form onSubmit={post} className="min-w-0 space-y-2 border border-[#ac9bc4] bg-[#fcf8ff] p-2.5">
            <div className="flex flex-wrap justify-between gap-1 text-[10px] font-bold"><span>✎ {t('draw')}</span><span className="text-[#625477]">{t('keys')}</span></div>
            <div className="relative mx-auto aspect-square w-full max-w-42 border-2 border-[#6b5b88] bg-[#fff8f0]">
              <canvas ref={canvas} tabIndex={0} aria-label={t('canvas')} width={side} height={side}
                className="peer block size-full touch-none cursor-crosshair [image-rendering:pixelated] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6a4393]"
                onPointerDown={(event) => {
                  if (event.button !== 0 || stroke.current) return
                  const previous = point(event)
                  stroke.current = { id: event.pointerId, previous }
                  event.currentTarget.setPointerCapture(event.pointerId)
                  paint(previous, previous)
                }}
                onPointerMove={(event) => {
                  const current = stroke.current
                  if (current?.id !== event.pointerId) return
                  const next = point(event)
                  if (current.previous.x === next.x && current.previous.y === next.y) return
                  paint(current.previous, next)
                  current.previous = next
                }}
                onLostPointerCapture={(event) => { if (stroke.current?.id === event.pointerId) stroke.current = null }}
                onKeyDown={(event) => {
                  const shifts = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] } as const
                  const shift = shifts[event.key as keyof typeof shifts]
                  if (shift) {
                    event.preventDefault()
                    setCursor((current) => ({
                      x: Math.max(0, Math.min(side - 1, current.x + shift[0])),
                      y: Math.max(0, Math.min(side - 1, current.y + shift[1])),
                    }))
                  } else if (event.key === ' ' || event.key === 'Enter') {
                    event.preventDefault()
                    paint(cursor, cursor)
                  }
                }} />
              <span aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(to_right,#7b6095_1px,transparent_1px),linear-gradient(to_bottom,#7b6095_1px,transparent_1px)]"
                style={{ backgroundSize: `${100 / side}% ${100 / side}%` }} />
              <span aria-hidden="true" className="pointer-events-none absolute hidden outline-1 outline-[#151023] peer-focus-visible:block"
                style={{ left: `${cursor.x * 100 / side}%`, top: `${cursor.y * 100 / side}%`, width: `${100 / side}%`, height: `${100 / side}%` }} />
            </div>
            <div role="group" aria-label={t('palette')} className="flex flex-wrap items-center justify-center gap-1.5">
              {colors.slice(1).map((color, index) => (
                <button key={color} type="button" aria-label={t(colorNames[index + 1])} aria-pressed={ink === index + 1} onClick={() => setInk(index + 1)}
                  className="size-5 border border-[#6b5b88] aria-pressed:outline-2 aria-pressed:outline-offset-1 aria-pressed:outline-[#6b5b88]" style={{ backgroundColor: color }} />
              ))}
              <button type="button" aria-label={t('erase')} title={t('erase')} aria-pressed={ink === 0} onClick={() => setInk(0)} className={button}><Eraser size={12} /></button>
              <button type="button" aria-label={t('stamp')} title={t('stamp')} className={button}
                onClick={() => setPixels((current) => {
                  const next = current.slice()
                  heart.forEach((row, y) => [...row].forEach((bit, x) => { if (bit === '1') next[(y + 9) * side + x + 8] = ink || 2 }))
                  return next
                })}><Heart size={12} /></button>
              <button type="button" aria-label={t('clear')} title={t('clear')} onClick={() => setPixels(new Uint8Array(side * side))} className={button}><Trash2 size={12} /></button>
            </div>
            <div className="grid gap-1.5 @sm:grid-cols-[1fr_1.6fr]">
              <input aria-label={t('name')} placeholder={t('name')} maxLength={22} value={name} onChange={(event) => setName(event.target.value)} className="min-w-0 border border-[#a28abb] bg-white px-1.5 py-1 text-xs" />
              <input aria-label={t('message')} placeholder={t('message')} maxLength={100} value={message} onChange={(event) => setMessage(event.target.value)} className="min-w-0 border border-[#a28abb] bg-white px-1.5 py-1 text-xs" />
            </div>
            <button type="submit" className={`w-full ${button}`}><Pencil size={12} />{t('post')}</button>
          </form>
          <section aria-label={t('log')} className="min-w-0 border border-[#ac9bc4] bg-white/65">
            <h3 className="border-b border-[#ac9bc4] bg-[#ddd0f9] px-2.5 py-1.5 text-xs font-black">◆ {t('log')}</h3>
            <div className="max-h-65 space-y-1.5 overflow-y-auto p-2" aria-live="polite">
              {log.map((entry) => (
                <article key={entry.id} className="flex min-w-0 items-start gap-2 border border-dashed border-[#b8a6ce] bg-[#fffafe] p-2">
                  <img src={entry.image} alt={t('drawingBy', { name: entry.name })} className="size-14 shrink-0 border border-[#9b83b5] [image-rendering:pixelated]" />
                  <div className="min-w-0">
                    <p className="wrap-break-word text-xs font-bold text-[#542b7a]">#{entry.id} / {entry.name}</p>
                    <time dateTime={entry.time.toISOString()} className="font-mono text-[9px] text-[#66597a]">{dateFormat.format(entry.time)}</time>
                    <p className="wrap-break-word text-[11px]">{entry.message}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
