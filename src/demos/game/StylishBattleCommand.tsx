import { AnimatePresence, animate, motion, useAnimate, useMotionValue, useReducedMotion, useTransform, type Transition } from 'motion/react'
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode, type RefObject } from 'react'

/**
 * 赤・黒・白のスタイリッシュJRPG風ターン制バトルのコマンド画面。
 * - 背景は素の WebGL + GLSL。対数らせんの腕を硬いエッジで切った赤黒の渦が回り、弱点を突くと白い衝撃リングが広がる。
 *   総攻撃が近づくほど uHeat を上げて赤く速く回す(rAF の中で ref だけを更新し、React は再描画しない。画面外では IntersectionObserver で停止)
 * - 画面サイズを ResizeObserver で測り、HUD(パーティ・コマンド)を 470×400 の設計座標ごと右下基準で拡大縮小。縦長では敵を上、HUD を下へ
 * - コマンドは手描きの扇形配置。白いギザギザのハイライトは項目の左端中央を原点にした回転ラッパーを spring で移し、赤い影は柔らかい spring で遅れて追従。
 *   選択中の文字は1文字ずつ跳ねるキネティックタイポ。項目アイコンはオリジナルのボタン風グリフ
 * - 敵は 2D SVG のオリジナルの影。feMorphology の膨張で白い輪郭と赤いずらし影を付け、翼・触手・腕は CSS keyframes で揺らす(Motion を使わない常時ループ)
 * - 弱点を突くと: 画面シェイク + 差の合成モードで一瞬色を反転 → 放射線とギザギザの爆発枠に切り抜き文字の「WEAK」→ 敵がダウンして星が回る →
 *   目元だけを切り取ったカットインが斜めに走り「もう一回！」。全員ダウンで総攻撃チャンス(仲間のシルエットが包囲)
 * - 総攻撃は ケンカ煙(CSS で膨らむ円) → 斜めの斬撃線 → 手続き生成した墨のスプラッシュ → 切り抜き文字の FINISH → リザルト(数値は MotionValue でカウントアップ)
 * - キー操作はデモにフォーカスがあるときだけ(↑↓←→ / Enter / Esc)。useReducedMotion 時はシェイク・カットイン・ループを止め、短いフェードと即時の状態変化にする
 */

const RED = '#e3141e'
const BLACK = '#0c0b0d'
const WHITE = '#f6f1e7'
const INK = '#141017'
const DEEP = '#7d0a10'

type Bezier = [number, number, number, number]
const SNAP: Bezier = [0.2, 0.9, 0.25, 1]
const SWEEP_EASE: Bezier = [0.7, 0, 0.3, 1]

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
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const uidOf = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, '')

/* ───────────── 切り抜き文字 ───────────── */

const RANSOM_FONTS: CSSProperties[] = [
  { fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 900 },
  { fontFamily: "'Playfair Display', 'Yu Mincho', serif", fontWeight: 900, fontStyle: 'italic' },
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

function Ransom({ text, size, shadow = BLACK, delay = 0, animateIn = true, slam = false }: { text: string; size: string; shadow?: string; delay?: number; animateIn?: boolean; slam?: boolean }) {
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
        rot: (r() - 0.5) * 22,
        scale: 0.84 + r() * 0.34,
        dy: ((r() - 0.5) * 0.2).toFixed(2),
        clip: `polygon(${j()}% ${j()}%, 100% ${j()}%, ${100 - j()}% 100%, ${j()}% ${100 - j()}%)`,
      }
    })
  }, [text])

  return (
    <span aria-hidden className="inline-flex flex-nowrap items-center whitespace-nowrap" style={{ fontSize: size, filter: `drop-shadow(0.07em 0.07em 0 ${shadow})` }}>
      {letters.map((l, i) =>
        l.ch === ' ' ? (
          <span key={i} className="inline-block w-[0.3em]" />
        ) : (
          <motion.span
            key={i}
            className="inline-block leading-none"
            style={{ ...l.style, fontSize: `${l.scale}em`, padding: '0.1em 0.15em 0.13em', marginRight: '-0.02em', clipPath: l.clip }}
            initial={animateIn ? (slam ? { opacity: 0, scale: 3.4, rotate: l.rot - 40, y: '-0.3em' } : { opacity: 0, y: '-0.9em', rotate: l.rot - 50, scale: 1.8 }) : false}
            animate={{ opacity: 1, y: `${l.dy}em`, rotate: l.rot, scale: 1 }}
            transition={slam ? { type: 'spring', stiffness: 820, damping: 19, delay: delay + i * 0.05 } : { type: 'spring', stiffness: 560, damping: 20, delay: delay + i * 0.045 }}
          >
            {l.ch}
          </motion.span>
        ),
      )}
    </span>
  )
}

/** 選択中に1文字ずつ跳ねるキネティック文字 */
function Kinetic({ text, on, size, reduced }: { text: string; on: boolean; size: number; reduced: boolean }) {
  return (
    <span aria-hidden className="inline-flex">
      {[...text].map((ch, i) => (
        <motion.span
          key={i}
          className="inline-block"
          initial={false}
          animate={on && !reduced ? { y: [0, -size * 0.34, 0], rotate: [0, i % 2 ? 12 : -12, 0], scale: [1, 1.3, 1] } : { y: 0, rotate: 0, scale: 1 }}
          transition={{ duration: 0.34, delay: on ? i * 0.04 : 0, ease: SNAP }}
        >
          {ch}
        </motion.span>
      ))}
    </span>
  )
}

/* ───────────── データ ───────────── */

type Elem = '斬' | '銃' | '火' | '氷' | '雷' | '風' | '光' | '闇'
type Skill = { name: string; el: Elem; cost: number; pow: number; desc: string }
type Member = { name: string; role: string; hp: number; mhp: number; sp: number; msp: number; guard: boolean; skills: Skill[] }
type Foe = { name: string; hp: number; mhp: number; weak: Elem; resist: Elem; down: boolean; gone: '' | 'finish' | 'flee' }
type Action = { kind: 'attack' | 'shoot' | 'skill'; name: string; el: Elem; pow: number; cost: number }
type HitKind = 'weak' | 'normal' | 'resist'
type Hit = { key: number; amount: number; kind: HitKind; el: Elem; downed: boolean }
type Phase = 'command' | 'skill' | 'item' | 'tactic' | 'target' | 'busy' | 'holdup' | 'finish' | 'victory' | 'spared'
type MemberFx = { key: number; member: number; type: 'lunge' | 'hit' | 'heal' | 'guard'; amount?: number }

const PARTY: Member[] = [
  {
    name: 'アカツキ', role: '剣', hp: 412, mhp: 440, sp: 96, msp: 120, guard: false,
    skills: [
      { name: '霜牙', el: '氷', cost: 6, pow: 74, desc: '足元から氷の牙を突き上げる。' },
      { name: '紫電', el: '雷', cost: 7, pow: 78, desc: '細い稲妻を一点に落とす。' },
      { name: '白閃', el: '光', cost: 9, pow: 86, desc: 'まばゆい光の筋で切り裂く。' },
      { name: '旋風刃', el: '風', cost: 5, pow: 66, desc: '渦巻く風の刃で刻む。' },
    ],
  },
  {
    name: 'スミレ', role: '術', hp: 268, mhp: 300, sp: 150, msp: 180, guard: false,
    skills: [
      { name: '焔輪', el: '火', cost: 6, pow: 80, desc: '炎の輪で敵を包み込む。' },
      { name: '鎌鼬', el: '風', cost: 5, pow: 70, desc: '見えない風の鎌で切り裂く。' },
      { name: '夜帳', el: '闇', cost: 8, pow: 84, desc: '夜の帳を落として呑み込む。' },
      { name: '雷槌', el: '雷', cost: 12, pow: 104, desc: '天から雷の槌を振り下ろす。' },
    ],
  },
  {
    name: 'ゴウ', role: '拳', hp: 455, mhp: 480, sp: 60, msp: 84, guard: false,
    skills: [
      { name: '爆炎拳', el: '火', cost: 5, pow: 82, desc: '燃える拳を叩き込む。' },
      { name: '氷砕', el: '氷', cost: 7, pow: 78, desc: '凍らせた拳で殴り砕く。' },
      { name: '天穿', el: '光', cost: 10, pow: 96, desc: '光をまとった拳で突き上げる。' },
    ],
  },
  {
    name: 'ナギ', role: '弓', hp: 301, mhp: 330, sp: 112, msp: 130, guard: false,
    skills: [
      { name: '影縫い', el: '闇', cost: 6, pow: 72, desc: '影に矢を縫い付けて動きを奪う。' },
      { name: '疾風矢', el: '風', cost: 5, pow: 68, desc: '風をまとった矢を連射する。' },
      { name: '凍て矢', el: '氷', cost: 6, pow: 74, desc: '当たった場所から凍りつく矢。' },
      { name: '遠雷', el: '雷', cost: 9, pow: 88, desc: '遠い空から雷を呼び寄せる。' },
    ],
  },
]
const FOES: Foe[] = [
  { name: 'ツノボウシ', hp: 320, mhp: 320, weak: '氷', resist: '火', down: false, gone: '' },
  { name: 'ヒトツメ', hp: 360, mhp: 360, weak: '雷', resist: '闇', down: false, gone: '' },
  { name: 'ハネガラス', hp: 280, mhp: 280, weak: '銃', resist: '風', down: false, gone: '' },
]
const ITEMS = [
  { name: '回復の小瓶', note: '自分の HP を 120 回復する。', n: 3 },
  { name: '気付けの香', note: '自分の SP を 40 回復する。', n: 2 },
]
const TACTICS = [
  { name: '全力で攻めろ', note: '与えるダメージが少し上がる。' },
  { name: '慎重に戦え', note: '受けるダメージが少し下がる。' },
  { name: '各自の判断で', note: '特に指示は出さない。' },
]
const elLabel = (el: Elem) => (el === '斬' ? '斬撃' : el === '銃' ? '銃撃' : `${el}属性`)
const ATTACK: Action = { kind: 'attack', name: '攻撃', el: '斬', pow: 60, cost: 0 }
const SHOOT: Action = { kind: 'shoot', name: '射撃', el: '銃', pow: 54, cost: 0 }

type CmdId = 'attack' | 'skill' | 'shoot' | 'guard' | 'item' | 'tactic'
const CMDS: { id: CmdId; label: string; en: string; x: number; y: number; rot: number; size: number }[] = [
  { id: 'attack', label: '攻撃', en: 'ATTACK', x: 98, y: 0, rot: -12, size: 30 },
  { id: 'skill', label: 'スキル', en: 'SKILL', x: 52, y: 42, rot: -7, size: 34 },
  { id: 'shoot', label: '射撃', en: 'SHOOT', x: 26, y: 92, rot: -3, size: 30 },
  { id: 'guard', label: 'ガード', en: 'GUARD', x: 26, y: 136, rot: 2, size: 25 },
  { id: 'item', label: 'アイテム', en: 'ITEM', x: 48, y: 173, rot: 6, size: 23 },
  { id: 'tactic', label: '作戦', en: 'PLAN', x: 90, y: 208, rot: 10, size: 23 },
]

/* ───────────── アイコン ───────────── */

const ELEM_PATHS: Record<Elem, ReactNode> = {
  斬: <path d="M20.5 1.5 22.5 3.5 9 17l-2-2ZM5.4 13.6l5 5-1.5 1.5-1.6-1.6-3.6 3.6-1.4-1.4 3.6-3.6-1.6-1.6Z" />,
  銃: <path d="M1 9h12.5L22 12l-8.5 3H1ZM3 6.5h2v2H3ZM3 15.5h2v2H3Z" />,
  火: <path d="M12 1.5c1.2 4.2 5.5 6 5.5 11.5a5.5 5.5 0 0 1-11 0c0-2.6 1.3-4 2.2-6 .8 1.8 1.7 2.6 2.8 3-.6-3.2 0-6 .5-8.5Z" />,
  氷: <path d="M12 1l2.6 9L12 23l-2.6-13ZM2 6.5l8.4 5.2-6.6 7.8 2.6-6.2ZM22 6.5l-8.4 5.2 6.6 7.8-2.6-6.2Z" />,
  雷: <path d="M14.5 1 4 13.5h6.5L8 23 20 9.5h-6.8Z" />,
  風: <path d="M2 8h12.5a3 3 0 1 0-3-3M2 13h17a3 3 0 1 1-3 3M2 18h8" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="square" />,
  光: <path d="M12 0l1.8 8.2L20.5 3.5l-4.7 6.7L24 12l-8.2 1.8 4.7 6.7-6.7-4.7L12 24l-1.8-8.2-6.7 4.7 4.7-6.7L0 12l8.2-1.8L3.5 3.5l6.7 4.7Z" />,
  闇: <path d="M14 2.2A10 10 0 1 0 21.8 16 8.2 8.2 0 1 1 14 2.2ZM17 6.5a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6Z" />,
}
function ElemIcon({ el, className, style }: { el: Elem; className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor" aria-hidden>
      {ELEM_PATHS[el]}
    </svg>
  )
}

/** コマンドのボタン風グリフ(どれもオリジナルの形) */
const GLYPHS: Record<CmdId, ReactNode> = {
  attack: (
    <g fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="square">
      <path d="M4 17 14 7M9 21 19 11" />
      <path d="M14 3h7v7" />
    </g>
  ),
  skill: <path d="M12 1.5 14.6 9.4 22.5 12l-7.9 2.6L12 22.5l-2.6-7.9L1.5 12l7.9-2.6Z" fill="currentColor" />,
  shoot: (
    <g fill="none" stroke="currentColor" strokeWidth="2.4">
      <circle cx="12" cy="12" r="6.5" />
      <path d="M12 1v5M12 18v5M1 12h5M18 12h5" />
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
    </g>
  ),
  guard: <path d="M12 1.5 21 5v7c0 5.2-3.9 9.2-9 10.5C6.9 21.2 3 17.2 3 12V5Zm0 4L7 7.4v4.8c0 3 1.9 5.4 5 6.6Z" fill="currentColor" fillRule="evenodd" />,
  item: <path d="M8.5 6 6.5 2.5h11L15.5 6c3.5 1.4 5.5 5 5.5 9a6.5 6.5 0 0 1-6.5 6.5h-5A6.5 6.5 0 0 1 3 15c0-4 2-7.6 5.5-9Zm2.3 4v3.2H7.6v2.4h3.2v3.2h2.4v-3.2h3.2v-2.4h-3.2V10Z" fill="currentColor" fillRule="evenodd" />,
  tactic: (
    <g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="square">
      <path d="M12 22V12L5 5M12 12l7-7" />
      <path d="M5 10V5h5M19 10V5h-5" />
    </g>
  ),
}

function Badge({ id, size, on }: { id: CmdId; size: number; on: boolean }) {
  return (
    <span
      className="relative grid shrink-0 place-items-center rounded-full transition-[background-color,box-shadow] duration-100"
      style={{ width: size, height: size, background: on ? RED : BLACK, color: WHITE, boxShadow: `0 0 0 2px ${on ? BLACK : WHITE}, ${on ? `3px 3px 0 2px ${BLACK}` : `0 0 0 4px ${BLACK}`}` }}
    >
      <svg viewBox="0 0 24 24" style={{ width: size * 0.6, height: size * 0.6 }} aria-hidden>
        {GLYPHS[id]}
      </svg>
    </span>
  )
}

/* ───────────── 背景(GLSL の渦) ───────────── */

const BG_VS = 'attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }'
const BG_FS = /* glsl */ `
precision mediump float;
uniform vec2 uRes; uniform float uTime; uniform float uHeat; uniform vec2 uC; uniform float uPulse;
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p) {
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1.0, 0.0)), u.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), u.x), u.y);
}
void main() {
  vec2 p = (gl_FragCoord.xy - uC * uRes) / uRes.y;
  float r = length(p);
  float a = atan(p.y, p.x);
  float w = n(vec2(a * 1.6 + 10.0, r * 3.0 - uTime * 1.7)) * 0.55 + n(p * 3.5 + uTime * 0.6) * 0.35;
  float s = a / 6.2831853 * 5.0 + log(r + 0.04) * 1.7 - uTime + w * 0.38;
  float arm = fract(s);
  float band = smoothstep(0.0, 0.015, arm) * smoothstep(0.5, 0.485, arm);
  float edge = smoothstep(0.5, 0.485, arm) * smoothstep(0.43, 0.445, arm);
  float fine = fract(s * 4.0 + 0.5);
  float thin = smoothstep(0.0, 0.04, fine) * smoothstep(0.14, 0.1, fine);
  vec3 red = vec3(0.89, 0.08, 0.118);
  vec3 deep = vec3(0.36, 0.025, 0.05);
  vec3 blk = vec3(0.047, 0.043, 0.051);
  float fall = smoothstep(1.45, 0.05, r);
  vec3 col = mix(blk, deep * 0.55, fall);
  col = mix(col, mix(deep, red, 0.3 + 0.6 * uHeat), band * fall * (0.6 + 0.4 * uHeat));
  col = mix(col, red, edge * fall * 0.85);
  col += thin * (1.0 - band) * fall * vec3(0.16, 0.02, 0.03);
  col += red * smoothstep(0.42, 0.0, r) * (0.18 + uHeat * 0.42);
  float ring = smoothstep(0.035, 0.0, abs(r - uPulse * 1.7)) * (1.0 - uPulse);
  col = mix(col, vec3(0.965, 0.945, 0.906), ring * 0.85);
  vec2 q = gl_FragCoord.xy / uRes - 0.5;
  col *= 1.0 - smoothstep(0.35, 0.95, length(q * vec2(1.5, 1.0))) * 0.75;
  col += (h(gl_FragCoord.xy + uTime) - 0.5) * 0.035;
  gl_FragColor = vec4(col, 1.0);
}`

