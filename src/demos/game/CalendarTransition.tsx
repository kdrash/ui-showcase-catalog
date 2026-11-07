import { AnimatePresence, motion, useAnimate, useReducedMotion, type Variants } from 'motion/react'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'

/**
 * 学園生活シミュレーション風の「日付が進む」カレンダー演出(赤・黒・白のスタイリッシュJRPG調)。
 * - 空は素の WebGL + GLSL の全画面シェーダ。時間帯ごとの3色グラデーションを9段に量子化したセル調の空、45° 網点で描く太陽/月の光暈、
 *   しきい値で切った fbm のセル雲、雨のすじ・雪・稲光・星のまたたきまで1パスで描く。色や天気は JS 側で毎フレーム指数補間(React は再描画しない)
 * - 街並みは擬似乱数で生成した SVG シルエット(遠景・近景・校舎の時計塔・鉄塔・高架の電車)。窓明かりは時間帯で CSS 変数を切り替えて灯す
 * - 「次へ」で時間帯が進むと斜めのカットイン帯が走り、時間帯バーの赤いハイライトが spring で滑る。深夜の次は日めくりが破れて斜めに飛び、
 *   集中線のインパクトフレームとともに数字が行き過ぎて止まる spring で叩きつけられ、下の日付の帯が1マス流れる
 * - 「1週間すすめる」は 140ms 刻みで日付を早送り(横スミア・スピード線・天気のちらつき)し、最後に急停止して画面を揺らす。月が変わると巨大な月数字のカットイン
 * - イベント日は傾いたステッカーがポップし、台詞を1文字ずつ CSS の animation-delay だけでタイプ表示(再描画なし)
 * - → / Enter で次へ、Shift+→ / W で1週間(デモ内にフォーカスがあるときのみ)。新しい日付は aria-live で読み上げ
 * - useReducedMotion 時は短いフェードだけで即座に切り替え、シェーダの時間も止める
 */

const RED = '#e3141e'
const BLACK = '#0c0b0d'
const WHITE = '#f6f1e7'

function mulberry32(seed: number) {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const hash = (s: string) => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261)

/* ───────────── データ ───────────── */

const DAY_MS = 86400000
const START = Date.UTC(2026, 11, 8)

type Slot = { ja: string; en: string; time: string; top: string; mid: string; hor: string; sun: string; pos: [number, number, number]; night: number; moon: number; lit: number; late: number; far: string; line: string }
const SLOTS: Slot[] = [
  { ja: '早朝', en: 'DAWN', time: '05:50', top: '#272a6a', mid: '#b45a9c', hor: '#ffb08a', sun: '#ffe9c4', pos: [0.13, 0.3, 0.075], night: 0.5, moon: 0, lit: 0.15, late: 0.35, far: '#3a2f5c', line: 'まだ街は眠っている。' },
  { ja: '朝', en: 'MORNING', time: '07:40', top: '#2b78d8', mid: '#7fbef0', hor: '#fff0d4', sun: '#fffbe8', pos: [0.3, 0.64, 0.06], night: 0, moon: 0, lit: 0, late: 0, far: '#4d6f9c', line: '今日も一日が始まる。' },
  { ja: '昼休み', en: 'LUNCH BREAK', time: '12:30', top: '#1561d0', mid: '#4ba4ee', hor: '#cdeeff', sun: '#ffffff', pos: [0.52, 0.86, 0.055], night: 0, moon: 0, lit: 0, late: 0, far: '#5d84b8', line: '屋上で弁当を広げよう。' },
  { ja: '放課後', en: 'AFTER SCHOOL', time: '15:40', top: '#2a0d38', mid: '#d4141f', hor: '#ffae3c', sun: '#fff1ae', pos: [0.72, 0.34, 0.14], night: 0.05, moon: 0, lit: 0.25, late: 0, far: '#5a0d22', line: '放課後、どこへ寄り道しよう？' },
  { ja: '夜', en: 'EVENING', time: '19:20', top: '#04071d', mid: '#191c50', hor: '#4a2868', sun: '#f6f1e7', pos: [0.6, 0.74, 0.055], night: 1, moon: 1, lit: 1, late: 1, far: '#1b1a3e', line: '窓の外で街の灯りがともる。' },
  { ja: '深夜', en: 'MIDNIGHT', time: '00:30', top: '#020206', mid: '#0b0b1e', hor: '#1d1338', sun: '#e8e4d8', pos: [0.66, 0.87, 0.05], night: 1, moon: 1, lit: 0.12, late: 1, far: '#100f22', line: '…そろそろ寝よう。' },
]

type WeatherId = 0 | 1 | 2 | 3 | 4
const WEATHER = [
  { ja: '晴れ', en: 'SUNNY', cloud: 0.12, rain: 0, snow: 0, thunder: 0 },
  { ja: '曇り', en: 'CLOUDY', cloud: 0.88, rain: 0, snow: 0, thunder: 0 },
  { ja: '雨', en: 'RAIN', cloud: 0.95, rain: 1, snow: 0, thunder: 0 },
  { ja: '雪', en: 'SNOW', cloud: 0.8, rain: 0, snow: 1, thunder: 0 },
  { ja: '雷', en: 'STORM', cloud: 1, rain: 0.8, snow: 0, thunder: 1 },
] as const

const WEEK_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const WEEK_JA = ['日', '月', '火', '水', '木', '金', '土']
const MONTH_EN = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER']

type EventDef = { tag: string; short: string; lines: [string, string] }
const EVENTS: Record<string, EventDef> = {
  '12-8': { tag: '期末テスト', short: '試験', lines: ['今日はテスト初日だ…', '初日はなんとか乗り切った…'] },
  '12-11': { tag: 'テスト最終日', short: '試験', lines: ['最後の一科目。ここが正念場だ。', '終わった…！ 今夜はぐっすり眠れそう。'] },
  '12-19': { tag: '歳末市', short: '市', lines: ['商店街がいつもよりにぎやかだ。', '福引きの鐘が遠くで鳴っている。'] },
  '12-24': { tag: '聖夜', short: '聖夜', lines: ['街じゅうがそわそわしている。', 'イルミネーションが星みたいに瞬く。'] },
  '12-25': { tag: '終業式', short: '終業', lines: ['今日で二学期もおしまい。', '明日から冬休みだ！'] },
  '12-31': { tag: '大晦日', short: '晦日', lines: ['年越しの準備で家が慌ただしい。', '遠くで除夜の鐘が鳴っている。'] },
  '1-1': { tag: '元日', short: '元日', lines: ['あけましておめでとう！', 'おせちを食べすぎた…'] },
  '1-2': { tag: '初詣', short: '初詣', lines: ['神社は人でいっぱいだ。', 'おみくじは…中吉だった。'] },
  '1-8': { tag: '始業式', short: '始業', lines: ['三学期が始まる。', '冬休みボケがまだ抜けない…'] },
  '1-23': { tag: '冬祭り', short: '祭', lines: ['駅前に屋台が並んでいる。', '雪灯籠の明かりがきれいだ。'] },
}
const FULL_MOON: EventDef = { tag: '満月', short: '満月', lines: ['今夜は満月らしい。', '月がやけに明るい夜だ。'] }
const HOLIDAYS = new Set(['1-1', '1-11'])
const GOALS = [
  { ms: Date.UTC(2026, 11, 26), name: '冬休み' },
  { ms: Date.UTC(2027, 0, 8), name: '三学期' },
  { ms: Date.UTC(2027, 2, 24), name: '春休み' },
  { ms: Date.UTC(2027, 3, 7), name: '新学期' },
]

const moonAge = (ms: number) => {
  const jd = ms / DAY_MS + 2440588
  const s = 29.530588853
  return (((jd - 2451550.1) % s) + s) % s
}
const moonName = (a: number) =>
  a < 1.5 ? '新月' : a < 5.5 ? '三日月' : a < 9.5 ? '上弦' : a < 14 ? '十三夜' : a < 15.8 ? '満月' : a < 20 ? '寝待月' : a < 24 ? '下弦' : a < 28 ? '有明月' : '新月'

type DayInfo = { i: number; y: number; m: number; d: number; w: number; ms: number; weather: WeatherId; hi: number; lo: number; age: number; full: boolean; event: EventDef | null; holiday: boolean }
const dayCache = new Map<number, DayInfo>()
function dayInfo(i: number): DayInfo {
  const hit = dayCache.get(i)
  if (hit) return hit
  const ms = START + i * DAY_MS
  const dt = new Date(ms)
  const m = dt.getUTCMonth() + 1
  const d = dt.getUTCDate()
  const r = mulberry32(i * 7919 + 13)
  const v = r()
  const weather: WeatherId = i === 0 ? 0 : v < 0.36 ? 0 : v < 0.56 ? 1 : v < 0.72 ? 2 : v < 0.91 ? 3 : 4
  const hi = Math.round(5 + r() * 7 - (weather === 3 ? 5 : 0))
  const lo = hi - 4 - Math.round(r() * 4)
  const age = moonAge(ms)
  const full = Math.abs(age - 14.765) < 0.5
  const key = `${m}-${d}`
  const info: DayInfo = { i, y: dt.getUTCFullYear(), m, d, w: dt.getUTCDay(), ms, weather, hi, lo, age, full, event: EVENTS[key] ?? (full ? FULL_MOON : null), holiday: HOLIDAYS.has(key) }
  dayCache.set(i, info)
  return info
}

/* ───────────── 空(GLSL) ───────────── */

