import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform, type Transition } from 'motion/react'
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type RefObject } from 'react'

/**
 * スタイリッシュJRPG風の戦闘リザルト画面(赤・黒・白)。
 * - 背景は素の WebGL + GLSL 1 枚。キャラクターの位置を中心に回る放射模様、外側ほど大きくなる 45° の網点、
 *   斜めに流れるスピード線を描く。登場やレベルアップの瞬間に「勢い」の値を跳ね上げ、線が一気に流れて減衰する(dpr 上限 1.5)
 * - 開幕は赤・黒・白の斜め帯が画面を横切り、画面全体が傾いて戻る。オリジナルのシルエット(SVG。白い輪郭と赤いずらし影は
 *   feMorphology の膨張フィルタ)が残像を引いてダッシュで入り、着地の瞬間に集中線のインパクトフレーム → 剣を掲げる決めポーズ。
 *   以後はコートの裾と髪がなびき、呼吸で上半身がわずかに上下する
 * - 獲得EXP / 獲得金は Motion の animate() の onUpdate で textContent を直接書き換えるカウントアップ(フレームごとの再レンダーなし)
 * - EXP バーは MotionValue を useTransform で幅と「NEXT」の数値に変換。満タンを超えるとバーの先端の白い光が弾け、
 *   バースト環・切り抜き文字の「LEVEL UP!」・レベル数字のめくれ・画面の揺れが同時に起きる
 * - レベルアップしたメンバーごとに能力表が差し込まれ、+N が 1 行ずつポップしてバーが伸びる。最後に新スキルのカードが裏返って現れる
 * - ドロップ品はレア度の色を持った傾いた行が 1 つずつ滑り込み、光の筋が一度だけ走る
 * - 「つぎへ」/ Enter(デモ内にフォーカスがあるときのみ)の 1 回目は演出を飛ばして最終値へ、2 回目は帯で画面を覆って最初から。R でも再生
 * - 全体は設計サイズ(横長 940×420 / 縦長 380×620)で組み、ResizeObserver で測った枠に合わせて拡大縮小する
 * - useReducedMotion 時は最初から最終値を表示し、短いフェードだけにする(背景は 1 枚だけ描いて止める)
 */

const RED = '#e3141e'
const BLACK = '#0c0b0d'
const WHITE = '#f6f1e7'
const GOLD = '#f2c53d'
const INK = '#0e0d12'
const INK_LIGHT = '#2c2833'

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
const fmt = (n: number) => Math.round(n).toLocaleString('ja-JP')
const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))

/* ───────────── データ(すべてオリジナル) ───────────── */

type Member = { name: string; role: string; lv: number; start: number; gain: number; need: number; hair: number }
const MEMBERS: Member[] = [
  { name: 'レン', role: '剣士', lv: 23, start: 0.62, gain: 0.55, need: 3200, hair: 0 },
  { name: 'アゲハ', role: '術士', lv: 23, start: 0.3, gain: 0.44, need: 3200, hair: 1 },
  { name: 'クロガネ', role: '重戦士', lv: 21, start: 0.78, gain: 0.51, need: 2400, hair: 2 },
  { name: 'ツムギ', role: '癒し手', lv: 22, start: 0.1, gain: 0.47, need: 2800, hair: 3 },
]
const STAT_KEYS = ['ちから', 'まりょく', 'たいりょく', 'すばやさ', 'うん'] as const
const STAT_MAX = 72
type LevelUp = { member: number; base: number[]; plus: number[]; skill: { name: string; el: string; desc: string; icon: 'fire' | 'shield' } }
const LEVELERS: LevelUp[] = [
  { member: 0, base: [41, 24, 35, 47, 19], plus: [3, 1, 2, 4, 1], skill: { name: '緋閃・二式', el: '火炎', desc: '敵1体を二度斬る炎の剣技', icon: 'fire' } },
  { member: 2, base: [52, 15, 50, 22, 26], plus: [4, 1, 3, 1, 2], skill: { name: '鉄壁の構え', el: '防御', desc: '1ターンの間、味方全体の被ダメージ半減', icon: 'shield' } },
]
type Rarity = 0 | 1 | 2
const RARITY = [
  { label: 'コモン', color: WHITE },
  { label: 'レア', color: RED },
  { label: '激レア', color: GOLD },
]
const ITEMS: { name: string; qty: number; rarity: Rarity; icon: number }[] = [
  { name: '回復の小瓶', qty: 3, rarity: 0, icon: 0 },
  { name: '鋼の糸', qty: 5, rarity: 0, icon: 1 },
  { name: '宵闇の羽根', qty: 1, rarity: 1, icon: 2 },
  { name: '星屑の護符', qty: 1, rarity: 2, icon: 3 },
]
const TOTAL_EXP = 2640
const TOTAL_GOLD = 12480

/* ───────────── タイムライン(ms) ───────────── */

const T = { dash: 260, impact: 640, title: 760, panel: 900, count: 1350, bars: 2250 }
const BAR_STAGGER = 260
const LEVEL_MS = 1300 // バー 1 本分(1 レベル)を埋める時間
const LEVEL_PAUSE = 340
const barEnd = (i: number) => {
  const m = MEMBERS[i]
  const s = T.bars + i * BAR_STAGGER
  const f = m.start + m.gain
  return f > 1 ? s + (1 - m.start) * LEVEL_MS + LEVEL_PAUSE + (f - 1) * LEVEL_MS : s + m.gain * LEVEL_MS
}
const STATS_AT = Math.max(...MEMBERS.map((_, i) => barEnd(i))) + 260
const SHEET_MS = 2700
const TICK_AT = 380
const TICK_STEP = 250
const SKILL_AT = TICK_AT + TICK_STEP * 5 + 200
const ITEMS_AT = STATS_AT + SHEET_MS + 420
const ITEM_STEP = 230
const DONE_AT = STATS_AT + SHEET_MS * (LEVELERS.length - 1) + SKILL_AT + 700

/* ───────────── 切り抜き文字 ───────────── */

const RANSOM_FONTS: CSSProperties[] = [
  { fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 900 },
  { fontFamily: "'Playfair Display', 'Yu Mincho', serif", fontWeight: 900, fontStyle: 'italic' },
  { fontFamily: "'Space Grotesk', 'Noto Sans JP', sans-serif", fontWeight: 700 },
  { fontFamily: "'Orbitron', 'Noto Sans JP', sans-serif", fontWeight: 900 },
]
const SCHEMES: CSSProperties[] = [
  { background: WHITE, color: BLACK },
  { background: BLACK, color: WHITE },
  { background: RED, color: WHITE },
  { background: WHITE, color: RED },
  { background: BLACK, color: RED },
]

function Ransom({ text, size, shadow = BLACK, delay = 0, animateIn = true, seed = '' }: { text: string; size: number; shadow?: string; delay?: number; animateIn?: boolean; seed?: string }) {
  const letters = useMemo(() => {
    const r = mulberry32(hash(text + seed))
    let prev = -1
    return [...text].map((ch) => {
      let s = Math.floor(r() * SCHEMES.length)
      if (s === prev) s = (s + 1 + Math.floor(r() * (SCHEMES.length - 1))) % SCHEMES.length
      prev = s
      const j = () => +(r() * 9).toFixed(1)
      return {
        ch,
        style: { ...SCHEMES[s], ...RANSOM_FONTS[Math.floor(r() * RANSOM_FONTS.length)] },
        rot: (r() - 0.5) * 24,
        scale: 0.84 + r() * 0.34,
        dy: ((r() - 0.5) * 0.2).toFixed(2),
        clip: `polygon(${j()}% ${j()}%, 100% ${j()}%, ${100 - j()}% 100%, ${j()}% ${100 - j()}%)`,
      }
    })
  }, [text, seed])
  return (
    <span aria-hidden className="inline-flex items-center whitespace-nowrap" style={{ fontSize: size, filter: `drop-shadow(0.07em 0.07em 0 ${shadow})` }}>
      {letters.map((l, i) =>
        l.ch === ' ' ? (
          <span key={i} className="inline-block w-[0.3em]" />
        ) : (
          <motion.span
            key={i}
            className="inline-block leading-none"
            style={{ ...l.style, fontSize: `${l.scale}em`, padding: '0.1em 0.14em 0.13em', marginRight: '-0.03em', clipPath: l.clip }}
            initial={animateIn ? { opacity: 0, y: '-0.9em', rotate: l.rot - 60, scale: 2 } : false}
            animate={{ opacity: 1, y: `${l.dy}em`, rotate: l.rot, scale: 1 }}
            transition={{ type: 'spring', stiffness: 620, damping: 19, delay: delay + i * 0.04 }}
          >
            {l.ch}
          </motion.span>
        ),
      )}
    </span>
  )
}

/* ───────────── アイコン ───────────── */