function SwirlBackground({ heat, pulse, cx, cy, reduced }: { heat: number; pulse: number; cx: number; cy: number; reduced: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const live = useRef({ heat, heatNow: heat, pulseT: 1, cx, cy, draw: () => {} })
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    live.current.heat = heat
    live.current.cx = cx
    live.current.cy = cy
    if (reduced) {
      live.current.heatNow = heat
      live.current.draw()
    }
  }, [heat, cx, cy, reduced])

  useEffect(() => {
    if (!pulse || reduced) return
    live.current.pulseT = 0
  }, [pulse, reduced])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const canvas = document.createElement('canvas')
    canvas.className = 'absolute inset-0 size-full'
    host.appendChild(canvas)
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false })
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
    const prog = gl.createProgram()!
    const vs = sh(gl.VERTEX_SHADER, BG_VS)
    const fs = sh(gl.FRAGMENT_SHADER, BG_FS)
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      canvas.remove()
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
    const U = {
      res: gl.getUniformLocation(prog, 'uRes'),
      time: gl.getUniformLocation(prog, 'uTime'),
      heat: gl.getUniformLocation(prog, 'uHeat'),
      c: gl.getUniformLocation(prog, 'uC'),
      pulse: gl.getUniformLocation(prog, 'uPulse'),
    }
    let phase = 6.0
    const draw = () => {
      const L = live.current
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.uniform2f(U.res, canvas.width, canvas.height)
      gl.uniform1f(U.time, phase)
      gl.uniform1f(U.heat, L.heatNow)
      gl.uniform2f(U.c, L.cx, L.cy)
      gl.uniform1f(U.pulse, Math.min(1, L.pulseT))
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    live.current.draw = draw
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5) * 0.75
      const w = Math.max(1, Math.round(host.clientWidth * dpr))
      const h = Math.max(1, Math.round(host.clientHeight * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      draw()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(host)

    let raf = 0
    let last = performance.now()
    let visible = true
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const L = live.current
      L.heatNow += (L.heat - L.heatNow) * Math.min(1, dt * 2.5)
      phase += dt * (0.1 + L.heatNow * 0.5)
      if (L.pulseT < 1) L.pulseT += dt / 0.75
      draw()
      raf = requestAnimationFrame(tick)
    }
    const start = () => {
      if (reduced || raf || !visible) return
      last = performance.now()
      raf = requestAnimationFrame(tick)
    }
    const stop = () => {
      cancelAnimationFrame(raf)
      raf = 0
    }
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible) start()
      else stop()
    })
    io.observe(host)
    start()

    return () => {
      stop()
      io.disconnect()
      ro.disconnect()
      live.current.draw = () => {}
      gl.deleteBuffer(buf)
      gl.deleteProgram(prog)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      canvas.remove()
    }
  }, [reduced])

  return (
    <div
      ref={hostRef}
      aria-hidden
      className="absolute inset-0"
      style={failed ? { background: `radial-gradient(circle at ${cx * 100}% ${(1 - cy) * 100}%, ${DEEP}, transparent 60%), repeating-conic-gradient(from 0deg at ${cx * 100}% ${(1 - cy) * 100}%, #3a060b 0deg 9deg, ${BLACK} 9deg 18deg)` } : undefined}
    />
  )
}

/* ───────────── 敵(オリジナルの影) ───────────── */

function SilhouetteFilter({ id, r = 2.6, dx = 6, dy = 4 }: { id: string; r?: number; dx?: number; dy?: number }) {
  return (
    <filter id={id} x="-25%" y="-20%" width="150%" height="145%">
      <feMorphology in="SourceAlpha" operator="dilate" radius={r} result="fat" />
      <feFlood floodColor={WHITE} />
      <feComposite in2="fat" operator="in" result="outline" />
      <feOffset in="fat" dx={dx} dy={dy} result="off" />
      <feFlood floodColor={RED} />
      <feComposite in2="off" operator="in" result="shadow" />
      <feMerge>
        <feMergeNode in="shadow" />
        <feMergeNode in="outline" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  )
}
function GlowFilter({ id }: { id: string }) {
  return (
    <filter id={id} x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="2.6" />
      <feMerge>
        <feMergeNode />
        <feMergeNode />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  )
}
const part = (x: number, y: number, anim: string): CSSProperties => ({ transformBox: 'view-box', transformOrigin: `${x}px ${y}px`, animation: anim })

function FoeArt({ kind }: { kind: number }) {
  const uid = uidOf(useId())
  const fx = `foe-fx-${uid}`
  const glow = `foe-glow-${uid}`
  return (
    <svg viewBox="0 0 200 220" className="size-full overflow-visible" aria-hidden>
      <defs>
        <SilhouetteFilter id={fx} />
        <GlowFilter id={glow} />
      </defs>
      {kind === 0 && (
        <>
          <g filter={`url(#${fx})`} fill={INK}>
            <path d="M74 62C52 52 38 30 44 4c8 22 22 34 40 42Z" />
            <path d="M126 62c22-10 36-32 30-58-8 22-22 34-40 42Z" />
            <path d="M64 78C70 46 84 26 100 14c12 16 28 36 36 64Z" />
            <path d="M22 84C64 66 136 66 178 84L160 92C124 82 76 82 40 92Z" />
            <path d="M52 88C38 124 34 166 40 204L56 188 64 214 80 192 92 218 106 194 120 216 132 190 146 210 160 186C166 150 162 118 148 88Z" />
            <g className="bsc-loop" style={part(140, 122, 'bsc-arm 2.2s ease-in-out infinite')}>
              <path d="M144 112C168 120 186 142 190 172L182 162 180 180 172 166 166 182 164 162C158 142 148 130 138 126Z" />
            </g>
            <g className="bsc-loop" style={part(60, 120, 'bsc-arm 2.6s ease-in-out -1s infinite reverse')}>
              <path d="M56 116C40 124 30 140 28 160l8-6 2 12 6-12 6 8 2-16C56 136 60 126 62 120Z" />
            </g>
          </g>
          <path d="M66 70 134 70 137 79 63 79Z" fill={RED} />
          <path d="M66 92Q100 110 134 92Q130 128 100 134Q70 128 66 92Z" fill="#000" />
          <g filter={`url(#${glow})`}>
            <path d="M76 100 98 108 80 112Z" fill={RED} />
            <path d="M124 100 102 108 120 112Z" fill={RED} />
          </g>
          <path d="M80 103 92 107M120 103 108 107" stroke={WHITE} strokeWidth="1.6" />
          <path d="M82 120l4 5 4-5 4 5 4-5 4 5 4-5 4 5 4-5 4 5" stroke={WHITE} strokeWidth="2" fill="none" />
        </>
      )}
      {kind === 1 && (
        <>
          <g filter={`url(#${fx})`} fill={INK}>
            <path d="M58 56 48 18 74 44 80 6 94 36 100 0 106 36 120 6 126 44 152 18 142 56Z" />
            <path d="M38 118C38 62 66 36 100 36s62 26 62 82c0 12-8 20-20 18H58c-12 2-20-6-20-18Z" />
            {['M52 130C42 160 60 178 46 210 66 190 64 166 72 132Z', 'M78 134C72 166 88 182 80 214 96 190 92 166 96 136Z', 'M104 136C104 168 120 184 114 216 128 190 120 166 120 136Z', 'M130 132C134 162 152 176 150 206 162 182 150 160 146 130Z'].map((d, i) => (
              <g key={i} className="bsc-loop" style={part(62 + i * 26, 132, `bsc-tent ${1.6 + i * 0.25}s ease-in-out ${-i * 0.4}s infinite`)}>
                <path d={d} />
              </g>
            ))}
          </g>
          <ellipse cx="100" cy="86" rx="33" ry="25" fill={WHITE} />
          <circle cx="100" cy="88" r="15" fill={RED} filter={`url(#${glow})`} />
          <ellipse cx="100" cy="88" rx="4" ry="12" fill={BLACK} />
          <circle cx="107" cy="80" r="4" fill={WHITE} />
          <ellipse className="bsc-loop" cx="100" cy="86" rx="35" ry="27" fill={INK} style={part(100, 86, 'bsc-blink 3.4s ease-in-out infinite')} />
          <path d="M72 122h56M80 117v10M92 117v10M104 117v10M116 117v10" stroke={RED} strokeWidth="3" />
        </>
      )}
      {kind === 2 && (
        <>
          <g filter={`url(#${fx})`} fill={INK}>
            <g className="bsc-loop" style={part(86, 94, 'bsc-flap 1.5s ease-in-out infinite')}>
              <path d="M86 94C62 70 32 62 4 70l18 8L2 90l24 4L8 110h26l-14 18 28-6-4 20 20-16c8-8 16-20 20-28Z" />
            </g>
            <g transform="translate(200 0) scale(-1 1)">
              <g className="bsc-loop" style={part(86, 94, 'bsc-flap 1.5s ease-in-out -0.1s infinite')}>
                <path d="M86 94C62 70 32 62 4 70l18 8L2 90l24 4L8 110h26l-14 18 28-6-4 20 20-16c8-8 16-20 20-28Z" />
              </g>
            </g>
            <path d="M80 82C70 122 76 160 100 196 124 160 130 122 120 82 114 68 86 68 80 82Z" />
            <path d="M78 74C76 48 90 32 104 32c18 0 28 18 22 42Z" />
            <path d="M88 40 80 12l18 20 4-28 8 28 16-16-8 26Z" />
            <path d="M88 186 78 218l18-16 4 18 4-18 18 16-10-32Z" />
          </g>
          <path d="M84 56C96 48 114 48 126 56l30 10-30 8C114 80 94 80 84 72Z" fill={WHITE} />
          <path d="M126 60l26 6-26 5Z" fill={RED} />
          <g filter={`url(#${glow})`}>
            <path d="M92 59l13 4-12 4Z" fill={RED} />
            <path d="M118 59l-10 4 10 4Z" fill={RED} />
          </g>
          <path d="M100 100l-8 14 8 14 8-14Z" fill={RED} opacity=".85" />
        </>
      )}
    </svg>
  )
}

/* ───────────── 味方の顔とシルエット ───────────── */

const HAIR = [
  'M18 32 16 18 22 8 32 4 44 8 50 16 52 28 48 22 46 30 42 18 38 26 34 16 30 26 26 18 22 30Z',
  'M17 42C15 16 24 9 32 9s17 7 15 33l3 20-9-4-1-30-16-6-4 32-8 4Z',
  'M19 27C19 14 25 10 32 10s13 4 13 17Z',
  'M17 36C16 14 24 8 34 8s16 8 14 24L40 20 24 26l-2 14Z',
]
function Portrait({ who, glow }: { who: number; glow: boolean }) {
  const eye = glow ? RED : WHITE
  return (
    <svg viewBox="0 0 64 64" className="size-full" aria-hidden>
      {who === 3 && <path d="M8 64C6 30 16 7 32 7s27 21 24 57Z" fill="#2a2632" />}
      <path d="M4 64c2-12 13-17 28-17s26 5 28 17Z" fill={BLACK} />
      <path d="M26 38h12v12H26Z" fill={BLACK} />
      <ellipse cx="32" cy="30" rx="12" ry="14" fill={BLACK} />
      <path d={HAIR[who]} fill={BLACK} />
      {who === 0 && <path d="M20 50 32 56 46 48 50 52 32 62 16 54Z" fill={RED} stroke={BLACK} strokeWidth="1" />}
      {who === 2 && (
        <>
          <path d="M19 23h27v4H19Z" fill={WHITE} />
          <path d="M45 24l11 4-4-6 6-3Z" fill={WHITE} />
        </>
      )}
      {who === 1 ? (
        <>
          <path d="M22 28h8v6h-8ZM34 28h8v6h-8ZM30 30h4" fill="none" stroke={WHITE} strokeWidth="1.3" />
          <path d="M24 31l5 .8-5 1.6ZM40 31l-5 .8 5 1.6Z" fill={eye} />
        </>
      ) : (
        <>
          <path d="M23 31l6 1-6 2Z" fill={eye} />
          {who !== 3 && <path d="M41 31l-6 1 6 2Z" fill={eye} />}
        </>
      )}
    </svg>
  )
}

const HERO_HAIR = [
  'M54 44 52 26 60 16 72 12 86 18 90 30 94 22 92 40 86 32 82 40 78 30 72 38 66 28 62 40Z',
  'M54 54C52 26 62 20 72 20s20 6 18 30l2 34-8-6-2-26-20-8-8 34-6 0Z',
  'M56 36C56 24 64 22 72 22s16 4 16 14Z',
  'M50 56C48 26 60 18 74 18s24 8 22 36L88 30 60 34Z',
]
/** 総攻撃チャンスとリザルトで使う全身シルエット(右向き) */
function Hero({ who }: { who: number }) {
  const uid = uidOf(useId())
  const fx = `hero-fx-${uid}`
  const glow = `hero-glow-${uid}`
  return (
    <svg viewBox="0 0 180 250" className="h-full w-auto overflow-visible" aria-hidden>
      <defs>
        <SilhouetteFilter id={fx} r={2.4} dx={7} dy={4} />
        <GlowFilter id={glow} />
      </defs>
      <g filter={`url(#${fx})`} fill={INK}>
        {who === 3 && <path d="M48 58C44 24 58 12 74 12s32 12 26 46L92 40 56 42Z" />}
        <path d="M50 64 38 104l6 20 8-18 6-38Z" />
        <path d="M58 52h26l14 12 4 54-8 6H52l-6-6 2-54Z" />
        <path d="M48 116h48l14 54-18-10-6 16-14-14-12 14-6-16-18 10Z" />
        <path d="M54 146h14l-4 46-10 46H40l10-46Z" />
        <path d="M76 146h14l8 44 16 46H100l-14-44Z" />
        <ellipse cx="72" cy="40" rx="14" ry="16" />
        <path d={HERO_HAIR[who]} />
        {who === 0 && (
          <>
            <path d="M82 60 112 72 114 80 106 82 80 72Z" />
            <path d="M110 72 174 46 177 51 114 82Z" />
            <path d="M108 66l8 18-4 2-8-18Z" />
          </>
        )}
        {who === 1 && (
          <>
            <path d="M82 62 104 40 110 44 90 72Z" />
            <path d="M104 46 128 2 132 4 110 48Z" />
          </>
        )}
        {who === 2 && (
          <>
            <path d="M82 60 110 64 112 78 84 76Z" />
            <path d="M106 58h14l4 8-2 12h-16Z" />
          </>
        )}
        {who === 3 && (
          <>
            <path d="M82 58 118 60 118 68 82 72Z" />
            <path d="M118 16C146 40 146 92 118 116l-4-4C138 90 138 44 114 20Z" />
          </>
        )}
      </g>
      {who === 0 && <path d="M60 56 74 62 88 54 92 60 74 72 58 64Z" fill={RED} />}
      {who === 1 && <circle cx="131" cy="4" r="7" fill={RED} filter={`url(#${glow})`} />}
      {who === 2 && <path d="M56 33h32v5H56Z" fill={RED} />}
      {who === 3 && <path d="M118 18 100 66 118 114" stroke={WHITE} strokeWidth="1.5" fill="none" />}
      <path d="M76 40l9 1-9 3Z" fill={RED} filter={`url(#${glow})`} />
    </svg>
  )
}

/** カットインの目元(4人ぶんのオリジナルの顔) */
const EYES = [
  {
    skin: '#f2e0cf', iris: RED, pc: [228, 106],
    eye: 'M168 110Q206 86 270 96l12 10q-38 22-104 14Z', lash: 'M162 110Q204 80 270 92l20 8', brow: 'M164 78 272 64l10 12-108 14Z',
    hair: 'M0 0H600V34L574 80 552 28 522 72 498 22 466 74 444 24 410 62 388 18 356 56 334 14 300 52 268 14 246 56 214 18 192 60 160 22 136 72 104 24 80 68 48 26 26 76 0 32Z',
  },
  {
    skin: '#f6e6da', iris: DEEP, pc: [224, 104],
    eye: 'M174 104Q212 78 268 100Q262 126 222 128Q190 126 174 104Z', lash: 'M170 104Q212 72 272 98', brow: 'M176 66Q220 52 270 62l-2 8Q220 62 178 74Z',
    hair: 'M0 0H600V40Q560 70 540 110L520 40Q470 60 430 46L400 70 380 30Q340 50 300 40 260 50 220 30L200 70 170 46Q130 60 80 40L60 110Q40 70 0 40Z',
  },
  {
    skin: '#e9cfb8', iris: BLACK, pc: [228, 104],
    eye: 'M168 106 276 92l8 12Q238 124 176 118Z', lash: 'M164 106 282 90', brow: 'M156 86 282 58l8 20L164 102Z',
    hair: 'M0 0H600V22L560 34 520 20 480 34 440 20 400 32 360 20 320 32 280 20 240 32 200 20 160 34 120 20 80 34 40 22 0 30Z',
  },
  {
    skin: '#f0dccb', iris: '#2a2632', pc: [222, 110],
    eye: 'M170 112Q214 98 272 104q-6 14-50 16q-34 0-52-8Z', lash: 'M166 110Q214 92 278 102', brow: 'M170 84Q220 76 272 84l-2 6Q220 84 172 92Z',
    hair: 'M0 0H600V150L566 70 530 140 506 56 470 44 430 40 390 34 350 34 310 38 270 34 230 44 190 52 150 62 110 44 70 34 30 52 0 44Z',
  },
] as const

