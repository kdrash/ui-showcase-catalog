/**
 * VideoPlayer 用の「映像」エンジン。動画ファイルは使わず、currentTime から 1 フレームを Canvas 2D に描く純粋関数 drawFrame で映像を作る。
 * 640×360 の仮想座標で描き、setTransform で実際の解像度に合わせる(本体・シークプレビュー・サムネイルで同じ関数を使う)。
 * 地形や星・雨粒・木・ビルなどはモジュール読み込み時にシード付き乱数で 1 度だけ作るので、同じ時刻なら必ず同じ絵になる。
 */

const TAU = Math.PI * 2
const FONT = '"Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP","Yu Gothic UI","Yu Gothic",Meiryo,sans-serif'

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const ease = (x: number) => {
  const k = clamp(x, 0, 1)
  return k * k * (3 - 2 * k)
}
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const mod = (a: number, n: number) => ((a % n) + n) % n

function mulberry32(seed: number) {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ───────────── 色 ───────────── */

const hexCache = new Map<string, [number, number, number]>()
function rgbOf(hex: string): [number, number, number] {
  let v = hexCache.get(hex)
  if (!v) {
    const h = hex.replace('#', '')
    v = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
    hexCache.set(hex, v)
  }
  return v
}
const rgba = (hex: string, a: number) => {
  const [r, g, b] = rgbOf(hex)
  return `rgba(${r},${g},${b},${clamp(a, 0, 1)})`
}
const mix = (a: string, b: string, k: number) => {
  const A = rgbOf(a)
  const B = rgbOf(b)
  return `rgb(${Math.round(lerp(A[0], B[0], k))},${Math.round(lerp(A[1], B[1], k))},${Math.round(lerp(A[2], B[2], k))})`
}
function vGrad(c: CanvasRenderingContext2D, y0: number, y1: number, stops: string[]) {
  const g = c.createLinearGradient(0, y0, 0, y1)
  stops.forEach((s, i) => g.addColorStop(i / Math.max(1, stops.length - 1), s))
  return g
}

/* ───────────── シーン定義 ───────────── */

export type SeaScene = {
  kind: 'sea'
  skyA: string[]
  skyB: string[]
  sun: string
  core: string
  sunX: number
  sunY: [number, number]
  waterA: string[]
  waterB: string[]
  isle: string
  cloudA: string
  cloudB: string
  boat: string
  birds: boolean
}
export type ForestScene = {
  kind: 'forest'
  sky: string[]
  layers: string[]
  fog: string
  ray: string | null
  fx: 'leaves' | 'snow' | 'fireflies'
  snowCap?: boolean
  leafCols?: string[]
}
export type CityScene = {
  kind: 'city'
  sky: string[]
  far: string
  near: string
  lit: string[]
  neon: string[]
  street: string
  weather: 'rain' | 'snow' | 'clear'
  moon?: boolean
  litRate: number
}
export type NightScene = {
  kind: 'night'
  sky: string[]
  aurora: string[]
  strength: number
  far: string
  near: string
  lake: string[]
  cabin: boolean
}
export type Scene = SeaScene | ForestScene | CityScene | NightScene

export interface Chapter {
  title: string
  start: number
  scene: Scene
}
export interface Cue {
  s: number
  e: number
  text: string
}
export interface Comment {
  name: string
  hue: number
  ago: string
  text: string
  likes: number
}
export interface Film {
  id: string
  title: string
  channel: string
  hue: number
  subs: string
  views: string
  ago: string
  likes: number
  desc: string
  tags: string[]
  duration: number
  thumbT: number
  chapters: Chapter[]
  cues: Cue[]
  comments: Comment[]
}

/* ───────────── 乱数で作る地形・粒子 ───────────── */

const R = mulberry32(20261108)

const STARS = Array.from({ length: 190 }, () => ({
  x: R() * 660 - 10,
  y: R() * 260,
  r: 0.35 + R() * R() * 1.4,
  ph: R() * TAU,
  sp: 0.6 + R() * 2.4,
}))
const MILKY = Array.from({ length: 460 }, () => {
  const u = R()
  const off = (R() + R() + R() - 1.5) * 26
  return { x: -20 + u * 700 + off * 0.5, y: 20 + u * 150 + off, a: 0.15 + R() * 0.5 }
})
const RAIN = Array.from({ length: 230 }, () => ({ x: R() * 720, y: R() * 420, sp: 360 + R() * 260, len: 7 + R() * 11, g: R() < 0.5 ? 0 : 1 }))
const SNOW = Array.from({ length: 170 }, () => ({ x: R() * 660, y: R() * 380, sp: 12 + R() * 26, r: 0.5 + R() * 1.7, ph: R() * TAU }))
const LEAVES = Array.from({ length: 38 }, () => ({ x: R(), y: R(), s: R(), f: 0.5 + R(), ph: R() * TAU, r: (R() - 0.5) * 4, c: Math.floor(R() * 3) }))
const FLIES = Array.from({ length: 34 }, () => ({ x: R(), y: R(), f: 0.6 + R() * 1.2, ph: R() * TAU }))
const CLOUDS = Array.from({ length: 7 }, () => ({ x: R(), y: 30 + R() * 110, w: 60 + R() * 120, a: 0.25 + R() * 0.35, sp: 2 + R() * 4 }))
const ISLES = [
  { x: 30, w: 170, h: 16 },
  { x: 150, w: 90, h: 9 },
  { x: 470, w: 210, h: 22 },
  { x: 590, w: 80, h: 10 },
]
const TREES = [0, 1, 2, 3].map((i) =>
  Array.from({ length: 16 - i * 2 }, () => ({ x: R(), h: 70 + R() * 70, w: 34 + R() * 26, pine: R() < 0.62 })),
)

type Building = { x: number; w: number; h: number; wins: { x: number; y: number; on: number; c: number; ph: number }[]; sign: number | null; roof: number }
function makeBuildings(count: number, minH: number, maxH: number, span: number, winStep: number): Building[] {
  const out: Building[] = []
  let x = 0
  for (let i = 0; i < count && x < span; i++) {
    const w = 34 + R() * 52
    const h = minH + R() * (maxH - minH)
    const wins: Building['wins'] = []
    for (let yy = 10; yy < h - 6; yy += winStep) for (let xx = 6; xx < w - 6; xx += winStep * 0.9) wins.push({ x: xx, y: yy, on: R(), c: Math.floor(R() * 3), ph: R() * 40 })
    out.push({ x, w, h, wins, sign: R() < 0.4 ? Math.floor(R() * 3) : null, roof: Math.floor(R() * 3) })
    x += w + 2 + R() * 8
  }
  return out
}
const FAR = makeBuildings(30, 100, 180, 900, 9)
const NEAR = makeBuildings(24, 60, 170, 1000, 12)
const FAR_SPAN = 900
const NEAR_SPAN = 1000

const ridge = (seed: number, amp: number, base: number) => {
  const r = mulberry32(seed)
  const ph = [r() * TAU, r() * TAU, r() * TAU]
  return Array.from({ length: 86 }, (_, i) => {
    const x = i * 8 - 16
    return base - amp * (0.55 * Math.sin(x * 0.009 + ph[0]) + 0.3 * Math.sin(x * 0.023 + ph[1]) + 0.15 * Math.sin(x * 0.061 + ph[2])) - amp * 0.4
  })
}
const RIDGE_FAR = ridge(11, 70, 260)
const RIDGE_NEAR = ridge(29, 44, 288)
const PINES = Array.from({ length: 34 }, () => ({ x: R() * 680 - 20, h: 14 + R() * 26 }))

/* ───────────── 描画 ───────────── */

type C = CanvasRenderingContext2D

function drawSea(c: C, lt: number, p: number, s: SeaScene) {
  const HZ = 220
  const k = ease(p)
  c.fillStyle = vGrad(c, 0, HZ, [0, 1, 2].map((i) => mix(s.skyA[i], s.skyB[i], k)))
  c.fillRect(-20, -20, 680, HZ + 21)
  const sx = s.sunX + lt * 0.4
  const sy = lerp(s.sunY[0], s.sunY[1], k)
  const vis = clamp((HZ + 14 - sy) / 30, 0, 1)
  const gl = c.createRadialGradient(sx, sy, 0, sx, sy, 240)
  gl.addColorStop(0, rgba(s.sun, 0.6 * (0.4 + 0.6 * vis)))
  gl.addColorStop(0.22, rgba(s.sun, 0.2))
  gl.addColorStop(1, rgba(s.sun, 0))
  c.fillStyle = gl
  c.fillRect(-20, -20, 680, HZ + 21)
  c.save()
  c.beginPath()
  c.rect(-20, -20, 680, HZ + 20)
  c.clip()
  c.fillStyle = s.core
  c.beginPath()
  c.arc(sx, sy, 15, 0, TAU)
  c.fill()
  c.restore()
  // 雲
  const cc = mix(s.cloudA, s.cloudB, k)
  c.fillStyle = cc
  for (const cl of CLOUDS) {
    const x = mod(cl.x * 820 + lt * cl.sp, 820) - 110
    c.globalAlpha = cl.a
    c.beginPath()
    c.ellipse(x, cl.y, cl.w * 0.5, 5, 0, 0, TAU)
    c.ellipse(x + cl.w * 0.18, cl.y - 4, cl.w * 0.26, 5, 0, 0, TAU)
    c.fill()
  }
  c.globalAlpha = 1
  // 島
  c.fillStyle = s.isle
  for (const is of ISLES) {
    c.beginPath()
    c.moveTo(is.x, HZ + 0.5)
    c.bezierCurveTo(is.x + is.w * 0.25, HZ - is.h * 1.6, is.x + is.w * 0.6, HZ - is.h * 0.8, is.x + is.w, HZ + 0.5)
    c.fill()
  }
  // 海
  c.fillStyle = vGrad(c, HZ, 360, [mix(s.waterA[0], s.waterB[0], k), mix(s.waterA[1], s.waterB[1], k)])
  c.fillRect(-20, HZ, 680, 150)
  c.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 36; i++) {
    const y = HZ + 2 + i * i * 0.1 + i * 1.7
    if (y > 362) break
    const hw = 5 + i * 2.1 + Math.sin(lt * 1.7 + i * 1.3) * 4
    const x = sx + Math.sin(lt * 0.9 + i * 0.7) * (2 + i * 0.5)
    c.fillStyle = rgba(s.sun, (0.55 - i * 0.012) * (0.25 + 0.75 * vis))
    c.fillRect(x - hw, y, hw * 2, 1 + i * 0.05)
  }
  c.globalCompositeOperation = 'source-over'
  for (let r = 0; r < 18; r++) {
    const y = HZ + 5 + r * r * 0.4 + r * 2
    const sp = 34 + r * 7
    const off = mod(lt * (5 + r * 1.6) + r * 37, sp)
    c.fillStyle = `rgba(255,255,255,${0.05 + r * 0.004})`
    for (let x = -sp + off; x < 660; x += sp) c.fillRect(x + Math.sin(r * 7.1 + x) * 9, y, 6 + r * 1.5, 0.7 + r * 0.05)
  }
  // 船
  const bx = 140 + lt * 2.4
  const by = HZ + 24 + Math.sin(lt * 1.4) * 1.1
  c.fillStyle = s.boat
  c.beginPath()
  c.moveTo(bx - 20, by)
  c.lineTo(bx + 22, by)
  c.lineTo(bx + 15, by + 6)
  c.lineTo(bx - 14, by + 6)
  c.fill()
  c.fillRect(bx - 1, by - 30, 1.6, 30)
  c.beginPath()
  c.moveTo(bx + 1, by - 28)
  c.lineTo(bx + 17, by - 3)
  c.lineTo(bx + 1, by - 3)
  c.fill()
  c.beginPath()
  c.moveTo(bx - 1, by - 22)
  c.lineTo(bx - 12, by - 3)
  c.lineTo(bx - 1, by - 3)
  c.fill()
  c.fillStyle = 'rgba(0,0,0,0.25)'
  c.fillRect(bx - 16, by + 7, 32, 1.2)
  // かもめ
  if (s.birds) {
    c.strokeStyle = s.boat
    c.lineWidth = 1.3
    c.lineCap = 'round'
    for (let i = 0; i < 4; i++) {
      const x = mod(lt * (16 + i * 3) + i * 150, 760) - 60
      const y = 80 + i * 17 + Math.sin(lt * 0.8 + i) * 6
      const f = Math.sin(lt * 5 + i * 2) * 3.5
      const sz = 5 - i * 0.6
      c.beginPath()
      c.moveTo(x - sz * 1.4, y - f)
      c.quadraticCurveTo(x - sz * 0.6, y - sz * 0.6 - f * 0.5, x, y)
      c.quadraticCurveTo(x + sz * 0.6, y - sz * 0.6 - f * 0.5, x + sz * 1.4, y - f)
      c.stroke()
    }
  }
}

