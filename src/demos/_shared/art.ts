/**
 * 外部画像なしで使える「写真/イラスト風」プレースホルダー画像を SVG で生成する。
 * seed が同じなら毎回同じ絵になる。返り値は data URI なので
 *   <img src={art('landscape', 3)} />
 *   style={{ backgroundImage: `url(${art('gradient', 5)})` }}
 *   new THREE.TextureLoader().load(art('geometric', 2, 1024, 1024))
 * のようにそのまま使える(ネットワーク不要・CORS問題なし)。
 */

export type ArtKind = 'landscape' | 'gradient' | 'geometric'

/** [最も暗い, 中間, 明るい, ハイライト] の4色パレット */
export const PALETTES: [string, string, string, string][] = [
  ['#1e1b4b', '#6d28d9', '#f472b6', '#fde68a'], // dusk
  ['#082f49', '#0284c7', '#7dd3fc', '#f0f9ff'], // ocean
  ['#052e16', '#15803d', '#86efac', '#fef9c3'], // forest
  ['#431407', '#c2410c', '#fdba74', '#fff7ed'], // desert
  ['#0f172a', '#475569', '#cbd5e1', '#f8fafc'], // mist
  ['#3b0764', '#a21caf', '#fb7185', '#fef08a'], // synth
  ['#134e4a', '#0d9488', '#fcd34d', '#fff1f2'], // tropical
  ['#1c1917', '#a16207', '#fcd34d', '#fafaf9'], // gold
]

function mulberry32(seed: number) {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function mix(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16))
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16))
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('')
}

const wrap = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`

/** 夕焼け/海/森などのローポリ山岳風景 */
export function landscapeSvg(seed: number, w = 800, h = 600) {
  const r = mulberry32(seed * 7919 + 1)
  const [c0, c1, c2, c3] = PALETTES[seed % PALETTES.length]
  const sx = w * (0.2 + r() * 0.6)
  const sy = h * (0.22 + r() * 0.18)
  const sr = Math.min(w, h) * (0.07 + r() * 0.05)
  let stars = ''
  for (let i = 0; i < 40; i++)
    stars += `<circle cx="${(r() * w).toFixed(0)}" cy="${(r() * h * 0.45).toFixed(0)}" r="${(r() * 1.4 + 0.3).toFixed(1)}" fill="#fff" opacity="${(r() * 0.6).toFixed(2)}"/>`
  let layers = ''
  const n = 4
  for (let i = 0; i < n; i++) {
    const base = h * (0.52 + i * 0.12)
    const amp = h * (0.2 - i * 0.035)
    const steps = 7 + i * 3
    const pts = [`0,${h}`]
    for (let k = 0; k <= steps; k++) pts.push(`${((k / steps) * w).toFixed(1)},${(base - amp * (0.25 + r() * 0.75)).toFixed(1)}`)
    pts.push(`${w},${h}`)
    layers += `<polygon points="${pts.join(' ')}" fill="${mix(c2, c0, 0.2 + (0.8 * i) / (n - 1))}"/>`
  }
  return wrap(
    w,
    h,
    `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset=".55" stop-color="${c2}"/><stop offset="1" stop-color="${c3}"/></linearGradient>
    <radialGradient id="g"><stop offset="0" stop-color="${c3}" stop-opacity=".9"/><stop offset="1" stop-color="${c3}" stop-opacity="0"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="url(#s)"/>${stars}
    <circle cx="${sx}" cy="${sy}" r="${sr * 3}" fill="url(#g)"/><circle cx="${sx}" cy="${sy}" r="${sr}" fill="${c3}"/>${layers}`,
  )
}

/** ぼかしたブロブのメッシュグラデーション + 粒子ノイズ */
export function gradientSvg(seed: number, w = 800, h = 600) {
  const r = mulberry32(seed * 104729 + 7)
  const p = PALETTES[seed % PALETTES.length]
  const m = Math.max(w, h)
  let blobs = ''
  for (let i = 0; i < 5; i++)
    blobs += `<circle cx="${(r() * w).toFixed(0)}" cy="${(r() * h).toFixed(0)}" r="${((0.25 + r() * 0.3) * m).toFixed(0)}" fill="${p[(i % 3) + 1]}" opacity=".85"/>`
  return wrap(
    w,
    h,
    `<defs><filter id="b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${(m * 0.09).toFixed(0)}"/></filter>
    <filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .22"/></feComponentTransfer></filter></defs>
    <rect width="100%" height="100%" fill="${p[0]}"/><g filter="url(#b)">${blobs}</g><rect width="100%" height="100%" filter="url(#n)"/>`,
  )
}

/** バウハウス風の幾何学グリッド(円・半円・三角・ストライプ) */
export function geometricSvg(seed: number, w = 800, h = 600) {
  const r = mulberry32(seed * 15485863 + 13)
  const p = PALETTES[seed % PALETTES.length]
  const cols = 4
  const rows = Math.max(2, Math.round((cols * h) / w))
  const cw = w / cols
  const ch = h / rows
  const pick = () => p[Math.floor(r() * 4)]
  let body = `<rect width="100%" height="100%" fill="${p[3]}"/>`
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const X = x * cw
      const Y = y * ch
      const bg = pick()
      let fg = pick()
      if (fg === bg) fg = p[(p.indexOf(bg) + 2) % 4]
      body += `<rect x="${X}" y="${Y}" width="${cw + 1}" height="${ch + 1}" fill="${bg}"/>`
      const k = Math.floor(r() * 5)
      const s = Math.min(cw, ch)
      if (k === 0) body += `<circle cx="${X + cw / 2}" cy="${Y + ch / 2}" r="${s * 0.38}" fill="${fg}"/>`
      else if (k === 1) body += `<path d="M${X} ${Y + ch} A ${cw} ${ch} 0 0 1 ${X + cw} ${Y}  L ${X + cw} ${Y + ch} Z" fill="${fg}"/>`
      else if (k === 2) body += `<polygon points="${X},${Y + ch} ${X + cw / 2},${Y} ${X + cw},${Y + ch}" fill="${fg}"/>`
      else if (k === 3) for (let i = 0; i < 4; i++) body += `<rect x="${X}" y="${Y + (i * ch) / 4}" width="${cw}" height="${ch / 8}" fill="${fg}"/>`
      else body += `<circle cx="${X}" cy="${Y + ch}" r="${s * 0.9}" fill="${fg}"/>`
    }
  return wrap(w, h, body)
}

// ( ) ' も % エンコードしておく: CSS の url(...) にクォートなしで入れても壊れないように
export const svgToDataUri = (svg: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg).replace(/[()']/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())}`

/** 画像URL(data URI)を返す。例: art('landscape', 3, 1200, 800) */
export function art(kind: ArtKind, seed: number, w = 800, h = 600) {
  const svg = kind === 'landscape' ? landscapeSvg(seed, w, h) : kind === 'gradient' ? gradientSvg(seed, w, h) : geometricSvg(seed, w, h)
  return svgToDataUri(svg)
}

/** ギャラリー用に n 枚まとめて(風景・グラデ・幾何学を順番に) */
export function artSet(n: number, w = 800, h = 600, offset = 0) {
  const kinds: ArtKind[] = ['landscape', 'gradient', 'geometric']
  return Array.from({ length: n }, (_, i) => art(kinds[i % 3], i + offset, w, h))
}