const ic = (d: string, cls = 'size-full') => (
  <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden>
    <path d={d} />
  </svg>
)
const ICON_PATHS = {
  fire: 'M12 1c2.2 4.3 6.5 6.4 6.5 12a6.5 6.5 0 0 1-13 0c0-3.3 2-4.6 2.2-7.6 2 1.2 3 3.2 3.2 5.4 1.2-3.2 1.3-6.4 1.1-9.8z',
  shield: 'M12 1.5l9 3.8v6.2c0 5.4-3.9 9.7-9 11-5.1-1.3-9-5.6-9-11V5.3zM12 5v14.6c3.4-1.2 5.8-4.3 5.8-8.1V7.4z',
}
const ITEM_ICONS = [
  'M9 2h6v4l4 5v11H5V11l4-5zM7 14v6h10v-6z',
  'M5 3h14v3H5zM5 18h14v3H5zM7 6h10v12H7zM8 9l8-1v1.6l-8 1zM8 13l8-1v1.6l-8 1z',
  'M3 21C4 10 11 3 22 2c-1 11-8 18-19 19zm3-3 9-9-1-1-9 9z',
  'M12 1.5l3 7 7.5.6-5.7 4.9 1.8 7.4L12 17.5l-6.6 3.9 1.8-7.4L1.5 9.1 9 8.5z',
]

function Coin({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="10.5" fill={WHITE} stroke={BLACK} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="7" fill="none" stroke={BLACK} strokeWidth="1.4" strokeDasharray="2 1.6" />
      <path d="M12 6.5l4 5.5-4 5.5-4-5.5z" fill={RED} />
    </svg>
  )
}

const HAIRS = [
  'M11 27C9 13 17 6 26 6c8 0 13 6 12 16l-4-5-2 5-3-7c-5 3-11 4-16 2zM37 11c6-1 10 5 10 14-3-4-6-5-9-5z',
  'M9 32C8 15 15 7 24 7s16 8 15 25h-5l-1-13c-6 3-12 3-18 0l-1 13zM31 9l6-3 2 5-6 2z',
  'M13 21C13 11 18 7 24 7s11 4 11 14zM11 16h26v5H11zM36 17l9-3-2 6z',
  'M14 22C14 12 19 8 24 8s10 4 10 14l-3-6c-4 2-10 2-14 0zM12 5a5 5 0 1 1 0 10 5 5 0 0 1 0-10zM36 5a5 5 0 1 1 0 10 5 5 0 0 1 0-10z',
]
function Portrait({ hair }: { hair: number }) {
  return (
    <svg viewBox="0 0 48 48" className="size-full" aria-hidden>
      <path d="M5 48c2-10 10-13 19-13s17 3 19 13Z" fill={BLACK} />
      <ellipse cx="24" cy="24" rx="10.5" ry="12.5" fill={BLACK} />
      <path d={HAIRS[hair]} fill={BLACK} />
      <path d="M17 24l5 1-5 2ZM31 24l-5 1 5 2Z" fill={WHITE} />
    </svg>
  )
}

/* ───────────── 背景(WebGL) ───────────── */

const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'
const FRAG = `
precision mediump float;
uniform vec2 uRes; uniform float uTime; uniform float uPhase; uniform float uBoost; uniform vec2 uC; uniform float uDpr;
float h1(float n){ return fract(sin(n*127.1+3.7)*43758.5453); }
void main(){
  vec2 fc = gl_FragCoord.xy;
  vec2 uv = fc / uRes;
  vec2 p = (fc - uC * uRes) / uRes.y;
  float r = length(p);
  float a = atan(p.y, p.x);
  vec3 dark = vec3(0.047, 0.043, 0.051);
  vec3 red = vec3(0.89, 0.078, 0.118);
  vec3 deep = vec3(0.32, 0.02, 0.045);
  // 回転する放射模様
  float ray = fract(a / 6.2831853 * 18.0 + uTime * 0.035);
  float rays = smoothstep(0.47, 0.5, ray) * (1.0 - smoothstep(0.97, 1.0, ray));
  float glow = smoothstep(1.25, 0.0, r);
  vec3 col = mix(dark, mix(deep, red, glow * glow), rays * (0.25 + 0.75 * glow));
  col = mix(col, red * 0.5, glow * glow * 0.45 * (1.0 - rays));
  // 45° の網点(外側ほど大きい)
  vec2 g = mat2(0.7071, 0.7071, -0.7071, 0.7071) * fc / (7.0 * uDpr);
  vec2 cell = fract(g) - 0.5;
  float rad = 0.5 * smoothstep(0.12, 1.05, r);
  float dotm = 1.0 - smoothstep(rad - 0.07, rad + 0.02, length(cell));
  col = mix(col, dark, dotm * 0.9);
  // 斜めに流れるスピード線
  float ang = 0.22;
  vec2 q = mat2(cos(ang), sin(ang), -sin(ang), cos(ang)) * p;
  float lane = floor(q.y * 44.0);
  float hh = h1(lane);
  float s = fract(q.x * 0.32 - uPhase * (0.5 + hh * 1.3) + hh * 7.0);
  float streak = smoothstep(0.0, 0.012, s) * (1.0 - smoothstep(0.012, 0.2 + uBoost * 0.25, s)) * step(0.74, hh);
  col += vec3(1.0, 0.95, 0.9) * streak * (0.07 + uBoost * 0.75);
  col = mix(col, vec3(1.0, 0.96, 0.92), uBoost * uBoost * 0.18 * glow);
  // 周辺を落とす
  col *= 1.0 - 0.6 * smoothstep(0.35, 1.25, length((uv - uC) * vec2(1.0, 0.75)));
  gl_FragColor = vec4(col, 1.0);
}`

function Background({ reduced, boost, center }: { reduced: boolean; boost: RefObject<number>; center: [number, number] }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const centerRef = useRef(center)
  const redraw = useRef<() => void>(() => {})
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    centerRef.current = center
    redraw.current()
  }, [center])

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const gl = cv.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false })
    if (!gl) {
      setFailed(true)
      return
    }
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return s
    }
    const vs = sh(gl.VERTEX_SHADER, VERT)
    const fs = sh(gl.FRAGMENT_SHADER, FRAG)
    const prog = gl.createProgram()!
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      setFailed(true)
      return
    }
    gl.useProgram(prog)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const U = (n: string) => gl.getUniformLocation(prog, n)
    const uRes = U('uRes'), uTime = U('uTime'), uPhase = U('uPhase'), uBoost = U('uBoost'), uC = U('uC'), uDpr = U('uDpr')

    let dpr = 1
    const resize = () => {
      dpr = Math.min(1.5, window.devicePixelRatio || 1)
      const w = Math.max(1, Math.round(cv.clientWidth * dpr))
      const h = Math.max(1, Math.round(cv.clientHeight * dpr))
      if (cv.width !== w || cv.height !== h) {
        cv.width = w
        cv.height = h
      }
      gl.viewport(0, 0, w, h)
    }
    let time = 0
    let phase = 0
    let b = 0
    const draw = () => {
      gl.uniform2f(uRes, cv.width, cv.height)
      gl.uniform1f(uTime, time)
      gl.uniform1f(uPhase, phase)
      gl.uniform1f(uBoost, b)
      gl.uniform2f(uC, centerRef.current[0], centerRef.current[1])
      gl.uniform1f(uDpr, dpr)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    redraw.current = () => {
      if (reduced) draw()
    }
    const ro = new ResizeObserver(() => {
      resize()
      draw()
    })
    ro.observe(cv)
    resize()

    let raf = 0
    let visible = true
    let last = performance.now()
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (!visible) return
      b = Math.max(boost.current ?? 0, b * Math.pow(0.08, dt))
      boost.current = 0
      time += dt
      phase += dt * (0.25 + b * 3.2)
      draw()
    }
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
    })
    io.observe(cv)
    if (reduced) draw()
    else raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      redraw.current = () => {}
      gl.deleteBuffer(buf)
      gl.deleteProgram(prog)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [reduced, boost])

  if (failed)
    return (
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: `radial-gradient(circle at ${center[0] * 100}% ${(1 - center[1]) * 100}%, ${RED} 0, #4a0409 35%, ${BLACK} 75%)` }}
      />
    )
  return <canvas ref={ref} aria-hidden className="absolute inset-0 size-full" />
}

/* ───────────── キャラクター(オリジナルの 2D シルエット) ───────────── */

const origin = (x: number, y: number) => ({ transformBox: 'view-box' as const, transformOrigin: `${x}px ${y}px` })