function drawPine(c: C, x: number, y: number, h: number, w: number, cap: boolean, color: string) {
  c.fillStyle = color
  c.fillRect(x - 1.5, y - h * 0.2, 3, h * 0.22)
  for (let k = 0; k < 3; k++) {
    const top = y - h + k * h * 0.24
    const ww = w * (0.45 + k * 0.25)
    c.beginPath()
    c.moveTo(x, top)
    c.lineTo(x + ww / 2, top + h * 0.42)
    c.lineTo(x - ww / 2, top + h * 0.42)
    c.fill()
    if (cap) {
      c.fillStyle = 'rgba(245,248,255,0.85)'
      c.beginPath()
      c.moveTo(x, top)
      c.lineTo(x + ww * 0.2, top + h * 0.13)
      c.lineTo(x - ww * 0.2, top + h * 0.13)
      c.fill()
      c.fillStyle = color
    }
  }
}

function drawForest(c: C, lt: number, _p: number, s: ForestScene) {
  c.fillStyle = vGrad(c, 0, 280, s.sky)
  c.fillRect(-20, -20, 680, 400)
  if (s.ray) {
    const g = c.createRadialGradient(470, -10, 0, 470, -10, 300)
    g.addColorStop(0, rgba(s.ray, 0.7))
    g.addColorStop(1, rgba(s.ray, 0))
    c.fillStyle = g
    c.fillRect(-20, -20, 680, 400)
  }
  for (let i = 0; i < 4; i++) {
    const L = TREES[i]
    const span = 840
    const off = lt * (2.5 + i * i * 3.2)
    const baseY = 200 + i * 32
    const hill = (x: number) => baseY + Math.sin((x + off) * 0.011 + i * 2) * 9
    c.fillStyle = s.layers[i]
    c.beginPath()
    c.moveTo(-20, 380)
    for (let x = -20; x <= 660; x += 20) c.lineTo(x, hill(x))
    c.lineTo(660, 380)
    c.fill()
    const sc = 0.55 + i * 0.28
    for (const t of L) {
      const x = mod(t.x * span - off, span) - 100
      if (x < -60 || x > 700) continue
      const y = hill(x) + 6
      if (t.pine) drawPine(c, x, y, t.h * sc, t.w * sc, !!s.snowCap, s.layers[i])
      else {
        c.fillStyle = s.layers[i]
        c.fillRect(x - 2 * sc, y - t.h * sc * 0.45, 4 * sc, t.h * sc * 0.45)
        const r = t.w * sc * 0.42
        c.beginPath()
        c.arc(x, y - t.h * sc * 0.62, r, 0, TAU)
        c.arc(x - r * 0.6, y - t.h * sc * 0.45, r * 0.72, 0, TAU)
        c.arc(x + r * 0.6, y - t.h * sc * 0.47, r * 0.75, 0, TAU)
        c.fill()
        if (s.snowCap) {
          c.fillStyle = 'rgba(245,248,255,0.7)'
          c.beginPath()
          c.ellipse(x, y - t.h * sc * 0.62 - r * 0.7, r * 0.6, r * 0.25, 0, 0, TAU)
          c.fill()
        }
      }
    }
    if (i < 3) {
      c.fillStyle = vGrad(c, baseY - 10, baseY + 60, [rgba(s.fog, 0), rgba(s.fog, 0.22 - i * 0.05), rgba(s.fog, 0)])
      c.fillRect(-20, baseY - 10, 680, 70)
    }
  }
  if (s.ray) {
    c.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 7; i++) {
      const a = 1.9 + i * 0.13 + Math.sin(lt * 0.25 + i) * 0.03
      const w = 0.025 + (i % 3) * 0.012
      const al = 0.035 + 0.03 * Math.sin(lt * 0.7 + i * 2.1)
      c.fillStyle = rgba(s.ray, al)
      c.beginPath()
      c.moveTo(470, -10)
      c.lineTo(470 + Math.cos(a - w) * 560, -10 + Math.sin(a - w) * 560)
      c.lineTo(470 + Math.cos(a + w) * 560, -10 + Math.sin(a + w) * 560)
      c.fill()
    }
    c.globalCompositeOperation = 'source-over'
  }
  if (s.fx === 'leaves') {
    const cols = s.leafCols ?? ['#e8a33d', '#d0603a', '#f1c75b']
    for (const l of LEAVES) {
      const x = mod(l.x * 700 + Math.sin(lt * l.f + l.ph) * 26 - lt * (8 + l.s * 10), 700) - 30
      const y = mod(l.y * 410 + lt * (14 + l.s * 22), 410) - 25
      c.save()
      c.translate(x, y)
      c.rotate(lt * l.r + l.ph)
      c.scale(1, 0.55 + 0.45 * Math.sin(lt * 2.4 * l.f + l.ph))
      c.fillStyle = cols[l.c]
      c.beginPath()
      c.ellipse(0, 0, 2.2 + l.s * 1.8, 1.3 + l.s * 0.6, 0, 0, TAU)
      c.fill()
      c.restore()
    }
  } else if (s.fx === 'snow') {
    drawSnow(c, lt, 'rgba(255,255,255,0.9)')
  } else {
    c.globalCompositeOperation = 'lighter'
    for (const f of FLIES) {
      const x = f.x * 640 + Math.sin(lt * 0.5 * f.f + f.ph) * 34
      const y = 170 + f.y * 170 + Math.cos(lt * 0.37 * f.f + f.ph) * 16
      const a = Math.max(0, Math.sin(lt * f.f * 1.3 + f.ph))
      if (a < 0.02) continue
      const g = c.createRadialGradient(x, y, 0, x, y, 9)
      g.addColorStop(0, `rgba(230,255,150,${0.75 * a})`)
      g.addColorStop(1, 'rgba(230,255,150,0)')
      c.fillStyle = g
      c.fillRect(x - 9, y - 9, 18, 18)
    }
    c.globalCompositeOperation = 'source-over'
  }
}

