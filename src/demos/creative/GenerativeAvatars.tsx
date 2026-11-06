import { useMemo, useState } from 'react'
import { Check, Copy } from 'lucide-react'

const PALETTES = [
  ['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51'],
  ['#0b132b', '#3a506b', '#5bc0be', '#6fffe9', '#ffd6ff'],
  ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#1dd1a1'],
  ['#2d00f7', '#8900f2', '#bc00dd', '#e500a4', '#ffb703'],
]
type Style = 'face' | 'marble' | 'pixel' | 'rings' | 'bands'
const STYLES: { id: Style; label: string }[] = [
  { id: 'face', label: 'Face' },
  { id: 'marble', label: 'Marble' },
  { id: 'pixel', label: 'Pixel' },
  { id: 'rings', label: 'Rings' },
  { id: 'bands', label: 'Bands' },
]
const NAMES = ['Aiko', 'Kenji', 'Sakura', 'Ren', 'Mio', 'Haruto', 'Yui', 'Sora']

/** FNV-1a で文字列 → 32bit ハッシュ(同じ名前なら必ず同じアバター) */
function hash(s: string) {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193)
  return h >>> 0
}
function rng(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function avatarSvg(name: string, style: Style, pal: string[], size = 80) {
  const r = rng(hash(name + style))
  const pick = () => pal[Math.floor(r() * pal.length)]
  const id = `a${hash(name + style).toString(36)}`
  const bg = pick()
  let body = ''
  if (style === 'face') {
    let fg = pick()
    if (fg === bg) fg = pal[(pal.indexOf(bg) + 2) % pal.length]
    const rot = (r() - 0.5) * 50
    const dx = (r() - 0.5) * 10
    const pts = Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2
      const rr = 27 + r() * 7
      return [40 + dx + Math.cos(a) * rr, 46 + Math.sin(a) * rr]
    })
    const d = pts.map((p, i) => {
      const n = pts[(i + 1) % 8]
      return `${i === 0 ? `M${((p[0] + pts[7][0]) / 2).toFixed(1)} ${((p[1] + pts[7][1]) / 2).toFixed(1)}` : ''} Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${((p[0] + n[0]) / 2).toFixed(1)} ${((p[1] + n[1]) / 2).toFixed(1)}`
    })
    const ex = 6 + r() * 4
    const happy = r() > 0.35
    body = `<g transform="rotate(${rot.toFixed(1)} 40 46)"><path d="${d.join(' ')}Z" fill="${fg}"/>
      <g transform="translate(${(40 + dx).toFixed(1)} ${(40 + r() * 6).toFixed(1)})" fill="#111">
        <circle cx="${-ex}" cy="0" r="2.6"/><circle cx="${ex}" cy="0" r="2.6"/>
        ${happy ? `<path d="M-6 8 Q0 ${13 + r() * 3} 6 8" stroke="#111" stroke-width="2.4" fill="none" stroke-linecap="round"/>` : `<rect x="-4" y="8" width="8" height="2.4" rx="1.2"/>`}
        ${r() > 0.6 ? `<circle cx="${-ex - 4}" cy="6" r="3" fill="#ff7aa2" opacity=".55"/><circle cx="${ex + 4}" cy="6" r="3" fill="#ff7aa2" opacity=".55"/>` : ''}
      </g></g>`
  } else if (style === 'marble') {
    body = `<defs><filter id="${id}f" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7"/></filter></defs><g filter="url(#${id}f)">${Array.from(
      { length: 4 },
      () => `<ellipse cx="${(r() * 80).toFixed(0)}" cy="${(r() * 80).toFixed(0)}" rx="${(18 + r() * 26).toFixed(0)}" ry="${(10 + r() * 20).toFixed(0)}" transform="rotate(${(r() * 180).toFixed(0)} 40 40)" fill="${pick()}"/>`,
    ).join('')}</g>`
  } else if (style === 'pixel') {
    const fg = pal.filter((c) => c !== bg)
    for (let y = 0; y < 5; y++)
      for (let x = 0; x < 3; x++) {
        if (r() < 0.45) continue
        const c = fg[Math.floor(r() * fg.length)]
        body += `<rect x="${8 + x * 13}" y="${8 + y * 13}" width="13.5" height="13.5" fill="${c}"/>`
        if (x < 2) body += `<rect x="${8 + (4 - x) * 13}" y="${8 + y * 13}" width="13.5" height="13.5" fill="${c}"/>`
      }
  } else if (style === 'rings') {
    for (let i = 0; i < 5; i++) {
      const rr = 34 - i * 6.5
      const a0 = r() * 360
      const len = 120 + r() * 200
      const circ = 2 * Math.PI * rr
      body += `<circle cx="40" cy="40" r="${rr}" fill="none" stroke="${pick()}" stroke-width="5.5" stroke-linecap="round" stroke-dasharray="${((len / 360) * circ).toFixed(1)} ${circ.toFixed(1)}" transform="rotate(${a0.toFixed(0)} 40 40)"/>`
    }
  } else {
    const a = (r() - 0.5) * 70
    let y = -20
    body = `<g transform="rotate(${a.toFixed(1)} 40 40)">`
    while (y < 100) {
      const h = 8 + r() * 18
      body += `<rect x="-20" y="${y.toFixed(1)}" width="120" height="${(h + 0.5).toFixed(1)}" fill="${pick()}"/>`
      y += h
    }
    body += `<circle cx="${(25 + r() * 30).toFixed(0)}" cy="${(25 + r() * 30).toFixed(0)}" r="${(8 + r() * 10).toFixed(0)}" fill="${pick()}" stroke="#fff" stroke-width="2"/></g>`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 80 80"><defs><clipPath id="${id}c"><rect width="80" height="80" rx="40"/></clipPath></defs><g clip-path="url(#${id}c)"><rect width="80" height="80" fill="${bg}"/>${body}</g></svg>`
}

function Avatar({ svg, size }: { svg: string; size: number }) {
  return <img alt="" width={size} height={size} src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} className="block" />
}