/** 剣を掲げて勝ち誇る剣士。部位ごとの <g> を Motion で回し、決めポーズと待機の揺れを作る */
function Hero({ reduced }: { reduced: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const fx = `vr-fx-${uid}`
  const ghost = `vr-ghost-${uid}`
  const body = `vr-body-${uid}`
  const poseDelay = (T.impact - T.dash) / 1000
  const idle = (duration: number, values: Record<string, number[]>, delay = poseDelay + 0.5) =>
    reduced ? {} : { animate: values, transition: { duration, repeat: Infinity, ease: 'easeInOut' as const, delay } }
  const snap: Transition = reduced ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 13, delay: poseDelay }

  return (
    <svg viewBox="0 -80 360 680" className="h-full w-auto overflow-visible" aria-hidden>
      <defs>
        <filter id={fx} x="-20%" y="-10%" width="150%" height="125%">
          <feMorphology in="SourceAlpha" operator="dilate" radius="3.4" result="fat" />
          <feFlood floodColor={WHITE} />
          <feComposite in2="fat" operator="in" result="outline" />
          <feOffset in="fat" dx="12" dy="7" result="off" />
          <feFlood floodColor={RED} />
          <feComposite in2="off" operator="in" result="shadow" />
          <feMerge>
            <feMergeNode in="shadow" />
            <feMergeNode in="outline" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={ghost}>
          <feFlood floodColor={RED} />
          <feComposite in2="SourceAlpha" operator="in" />
        </filter>
      </defs>

      {/* ダッシュの残像 */}
      {!reduced &&
        [0, 1].map((k) => (
          <motion.use
            key={k}
            href={`#${body}`}
            filter={`url(#${ghost})`}
            initial={{ x: -70 - k * 60, opacity: 0.75 - k * 0.25 }}
            animate={{ x: -20, opacity: 0 }}
            transition={{ duration: 0.45 + k * 0.1, ease: 'easeOut', delay: 0.05 }}
          />
        ))}

      <motion.g
        filter={`url(#${fx})`}
        style={origin(180, 560)}
        initial={reduced ? false : { scaleY: 1, scaleX: 1 }}
        animate={reduced ? undefined : { scaleY: [1, 0.9, 1.04, 1], scaleX: [1, 1.08, 0.98, 1] }}
        transition={{ duration: 0.36, delay: poseDelay - 0.06, times: [0, 0.3, 0.65, 1] }}
      >
        <g id={body}>
          {/* 後ろの髪(長い一つ結び) */}
          <motion.g style={origin(152, 70)} initial={reduced ? false : { rotate: -40 }} animate={{ rotate: 0 }} transition={snap}>
            <motion.path
              d="M158 64C134 54 112 66 104 90 96 116 92 142 62 162 90 166 108 150 116 132 118 152 110 170 94 188 122 182 134 158 136 134 138 110 146 92 162 84Z"
              fill={INK}
              style={origin(152, 70)}
              {...idle(1.9, { rotate: [0, -6, 2, 0], skewY: [0, 3, -2, 0] })}
            />
            <path d="M92 150 62 162C80 164 94 158 104 148ZM120 140 94 188C108 182 118 170 124 156Z" fill={INK_LIGHT} />
          </motion.g>

          {/* コートの裾(後ろ。右へ大きく翻る) */}
          <motion.g style={origin(176, 252)} initial={reduced ? false : { rotate: -26, scaleX: 0.7 }} animate={{ rotate: 0, scaleX: 1 }} transition={snap}>
            <motion.path
              d="M146 250H200C214 300 250 336 316 356L286 370 318 398 262 396 274 428 222 388 206 322 174 314 152 324 136 382 106 454 94 446 118 362Z"
              fill={INK}
              style={origin(176, 252)}
              {...idle(1.6, { rotate: [0, 3.5, -1.5, 0], skewX: [0, -4, 2, 0] })}
            />
            <motion.path
              d="M206 324 262 396 274 428 222 388Z"
              fill={RED}
              style={origin(176, 252)}
              {...idle(1.6, { rotate: [0, 3.5, -1.5, 0], skewX: [0, -4, 2, 0] })}
            />
          </motion.g>

          {/* 脚(大きく開いた構え) */}
          <path d="M150 256 174 258 156 392 134 386Z" fill={INK} />
          <path d="M134 386 156 392 130 536 112 532Z" fill={INK} />
          <path d="M108 528 132 532 136 552 90 556 96 540Z" fill={INK} />
          <path d="M174 258 198 254 222 384 200 392Z" fill={INK} />
          <path d="M200 392 222 384 250 528 232 534Z" fill={INK} />
          <path d="M230 526 250 522 278 546 232 554Z" fill={INK} />
          <path d="M140 392 146 393 124 528 120 527ZM206 394 211 392 240 524 236 525Z" fill={INK_LIGHT} />
          <path d="M131 380 158 386 156 396 129 390ZM199 386 224 378 226 388 201 396Z" fill={RED} />

          {/* 上半身(呼吸で上下する) */}
          <motion.g {...idle(2.6, { y: [0, -2.4, 0] }, poseDelay + 0.3)}>
            {/* コート前身頃 */}
            <motion.path
              d="M148 252 172 256 160 340 132 420 116 414 136 330Z"
              fill={INK}
              style={origin(160, 254)}
              {...idle(1.6, { rotate: [0, 2, -1, 0] })}
            />
            <motion.path
              d="M176 256 200 250 216 318 250 392 234 402 200 334Z"
              fill={INK}
              style={origin(188, 254)}
              {...idle(1.6, { rotate: [0, -2.5, 1, 0] }, poseDelay + 0.7)}
            />
            {/* 胴 */}
            <path d="M136 156C150 144 192 142 210 156L204 206 196 254H150L140 206Z" fill={INK} />
            <path d="M166 150 182 150 178 250 170 250Z" fill={INK_LIGHT} />
            <path d="M144 162 156 158 152 222 146 210Z" fill={INK_LIGHT} />
            <path d="M148 244H198L197 256H149Z" fill={RED} />
            <path d="M168 243h12v14h-12z" fill={WHITE} />

            {/* 左腕: 腰に手を当てる */}
            <path d="M134 154 152 166 118 222 102 210Z" fill={INK} />
            <path d="M102 210 118 222 154 246 146 262Z" fill={INK} />
            <path d="M142 242 158 238 166 252 154 264 140 258Z" fill={WHITE} stroke={INK} strokeWidth="2" strokeLinejoin="round" />

            {/* 首と高い襟 */}
            <path d="M162 128H182L184 152H160Z" fill={INK} />
            <path d="M146 146 152 116 172 146ZM202 144 198 114 176 146Z" fill={INK} />
            <path d="M152 140C164 152 184 152 198 138L200 150C186 164 162 164 150 152Z" fill={RED} />

            {/* 頭 */}
            <motion.g style={origin(172, 132)} initial={reduced ? false : { rotate: 10 }} animate={{ rotate: -6 }} transition={snap}>
              <path d="M150 98C150 76 162 66 176 66 192 66 200 80 199 98 198 116 190 132 174 140 160 134 151 118 150 98Z" fill={INK} />
              <path d="M144 112C138 80 156 58 180 60 200 62 212 78 206 102L200 92 196 104 190 84C180 94 164 94 154 84L152 108Z" fill={INK} />
              <path d="M160 70 186 64 172 78Z" fill={INK_LIGHT} />
              <path d="M156 62l-10-7-4 11 9 5z" fill={RED} />
              <path d="M157 101 177 96 162 108Z" fill={RED} />
              <path d="M183 97l12-1-9 7z" fill={RED} />
            </motion.g>

            {/* 右腕: 剣を掲げる(着地の瞬間に振り上げる) */}
            <motion.g style={origin(206, 158)} initial={reduced ? false : { rotate: 128 }} animate={{ rotate: 0 }} transition={snap}>
              <path d="M198 150 216 166 252 126 238 112Z" fill={INK} />
              <path d="M238 112 252 126 270 72 256 66Z" fill={INK} />
              {/* 剣 */}
              <path d="M261 69 254 84" stroke={INK} strokeWidth="7" />
              <path d="M252 49 284 64" stroke={INK} strokeWidth="6" strokeLinecap="square" />
              <path d="M263.6 52.4 272.4 56.6 326 -66 321 -68Z" fill={WHITE} />
              <path d="M268 55 323.5 -67" stroke={INK} strokeWidth="1.4" />
              <path d="M250 70 266 60 276 70 270 84 256 82Z" fill={WHITE} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
            </motion.g>
          </motion.g>
        </g>
      </motion.g>

      {/* 刃先のきらめき */}
      {!reduced && (
        <path className="vr-glint" d="M323 -96 327 -70 353 -66 327 -62 323 -36 319 -62 293 -66 319 -70Z" fill={WHITE} />
      )}
    </svg>
  )
}