function drawSnow(c: C, lt: number, col: string) {
  c.fillStyle = col
  for (const sn of SNOW) {
    const x = mod(sn.x + Math.sin(lt * 0.6 + sn.ph) * 12 - lt * 5, 680) - 20
    const y = mod(sn.y + lt * sn.sp, 390) - 15
    c.beginPath()
    c.arc(x, y, sn.r, 0, TAU)
    c.fill()
  }
}

function drawBuildings(c: C, lt: number, s: CityScene, near: boolean) {
  const list = near ? NEAR : FAR
  const span = near ? NEAR_SPAN : FAR_SPAN
  const off = lt * (near ? 9 : 3.2)
  const base = 292
  for (const b of list) {
    const x = mod(b.x - off, span) - 120
    if (x > 660 || x + b.w < -20) continue
    const top = base - b.h
    c.fillStyle = near ? s.near : s.far
    c.fillRect(x, top, b.w, b.h + 2)
    if (near && b.roof === 1) {
      c.fillRect(x + b.w * 0.3, top - 12, 2, 12)
      c.fillRect(x + b.w * 0.6, top - 7, b.w * 0.25, 7)
    }
    const ws = near ? 4.2 : 2.6
    for (const w of b.wins) {
      if (w.on > s.litRate) continue
      if (near && Math.floor(lt * 0.25 + w.ph) % 9 === 0) continue
      c.fillStyle = rgba(s.lit[w.c], near ? 0.85 : 0.5)
      c.fillRect(x + w.x, top + w.y, ws, ws * 1.3)
    }
    if (near && b.sign !== null) {
      const col = s.neon[b.sign]
      const fl = Math.sin(lt * 9 + b.x) > -0.85 ? 1 : 0.3
      c.globalCompositeOperation = 'lighter'
      c.fillStyle = rgba(col, 0.18 * fl)
      c.fillRect(x + b.w - 12, top + 14, 16, 46)
      c.fillStyle = rgba(col, 0.85 * fl)
      c.fillRect(x + b.w - 8, top + 18, 8, 38)
      c.globalCompositeOperation = 'source-over'
    }
  }
}