const SKY_VS = 'attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }'
const SKY_FS = /* glsl */ `
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform float uDpr;
uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uHor; uniform vec3 uSun; uniform vec3 uSunP;
uniform float uNight; uniform float uCloud; uniform float uRain; uniform float uSnow; uniform float uFlash; uniform float uMoon; uniform float uPhase; uniform float uFF;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.07 + 11.3; a *= 0.5; } return v; }
void main() {
  vec2 fc = gl_FragCoord.xy;
  vec2 uv = fc / uRes;
  float asp = uRes.x / uRes.y;
  vec2 q = vec2(uv.x * asp, uv.y);
  // セル調に量子化した空のグラデーション(少し斜め)
  float t = uv.y + (uv.x - 0.5) * 0.12;
  float tb = floor((t + (noise(q * 4.0) - 0.5) * 0.02) * 9.0) / 9.0;
  float ts = mix(t, tb, 0.8);
  vec3 col = mix(uHor, uMid, smoothstep(0.0, 0.5, ts));
  col = mix(col, uTop, smoothstep(0.42, 1.0, ts));
  // 太陽 / 月と 45° 網点の光暈
  vec2 sp = vec2(uSunP.x * asp, uSunP.y);
  float r = uSunP.z;
  float d = length(q - sp);
  vec2 g = mat2(0.7071, -0.7071, 0.7071, 0.7071) * fc / (9.0 * uDpr);
  float cell = length(fract(g) - 0.5);
  float glow = clamp(1.0 - (d - r) / (r * 3.4), 0.0, 1.0) * (1.0 - uCloud * 0.55);
  float dots = step(cell, glow * 0.56) * step(r * 1.12, d);
  col = mix(col, mix(col, uSun, 0.6), dots);
  float aa = 1.5 / uRes.y;
  float disc = 1.0 - smoothstep(r - aa, r, d);
  float off = (uPhase < 0.5 ? -1.0 : 1.0) * r * 2.1 * (1.0 - abs(uPhase * 2.0 - 1.0));
  float shade = 1.0 - smoothstep(r - aa, r, length(q - sp - vec2(off, 0.0)));
  float lit = disc * (1.0 - shade * uMoon);
  col = mix(col, col * 0.8 + vec3(0.04, 0.04, 0.07), disc * shade * uMoon);
  col = mix(col, uSun, lit * (1.0 - uCloud * 0.45));
  // 星
  vec2 sg = fc / (uDpr * 24.0);
  vec2 sid = floor(sg);
  float sh = hash(sid);
  vec2 so = vec2(hash(sid + 3.1), hash(sid + 7.7)) - 0.5;
  vec2 sf = fract(sg) - 0.5 - so * 0.6;
  float big = step(0.975, sh);
  float star = step(0.85, sh) * (1.0 - smoothstep(0.0, 0.07 + big * 0.05, length(sf)));
  star += big * (1.0 - smoothstep(0.0, 0.025, min(abs(sf.x), abs(sf.y)))) * (1.0 - smoothstep(0.0, 0.32, length(sf)));
  float tw = 0.55 + 0.45 * sin(uTime * (1.3 + sh * 3.0) + sh * 50.0);
  col += vec3(1.0, 0.96, 0.88) * star * tw * uNight * (1.0 - uCloud * 0.9) * smoothstep(0.3, 0.7, uv.y);
  // セル雲
  float cov = uCloud;
  vec2 cq = vec2(q.x * 1.1 + uTime * 0.012, q.y * 2.6);
  float c = fbm(cq * 1.7) * (0.55 + 0.65 * smoothstep(0.2, 0.75, uv.y));
  float th = mix(0.74, 0.36, cov);
  float cm = smoothstep(th, th + 0.012, c);
  float cs = smoothstep(th + 0.07, th + 0.082, c + (uv.y - 0.5) * 0.05);
  vec3 cl = mix(mix(uHor, vec3(1.0), 0.35), uMid * 1.4 + 0.05, uNight * 0.75);
  vec3 cd = mix(uMid, uTop, 0.55);
  vec3 grey = vec3(0.36, 0.37, 0.42) * (1.0 - uNight * 0.65);
  cl = mix(cl, grey * 1.15, uRain * 0.7);
  cd = mix(cd, grey * 0.7, uRain * 0.7);
  float rim = cm - smoothstep(th + 0.012, th + 0.03, c);
  col = mix(col, cd, cm * 0.95);
  col = mix(col, cl, cs * 0.95);
  col = mix(col, uTop * 0.5, rim * 0.5);
  // 曇天は彩度を落として暗く
  float lum = dot(col, vec3(0.3, 0.59, 0.11));
  col = mix(col, vec3(lum), cov * 0.38) * (1.0 - uRain * 0.22);
  // 雨のすじ
  vec2 rp = fc / uDpr; rp.x += rp.y * 0.28;
  float rain = 0.0;
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    float sc = 11.0 - fi * 4.0;
    vec2 rg = vec2(rp.x / sc, rp.y / (sc * 10.0) + uTime * (2.4 + fi * 0.9));
    vec2 rid = floor(rg);
    float rh = hash(rid + fi * 7.3);
    vec2 rf = fract(rg);
    float ry = fract(rf.y + rh);
    rain += step(0.72, rh) * step(abs(rf.x - 0.5), 0.07) * smoothstep(0.0, 0.7, ry) * step(ry, 0.78) * (0.55 + fi * 0.3);
  }
  col = mix(col, vec3(0.86, 0.9, 1.0), clamp(rain, 0.0, 1.0) * uRain * 0.55);
  // 雪
  float snow = 0.0;
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    float sc = 30.0 - fi * 12.0;
    vec2 np = fc / uDpr / sc;
    np.y += uTime * (0.6 + fi * 0.35);
    np.x += sin(np.y * 1.7 + fi * 3.0) * 0.25;
    vec2 nid = floor(np);
    float nh = hash(nid + fi * 5.1);
    vec2 nf = fract(np) - 0.5 - (vec2(hash(nid + 1.7), hash(nid + 9.2)) - 0.5) * 0.5;
    snow += step(0.55, nh) * (1.0 - smoothstep(0.08 + fi * 0.04, 0.12 + fi * 0.05, length(nf)));
  }
  col = mix(col, vec3(0.98, 0.97, 0.95), clamp(snow, 0.0, 1.0) * uSnow * 0.9);
  // 早送りの横スミア
  float row = floor(fc.y / (5.0 * uDpr));
  float hl = step(0.9, hash(vec2(row, floor(uTime * 24.0))));
  col = mix(col, mix(col, vec3(1.0), 0.5), hl * uFF);
  // 稲光・周辺減光・粒子
  col = mix(col, vec3(0.95, 0.95, 1.0), uFlash * 0.75);
  col *= 1.0 - 0.28 * pow(length(uv - vec2(0.5, 0.55)) * 1.25, 2.2);
  col += (hash(fc + fract(uTime) * 91.0) - 0.5) * 0.025;
  gl_FragColor = vec4(col, 1.0);
}`

type Vec = number[]
type SkyState = { top: Vec; mid: Vec; hor: Vec; sun: Vec; sunP: Vec; night: number; cloud: number; rain: number; snow: number; moon: number; phase: number; thunder: number }
const hex = (h: string) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16) / 255)
function skyTarget(slot: number, day: DayInfo): SkyState {
  const s = SLOTS[slot]
  const w = WEATHER[day.weather]
  return {
    top: hex(s.top),
    mid: hex(s.mid),
    hor: hex(s.hor),
    sun: hex(s.sun),
    sunP: [...s.pos],
    night: s.night,
    cloud: w.cloud,
    rain: w.rain,
    snow: w.snow,
    moon: s.moon,
    phase: day.age / 29.530588853,
    thunder: w.thunder,
  }
}

const UNIFORMS = ['uRes', 'uTime', 'uDpr', 'uTop', 'uMid', 'uHor', 'uSun', 'uSunP', 'uNight', 'uCloud', 'uRain', 'uSnow', 'uFlash', 'uMoon', 'uPhase', 'uFF'] as const
type U = Record<(typeof UNIFORMS)[number], WebGLUniformLocation | null>

function SkyCanvas({ target, ff, reduced }: { target: SkyState; ff: boolean; reduced: boolean }) {
  const host = useRef<HTMLDivElement>(null)
  const tgt = useRef(target)
  const ffRef = useRef(ff)
  const rmRef = useRef(reduced)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    tgt.current = target
  }, [target])
  useEffect(() => {
    ffRef.current = ff
    rmRef.current = reduced
  }, [ff, reduced])

  useEffect(() => {
    const el = host.current!
    const canvas = document.createElement('canvas')
    canvas.className = 'absolute inset-0 size-full'
    el.appendChild(canvas)
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' })
    if (!gl) {
      canvas.remove()
      setFailed(true)
      return
    }
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return s
    }
    const vs = sh(gl.VERTEX_SHADER, SKY_VS)
    const fs = sh(gl.FRAGMENT_SHADER, SKY_FS)
    const pr = gl.createProgram()!
    gl.attachShader(pr, vs)
    gl.attachShader(pr, fs)
    gl.linkProgram(pr)
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) {
      canvas.remove()
      setFailed(true)
      return
    }
    gl.useProgram(pr)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(pr, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const u = Object.fromEntries(UNIFORMS.map((k) => [k, gl.getUniformLocation(pr, k)])) as U

    let w = 1
    let h = 1
    let dpr = 1
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      w = Math.max(1, Math.round(el.clientWidth * dpr))
      h = Math.max(1, Math.round(el.clientHeight * dpr))
      canvas.width = w
      canvas.height = h
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(el)
    let visible = true
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
    io.observe(el)

    // 現在値(毎フレーム目標へ指数補間)
    const t0 = tgt.current
    const cur: SkyState = { ...t0, top: [...t0.top], mid: [...t0.mid], hor: [...t0.hor], sun: [...t0.sun], sunP: [...t0.sunP] }
    let ffAmt = 0
    let flash = 0
    let flashAgain = 0
    let time = 0
    let last = performance.now()
    let raf = 0
    const lerpV = (a: Vec, b: Vec, k: number) => {
      for (let i = 0; i < a.length; i++) a[i] += (b[i] - a[i]) * k
    }
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (!visible || document.hidden) return
      const T = tgt.current
      const rm = rmRef.current
      const k = rm ? 1 : 1 - Math.exp(-dt * (ffRef.current ? 22 : 3.4))
      lerpV(cur.top, T.top, k)
      lerpV(cur.mid, T.mid, k)
      lerpV(cur.hor, T.hor, k)
      lerpV(cur.sun, T.sun, k)
      lerpV(cur.sunP, T.sunP, rm ? 1 : 1 - Math.exp(-dt * (ffRef.current ? 22 : 2.6)))
      for (const key of ['night', 'cloud', 'rain', 'snow', 'moon', 'thunder'] as const) cur[key] += (T[key] - cur[key]) * k
      cur.phase = T.phase
      ffAmt += ((ffRef.current ? 1 : 0) - ffAmt) * (1 - Math.exp(-dt * 14))
      if (!rm) {
        time += dt
        // 雷: ときどき二度光る
        if (T.thunder > 0.5 && flash < 0.05 && Math.random() < dt * 0.35) {
          flash = 1
          flashAgain = 0.12
        }
        if (flashAgain > 0) {
          flashAgain -= dt
          if (flashAgain <= 0) flash = 0.85
        }
      }
      flash *= Math.exp(-dt * 11)
      gl.viewport(0, 0, w, h)
      gl.uniform2f(u.uRes, w, h)
      gl.uniform1f(u.uTime, time)
      gl.uniform1f(u.uDpr, dpr)
      gl.uniform3fv(u.uTop, cur.top)
      gl.uniform3fv(u.uMid, cur.mid)
      gl.uniform3fv(u.uHor, cur.hor)
      gl.uniform3fv(u.uSun, cur.sun)
      gl.uniform3fv(u.uSunP, cur.sunP)
      gl.uniform1f(u.uNight, cur.night)
      gl.uniform1f(u.uCloud, cur.cloud)
      gl.uniform1f(u.uRain, cur.rain)
      gl.uniform1f(u.uSnow, cur.snow)
      gl.uniform1f(u.uFlash, flash * cur.thunder)
      gl.uniform1f(u.uMoon, cur.moon)
      gl.uniform1f(u.uPhase, cur.phase)
      gl.uniform1f(u.uFF, ffAmt)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      gl.deleteBuffer(buf)
      gl.deleteProgram(pr)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      canvas.remove()
    }
  }, [])

  if (failed) {
    const c = (v: Vec) => `rgb(${v.map((x) => Math.round(x * 255)).join(',')})`
    return <div className="absolute inset-0 transition-[background] duration-700" style={{ background: `linear-gradient(to top, ${c(target.hor)}, ${c(target.mid)} 50%, ${c(target.top)})` }} />
  }
  return <div ref={host} className="absolute inset-0" />
}