/** 背後の白いギザギザの光 */
function Starburst({ reduced }: { reduced: boolean }) {
  const pts = useMemo(() => {
    const r = mulberry32(7)
    const n = 26
    return Array.from({ length: n * 2 }, (_, i) => {
      const a = (i / (n * 2)) * Math.PI * 2
      const rad = i % 2 ? 18 + r() * 10 : 40 + r() * 10
      return `${(50 + Math.cos(a) * rad).toFixed(1)},${(50 + Math.sin(a) * rad).toFixed(1)}`
    }).join(' ')
  }, [])
  return (
    <motion.svg
      viewBox="0 0 100 100"
      className="absolute aspect-square"
      style={{ left: '50%', top: '42%', width: '120%', x: '-50%', y: '-50%' }}
      initial={reduced ? false : { scale: 0, rotate: -40 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 14, delay: T.impact / 1000 }}
      aria-hidden
    >
      <g className={reduced ? '' : 'vr-spin'} style={{ transformOrigin: '50px 50px' }}>
        <polygon points={pts} fill={WHITE} />
        <polygon points={pts} fill={BLACK} transform="translate(50 50) scale(.62) rotate(8) translate(-50 -50)" />
        <polygon points={pts} fill={RED} transform="translate(50 50) scale(.5) rotate(15) translate(-50 -50)" />
      </g>
    </motion.svg>
  )
}

/* ───────────── 合計(カウントアップ) ───────────── */

function Counter({ to, go, instant, className }: { to: number; go: boolean; instant: boolean; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (instant) {
      el.textContent = fmt(to)
      return
    }
    if (!go) {
      el.textContent = '0'
      return
    }
    const c = animate(0, to, { duration: 1, ease: [0.12, 0.7, 0.3, 1], onUpdate: (v) => (el.textContent = fmt(v)) })
    c.then(() => el.animate?.([{ transform: 'scale(1.3) rotate(-4deg)', color: RED }, { transform: 'scale(1)' }], { duration: 280, easing: 'cubic-bezier(.2,.8,.2,1)' }))
    return () => c.stop()
  }, [go, instant, to])
  return (
    <span ref={ref} className={`inline-block origin-right tabular-nums ${className ?? ''}`}>
      0
    </span>
  )
}

/* ───────────── パーティの EXP バー ───────────── */