function drawCity(c: C, lt: number, _p: number, s: CityScene) {
  c.fillStyle = vGrad(c, 0, 290, s.sky)
  c.fillRect(-20, -20, 680, 320)
  if (s.moon) {
    const g = c.createRadialGradient(520, 62, 0, 520, 62, 70)
    g.addColorStop(0, 'rgba(255,245,220,0.45)')
    g.addColorStop(1, 'rgba(255,245,220,0)')
    c.fillStyle = g
    c.fillRect(440, -10, 160, 150)
    c.fillStyle = '#fff6df'
    c.beginPath()
    c.arc(520, 62, 11, 0, TAU)
    c.fill()
  }
  if (s.weather === 'clear') {
    for (const st of STARS.slice(0, 60)) {
      c.fillStyle = `rgba(255,255,255,${0.3 + 0.3 * Math.sin(lt * st.sp + st.ph)})`
      c.fillRect(st.x, st.y * 0.6, 1, 1)
    }
  }
  drawBuildings(c, lt, s, false)
  c.fillStyle = vGrad(c, 200, 270, [rgba(s.sky[s.sky.length - 1], 0), rgba(s.sky[s.sky.length - 1], 0.45)])
  c.fillRect(-20, 200, 680, 70)
  drawBuildings(c, lt, s, true)
  // 街灯
  const lampOff = lt * 9
  for (let i = 0; i < 4; i++) {
    const x = mod(i * 250 - lampOff, 1000) - 120
    if (x < -40 || x > 680) continue
    c.fillStyle = s.near
    c.fillRect(x, 230, 2, 62)
    c.fillRect(x, 230, 10, 2)
    const g = c.createRadialGradient(x + 10, 234, 0, x + 10, 234, 40)
    g.addColorStop(0, 'rgba(255,214,150,0.55)')
    g.addColorStop(1, 'rgba(255,214,150,0)')
    c.fillStyle = g
    c.fillRect(x - 30, 194, 80, 80)
  }
  // 路面と映り込み
  c.fillStyle = s.street
  c.fillRect(-20, 292, 680, 80)
  c.save()
  c.beginPath()
  c.rect(-20, 292, 680, 80)
  c.clip()
  c.translate(0, 584)
  c.scale(1, -1)
  c.globalAlpha = s.weather === 'rain' ? 0.32 : 0.16
  drawBuildings(c, lt, s, true)
  c.restore()
  for (let i = 0; i < 14; i++) {
    const y = 296 + i * i * 0.35 + i * 1.5
    c.fillStyle = rgba(s.street, 0.35)
    c.fillRect(-20, y + Math.sin(lt * 2 + i) * 0.6, 680, 1.4 + i * 0.12)
  }
  // 車
  const ph = mod(lt + 4, 10)
  const cx = -140 + ph * 92
  if (cx > -160 && cx < 760) {
    c.globalCompositeOperation = 'lighter'
    const cone = c.createLinearGradient(cx + 40, 0, cx + 190, 0)
    cone.addColorStop(0, 'rgba(255,240,200,0.35)')
    cone.addColorStop(1, 'rgba(255,240,200,0)')
    c.fillStyle = cone
    c.beginPath()
    c.moveTo(cx + 40, 296)
    c.lineTo(cx + 190, 284)
    c.lineTo(cx + 190, 318)
    c.fill()
    const rf = c.createRadialGradient(cx + 44, 330, 0, cx + 44, 330, 30)
    rf.addColorStop(0, 'rgba(255,240,200,0.3)')
    rf.addColorStop(1, 'rgba(255,240,200,0)')
    c.fillStyle = rf
    c.fillRect(cx + 10, 300, 70, 60)
    c.globalCompositeOperation = 'source-over'
    c.fillStyle = '#07080f'
    c.beginPath()
    c.moveTo(cx, 300)
    c.lineTo(cx + 4, 290)
    c.lineTo(cx + 12, 289)
    c.lineTo(cx + 18, 281)
    c.lineTo(cx + 32, 281)
    c.lineTo(cx + 38, 289)
    c.lineTo(cx + 44, 291)
    c.lineTo(cx + 44, 300)
    c.fill()
    c.fillStyle = '#fff2c8'
    c.fillRect(cx + 41, 292, 3, 2)
    c.fillStyle = '#ff3b3b'
    c.fillRect(cx, 292, 2, 2)
  }
  if (s.weather === 'rain') {
    c.lineWidth = 0.7
    for (let g = 0; g < 2; g++) {
      c.strokeStyle = g ? 'rgba(190,215,255,0.35)' : 'rgba(190,215,255,0.18)'
      c.beginPath()
      for (const d of RAIN) {
        if (d.g !== g) continue
        const y = mod(d.y + lt * d.sp, 420) - 30
        const x = mod(d.x + y * 0.16, 700) - 30
        c.moveTo(x, y)
        c.lineTo(x - d.len * 0.16, y - d.len)
      }
      c.stroke()
    }
    c.strokeStyle = 'rgba(200,220,255,0.3)'
    for (let k = 0; k < 26; k++) {
      const q = mod(lt * 1.6 + k * 0.37, 1)
      const x = mod(k * 97.3, 640)
      const y = 300 + (k % 7) * 8
      c.globalAlpha = 1 - q
      c.beginPath()
      c.ellipse(x, y, 1 + q * 6, 0.4 + q * 1.4, 0, 0, TAU)
      c.stroke()
    }
    c.globalAlpha = 1
  } else if (s.weather === 'snow') {
    drawSnow(c, lt, 'rgba(255,255,255,0.85)')
  }
}