/** 名前から決定的に生成する SVG アバター(5スタイル) */
export function GenerativeAvatars() {
  const [name, setName] = useState('Ken Hosoya')
  const [pal, setPal] = useState(0)
  const [copied, setCopied] = useState<Style | null>(null)
  const svgs = useMemo(() => STYLES.map((s) => ({ ...s, svg: avatarSvg(name || '?', s.id, PALETTES[pal], 160) })), [name, pal])

  return (
    <div className="relative flex h-full w-full flex-col justify-center gap-4 overflow-hidden bg-[#faf7f2] p-5 text-zinc-800">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="名前を入力"
          className="h-10 min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 font-[Space_Grotesk] text-base shadow-sm outline-none focus:border-zinc-400"
        />
        <div className="flex gap-1.5">
          {PALETTES.map((p, i) => (
            <button key={i} type="button" onClick={() => setPal(i)} className={`flex overflow-hidden rounded-full ring-offset-2 ${pal === i ? 'ring-2 ring-zinc-800' : ''}`}>
              {p.slice(1, 4).map((c) => (
                <span key={c} className="h-5 w-2.5" style={{ background: c }} />
              ))}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-5 gap-3">
        {svgs.map((s) => (
          <div key={s.id} className="group flex flex-col items-center gap-1.5">
            <div className="relative w-full max-w-24 transition group-hover:-translate-y-1">
              <div className="aspect-square w-full overflow-hidden rounded-full shadow-[0_10px_24px_-10px_rgba(0,0,0,.45)] [&_img]:h-full [&_img]:w-full">
                <Avatar svg={s.svg} size={160} />
              </div>
              <button
                type="button"
                title="SVGをコピー"
                onClick={async () => {
                  await navigator.clipboard?.writeText(s.svg).catch(() => {})
                  setCopied(s.id)
                  setTimeout(() => setCopied(null), 1200)
                }}
                className="absolute -right-1 -bottom-1 grid h-7 w-7 place-items-center rounded-full bg-zinc-900 text-white opacity-0 shadow transition group-hover:opacity-100"
              >
                {copied === s.id ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>
            <span className="text-[11px] font-medium text-zinc-500">{s.label}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-zinc-200 pt-3">
        <span className="text-[11px] text-zinc-400">チーム:</span>
        <div className="flex -space-x-2">
          {NAMES.map((n, i) => (
            <button key={n} type="button" title={n} onClick={() => setName(n)} className="rounded-full ring-2 ring-[#faf7f2] transition hover:z-10 hover:-translate-y-0.5">
              <Avatar svg={avatarSvg(n, STYLES[i % 5].id, PALETTES[pal], 32)} size={32} />
            </button>
          ))}
        </div>
        <span className="ml-auto font-mono text-[10px] text-zinc-400">hash: {hash(name).toString(16)}</span>
      </div>
    </div>
  )
}