function MemberRow({ m, i, go, instant, leveled, onLevel, reduced, compact }: { m: Member; i: number; go: boolean; instant: boolean; leveled: boolean; onLevel: (i: number) => void; reduced: boolean; compact: boolean }) {
  const final = m.start + m.gain
  const p = useMotionValue(m.start)
  const flash = useMotionValue(0)
  const frac = (v: number) => (v > 1 ? v - 1 : v)
  const width = useTransform(p, (v) => `${frac(v) * 100}%`)
  const next = useTransform(p, (v) => fmt((1 - frac(v)) * m.need))
  const onLevelRef = useRef(onLevel)
  onLevelRef.current = onLevel

  useEffect(() => {
    if (instant) {
      p.set(final)
      flash.set(0)
      return
    }
    if (!go) return
    let alive = true
    let ctrl: { stop: () => void } | null = null
    const run = async () => {
      flash.set(1)
      if (final > 1) {
        ctrl = animate(p, 1, { duration: ((1 - m.start) * LEVEL_MS) / 1000, ease: [0.4, 0, 1, 1] })
        await ctrl
        if (!alive) return
        onLevelRef.current(i)
        await wait(LEVEL_PAUSE)
        if (!alive) return
        p.set(1.0001)
        ctrl = animate(p, final, { duration: ((final - 1) * LEVEL_MS) / 1000, ease: [0.1, 0.6, 0.3, 1] })
      } else {
        ctrl = animate(p, final, { duration: (m.gain * LEVEL_MS) / 1000, ease: [0.25, 0.5, 0.3, 1] })
      }
      await ctrl
      if (alive) ctrl = animate(flash, 0, { duration: 0.3 })
    }
    run()
    return () => {
      alive = false
      ctrl?.stop()
    }
  }, [go, instant, final, m.gain, m.start, i, p, flash])

  const lv = m.lv + (leveled ? 1 : 0)
  const clip = i % 2 ? 'polygon(0 6%, 99% 0, 100% 90%, 1.5% 100%)' : 'polygon(1% 0, 100% 10%, 98.5% 100%, 0 92%)'
  return (
    <div className="relative" style={{ marginLeft: `${[2, 0, 4, 1][i]}%`, rotate: `${[-1.5, 0.8, -1, 1.2][i]}deg`, zIndex: 4 - i + (leveled ? 10 : 0) }}>
      {/* 黒い板(レベルアップで赤く光る) */}
      <motion.div
        key={leveled && !instant ? 'lv' : 'n'}
        className="absolute inset-0"
        style={{ clipPath: clip, boxShadow: `inset 0 0 0 2px ${WHITE}` }}
        initial={leveled && !instant && !reduced ? { backgroundColor: WHITE } : false}
        animate={{ backgroundColor: leveled ? '#1a0b0d' : BLACK }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
      <div className="absolute inset-0" style={{ clipPath: clip, boxShadow: `inset 0 0 0 1.5px ${leveled ? RED : 'rgba(246,241,231,.35)'}` }} />
      <div className={`relative flex items-center gap-2.5 pr-3 pl-1.5 ${compact ? 'py-1' : 'py-1.5'}`}>
        <span className={`grid shrink-0 -skew-x-6 place-items-center overflow-hidden ${compact ? 'size-8' : 'size-10'}`} style={{ background: leveled ? WHITE : RED }}>
          <Portrait hair={m.hair} />
        </span>
        <span className="w-[4.6em] shrink-0 leading-tight">
          <span className="block text-[13px] font-black tracking-wide">{m.name}</span>
          <span className="block text-[9px] font-bold opacity-60">{m.role}</span>
        </span>
        <span className="flex w-[3.3em] shrink-0 items-baseline gap-0.5 [perspective:200px]">
          <span className="font-['Orbitron'] text-[8px] font-black text-[#e3141e]">Lv</span>
          <span className="relative inline-grid">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                key={lv}
                className="font-['Space_Grotesk'] text-[22px] leading-none font-bold tabular-nums italic"
                style={{ color: leveled ? RED : WHITE, textShadow: leveled ? `2px 2px 0 ${WHITE}` : undefined }}
                initial={instant || reduced ? { opacity: 0 } : { rotateX: -100, y: -10, opacity: 0, scale: 1.6 }}
                animate={{ rotateX: 0, y: 0, opacity: 1, scale: 1 }}
                exit={instant || reduced ? { opacity: 0 } : { rotateX: 100, y: 10, opacity: 0 }}
                transition={instant || reduced ? { duration: 0.15 } : { type: 'spring', stiffness: 500, damping: 18 }}
              >
                {lv}
              </motion.span>
            </AnimatePresence>
          </span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="relative block h-[9px] -skew-x-[30deg] bg-[#f6f1e7]/15 ring-1 ring-[#f6f1e7]/25">
            <motion.span className="absolute inset-y-0 left-0 bg-[#e3141e]" style={{ width }} />
            {!leveled && <span className="absolute inset-y-0 left-0 bg-[#f6f1e7]" style={{ width: `${m.start * 100}%` }} />}
            {/* 先端の白い光 */}
            <motion.span className="absolute -inset-y-[3px] left-0 w-0" style={{ left: width, opacity: flash }}>
              <span className="absolute inset-y-0 right-0 w-5 bg-[linear-gradient(90deg,transparent,#fff)]" />
              <span className="absolute -inset-y-[2px] -right-[2px] w-[3px] bg-white shadow-[0_0_8px_3px_#fff]" />
            </motion.span>
          </span>
          <span className="flex items-baseline justify-end gap-1 font-mono text-[9px] font-bold">
            <span className="opacity-60">NEXT</span>
            <motion.span className="w-[3.6em] text-right tabular-nums">{next}</motion.span>
          </span>
        </span>
      </div>

      {/* LEVEL UP! */}
      <AnimatePresence>
        {leveled && (
          <motion.div
            key="lvup"
            className="pointer-events-none absolute -top-[13px] right-[16%]"
            initial={instant || reduced ? { opacity: 0 } : { scale: 2.6, rotate: -26, opacity: 0 }}
            animate={{ scale: 1, rotate: -7, opacity: 1 }}
            transition={instant || reduced ? { duration: 0.2 } : { type: 'spring', stiffness: 700, damping: 16 }}
          >
            {!instant && !reduced && <Burst />}
            <Ransom text="LEVEL UP!" size={14} shadow={RED} animateIn={!instant && !reduced} seed={m.name} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** レベルアップ時のバースト環と破片 */
function Burst() {
  const shards = useMemo(() => {
    const r = mulberry32(31)
    return Array.from({ length: 12 }, (_, k) => {
      const a = (k / 12) * Math.PI * 2 + r() * 0.3
      return { x: Math.cos(a) * (70 + r() * 30), y: Math.sin(a) * (40 + r() * 24), rot: r() * 360, red: k % 3 === 0 }
    })
  }, [])
  return (
    <span aria-hidden className="absolute top-1/2 left-1/2 size-0">
      <motion.span
        className="absolute -top-10 -left-10 size-20 rounded-full border-[5px] border-[#f6f1e7]"
        initial={{ scale: 0.2, opacity: 1 }}
        animate={{ scale: 2.2, opacity: 0, borderWidth: 1 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      />
      <motion.span
        className="absolute -top-10 -left-10 size-20 rounded-full border-[3px] border-[#e3141e]"
        initial={{ scale: 0.1, opacity: 1 }}
        animate={{ scale: 1.6, opacity: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut', delay: 0.06 }}
      />
      {shards.map((s, k) => (
        <motion.span
          key={k}
          className="absolute -top-1 -left-1.5 h-2 w-3"
          style={{ background: s.red ? RED : WHITE, clipPath: 'polygon(0 0, 100% 40%, 30% 100%)' }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
          animate={{ x: s.x, y: s.y, rotate: s.rot, opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.1, 0.8, 0.3, 1] }}
        />
      ))}
    </span>
  )
}

/* ───────────── 能力表 / 新スキル ───────────── */

function StatSheet({ idx, ticks, instant, reduced, onPick, canPick, compact }: { idx: number; ticks: number; instant: boolean; reduced: boolean; onPick: (i: number) => void; canPick: boolean; compact: boolean }) {
  const L = LEVELERS[idx]
  const m = MEMBERS[L.member]
  const quiet = instant || reduced
  return (
    <div className="relative text-[#f6f1e7]">
      <div className="absolute inset-0 bg-[#0c0b0d]" style={{ clipPath: 'polygon(0 3%, 97% 0, 100% 96%, 2% 100%)', boxShadow: `inset 0 0 0 2px ${WHITE}` }} />
      <div
        aria-hidden
        className="absolute inset-0 opacity-25"
        style={{ clipPath: 'polygon(0 3%, 97% 0, 100% 96%, 2% 100%)', background: `radial-gradient(${RED} 28%, transparent 31%) 0 0/7px 7px`, maskImage: 'linear-gradient(120deg, transparent 45%, #000)' }}
      />
      <div className={`relative px-3 ${compact ? 'pt-1.5 pb-2' : 'pt-2.5 pb-2.5'}`}>
        <div className={`flex items-center gap-2 ${compact ? 'mb-1' : 'mb-1.5'}`}>
          <span className="flex -skew-x-12 items-center gap-1.5 bg-[#e3141e] py-0.5 pr-2 pl-1">
            <span className="size-6 skew-x-12 bg-[#f6f1e7]">
              <Portrait hair={m.hair} />
            </span>
            <span className="skew-x-12 text-[13px] font-black">{m.name}</span>
          </span>
          <span className="flex items-baseline gap-1 font-['Space_Grotesk'] font-bold italic">
            <span className="font-['Orbitron'] text-[8px] not-italic">Lv</span>
            <span className="text-[15px] opacity-60">{m.lv}</span>
            <span className="text-[11px] text-[#e3141e]">▶</span>
            <motion.span
              className="text-[22px] leading-none text-[#e3141e] [text-shadow:2px_2px_0_#f6f1e7]"
              initial={quiet ? false : { scale: 2.2, rotate: -20, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 600, damping: 14, delay: 0.15 }}
            >
              {m.lv + 1}
            </motion.span>
          </span>
          {canPick && (
            <span className="ml-auto flex gap-1">
              {LEVELERS.map((l, k) => (
                <button
                  key={l.member}
                  type="button"
                  aria-pressed={k === idx}
                  aria-label={`${MEMBERS[l.member].name}の能力表を表示`}
                  onClick={() => onPick(k)}
                  className={`-skew-x-12 px-1.5 text-[10px] font-black outline-none focus-visible:ring-2 focus-visible:ring-[#e3141e] focus-visible:ring-offset-1 focus-visible:ring-offset-[#0c0b0d] ${
                    k === idx ? 'bg-[#f6f1e7] text-[#0c0b0d]' : 'bg-[#f6f1e7]/15 text-[#f6f1e7] hover:bg-[#f6f1e7]/30'
                  }`}
                >
                  {MEMBERS[l.member].name}
                </button>
              ))}
            </span>
          )}
        </div>
        <ul className={`flex flex-col ${compact ? 'gap-px' : 'gap-[3px]'}`}>
          {STAT_KEYS.map((k, s) => {
            const on = s < ticks
            const base = L.base[s]
            const plus = L.plus[s]
            return (
              <li key={k} className="grid grid-cols-[5.3em_minmax(0,1fr)_2em_2.2em] items-center gap-x-2 text-[11px]">
                <span className="font-black">{k}</span>
                <span className="relative block h-[7px] -skew-x-[30deg] bg-[#f6f1e7]/12">
                  <span className="absolute inset-y-0 left-0 bg-[#f6f1e7]" style={{ width: `${(base / STAT_MAX) * 100}%` }} />
                  <motion.span
                    className="absolute inset-y-0 bg-[#e3141e] shadow-[0_0_6px_#e3141e]"
                    style={{ left: `${(base / STAT_MAX) * 100}%` }}
                    initial={false}
                    animate={{ width: on ? `${(plus / STAT_MAX) * 100}%` : '0%' }}
                    transition={quiet ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 18 }}
                  />
                </span>
                <span className="relative inline-grid text-right font-['Space_Grotesk'] text-[13px] font-bold tabular-nums">
                  <AnimatePresence initial={false} mode="popLayout">
                    <motion.span
                      key={on ? 'b' : 'a'}
                      style={{ color: on ? RED : WHITE }}
                      initial={quiet ? false : { y: -10, opacity: 0, scale: 1.5 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      exit={{ y: 8, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                    >
                      {on ? base + plus : base}
                    </motion.span>
                  </AnimatePresence>
                </span>
                <span className="relative">
                  <AnimatePresence>
                    {on && (
                      <motion.span
                        className="absolute top-1/2 left-0 -translate-y-1/2 -skew-x-12 bg-[#e3141e] px-1 font-['Space_Grotesk'] text-[11px] leading-tight font-bold text-[#f6f1e7]"
                        initial={quiet ? false : { scale: 2.6, rotate: -25, opacity: 0, x: 10 }}
                        animate={{ scale: 1, rotate: -6, opacity: 1, x: 0 }}
                        transition={{ type: 'spring', stiffness: 700, damping: 14 }}
                      >
                        +{plus}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function SkillCard({ idx, quiet, compact }: { idx: number; quiet: boolean; compact: boolean }) {
  const sk = LEVELERS[idx].skill
  return (
    <motion.div
      className="relative [transform-style:preserve-3d]"
      initial={quiet ? { opacity: 0 } : { rotateY: -110, rotate: -8, opacity: 0, x: 30 }}
      animate={{ rotateY: 0, rotate: 1.5, opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30, transition: { duration: 0.15 } }}
      transition={quiet ? { duration: 0.2 } : { type: 'spring', stiffness: 260, damping: 15 }}
    >
      <div className="absolute inset-0 translate-x-[5px] translate-y-[4px] bg-[#e3141e]" style={{ clipPath: 'polygon(0 0, 100% 8%, 98% 100%, 2% 92%)' }} />
      <div className="relative overflow-hidden bg-[#f6f1e7] text-[#0c0b0d]" style={{ clipPath: 'polygon(0 0, 100% 8%, 98% 100%, 2% 92%)' }}>
        {!quiet && <span aria-hidden className="vr-shine absolute inset-y-0 left-0 w-1/3" style={{ animationDelay: '.45s' }} />}
        <div className={`relative flex items-center gap-2.5 px-3 ${compact ? 'py-1' : 'py-2'}`}>
          <span className="relative grid size-9 shrink-0 place-items-center">
            <span className="absolute inset-0 rotate-45 bg-[#0c0b0d]" />
            <span className="relative size-5 text-[#e3141e]">{ic(ICON_PATHS[sk.icon])}</span>
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="flex items-center gap-1.5">
              <span className="-skew-x-12 bg-[#0c0b0d] px-1.5 text-[9px] font-black tracking-wider text-[#f6f1e7]">新スキル習得</span>
              <span className="text-[9px] font-bold text-[#e3141e]">{sk.el}</span>
            </span>
            <span className="block truncate text-[16px] font-black tracking-wide">{sk.name}</span>
            {!compact && <span className="block truncate text-[9px] font-bold opacity-60">{sk.desc}</span>}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

/* ───────────── ドロップ品 ───────────── */

function ItemRow({ it, i, quiet, compact }: { it: (typeof ITEMS)[number]; i: number; quiet: boolean; compact: boolean }) {
  const rar = RARITY[it.rarity]
  const clip = i % 2 ? 'polygon(0 0, 100% 10%, 99% 100%, 1% 90%)' : 'polygon(1% 8%, 100% 0, 100% 92%, 0 100%)'
  return (
    <motion.li
      className="relative"
      style={{ marginLeft: compact ? 0 : `${(i % 2) * 3}%`, rotate: `${i % 2 ? 0.8 : -0.8}deg` }}
      initial={quiet ? { opacity: 0 } : { x: 140, skewX: -30, opacity: 0 }}
      animate={{ x: 0, skewX: 0, opacity: 1 }}
      transition={quiet ? { duration: 0.2 } : { type: 'spring', stiffness: 520, damping: 26 }}
    >
      <div className="relative overflow-hidden bg-[#0c0b0d] text-[#f6f1e7]" style={{ clipPath: clip }}>
        {!quiet && <span aria-hidden className="vr-shine absolute inset-y-0 left-0 w-1/4" style={{ animationDelay: '.18s' }} />}
        <span aria-hidden className="absolute inset-y-0 left-0 w-1.5" style={{ background: rar.color }} />
        {it.rarity === 2 && <span aria-hidden className="absolute inset-0" style={{ background: `linear-gradient(90deg, ${GOLD}33, transparent 55%)` }} />}
        <div className="relative flex items-center gap-2 py-[3px] pr-3 pl-3.5">
          <span className="size-4 shrink-0" style={{ color: rar.color }}>
            {ic(ITEM_ICONS[it.icon])}
          </span>
          <span className="min-w-0 flex-1 truncate text-[12px] font-black tracking-wide">{it.name}</span>
          {compact ? (
            <span className="sr-only">{rar.label}</span>
          ) : (
            <span className="-skew-x-12 px-1 text-[8.5px] font-black" style={{ background: rar.color, color: it.rarity === 1 ? WHITE : BLACK }}>
              {rar.label}
            </span>
          )}
          <span className="w-[2.4em] text-right font-['Space_Grotesk'] text-[15px] leading-none font-bold tabular-nums italic">×{it.qty}</span>
        </div>
      </div>
    </motion.li>
  )
}

/* ───────────── 演出オーバーレイ ───────────── */

const BAND_SWEEP: Transition = { duration: 0.82, times: [0, 0.3, 0.62, 1], ease: ['circOut', 'linear', 'circIn'] }

/** 開幕の斜め帯 */
function IntroBands({ wide }: { wide: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
      <motion.div className="absolute inset-0 bg-[#f6f1e7]" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.85, 0] }} transition={{ duration: 0.22, delay: 0.18 }} />
      <div className="absolute inset-x-[-30%] top-[6%] h-[16%] rotate-[-11deg]">
        <motion.div className="h-full bg-[#f6f1e7]" initial={{ x: '120%' }} animate={{ x: ['120%', '0%', '-3%', '-120%'] }} transition={{ ...BAND_SWEEP, delay: 0.04 }} />
      </div>
      <div className="absolute inset-x-[-30%] top-1/2 h-[44%] -translate-y-1/2 rotate-[-11deg]">
        <motion.div
          className="relative flex h-full items-center justify-center overflow-hidden border-y-[8px] border-[#0c0b0d] bg-[#e3141e]"
          initial={{ x: '-120%' }}
          animate={{ x: ['-120%', '0%', '3%', '120%'] }}
          transition={BAND_SWEEP}
        >
          <div className="absolute inset-0 opacity-40" style={{ background: `radial-gradient(${BLACK} 30%, transparent 33%) 0 0/9px 9px` }} />
          <span className="relative">
            <Ransom text="VICTORY" size={wide ? 64 : 40} delay={0.08} />
          </span>
        </motion.div>
      </div>
      <div className="absolute inset-x-[-30%] top-[74%] h-[13%] rotate-[-11deg]">
        <motion.div className="flex h-full items-center bg-[#0c0b0d]" initial={{ x: '120%' }} animate={{ x: ['120%', '0%', '-2%', '-120%'] }} transition={{ ...BAND_SWEEP, delay: 0.08 }}>
          <span className="pl-[38%] font-['Orbitron'] text-[clamp(14px,3cqh,30px)] font-black tracking-[.5em] whitespace-nowrap text-[#f6f1e7]">BATTLE CLEAR — 戦闘終了</span>
        </motion.div>
      </div>
      <div className="absolute inset-x-[-30%] top-[90%] h-[4%] rotate-[-11deg]">
        <motion.div className="h-full bg-[#e3141e]" initial={{ x: '-120%' }} animate={{ x: ['-120%', '0%', '0%', '120%'] }} transition={{ ...BAND_SWEEP, delay: 0.12 }} />
      </div>
    </div>
  )
}

/** 着地の瞬間のインパクトフレーム(集中線) */
function ImpactFrame({ w, h, cx, cy }: { w: number; h: number; cx: number; cy: number }) {
  const lines = useMemo(() => {
    const r = mulberry32(99)
    const R = Math.hypot(w, h)
    const ox = cx * w
    const oy = cy * h
    return Array.from({ length: 64 }, (_, k) => {
      const a = (k / 64) * Math.PI * 2 + r() * 0.08
      const inner = Math.min(w, h) * (0.16 + r() * 0.22)
      const half = 0.006 + r() * 0.012
      const p = (ang: number, rad: number) => `${(ox + Math.cos(ang) * rad).toFixed(1)},${(oy + Math.sin(ang) * rad).toFixed(1)}`
      return `${p(a, inner)} ${p(a - half, R)} ${p(a + half, R)}`
    })
  }, [w, h, cx, cy])
  return (
    <motion.svg
      aria-hidden
      className="pointer-events-none absolute inset-0 z-30 size-full"
      viewBox={`0 0 ${w} ${h}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0] }}
      transition={{ duration: 0.3, times: [0, 0.05, 0.55, 1], delay: T.impact / 1000 }}
    >
      <rect width={w} height={h} fill={BLACK} opacity={0.55} />
      {lines.map((pts, k) => (
        <polygon key={k} points={pts} fill={k % 7 === 0 ? RED : WHITE} />
      ))}
    </motion.svg>
  )
}

/* ───────────── 本体 ───────────── */

const CSS = `
@keyframes vr-spin { to { transform: rotate(360deg) } }
@keyframes vr-bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-4px) } }
@keyframes vr-nudge { 0%,100% { transform: translateX(0) } 50% { transform: translateX(4px) } }
@keyframes vr-shine { from { transform: translateX(-120%) skewX(-24deg) } to { transform: translateX(420%) skewX(-24deg) } }
@keyframes vr-drift { to { background-position: 0 -120px } }
@keyframes vr-glint { 0% { transform: scale(0) rotate(0) } 10% { transform: scale(1.5) rotate(90deg) } 22%, 100% { transform: scale(0) rotate(140deg) } }
@keyframes vr-coin { from { transform: rotateY(0) scale(1.3) } to { transform: rotateY(1440deg) scale(1) } }
.vr-coin { animation: vr-coin .85s cubic-bezier(.2,.7,.3,1) both }
.vr-spin { animation: vr-spin 40s linear infinite }
.vr-glint { transform-box: fill-box; transform-origin: center; transform: scale(0); animation: vr-glint 2.6s ease-out 1.1s infinite }
.vr-bob { animation: vr-bob 1.1s ease-in-out infinite }
.vr-nudge { animation: vr-nudge .55s ease-in-out infinite }
.vr-shine { background: linear-gradient(90deg, transparent, rgba(255,255,255,.75), transparent); transform: translateX(-120%) skewX(-24deg); animation: vr-shine .6s cubic-bezier(.4,0,.2,1) 1 both }
`

type State = {
  beat: number // 0 開幕 / 1 パネル / 2 カウント / 3 バー / 4 能力表
  lvUp: number[]
  sheet: number
  ticks: number
  skill: boolean
  items: number
  done: boolean
  instant: boolean
}
const INITIAL: State = { beat: 0, lvUp: [], sheet: -1, ticks: 0, skill: false, items: 0, done: false, instant: false }
const FINAL: State = { beat: 4, lvUp: LEVELERS.map((l) => l.member), sheet: LEVELERS.length - 1, ticks: 5, skill: true, items: ITEMS.length, done: true, instant: true }

export function VictoryResults() {
  const reduced = !!useReducedMotion()
  const rootRef = useRef<HTMLDivElement>(null)
  const shakeRef = useRef<HTMLDivElement>(null)
  const boost = useRef(0)
  const [size, setSize] = useState({ w: 0, h: 0, clear: 0 })
  const [run, setRun] = useState(0)
  const [st, setSt] = useState<State>(INITIAL)
  const [wipe, setWipe] = useState(false)
  const timers = useRef<number[]>([])

  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    const measure = () => {
      // 全画面表示で下端が隠れる分(--solo-footer-clearance)も考慮して、詰めた配置にするかを決める
      const v = getComputedStyle(el).getPropertyValue('--solo-footer-clearance').trim()
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      const clear = v.endsWith('rem') ? parseFloat(v) * rem : parseFloat(v) || 0
      setSize({ w: el.clientWidth, h: el.clientHeight, clear })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  // タイムライン
  useEffect(() => {
    clearTimers()
    if (reduced) {
      setSt(FINAL)
      return
    }
    setSt(INITIAL)
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms))
    const patch = (p: Partial<State>) => setSt((s) => (s.instant ? s : { ...s, ...p }))
    at(40, () => (boost.current = 1))
    at(T.impact, () => (boost.current = 1))
    at(T.panel, () => patch({ beat: 1 }))
    at(T.count, () => patch({ beat: 2 }))
    at(T.bars, () => patch({ beat: 3 }))
    LEVELERS.forEach((_, k) => {
      const t0 = STATS_AT + k * SHEET_MS
      at(t0, () => patch({ beat: 4, sheet: k, ticks: 0, skill: false }))
      for (let s = 1; s <= 5; s++) at(t0 + TICK_AT + (s - 1) * TICK_STEP, () => patch({ ticks: s }))
      at(t0 + SKILL_AT, () => patch({ skill: true }))
    })
    ITEMS.forEach((_, k) => at(ITEMS_AT + k * ITEM_STEP, () => patch({ items: k + 1 })))
    at(DONE_AT, () => patch({ done: true }))
    return clearTimers
  }, [run, reduced])

  const onLevel = useCallback((i: number) => {
    boost.current = 1
    setSt((s) => (s.lvUp.includes(i) ? s : { ...s, lvUp: [...s.lvUp, i] }))
    const el = shakeRef.current
    if (el) animate(el, { x: [0, -7, 6, -4, 2, 0], y: [0, 4, -3, 2, 0] }, { duration: 0.32 })
  }, [])

  const skip = () => {
    clearTimers()
    setSt(FINAL)
  }
  const replay = () => {
    clearTimers()
    setWipe(false)
    setRun((r) => r + 1)
  }
  const next = () => {
    if (!st.done) skip()
    else if (reduced) replay()
    else setWipe(true)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) next()
    else if (e.key === 'r' || e.key === 'R') replay()
    else return
    e.preventDefault()
  }

  const { w, h, clear } = size
  const wide = w >= 620 && w / Math.max(1, h) > 1.2
  const BW = wide ? 940 : 380
  const BH = wide ? 450 : 620
  const s = w && h ? Math.min(w / BW, h / BH) : 1
  const SW = w / s
  const SH = h / s
  const center: [number, number] = wide ? [0.15, 0.52] : [0.78, 0.8]
  const quiet = st.instant || reduced
  const fresh = !reduced // 開幕演出を出すか

  const summary = `獲得EXP ${fmt(TOTAL_EXP)}、獲得金 ${fmt(TOTAL_GOLD)}。${LEVELERS.map((l) => MEMBERS[l.member].name).join('と')}がレベルアップ。ドロップ ${ITEMS.map((i) => `${i.name}×${i.qty}`).join('、')}`

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label="戦闘リザルト画面。Enterで演出をスキップ、もう一度押すと最初から。Rで再生"
      className="relative h-full w-full overflow-hidden bg-[#0c0b0d] font-['Noto_Sans_JP',sans-serif] text-[#f6f1e7] outline-none select-none [container-type:size] focus-visible:ring-2 focus-visible:ring-[#e3141e] focus-visible:ring-inset"
    >
      <style>{CSS}</style>
      <Background reduced={reduced} boost={boost} center={center} />
      {/* 右側の斜めストライプ(パネルの下地) */}
      <div
        aria-hidden
        className="absolute inset-y-0 right-0 w-[70%] opacity-50"
        style={{
          background: 'repeating-linear-gradient(-62deg, transparent 0 22px, rgba(246,241,231,.045) 22px 24px)',
          maskImage: 'linear-gradient(90deg, transparent, #000 30%)',
          WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 30%)',
        }}
      />

      {w > 0 && (
        <div key={run} className="absolute top-0 left-0 origin-top-left" style={{ width: SW, height: SH, transform: `scale(${s})` }}>
          <div ref={shakeRef} className="absolute inset-0">
            <motion.div
              className="absolute inset-0"
              initial={fresh ? { rotate: -7, scale: 1.16 } : { opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              transition={fresh ? { type: 'spring', stiffness: 170, damping: 15, delay: 0.42 } : { duration: 0.25 }}
            >
              <Scene
                wide={wide}
                tight={!wide || h / s - clear / s < 480}
                st={st}
                quiet={quiet}
                reduced={reduced}
                onLevel={onLevel}
                onPick={(k) => setSt((p) => ({ ...p, sheet: k, ticks: 5, skill: true, instant: true }))}
                onNext={next}
                onReplay={replay}
                clearance={s}
              />
            </motion.div>
          </div>
        </div>
      )}

      {w > 0 && fresh && (
        <div key={`fx-${run}`} className="contents">
          <ImpactFrame w={w} h={h} cx={center[0]} cy={1 - center[1]} />
          <IntroBands wide={wide} />
        </div>
      )}

      {/* 2 回目の「つぎへ」: 帯で覆ってから最初から */}
      <AnimatePresence>
        {wipe && (
          <motion.div key="wipe" aria-hidden className="absolute inset-0 z-50 overflow-hidden" exit={{ opacity: 0, transition: { duration: 0.12 } }}>
            {[RED, BLACK, WHITE, BLACK].map((c, k) => (
              <div key={k} className="absolute inset-x-[-30%] rotate-[-11deg]" style={{ top: `${-18 + k * 32}%`, height: '36%' }}>
                <motion.div
                  className="h-full"
                  style={{ background: c }}
                  initial={{ x: k % 2 ? '-120%' : '120%' }}
                  animate={{ x: '0%' }}
                  transition={{ duration: 0.26, ease: [0.7, 0, 0.3, 1], delay: k * 0.04 }}
                  onAnimationComplete={k === 3 ? replay : undefined}
                />
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <p aria-live="polite" className="sr-only">
        {st.done ? summary : ''}
      </p>
    </div>
  )
}

function Scene({
  wide,
  tight,
  st,
  quiet,
  reduced,
  onLevel,
  onPick,
  onNext,
  onReplay,
  clearance,
}: {
  wide: boolean
  tight: boolean
  st: State
  quiet: boolean
  reduced: boolean
  onLevel: (i: number) => void
  onPick: (k: number) => void
  onNext: () => void
  onReplay: () => void
  clearance: number
}) {
  const panelIn = st.beat >= 1
  const slam = (i: number): { initial: false | Record<string, number | string>; animate: Record<string, number | string>; transition: Transition } =>
    quiet
      ? { initial: false, animate: { opacity: 1 }, transition: { duration: 0.2 } }
      : {
          initial: { x: 160, skewX: -28, opacity: 0 },
          animate: panelIn ? { x: 0, skewX: 0, opacity: 1 } : { x: 160, skewX: -28, opacity: 0 },
          transition: { type: 'spring', stiffness: 480, damping: 26, delay: i * 0.06 },
        }

  const totals = (
    <motion.div className="grid grid-cols-2 gap-2.5" {...slam(0)}>
      <div className="relative -rotate-2">
        <div className="absolute inset-0 translate-x-[4px] translate-y-[4px] bg-[#e3141e]" style={{ clipPath: 'polygon(0 0, 100% 10%, 97% 100%, 3% 90%)' }} />
        <div className="relative flex flex-col bg-[#f6f1e7] px-3 pt-1 pb-1.5 text-[#0c0b0d]" style={{ clipPath: 'polygon(0 0, 100% 10%, 97% 100%, 3% 90%)' }}>
          <span className="flex items-center gap-1 text-[10px] font-black">
            <span className="-skew-x-12 bg-[#0c0b0d] px-1 text-[#f6f1e7]">獲得</span>EXP
          </span>
          <span className="text-right font-['Space_Grotesk'] text-[27px] leading-none font-bold italic">
            <Counter to={TOTAL_EXP} go={st.beat >= 2} instant={quiet} />
          </span>
        </div>
      </div>
      <div className="relative rotate-1">
        <div className="absolute inset-0 translate-x-[4px] translate-y-[4px] bg-[#f6f1e7]" style={{ clipPath: 'polygon(3% 8%, 100% 0, 98% 92%, 0 100%)' }} />
        <div className="relative flex flex-col bg-[#0c0b0d] px-3 pt-1 pb-1.5" style={{ clipPath: 'polygon(3% 8%, 100% 0, 98% 92%, 0 100%)' }}>
          <span className="flex items-center gap-1 pl-1 text-[10px] font-black">
            <span className="-skew-x-12 bg-[#e3141e] px-1">獲得</span>金
          </span>
          <span className="flex items-center justify-end gap-1.5 font-['Space_Grotesk'] text-[27px] leading-none font-bold italic">
            <Coin className={`size-5 shrink-0 not-italic ${st.beat === 2 && !quiet ? 'vr-coin' : ''}`} />
            <Counter to={TOTAL_GOLD} go={st.beat >= 2} instant={quiet} />
            <span className="text-[11px] not-italic">円</span>
          </span>
        </div>
      </div>
    </motion.div>
  )

  const party = (
    <div className="flex flex-col gap-[7px]">
      {MEMBERS.map((m, i) => (
        <motion.div key={m.name} {...slam(i + 1)}>
          <MemberRow m={m} i={i} go={st.beat >= 3 && !quiet} instant={st.instant} leveled={st.lvUp.includes(i)} onLevel={onLevel} reduced={reduced} compact={tight} />
        </motion.div>
      ))}
    </div>
  )

  const sheet = (
    <div className={`relative flex flex-col ${wide ? 'gap-1.5' : 'gap-1'}`} style={{ minHeight: wide ? (tight ? 128 : 150) : 0 }}>
      {st.sheet < 0 && wide && (
        <motion.div
          className="absolute inset-0 grid place-items-center border-2 border-dashed border-[#f6f1e7]/20"
          style={{ clipPath: 'polygon(0 3%, 97% 0, 100% 96%, 2% 100%)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: panelIn ? 1 : 0 }}
        >
          <span className="font-['Orbitron'] text-[26px] font-black tracking-widest text-transparent italic [-webkit-text-stroke:1px_rgba(246,241,231,.25)]">LEVEL UP</span>
        </motion.div>
      )}
      <AnimatePresence mode="popLayout" initial={false}>
        {st.sheet >= 0 && (
          <motion.div
            key={st.sheet}
            initial={quiet ? { opacity: 0 } : { x: 220, skewX: -24, opacity: 0, rotate: 4 }}
            animate={{ x: 0, skewX: 0, opacity: 1, rotate: -1.2 }}
            exit={quiet ? { opacity: 0, transition: { duration: 0.1 } } : { x: -200, skewX: 20, opacity: 0, transition: { duration: 0.22, ease: 'circIn' } }}
            transition={quiet ? { duration: 0.2 } : { type: 'spring', stiffness: 420, damping: 24 }}
          >
            <StatSheet idx={st.sheet} ticks={st.ticks} instant={st.instant} reduced={reduced} onPick={onPick} canPick={st.done} compact={tight} />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="relative z-10 -mt-2.5 ml-[8%] [perspective:600px]" style={{ minHeight: tight ? 38 : 50 }}>
        <AnimatePresence mode="popLayout">{st.sheet >= 0 && st.skill && <SkillCard key={st.sheet} idx={st.sheet} quiet={quiet} compact={tight} />}</AnimatePresence>
      </div>
    </div>
  )

  const drops = (
    <div className="flex flex-col gap-1">
      <motion.div className="flex items-center gap-2" initial={false} animate={{ opacity: st.items > 0 || quiet ? 1 : 0.35 }}>
        <span className="-skew-x-12 bg-[#e3141e] px-2 text-[11px] font-black tracking-widest">ドロップ</span>
        <span className="h-[2px] flex-1 bg-[linear-gradient(90deg,#f6f1e7,transparent)]" />
        <span className="font-mono text-[10px] font-bold tabular-nums">
          {st.items}/{ITEMS.length}
        </span>
      </motion.div>
      <ul className={wide ? 'flex flex-col gap-[3px]' : 'grid grid-cols-2 gap-x-2 gap-y-[3px]'} style={{ minHeight: wide ? ITEMS.length * 24 : 52 }}>
        {ITEMS.slice(0, st.items).map((it, i) => (
          <ItemRow key={it.name} it={it} i={i} quiet={quiet} compact={!wide} />
        ))}
      </ul>
    </div>
  )

  const title = (
    <div className="pointer-events-none flex flex-col items-start gap-1">
      <span className="-rotate-[9deg]">
        <Ransom text="RESULT" size={wide ? 42 : 34} shadow={RED} delay={quiet ? 0 : T.title / 1000} animateIn={!quiet} />
      </span>
      <motion.span
        className="ml-3 -rotate-[9deg] bg-[#0c0b0d] px-1.5 font-['Orbitron'] text-[8.5px] font-black tracking-[.35em] text-[#f6f1e7] ring-1 ring-[#f6f1e7]/60"
        initial={quiet ? false : { opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: quiet ? 0 : T.title / 1000 + 0.3 }}
      >
        BATTLE CLEAR · 撃破 5 · 7ターン
      </motion.span>
    </div>
  )

  const hero = (
    <motion.div
      className="relative h-full"
      initial={quiet ? false : { x: '-160%', skewX: -24 }}
      animate={{ x: 0, skewX: 0 }}
      transition={quiet ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 24, delay: T.dash / 1000 }}
    >
      <Starburst reduced={reduced} />
      <div className="absolute inset-0 flex justify-center">
        <Hero reduced={reduced} />
      </div>
    </motion.div>
  )

  const controls = (
    <div className="flex items-end justify-end gap-4">
      <button
        type="button"
        onClick={onReplay}
        aria-label="最初から再生"
        className="flex -skew-x-12 items-center gap-1 bg-[#0c0b0d] px-2.5 py-1 text-[11px] font-black text-[#f6f1e7] shadow-[3px_3px_0_#e3141e] ring-1 ring-[#f6f1e7]/60 outline-none hover:bg-[#e3141e] focus-visible:ring-2 focus-visible:ring-[#f6f1e7]"
      >
        <svg viewBox="0 0 24 24" className="size-3.5 skew-x-12" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
          <path d="M4 12a8 8 0 1 0 2.4-5.7M4 3v5h5" />
        </svg>
        <span className="skew-x-12">再生</span>
        <kbd className="skew-x-12 font-mono text-[9px] opacity-60">R</kbd>
      </button>
      <span className={quiet ? '' : 'vr-bob'}>
        <button
          type="button"
          onClick={onNext}
          aria-label={st.done ? 'つぎへ(最初から再生)' : 'つぎへ(演出をスキップ)'}
          className="group relative block outline-none"
        >
          <span className="absolute inset-0 translate-x-[5px] translate-y-[4px] bg-[#e3141e]" style={{ clipPath: 'polygon(4% 0, 100% 12%, 94% 100%, 0 86%)' }} />
          <span
            className="relative flex items-center gap-2 bg-[#f6f1e7] py-1.5 pr-5 pl-4 text-[#0c0b0d] group-hover:bg-[#0c0b0d] group-hover:text-[#f6f1e7] group-focus-visible:bg-[#0c0b0d] group-focus-visible:text-[#f6f1e7]"
            style={{ clipPath: 'polygon(4% 0, 100% 12%, 94% 100%, 0 86%)' }}
          >
            <span className="text-[17px] leading-none font-black tracking-wider">つぎへ</span>
            <svg viewBox="0 0 20 20" className={`size-3.5 text-[#e3141e] ${quiet ? '' : 'vr-nudge'}`} aria-hidden>
              <polygon points="0,0 20,10 0,20 5,10" fill="currentColor" />
            </svg>
            <kbd className="font-mono text-[9px] font-bold opacity-60">{st.done ? 'Enter' : 'Enter スキップ'}</kbd>
          </span>
          <span className="pointer-events-none absolute -inset-1.5 hidden ring-2 ring-[#f6f1e7] group-focus-visible:block" />
        </button>
      </span>
    </div>
  )

  const padBottom = { paddingBottom: `calc(var(--solo-footer-clearance, 0px) / ${clearance} + 10px)` }

  if (wide)
    return (
      <div className="absolute inset-0">
        <div className="absolute bottom-0 left-[1%] h-[96%] w-[27%]">{hero}</div>
        <div className="absolute top-3 left-4 z-20">{title}</div>
        <div className="absolute inset-0 flex flex-col pt-3.5 pr-4 pl-[28.5%]" style={padBottom}>
          <div className="grid min-h-0 flex-1 grid-cols-[1.12fr_1fr] items-center gap-5">
            <div className="flex flex-col gap-3">
              {totals}
              {party}
            </div>
            <div className="flex flex-col gap-2">
              {sheet}
              {drops}
            </div>
          </div>
          <div className="pt-2">{controls}</div>
        </div>
      </div>
    )

  return (
    <div className="absolute inset-0">
      <div className="absolute top-[1%] right-[-1%] h-[25%] w-[36%]">{hero}</div>
      <div className="absolute inset-0 flex flex-col gap-1.5 px-3 pt-2" style={padBottom}>
        <div className="relative z-20">{title}</div>
        <div className="relative z-10 mt-auto">{totals}</div>
        <div className="relative z-10">{party}</div>
        <div className="relative z-10">{sheet}</div>
        <div className="relative z-10">{drops}</div>
        <div className="relative z-10 pt-1">{controls}</div>
      </div>
    </div>
  )
}