/* ───────────── 街並み(SVG) ───────────── */

const SKYLINE = (() => {
  const r = mulberry32(2026)
  const H = 400
  const far: string[] = []
  let x = -30
  while (x < 1640) {
    const w = 46 + r() * 90
    const top = H - (130 + r() * 150)
    if (r() < 0.35) far.push(`M${x} ${H}V${top + 14}H${x + 10}V${top}H${x + w - 10}V${top + 14}H${x + w}V${H}Z`)
    else far.push(`M${x} ${H}V${top}H${x + w}V${H}Z`)
    if (r() < 0.25) far.push(`M${x + w / 2 - 1.5} ${top}v-${18 + r() * 24}h3V${top}Z`)
    x += w - 4
  }
  const near: string[] = []
  const winA: string[] = []
  const winB: string[] = []
  const blocks: [number, number, number][] = []
  x = -20
  while (x < 1640) {
    const w = 52 + r() * 80
    const school = x > 470 && x < 860
    const tower = x > 1120 && x < 1260
    if (school || tower) {
      x += 30
      continue
    }
    const hgt = 70 + r() * 130
    blocks.push([x, w, hgt])
    x += w + (r() < 0.3 ? 8 : -2)
  }
  for (const [bx, bw, bh] of blocks) {
    const top = H - bh
    near.push(`M${bx} ${H}V${top}H${bx + bw}V${H}Z`)
    if (r() < 0.3) near.push(`M${bx + 8} ${top}v-10h${bw * 0.4}v10Z`)
    for (let cx = bx + 7; cx < bx + bw - 10; cx += 13)
      for (let cy = top + 10; cy < H - 30; cy += 17) {
        const v = r()
        if (v < 0.34) winA.push(`M${cx.toFixed(0)} ${cy.toFixed(0)}h6v8h-6Z`)
        else if (v < 0.46) winB.push(`M${cx.toFixed(0)} ${cy.toFixed(0)}h6v8h-6Z`)
      }
  }
  // 校舎(時計塔つき)
  const sx = 520
  near.push(`M${sx} ${H}V${H - 118}H${sx + 300}V${H}Z`, `M${sx - 10} ${H - 118}h320v-8H${sx - 10}Z`, `M${sx + 125} ${H - 126}V${H - 200}l25-22 25 22V${H - 126}Z`)
  for (let cx = sx + 14; cx < sx + 290; cx += 22)
    for (let cy = H - 104; cy < H - 30; cy += 26) {
      if (cx > sx + 118 && cx < sx + 180) continue
      ;(r() < 0.3 ? winB : winA).push(`M${cx} ${cy}h12v12h-12Z`)
    }
  // 鉄塔
  const tx = 1190
  const towerPath = `M${tx - 34} ${H}L${tx - 4} ${H - 300}h8L${tx + 34} ${H}h-10L${tx} ${H - 220}L${tx - 24} ${H}Z M${tx - 26} ${H - 90}h52v6h-52Z M${tx - 16} ${H - 170}h32v5h-32Z M${tx - 1.5} ${H - 300}v-40h3v40Z`
  near.push(towerPath)
  return { far: far.join(''), near: near.join(''), winA: winA.join(''), winB: winB.join(''), clock: [sx + 150, H - 168] as const, beacon: [tx, H - 342] as const }
})()

function Skyline({ slot }: { slot: number }) {
  const s = SLOTS[slot]
  return (
    <svg viewBox="0 0 1600 400" preserveAspectRatio="xMidYMax slice" className="absolute inset-x-0 bottom-0 h-[46%] w-full" aria-hidden>
      <path d={SKYLINE.far} style={{ fill: s.far, transition: 'fill .9s' }} />
      <path d={SKYLINE.near} fill={BLACK} />
      {/* 高架と電車 */}
      <path d="M-10 352h1620v5H-10Z" fill={BLACK} />
      <g className="cdt-a" style={{ animation: 'cdt-train 11s linear infinite', transformBox: 'view-box' }}>
        <path d="M0 330h250l14 10v12H0Z" fill={BLACK} />
        <path d="M14 334h22v8H14ZM46 334h22v8H46ZM78 334h22v8H78ZM110 334h22v8H110ZM142 334h22v8H142ZM174 334h22v8H174ZM206 334h22v8H206Z" fill="#ffd77a" style={{ opacity: s.lit * 0.9 + 0.05, transition: 'opacity .9s' }} />
      </g>
      <path d={SKYLINE.winA} fill="#ffd27a" style={{ opacity: s.lit, transition: 'opacity .9s' }} />
      <path d={SKYLINE.winB} fill="#ffe7b0" className="cdt-a" style={{ opacity: s.late, transition: 'opacity .9s', animation: 'cdt-flicker 5s steps(1) infinite' }} />
      <circle cx={SKYLINE.clock[0]} cy={SKYLINE.clock[1]} r="11" fill={WHITE} style={{ opacity: 0.35 + s.lit * 0.65, transition: 'opacity .9s' }} />
      <path d={`M${SKYLINE.clock[0]} ${SKYLINE.clock[1]}v-8M${SKYLINE.clock[0]} ${SKYLINE.clock[1]}h6`} stroke={BLACK} strokeWidth="2" />
      <circle cx={SKYLINE.beacon[0]} cy={SKYLINE.beacon[1]} r="4" fill={RED} className="cdt-a" style={{ animation: 'cdt-blink 1.6s steps(1) infinite' }} />
    </svg>
  )
}

/* ───────────── アイコン ───────────── */

const CLOUD = 'M6.5 18h10.8a4.2 4.2 0 0 0 .4-8.4A6 6 0 0 0 6.2 11a3.5 3.5 0 0 0 .3 7Z'
function WeatherIcon({ w, animate = true }: { w: WeatherId; animate?: boolean }) {
  const a = (anim: string, delay = 0): CSSProperties | undefined => (animate ? { animation: anim, animationDelay: `${delay}s`, transformBox: 'fill-box', transformOrigin: 'center' } : undefined)
  return (
    <svg viewBox="0 0 24 24" className="size-full overflow-visible" aria-hidden>
      {w === 0 && (
        <>
          <g className="cdt-a" style={a('cdt-spin 9s linear infinite')}>
            {Array.from({ length: 8 }, (_, i) => (
              <path key={i} d="M11 1.2h2l-1 4.2Z" fill={RED} transform={`rotate(${i * 45} 12 12)`} />
            ))}
          </g>
          <circle cx="12" cy="12" r="5.2" fill={WHITE} stroke={BLACK} strokeWidth="1.4" />
          <circle cx="13.6" cy="10.4" r="1.4" fill={RED} />
        </>
      )}
      {w === 1 && (
        <>
          <path d={CLOUD} fill="#8f8a94" transform="translate(4 -4) scale(.8)" className="cdt-a" style={a('cdt-drift 3.4s ease-in-out infinite', -1.2)} />
          <path d={CLOUD} fill={WHITE} stroke={BLACK} strokeWidth="1.3" className="cdt-a" style={a('cdt-drift 4s ease-in-out infinite')} />
        </>
      )}
      {(w === 2 || w === 4) && (
        <>
          {[7, 11.5, 16].map((x, i) => (
            <path key={x} d={`M${x} 17.5l-1.6 4`} stroke={w === 4 ? WHITE : '#9cc8ff'} strokeWidth="1.7" strokeLinecap="round" className="cdt-a" style={a('cdt-rain .7s linear infinite', i * 0.23)} />
          ))}
          <path d={CLOUD} transform="translate(0 -3)" fill={w === 4 ? '#3a3640' : WHITE} stroke={w === 4 ? WHITE : BLACK} strokeWidth="1.3" />
          {w === 4 && <path d="M13 9.5 9 16h3l-1.4 6 5.4-8h-3.2l1.6-4.5Z" fill="#ffe14a" stroke={BLACK} strokeWidth=".8" className="cdt-a" style={a('cdt-bolt 1.8s steps(1) infinite')} />}
        </>
      )}
      {w === 3 && (
        <>
          {[6.5, 11.5, 16.5].map((x, i) => (
            <circle key={x} cx={x} cy="18.5" r="1.4" fill={WHITE} stroke={BLACK} strokeWidth=".6" className="cdt-a" style={a('cdt-snow 1.9s linear infinite', i * 0.6)} />
          ))}
          <path d={CLOUD} transform="translate(0 -3)" fill={WHITE} stroke={BLACK} strokeWidth="1.3" />
        </>
      )}
    </svg>
  )
}