function EyeStrip({ who }: { who: number }) {
  const uid = uidOf(useId())
  const v = EYES[who]
  const clip = `eye-clip-${uid}`
  const half = `eye-half-${uid}`
  return (
    <svg viewBox="0 0 600 160" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden>
      <defs>
        <clipPath id={clip}>
          <path d={v.eye} />
        </clipPath>
      </defs>
      <rect width="600" height="160" fill={v.skin} />
      <path d="M330 0h270v160H300Z" fill="rgba(12,11,13,.1)" />
      <g id={half}>
        <path d={v.eye} fill="#fff" />
        <g clipPath={`url(#${clip})`}>
          <circle cx={v.pc[0]} cy={v.pc[1]} r="17" fill={v.iris} />
          <circle cx={v.pc[0]} cy={v.pc[1]} r="7" fill={BLACK} />
          <circle cx={v.pc[0] + 6} cy={v.pc[1] - 6} r="4.5" fill="#fff" />
        </g>
        <path d={v.lash} fill="none" stroke={BLACK} strokeWidth="8" strokeLinecap="square" />
        <path d={v.brow} fill={BLACK} />
      </g>
      <use href={`#${half}`} transform="translate(600 0) scale(-1 1)" />
      <path d="M300 112l-8 40" stroke="rgba(12,11,13,.28)" strokeWidth="3" />
      {who === 1 && (
        <g fill="none" stroke={BLACK} strokeWidth="6">
          <path d="M152 72h134l-6 66H158Z" />
          <path d="M448 72H314l6 66h122Z" />
          <path d="M286 96h28" />
        </g>
      )}
      {who === 3 && <path d="M200 64 236 146" stroke="#b98679" strokeWidth="5" />}
      <path d={v.hair} fill={BLACK} />
      {who === 2 && (
        <>
          <path d="M0 18H600V44H0Z" fill={RED} />
          <path d="M0 26H600V30H0Z" fill={WHITE} />
        </>
      )}
    </svg>
  )
}

/* ───────────── 演出パーツ ───────────── */

const ORBIT = Array.from({ length: 13 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2
  return `${((i / 12) * 100).toFixed(2)}%{transform:translate(${(Math.cos(a) * 2.6).toFixed(2)}em,${(Math.sin(a) * 0.8).toFixed(2)}em) scale(${(0.8 + 0.35 * Math.sin(a)).toFixed(2)})}`
}).join('')

function Dizzy({ size }: { size: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute" style={{ fontSize: size / 10 }}>
      {[0, 1, 2].map((i) => (
        <svg
          key={i}
          viewBox="-10 -10 20 20"
          className="bsc-loop absolute"
          style={{ width: '1.7em', height: '1.7em', left: '-0.85em', top: '-0.85em', animation: `bsc-orbit 1.1s linear ${-i * 0.366}s infinite` }}
        >
          <path d="M0-9 2.4-2.4 9 0 2.4 2.4 0 9-2.4 2.4-9 0-2.4-2.4Z" fill={i === 1 ? RED : WHITE} stroke={BLACK} strokeWidth="1.6" />
        </svg>
      ))}
    </div>
  )
}

/** コミック調のダメージ数字 */
function DamagePop({ amount, kind, size, heal }: { amount: number; kind: HitKind; size: number; heal?: boolean }) {
  const digits = [...String(amount)]
  const big = kind === 'weak' ? 1.5 : kind === 'resist' ? 0.72 : 1
  const fill = heal ? WHITE : kind === 'weak' ? RED : kind === 'resist' ? '#bdb6ad' : WHITE
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute flex -translate-x-1/2 flex-col items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0], y: [0, -size * 0.25, -size * 0.3, -size * 0.55] }}
      transition={{ duration: 1.25, times: [0, 0.08, 0.75, 1], ease: 'easeOut' }}
    >
      {kind === 'resist' && <span className="mb-0.5 -skew-x-12 bg-[#0c0b0d] px-1.5 font-black text-[#f6f1e7] ring-2 ring-[#f6f1e7]" style={{ fontSize: size * 0.22 }}>耐性</span>}
      <span className="flex" style={{ fontSize: size * big, lineHeight: 1 }}>
        {heal && <span className="font-['Space_Grotesk'] font-bold italic" style={{ color: fill, WebkitTextStroke: `${size * 0.06}px ${BLACK}`, paintOrder: 'stroke fill' }}>+</span>}
        {digits.map((d, i) => (
          <motion.span
            key={i}
            className="inline-block font-['Space_Grotesk'] font-bold italic"
            style={{ color: fill, WebkitTextStroke: `${size * 0.07}px ${BLACK}`, paintOrder: 'stroke fill', textShadow: `${size * 0.06}px ${size * 0.06}px 0 ${kind === 'weak' ? BLACK : RED}` }}
            initial={{ scale: 0, y: size * 0.4, rotate: (i % 2 ? 1 : -1) * 30 }}
            animate={{ scale: [0, 1.55, 1], y: [size * 0.4, -size * 0.12, 0], rotate: (i % 2 ? 1 : -1) * 7 }}
            transition={{ duration: 0.34, delay: i * 0.04, ease: SNAP }}
          >
            {d}
          </motion.span>
        ))}
      </span>
    </motion.div>
  )
}

const tb = (x: number, y: number): CSSProperties => ({ transformBox: 'view-box', transformOrigin: `${x}px ${y}px` })

/** 属性ごとのヒットエフェクト(SVG) */
function HitBurst({ el, kind }: { el: Elem; kind: HitKind }) {
  const sc = kind === 'resist' ? 0.6 : kind === 'weak' ? 1.15 : 0.9
  const fade = { duration: 0.55, times: [0, 0.3, 1] }
  let body: ReactNode = null
  if (el === '斬')
    body = [-28, -8, 12].map((a, i) => (
      <g key={i} transform={`rotate(${a + 30})`}>
        <motion.polygon points="-60,-1.5 60,-5 60,5 -60,1.5" fill={i === 1 ? RED : WHITE} stroke={BLACK} strokeWidth="1.2" style={tb(-60, 0)} initial={{ scaleX: 0 }} animate={{ scaleX: [0, 1, 1], opacity: [1, 1, 0] }} transition={{ duration: 0.4, delay: i * 0.06, times: [0, 0.4, 1] }} />
      </g>
    ))
  else if (el === '銃')
    body = (
      <>
        <motion.polygon points="0,-34 8,-8 34,-10 12,4 22,30 0,14 -22,30 -12,4 -34,-10 -8,-8" fill={WHITE} stroke={BLACK} strokeWidth="2" style={tb(0, 0)} initial={{ scale: 0 }} animate={{ scale: [0, 1.2, 0.9], opacity: [1, 1, 0] }} transition={fade} />
        {[
          [-12, -6],
          [10, 4],
          [-2, 16],
        ].map(([x, y], i) => (
          <motion.circle key={i} cx={x} cy={y} r="4" fill={BLACK} stroke={RED} strokeWidth="2" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }} transition={{ duration: 0.7, delay: i * 0.07 }} />
        ))}
      </>
    )
  else if (el === '火')
    body = [-36, -22, -8, 6, 20, 34].map((x, i) => (
      <motion.path key={i} d={`M${x - 9} 46Q${x - 12} 10 ${x + (i % 2 ? 6 : -6)} ${-28 - (i % 3) * 12}Q${x + 14} 10 ${x + 9} 46Z`} fill={i % 2 ? WHITE : RED} stroke={BLACK} strokeWidth="1.5" style={tb(x, 46)} initial={{ scaleY: 0 }} animate={{ scaleY: [0, 1.1, 0.2], opacity: [1, 1, 0] }} transition={{ duration: 0.6, delay: i * 0.03, times: [0, 0.35, 1] }} />
    ))
  else if (el === '氷')
    body = [0, 50, 110, 170, 230, 300].map((a, i) => (
      <g key={i} transform={`rotate(${a})`}>
        <motion.polygon points={`0,-5 ${44 + (i % 2) * 12},0 0,5`} fill={WHITE} stroke={BLACK} strokeWidth="2" style={tb(0, 0)} initial={{ scaleX: 0 }} animate={{ scaleX: [0, 1, 1, 1.2], opacity: [1, 1, 1, 0] }} transition={{ duration: 0.65, times: [0, 0.25, 0.7, 1], delay: i * 0.02 }} />
      </g>
    ))
  else if (el === '雷')
    body = (
      <motion.polygon points="-6,-70 14,-70 0,-20 16,-20 -16,40 -4,-6 -18,-6" fill={WHITE} stroke={RED} strokeWidth="3" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.2, 1, 0.4, 0] }} transition={{ duration: 0.55 }} />
    )
  else if (el === '風')
    body = [0, 1, 2].map((i) => (
      <motion.path key={i} d={`M${-40 + i * 6} 0A${40 - i * 8} ${26 - i * 5} 0 1 1 ${30 - i * 6} ${12 - i * 4}`} fill="none" stroke={i === 1 ? RED : WHITE} strokeWidth={6 - i * 1.5} strokeLinecap="square" style={tb(0, 0)} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 200, opacity: [0, 1, 1, 0] }} transition={{ duration: 0.6, delay: i * 0.05, ease: 'easeOut' }} />
    ))
  else if (el === '光')
    body = (
      <>
        {Array.from({ length: 12 }, (_, i) => (
          <g key={i} transform={`rotate(${i * 30})`}>
            <motion.polygon points={`0,-2.5 ${i % 2 ? 46 : 60},0 0,2.5`} fill={WHITE} style={tb(0, 0)} initial={{ scaleX: 0 }} animate={{ scaleX: [0, 1, 1.15], opacity: [1, 1, 0] }} transition={fade} />
          </g>
        ))}
        <motion.circle r="16" fill={WHITE} stroke={RED} strokeWidth="3" style={tb(0, 0)} initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 0], opacity: [1, 1, 0] }} transition={fade} />
      </>
    )
  else if (el === '闇')
    body = (
      <>
        <motion.path d={SPLAT_SMALL} fill={BLACK} stroke={RED} strokeWidth="3" style={tb(0, 0)} initial={{ scale: 0 }} animate={{ scale: [0, 1, 0.8, 0], opacity: [1, 1, 1, 0] }} transition={{ duration: 0.7, times: [0, 0.3, 0.75, 1] }} />
        <motion.path d="M-10-4l6 2-6 2ZM10-4l-6 2 6 2Z" fill={RED} initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.6, delay: 0.1 }} />
      </>
    )
  return (
    <svg viewBox="-60 -60 120 120" className="pointer-events-none absolute inset-0 size-full overflow-visible" aria-hidden>
      <g transform={`scale(${sc})`}>{body}</g>
      {kind === 'resist' && (
        <motion.polygon points="0,-40 35,-20 35,20 0,40 -35,20 -35,-20" fill="none" stroke={WHITE} strokeWidth="3" style={tb(0, 0)} initial={{ scale: 0.4, opacity: 1 }} animate={{ scale: 1.3, opacity: 0 }} transition={{ duration: 0.5 }} />
      )}
    </svg>
  )
}

/** 手続き生成の墨しぶき */
function makeSplat(seed: number, n: number, R: number) {
  const r = mulberry32(seed)
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + (r() - 0.5) * 0.15
    const k = r() < 0.3 ? 1.25 + r() * 0.5 : 0.8 + r() * 0.2
    return [Math.cos(a) * k * R, Math.sin(a) * k * R] as const
  })
  const f = (v: number) => v.toFixed(1)
  const mid = (p: readonly [number, number], q: readonly [number, number]) => `${f((p[0] + q[0]) / 2)} ${f((p[1] + q[1]) / 2)}`
  let d = `M${mid(pts[n - 1], pts[0])}`
  pts.forEach((p, i) => {
    d += `Q${f(p[0])} ${f(p[1])} ${mid(p, pts[(i + 1) % n])}`
  })
  const drops = Array.from({ length: 16 }, () => {
    const a = r() * Math.PI * 2
    const dist = R * (1.35 + r() * 0.7)
    return { x: Math.cos(a) * dist, y: Math.sin(a) * dist, r: 1.5 + r() * 5 }
  })
  return { d: d + 'Z', drops }
}
const SPLAT_SMALL = makeSplat(3, 18, 30).d
const SPLAT_BLACK = makeSplat(7, 30, 52)
const SPLAT_RED = makeSplat(23, 26, 56)

/** 弱点を突いたときの巨大な「WEAK」 */
function WeakImpact({ s }: { s: number }) {
  const R = 150 * s
  const lines = useMemo(() => {
    const r = mulberry32(99)
    return Array.from({ length: 30 }, (_, i) => {
      const a = (i / 30) * Math.PI * 2 + r() * 0.1
      const w = 0.035 + r() * 0.05
      const r0 = 0.42 + r() * 0.15
      const p = (ang: number, rad: number) => `${(Math.cos(ang) * rad * 100).toFixed(1)},${(Math.sin(ang) * rad * 100).toFixed(1)}`
      return { pts: `${p(a - w, r0)} ${p(a, 1.05)} ${p(a + w, r0)}`, c: i % 3 === 0 ? RED : i % 2 ? WHITE : BLACK }
    })
  }, [])
  const burst = useMemo(() => {
    const r = mulberry32(5)
    return Array.from({ length: 34 }, (_, i) => {
      const a = (i / 34) * Math.PI * 2
      const rad = i % 2 ? 34 + r() * 6 : 48 + r() * 14
      return `${(Math.cos(a) * rad * 1.35).toFixed(1)},${(Math.sin(a) * rad).toFixed(1)}`
    }).join(' ')
  }, [])
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute"
      style={{ width: R * 2, height: R * 2, left: -R, top: -R }}
      initial={{ scale: 2.6, rotate: -28, opacity: 0 }}
      animate={{ scale: [2.6, 0.9, 1.06, 1, 1, 1.3], rotate: [-28, -8, -11, -10, -10, -4], opacity: [0, 1, 1, 1, 1, 0], x: [0, 0, 0, 0, 0, 70 * s] }}
      transition={{ duration: 1.1, times: [0, 0.09, 0.15, 0.22, 0.86, 1] }}
    >
      <motion.svg viewBox="-100 -100 200 200" className="absolute inset-[-20%] size-[140%] overflow-visible" initial={{ rotate: 0 }} animate={{ rotate: 10 }} transition={{ duration: 1.1, ease: 'linear' }}>
        {lines.map((l, i) => (
          <polygon key={i} points={l.pts} fill={l.c} />
        ))}
      </motion.svg>
      <svg viewBox="-100 -100 200 200" className="absolute inset-0 size-full overflow-visible">
        <polygon points={burst} fill={RED} transform="translate(7 7)" />
        <polygon points={burst} fill={WHITE} stroke={BLACK} strokeWidth="3.5" strokeLinejoin="miter" />
        <circle r="60" fill="none" stroke={BLACK} strokeWidth="1" strokeDasharray="2 5" opacity=".5" />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <Ransom text="WEAK" size={`${62 * s}px`} shadow={RED} slam delay={0.04} />
      </div>
    </motion.div>
  )
}