function drawAurora(c: C, lt: number, s: NightScene) {
  c.globalCompositeOperation = 'lighter'
  for (let i = 0; i < s.aurora.length; i++) {
    const col = s.aurora[i]
    const base = 92 + i * 26
    const g = c.createLinearGradient(0, -100, 0, 6)
    g.addColorStop(0, rgba(col, 0))
    g.addColorStop(0.6, rgba(col, 0.35))
    g.addColorStop(0.9, rgba(col, 0.95))
    g.addColorStop(1, rgba(col, 0))
    c.fillStyle = g
    for (let x = -10; x <= 650; x += 3) {
      const y = base + Math.sin(x * 0.011 + lt * 0.22 + i * 1.7) * 24 + Math.sin(x * 0.027 - lt * 0.35 + i) * 9
      const a = (0.075 + 0.05 * Math.sin(x * 0.07 + lt * 1.1 + i * 3) + 0.03 * Math.sin(x * 0.23 - lt * 2.2)) * s.strength
      if (a <= 0) continue
      const hs = 0.65 + 0.35 * Math.sin(x * 0.017 + lt * 0.5 + i * 2)
      c.globalAlpha = clamp(a, 0, 1)
      c.save()
      c.translate(x, y)
      c.scale(1, hs)
      c.fillRect(0, -100, 3.6, 106)
      c.restore()
    }
  }
  c.globalAlpha = 1
  c.globalCompositeOperation = 'source-over'
}

function drawRidge(c: C, pts: number[], col: string, off: number) {
  c.fillStyle = col
  c.beginPath()
  c.moveTo(-20, 380)
  for (let i = 0; i < pts.length; i++) c.lineTo(i * 8 - 16 - off, pts[i])
  c.lineTo(700, 380)
  c.fill()
}

function drawNight(c: C, lt: number, p: number, s: NightScene) {
  c.fillStyle = vGrad(c, 0, 300, s.sky)
  c.fillRect(-20, -20, 680, 400)
  c.fillStyle = '#ffffff'
  for (const m of MILKY) {
    c.globalAlpha = m.a * 0.45
    c.fillRect(m.x, m.y, 1, 1)
  }
  for (const st of STARS) {
    c.globalAlpha = clamp(0.45 + 0.55 * Math.sin(lt * st.sp + st.ph), 0.1, 1)
    c.beginPath()
    c.arc(st.x, st.y, st.r, 0, TAU)
    c.fill()
  }
  c.globalAlpha = 1
  drawAurora(c, lt, s)
  // 流れ星
  const q = mod(lt, 7) / 7
  if (q < 0.13) {
    const k = q / 0.13
    const n = Math.floor(lt / 7)
    const x0 = 120 + ((n * 173) % 360)
    const y0 = 30 + ((n * 61) % 60)
    const x = x0 + k * 140
    const y = y0 + k * 60
    const g = c.createLinearGradient(x - 60, y - 26, x, y)
    g.addColorStop(0, 'rgba(255,255,255,0)')
    g.addColorStop(1, `rgba(255,255,255,${0.9 * (1 - k)})`)
    c.strokeStyle = g
    c.lineWidth = 1.2
    c.beginPath()
    c.moveTo(x - 60, y - 26)
    c.lineTo(x, y)
    c.stroke()
  }
  drawRidge(c, RIDGE_FAR, s.far, p * 6)
  drawRidge(c, RIDGE_NEAR, s.near, p * 14)
  // 湖
  c.fillStyle = vGrad(c, 292, 360, s.lake)
  c.fillRect(-20, 292, 680, 80)
  c.save()
  c.beginPath()
  c.rect(-20, 292, 680, 80)
  c.clip()
  c.translate(0, 584)
  c.scale(1, -1)
  c.globalAlpha = 0.3
  drawAurora(c, lt, s)
  c.restore()
  for (let i = 0; i < 12; i++) {
    const y = 296 + i * i * 0.4 + i * 2
    c.fillStyle = 'rgba(0,0,0,0.22)'
    c.fillRect(-20, y + Math.sin(lt * 1.4 + i) * 0.5, 680, 1 + i * 0.1)
  }
  // 岸辺の針葉樹
  c.fillStyle = s.near
  c.fillRect(-20, 290, 680, 3)
  for (const pn of PINES) {
    const x = pn.x - p * 14
    c.beginPath()
    c.moveTo(x, 292 - pn.h)
    c.lineTo(x + pn.h * 0.22, 292)
    c.lineTo(x - pn.h * 0.22, 292)
    c.fill()
  }
  if (s.cabin) {
    const x = 452 - p * 14
    c.fillStyle = s.near
    c.fillRect(x, 276, 30, 16)
    c.beginPath()
    c.moveTo(x - 4, 277)
    c.lineTo(x + 15, 264)
    c.lineTo(x + 34, 277)
    c.fill()
    c.fillRect(x + 22, 262, 4, 10)
    const fl = 0.85 + 0.15 * Math.sin(lt * 7)
    c.fillStyle = `rgba(255,196,110,${fl})`
    c.fillRect(x + 6, 281, 6, 5)
    c.fillRect(x + 17, 281, 6, 5)
    c.globalCompositeOperation = 'lighter'
    const g = c.createRadialGradient(x + 14, 284, 0, x + 14, 284, 28)
    g.addColorStop(0, `rgba(255,190,110,${0.35 * fl})`)
    g.addColorStop(1, 'rgba(255,190,110,0)')
    c.fillStyle = g
    c.fillRect(x - 14, 256, 56, 56)
    c.fillStyle = `rgba(255,190,110,${0.18 * fl})`
    for (let i = 0; i < 8; i++) c.fillRect(x + 8 + Math.sin(lt * 2 + i) * 2, 296 + i * 4, 12 - i, 1.2)
    c.globalCompositeOperation = 'source-over'
    // 煙
    for (let i = 0; i < 6; i++) {
      const q2 = mod(lt * 0.25 + i / 6, 1)
      c.fillStyle = `rgba(200,210,230,${0.12 * (1 - q2)})`
      c.beginPath()
      c.arc(x + 24 + Math.sin(q2 * 5 + i) * 4 + q2 * 14, 258 - q2 * 40, 3 + q2 * 8, 0, TAU)
      c.fill()
    }
  }
}