function MoonIcon({ age }: { age: number }) {
  const p = age / 29.530588853
  const r = 9
  const c = 12
  const k = Math.cos(2 * Math.PI * p)
  const waxing = p < 0.5
  const outer = waxing ? 1 : 0
  const term = waxing ? (k > 0 ? 0 : 1) : k > 0 ? 1 : 0
  const d = `M${c} ${c - r}A${r} ${r} 0 0 ${outer} ${c} ${c + r}A${Math.abs(k) * r} ${r} 0 0 ${term} ${c} ${c - r}Z`
  return (
    <svg viewBox="0 0 24 24" className="size-full" aria-hidden>
      <circle cx={c} cy={c} r={r} fill="#2c2a35" />
      <path d={d} fill="#fff4cf" />
      <circle cx={c} cy={c} r={r} fill="none" stroke={WHITE} strokeWidth=".8" />
    </svg>
  )
}

/* ───────────── 切り抜き文字 ───────────── */

const RANSOM_FONTS: CSSProperties[] = [
  { fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 900 },
  { fontFamily: "'Playfair Display', 'Yu Mincho', serif", fontWeight: 600, fontStyle: 'italic' },
  { fontFamily: "'Space Grotesk', 'Noto Sans JP', sans-serif", fontWeight: 700 },
  { fontFamily: "'Orbitron', 'Noto Sans JP', sans-serif", fontWeight: 900 },
  { fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 500 },
]
const SCHEMES: CSSProperties[] = [
  { background: WHITE, color: BLACK },
  { background: BLACK, color: WHITE },
  { background: RED, color: WHITE },
  { background: WHITE, color: RED },
  { background: BLACK, color: RED },
]
function Ransom({ text, size, delay = 0, reduced, shadow = BLACK }: { text: string; size: string; delay?: number; reduced: boolean; shadow?: string }) {
  const letters = useMemo(() => {
    const r = mulberry32(hash(text))
    let prev = -1
    return [...text].map((ch) => {
      let s = Math.floor(r() * SCHEMES.length)
      if (s === prev) s = (s + 1 + Math.floor(r() * (SCHEMES.length - 1))) % SCHEMES.length
      prev = s
      const j = () => +(r() * 9).toFixed(1)
      return {
        ch,
        style: { ...SCHEMES[s], ...RANSOM_FONTS[Math.floor(r() * RANSOM_FONTS.length)] },
        rot: (r() - 0.5) * 20,
        scale: 0.86 + r() * 0.3,
        dy: ((r() - 0.5) * 0.18).toFixed(2),
        clip: `polygon(${j()}% ${j()}%, 100% ${j()}%, ${100 - j()}% 100%, ${j()}% ${100 - j()}%)`,
      }
    })
  }, [text])
  return (
    <span aria-hidden className="inline-flex flex-nowrap items-center" style={{ fontSize: size, filter: `drop-shadow(0.07em 0.07em 0 ${shadow})` }}>
      {letters.map((l, i) =>
        l.ch === ' ' ? (
          <span key={i} className="inline-block w-[0.25em]" />
        ) : (
          <motion.span
            key={i}
            className="inline-block leading-none"
            style={{ ...l.style, fontSize: `${l.scale}em`, padding: '0.1em 0.14em 0.13em', marginRight: '-0.02em', clipPath: l.clip }}
            initial={reduced ? { opacity: 0 } : { opacity: 0, x: '1.4em', y: '-0.4em', rotate: l.rot + 40, scale: 2 }}
            animate={{ opacity: 1, x: 0, y: `${l.dy}em`, rotate: l.rot, scale: 1 }}
            transition={reduced ? { duration: 0.2 } : { type: 'spring', stiffness: 620, damping: 17, delay: delay + i * 0.05 }}
          >
            {l.ch}
          </motion.span>
        ),
      )}
    </span>
  )
}

/* ───────────── 日めくり ───────────── */

type Mode = 'init' | 'slot' | 'tear' | 'ff' | 'land'
const ZIG = (() => {
  const pts: string[] = []
  for (let i = 0; i <= 40; i++) pts.push(`${(i / 40) * 100}% ${i % 2 ? 0 : 2.6}%`)
  return `polygon(${pts.join(',')}, 100% 92%, 96% 100%, 0 100%)`
})()
const TAG_CLIP = 'polygon(4% 10%, 30% 0, 52% 8%, 78% 0, 100% 14%, 94% 50%, 100% 90%, 70% 100%, 46% 92%, 18% 100%, 0 86%, 6% 48%)'
const STICKER = 'polygon(0 18%, 14% 0, 34% 12%, 52% 0, 70% 10%, 92% 0, 100% 26%, 94% 52%, 100% 80%, 82% 100%, 60% 90%, 38% 100%, 16% 92%, 0 100%, 6% 60%)'

const pageVariants: Variants = {
  enter: (m: Mode) => (m === 'ff' ? { x: '55%', skewX: -24, opacity: 0, zIndex: 1 } : m === 'init' ? { opacity: 1, zIndex: 1 } : { opacity: 1, zIndex: 1 }),
  center: (m: Mode) => ({ x: 0, y: 0, skewX: 0, rotate: 0, opacity: 1, zIndex: 1, transition: m === 'ff' ? { duration: 0.11, ease: 'easeOut' } : { duration: 0 } }),
  exit: (m: Mode) =>
    m === 'ff' || m === 'land'
      ? { x: '-70%', skewX: 26, opacity: 0, zIndex: 3, transition: { duration: 0.12, ease: 'easeIn' } }
      : m === 'tear'
        ? {
            rotate: [0, -3, 34],
            x: ['0%', '0%', '110%'],
            y: ['0%', '7%', '-120%'],
            opacity: [1, 1, 0.9],
            zIndex: 3,
            transition: { duration: 0.62, times: [0, 0.22, 1], ease: ['easeOut', [0.55, 0, 0.85, 0.35]] },
          }
        : { opacity: 0, zIndex: 3, transition: { duration: 0.2 } },
}
const reducedPage: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, zIndex: 3, transition: { duration: 0.2 } },
}

function slam(mode: Mode, reduced: boolean, delay: number, from: { scale: number; rotate: number; y?: string; x?: string }) {
  if (reduced || mode === 'ff' || mode === 'init') return { initial: false as const }
  const d = mode === 'land' ? delay * 0.5 : delay + 0.16
  return {
    initial: { opacity: 0, scale: from.scale * (mode === 'land' ? 1.35 : 1), rotate: from.rotate, x: from.x ?? 0, y: from.y ?? 0 },
    animate: { opacity: 1, scale: 1, rotate: 0, x: 0, y: 0 },
    transition: { type: 'spring' as const, stiffness: 640, damping: 15, delay: d, opacity: { duration: 0.05, delay: d } },
  }
}