/** 回転するギザギザの照準 */
function Reticle({ size, reduced }: { size: number; reduced: boolean }) {
  const star = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => {
        const a = (i / 36) * Math.PI * 2
        const r = i % 2 ? 40 : 48
        return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`
      }).join(' '),
    [],
  )
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute"
      style={{ width: size, height: size, left: -size / 2, top: -size / 2 }}
      initial={reduced ? false : { scale: 1.9, opacity: 0, rotate: -60 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 640, damping: 22 }}
    >
      <svg viewBox="-50 -50 100 100" className="bsc-loop absolute inset-0 size-full overflow-visible" style={{ animation: 'bsc-spin 6s linear infinite' }}>
        <polygon points={star} fill="none" stroke={BLACK} strokeWidth="7" strokeLinejoin="miter" />
        <polygon points={star} fill="none" stroke={RED} strokeWidth="3.5" strokeLinejoin="miter" />
      </svg>
      <svg viewBox="-50 -50 100 100" className="bsc-loop absolute inset-[14%] size-[72%] overflow-visible" style={{ animation: 'bsc-spin 3s linear infinite reverse' }}>
        <circle r="44" fill="none" stroke={WHITE} strokeWidth="3" strokeDasharray="14 9" />
        {[0, 90, 180, 270].map((a) => (
          <polygon key={a} points="-7,-58 7,-58 0,-46" fill={WHITE} stroke={BLACK} strokeWidth="2" transform={`rotate(${a})`} />
        ))}
      </svg>
      <svg viewBox="-50 -50 100 100" className="absolute inset-[38%] size-[24%]">
        <polygon points="0,-40 40,0 0,40 -40,0" fill={RED} stroke={WHITE} strokeWidth="8" />
      </svg>
    </motion.div>
  )
}

/* ───────────── 敵1体 ───────────── */

const FOE_X = [18, 50, 82]
const FOE_FEET = [82, 70, 84]
const FOE_SCALE = [1, 0.88, 1]
/** ダウン時に倒れる向き(画面端からはみ出さないよう左端の敵は右へ倒れる) */
const FALL_DIR = [1, -1, -1]

function Enemy({
  idx, foe, E, hit, lunge, targeted, pickable, cower, reduced, onPick, onHover,
}: {
  idx: number; foe: Foe; E: number; hit: Hit | null; lunge: number; targeted: boolean; pickable: boolean; cower: boolean; reduced: boolean; onPick: () => void; onHover: () => void
}) {
  const [scope, anim] = useAnimate()
  const size = E * FOE_SCALE[idx]
  useEffect(() => {
    if (!hit || reduced || !scope.current) return
    const amp = hit.kind === 'resist' ? 4 : 16
    anim(scope.current, { x: [0, -amp, amp * 0.8, -amp * 0.5, amp * 0.2, 0], filter: ['brightness(0) invert(1)', 'brightness(0) invert(1)', 'brightness(1) invert(0)'] }, { duration: 0.42 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hit?.key])
  useEffect(() => {
    if (!lunge || reduced || !scope.current) return
    anim(scope.current, { scale: [1, 1.28, 1], y: [0, size * 0.1, 0] }, { duration: 0.5, ease: SNAP })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lunge])

  const gone = foe.gone !== ''
  const pose = gone
    ? foe.gone === 'flee'
      ? { opacity: 0, y: -size * 0.3, scale: 0.7, rotate: 0, x: 0, filter: 'blur(10px)' }
      : { opacity: 0, scale: 0.3, rotate: -30, x: 0, y: 0, filter: 'blur(0px)' }
    : foe.down
      ? { opacity: 1, rotate: 64 * FALL_DIR[idx], scale: 0.84, x: -size * 0.24 * FALL_DIR[idx], y: size * 0.03, filter: 'blur(0px)' }
      : { opacity: 1, rotate: 0, scale: 1, x: 0, y: 0, filter: 'blur(0px)' }

  return (
    <div
      className="absolute"
      style={{ left: `${FOE_X[idx]}%`, top: `${FOE_FEET[idx]}%`, width: size, height: size * 1.1, marginLeft: -size / 2, marginTop: -size * 1.1, zIndex: idx === 1 ? 1 : 2 }}
    >
      {/* 足元の影 */}
      <div
        className="bsc-loop absolute left-[10%] bottom-[-4%] h-[9%] w-[80%] rounded-[50%]"
        style={{ background: 'radial-gradient(closest-side, rgba(0,0,0,.85), rgba(125,10,16,.4) 70%, transparent)', animation: 'bsc-shadow 2.4s ease-in-out infinite', animationDelay: `${-idx * 0.7}s`, opacity: gone ? 0 : 1 }}
      />
      <motion.div
        className="absolute inset-0"
        style={{ originX: 0.5, originY: 0.95 }}
        initial={false}
        animate={pose}
        transition={reduced ? { duration: 0.15 } : gone ? { duration: foe.gone === 'flee' ? 0.9 : 0.18, ease: 'easeOut' } : { type: 'spring', stiffness: 360, damping: 13 }}
      >
        <div ref={scope} className="absolute inset-0">
          <div
            className="bsc-loop absolute inset-0"
            style={{ animation: cower ? 'bsc-cower .16s linear infinite' : foe.down ? undefined : `bsc-bob ${2.2 + idx * 0.3}s ease-in-out ${-idx * 0.7}s infinite` }}
          >
            <FoeArt kind={idx} />
          </div>
        </div>
      </motion.div>
      {foe.down && !gone && (
        <>
          <div className="absolute" style={{ left: FALL_DIR[idx] > 0 ? '84%' : '16%', top: '44%' }}>
            {!reduced && <Dizzy size={size * 0.75} />}
          </div>
          <motion.span
            className={`absolute top-[28%] ${FALL_DIR[idx] > 0 ? 'right-[0%] rotate-12' : 'left-[0%] -rotate-12'} bg-[#e3141e] px-1.5 font-['Orbitron'] font-black tracking-widest text-[#f6f1e7] ring-2 ring-[#0c0b0d]`}
            style={{ fontSize: Math.max(9, size * 0.075) }}
            initial={reduced ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 700, damping: 16, delay: 0.25 }}
          >
            DOWN
          </motion.span>
        </>
      )}
      {/* ヒットエフェクトとダメージ */}
      {hit && !gone && (
        <div key={hit.key} className="pointer-events-none absolute inset-0">
          {!reduced && (
            <div className="absolute" style={{ left: '-5%', top: '0%', width: '110%', height: '100%' }}>
              <HitBurst el={hit.el} kind={hit.kind} />
            </div>
          )}
          <div className="absolute left-1/2" style={{ top: '6%' }}>
            <DamagePop amount={hit.amount} kind={hit.kind} size={Math.max(20, size * 0.26)} />
          </div>
        </div>
      )}
      {/* 名前・HP・弱点のヒント */}
      <motion.div
        className="absolute left-1/2 top-[100%] mt-[4px] flex -translate-x-1/2 items-center gap-1 whitespace-nowrap"
        style={{ fontSize: clamp(size * 0.065, 9, 16) }}
        animate={{ opacity: gone ? 0 : 1 }}
      >
        <span
          className={`-skew-x-12 px-[0.5em] py-[0.1em] font-black transition-colors duration-100 ${targeted ? 'bg-[#f6f1e7] text-[#0c0b0d] shadow-[3px_3px_0_#e3141e]' : 'bg-[#0c0b0d] text-[#f6f1e7] ring-1 ring-[#f6f1e7]/40'}`}
        >
          <span className="inline-block skew-x-12">{foe.name}</span>
        </span>
        <span className="flex flex-col gap-[2px]">
          <span className="block h-[0.5em] w-[5em] -skew-x-[30deg] bg-[#0c0b0d] ring-1 ring-[#f6f1e7]/50">
            <motion.span className="block h-full bg-[#e3141e]" initial={false} animate={{ width: `${(foe.hp / foe.mhp) * 100}%` }} transition={{ duration: 0.4 }} />
          </span>
          <span className="flex items-center gap-[0.3em] font-black leading-none">
            <span className="flex items-center gap-[1px] bg-[#e3141e] px-[0.25em] text-[#f6f1e7]" title="弱点">
              弱<ElemIcon el={foe.weak} className="size-[1em]" />
            </span>
            <span className="flex items-center gap-[1px] bg-[#f6f1e7] px-[0.25em] text-[#0c0b0d]" title="耐性">
              耐<ElemIcon el={foe.resist} className="size-[1em]" />
            </span>
          </span>
        </span>
      </motion.div>
      {pickable && (
        <button
          type="button"
          aria-label={`${foe.name}を狙う`}
          onClick={onPick}
          onMouseEnter={onHover}
          onFocus={onHover}
          className="absolute inset-0 cursor-crosshair rounded-[30%] outline-none focus-visible:ring-2 focus-visible:ring-[#f6f1e7]"
        />
      )}
    </div>
  )
}

/* ───────────── 味方タイル ───────────── */

const TILE_W = 100
const TILE_H = 112
const ACTIVE_SCALE = 1.24
const SLOT_ACTIVE = 138
const GAP = 6
const tileX = (i: number, active: number) => {
  let x = 0
  for (let k = 0; k < i; k++) x += (k === active ? SLOT_ACTIVE : TILE_W) + GAP
  return x + ((i === active ? SLOT_ACTIVE : TILE_W) - TILE_W) / 2
}