function drawScene(c: C, sc: Scene, lt: number, p: number) {
  c.save()
  const z = 1 + p * 0.05
  c.translate(320, 180)
  c.scale(z, z)
  c.translate(-320, -180 + (sc.kind === 'night' ? -p * 4 : 0))
  if (sc.kind === 'sea') drawSea(c, lt, p, sc)
  else if (sc.kind === 'forest') drawForest(c, lt, p, sc)
  else if (sc.kind === 'city') drawCity(c, lt, p, sc)
  else drawNight(c, lt, p, sc)
  c.restore()
}

const XF = 1.1
const buffers = new Map<string, HTMLCanvasElement>()
function bufferFor(w: number, h: number) {
  const key = `${w}x${h}`
  let b = buffers.get(key)
  if (!b) {
    if (buffers.size > 6) buffers.clear()
    b = document.createElement('canvas')
    b.width = w
    b.height = h
    buffers.set(key, b)
  }
  return b
}

export function chapterAt(film: Film, t: number) {
  let i = 0
  for (let k = 0; k < film.chapters.length; k++) if (film.chapters[k].start <= t + 1e-6) i = k
  return i
}
export const chapterEnd = (film: Film, i: number) => (i + 1 < film.chapters.length ? film.chapters[i + 1].start : film.duration)

function sceneFrame(c: C, film: Film, i: number, t: number) {
  const ch = film.chapters[i]
  const len = chapterEnd(film, i) - ch.start
  drawScene(c, ch.scene, t - ch.start, clamp((t - ch.start) / len, 0, 1))
}

/** t 秒目の 1 フレームを w×h の ctx に描く */
export function drawFrame(c: C, w: number, h: number, film: Film, tIn: number) {
  const t = clamp(tIn, 0, film.duration)
  c.setTransform(w / 640, 0, 0, h / 360, 0, 0)
  c.globalAlpha = 1
  c.globalCompositeOperation = 'source-over'
  const i = chapterAt(film, t)
  const lt = t - film.chapters[i].start
  sceneFrame(c, film, i, t)
  if (i > 0 && lt < XF) {
    const b = bufferFor(w, h)
    const bc = b.getContext('2d')
    if (bc) {
      bc.setTransform(w / 640, 0, 0, h / 360, 0, 0)
      sceneFrame(bc, film, i - 1, t)
      c.save()
      c.setTransform(1, 0, 0, 1, 0, 0)
      c.globalAlpha = 1 - ease(lt / XF)
      c.drawImage(b, 0, 0)
      c.restore()
    }
  }
  // ビネット
  const v = c.createRadialGradient(320, 180, 120, 320, 180, 400)
  v.addColorStop(0, 'rgba(0,0,0,0)')
  v.addColorStop(1, 'rgba(0,0,0,0.42)')
  c.fillStyle = v
  c.fillRect(0, 0, 640, 360)
  // タイトルとチャプターの字幕
  c.save()
  c.shadowColor = 'rgba(0,0,0,0.55)'
  c.shadowBlur = 10
  c.textBaseline = 'alphabetic'
  if (t < 6) {
    const a = ease(t / 1.4) * (1 - ease((t - 4.4) / 1.4))
    if (a > 0.01) {
      c.globalAlpha = a
      c.fillStyle = '#ffffff'
      c.textAlign = 'center'
      c.font = `600 25px ${FONT}`
      const [main, sub] = film.title.split(' — ')
      c.fillText(main, 320, 176 + (1 - a) * 4)
      if (sub) {
        c.font = `400 10.5px ${FONT}`
        c.globalAlpha = a * 0.85
        c.fillText(sub, 320, 198)
      }
      c.globalAlpha = a * 0.6
      c.fillRect(304, 186, 32 * a, 1)
    }
  }
  const lw = i === 0 ? [6.4, 10.4] : [1.4, 5.6]
  const la = ease((lt - lw[0]) / 0.7) * (1 - ease((lt - lw[1]) / 0.7))
  if (la > 0.01) {
    c.textAlign = 'left'
    c.globalAlpha = la * 0.85
    c.fillStyle = '#ffffff'
    c.font = `500 8.5px ${FONT}`
    c.fillText(`CHAPTER ${String(i + 1).padStart(2, '0')}`, 30, 300)
    c.fillRect(30, 305, 26 * la, 1)
    c.globalAlpha = la
    c.font = `600 17px ${FONT}`
    c.fillText(film.chapters[i].title, 30 + (1 - la) * 6, 326)
  }
  c.restore()
  // 冒頭と終わりの黒
  const black = Math.max(1 - ease(t / 0.9), ease((t - (film.duration - 1.3)) / 1.3))
  if (black > 0.001) {
    c.fillStyle = `rgba(0,0,0,${black})`
    c.fillRect(0, 0, 640, 360)
  }
  c.setTransform(1, 0, 0, 1, 0, 0)
}

/* ───────────── 動画データ(すべて架空) ───────────── */

