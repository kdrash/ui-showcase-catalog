import type { CSSProperties } from 'react'

/**
 * 新スタイル早見表
 * 同じ「ミニカード(タイトル・説明・ボタン)」を 12 のデザインスタイルで並べて比較する。
 * 各スタイルは tile(背景)/ card / title / text / btn の CSSProperties だけで定義。
 */
type Look = { name: string; tile: CSSProperties; card: CSSProperties; title: CSSProperties; text: CSSProperties; btn: CSSProperties; label?: string }

const dots = (c: string, s = 8, r = 1.8) => `radial-gradient(${c} ${r}px, transparent ${r + 0.4}px) 0 0/${s}px ${s}px`

const LOOKS: Look[] = [
  {
    name: 'shadcn/ui',
    tile: { background: '#fafafa' },
    card: { background: '#fff', border: '1px solid #e4e4e7', borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,.05)' },
    title: { color: '#09090b', fontWeight: 600 },
    text: { color: '#71717a' },
    btn: { background: '#18181b', color: '#fafafa', borderRadius: 6, fontWeight: 500 },
  },
  {
    name: 'SaaS Modern',
    tile: { background: 'radial-gradient(circle at 50% 0%, #2b2f6b, #08090a 70%)' },
    card: { background: 'linear-gradient(180deg,#141518,#0b0c0d)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 14 },
    title: { backgroundImage: 'linear-gradient(180deg,#fff,#8a8f98)', WebkitBackgroundClip: 'text', color: 'transparent', fontWeight: 600 },
    text: { color: '#8a8f98' },
    btn: { background: '#fff', color: '#000', borderRadius: 8, boxShadow: '0 0 18px rgba(255,255,255,.3)', fontWeight: 500 },
  },
  {
    name: 'iOS',
    tile: { background: '#f2f2f7' },
    card: { background: '#fff', borderRadius: 14 },
    title: { color: '#000', fontWeight: 700, fontFamily: '-apple-system, Inter, sans-serif' },
    text: { color: '#8e8e93' },
    btn: { background: '#007aff', color: '#fff', borderRadius: 999, fontWeight: 600 },
  },
  {
    name: 'Frutiger Aero',
    tile: { background: 'linear-gradient(180deg,#2ea6f2,#bfe9ff 70%,#8ad63a 71%,#3f9e14)' },
    card: { background: 'linear-gradient(180deg,rgba(255,255,255,.85),rgba(220,245,255,.6))', border: '1px solid #fff', borderRadius: 14, boxShadow: '0 6px 16px rgba(0,70,140,.3)' },
    title: { color: '#0b4f8a', fontWeight: 600, fontFamily: '"Segoe UI", sans-serif' },
    text: { color: '#3a7bb0' },
    btn: { background: 'linear-gradient(180deg,#7fd6ff 0%,#1fa2f0 50%,#0077d6 51%,#3cc0ff 100%)', color: '#fff', borderRadius: 999, border: '1px solid rgba(0,60,120,.35)', textShadow: '0 1px 2px rgba(0,50,100,.6)' },
  },
  {
    name: 'Vaporwave',
    tile: { background: 'linear-gradient(180deg,#2b0a4d,#7b1fa2 55%,#ff6ec7)' },
    card: { background: '#c0c0c0', boxShadow: 'inset -2px -2px 0 #404040, inset 2px 2px 0 #fff', fontFamily: 'VT323, monospace' },
    title: { color: '#2b0a4d', fontSize: 20, letterSpacing: '.15em' },
    text: { color: '#7b1fa2', fontSize: 15 },
    btn: { background: 'linear-gradient(90deg,#ff2ec4,#00f0ff)', color: '#fff', fontSize: 16, boxShadow: 'inset -2px -2px 0 rgba(0,0,0,.35), inset 2px 2px 0 rgba(255,255,255,.6)' },
  },
  {
    name: 'Memphis',
    tile: { background: `${dots('#111', 14, 2)}, #fff8ec` },
    card: { background: '#fff', border: '3px solid #111', boxShadow: '6px 6px 0 #ffd23f, 6px 6px 0 3px #111' },
    title: { color: '#111', fontWeight: 700, fontFamily: '"Space Grotesk", sans-serif' },
    text: { color: '#7b5ea7', fontWeight: 600 },
    btn: { background: '#ff6b9d', color: '#111', border: '3px solid #111', borderRadius: 999, fontWeight: 700 },
  },
  {
    name: 'Bauhaus',
    tile: { background: 'radial-gradient(circle at 0 0, #d62828 0 40%, transparent 41%), #f2ead3' },
    card: { background: '#fff', boxShadow: '0 0 0 4px #111' },
    title: { color: '#111', fontWeight: 700, textTransform: 'lowercase', letterSpacing: '-.03em', fontFamily: '"Space Grotesk", sans-serif' },
    text: { color: '#1d4e9e', fontWeight: 600, textTransform: 'lowercase' },
    btn: { background: '#f4b400', color: '#111', fontWeight: 700, borderRadius: '18px 0 0 18px', textTransform: 'lowercase' },
  },
  {
    name: 'Pop Art',
    tile: { background: `${dots('rgba(255,42,42,.5)', 9, 2.4)}, #ffe600` },
    card: { background: '#fff', border: '4px solid #0d0d0d', boxShadow: '6px 6px 0 #0d0d0d' },
    title: { color: '#fff', fontFamily: 'Impact, sans-serif', letterSpacing: '.05em', WebkitTextStroke: '1px #0d0d0d', textShadow: '2px 2px 0 #0d0d0d', fontSize: 20 },
    text: { color: '#0d0d0d', fontFamily: 'Impact, sans-serif', letterSpacing: '.05em' },
    btn: { background: '#ff2a2a', color: '#fff', border: '3px solid #0d0d0d', fontFamily: 'Impact, sans-serif', letterSpacing: '.08em' },
  },
  {
    name: '和モダン',
    tile: { background: '#f3eee3' },
    card: { background: 'transparent', borderTop: '1px solid #2b2b2b', borderBottom: '1px solid #2b2b2b', fontFamily: '"Yu Mincho", "Hiragino Mincho ProN", serif' },
    title: { color: '#2b2b2b', letterSpacing: '.3em' },
    text: { color: '#2b2b2b99', letterSpacing: '.15em' },
    btn: { background: '#c8401f', color: '#f3eee3', letterSpacing: '.3em' },
    label: '登 録',
  },
  {
    name: 'ゆめかわ',
    tile: { background: 'linear-gradient(135deg,#ffd6ec,#e8dcff,#cdf5e6)' },
    card: { background: 'rgba(255,255,255,.85)', borderRadius: 24, border: '2px dashed #ffb6dc' },
    title: { color: '#7a4d8f', fontWeight: 700 },
    text: { color: '#b07cc6' },
    btn: { background: 'linear-gradient(180deg,#ffb3da,#ff8fc7)', color: '#fff', borderRadius: 999, boxShadow: '0 4px 0 #e56aa9', fontWeight: 700 },
    label: 'ふぉろー ♡',
  },
  {
    name: 'Blueprint',
    tile: { background: 'linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px) 0 0/16px 16px, linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px) 0 0/16px 16px, #0d3b7a' },
    card: { background: 'rgba(13,59,122,.9)', border: '1.5px solid #fff', borderRadius: 6, fontFamily: '"JetBrains Mono", monospace' },
    title: { color: '#fff', textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 700 },
    text: { color: 'rgba(255,255,255,.7)', textTransform: 'uppercase', fontSize: 10 },
    btn: { background: 'transparent', color: '#fff', border: '1.5px dashed #fff', textTransform: 'uppercase', letterSpacing: '.15em' },
  },
  {
    name: 'Art Deco',
    tile: { background: 'repeating-conic-gradient(from 270deg at 50% 100%, #d4af3722 0 3deg, transparent 3deg 9deg), #0b0b0b' },
    card: { background: '#0b0b0b', border: '1px solid #d4af37', outline: '1px solid #d4af37', outlineOffset: 3, fontFamily: '"Playfair Display", serif' },
    title: { backgroundImage: 'linear-gradient(135deg,#f6e27a,#d4af37 40%,#9c7a1c 60%,#f6e27a)', WebkitBackgroundClip: 'text', color: 'transparent', textTransform: 'uppercase', letterSpacing: '.25em', fontWeight: 700 },
    text: { color: '#cbb67a', letterSpacing: '.2em', fontSize: 10, textTransform: 'uppercase' },
    btn: { background: 'linear-gradient(135deg,#f6e27a,#d4af37 40%,#9c7a1c 60%,#f6e27a)', color: '#0b0b0b', letterSpacing: '.3em', textTransform: 'uppercase', fontWeight: 700 },
  },
  {
    name: 'Fluent',
    tile: { background: 'radial-gradient(circle at 30% 30%, #3a7bd5, transparent 60%), #0b2a5b' },
    card: { background: 'rgba(243,243,243,.9)', borderRadius: 8, border: '1px solid rgba(255,255,255,.5)', fontFamily: '"Segoe UI Variable Text","Segoe UI", sans-serif' },
    title: { color: '#1a1a1a', fontWeight: 600 },
    text: { color: '#5d5d5d' },
    btn: { background: '#005fb8', color: '#fff', borderRadius: 4 },
  },
  {
    name: 'SF HUD',
    tile: { background: 'radial-gradient(#06202e, #020b12)' },
    card: { background: 'rgba(8,47,73,.35)', border: '1px solid #22d3ee88', clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))', fontFamily: '"JetBrains Mono", monospace' },
    title: { color: '#22d3ee', fontFamily: 'Orbitron, sans-serif', letterSpacing: '.15em', textShadow: '0 0 8px #22d3ee' },
    text: { color: '#22d3eeaa', fontSize: 10, letterSpacing: '.2em' },
    btn: { background: 'transparent', color: '#22d3ee', border: '1px solid #22d3ee', letterSpacing: '.25em', fontSize: 11 },
    label: 'ENGAGE',
  },
  {
    name: 'Neon',
    tile: { background: 'linear-gradient(rgba(0,0,0,.5) 2px, transparent 2px) 0 0/100% 18px, #2a1612' },
    card: { background: 'rgba(0,0,0,.35)', border: '2px solid #fff', borderRadius: 10, boxShadow: '0 0 6px #fff, 0 0 14px #ff3ea5, inset 0 0 8px #ff3ea5' },
    title: { color: '#fff5fb', textShadow: '0 0 4px #fff, 0 0 10px #ff3ea5, 0 0 20px #ff3ea5', fontStyle: 'italic', fontWeight: 700 },
    text: { color: '#3ef0ffcc', textShadow: '0 0 8px #3ef0ff', letterSpacing: '.2em', fontSize: 10, textTransform: 'uppercase' },
    btn: { background: 'transparent', color: '#e9feff', border: '2px solid #fff', borderRadius: 8, boxShadow: '0 0 6px #fff, 0 0 12px #3ef0ff', textShadow: '0 0 8px #3ef0ff' },
  },
  {
    name: 'Paper',
    tile: { background: 'linear-gradient(180deg,#fff6e6 55%,#ff9f68 56%,#f2706d 75%,#c94f7c 76%)' },
    card: { background: '#fffaf0', filter: 'drop-shadow(0 2px 1px rgba(80,30,40,.2)) drop-shadow(0 8px 10px rgba(80,30,40,.25))', clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' },
    title: { color: '#4a2c3d', fontWeight: 700 },
    text: { color: '#8a5a6a' },
    btn: { background: '#c94f7c', color: '#fffaf0', fontWeight: 700, filter: 'drop-shadow(0 3px 2px rgba(80,30,40,.35))' },
  },
]

export function StyleGalleryGrid() {
  return (
    <div className="thin-scroll relative h-full w-full overflow-y-auto overflow-x-hidden bg-zinc-950 p-3" style={{ fontFamily: 'Inter, "Noto Sans JP", sans-serif' }}>
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}>
        {LOOKS.map((l) => (
          <div key={l.name} className="relative grid h-[150px] place-items-center overflow-hidden rounded-lg" style={l.tile}>
            <span className="absolute left-2 top-1.5 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">{l.name}</span>
            <div className="mt-3 w-[140px] p-3 text-[13px]" style={l.card}>
              <p className="leading-tight" style={l.title}>
                Mika Sato
              </p>
              <p className="mb-2 mt-0.5 text-[11px]" style={l.text}>
                Designer · Tokyo
              </p>
              <button className="h-7 w-full text-[12px] transition-transform active:scale-95" style={l.btn}>
                {l.label ?? 'Follow'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