function Tile({ m, i, x, isActive, fx, reduced, phaseIdle }: { m: Member; i: number; x: number; isActive: boolean; fx: MemberFx | null; reduced: boolean; phaseIdle: boolean }) {
  const [scope, anim] = useAnimate()
  const mine = fx && fx.member === i ? fx : null
  useEffect(() => {
    if (!mine || reduced || !scope.current) return
    if (mine.type === 'lunge') anim(scope.current, { y: [0, -26, 0], x: [0, -18, 0], rotate: [0, -5, 0] }, { duration: 0.42, ease: SNAP })
    else if (mine.type === 'hit') anim(scope.current, { x: [0, -12, 10, -6, 3, 0], rotate: [0, -3, 2, 0] }, { duration: 0.42 })
    else anim(scope.current, { y: [0, -10, 0], scale: [1, 1.06, 1] }, { duration: 0.4 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mine?.key])

  const hpRate = m.hp / m.mhp
  const clip = 'polygon(7% 0, 100% 4%, 93% 100%, 0 95%)'
  return (
    <motion.div
      className="absolute bottom-0"
      style={{ width: TILE_W, height: TILE_H, originX: 0.5, originY: 1, zIndex: isActive ? 5 : 1 }}
      initial={false}
      animate={{ x, scale: isActive ? ACTIVE_SCALE : 1, y: isActive ? -6 : 0 }}
      transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 17 }}
    >
      <div ref={scope} className="relative size-full">
        {/* 行動中: 赤いずらし影と白い縁 */}
        <motion.div className="absolute inset-0" style={{ clipPath: clip, background: RED }} initial={false} animate={{ x: isActive ? 7 : 2, y: isActive ? 6 : 2, opacity: isActive ? 1 : 0.6 }} />
        <motion.div className="absolute -inset-[3px]" style={{ clipPath: clip, background: WHITE }} initial={false} animate={{ opacity: isActive ? 1 : 0.35 }} />
        <div className="absolute inset-0 overflow-hidden bg-[#0c0b0d]" style={{ clipPath: clip }}>
          <div
            className="absolute inset-x-0 top-0 h-[58%]"
            style={{
              background: isActive
                ? `radial-gradient(circle, rgba(12,11,13,.35) 0 30%, transparent 33%) 0 0/6px 6px, linear-gradient(160deg, ${RED} 0 62%, ${DEEP} 62%)`
                : `radial-gradient(circle, rgba(12,11,13,.4) 0 30%, transparent 33%) 0 0/6px 6px, linear-gradient(160deg, #5b0a10 0 62%, #2a0508 62%)`,
            }}
          />
          <span
            className="absolute right-[2%] top-[-6%] font-black leading-none text-transparent"
            style={{ fontSize: 46, WebkitTextStroke: `1.5px ${isActive ? 'rgba(246,241,231,.55)' : 'rgba(246,241,231,.2)'}` }}
          >
            {m.role}
          </span>
          <div className="absolute bottom-[42%] left-[18%] h-[56%] w-[64%]">
            <Portrait who={i} glow={isActive} />
          </div>
          <span className="absolute left-[4%] top-[47%] -rotate-6 bg-[#f6f1e7] px-1 text-[11px] leading-[1.25] font-black text-[#0c0b0d] shadow-[2px_2px_0_#e3141e]">{m.name}</span>
          <div className="absolute inset-x-[9%] bottom-[7%] grid grid-cols-[1.4em_minmax(0,1fr)] items-center gap-x-1 gap-y-[3px] font-mono text-[8px] font-bold">
            <span>HP</span>
            <span className="flex items-center gap-1">
              <span className="h-[5px] min-w-0 flex-1 -skew-x-[30deg] bg-[#f6f1e7]/20">
                <motion.span className={`block h-full ${hpRate < 0.3 ? 'bg-[#e3141e]' : 'bg-[#f6f1e7]'}`} initial={false} animate={{ width: `${hpRate * 100}%` }} transition={{ duration: 0.35 }} />
              </span>
              <motion.span key={m.hp} className="w-[2.4em] text-right font-['Space_Grotesk'] text-[13px] leading-none italic tabular-nums" initial={reduced ? false : { scale: 1.6, color: RED }} animate={{ scale: 1, color: WHITE }}>
                {m.hp}
              </motion.span>
            </span>
            <span className="text-[#e3141e]">SP</span>
            <span className="flex items-center gap-1">
              <span className="h-[5px] min-w-0 flex-1 -skew-x-[30deg] bg-[#f6f1e7]/20">
                <motion.span className="block h-full bg-[#e3141e]" initial={false} animate={{ width: `${(m.sp / m.msp) * 100}%` }} transition={{ duration: 0.35 }} />
              </span>
              <motion.span key={m.sp} className="w-[2.4em] text-right font-['Space_Grotesk'] text-[13px] leading-none italic tabular-nums" initial={reduced ? false : { scale: 1.5, color: RED }} animate={{ scale: 1, color: WHITE }}>
                {m.sp}
              </motion.span>
            </span>
          </div>
          {mine?.type === 'hit' && <motion.div key={mine.key} className="absolute inset-0 bg-[#e3141e] mix-blend-screen" initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 0.45 }} />}
        </div>
        {m.guard && (
          <span className="absolute -left-1 top-1 grid size-6 -rotate-12 place-items-center bg-[#f6f1e7] text-[#0c0b0d] ring-2 ring-[#0c0b0d]" title="ガード中">
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
              {GLYPHS.guard}
            </svg>
          </span>
        )}
        {isActive && phaseIdle && (
          <svg viewBox="0 0 20 14" className="bsc-loop absolute -top-4 left-1/2 w-5" style={{ animation: 'bsc-marker .7s ease-in-out infinite', transform: 'translateX(-50%)' }} aria-hidden>
            <polygon points="0,0 20,0 10,14" fill={RED} stroke={WHITE} strokeWidth="2.5" />
          </svg>
        )}
        {mine && (mine.type === 'hit' || mine.type === 'heal') && mine.amount !== undefined && (
          <div key={mine.key} className="absolute left-1/2 top-[-6%]">
            <DamagePop amount={mine.amount} kind="normal" size={26} heal={mine.type === 'heal'} />
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* ───────────── コマンドの扇 ───────────── */

const JAGS = [
  '0,22 8,0 36,10 60,1 100,14 93,50 100,88 66,100 34,90 3,100 8,58',
  '4,8 30,0 52,12 82,2 100,20 95,62 99,100 58,90 26,100 0,84 6,44',
  '0,14 22,4 44,0 70,10 98,0 92,46 100,78 74,100 40,92 10,100 4,52',
]
const hlWidth = (c: (typeof CMDS)[number]) => (c.label.length + 1) * c.size + c.en.length * 6.2 + 34

function Cluster({
  member, cursor, x, receded, reduced, weakHints, onHover, onChoose,
}: {
  member: Member; cursor: number; x: number; receded: boolean; reduced: boolean; weakHints: Partial<Record<CmdId, boolean>>; onHover: (i: number) => void; onChoose: (i: number) => void
}) {
  const cur = CMDS[cursor]
  const spring = reduced ? { duration: 0 } : { type: 'spring' as const, stiffness: 560, damping: 26, mass: 0.7 }
  const lag = reduced ? { duration: 0 } : { type: 'spring' as const, stiffness: 240, damping: 19 }
  const hlTarget = { x: cur.x, y: cur.y + cur.size / 2, rotate: cur.rot }
  const hlBox = { top: -(cur.size / 2 + 10), width: hlWidth(cur), height: cur.size + 20 }
  return (
    <motion.div
      className="absolute"
      style={{ left: x, top: 12, width: 280, height: 240, pointerEvents: receded ? 'none' : 'auto' }}
      initial={false}
      animate={{ x: receded ? 150 : 0, opacity: receded ? 0.25 : 1, scale: receded ? 0.9 : 1 }}
      exit={reduced ? { opacity: 0, transition: { duration: 0.1 } } : { x: 140, y: 60, opacity: 0, rotate: 10, transition: { duration: 0.16, ease: 'easeIn' } }}
      transition={reduced ? { duration: 0.12 } : { type: 'spring', stiffness: 420, damping: 32 }}
    >
      {/* 行動するキャラクター名 */}
      <motion.div
        className="absolute left-[-64px] top-[-30px] flex flex-col items-start"
        initial={reduced ? false : { x: 80, opacity: 0, rotate: 20 }}
        animate={{ x: 0, opacity: 1, rotate: -7 }}
        transition={{ type: 'spring', stiffness: 600, damping: 22, delay: 0.02 }}
      >
        <span className="-skew-x-12 bg-[#0c0b0d] px-1.5 font-['Orbitron'] text-[8px] font-black tracking-[.3em] text-[#e3141e] ring-1 ring-[#e3141e]">ACTION</span>
        <Ransom text={member.name} size="25px" shadow={RED} animateIn={!reduced} delay={0.06} />
      </motion.div>

      {/* 赤い影(遅れて追従) */}
      <motion.div aria-hidden className="absolute left-0 top-0" initial={false} animate={hlTarget} transition={lag} style={{ originX: 0, originY: 0 }}>
        <motion.div className="absolute left-[-6px]" initial={false} animate={{ ...hlBox, top: hlBox.top + 8 }} transition={lag}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="size-full">
            <polygon points={JAGS[(cursor + 1) % 3]} fill={RED} />
          </svg>
        </motion.div>
      </motion.div>
      {/* 白いハイライト */}
      <motion.div aria-hidden className="absolute left-0 top-0" initial={false} animate={hlTarget} transition={spring} style={{ originX: 0, originY: 0 }}>
        <motion.div className="absolute left-[-14px]" initial={false} animate={hlBox} transition={spring}>
          <motion.svg
            key={cursor}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="size-full"
            initial={reduced ? false : { scaleX: 1.22, scaleY: 0.5 }}
            animate={{ scaleX: 1, scaleY: 1 }}
            transition={{ type: 'spring', stiffness: 760, damping: 14 }}
          >
            <polygon points={JAGS[cursor % 3]} fill={WHITE} stroke={BLACK} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          </motion.svg>
        </motion.div>
        <motion.svg viewBox="0 0 20 20" className="absolute left-[-40px] top-[-10px] size-[20px]" animate={reduced ? undefined : { x: [0, 6, 0] }} transition={{ duration: 0.55, repeat: Infinity, ease: 'easeInOut' }}>
          <polygon points="0,0 20,10 0,20 5,10" fill={RED} stroke={WHITE} strokeWidth="2" />
        </motion.svg>
      </motion.div>

      {CMDS.map((c, i) => {
        const on = i === cursor
        return (
          <motion.button
            key={c.id}
            type="button"
            aria-label={`${c.label}${weakHints[c.id] ? '(弱点を突ける)' : ''}`}
            aria-current={on ? 'true' : undefined}
            tabIndex={receded ? -1 : 0}
            onMouseEnter={() => onHover(i)}
            onFocus={() => onHover(i)}
            onClick={() => onChoose(i)}
            className="absolute flex items-center gap-2 leading-none whitespace-nowrap outline-none focus-visible:[&>.bsc-plate]:ring-2 focus-visible:[&>.bsc-plate]:ring-[#e3141e]"
            style={{ left: c.x, top: c.y, height: c.size, originX: 0, originY: 0.5 }}
            initial={reduced ? { opacity: 0, rotate: c.rot } : { opacity: 0, x: 200 - c.x, y: 230 - c.y, rotate: c.rot + 50, scale: 0.3 }}
            animate={{ opacity: 1, x: 0, y: 0, rotate: c.rot, scale: 1 }}
            transition={reduced ? { duration: 0.12 } : { type: 'spring', stiffness: 640, damping: 24, delay: 0.03 + (CMDS.length - 1 - i) * 0.035 }}
          >
            <span
              className="bsc-plate absolute -inset-y-[5px] -left-[6px] -right-[10px] bg-[#0c0b0d]/85 transition-opacity duration-100"
              style={{ clipPath: 'polygon(4% 0, 100% 10%, 96% 100%, 0 88%)', opacity: on ? 0 : 1 }}
            />
            <span className="relative">
              <Badge id={c.id} size={c.size * 0.95} on={on} />
            </span>
            <span
              className="relative font-black tracking-tight transition-colors duration-75"
              style={{ fontSize: c.size, color: on ? BLACK : WHITE, textShadow: on ? 'none' : `2px 2px 0 ${RED}` }}
            >
              <Kinetic text={c.label} on={on} size={c.size} reduced={reduced} />
            </span>
            <span className={`relative mb-[-0.4em] self-end -skew-x-12 px-1 font-mono text-[9px] font-bold tracking-wider ${on ? 'bg-[#e3141e] text-[#f6f1e7]' : 'bg-[#f6f1e7] text-[#0c0b0d]'}`}>{c.en}</span>
            {weakHints[c.id] && (
              <span className="bsc-loop relative self-start -rotate-12 bg-[#e3141e] px-1 font-['Orbitron'] text-[8px] font-black text-[#f6f1e7] ring-1 ring-[#0c0b0d]" style={{ animation: 'bsc-pulse .8s ease-in-out infinite' }}>
                WEAK
              </span>
            )}
          </motion.button>
        )
      })}
    </motion.div>
  )
}

/* ───────────── サブリスト(スキル・アイテム・作戦) ───────────── */

type Row = { key: string; icon: ReactNode; label: string; sub: string; right: ReactNode; disabled?: boolean; hint?: boolean }

function ListPanel({
  title, en, info, rows, cursor, desc, reduced, onHover, onChoose, onBack,
}: {
  title: string; en: string; info: ReactNode; rows: Row[]; cursor: number; desc: string; reduced: boolean; onHover: (i: number) => void; onChoose: (i: number) => void; onBack: () => void
}) {
  return (
    <motion.div
      className="absolute"
      style={{ left: 4, top: -4, width: 318, rotate: -5, originX: 1, originY: 0.5 }}
      initial={reduced ? { opacity: 0 } : { opacity: 0, x: 170, skewX: -28, scaleX: 0.5 }}
      animate={{ opacity: 1, x: 0, skewX: 0, scaleX: 1 }}
      exit={reduced ? { opacity: 0, transition: { duration: 0.1 } } : { opacity: 0, x: 160, skewX: -20, transition: { duration: 0.14, ease: 'easeIn' } }}
      transition={reduced ? { duration: 0.12 } : { type: 'spring', stiffness: 560, damping: 30 }}
    >
      <div className="mb-1.5 flex items-end gap-2">
        <Ransom text={title} size="27px" shadow={RED} animateIn={!reduced} />
        <span className="mb-1 -skew-x-12 bg-[#f6f1e7] px-1 font-mono text-[9px] font-bold tracking-[.25em] text-[#0c0b0d]">{en}</span>
        <span className="mb-1 ml-auto flex items-center gap-1.5">
          {info}
          <button
            type="button"
            onClick={onBack}
            aria-label="もどる"
            className="-skew-x-12 bg-[#f6f1e7] px-1.5 text-[10px] font-black text-[#0c0b0d] shadow-[2px_2px_0_#e3141e] outline-none hover:bg-[#e3141e] hover:text-[#f6f1e7] focus-visible:ring-2 focus-visible:ring-[#e3141e]"
          >
            <span className="inline-block skew-x-12">◀ Esc</span>
          </button>
        </span>
      </div>
      <ul className="flex flex-col gap-[5px]">
        {rows.map((r, i) => {
          const on = i === cursor
          return (
            <motion.li
              key={r.key}
              initial={reduced ? false : { opacity: 0, x: 60, skewX: -20 }}
              animate={{ opacity: 1, x: on ? 10 : 0, skewX: 0 }}
              transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 600, damping: 28, delay: 0.04 + i * 0.035 }}
              style={{ marginLeft: i * 7 }}
            >
              <button
                type="button"
                onMouseEnter={() => onHover(i)}
                onFocus={() => onHover(i)}
                onClick={() => onChoose(i)}
                aria-disabled={r.disabled || undefined}
                aria-label={`${r.label} ${r.sub}`}
                className="relative flex h-[32px] w-full items-center gap-2 pr-3 pl-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#e3141e]"
              >
                {on && <span className="absolute inset-0 translate-x-[6px] translate-y-[5px] bg-[#e3141e]" style={{ clipPath: 'polygon(0 10%, 3% 0, 100% 8%, 97% 100%, 2% 90%)' }} />}
                <motion.span
                  key={on ? `on-${i}` : 'off'}
                  className={`absolute inset-0 ${on ? 'bg-[#f6f1e7]' : 'bg-[#0c0b0d]/90'}`}
                  style={{ clipPath: on ? 'polygon(0 10%, 3% 0, 100% 8%, 97% 100%, 2% 90%)' : 'polygon(0 0, 100% 6%, 99% 100%, 1% 94%)' }}
                  initial={on && !reduced ? { scaleX: 1.15, scaleY: 0.5 } : false}
                  animate={{ scaleX: 1, scaleY: 1 }}
                  transition={{ type: 'spring', stiffness: 760, damping: 15 }}
                />
                <span className={`relative grid size-[22px] shrink-0 rotate-45 place-items-center ${on ? 'bg-[#e3141e]' : 'bg-[#f6f1e7]'} ${r.disabled ? 'opacity-40' : ''}`}>
                  <span className={`size-[14px] -rotate-45 ${on ? 'text-[#f6f1e7]' : 'text-[#0c0b0d]'}`}>{r.icon}</span>
                </span>
                <span className={`relative text-[17px] font-black tracking-wide ${on ? 'text-[#0c0b0d]' : 'text-[#f6f1e7]'} ${r.disabled ? 'opacity-40' : ''}`}>
                  <Kinetic text={r.label} on={on} size={17} reduced={reduced} />
                </span>
                <span className={`relative text-[10px] font-bold ${on ? 'text-[#0c0b0d]/70' : 'text-[#f6f1e7]/60'}`}>{r.sub}</span>
                {r.hint && (
                  <span className="bsc-loop relative -rotate-12 bg-[#e3141e] px-1 font-['Orbitron'] text-[8px] font-black text-[#f6f1e7] ring-1 ring-[#0c0b0d]" style={{ animation: 'bsc-pulse .8s ease-in-out infinite' }}>
                    WEAK
                  </span>
                )}
                <span className={`relative ml-auto ${on ? 'text-[#0c0b0d]' : 'text-[#f6f1e7]'} ${r.disabled ? 'text-[#e3141e]' : ''}`}>{r.right}</span>
              </button>
            </motion.li>
          )
        })}
      </ul>
      <motion.p
        key={desc}
        className="mt-2 ml-6 -rotate-1 border-l-4 border-[#e3141e] bg-[#0c0b0d] px-2 py-1 text-[11px] leading-snug text-[#f6f1e7] ring-1 ring-[#f6f1e7]/30"
        initial={reduced ? false : { opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
      >
        {desc}
      </motion.p>
    </motion.div>
  )
}

/* ───────────── カットイン・バナー ───────────── */

function CutIn({ member, kind, s, reduced, tall }: { member: number; kind: 'more' | 'chance'; s: number; reduced: boolean; tall: boolean }) {
  const text = kind === 'more' ? 'もう一回！' : '総攻撃チャンス'
  const en = kind === 'more' ? 'EXTRA TURN' : 'ALL DOWN'
  if (reduced)
    return (
      <motion.div className="pointer-events-none absolute inset-0 z-[55] grid place-items-center bg-[#0c0b0d]/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} aria-hidden>
        <Ransom text={text} size={`${44 * s}px`} shadow={RED} animateIn={false} />
      </motion.div>
    )
  const sweep: Transition = { duration: 1.05, times: [0, 0.17, 0.8, 1], ease: ['circOut', 'linear', 'circIn'] }
  return (
    <motion.div className="pointer-events-none absolute inset-0 z-[55] overflow-hidden" aria-hidden exit={{ opacity: 0, transition: { duration: 0.1 } }}>
      <motion.div className="absolute inset-0 bg-[#f6f1e7]" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.75, 0] }} transition={{ duration: 0.26 }} />
      {/* 逆方向に走る赤い太帯とハーフトーン */}
      <div className="absolute inset-x-[-25%] top-1/2 rotate-[-8deg]" style={{ height: tall ? '30%' : '52%', marginTop: tall ? '-15%' : '-26%' }}>
        <motion.div
          className="h-full"
          style={{ background: `radial-gradient(circle, rgba(12,11,13,.45) 0 32%, transparent 35%) 0 0/9px 9px, ${RED}` }}
          initial={{ x: '110%' }}
          animate={{ x: ['110%', '0%', '-3%', '-110%'] }}
          transition={{ ...sweep, delay: 0.02 }}
        />
      </div>
      <div className="absolute inset-x-[-25%] top-[69%] h-[3%] rotate-[-8deg]">
        <motion.div className="h-full bg-[#f6f1e7]" initial={{ x: '-110%' }} animate={{ x: ['-110%', '0%', '4%', '110%'] }} transition={{ ...sweep, delay: 0.06 }} />
      </div>
      {/* 目元の帯 */}
      <div className="absolute inset-x-[-25%] top-1/2 rotate-[-8deg]" style={{ height: tall ? '20%' : '32%', marginTop: tall ? '-10%' : '-16%' }}>
        <motion.div
          className="relative h-full overflow-hidden border-y-[5px] border-[#f6f1e7] bg-[#0c0b0d] shadow-[0_0_0_4px_#0c0b0d]"
          initial={{ x: '-110%' }}
          animate={{ x: ['-110%', '0%', '2%', '110%'] }}
          transition={sweep}
        >
          <motion.div className="absolute inset-y-0 left-[24%] w-[52%]" initial={{ scale: 1.35 }} animate={{ scale: 1.04 }} transition={{ duration: 1, ease: 'easeOut' }}>
            <EyeStrip who={member} />
          </motion.div>
          <div
            className="bsc-loop absolute inset-0"
            style={{
              background: 'repeating-linear-gradient(0deg, transparent 0 9px, rgba(246,241,231,.2) 9px 10px, transparent 10px 23px)',
              maskImage: 'linear-gradient(90deg, #000 0 22%, transparent 25% 75%, #000 78%)',
              WebkitMaskImage: 'linear-gradient(90deg, #000 0 22%, transparent 25% 75%, #000 78%)',
              animation: 'bsc-lines .3s linear infinite',
            }}
          />
          <span className="absolute top-1/2 left-[25%] -translate-y-1/2 font-['Space_Grotesk'] font-bold tracking-tighter text-transparent italic" style={{ fontSize: 50 * s, WebkitTextStroke: `2px ${WHITE}`, translate: '-100% -50%' }}>
            {en}
          </span>
          <span className="absolute top-[8%] right-[25.5%] -skew-x-12 bg-[#e3141e] px-2 font-black text-[#f6f1e7]" style={{ fontSize: 13 * s }}>
            {PARTY[member].name}
          </span>
        </motion.div>
      </div>
      {/* 「もう一回！」 */}
      <motion.div
        className="absolute"
        style={{ right: tall ? '4%' : '10%', top: tall ? '58%' : '64%' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0], x: [0, 0, 0, 160 * s] }}
        transition={{ duration: 1.05, times: [0, 0.2, 0.82, 1] }}
      >
        <div className="-rotate-[9deg]">
          <Ransom text={text} size={`${(tall ? 34 : 46) * s}px`} shadow={RED} slam delay={0.16} />
        </div>
      </motion.div>
    </motion.div>
  )
}

function Banner({ text, en, s, reduced }: { text: string; en: string; s: number; reduced: boolean }) {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-x-[-10%] z-[45]"
      style={{ top: '9%', rotate: -6 }}
      initial={reduced ? { opacity: 0 } : { x: '-100%' }}
      animate={reduced ? { opacity: 1 } : { x: '0%' }}
      exit={reduced ? { opacity: 0 } : { x: '100%', transition: { duration: 0.2, ease: 'easeIn' } }}
      transition={reduced ? { duration: 0.12 } : { type: 'spring', stiffness: 520, damping: 34 }}
    >
      <div className="flex items-center justify-center gap-[1em] border-y-4 border-[#f6f1e7] bg-[#0c0b0d] py-[0.35em] shadow-[0_6px_0_#e3141e]" style={{ fontSize: 15 * s }}>
        <span className="font-['Space_Grotesk'] text-[2em] font-bold tracking-tighter text-transparent italic" style={{ WebkitTextStroke: `1.5px ${RED}` }}>
          {en}
        </span>
        <Ransom text={text} size="2.1em" shadow={RED} slam={!reduced} animateIn={!reduced} />
      </div>
    </motion.div>
  )
}

function TurnSweep({ s }: { s: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[35] overflow-hidden">
      {[RED, WHITE, BLACK].map((c, i) => (
        <motion.div
          key={i}
          className="absolute left-[-30%] w-[160%]"
          style={{ top: `${44 + i * 6}%`, height: [16, 4, 10][i] * s, background: c, rotate: -12 }}
          initial={{ x: '-110%' }}
          animate={{ x: '110%' }}
          transition={{ duration: 0.5, ease: SWEEP_EASE, delay: i * 0.04 }}
        />
      ))}
    </div>
  )
}

/* ───────────── 総攻撃 ───────────── */

const PUFFS = (() => {
  const r = mulberry32(41)
  return Array.from({ length: 15 }, (_, i) => {
    const a = (i / 15) * Math.PI * 2 + r() * 0.3
    const d = i < 4 ? 20 * r() : 60 + r() * 40
    return { x: Math.cos(a) * d * 1.5, y: Math.sin(a) * d * 0.9, r: 42 + r() * 36, dur: 0.35 + r() * 0.3, delay: -r() }
  })
})()
const FLICKS = [
  { d: 'M0-14 4-4 14 0 4 4 0 14-4 4-14 0-4-4Z', x: -90, y: -50 },
  { d: 'M-12-6h16l8-6 6 4-6 8 2 10h-26Z', x: 80, y: -30 },
  { d: 'M-4-20h8v24l8 10-6 4-6-8-8 8-6-4 10-10Z', x: -40, y: 40 },
  { d: 'M0-14 4-4 14 0 4 4 0 14-4 4-14 0-4-4Z', x: 100, y: 50 },
  { d: 'M-18 2 14-14l4 6-26 16Z', x: 20, y: -70 },
  { d: 'M0-14 4-4 14 0 4 4 0 14-4 4-14 0-4-4Z', x: -120, y: 30 },
]
const SFX = [
  { t: 'ドガッ', x: -150, y: -90, rot: -16, d: 0.15 },
  { t: 'バキッ', x: 130, y: -60, rot: 12, d: 0.35 },
  { t: 'ズバッ', x: -110, y: 80, rot: 8, d: 0.55 },
  { t: 'ゴッ', x: 150, y: 70, rot: -10, d: 0.75 },
]
const STREAKS = [
  { a: -24, t: 6, c: WHITE, d: 0.12 },
  { a: 18, t: 4, c: RED, d: 0.24 },
  { a: -60, t: 5, c: WHITE, d: 0.38 },
  { a: 40, t: 8, c: WHITE, d: 0.52 },
  { a: -8, t: 4, c: RED, d: 0.66 },
  { a: 70, t: 5, c: WHITE, d: 0.8 },
  { a: -36, t: 10, c: WHITE, d: 0.94 },
]