const SEA_DAWN: SeaScene = {
  kind: 'sea',
  skyA: ['#0d1634', '#3b2f5e', '#b8607a'],
  skyB: ['#2d5f95', '#e79c7c', '#ffd79c'],
  sun: '#ffb36b',
  core: '#fff3d6',
  sunX: 400,
  sunY: [236, 140],
  waterA: ['#2b2c50', '#0b1027'],
  waterB: ['#40628f', '#132849'],
  isle: '#1a1a33',
  cloudA: '#8a6d9c',
  cloudB: '#ffd6bd',
  boat: '#151526',
  birds: true,
}
const SEA_DUSK: SeaScene = {
  kind: 'sea',
  skyA: ['#3d6aa0', '#e7a37a', '#ffd08a'],
  skyB: ['#241a4a', '#c2507a', '#ff9a5a'],
  sun: '#ff8a4a',
  core: '#ffe2c0',
  sunX: 250,
  sunY: [150, 232],
  waterA: ['#3b5c88', '#12264a'],
  waterB: ['#3a2850', '#100c26'],
  isle: '#1d1530',
  cloudA: '#ffe0c8',
  cloudB: '#a35a86',
  boat: '#140f22',
  birds: true,
}
const SEA_WINTER: SeaScene = {
  kind: 'sea',
  skyA: ['#5f7fa6', '#b9c7da', '#e9d9cf'],
  skyB: ['#33456b', '#8d8db0', '#e3b7a8'],
  sun: '#ffd0b0',
  core: '#fff6ee',
  sunX: 470,
  sunY: [176, 214],
  waterA: ['#5d7896', '#2a3c58'],
  waterB: ['#3e4d6e', '#1a2440'],
  isle: '#2a3450',
  cloudA: '#eef2f8',
  cloudB: '#c7b4c8',
  boat: '#1b2236',
  birds: false,
}
const FOREST_DAY: ForestScene = {
  kind: 'forest',
  sky: ['#bfe6d8', '#f3f0c6'],
  layers: ['#a3cbb3', '#6fa58a', '#3f7a5f', '#1d4636'],
  fog: '#eef8ee',
  ray: '#fff4c2',
  fx: 'leaves',
}
const FOREST_SNOW: ForestScene = {
  kind: 'forest',
  sky: ['#c5d3e6', '#eef2f8'],
  layers: ['#b4c2d4', '#8899b0', '#5a6d87', '#33435a'],
  fog: '#f4f7fc',
  ray: '#ffffff',
  fx: 'snow',
  snowCap: true,
}
const FOREST_NIGHT: ForestScene = {
  kind: 'forest',
  sky: ['#0b1828', '#243a58'],
  layers: ['#1c3046', '#152539', '#0e1b2b', '#07101b'],
  fog: '#5b7ba0',
  ray: null,
  fx: 'fireflies',
}
const CITY_RAIN: CityScene = {
  kind: 'city',
  sky: ['#1b2140', '#4a4a70', '#a86e7c'],
  far: '#2e3352',
  near: '#131626',
  lit: ['#ffcf7a', '#ffe9b8', '#9fd3ff'],
  neon: ['#ff5a8a', '#5ad1ff', '#ffd35a'],
  street: '#0c0e19',
  weather: 'rain',
  litRate: 0.55,
}
const CITY_SNOW: CityScene = {
  kind: 'city',
  sky: ['#26314d', '#56648a', '#a8b2c8'],
  far: '#3a4562',
  near: '#1a2032',
  lit: ['#ffd38a', '#fff1c8', '#ffb46a'],
  neon: ['#ff7a6a', '#7ae0ff', '#ffe27a'],
  street: '#2a3146',
  weather: 'snow',
  litRate: 0.6,
}
const CITY_NEON: CityScene = {
  kind: 'city',
  sky: ['#0a0820', '#2a1646', '#5c2a60'],
  far: '#231a40',
  near: '#0d0a1c',
  lit: ['#ff9ad5', '#9ad8ff', '#ffe08a'],
  neon: ['#ff3d9a', '#3dd8ff', '#b06bff'],
  street: '#0a0816',
  weather: 'clear',
  moon: true,
  litRate: 0.5,
}
const NIGHT_AURORA: NightScene = {
  kind: 'night',
  sky: ['#02040c', '#0a1430', '#1b2c50'],
  aurora: ['#4dffb0', '#38c7ff', '#a46bff'],
  strength: 1,
  far: '#0f1a30',
  near: '#060b16',
  lake: ['#0e1a33', '#04070f'],
  cabin: true,
}
const NIGHT_GREEN: NightScene = {
  kind: 'night',
  sky: ['#01060a', '#08202a', '#123a40'],
  aurora: ['#58ff9a', '#2effd2'],
  strength: 1.3,
  far: '#0c2228',
  near: '#041014',
  lake: ['#0a2228', '#02080a'],
  cabin: true,
}
const NIGHT_VIOLET: NightScene = {
  kind: 'night',
  sky: ['#05030f', '#1a0f35', '#3a1d55'],
  aurora: ['#ff6bd0', '#a46bff', '#5f8bff'],
  strength: 0.9,
  far: '#1a1233',
  near: '#0a0618',
  lake: ['#1a1233', '#05030c'],
  cabin: false,
}