function DatePage({ day, mode, reduced }: { day: DayInfo; mode: Mode; reduced: boolean }) {
  const digits = String(day.d).split('')
  const red = day.w === 0 || day.holiday
  const smear = mode === 'ff'
  return (
    <motion.div
      custom={mode}
      variants={reduced ? reducedPage : pageVariants}
      initial="enter"
      animate="center"
      exit="exit"
      className="absolute inset-0 origin-top-left"
    >
      <div className="absolute inset-0" style={{ background: WHITE, clipPath: ZIG }}>
        {/* 赤い網点のすみ */}
        <div
          className="absolute -bottom-[2em] -left-[2em] size-[13em]"
          style={{ backgroundImage: `radial-gradient(${RED} 30%, transparent 33%)`, backgroundSize: '0.62em 0.62em', maskImage: 'radial-gradient(circle at 30% 70%, #000 0, transparent 60%)', WebkitMaskImage: 'radial-gradient(circle at 30% 70%, #000 0, transparent 60%)', opacity: 0.55 }}
        />
        <div className="absolute top-[0.95em] left-[1.1em] flex items-center gap-[0.5em]">
          <span className="-skew-x-12 bg-[#e3141e] px-[0.45em] font-['Orbitron'] text-[0.72em] font-black tracking-[0.18em] text-[#f6f1e7]">TODAY</span>
          <span className="font-['Orbitron'] text-[0.66em] font-bold tracking-[0.3em] text-[#0c0b0d]">
            {MONTH_EN[day.m - 1]} · {day.y}
          </span>
        </div>
        {/* 月 */}
        <motion.div className="absolute top-[1.6em] left-[0.7em] origin-bottom-left" {...slam(mode, reduced, 0, { scale: 2.2, rotate: -24, y: '-30%' })}>
          <span
            className="block font-['Playfair_Display'] leading-[0.95] font-semibold text-[#e3141e] italic"
            style={{ fontSize: '6.4em', textShadow: `0.05em 0.05em 0 ${BLACK}`, letterSpacing: '-0.04em' }}
          >
            {day.m}
          </span>
        </motion.div>
        <span className="absolute top-[5.5em] left-[3.4em] -rotate-6 bg-[#0c0b0d] px-[0.3em] text-[1.5em] leading-tight font-black text-[#f6f1e7]">月</span>
        {/* 斜めの区切り */}
        <div className="absolute top-[2.2em] left-[8.9em] h-[8.6em] w-[1em] -skew-x-[20deg] bg-[#0c0b0d]" />
        <div className="absolute top-[2.6em] left-[10.1em] h-[7.6em] w-[0.28em] -skew-x-[20deg] bg-[#e3141e]" />
        {/* 日 */}
        <div className="absolute top-[1.9em] left-[10.9em] flex items-end" style={{ fontSize: '1em' }}>
          {digits.map((ch, i) => {
            const boxed = i === digits.length - 1
            return (
              <motion.span
                key={i}
                className="relative inline-block origin-bottom"
                {...slam(mode, reduced, 0.06 + i * 0.06, { scale: 2.8, rotate: i % 2 ? 28 : -32, y: '-40%' })}
              >
                <span
                  className={`block font-['Noto_Sans_JP'] font-black ${boxed ? 'rotate-[4deg] text-[#f6f1e7]' : red ? 'text-[#e3141e]' : 'text-[#0c0b0d]'}`}
                  style={{
                    fontSize: digits.length === 1 ? '10.2em' : '9.2em',
                    lineHeight: 0.92,
                    letterSpacing: '-0.05em',
                    padding: boxed ? '0 0.08em 0.02em 0.04em' : 0,
                    background: boxed ? (red ? RED : BLACK) : undefined,
                    clipPath: boxed ? 'polygon(3% 4%, 96% 0, 100% 92%, 0 100%)' : undefined,
                    boxShadow: boxed ? `0.06em 0.06em 0 ${RED}` : undefined,
                    textShadow: smear ? `0.08em 0 0 rgba(12,11,13,.35), 0.2em 0 0 rgba(12,11,13,.18), 0.36em 0 0 rgba(12,11,13,.08)` : undefined,
                  }}
                >
                  {ch}
                </span>
              </motion.span>
            )
          })}
        </div>
      </div>
      {/* 曜日タグ(ページの縁からはみ出す) */}
      <motion.div className="absolute top-[0.5em] -right-[2.6em] z-[2]" {...slam(mode, reduced, 0.2, { scale: 1.8, rotate: 40, x: '60%' })}>
        <div className="rotate-[9deg]" style={{ filter: `drop-shadow(0.22em 0.22em 0 ${red ? BLACK : RED})` }}>
          <div className="flex flex-col items-center px-[1.1em] pt-[0.55em] pb-[0.7em] leading-none" style={{ background: red ? RED : BLACK, clipPath: TAG_CLIP }}>
            <span className="font-['Noto_Sans_JP'] text-[2.5em] font-black text-[#f6f1e7]">{WEEK_JA[day.w]}</span>
            <span className={`mt-[0.15em] font-['Orbitron'] text-[0.95em] font-black tracking-[0.12em] italic ${red ? 'text-[#0c0b0d]' : 'text-[#e3141e]'}`}>{WEEK_EN[day.w]}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

/** 日が変わった瞬間の集中線 + 網点のインパクトフレーム */
const SPEED_LINES = (() => {
  const r = mulberry32(77)
  return Array.from({ length: 64 }, (_, i) => {
    const a = (i / 64) * Math.PI * 2 + r() * 0.06
    const wd = 0.012 + r() * 0.03
    const inner = 34 + r() * 26
    const p = (ang: number, rad: number) => `${(Math.cos(ang) * rad).toFixed(1)},${(Math.sin(ang) * rad * 0.62).toFixed(1)}`
    return { pts: `${p(a - wd, 160)} ${p(a + wd, 160)} ${p(a, inner)}`, red: i % 5 === 0 }
  })
})()
function ImpactFrame() {
  return (
    <div className="pointer-events-none absolute top-1/2 left-1/2 size-0" aria-hidden>
      <motion.div
        className="absolute top-1/2 left-1/2 size-[60em] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ backgroundImage: `radial-gradient(${BLACK} 32%, transparent 35%)`, backgroundSize: '0.7em 0.7em', maskImage: 'radial-gradient(circle, transparent 18%, #000 30%, transparent 62%)', WebkitMaskImage: 'radial-gradient(circle, transparent 18%, #000 30%, transparent 62%)' }}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: [0, 0.85, 0], scale: [0.6, 1, 1.15] }}
        transition={{ duration: 0.5, times: [0, 0.25, 1], delay: 0.16 }}
      />
      <motion.svg
        viewBox="-160 -100 320 200"
        className="absolute top-1/2 left-1/2 h-[200em] w-[320em] -translate-x-1/2 -translate-y-1/2 overflow-visible"
        initial={{ opacity: 0, scale: 1.2 }}
        animate={{ opacity: [0, 1, 1, 0], scale: [1.2, 1, 1, 0.96] }}
        transition={{ duration: 0.55, times: [0, 0.12, 0.6, 1], delay: 0.16 }}
      >
        {SPEED_LINES.map((l, i) => (
          <polygon key={i} points={l.pts} fill={l.red ? RED : BLACK} />
        ))}
      </motion.svg>
    </div>
  )
}

/* ───────────── 時間帯バー ───────────── */

function TimeBand({ slot, reduced }: { slot: number; reduced: boolean }) {
  return (
    <div className="cdt-band absolute z-[6]" aria-hidden>
      <div className="absolute inset-0 -rotate-[3deg] bg-[#0c0b0d] shadow-[0_0.25em_0_#e3141e]">
        <div className="absolute inset-x-0 top-[0.18em] h-px bg-[#f6f1e7]/30" />
        <div className="cdt-slots absolute top-0 bottom-0 flex items-center">
          <motion.div
            className="absolute top-[-0.55em] left-0 h-[calc(100%+1.1em)] w-[5.6em]"
            animate={{ x: `${slot * 5.4 - 0.1}em` }}
            transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 26 }}
          >
            <motion.div
              key={slot}
              className="size-full"
              style={{ background: RED, clipPath: 'polygon(0 10%, 30% 0, 100% 6%, 94% 52%, 100% 100%, 60% 92%, 6% 100%, 4% 50%)', filter: `drop-shadow(0.2em 0.2em 0 ${WHITE})` }}
              initial={reduced ? false : { scaleY: 0.4, scaleX: 1.3, rotate: -8 }}
              animate={{ scaleY: 1, scaleX: 1, rotate: -4 }}
              transition={{ type: 'spring', stiffness: 700, damping: 14 }}
            />
          </motion.div>
          {SLOTS.map((s, i) => (
            <div key={s.ja} className="relative flex w-[5.4em] flex-col items-center leading-none">
              <span className={`font-['Noto_Sans_JP'] font-black transition-[color,transform] duration-200 ${i === slot ? 'scale-125 text-[#f6f1e7]' : i < slot ? 'text-[#f6f1e7]/35' : 'text-[#f6f1e7]/85'}`} style={{ fontSize: '1.08em' }}>
                {s.ja}
              </span>
              <span className={`mt-[0.3em] font-['Orbitron'] text-[0.42em] font-bold tracking-[0.12em] ${i === slot ? 'text-[#0c0b0d]' : 'text-[#f6f1e7]/45'}`}>{s.en}</span>
            </div>
          ))}
          <div className="cdt-time ml-[1.2em] items-center gap-[0.5em] whitespace-nowrap">
            <span className="font-['Orbitron'] text-[0.5em] font-bold tracking-[0.3em] text-[#e3141e]">TIME</span>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={slot}
                className="inline-block font-['Orbitron'] text-[1.45em] font-black text-[#f6f1e7] italic tabular-nums"
                initial={reduced ? { opacity: 0 } : { y: '-80%', opacity: 0, rotateX: 80 }}
                animate={{ y: 0, opacity: 1, rotateX: 0 }}
                exit={reduced ? { opacity: 0 } : { y: '80%', opacity: 0, rotateX: -80 }}
                transition={{ duration: reduced ? 0.15 : 0.22, ease: [0.2, 1.4, 0.4, 1] }}
              >
                {SLOTS[slot].time}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ───────────── 日付の帯 ───────────── */

const PITCH = 6.6
function DayStrip({ day, ff, reduced }: { day: number; ff: boolean; reduced: boolean }) {
  const ids: number[] = []
  for (let i = day - 2; i <= day + 11; i++) if (i >= -2) ids.push(i)
  return (
    <div className="cdt-strip absolute z-[5]" aria-hidden>
      <motion.div className="cdt-strip-in absolute inset-0 -rotate-2" animate={{ skewX: ff ? -14 : 0 }} transition={ff || reduced ? { duration: reduced ? 0 : 0.12 } : { type: 'spring', stiffness: 700, damping: 13 }}>
        <div className="absolute inset-x-[-10%] top-[1.5em] bottom-[0.1em] bg-[#0c0b0d]/80" style={{ clipPath: 'polygon(0 0, 100% 8%, 100% 100%, 0 92%)' }} />
        {ids.map((i) => {
          const info = dayInfo(i)
          const o = i - day
          const cur = o === 0
          const past = o < 0
          const red = info.w === 0 || info.holiday
          return (
            <motion.div
              key={i}
              className="absolute top-[0.9em] h-[4.5em] w-[6em]"
              initial={false}
              animate={{ x: `${o * PITCH + (o > 0 ? 0.9 : 0)}em`, scale: cur ? 1.14 : 1, y: cur ? '-0.25em' : '0em' }}
              transition={reduced ? { duration: 0 } : ff ? { duration: 0.12, ease: 'linear' } : { type: 'spring', stiffness: 380, damping: 24 }}
            >
              {info.d === 1 && <span className="absolute -top-[1.05em] left-[0.2em] -rotate-6 bg-[#e3141e] px-[0.35em] text-[0.8em] leading-snug font-black text-[#f6f1e7] shadow-[0.12em_0.12em_0_#0c0b0d]">{info.m}月</span>}
              {cur && <span className="absolute -top-[1.2em] right-[-0.3em] z-[1] rotate-6 bg-[#f6f1e7] px-[0.3em] font-['Orbitron'] text-[0.62em] leading-snug font-black text-[#e3141e] ring-1 ring-[#0c0b0d]">TODAY</span>}
              <div
                className={`relative size-full ${cur ? 'bg-[#e3141e] text-[#f6f1e7]' : 'bg-[#f6f1e7] text-[#0c0b0d]'} ${past ? 'opacity-50' : ''}`}
                style={{ clipPath: 'polygon(0 4%, 100% 0, 97% 100%, 3% 96%)', boxShadow: 'none' }}
              >
                <span className={`absolute top-[0.45em] left-[0.5em] font-['Orbitron'] text-[0.56em] font-black tracking-wider ${cur ? 'text-[#0c0b0d]' : red ? 'text-[#e3141e]' : ''}`}>{WEEK_EN[info.w]}</span>
                <span className={`absolute bottom-[0.1em] left-[0.35em] font-['Noto_Sans_JP'] text-[2.3em] leading-none font-black tracking-tighter ${!cur && red ? 'text-[#e3141e]' : ''}`}>{info.d}</span>
                <span className="absolute top-[0.35em] right-[0.35em] size-[1.5em]">
                  <WeatherIcon w={info.weather} animate={false} />
                </span>
                {info.event && <span className={`absolute right-[0.2em] bottom-[0.35em] -rotate-6 px-[0.25em] text-[0.62em] leading-snug font-black ${cur ? 'bg-[#0c0b0d] text-[#f6f1e7]' : 'bg-[#e3141e] text-[#f6f1e7]'}`}>{info.event.short}</span>}
                {past && <span className="absolute inset-0" style={{ background: `linear-gradient(to top right, transparent 46%, ${RED} 46%, ${RED} 54%, transparent 54%)` }} />}
              </div>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}

/* ───────────── カットイン類 ───────────── */

function SlotSwipe({ slot }: { slot: number }) {
  const text = `${SLOTS[slot].en} ▶ ${SLOTS[slot].ja} ▶ `
  return (
    <div className="pointer-events-none absolute inset-0 z-[20] overflow-hidden" aria-hidden>
      <motion.div
        className="absolute top-[38%] left-[-30%] h-[3.4em] w-[160%] -rotate-[11deg] overflow-hidden border-y-[0.25em] border-[#e3141e] bg-[#0c0b0d]"
        initial={{ x: '-105%' }}
        animate={{ x: ['-105%', '0%', '0%', '105%'] }}
        transition={{ duration: 0.62, times: [0, 0.3, 0.55, 1], ease: [[0.2, 0.9, 0.3, 1], 'linear', [0.7, 0, 0.9, 0.4]] }}
      >
        <motion.div className="flex h-full items-center whitespace-nowrap" initial={{ x: 0 }} animate={{ x: '-12%' }} transition={{ duration: 0.62, ease: 'linear' }}>
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className={`mr-[0.6em] font-['Orbitron'] text-[1.9em] font-black italic ${i % 2 ? 'text-[#e3141e]' : 'text-[#f6f1e7]'}`}>
              {text}
            </span>
          ))}
        </motion.div>
      </motion.div>
      <motion.div
        className="absolute top-[48%] left-[-30%] h-[0.7em] w-[160%] -rotate-[11deg] bg-[#f6f1e7]"
        initial={{ x: '105%' }}
        animate={{ x: ['105%', '0%', '0%', '-105%'] }}
        transition={{ duration: 0.62, times: [0, 0.32, 0.55, 1], ease: [[0.2, 0.9, 0.3, 1], 'linear', [0.7, 0, 0.9, 0.4]] }}
      />
    </div>
  )
}

function MonthSlam({ info, reduced }: { info: DayInfo; reduced: boolean }) {
  const newYear = info.m === 1
  if (reduced)
    return (
      <motion.div className="pointer-events-none absolute inset-0 z-[30] grid place-items-center bg-[#0c0b0d]/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} aria-hidden>
        <span className="font-['Playfair_Display'] text-[9em] leading-none font-semibold text-[#f6f1e7] italic">
          {info.m}
          <span className="font-['Noto_Sans_JP'] text-[0.3em] font-black not-italic">月</span>
        </span>
      </motion.div>
    )
  const ease = [0.2, 0.9, 0.3, 1] as const
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-[30] overflow-hidden"
      style={{ fontSize: 'min(6cqh, 3.4cqw)' }}
      exit={{ x: '110%', skewX: -18, transition: { duration: 0.26, ease: [0.7, 0, 0.9, 0.4] } }}
      aria-hidden
    >
      <motion.div className="absolute inset-0 bg-[#f6f1e7]" initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 0.25 }} />
      <motion.div
        className="absolute top-[14%] left-[-20%] h-[72%] w-[140%] -rotate-[8deg] bg-[#e3141e]"
        style={{ clipPath: 'polygon(0 6%, 100% 0, 100% 94%, 0 100%)' }}
        initial={{ scaleX: 0, originX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.2, ease }}
      />
      <motion.div
        className="absolute top-[10%] left-[-20%] h-[1.1em] w-[140%] -rotate-[8deg] bg-[#0c0b0d]"
        initial={{ x: '-100%' }}
        animate={{ x: '0%' }}
        transition={{ duration: 0.22, delay: 0.04, ease }}
      />
      <motion.div
        className="absolute top-[20%] left-[-20%] h-[60%] w-[140%] -rotate-[8deg]"
        style={{ backgroundImage: `radial-gradient(${BLACK} 30%, transparent 33%)`, backgroundSize: '0.55em 0.55em', maskImage: 'linear-gradient(100deg, transparent 10%, #000 35%, transparent 70%)', WebkitMaskImage: 'linear-gradient(100deg, transparent 10%, #000 35%, transparent 70%)' }}
        initial={{ x: '-30%', opacity: 0 }}
        animate={{ x: '0%', opacity: 0.45 }}
        transition={{ duration: 0.4, delay: 0.08 }}
      />
      <motion.div
        className="absolute top-[76%] left-[-20%] h-[2.2em] w-[140%] -rotate-[8deg] bg-[#0c0b0d]"
        style={{ clipPath: 'polygon(0 0, 100% 30%, 100% 70%, 0 100%)' }}
        initial={{ x: '100%' }}
        animate={{ x: '0%' }}
        transition={{ duration: 0.24, delay: 0.06, ease }}
      />
      <div className="absolute inset-0 grid place-items-center">
        <div className="flex -rotate-[8deg] items-center gap-[0.5em]">
          <motion.span
            className="font-['Playfair_Display'] leading-[0.8] font-semibold text-[#f6f1e7] italic"
            style={{ fontSize: '10em', letterSpacing: '-0.05em', textShadow: `0.045em 0.045em 0 ${BLACK}` }}
            initial={{ scale: 3.4, rotate: -30, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 520, damping: 14, delay: 0.12, opacity: { duration: 0.05, delay: 0.12 } }}
          >
            {info.m}
          </motion.span>
          <div className="flex flex-col items-start gap-[0.35em]">
            <motion.span
              className="bg-[#0c0b0d] px-[0.15em] font-['Noto_Sans_JP'] text-[2.4em] leading-tight font-black text-[#f6f1e7] shadow-[0.08em_0.08em_0_#f6f1e7]"
              initial={{ x: '3em', opacity: 0, rotate: 20 }}
              animate={{ x: 0, opacity: 1, rotate: -4 }}
              transition={{ type: 'spring', stiffness: 600, damping: 16, delay: 0.24 }}
            >
              月
            </motion.span>
            <Ransom text={MONTH_EN[info.m - 1]} size="1.35em" delay={0.3} reduced={false} />
            {newYear && <Ransom text={`${info.y} 新年`} size="1.1em" delay={0.55} reduced={false} />}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

const STREAKS = (() => {
  const r = mulberry32(9)
  return Array.from({ length: 22 }, () => ({ top: r() * 100, w: 20 + r() * 40, h: r() < 0.3 ? 3 : 1.5, d: r() * 0.3, dur: 0.18 + r() * 0.16, dark: r() < 0.35 }))
})()
function FastForward({ count }: { count: number }) {
  return (
    <motion.div className="pointer-events-none absolute inset-0 z-[12] overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.08 } }} aria-hidden>
      {STREAKS.map((s, i) => (
        <span
          key={i}
          className="absolute left-0"
          style={{ top: `${s.top}%`, width: `${s.w}%`, height: s.h, background: s.dark ? BLACK : WHITE, opacity: 0.7, animation: `cdt-streak ${s.dur}s linear ${-s.d}s infinite` }}
        />
      ))}
      <div className="cdt-ff absolute flex items-center gap-[0.4em]">
        <span className="-skew-x-12 bg-[#e3141e] px-[0.4em] font-['Orbitron'] text-[1.1em] font-black text-[#f6f1e7] italic shadow-[0.15em_0.15em_0_#0c0b0d]">▶▶ FAST</span>
        <span className="-skew-x-12 bg-[#0c0b0d] px-[0.4em] text-[1.1em] font-black text-[#f6f1e7]">
          1週間後へ <span className="font-['Orbitron'] text-[#e3141e] tabular-nums">+{count}</span>
        </span>
      </div>
    </motion.div>
  )
}

/* ───────────── 本体 ───────────── */

const CSS = `
.cdt-stage { --f: min(2.75cqw, calc((100cqh - var(--solo-footer-clearance, 0px)) * 0.0172)); font-size: var(--f); }
.cdt-page { left: calc(50% - 15.6em); top: 4.9em; width: 28em; height: 12em; }
.cdt-side { left: 1.1em; right: 1.1em; top: 17em; font-size: 1.12em; }
.cdt-band { left: -2em; right: -2em; top: 33.2em; height: 2.7em; }
.cdt-slots { left: 3em; }
.cdt-cap { left: 1.4em; right: 1.4em; top: 36.9em; }
.cdt-strip { left: 0; right: 0; height: 5.6em; bottom: calc(var(--solo-footer-clearance, 0px) + 5.4em); }
.cdt-strip-in { left: 1.4em; }
.cdt-ctrl { left: 1em; right: 1em; bottom: calc(var(--solo-footer-clearance, 0px) + 0.75rem); }
.cdt-head { left: 1em; right: 1em; top: 0.9em; }
.cdt-ff { left: 1.2em; top: 3em; }
.cdt-time { display: none; }
@container (min-width: 40rem) {
  .cdt-stage { --f: min(1.5cqw, calc((100cqh - var(--solo-footer-clearance, 0px)) * 0.0305)); }
  .cdt-page { left: 2.6em; top: 3.6em; }
  .cdt-side { left: auto; right: 2em; top: 2.4em; width: 25em; font-size: 1em; }
  .cdt-band { top: 18.2em; }
  .cdt-slots { left: 4.6em; }
  .cdt-cap { left: auto; right: 3.2em; top: 13.9em; max-width: 30em; display: flex; justify-content: flex-end; }
  .cdt-time { display: flex; }
  .cdt-strip { bottom: calc(var(--solo-footer-clearance, 0px) + 3.4em); }
  .cdt-strip-in { left: 3em; }
  .cdt-ctrl { left: auto; right: 1.4em; }
  .cdt-head { left: 1.4em; right: 1.4em; top: 0.9em; }
  .cdt-ff { left: auto; right: 2em; top: 13.6em; }
}
@keyframes cdt-spin { to { transform: rotate(360deg) } }
@keyframes cdt-drift { 0%,100% { transform: translateX(-1.4px) } 50% { transform: translateX(1.4px) } }
@keyframes cdt-rain { 0% { transform: translate(1px,-4px); opacity: 0 } 30% { opacity: 1 } 100% { transform: translate(-1.5px,5px); opacity: 0 } }
@keyframes cdt-snow { 0% { transform: translate(0,-3px); opacity: 0 } 20% { opacity: 1 } 50% { transform: translate(1.2px,1.5px) } 100% { transform: translate(-1px,6px); opacity: 0 } }
@keyframes cdt-bolt { 0%,100% { opacity: 1 } 40% { opacity: .15 } 46% { opacity: 1 } 52% { opacity: .15 } 58% { opacity: 1 } }
@keyframes cdt-blink { 50% { opacity: .1 } }
@keyframes cdt-flicker { 0%,100% { filter: none } 37% { filter: brightness(.55) } 41% { filter: none } }
@keyframes cdt-train { from { transform: translateX(-320px) } to { transform: translateX(1700px) } }
@keyframes cdt-type { to { opacity: 1 } }
@keyframes cdt-streak { from { transform: translateX(110cqw) } to { transform: translateX(-60cqw) } }
@keyframes cdt-caret { 50% { opacity: 0 } }
.cdt-root[data-reduced] .cdt-a { animation: none !important; }
`

function Caption({ text, reduced }: { text: string; reduced: boolean }) {
  const chars = [...text]
  return (
    <motion.div
      className="inline-flex max-w-full items-center gap-[0.6em] bg-[#0c0b0d] py-[0.35em] pr-[1em] pl-[0.5em] text-[#f6f1e7] shadow-[0.25em_0.25em_0_#e3141e]"
      style={{ clipPath: 'polygon(0 0, 100% 6%, 98% 100%, 1% 92%)' }}
      initial={reduced ? { opacity: 0 } : { x: '-1.5em', opacity: 0, skewX: -20 }}
      animate={{ x: 0, opacity: 1, skewX: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.08 } }}
      transition={reduced ? { duration: 0.15 } : { type: 'spring', stiffness: 600, damping: 26 }}
    >
      <span className="shrink-0 bg-[#e3141e] px-[0.3em] text-[0.8em] font-black">▶</span>
      <span className="min-w-0 text-[1.05em] leading-snug font-bold">
        {chars.map((c, i) => (
          <span key={i} style={reduced ? undefined : { opacity: 0, animation: `cdt-type 0s linear ${0.18 + i * 0.045}s forwards` }}>
            {c}
          </span>
        ))}
        <span className="cdt-a ml-[0.1em] inline-block text-[#e3141e]" style={{ animation: 'cdt-caret .8s steps(1) infinite' }}>
          ▼
        </span>
      </span>
    </motion.div>
  )
}

export function CalendarTransition() {
  const reduced = !!useReducedMotion()
  const [day, setDay] = useState(0)
  const [slot, setSlot] = useState(3)
  const [mode, setMode] = useState<Mode>('init')
  const [ff, setFF] = useState<{ base: number } | null>(null)
  const [swipe, setSwipe] = useState(0)
  const [impact, setImpact] = useState(0)
  const [monthSlam, setMonthSlam] = useState<number | null>(null)
  const busy = useRef(false)
  const timers = useRef<number[]>([])
  const [stageRef, animateStage] = useAnimate<HTMLDivElement>()

  useEffect(() => {
    const list = timers.current
    return () => list.forEach(clearTimeout)
  }, [])
  const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms))

  const info = dayInfo(day)
  const sky = useMemo(() => skyTarget(slot, info), [slot, info])

  const shake = () => {
    if (!stageRef.current) return
    animateStage(stageRef.current, { x: [0, -18, 15, -10, 6, -2, 0], y: [0, 8, -6, 4, -2, 0, 0], rotate: [0, -0.7, 0.6, -0.3, 0.1, 0, 0] }, { duration: 0.45, ease: 'easeOut' })
  }

  const showMonth = (target: number) => {
    setMonthSlam(target)
    later(reduced ? 900 : 1500, () => setMonthSlam(null))
  }

  const next = () => {
    if (busy.current) return
    if (slot < SLOTS.length - 1) {
      setMode('slot')
      setSlot(slot + 1)
      if (!reduced) {
        setSwipe((k) => k + 1)
        busy.current = true
        later(320, () => (busy.current = false))
      }
      return
    }
    const target = day + 1
    const monthChange = dayInfo(target).m !== info.m
    busy.current = true
    setMode(reduced ? 'init' : 'tear')
    setDay(target)
    setSlot(0)
    if (!reduced) setImpact((k) => k + 1)
    if (monthChange) later(reduced ? 0 : 420, () => showMonth(target))
    later(reduced ? 250 : monthChange ? 1900 : 720, () => (busy.current = false))
  }

  const week = () => {
    if (busy.current) return
    const base = day
    const target = day + 7
    const monthChange = dayInfo(target).m !== info.m || dayInfo(target).y !== info.y
    busy.current = true
    if (reduced) {
      setMode('init')
      setDay(target)
      if (monthChange) showMonth(target)
      later(monthChange ? 1000 : 250, () => (busy.current = false))
      return
    }
    setMode('ff')
    setFF({ base })
    const STEP = 140
    for (let i = 1; i <= 6; i++) later((i - 1) * STEP, () => setDay(base + i))
    later(6 * STEP + 40, () => {
      setFF(null)
      setMode('land')
      setDay(target)
      setImpact((k) => k + 1)
      shake()
    })
    if (monthChange) later(6 * STEP + 420, () => showMonth(target))
    later(6 * STEP + (monthChange ? 2000 : 700), () => (busy.current = false))
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const t = e.target as HTMLElement
    if (t !== e.currentTarget && t.tagName === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) return
    if ((e.key === 'ArrowRight' && e.shiftKey) || e.key === 'w' || e.key === 'W') week()
    else if (e.key === 'ArrowRight' || e.key === 'Enter') next()
    else return
    e.preventDefault()
  }

  const goal = GOALS.find((g) => g.ms > info.ms)
  const goalDays = goal ? Math.round((goal.ms - info.ms) / DAY_MS) : 0
  const caption = info.event ? info.event.lines[slot < 3 ? 0 : 1] : info.weather === 3 && slot === 1 ? '外は一面の雪景色だ！' : (info.weather === 2 || info.weather === 4) && slot === 1 ? '雨か…傘を持っていこう。' : SLOTS[slot].line
  const w = WEATHER[info.weather]
  const fullMoon = info.full
  const announce = `${info.y}年${info.m}月${info.d}日 ${WEEK_JA[info.w]}曜日 ${SLOTS[slot].ja} ${w.ja}${info.event ? `。${info.event.tag}` : ''}`

  return (
    <div
      tabIndex={0}
      onKeyDown={onKeyDown}
      data-reduced={reduced ? '' : undefined}
      aria-label="日付が進むカレンダー演出のデモ。→ または Enter で次の時間帯へ、Shift+→ または W で1週間すすめる"
      className="cdt-root relative h-full w-full overflow-hidden bg-[#0c0b0d] [container-type:size] font-['Noto_Sans_JP',sans-serif] text-[#f6f1e7] outline-none select-none focus-visible:ring-2 focus-visible:ring-[#e3141e] focus-visible:ring-inset"
    >
      <style>{CSS}</style>
      <SkyCanvas target={sky} ff={!!ff} reduced={reduced} />

      <div ref={stageRef} className="cdt-stage absolute inset-0">
        {/* 背景の大きな英字 */}
        <AnimatePresence initial={false}>
          <motion.div
            key={slot}
            className="pointer-events-none absolute top-[38%] left-[-4%] z-0 font-['Orbitron'] leading-none font-black whitespace-nowrap text-transparent italic"
            style={{ fontSize: '7.5em', WebkitTextStroke: '0.02em rgba(246,241,231,.38)' }}
            initial={reduced ? { opacity: 0 } : { x: '30%', opacity: 0, rotate: -6 }}
            animate={{ x: '0%', opacity: 1, rotate: -6 }}
            exit={reduced ? { opacity: 0 } : { x: '-30%', opacity: 0, rotate: -6, transition: { duration: 0.25 } }}
            transition={reduced ? { duration: 0.2 } : { duration: 0.7, ease: [0.2, 0.9, 0.2, 1] }}
            aria-hidden
          >
            {SLOTS[slot].en}
          </motion.div>
        </AnimatePresence>

        <Skyline slot={slot} />

        {/* ヘッダー */}
        <div className="cdt-head absolute z-[8] flex items-center justify-between gap-[0.6em]" aria-hidden>
          <div className="flex items-center gap-[0.5em]">
            <span className="-rotate-6 bg-[#e3141e] px-[0.45em] font-['Orbitron'] text-[0.8em] font-black tracking-[0.2em] text-[#0c0b0d] ring-2 ring-[#0c0b0d]">CALENDAR</span>
            <span className="font-['Orbitron'] text-[0.7em] font-bold tracking-[0.3em] text-[#f6f1e7] [text-shadow:0_1px_0_#0c0b0d]">{info.y}</span>
          </div>
          {goal && (
            <div className="flex -rotate-3 items-stretch shadow-[0.2em_0.2em_0_#0c0b0d]">
              <span className="flex items-center bg-[#f6f1e7] px-[0.5em] text-[0.82em] font-black text-[#0c0b0d]">{goal.name}まで あと</span>
              <span className="flex items-baseline bg-[#e3141e] px-[0.4em] font-['Orbitron'] text-[1.35em] leading-tight font-black text-[#f6f1e7] italic">
                {goalDays}
                <span className="ml-[0.1em] font-['Noto_Sans_JP'] text-[0.55em] not-italic">日</span>
              </span>
            </div>
          )}
        </div>

        {/* 日めくり */}
        <div className="cdt-page absolute z-[7]">
          {impact > 0 && <ImpactFrame key={impact} />}
          <div className="absolute inset-0 -rotate-[5deg]">
            {/* 重なったページの厚み・影 */}
            <div className="absolute inset-0 translate-x-[0.9em] translate-y-[0.9em] bg-[#0c0b0d]" style={{ clipPath: ZIG }} />
            <div className="absolute inset-0 translate-x-[0.45em] translate-y-[0.5em] bg-[#a9a196]" style={{ clipPath: ZIG }} />
            <div className="absolute inset-0 translate-x-[0.2em] translate-y-[0.22em] bg-[#d8d0c2]" style={{ clipPath: ZIG }} />
            <AnimatePresence custom={mode} initial={false}>
              <DatePage key={day} day={info} mode={mode} reduced={reduced} />
            </AnimatePresence>
            {/* 綴じ金具 */}
            <div className="absolute -top-[0.9em] left-[0.6em] z-[4] flex h-[1.3em] w-[26.5em] -skew-x-12 items-center justify-around bg-[#0c0b0d] shadow-[0.2em_0.2em_0_#e3141e]">
              {Array.from({ length: 9 }, (_, i) => (
                <span key={i} className="size-[0.55em] rounded-full bg-[#f6f1e7] ring-[0.12em] ring-[#e3141e]" />
              ))}
            </div>
            {/* イベントのステッカー */}
            <AnimatePresence>
              {info.event && !ff && (
                <motion.div
                  key={`${day}-${info.event.tag}`}
                  className="absolute -right-[3.4em] -bottom-[1.8em] z-[5]"
                  initial={reduced ? { opacity: 0 } : { scale: 0, rotate: -50, opacity: 0 }}
                  animate={{ scale: 1, rotate: -10, opacity: 1 }}
                  exit={{ scale: 0.4, opacity: 0, transition: { duration: 0.12 } }}
                  transition={reduced ? { duration: 0.2 } : { type: 'spring', stiffness: 560, damping: 11, delay: mode === 'tear' ? 0.55 : mode === 'land' ? 0.35 : 0.1 }}
                >
                  <div style={{ filter: `drop-shadow(0.22em 0.22em 0 ${BLACK})` }}>
                    <div className="flex flex-col items-center px-[1em] pt-[0.55em] pb-[0.65em] leading-none" style={{ background: info.event === FULL_MOON ? '#ffe9a8' : RED, clipPath: STICKER }}>
                      <span className={`font-['Orbitron'] text-[0.55em] font-black tracking-[0.3em] ${info.event === FULL_MOON ? 'text-[#e3141e]' : 'text-[#0c0b0d]'}`}>EVENT</span>
                      <span className={`mt-[0.2em] text-[1.45em] font-black whitespace-nowrap ${info.event === FULL_MOON ? 'text-[#0c0b0d]' : 'text-[#f6f1e7]'}`}>{info.event.tag}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* 時間帯の見出し・天気・月 */}
        <div className="cdt-side absolute z-[7] flex flex-col items-end gap-[0.9em]">
          <div className="relative flex min-h-[5.6em] flex-col items-end">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={slot}
                className="flex flex-col items-end"
                exit={reduced ? { opacity: 0, transition: { duration: 0.15 } } : { x: '-40%', skewX: 30, opacity: 0, transition: { duration: 0.16, ease: 'easeIn' } }}
              >
                <Ransom text={SLOTS[slot].ja} size="3.7em" reduced={reduced} delay={0.05} />
                <motion.span
                  className="mt-[0.3em] mr-[0.4em] -skew-x-12 bg-[#0c0b0d] px-[0.5em] font-['Orbitron'] text-[0.8em] font-black tracking-[0.25em] text-[#f6f1e7] italic shadow-[0.18em_0.18em_0_#e3141e]"
                  initial={reduced ? { opacity: 0 } : { x: '4em', opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={reduced ? { duration: 0.2 } : { type: 'spring', stiffness: 500, damping: 24, delay: 0.2 }}
                >
                  {SLOTS[slot].en}
                </motion.span>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="flex items-start gap-[0.8em]">
            {/* 天気 */}
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={`${day}-w`}
                className="flex rotate-[-4deg] items-center gap-[0.55em] bg-[#f6f1e7] py-[0.4em] pr-[0.9em] pl-[0.45em] text-[#0c0b0d] shadow-[0.22em_0.22em_0_#0c0b0d]"
                style={{ clipPath: 'polygon(0 6%, 100% 0, 97% 100%, 2% 94%)' }}
                initial={reduced || mode === 'ff' ? { opacity: 0 } : { scale: 0.3, rotate: 30, opacity: 0 }}
                animate={{ scale: 1, rotate: -4, opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: mode === 'ff' ? 0.05 : 0.12 } }}
                transition={reduced ? { duration: 0.2 } : mode === 'ff' ? { duration: 0.06 } : { type: 'spring', stiffness: 600, damping: 14, delay: mode === 'tear' ? 0.4 : 0.15 }}
              >
                <span className="grid size-[3em] place-items-center bg-[#0c0b0d] p-[0.35em]" style={{ clipPath: 'polygon(8% 0, 100% 6%, 92% 100%, 0 92%)' }}>
                  <WeatherIcon w={info.weather} />
                </span>
                <span className="flex flex-col leading-none">
                  <span className="font-['Orbitron'] text-[0.5em] font-black tracking-[0.25em] text-[#e3141e]">{w.en}</span>
                  <span className="mt-[0.15em] text-[1.45em] font-black">{w.ja}</span>
                  <span className="mt-[0.25em] font-['Space_Grotesk'] text-[0.62em] font-bold tabular-nums">
                    <span className="text-[#e3141e]">{info.hi}°</span> / {info.lo}°
                  </span>
                </span>
              </motion.div>
            </AnimatePresence>
            {/* 月齢 */}
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={`${day}-m`}
                className={`mt-[0.5em] flex rotate-[5deg] items-center gap-[0.5em] py-[0.35em] pr-[0.8em] pl-[0.4em] shadow-[0.2em_0.2em_0_#e3141e] ${fullMoon ? 'bg-[#e3141e] text-[#f6f1e7]' : 'bg-[#0c0b0d] text-[#f6f1e7]'}`}
                style={{ clipPath: 'polygon(3% 0, 100% 8%, 96% 100%, 0 90%)' }}
                initial={reduced || mode === 'ff' ? { opacity: 0 } : { scale: 0.3, rotate: -30, opacity: 0 }}
                animate={{ scale: 1, rotate: 5, opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: mode === 'ff' ? 0.05 : 0.12 } }}
                transition={reduced ? { duration: 0.2 } : mode === 'ff' ? { duration: 0.06 } : { type: 'spring', stiffness: 600, damping: 14, delay: mode === 'tear' ? 0.48 : 0.2 }}
              >
                <span className="size-[2.2em]">
                  <MoonIcon age={info.age} />
                </span>
                <span className="flex flex-col leading-none">
                  <span className="font-['Orbitron'] text-[0.48em] font-black tracking-[0.25em] opacity-70">MOON</span>
                  <span className="mt-[0.2em] text-[1em] font-black">{moonName(info.age)}</span>
                  <span className="mt-[0.2em] font-['Space_Grotesk'] text-[0.58em] font-bold tabular-nums">月齢 {info.age.toFixed(1)}</span>
                </span>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <TimeBand slot={slot} reduced={reduced} />

        {/* 台詞 */}
        <div className="cdt-cap absolute z-[7]" aria-hidden>
          <AnimatePresence mode="popLayout">{!ff && <Caption key={`${day}-${slot}`} text={caption} reduced={reduced} />}</AnimatePresence>
        </div>

        <DayStrip day={day} ff={!!ff} reduced={reduced} />
      </div>

      {/* カットイン・オーバーレイ */}
      <div className="cdt-stage pointer-events-none absolute inset-0 z-[20]">
        {swipe > 0 && !reduced && mode === 'slot' && <SlotSwipe key={swipe} slot={slot} />}
        <AnimatePresence>{ff && <FastForward count={day - ff.base} />}</AnimatePresence>
        <AnimatePresence>{monthSlam !== null && <MonthSlam key={monthSlam} info={dayInfo(monthSlam)} reduced={reduced} />}</AnimatePresence>
      </div>

      {/* 操作 */}
      <div className="cdt-stage pointer-events-none absolute inset-0 z-[40]">
        <div className="cdt-ctrl pointer-events-auto absolute flex flex-wrap items-center justify-end gap-[0.6em]">
          <span className="mr-auto hidden bg-[#0c0b0d]/80 px-[0.4em] font-['JetBrains_Mono'] text-[0.58em] tracking-wider text-[#f6f1e7]/85 @min-[40rem]:mr-0 @min-[40rem]:inline">→/Enter 次へ ・ Shift+→/W 1週間</span>
          <button
            type="button"
            onClick={next}
            aria-label="次の時間帯へ"
            className="-skew-x-12 bg-[#f6f1e7] px-[1.1em] py-[0.35em] text-[1em] font-black text-[#0c0b0d] shadow-[0.22em_0.22em_0_#e3141e] ring-2 ring-[#0c0b0d] transition-[transform,background-color,color] duration-100 outline-none hover:-translate-y-0.5 hover:bg-[#0c0b0d] hover:text-[#f6f1e7] focus-visible:ring-[3px] focus-visible:ring-[#e3141e] active:translate-y-0.5"
          >
            <span className="inline-block skew-x-12">次へ ▶</span>
          </button>
          <button
            type="button"
            onClick={week}
            aria-label="1週間すすめる"
            className="-skew-x-12 bg-[#e3141e] px-[1.1em] py-[0.35em] text-[1em] font-black text-[#f6f1e7] shadow-[0.22em_0.22em_0_#0c0b0d] ring-2 ring-[#0c0b0d] transition-[transform,background-color,color] duration-100 outline-none hover:-translate-y-0.5 hover:bg-[#0c0b0d] focus-visible:ring-[3px] focus-visible:ring-[#f6f1e7] active:translate-y-0.5"
          >
            <span className="inline-block skew-x-12">1週間すすめる ▶▶</span>
          </button>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </div>
  )
}