function FinishSplash({ cx, cy, s, w, h, reduced }: { cx: number; cy: number; s: number; w: number; h: number; reduced: boolean }) {
  const ix = w * 0.46
  const iy = h * 0.5
  if (reduced)
    return (
      <motion.div className="pointer-events-none absolute inset-0 z-[60] grid place-items-center bg-[#0c0b0d]/80" aria-hidden initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
        <div className="-rotate-[9deg]">
          <Ransom text="FINISH" size={`${80 * s}px`} shadow={RED} animateIn={false} />
        </div>
      </motion.div>
    )
  const diag = Math.hypot(w, h)
  const big = diag * 1.5
  return (
    <div className="pointer-events-none absolute inset-0 z-[60] overflow-hidden" aria-hidden>
      <motion.div className="absolute inset-0 bg-[#f6f1e7]" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.3 }} />
      {/* 斬撃線 */}
      {STREAKS.map((st, i) => (
        <div key={i} className="absolute" style={{ left: cx, top: cy, rotate: `${st.a}deg` }}>
          <motion.div
            style={{ width: diag, height: st.t * s, marginLeft: -diag / 2, marginTop: (-st.t * s) / 2, background: st.c, boxShadow: `0 0 0 ${2 * s}px ${BLACK}`, originX: i % 2 ? 1 : 0 }}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: [0, 1, 1], opacity: [1, 1, 0] }}
            transition={{ duration: 0.3, delay: st.d, times: [0, 0.45, 1] }}
          />
        </div>
      ))}
      {/* ケンカ煙 */}
      <motion.div
        className="absolute"
        style={{ left: cx, top: cy, width: 0, height: 0 }}
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.15, 1, 1, 1.4], opacity: [1, 1, 1, 1, 0] }}
        transition={{ duration: 1.4, times: [0, 0.1, 0.18, 0.85, 1] }}
      >
        {PUFFS.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: (p.x - p.r) * s,
              top: (p.y - p.r) * s,
              width: p.r * 2 * s,
              height: p.r * 2 * s,
              background: i % 4 === 0 ? `radial-gradient(circle, rgba(227,20,30,.55) 0 30%, transparent 34%) 0 0/${7 * s}px ${7 * s}px, ${WHITE}` : WHITE,
              boxShadow: `0 0 0 ${4 * s}px ${BLACK}, ${8 * s}px ${6 * s}px 0 ${4 * s}px ${RED}`,
              animation: `bsc-puff ${p.dur}s ease-in-out ${p.delay}s infinite`,
            }}
          />
        ))}
        {PUFFS.map((p, i) => (
          <div key={`i${i}`} className="absolute rounded-full" style={{ left: (p.x - p.r * 0.9) * s, top: (p.y - p.r * 0.9) * s, width: p.r * 1.8 * s, height: p.r * 1.8 * s, background: WHITE }} />
        ))}
        {FLICKS.map((f, i) => (
          <svg
            key={i}
            viewBox="-20 -20 40 40"
            className="absolute"
            style={{ left: (f.x - 22) * s, top: (f.y - 22) * s, width: 44 * s, height: 44 * s, animation: `bsc-flick ${0.16 + i * 0.03}s steps(1) ${i * 0.05}s infinite` }}
          >
            <path d={f.d} fill={i % 2 ? BLACK : RED} stroke={BLACK} strokeWidth="2" />
          </svg>
        ))}
      </motion.div>
      {SFX.map((x, i) => (
        <motion.span
          key={i}
          className="absolute font-black whitespace-nowrap text-[#f6f1e7] italic"
          style={{ left: cx + x.x * s, top: cy + x.y * s, fontSize: 34 * s, rotate: `${x.rot}deg`, WebkitTextStroke: `${3 * s}px ${BLACK}`, paintOrder: 'stroke fill', textShadow: `${4 * s}px ${4 * s}px 0 ${RED}`, translate: '-50% -50%' }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.4, 1, 1, 0.6], opacity: [0, 1, 1, 1, 0] }}
          transition={{ duration: 0.55, delay: x.d, times: [0, 0.2, 0.35, 0.8, 1] }}
        >
          {x.t}
        </motion.span>
      ))}
      {/* 墨のスプラッシュ(HTML 側で中心から拡大) */}
      {[
        { sp: SPLAT_RED, fill: RED, delay: 1.08, rot: 12 },
        { sp: SPLAT_BLACK, fill: BLACK, delay: 1.15, rot: -20 },
      ].map((l, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ left: ix - big / 2, top: iy - big / 2, width: big, height: big }}
          initial={{ scale: 0, rotate: l.rot }}
          animate={{ scale: [0, 1.1, 1], rotate: 0 }}
          transition={{ delay: l.delay, duration: 0.42, times: [0, 0.7, 1], ease: 'easeOut' }}
        >
          <svg viewBox="-100 -100 200 200" className="size-full overflow-visible">
            <path d={l.sp.d} fill={l.fill} />
            {l.sp.drops.map((d, j) => (
              <circle key={j} cx={d.x} cy={d.y} r={d.r} fill={j % 3 ? l.fill : i ? RED : BLACK} />
            ))}
          </svg>
        </motion.div>
      ))}
      {/* 放射線 + FINISH */}
      <motion.div
        className="absolute"
        style={{ left: w / 2, top: h * 0.46 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0], y: [0, 0, 0, -40 * s] }}
        transition={{ delay: 1.3, duration: 1.5, times: [0, 0.05, 0.85, 1] }}
      >
        <div className="relative -translate-x-1/2 -translate-y-1/2 -rotate-[9deg]">
          <motion.div
            className="absolute inset-x-[-14%] inset-y-[8%] bg-[#f6f1e7]"
            style={{ clipPath: 'polygon(0 18%, 6% 0, 40% 10%, 70% 0, 100% 14%, 96% 60%, 100% 100%, 60% 88%, 24% 100%, 3% 86%)', boxShadow: 'none' }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 1.32, duration: 0.18, ease: 'easeOut' }}
          />
          <div className="relative px-[0.2em]">
            <Ransom text="FINISH" size={`${92 * s}px`} shadow={RED} slam delay={1.38} />
          </div>
          <motion.span
            className="absolute right-[2%] bottom-[-18%] -skew-x-12 bg-[#e3141e] px-2 font-black text-[#f6f1e7] ring-2 ring-[#0c0b0d]"
            style={{ fontSize: 18 * s }}
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 1.75, type: 'spring', stiffness: 600, damping: 22 }}
          >
            総攻撃！
          </motion.span>
        </div>
      </motion.div>
    </div>
  )
}

/* ───────────── リザルト ───────────── */

function CountUp({ to, delay, prefix = '' }: { to: number; delay: number; prefix?: string }) {
  const mv = useMotionValue(0)
  const text = useTransform(mv, (v) => `${prefix}${Math.round(v).toLocaleString('ja-JP')}`)
  useEffect(() => {
    const c = animate(mv, to, { duration: 0.9, delay, ease: 'easeOut' })
    return () => c.stop()
  }, [mv, to, delay])
  return <motion.span>{text}</motion.span>
}

function ResultPanel({ won, wide, s, reduced, onReset, resetRef }: { won: boolean; wide: boolean; s: number; reduced: boolean; onReset: () => void; resetRef: RefObject<HTMLButtonElement | null> }) {
  const fs = clamp(12 * s, 11, 24)
  const rows = won
    ? [
        { k: '獲得経験値', v: <CountUp to={1260} delay={0.5} prefix="+" /> },
        { k: '所持金', v: <CountUp to={8400} delay={0.62} prefix="+¥" /> },
        { k: '戦利品', v: '影の羽根 ×2・黒いツノ ×1' },
      ]
    : [
        { k: '獲得経験値', v: '+0' },
        { k: '聞き出した話', v: '「巣は旧校舎の地下にある…」' },
        { k: '戦利品', v: 'なし' },
      ]
  return (
    <motion.section
      aria-label={won ? '戦闘結果: 勝利' : '戦闘結果: 見逃した'}
      className={`absolute z-[70] bg-[#f6f1e7] text-[#0c0b0d] ${wide ? 'inset-y-0 right-0 w-[60%]' : 'inset-x-0 bottom-0 h-[64%]'}`}
      style={{
        fontSize: fs,
        clipPath: wide ? 'polygon(9% 0, 100% 0, 100% 100%, 0 100%, 5% 76%, 2% 54%, 6% 30%, 3% 12%)' : 'polygon(0 6%, 18% 2%, 40% 7%, 64% 0, 100% 5%, 100% 100%, 0 100%)',
      }}
      initial={reduced ? { opacity: 0 } : wide ? { x: '105%' } : { y: '105%' }}
      animate={reduced ? { opacity: 1 } : wide ? { x: '0%' } : { y: '0%' }}
      transition={reduced ? { duration: 0.2 } : { type: 'spring', stiffness: 300, damping: 30, delay: won ? 0 : 0.5 }}
    >
      <div aria-hidden className="absolute inset-0" style={{ background: 'repeating-linear-gradient(-60deg, transparent 0 18px, rgba(12,11,13,.05) 18px 20px)' }} />
      <div aria-hidden className="absolute -right-[10%] -bottom-[18%] aspect-square w-[50%] rounded-full bg-[#e3141e]" />
      <div className={`relative flex h-full flex-col justify-center gap-[0.7em] pb-[calc(var(--solo-footer-clearance,0px)_+_0.75rem)] ${wide ? 'pr-[7%] pl-[14%]' : 'px-[7%] pt-[8%]'}`}>
        <span className="w-fit -skew-x-12 bg-[#0c0b0d] px-2 font-mono text-[0.75em] font-bold tracking-[.3em] text-[#f6f1e7]">BATTLE RESULT</span>
        <h2 className="w-fit -rotate-[7deg] origin-left" aria-label={won ? '勝利' : '見逃した'}>
          <Ransom text={won ? '勝利！' : '見逃した'} size="3.6em" shadow={RED} animateIn={!reduced} delay={0.25} slam />
        </h2>
        <ul className="flex flex-col gap-[0.35em]">
          {rows.map((r, i) => (
            <motion.li
              key={r.k}
              className="flex items-center gap-[0.7em] bg-[#0c0b0d] px-[0.8em] py-[0.35em] text-[#f6f1e7]"
              style={{ clipPath: i % 2 ? 'polygon(0 0, 100% 8%, 99% 100%, 1% 92%)' : 'polygon(1% 6%, 100% 0, 100% 92%, 0 100%)', marginLeft: `${i * 3}%` }}
              initial={reduced ? false : { opacity: 0, x: 60, skewX: -18 }}
              animate={{ opacity: 1, x: 0, skewX: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 28, delay: 0.4 + i * 0.08 }}
            >
              <span className="w-[6.5em] shrink-0 text-[0.85em] font-black text-[#e3141e]">{r.k}</span>
              <span className="min-w-0 truncate font-['Space_Grotesk'] text-[1.25em] font-bold italic tabular-nums">{r.v}</span>
            </motion.li>
          ))}
        </ul>
        <div className="flex items-center gap-[0.5em]">
          {PARTY.map((m, i) => (
            <motion.span
              key={m.name}
              className="relative size-[3em] -skew-x-6 overflow-hidden bg-[#e3141e] ring-2 ring-[#0c0b0d]"
              initial={reduced ? false : { y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20, delay: 0.7 + i * 0.06 }}
            >
              <Portrait who={i} glow={false} />
              {won && i === 3 && <span className="absolute inset-x-0 bottom-0 bg-[#0c0b0d] text-center font-['Orbitron'] text-[0.5em] font-black text-[#f6f1e7]">LV UP</span>}
            </motion.span>
          ))}
          <button
            ref={resetRef}
            type="button"
            onClick={onReset}
            className="ml-auto -rotate-3 bg-[#e3141e] px-[0.9em] py-[0.4em] text-[1.05em] font-black text-[#f6f1e7] shadow-[4px_4px_0_#0c0b0d] ring-2 ring-[#0c0b0d] outline-none hover:bg-[#0c0b0d] focus-visible:ring-4 focus-visible:ring-[#0c0b0d] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6f1e7]"
          >
            ↺ もう一度
          </button>
        </div>
      </div>
    </motion.section>
  )
}

/* ───────────── 本体 ───────────── */

const CSS = `
@keyframes bsc-bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-5%) } }
@keyframes bsc-shadow { 0%,100% { transform: scaleX(1); opacity: .9 } 50% { transform: scaleX(.82); opacity: .55 } }
@keyframes bsc-flap { 0%,100% { transform: rotate(0deg) } 50% { transform: rotate(-16deg) scaleY(.88) } }
@keyframes bsc-tent { 0%,100% { transform: rotate(-7deg) } 50% { transform: rotate(8deg) } }
@keyframes bsc-arm { 0%,100% { transform: rotate(0deg) } 50% { transform: rotate(9deg) } }
@keyframes bsc-blink { 0%,91%,100% { transform: scaleY(0) } 95% { transform: scaleY(1) } }
@keyframes bsc-spin { to { transform: rotate(360deg) } }
@keyframes bsc-cower { 0%,100% { transform: translate(0,0) } 25% { transform: translate(-2px,1px) } 75% { transform: translate(2px,0) } }
@keyframes bsc-orbit { ${ORBIT} }
@keyframes bsc-puff { 0%,100% { transform: scale(.9) } 50% { transform: scale(1.1) } }
@keyframes bsc-flick { 0% { opacity: 0 } 50% { opacity: 1 } }
@keyframes bsc-pulse { 0%,100% { transform: rotate(-12deg) scale(1) } 50% { transform: rotate(-12deg) scale(1.18) } }
@keyframes bsc-lines { to { background-position: -400px 0 } }
@keyframes bsc-marker { 0%,100% { transform: translate(-50%, 0) } 50% { transform: translate(-50%, -5px) } }
@keyframes bsc-hold { 0%,100% { transform: scale(1) } 50% { transform: scale(1.04) } }
.bsc-rm .bsc-loop { animation: none !important }
`

/** コンテナの大きさと、全画面表示で下に重なるフッターの高さ(CSS 変数をプローブ要素で実測)を測る */
function useBox(ref: RefObject<HTMLDivElement | null>, probe: RefObject<HTMLDivElement | null>) {
  const [box, setBox] = useState({ w: 1000, h: 440, clear: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const set = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      const clear = probe.current?.offsetHeight ?? 0
      setBox((b) => (b.w === w && b.h === h && b.clear === clear ? b : { w, h, clear }))
    }
    set()
    const ro = new ResizeObserver(set)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref, probe])
  return box
}

const freshParty = () => PARTY.map((m) => ({ ...m }))
const freshFoes = () => FOES.map((f) => ({ ...f }))