export const FILMS: Film[] = [
  {
    id: 'hitohi',
    title: 'ひと日の風景 — 海辺の夜明けから星降る夜まで',
    channel: 'ソラノ映像舎',
    hue: 18,
    subs: 'チャンネル登録者数 18.4万人',
    views: '32万 回視聴',
    ago: '3日前',
    likes: 12480,
    desc: '夜明けの海、木漏れ日の森、雨の街角、そしてオーロラの夜。ひとつの「一日」を4つの風景でつないだ環境映像です。すべての映像はプログラムで描いています。作業用・おやすみ前のBGVにもどうぞ。',
    tags: ['#環境映像', '#タイムラプス', '#作業用'],
    duration: 160,
    thumbT: 133,
    chapters: [
      { title: '夜明けの海', start: 0, scene: SEA_DAWN },
      { title: '木漏れ日の森', start: 40, scene: FOREST_DAY },
      { title: '雨の街角', start: 80, scene: CITY_RAIN },
      { title: '星降る夜', start: 120, scene: NIGHT_AURORA },
    ],
    cues: [
      { s: 6.5, e: 10.5, text: '夜明け前の海は、まだ眠っているように静かだ。' },
      { s: 11.5, e: 16, text: '水平線が少しずつ色づき、最初の光が波に落ちる。' },
      { s: 17.5, e: 22, text: '港を出る小さな船。今日も一日が始まる。' },
      { s: 26, e: 31, text: '♪ 波の音 ♪' },
      { s: 42, e: 46.5, text: '森の中では、時間の流れ方が少し違う。' },
      { s: 48, e: 53, text: '木漏れ日が、足もとに揺れる模様を描いていく。' },
      { s: 56, e: 61, text: '舞い落ちる葉の一枚一枚に、季節の音がある。' },
      { s: 66, e: 71, text: '♪ 鳥のさえずり ♪' },
      { s: 82, e: 86.5, text: '夕方、街に雨が降りはじめた。' },
      { s: 88, e: 93, text: '濡れた舗道に、窓の灯りがにじんで映る。' },
      { s: 96, e: 101, text: '家路を急ぐ車の光が、雨粒を照らしていく。' },
      { s: 106, e: 111, text: '♪ 雨音 ♪' },
      { s: 122, e: 126.5, text: '雲が晴れると、空いっぱいに星が広がった。' },
      { s: 128, e: 133, text: '北の空で、光のカーテンがゆっくりと揺れている。' },
      { s: 137, e: 142.5, text: '流れ星に願うなら ── また明日も、いい日でありますように。' },
      { s: 150, e: 156, text: '〈 ひと日の風景・おわり 〉' },
    ],
    comments: [
      { name: '水無月 ほたる', hue: 200, ago: '2日前', text: '1:20からの雨の街、窓の灯りが路面に映るところがずっと見ていられる…', likes: 842 },
      { name: 'しろくま工房', hue: 160, ago: '2日前', text: 'これ全部プログラムで描いてるの本当ですか？流れ星のタイミングまで気持ちいい。', likes: 515 },
      { name: '夜更かしのカノン', hue: 290, ago: '1日前', text: '寝る前に字幕オンで流してます。最後の一文で毎回ちょっと泣く', likes: 233 },
    ],
  },
  {
    id: 'fuyu',
    title: '冬の旅 — 雪の森と灯りの街',
    channel: '北窓フィルム',
    hue: 210,
    subs: 'チャンネル登録者数 6.2万人',
    views: '8.1万 回視聴',
    ago: '1週間前',
    likes: 3920,
    desc: '雪の降る森を抜けて、灯りのともる街へ。冬の夕暮れからオーロラの夜までをゆっくり旅する映像です。',
    tags: ['#冬', '#雪景色', '#BGV'],
    duration: 120,
    thumbT: 38,
    chapters: [
      { title: '雪の森', start: 0, scene: FOREST_SNOW },
      { title: '灯りの街', start: 30, scene: CITY_SNOW },
      { title: '冬の浜辺', start: 60, scene: SEA_WINTER },
      { title: '緑のオーロラ', start: 90, scene: NIGHT_GREEN },
    ],
    cues: [
      { s: 7, e: 11.5, text: '足音さえ雪に吸い込まれていく。' },
      { s: 33, e: 38, text: '街の窓に、ひとつずつ灯りがともる。' },
      { s: 63, e: 68, text: '冬の海は、夏よりも少しだけやさしい色をしている。' },
      { s: 93, e: 98, text: '凍った空気の向こうで、緑の光が揺れた。' },
    ],
    comments: [
      { name: 'こたつ係', hue: 30, ago: '5日前', text: '雪の森の静けさがすごい。音がないのに音が聞こえる。', likes: 128 },
      { name: 'Mika_北の窓', hue: 180, ago: '3日前', text: '1:30の緑のオーロラで一気に目が覚めました', likes: 64 },
    ],
  },
  {
    id: 'yunagi',
    title: '夕凪ドライブ — 夕日と港とネオンの夜',
    channel: '夕凪ラボ',
    hue: 330,
    subs: 'チャンネル登録者数 2.9万人',
    views: '4.4万 回視聴',
    ago: '2週間前',
    likes: 2110,
    desc: '海沿いの夕日からネオンの街、すみれ色の夜空まで。窓を開けて走る夜のドライブをイメージした映像です。',
    tags: ['#シティポップ', '#夜景', '#ドライブ'],
    duration: 100,
    thumbT: 48,
    chapters: [
      { title: '海沿いの夕日', start: 0, scene: SEA_DUSK },
      { title: 'ネオンの街', start: 25, scene: CITY_NEON },
      { title: '蛍の帰り道', start: 50, scene: FOREST_NIGHT },
      { title: 'すみれ色の空', start: 75, scene: NIGHT_VIOLET },
    ],
    cues: [
      { s: 7, e: 11, text: '窓を少しだけ開けて、潮の匂いを入れる。' },
      { s: 28, e: 33, text: '信号が変わるたびに、街の色が入れ替わる。' },
      { s: 53, e: 58, text: '帰り道の森で、小さな光がまたたいた。' },
      { s: 78, e: 83, text: 'すみれ色の空に、今日の終わりが溶けていく。' },
    ],
    comments: [{ name: 'ナイトドライバー', hue: 260, ago: '1週間前', text: 'ネオンの街のチャプターだけ無限にループしたい', likes: 92 }],
  },
  {
    id: 'amaoto',
    title: '雨音の街を歩く — 夕暮れから夜更けまで',
    channel: 'ソラノ映像舎',
    hue: 18,
    subs: 'チャンネル登録者数 18.4万人',
    views: '61万 回視聴',
    ago: '1か月前',
    likes: 20300,
    desc: '雨の日の街だけを集めたロングバージョン。夕暮れの雨、雪に変わる夜更け、晴れた後の星空まで。',
    tags: ['#雨音', '#作業用', '#環境映像'],
    duration: 120,
    thumbT: 20,
    chapters: [
      { title: '夕暮れの雨', start: 0, scene: CITY_RAIN },
      { title: 'みぞれの夜', start: 40, scene: CITY_SNOW },
      { title: '雨上がりの星', start: 80, scene: NIGHT_AURORA },
    ],
    cues: [
      { s: 7, e: 11, text: '傘をたたく音だけが、ずっと続いている。' },
      { s: 43, e: 48, text: '夜が深くなるにつれて、雨は雪に変わった。' },
      { s: 83, e: 88, text: '雲が切れて、濡れた街の上に星が出た。' },
    ],
    comments: [{ name: '雨の日図書館', hue: 120, ago: '3週間前', text: '勉強のお供にしています。車が通るタイミングが絶妙。', likes: 410 }],
  },
]

export const fmtTime = (s: number) => {
  const v = Math.max(0, Math.floor(s))
  const h = Math.floor(v / 3600)
  const m = Math.floor((v % 3600) / 60)
  const ss = String(v % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}