export function StylishBattleCommand() {
  const reduced = !!useReducedMotion()
  const rootRef = useRef<HTMLDivElement>(null)
  const resetRef = useRef<HTMLButtonElement>(null)
  const probeRef = useRef<HTMLDivElement>(null)
  const box = useBox(rootRef, probeRef)
  const [stageScope, animateStage] = useAnimate()

  const [party, setParty] = useState(freshParty)
  const [foes, setFoes] = useState(freshFoes)
  const [active, setActive] = useState(0)
  const [phase, setPhase] = useState<Phase>('command')
  const [cmd, setCmd] = useState(0)
  const [list, setList] = useState(0)
  const [tgt, setTgt] = useState(0)
  const [pending, setPending] = useState<Action | null>(null)
  const [hits, setHits] = useState<(Hit | null)[]>([null, null, null])
  const [weakFx, setWeakFx] = useState<{ key: number; foe: number } | null>(null)
  const [cutin, setCutin] = useState<{ key: number; member: number; kind: 'more' | 'chance' } | null>(null)
  const [banner, setBanner] = useState<{ key: number; text: string; en: string } | null>(null)
  const [memberFx, setMemberFx] = useState<MemberFx | null>(null)
  const [foeLunge, setFoeLunge] = useState<number[]>([0, 0, 0])
  const [flash, setFlash] = useState(0)
  const [pulse, setPulse] = useState(0)
  const [sweep, setSweep] = useState(0)
  const [entry, setEntry] = useState(0)
  const [log, setLog] = useState('影が3体現れた！ 弱点を突いて全員ダウンさせよう')
  const [turn, setTurn] = useState(1)
  const [tactic, setTactic] = useState(2)
  const [items, setItems] = useState(ITEMS.map((x) => x.n))
  const [hold, setHold] = useState(0)
  const [foeTurn, setFoeTurn] = useState(false)

  const timers = useRef<number[]>([])
  const seq = useRef(1)
  const engaged = useRef(false)
  const live = useRef({ party, foes })
  useEffect(() => {
    live.current = { party, foes }
  })
  useEffect(() => {
    const t = timers.current
    return () => t.forEach(clearTimeout)
  }, [])

  const k = () => ++seq.current
  const D = (ms: number) => (reduced ? Math.round(ms * 0.45) : ms)
  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms))
  }
  const shake = (power: number) => {
    if (reduced || !stageScope.current) return
    const a = 14 * power
    animateStage(stageScope.current, { x: [0, -a, a * 0.8, -a * 0.5, a * 0.25, 0], y: [0, a * 0.5, -a * 0.4, a * 0.2, 0], rotate: [0, -0.5 * power, 0.35 * power, 0] }, { duration: 0.4 })
  }

  /* レイアウト */
  const wide = box.w >= box.h * 1.15
  const availH = Math.max(200, box.h - box.clear)
  const s = wide ? clamp(Math.min(box.w / 1000, availH / 440), 0.5, 2.4) : clamp(Math.min(box.w / 480, availH / 760), 0.5, 1.8)
  const E = (wide ? 168 : 150) * s
  const fieldTop = (wide ? 40 : 58) * s
  const fieldBottomPx = wide ? 34 * s : 404 * s
  const fieldW = wide ? box.w - 430 * s : box.w
  const fieldH = Math.max(1, box.h - fieldTop - fieldBottomPx)
  const fieldStyle: CSSProperties = { left: 0, top: fieldTop, width: fieldW, bottom: `calc(var(--solo-footer-clearance,0px) + ${fieldBottomPx}px)` }
  const swirlCx = clamp(fieldW / 2 / box.w, 0.2, 0.5)
  const swirlCy = clamp(1 - (fieldTop + fieldH * 0.55) / box.h, 0.3, 0.8)

  const me = party[active]
  const standing = foes.filter((f) => !f.down && !f.gone).length
  const heat = phase === 'finish' ? 1 : phase === 'holdup' ? 0.85 : phase === 'victory' ? 0.6 : phase === 'spared' ? 0.12 : (3 - standing) * 0.22

  /* 進行 */
  const backToCommand = (msg?: string) => {
    setPhase('command')
    setEntry((e) => e + 1)
    if (msg) setLog(msg)
  }

  const enemyPhase = () => {
    setPhase('busy')
    setFoeTurn(true)
    setBanner({ key: k(), text: '敵のターン', en: 'ENEMY PHASE' })
    setFoes((fs) => fs.map((f) => ({ ...f, down: false })))
    setHits([null, null, null])
    const attacker = Math.floor(Math.random() * 3)
    const victim = Math.floor(Math.random() * 4)
    later(D(700), () => {
      setBanner(null)
      setFoeLunge((l) => l.map((v, i) => (i === attacker ? v + 1 : v)))
      later(D(200), () => {
        const m = live.current.party[victim]
        const dmg = Math.round((38 + Math.random() * 30) * (m.guard ? 0.4 : 1) * (tactic === 1 ? 0.8 : 1))
        setParty((p) => p.map((x, i) => (i === victim ? { ...x, hp: Math.max(1, x.hp - dmg) } : x)))
        setMemberFx({ key: k(), member: victim, type: 'hit', amount: dmg })
        shake(0.55)
        setLog(`${FOES[attacker].name}の攻撃！ ${m.name}に${dmg}のダメージ${m.guard ? '(ガードで軽減)' : ''}`)
      })
    })
    later(D(1800), () => {
      setFoeTurn(false)
      setParty((p) => p.map((x) => ({ ...x, guard: false })))
      setActive(0)
      setCmd(0)
      setTurn((t) => t + 1)
      setSweep(k())
      backToCommand(`${PARTY[0].name}の番だ`)
    })
  }

  const nextTurn = (from: number) => {
    if (from < 3) {
      setActive(from + 1)
      setCmd(0)
      setSweep(k())
      backToCommand(`${PARTY[from + 1].name}の番だ`)
    } else enemyPhase()
  }

  const doAction = (a: Action, t: number) => {
    const actor = active
    const f = foes[t]
    setPhase('busy')
    setMemberFx({ key: k(), member: actor, type: 'lunge' })
    if (a.cost) setParty((p) => p.map((m, i) => (i === actor ? { ...m, sp: m.sp - a.cost } : m)))
    const kind: HitKind = f.weak === a.el ? 'weak' : f.resist === a.el ? 'resist' : 'normal'
    const amount = Math.round(a.pow * (0.9 + Math.random() * 0.22) * (tactic === 0 ? 1.1 : 1) * (kind === 'weak' ? 1.75 : kind === 'resist' ? 0.3 : 1))
    const knock = kind === 'weak' && !f.down
    const allDown = knock && foes.every((x, i) => i === t || x.down)
    later(D(230), () => {
      setFoes((fs) => fs.map((x, i) => (i === t ? { ...x, hp: Math.max(Math.ceil(x.mhp * 0.06), x.hp - amount), down: x.down || knock } : x)))
      setHits((h) => h.map((x, i) => (i === t ? { key: k(), amount, kind, el: a.el, downed: knock } : x)))
      if (kind === 'weak') {
        shake(1.1)
        setFlash(k())
        setPulse(k())
        setWeakFx({ key: k(), foe: t })
        setLog(knock ? `${f.name}の弱点を突いた！ ${amount}のダメージ、ダウン！` : `${f.name}の弱点を突いた！ ${amount}のダメージ(すでにダウン中)`)
      } else if (kind === 'resist') {
        shake(0.2)
        setLog(`${f.name}は${elLabel(a.el)}に強い… ${amount}のダメージしか通らない`)
      } else {
        shake(0.5)
        setLog(`${a.name}！ ${f.name}に${amount}のダメージ`)
      }
    })
    if (knock) {
      later(D(1250), () => {
        setWeakFx(null)
        setCutin({ key: k(), member: actor, kind: allDown ? 'chance' : 'more' })
      })
      later(D(2350), () => {
        setCutin(null)
        if (allDown) {
          setPhase('holdup')
          setHold(0)
          setLog('影は全員ダウンしている！ 総攻撃のチャンスだ')
        } else backToCommand(`${PARTY[actor].name}はもう一回行動できる！`)
      })
    } else later(D(1150), () => nextTurn(actor))
  }

  const reset = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setParty(freshParty())
    setFoes(freshFoes())
    setActive(0)
    setCmd(0)
    setList(0)
    setTgt(0)
    setPending(null)
    setHits([null, null, null])
    setWeakFx(null)
    setCutin(null)
    setBanner(null)
    setFoeTurn(false)
    setMemberFx(null)
    setTurn(1)
    setTactic(2)
    setItems(ITEMS.map((x) => x.n))
    setSweep(k())
    setPhase('command')
    setEntry((e) => e + 1)
    setLog('影が3体現れた！ 弱点を突いて全員ダウンさせよう')
  }

  const firstTarget = (a: Action) => {
    const weakIdx = foes.findIndex((f) => !f.down && f.weak === a.el)
    if (weakIdx >= 0) return weakIdx
    const up = foes.findIndex((f) => !f.down)
    return up >= 0 ? up : 0
  }
  const startTarget = (a: Action) => {
    setPending(a)
    setTgt(firstTarget(a))
    setPhase('target')
  }

  const chooseCmd = (i: number) => {
    if (phase !== 'command') return
    setCmd(i)
    const id = CMDS[i].id
    if (id === 'attack') startTarget(ATTACK)
    else if (id === 'shoot') startTarget(SHOOT)
    else if (id === 'skill') {
      setList(0)
      setPhase('skill')
    } else if (id === 'item') {
      setList(0)
      setPhase('item')
    } else if (id === 'tactic') {
      setList(tactic)
      setPhase('tactic')
    } else {
      setPhase('busy')
      setParty((p) => p.map((m, j) => (j === active ? { ...m, guard: true } : m)))
      setMemberFx({ key: k(), member: active, type: 'guard' })
      setLog(`${me.name}は身を固めた`)
      const from = active
      later(D(650), () => nextTurn(from))
    }
  }

  const chooseList = (i: number) => {
    if (phase === 'skill') {
      const sk = me.skills[i]
      if (!sk) return
      if (me.sp < sk.cost) {
        setLog('SP が足りない！')
        shake(0.15)
        return
      }
      startTarget({ kind: 'skill', name: sk.name, el: sk.el, pow: sk.pow, cost: sk.cost })
    } else if (phase === 'item') {
      if (items[i] <= 0) {
        setLog('もう残っていない')
        return
      }
      setItems((it) => it.map((n, j) => (j === i ? n - 1 : n)))
      setPhase('busy')
      const amount = i === 0 ? Math.min(120, me.mhp - me.hp) : Math.min(40, me.msp - me.sp)
      setParty((p) => p.map((m, j) => (j === active ? (i === 0 ? { ...m, hp: m.hp + amount } : { ...m, sp: m.sp + amount }) : m)))
      setMemberFx({ key: k(), member: active, type: 'heal', amount })
      setLog(`${me.name}は${ITEMS[i].name}を使った！ ${i === 0 ? 'HP' : 'SP'}が${amount}回復`)
      const from = active
      later(D(900), () => nextTurn(from))
    } else if (phase === 'tactic') {
      setTactic(i)
      backToCommand(`作戦を「${TACTICS[i].name}」にした`)
    }
  }

  const back = () => {
    if (phase === 'skill' || phase === 'item' || phase === 'tactic') setPhase('command')
    else if (phase === 'target') setPhase(pending?.kind === 'skill' ? 'skill' : 'command')
  }

  const confirmTarget = (t: number) => {
    if (phase !== 'target' || !pending) return
    setTgt(t)
    doAction(pending, t)
  }

  const chooseHold = (i: number) => {
    if (phase !== 'holdup') return
    setHold(i)
    if (i === 0) {
      setPhase('finish')
      setFlash(k())
      setLog('総攻撃！')
      later(D(1150), () => {
        setFoes((fs) => fs.map((f) => ({ ...f, gone: 'finish' })))
        shake(1.3)
      })
      later(reduced ? 1100 : 3000, () => {
        setPhase('victory')
        setLog('影をすべて倒した！ 勝利')
      })
    } else {
      setPhase('spared')
      setFoes((fs) => fs.map((f) => ({ ...f, gone: 'flee' })))
      setLog('影たちを見逃した。闇の向こうへ逃げていく…')
    }
  }

  /* フォーカス: 操作中にボタンが消えたらルートへ戻す。リザルトでは「もう一度」へ */
  useEffect(() => {
    if (!engaged.current) return
    const root = rootRef.current
    if (!root) return
    if (phase === 'victory' || phase === 'spared') {
      const id = window.setTimeout(() => resetRef.current?.focus({ preventScroll: true }), reduced ? 50 : 700)
      return () => clearTimeout(id)
    }
    if (!root.contains(document.activeElement) || document.activeElement === document.body) root.focus({ preventScroll: true })
  }, [phase, active, reduced])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    engaged.current = true
    const key = e.key
    const onButton = (e.target as HTMLElement).tagName === 'BUTTON'
    const enter = (key === 'Enter' || key === ' ') && !onButton
    const prev = key === 'ArrowUp' || key === 'ArrowLeft'
    const next = key === 'ArrowDown' || key === 'ArrowRight'
    const esc = key === 'Escape' || key === 'Backspace'
    if (phase === 'command') {
      if (prev) setCmd((c) => (c + CMDS.length - 1) % CMDS.length)
      else if (next) setCmd((c) => (c + 1) % CMDS.length)
      else if (enter) chooseCmd(cmd)
      else return
    } else if (phase === 'skill' || phase === 'item' || phase === 'tactic') {
      const n = phase === 'skill' ? me.skills.length : phase === 'item' ? ITEMS.length : TACTICS.length
      if (prev) setList((c) => (c + n - 1) % n)
      else if (next) setList((c) => (c + 1) % n)
      else if (enter) chooseList(list)
      else if (esc) back()
      else return
    } else if (phase === 'target') {
      if (prev) setTgt((c) => (c + 2) % 3)
      else if (next) setTgt((c) => (c + 1) % 3)
      else if (enter) confirmTarget(tgt)
      else if (esc) back()
      else return
    } else if (phase === 'holdup') {
      if (prev || next) setHold((h) => 1 - h)
      else if (enter) chooseHold(hold)
      else return
    } else if (phase === 'victory' || phase === 'spared') {
      if (enter) reset()
      else return
    } else return
    e.preventDefault()
  }

  /* 表示用 */
  const menuOpen = phase === 'command' || phase === 'skill' || phase === 'item' || phase === 'tactic'
  const standingWeak = (el: Elem) => foes.some((f) => !f.down && !f.gone && f.weak === el)
  const weakHints: Partial<Record<CmdId, boolean>> = { attack: standingWeak('斬'), shoot: standingWeak('銃'), skill: me.skills.some((sk) => standingWeak(sk.el)) }
  const clusterX = 186 - (3 - active) * 24
  const pred: HitKind | null = pending && phase === 'target' ? (foes[tgt].weak === pending.el ? 'weak' : foes[tgt].resist === pending.el ? 'resist' : 'normal') : null
  const showHud = phase !== 'victory' && phase !== 'spared'
  const hudActive = !foeTurn && (menuOpen || phase === 'target' || phase === 'busy') ? active : -1
  const finishCx = fieldW / 2
  const finishCy = fieldTop + fieldH * 0.5

  let rows: Row[] = []
  let desc = ''
  if (phase === 'skill') {
    rows = me.skills.map((sk) => ({
      key: sk.name,
      icon: <ElemIcon el={sk.el} className="size-full" />,
      label: sk.name,
      sub: sk.el,
      disabled: me.sp < sk.cost,
      hint: standingWeak(sk.el),
      right: (
        <span className="font-['Space_Grotesk'] text-[18px] leading-none font-bold italic">
          {sk.cost}
          <span className="ml-0.5 text-[9px] not-italic">SP</span>
        </span>
      ),
    }))
    desc = me.skills[list]?.desc ?? ''
  } else if (phase === 'item') {
    rows = ITEMS.map((it, i) => ({
      key: it.name,
      icon: <svg viewBox="0 0 24 24" className="size-full" aria-hidden>{GLYPHS.item}</svg>,
      label: it.name,
      sub: i === 0 ? 'HP' : 'SP',
      disabled: items[i] <= 0,
      right: <span className="font-['Playfair_Display'] text-[18px] leading-none font-black italic">×{items[i]}</span>,
    }))
    desc = ITEMS[list]?.note ?? ''
  } else if (phase === 'tactic') {
    rows = TACTICS.map((t, i) => ({
      key: t.name,
      icon: <svg viewBox="0 0 24 24" className="size-full" aria-hidden>{GLYPHS.tactic}</svg>,
      label: t.name,
      sub: '',
      right: tactic === i ? <span className="bg-[#e3141e] px-1 text-[10px] font-black text-[#f6f1e7]">採用中</span> : null,
    }))
    desc = TACTICS[list]?.note ?? ''
  }
  const listTitle = phase === 'skill' ? 'スキル' : phase === 'item' ? 'アイテム' : '作戦'
  const listEn = phase === 'skill' ? 'SKILL' : phase === 'item' ? 'ITEM' : 'PLAN'

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={() => (engaged.current = true)}
      aria-label="バトルコマンドのデモ。矢印キーで選択、Enterで決定、Escでもどる"
      className={`group relative h-full w-full overflow-hidden bg-[#0c0b0d] font-['Noto_Sans_JP',sans-serif] text-[#f6f1e7] outline-none select-none ${reduced ? 'bsc-rm' : ''}`}
    >
      <style>{CSS}</style>
      <div ref={probeRef} aria-hidden className="pointer-events-none invisible absolute top-0 left-0 w-px" style={{ height: 'var(--solo-footer-clearance, 0px)' }} />

      <div ref={stageScope} className="absolute inset-0">
        <SwirlBackground heat={heat} pulse={pulse} cx={swirlCx} cy={swirlCy} reduced={reduced} />

        {/* 装飾: ハーフトーンと画面を横切る斜めの帯 */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div
            className="absolute -top-8 -left-8 size-[46%]"
            style={{
              backgroundImage: `radial-gradient(${RED} 30%, transparent 33%)`,
              backgroundSize: '10px 10px',
              maskImage: 'radial-gradient(circle at 0 0, #000, transparent 62%)',
              WebkitMaskImage: 'radial-gradient(circle at 0 0, #000, transparent 62%)',
              opacity: 0.55,
            }}
          />
          <div className="absolute right-[-30%] left-[-30%]" style={{ bottom: -70 * s, height: 190 * s, rotate: '-9deg', transformOrigin: '100% 100%' }}>
            <div className="absolute inset-0 bg-[#0c0b0d]" style={{ borderTop: `${4 * s}px solid ${WHITE}` }} />
            <div className="absolute inset-x-0" style={{ top: 10 * s, height: 6 * s, background: RED }} />
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `radial-gradient(rgba(227,20,30,.5) 28%, transparent 32%)`,
                backgroundSize: '8px 8px',
                maskImage: 'linear-gradient(90deg, transparent 40%, #000 85%)',
                WebkitMaskImage: 'linear-gradient(90deg, transparent 40%, #000 85%)',
              }}
            />
          </div>
          {(phase === 'holdup' || phase === 'finish') && (
            <motion.div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 30% 50%, transparent 30%, rgba(227,20,30,.35) 70%, rgba(125,10,16,.7))' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
          )}
        </div>

        {/* 敵フィールド */}
        <div className="absolute" style={fieldStyle}>
          {/* 総攻撃チャンス: 仲間のシルエットが取り囲む */}
          <AnimatePresence>
            {(phase === 'holdup' || phase === 'finish') &&
              [
                { x: 7, y: 102, sc: 1.12, flip: false, who: 0 },
                { x: 33, y: 52, sc: 0.8, flip: false, who: 2 },
                { x: 67, y: 50, sc: 0.8, flip: true, who: 1 },
                { x: 95, y: 102, sc: 1.12, flip: true, who: 3 },
              ].map((h, i) => (
                <motion.div
                  key={h.who}
                  aria-hidden
                  className="pointer-events-none absolute"
                  style={{ left: `${h.x}%`, top: `${h.y}%`, height: E * 1.25 * h.sc, width: E * 0.9 * h.sc, marginLeft: -E * 0.45 * h.sc, marginTop: -E * 1.25 * h.sc, zIndex: h.y > 80 ? 4 : 0 }}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, x: (h.flip ? 1 : -1) * 220 * s, scale: 1.3 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.2 } }}
                  transition={reduced ? { duration: 0.15 } : { type: 'spring', stiffness: 380, damping: 20, delay: 0.1 + i * 0.07 }}
                >
                  <div className="flex h-full justify-center" style={{ transform: h.flip ? 'scaleX(-1)' : undefined }}>
                    <Hero who={h.who} />
                  </div>
                </motion.div>
              ))}
          </AnimatePresence>

          {foes.map((f, i) => (
            <Enemy
              key={i}
              idx={i}
              foe={f}
              E={E}
              hit={hits[i]}
              lunge={foeLunge[i]}
              targeted={phase === 'target' && tgt === i}
              pickable={phase === 'target'}
              cower={phase === 'holdup' && !reduced}
              reduced={reduced}
              onPick={() => confirmTarget(i)}
              onHover={() => setTgt(i)}
            />
          ))}

          {/* 照準と予測 */}
          {phase === 'target' && pending && (
            <motion.div
              className="pointer-events-none absolute z-10"
              initial={false}
              animate={{ left: `${FOE_X[tgt]}%`, top: `${FOE_FEET[tgt]}%` }}
              transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 30 }}
            >
              <div className="absolute" style={{ top: -E * FOE_SCALE[tgt] * 0.58 }}>
                <Reticle key={tgt} size={E * 0.95} reduced={reduced} />
                <motion.div
                  key={`p${tgt}`}
                  className="absolute flex flex-col items-start gap-0.5 whitespace-nowrap"
                  style={{ left: E * 0.32, top: -E * 0.55, fontSize: clamp(13 * s, 11, 26) }}
                  initial={reduced ? false : { opacity: 0, x: -20, rotate: 10 }}
                  animate={{ opacity: 1, x: 0, rotate: -8 }}
                  transition={{ type: 'spring', stiffness: 600, damping: 22 }}
                >
                  {pred === 'weak' ? (
                    <span
                      className="bsc-loop font-['Orbitron'] text-[1.3em] font-black text-[#f6f1e7]"
                      style={{ background: RED, padding: '0.1em 0.5em', clipPath: 'polygon(0 14%, 8% 0, 100% 10%, 94% 100%, 4% 88%)', animation: 'bsc-hold .5s ease-in-out infinite' }}
                    >
                      WEAK!
                    </span>
                  ) : pred === 'resist' ? (
                    <span className="bg-[#0c0b0d] px-2 font-black text-[#f6f1e7] ring-2 ring-[#f6f1e7]">耐性あり</span>
                  ) : (
                    <span className="bg-[#f6f1e7] px-2 font-black text-[#0c0b0d]">通常</span>
                  )}
                  {foes[tgt].down && <span className="bg-[#0c0b0d] px-1.5 text-[0.75em] font-black text-[#e3141e]">ダウン中</span>}
                </motion.div>
              </div>
            </motion.div>
          )}
        </div>

        {/* HUD: パーティとコマンド */}
        {showHud && (
          <motion.div
            className="absolute z-20"
            style={{ right: 8 * s, bottom: `calc(var(--solo-footer-clearance,0px) + ${6 * s}px)`, width: 470, height: 400, transform: `scale(${s})`, transformOrigin: '100% 100%' }}
            initial={false}
            animate={{ opacity: phase === 'finish' ? 0 : 1 }}
            transition={{ duration: phase === 'finish' ? 0.25 : 0.2, delay: phase === 'finish' ? 0.15 : 0 }}
          >
            <AnimatePresence>
              {menuOpen && (
                <Cluster
                  key={`c-${entry}-${active}`}
                  member={me}
                  cursor={cmd}
                  x={clusterX}
                  receded={phase !== 'command'}
                  reduced={reduced}
                  weakHints={weakHints}
                  onHover={(i) => phase === 'command' && setCmd(i)}
                  onChoose={chooseCmd}
                />
              )}
            </AnimatePresence>
            <AnimatePresence>
              {(phase === 'skill' || phase === 'item' || phase === 'tactic') && (
                <ListPanel
                  key={phase}
                  title={listTitle}
                  en={listEn}
                  info={
                    phase === 'skill' ? (
                      <span className="bg-[#0c0b0d] px-1.5 font-['Space_Grotesk'] text-[11px] font-bold text-[#f6f1e7] ring-1 ring-[#e3141e]">
                        SP <span className="text-[#e3141e]">{me.sp}</span>/{me.msp}
                      </span>
                    ) : null
                  }
                  rows={rows}
                  cursor={list}
                  desc={desc}
                  reduced={reduced}
                  onHover={setList}
                  onChoose={chooseList}
                  onBack={back}
                />
              )}
            </AnimatePresence>

            {/* 対象選択中のアクション表示 */}
            <AnimatePresence>
              {phase === 'target' && pending && (
                <motion.div
                  key="tchip"
                  className="absolute flex flex-col items-end gap-1"
                  style={{ right: 10, top: 96, rotate: -6 }}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, x: 120, skewX: -20 }}
                  animate={{ opacity: 1, x: 0, skewX: 0 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, x: 120, transition: { duration: 0.12 } }}
                  transition={reduced ? { duration: 0.12 } : { type: 'spring', stiffness: 560, damping: 28 }}
                >
                  <span className="-skew-x-12 bg-[#e3141e] px-2 text-[12px] font-black text-[#f6f1e7] ring-2 ring-[#0c0b0d]">
                    <span className="inline-block skew-x-12">対象を選択</span>
                  </span>
                  <div className="flex items-center gap-2 bg-[#0c0b0d] py-1 pr-3 pl-2 shadow-[5px_5px_0_#e3141e] ring-2 ring-[#f6f1e7]" style={{ clipPath: 'polygon(0 6%, 100% 0, 97% 100%, 2% 94%)' }}>
                    <span className="grid size-8 rotate-45 place-items-center bg-[#f6f1e7]">
                      <ElemIcon el={pending.el} className="size-5 -rotate-45 text-[#0c0b0d]" />
                    </span>
                    <span className="text-[28px] leading-none font-black">{pending.name}</span>
                    <span className="flex flex-col text-[10px] leading-tight font-bold">
                      <span className="text-[#e3141e]">{elLabel(pending.el)}</span>
                      <span>{pending.cost ? `SP ${pending.cost}` : 'コストなし'}</span>
                    </span>
                  </div>
                  <span className="flex gap-1 font-mono text-[10px] font-bold">
                    <kbd className="-skew-x-12 bg-[#f6f1e7] px-1 text-[#0c0b0d]">←→</kbd>選ぶ
                    <kbd className="-skew-x-12 bg-[#f6f1e7] px-1 text-[#0c0b0d]">Enter</kbd>決定
                    <kbd className="-skew-x-12 bg-[#f6f1e7] px-1 text-[#0c0b0d]">Esc</kbd>もどる
                  </span>
                  <button
                    type="button"
                    onClick={back}
                    className="-skew-x-12 bg-[#0c0b0d] px-2 py-0.5 text-[10px] font-black text-[#f6f1e7] ring-1 ring-[#f6f1e7] outline-none hover:bg-[#e3141e] focus-visible:ring-2 focus-visible:ring-[#e3141e]"
                  >
                    <span className="inline-block skew-x-12">◀ もどる</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 総攻撃チャンスの選択 */}
            <AnimatePresence>
              {phase === 'holdup' && (
                <motion.div key="hold" className="absolute" style={{ left: 150, top: 30, width: 310, height: 230 }} exit={{ opacity: 0, x: 100, transition: { duration: 0.15 } }}>
                  {[
                    { label: '総攻撃', en: 'FINISH', sub: '一気にたたみかける', x: 20, y: 6, rot: -9 },
                    { label: '見逃す', en: 'LET GO', sub: '話を聞いて逃がす', x: 70, y: 112, rot: -3 },
                  ].map((b, i) => {
                    const on = hold === i
                    return (
                      <motion.button
                        key={b.label}
                        type="button"
                        aria-label={`${b.label}: ${b.sub}`}
                        aria-current={on ? 'true' : undefined}
                        onMouseEnter={() => setHold(i)}
                        onFocus={() => setHold(i)}
                        onClick={() => chooseHold(i)}
                        className="absolute flex flex-col items-start outline-none focus-visible:[&>svg]:drop-shadow-[0_0_0_#fff]"
                        style={{ left: b.x, top: b.y, width: 230, height: 92, originX: 0, originY: 0.5 }}
                        initial={reduced ? { opacity: 0, rotate: b.rot } : { opacity: 0, x: 220, rotate: b.rot + 30, scale: 0.6 }}
                        animate={{ opacity: 1, x: on ? 0 : 14, rotate: b.rot, scale: on ? 1.06 : 0.9 }}
                        transition={reduced ? { duration: 0.1 } : { type: 'spring', stiffness: 560, damping: 20, delay: (cutin ? 0 : 0.35) + i * 0.08 }}
                      >
                        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
                          <polygon points={JAGS[i]} fill={RED} transform="translate(4 7)" opacity={on ? 1 : 0} />
                          <polygon points={JAGS[i + 1]} fill={on ? (i === 0 ? RED : WHITE) : BLACK} stroke={on ? BLACK : WHITE} strokeWidth="2" vectorEffect="non-scaling-stroke" />
                        </svg>
                        <span className="relative mt-[10px] ml-[22px] flex items-end gap-2">
                          <span className="text-[44px] leading-none font-black" style={{ color: on ? (i === 0 ? WHITE : BLACK) : WHITE, textShadow: on ? `3px 3px 0 ${BLACK}` : 'none' }}>
                            <Kinetic text={b.label} on={on} size={44} reduced={reduced} />
                          </span>
                          <span className={`mb-1 -skew-x-12 px-1 font-['Orbitron'] text-[10px] font-black tracking-widest ${on ? 'bg-[#0c0b0d] text-[#f6f1e7]' : 'bg-[#f6f1e7] text-[#0c0b0d]'}`}>{b.en}</span>
                        </span>
                        <span className={`relative ml-[26px] text-[11px] font-bold ${on && i === 1 ? 'text-[#0c0b0d]' : 'text-[#f6f1e7]'}`}>{b.sub}</span>
                      </motion.button>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            {/* パーティ */}
            <div className="absolute right-0 bottom-0" style={{ width: 3 * TILE_W + SLOT_ACTIVE + 3 * GAP, height: 140 }}>
              {party.map((m, i) => (
                <Tile key={m.name} m={m} i={i} x={tileX(i, hudActive)} isActive={i === hudActive} fx={memberFx} reduced={reduced} phaseIdle={menuOpen} />
              ))}
            </div>
          </motion.div>
        )}

        {/* フィールド上の大きな演出 */}
        <div className="pointer-events-none absolute z-30" style={fieldStyle}>
          <AnimatePresence>
            {weakFx && !reduced && (
              <motion.div key={weakFx.key} className="absolute" style={{ left: clamp((FOE_X[weakFx.foe] / 100) * fieldW, 150 * s, Math.max(150 * s, fieldW - 60 * s)), top: `${FOE_FEET[weakFx.foe]}%`, marginTop: -E * 0.62 }} exit={{ opacity: 0, transition: { duration: 0.08 } }}>
                <WeakImpact s={s} />
              </motion.div>
            )}
            {weakFx && reduced && (
              <motion.div key={weakFx.key} className="absolute -rotate-6" style={{ left: `${FOE_X[weakFx.foe]}%`, top: `${FOE_FEET[weakFx.foe]}%`, marginTop: -E * 0.8, translate: '-50% 0' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Ransom text="WEAK" size={`${40 * s}px`} shadow={RED} animateIn={false} />
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {phase === 'holdup' && !cutin && (
              <motion.div
                key="hb"
                className="absolute top-[2%] left-1/2 flex -translate-x-1/2 flex-col items-center"
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: -40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
              >
                <div className="-rotate-[7deg]">
                  <Ransom text="総攻撃チャンス" size={`${clamp(34 * s, 20, 70)}px`} shadow={RED} slam={!reduced} animateIn={!reduced} />
                </div>
                <span className="mt-1 -rotate-[4deg] bg-[#0c0b0d] px-2 font-['Orbitron'] font-black tracking-[.3em] text-[#e3141e] ring-1 ring-[#e3141e]" style={{ fontSize: clamp(10 * s, 9, 20) }}>
                  SURROUNDED
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 上部: 状態とリセット */}
      <motion.div
        className="absolute top-0 left-0 z-40 flex flex-col items-start gap-1.5"
        initial={false}
        animate={{ opacity: phase === 'finish' || phase === 'victory' ? 0 : 1 }}
        style={{ padding: `${8 * Math.min(s, 1.4)}px ${10 * Math.min(s, 1.4)}px`, fontSize: clamp(11 * s, 10, 19) }}>
        <div className="flex items-center gap-1.5">
          <span className="-rotate-6 bg-[#e3141e] px-[0.5em] font-['Orbitron'] text-[0.95em] font-black tracking-[.25em] text-[#0c0b0d] ring-2 ring-[#0c0b0d]">BATTLE</span>
          <span className="-skew-x-12 bg-[#f6f1e7] px-[0.5em] font-['Space_Grotesk'] text-[0.95em] font-bold text-[#0c0b0d]">
            <span className="inline-block skew-x-12">TURN {turn}</span>
          </span>
          <span className="hidden -skew-x-12 bg-[#0c0b0d] px-[0.5em] text-[0.85em] font-bold text-[#f6f1e7] ring-1 ring-[#f6f1e7]/40 @min-[30rem]:inline" style={{ display: box.w > 480 ? 'inline' : 'none' }}>
            <span className="inline-block skew-x-12">作戦: {TACTICS[tactic].name}</span>
          </span>
          <button
            type="button"
            onClick={reset}
            className="-skew-x-12 bg-[#0c0b0d] px-[0.6em] py-[0.1em] text-[0.9em] font-black text-[#f6f1e7] ring-1 ring-[#f6f1e7] outline-none hover:bg-[#e3141e] focus-visible:ring-2 focus-visible:ring-[#e3141e]"
          >
            <span className="inline-block skew-x-12">↺ 最初から</span>
          </button>
        </div>
        <motion.p
          key={log}
          aria-live="polite"
          className="max-w-[min(34em,72vw)] -rotate-2 border-l-[0.35em] border-[#e3141e] bg-[#0c0b0d]/90 px-[0.6em] py-[0.15em] text-[1em] leading-snug font-bold text-[#f6f1e7] shadow-[3px_3px_0_rgba(227,20,30,.6)]"
          initial={reduced ? false : { opacity: 0, x: -24, skewX: -20 }}
          animate={{ opacity: 1, x: 0, skewX: 0 }}
          transition={{ type: 'spring', stiffness: 600, damping: 30 }}
        >
          {log}
        </motion.p>
      </motion.div>

      {/* 操作ヒント */}
      {wide && showHud && (
        <div className="absolute left-3 z-40 flex flex-wrap gap-2 font-mono font-bold" style={{ bottom: `calc(var(--solo-footer-clearance,0px) + ${8 * s}px)`, fontSize: clamp(10 * s, 9, 16) }}>
          {[
            ['↑↓←→', '選択'],
            ['Enter', '決定'],
            ['Esc', 'もどる'],
          ].map(([a, b]) => (
            <span key={a} className="flex items-center gap-1">
              <kbd className="-skew-x-12 bg-[#f6f1e7] px-1.5 text-[#0c0b0d]">{a}</kbd>
              <span className="[text-shadow:1px_1px_0_#0c0b0d]">{b}</span>
            </span>
          ))}
        </div>
      )}

      {/* 全画面の演出 */}
      {sweep > 1 && !reduced && <TurnSweep key={sweep} s={s} />}
      <AnimatePresence>{banner && <Banner key={banner.key} text={banner.text} en={banner.en} s={s} reduced={reduced} />}</AnimatePresence>
      <AnimatePresence>{cutin && <CutIn key={cutin.key} member={cutin.member} kind={cutin.kind} s={s} reduced={reduced} tall={!wide} />}</AnimatePresence>
      {(phase === 'finish' || phase === 'victory') && (
        <motion.div className="absolute inset-0 z-[60]" animate={{ opacity: phase === 'victory' ? 0.9 : 1 }}>
          <FinishSplash cx={finishCx} cy={finishCy} s={s} w={box.w} h={box.h} reduced={reduced} />
        </motion.div>
      )}
      {(phase === 'victory' || phase === 'spared') && (
        <div aria-hidden className={`pointer-events-none absolute z-[65] ${wide ? 'top-[8%] bottom-0 left-0 w-[44%]' : 'inset-x-0 top-[5%] h-[33%]'}`}>
          {[
            { who: 2, x: -2, b: 22, h: 50, d: 0.25 },
            { who: 1, x: 46, b: 24, h: 52, d: 0.31 },
            { who: 3, x: 60, b: 2, h: 70, d: 0.37 },
            { who: 0, x: 12, b: 0, h: 84, d: 0.43 },
          ].map((p) => (
            <motion.div
              key={p.who}
              className="absolute"
              style={{ left: `${p.x}%`, bottom: `${p.b}%`, height: `${p.h}%` }}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 90, scale: 0.85 }}
              animate={{ opacity: phase === 'spared' ? 0.85 : 1, y: 0, scale: phase === 'spared' ? 0.9 : 1 }}
              transition={reduced ? { duration: 0.2 } : { type: 'spring', stiffness: 380, damping: 18, delay: p.d + (phase === 'spared' ? 0.6 : 0) }}
            >
              <Hero who={p.who} />
            </motion.div>
          ))}
        </div>
      )}
      <AnimatePresence>
        {(phase === 'victory' || phase === 'spared') && <ResultPanel key={phase} won={phase === 'victory'} wide={wide} s={s} reduced={reduced} onReset={reset} resetRef={resetRef} />}
      </AnimatePresence>
      {flash > 0 && !reduced && (
        <motion.div key={flash} aria-hidden className="pointer-events-none absolute inset-0 z-[80] bg-white mix-blend-difference" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0, 1, 0] }} transition={{ duration: 0.22, times: [0, 0.15, 0.45, 0.6, 1] }} />
      )}

      {/* フォーカスリング(子要素に隠れないよう最前面に描く) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[90] group-focus-visible:ring-2 group-focus-visible:ring-[#e3141e] group-focus-visible:ring-inset" />
    </div>
  )
}
