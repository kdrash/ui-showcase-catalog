import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bloom, ChromaticAberration, EffectComposer, Vignette } from '@react-three/postprocessing'
import { AnimatePresence, motion, useReducedMotion, type TargetAndTransition, type Transition } from 'motion/react'
import type { BloomEffect, ChromaticAberrationEffect } from 'postprocessing'
import { Component, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode, type RefObject } from 'react'
import * as THREE from 'three'

/**
 * スタイリッシュJRPG風の「絆ランクアップ」演出と、仲間との絆リスト。
 * - リストは傾いた行を少しずつずらして並べ、選択中の行だけ白黒反転。赤いギザギザのハイライトは layoutId の spring で行から行へ跳ぶ
 * - 演出の時間軸は1本の「開始時刻」だけで管理し、3D 側は useFrame で毎フレームその経過時間から全状態を計算する(React は数回の段階切替でしか再描画しない)。
 *   スキップは開始時刻を巻き戻すだけなので、どの瞬間からでも最終状態に飛べる
 * - 星座のカードは React Three Fiber。切り欠きのある板を ExtrudeGeometry で作り、表面は Canvas2D で描いた絵柄+マスクを使う自作の箔(玉虫色)シェーダー。
 *   縁は HDR 色で光らせ、Bloom・色収差・周辺減光は @react-three/postprocessing
 * - 星座の線は線分ごとの帯メッシュで、頂点属性(線分番号・進行度)とユニフォーム1つで「星から星へ描かれていく」表現を GPU だけで行う。星はポイントスプライトの十字フレア
 * - ランクが上がる瞬間は、ギザギザの衝撃波リング、放射状の集中線、破片パーティクル(どれも経過時間だけで位置が決まる GPU パーティクル)、白黒反転の衝撃コマ、画面揺れ、背景の放射線とハーフトーンの明滅を重ねる
 * - 背景は全画面三角形1枚の GLSL(放射線・ギザギザの斜め帯・45°網点のビネット)。ランクアップ時は 3D の帯に名前入りの文字を流してカットイン
 * - 「RANK UP」は文字ごとに背景色・書体・角度を変えた切り抜き文字。新しい力の帯、台詞の1文字ずつの表示(ref で textContent を更新)は DOM + Motion
 * - Canvas は演出中だけマウントし、マウント直後に gl.compile でシェーダーを先にコンパイル。数フレーム描けてから時計を動かすのでカクつかない
 * - クリック / Enter でスキップ → もう一度で閉じる、Esc で閉じる。リストは ↑↓ で移動、Enter でランクアップ(キー処理はデモ内にフォーカスがあるときのみ)
 * - useReducedMotion 時と WebGL が使えないときは、SVG のカードとフェードだけの短い演出に切り替える
 */

const RED = '#e3141e'
const BLACK = '#0c0b0d'
const WHITE = '#f6f1e7'
const GOLD = '#f2c14e'
const GOLD_LIGHT = '#ffe7a3'

/* ───────────── データ ───────────── */

type Pt = [number, number]
type Bond = {
  id: string
  name: string
  relation: string
  sigil: string
  en: string
  stars: Pt[]
  edges: [number, number][]
  rank: number
  abilities: [string, string][]
  max: [string, string]
  lines: [string, string]
  maxLine: string
}

const BONDS: Bond[] = [
  {
    id: 'yuzuriha',
    name: 'ユズリハ',
    relation: '幼なじみ',
    sigil: '灯台の星',
    en: 'The Lighthouse',
    stars: [
      [-0.34, -0.82],
      [0.34, -0.82],
      [-0.2, -0.08],
      [0.2, -0.08],
      [0, 0.46],
      [0.74, 0.62],
      [0.84, 0.18],
    ],
    edges: [
      [0, 2],
      [2, 4],
      [4, 3],
      [3, 1],
      [1, 0],
      [4, 5],
      [4, 6],
    ],
    rank: 5,
    abilities: [
      ['灯りの合図', '仲間が弱点を突くと、ユズリハが追い打ちをかけることがある。'],
      ['夜明けの見張り', '敵に不意を突かれにくくなる。'],
      ['潮騒の手当て', '戦闘のあと、仲間の体力が少し回復する。'],
    ],
    max: ['導きの灯台', '仲間が倒れるほどの一撃を、一度だけ身代わりに受け止める。'],
    lines: ['昔みたいにさ、また一緒に海まで走ろうよ。', 'あんたが迷ったら、わたしが灯りになる。約束ね。'],
    maxLine: 'もう灯りなんていらないね。……これからは隣で、ずっと照らすから。',
  },
  {
    id: 'kurogane',
    name: 'クロガネ',
    relation: '生徒会の先輩',
    sigil: '錨の星',
    en: 'The Anchor',
    stars: [
      [0, 0.86],
      [0, 0.56],
      [-0.44, 0.4],
      [0.44, 0.4],
      [0, -0.72],
      [-0.64, -0.3],
      [0.64, -0.3],
    ],
    edges: [
      [0, 1],
      [2, 1],
      [1, 3],
      [1, 4],
      [4, 5],
      [4, 6],
    ],
    rank: 3,
    abilities: [
      ['不動の構え', '防御しているときに受けるダメージがさらに減る。'],
      ['号令', '戦闘開始時、味方全員の攻撃力が少し上がる。'],
      ['重しの一喝', '敵をひるませる確率が上がる。'],
    ],
    max: ['錨を下ろせ', '味方全員が、一度だけ状態異常を受けつけなくなる。'],
    lines: ['お前の背中、少しは頼もしくなったな。', '揺れるなよ。俺がここで繋ぎ止めてやる。'],
    maxLine: '……認めよう。お前は、俺の誇りだ。',
  },
  {
    id: 'shion',
    name: 'シオン',
    relation: '図書室の同級生',
    sigil: '栞の星',
    en: 'The Bookmark',
    stars: [
      [-0.36, 0.8],
      [0.36, 0.8],
      [0.36, -0.62],
      [0, -0.3],
      [-0.36, -0.62],
      [0.66, 0.5],
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 0],
      [1, 5],
    ],
    rank: 9,
    abilities: [
      ['読みかけの頁', '敵の弱点をひとつ見抜く。'],
      ['付箋の知恵', 'スキルの消費SPが少し減る。'],
      ['しおり挟み', '探索を中断した場所から、すぐに再開できる。'],
    ],
    max: ['物語の続き', '倒れた仲間を、まれに自動で立ち上がらせる。'],
    lines: ['この本、最後まで一緒に読んでくれる?', 'あなたの話、栞を挟んでおきたいくらい好き。'],
    maxLine: '終わりのページは、ふたりで決めようね。',
  },
  {
    id: 'amane',
    name: 'アマネ',
    relation: '喫茶店の店主',
    sigil: '湯気の星',
    en: 'The Steam',
    stars: [
      [-0.56, -0.04],
      [0.5, -0.04],
      [0.32, -0.66],
      [-0.38, -0.66],
      [0.82, -0.28],
      [-0.14, 0.28],
      [0.1, 0.58],
      [-0.06, 0.88],
    ],
    edges: [
      [3, 0],
      [0, 1],
      [1, 2],
      [2, 3],
      [1, 4],
      [5, 6],
      [6, 7],
    ],
    rank: 1,
    abilities: [
      ['とっておきの一杯', '回復アイテムの効き目が上がる。'],
      ['湯気の向こう', '街の噂話が聞けるようになる。'],
      ['ひと休み', '探索中、SPがゆっくり回復する。'],
    ],
    max: ['看板の味', '戦闘のあと、全員の体力とSPがすっかり回復する。'],
    lines: ['いつもの席、空けておいたよ。', '疲れた顔してる。今日はおごりにしてあげる。'],
    maxLine: 'この店の味、もう君にしか出せないかもね。',
  },
  {
    id: 'hayate',
    name: 'ハヤテ',
    relation: '陸上部の後輩',
    sigil: '矢の星',
    en: 'The Arrow',
    stars: [
      [-0.74, -0.62],
      [-0.02, 0],
      [0.72, 0.58],
      [0.26, 0.64],
      [0.7, 0.12],
      [-0.88, -0.22],
      [-0.42, -0.84],
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [2, 4],
      [0, 5],
      [0, 6],
    ],
    rank: 7,
    abilities: [
      ['追い風', '味方全体の素早さが少し上がる。'],
      ['スタートダッシュ', '先制攻撃できる確率が上がる。'],
      ['ラストスパート', '体力が少ないとき、攻撃が強くなる。'],
    ],
    max: ['流星の脚', '毎ターン、誰よりも先に行動できる。'],
    lines: ['先輩! 今日のタイム、ちゃんと見ててくださいよ!', '先輩の背中、もうすぐ追い越しますから!'],
    maxLine: 'ゴールの先でも、ずっと隣を走らせてください!',
  },
  {
    id: 'nagi',
    name: 'ナギ',
    relation: '古書店の主',
    sigil: '砂時計の星',
    en: 'The Hourglass',
    stars: [
      [-0.52, 0.8],
      [0.52, 0.8],
      [0, 0.02],
      [-0.52, -0.8],
      [0.52, -0.8],
      [0, -0.5],
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 0],
      [2, 3],
      [3, 4],
      [4, 2],
      [2, 5],
    ],
    rank: 10,
    abilities: [
      ['古書の目利き', '拾えるアイテムが少し増える。'],
      ['昔語り', '得られる経験値が少し増える。'],
      ['時の砂', '一度だけ行動をやり直せる。'],
    ],
    max: ['逆さの砂時計', '戦闘中、一度だけ時間を巻き戻せる。'],
    lines: ['若いの、焦らずともよい。砂はまだ落ちきっておらん。', '良い目をするようになった。本も人も、読み方次第じゃ。'],
    maxLine: 'わしの残りの時間、お前さんに預けてみるとしよう。',
  },
]
const MAX_RANK = 10
const abilityFor = (b: Bond, rank: number) => (rank >= MAX_RANK ? b.max : b.abilities[rank % b.abilities.length])
const lineFor = (b: Bond, rank: number) => (rank >= MAX_RANK ? b.maxLine : b.lines[rank % 2])

/** 星ごとに「何本目の線で灯るか」 */
function starOrder(b: Bond) {
  const order = b.stars.map(() => Infinity)
  b.edges.forEach(([a, c], i) => {
    order[a] = Math.min(order[a], i)
    order[c] = Math.min(order[c], i + 1)
  })
  return order.map((o) => (Number.isFinite(o) ? o : 0))
}

/* ───────────── 時間軸 ───────────── */

const T = { fly: 1.0, drawStart: 1.15, drawEnd: 2.45, flare: 2.55, slam: 2.9, rankup: 3.08, ability: 3.7, dialog: 4.2 }
const PH = { idle: 0, fly: 1, draw: 2, charge: 3, slam: 4, rankup: 5, ability: 6, dialog: 7, done: 8 } as const
const phaseAt = (t: number) =>
  t < 0
    ? PH.idle
    : t < T.drawStart
      ? PH.fly
      : t < T.flare
        ? PH.draw
        : t < T.slam
          ? PH.charge
          : t < T.rankup
            ? PH.slam
            : t < T.ability
              ? PH.rankup
              : t < T.dialog
                ? PH.ability
                : PH.dialog
type Timeline = { start: number; skipped: boolean }

/** カードの配置(DOM の CSS と 3D で同じ式を使う)。fx/fy は中心、h は高さ(コンテナ高さ比) */
function cardLayout(w: number, h: number) {
  const land = w / h >= 1.1
  return land ? { fx: 0.27, fy: 0.48, h: Math.min(0.74, (0.54 * w) / h) } : { fx: 0.33, fy: 0.3, h: Math.min(0.4, (0.75 * w) / h) }
}

/* ───────────── 小物 ───────────── */

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
const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const easeOutBack = (x: number, s = 1.9) => 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2

let glSupport: boolean | null = null
function hasWebGL() {
  if (glSupport !== null) return glSupport
  try {
    const c = document.createElement('canvas')
    const ctx = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null
    glSupport = !!ctx
    ctx?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    glSupport = false
  }
  return glSupport
}

class GLBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onError()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
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
const GOLD_SCHEMES: CSSProperties[] = [
  { background: GOLD, color: BLACK },
  { background: BLACK, color: GOLD },
  { background: WHITE, color: BLACK },
  { background: RED, color: GOLD_LIGHT },
  { background: BLACK, color: WHITE },
]

function Ransom({
  text,
  size,
  shadow = BLACK,
  delay = 0,
  animateIn = true,
  gold = false,
  slam = false,
  reduced = false,
}: {
  text: string
  size: string
  shadow?: string
  delay?: number
  animateIn?: boolean
  gold?: boolean
  slam?: boolean
  reduced?: boolean
}) {
  const letters = useMemo(() => {
    const schemes = gold ? GOLD_SCHEMES : SCHEMES
    const r = mulberry32(hash(text) + (gold ? 7 : 0))
    let prev = -1
    return [...text].map((ch) => {
      let s = Math.floor(r() * schemes.length)
      if (s === prev) s = (s + 1 + Math.floor(r() * (schemes.length - 1))) % schemes.length
      prev = s
      const j = () => +(r() * 9).toFixed(1)
      return {
        ch,
        style: { ...schemes[s], ...RANSOM_FONTS[Math.floor(r() * RANSOM_FONTS.length)] },
        rot: (r() - 0.5) * 24,
        scale: 0.84 + r() * 0.34,
        dy: ((r() - 0.5) * 0.2).toFixed(2),
        clip: `polygon(${j()}% ${j()}%, 100% ${j()}%, ${100 - j()}% 100%, ${j()}% ${100 - j()}%)`,
      }
    })
  }, [text, gold])

  return (
    <span aria-hidden className="inline-flex flex-wrap items-center" style={{ fontSize: size, filter: `drop-shadow(0.07em 0.07em 0 ${shadow})` }}>
      {letters.map((l, i) =>
        l.ch === ' ' ? (
          <span key={i} className="inline-block w-[0.3em]" />
        ) : (
          <motion.span
            key={i}
            className="inline-block leading-none"
            style={{ ...l.style, fontSize: `${l.scale}em`, padding: '0.1em 0.15em 0.13em', marginRight: '-0.02em', clipPath: l.clip }}
            initial={
              !animateIn
                ? false
                : reduced
                  ? { opacity: 0, rotate: l.rot }
                  : slam
                    ? { opacity: 0, y: '-0.3em', rotate: l.rot + (i % 2 ? 70 : -70), scale: 3.4 }
                    : { opacity: 0, y: '-0.9em', rotate: l.rot - 50, scale: 1.8 }
            }
            animate={{ opacity: 1, y: `${l.dy}em`, rotate: l.rot, scale: 1 }}
            transition={reduced ? { duration: 0.2, delay } : { type: 'spring', stiffness: slam ? 820 : 560, damping: slam ? 17 : 20, delay: delay + i * (slam ? 0.034 : 0.045) }}
          >
            {l.ch}
          </motion.span>
        ),
      )}
    </span>
  )
}

/* ───────────── 星座カード(共通の形) ───────────── */

/** カードは 200×300 の設計座標。左上と右下を大きく、右上と左下を小さく切り欠く */
const SV = { w: 200, h: 300, c1: 28, c2: 6, cx: 100, cy: 117.2, r: 68.75, k: 53.6 }
const cutPath = (d: number) => {
  const a = SV.c1 - d * 0.6
  const b = Math.max(0, SV.c2 - d * 0.6)
  return `M${d + a} ${d}H${SV.w - d - b}L${SV.w - d} ${d + b}V${SV.h - d - a}L${SV.w - d - a} ${SV.h - d}H${d + b}L${d} ${SV.h - d - b}V${d + a}Z`
}
const svgStar = ([x, y]: Pt): Pt => [SV.cx + x * SV.k, SV.cy - y * SV.k]
const sparkle = (x: number, y: number, r: number) =>
  `M${x} ${y - r}L${x + r * 0.26} ${y - r * 0.26}L${x + r} ${y}L${x + r * 0.26} ${y + r * 0.26}L${x} ${y + r}L${x - r * 0.26} ${y + r * 0.26}L${x - r} ${y}L${x - r * 0.26} ${y - r * 0.26}Z`
/** カード中央を斜めに横切るギザギザの帯 */
const BAND: Pt[] = (() => {
  const top: Pt[] = []
  const bottom: Pt[] = []
  for (let i = 0; i <= 13; i++) {
    const x = -4 + i * 16
    top.push([x, 196 - (x + 4) * 0.33 + (i % 2 ? -5 : 4)])
    bottom.push([x, 240 - (x + 4) * 0.33 + (i % 2 ? 4 : -4)])
  }
  return [...top, ...bottom.reverse()]
})()
const TICKS = (() => {
  let d = ''
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2
    const r0 = i % 5 === 0 ? SV.r - 9 : SV.r - 4.5
    d += `M${(SV.cx + Math.cos(a) * r0).toFixed(2)} ${(SV.cy + Math.sin(a) * r0).toFixed(2)}L${(SV.cx + Math.cos(a) * SV.r).toFixed(2)} ${(SV.cy + Math.sin(a) * SV.r).toFixed(2)}`
  }
  return d
})()

/** DOM 用の星座カード(リストの詳細・WebGL 不使用時の演出) */
function SigilCardSVG({
  bond,
  no,
  rank,
  gold,
  draw = false,
  delay = 0,
  className,
}: {
  bond: Bond
  no: number
  rank: number
  gold: boolean
  draw?: boolean
  delay?: number
  className?: string
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const acc = gold ? GOLD : RED
  const line = gold ? GOLD_LIGHT : WHITE
  const order = useMemo(() => starOrder(bond), [bond])
  const per = (T.drawEnd - T.drawStart) / bond.edges.length
  const isMax = rank >= MAX_RANK
  const pts = bond.stars.map(svgStar)
  return (
    <svg viewBox="0 0 200 300" className={className} aria-hidden>
      <defs>
        <clipPath id={`${id}c`}>
          <path d={cutPath(0)} />
        </clipPath>
        <pattern id={`${id}h`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <circle cx="3" cy="3" r="1.7" fill={RED} />
        </pattern>
        <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#000" />
        </linearGradient>
        <mask id={`${id}m`}>
          <rect width="200" height="150" fill={`url(#${id}f)`} />
        </mask>
      </defs>
      <g clipPath={`url(#${id}c)`}>
        <rect width="200" height="300" fill={BLACK} />
        <rect width="200" height="150" fill={`url(#${id}h)`} mask={`url(#${id}m)`} opacity=".55" />
        <polygon points={BAND.map((p) => p.join(',')).join(' ')} fill={acc} />
        <circle cx={SV.cx} cy={SV.cy} r={SV.r} fill={BLACK} fillOpacity=".9" />
        <g fill="none" stroke={WHITE}>
          <circle cx={SV.cx} cy={SV.cy} r={SV.r} strokeOpacity=".7" strokeWidth="1.2" />
          <circle cx={SV.cx} cy={SV.cy} r={SV.r - 9} strokeOpacity=".3" strokeWidth=".6" />
          <circle cx={SV.cx} cy={SV.cy} r={SV.r * 0.5} strokeOpacity=".18" strokeWidth=".6" strokeDasharray="2 3" />
          <path d={TICKS} strokeOpacity=".45" strokeWidth=".7" />
          <path d={`M${SV.cx - SV.r} ${SV.cy}H${SV.cx + SV.r}M${SV.cx} ${SV.cy - SV.r}V${SV.cy + SV.r}`} strokeOpacity=".12" strokeWidth=".6" />
          {bond.edges.map(([a, b], i) => (
            <path key={i} d={`M${pts[a][0]} ${pts[a][1]}L${pts[b][0]} ${pts[b][1]}`} strokeOpacity=".22" strokeWidth=".8" strokeDasharray="1.5 2.5" />
          ))}
        </g>
        <g stroke={line} strokeWidth="1.7" strokeLinecap="round" fill="none">
          {bond.edges.map(([a, b], i) => (
            <motion.path
              key={i}
              d={`M${pts[a][0]} ${pts[a][1]}L${pts[b][0]} ${pts[b][1]}`}
              initial={draw ? { pathLength: 0 } : false}
              animate={{ pathLength: 1 }}
              transition={{ duration: per, delay: delay + i * per, ease: 'linear' }}
            />
          ))}
        </g>
        {pts.map(([x, y], i) => (
          <motion.g
            key={i}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            initial={draw ? { scale: 0.3, opacity: 0.35 } : false}
            animate={draw ? { scale: [0.3, 2, 1], opacity: 1 } : { scale: 1, opacity: 1 }}
            transition={{ duration: 0.45, delay: delay + order[i] * per, times: [0, 0.3, 1] }}
          >
            <circle cx={x} cy={y} r="4.6" fill={line} opacity=".22" />
            <path d={sparkle(x, y, 5.4)} fill={line} />
          </motion.g>
        ))}
        <text x="36" y="24" fill={WHITE} fontFamily="Orbitron, sans-serif" fontWeight="700" fontSize="10" letterSpacing="1">
          No.{String(no + 1).padStart(2, '0')}
        </text>
        <polygon points="138,13 191,9 188,47 134,50" fill={isMax ? GOLD : acc} />
        <text x="162" y="23" fill={isMax ? BLACK : WHITE} fontFamily="Orbitron, sans-serif" fontWeight="700" fontSize="7" textAnchor="middle" letterSpacing="1.2">
          RANK
        </text>
        <text x="162" y="44" fill={isMax ? BLACK : WHITE} fontFamily="Orbitron, sans-serif" fontWeight="900" fontSize={isMax ? 15 : 21} textAnchor="middle">
          {isMax ? 'MAX' : rank}
        </text>
        <text
          x="100"
          y="206"
          fill={WHITE}
          fontFamily="'Playfair Display', serif"
          fontStyle="italic"
          fontWeight="500"
          fontSize="11.5"
          textAnchor="middle"
          transform="rotate(-17 100 202)"
        >
          — {bond.en} —
        </text>
        <polygon points="12,230 188,222 188,255 12,263" fill={WHITE} />
        <text x="100" y="249" fill={BLACK} fontFamily="'Noto Sans JP', sans-serif" fontWeight="900" fontSize="22" textAnchor="middle" transform="rotate(-2.6 100 243)">
          {bond.sigil}
        </text>
        <polygon points="26,265 176,261 171,282 21,286" fill={acc} />
        <text x="98" y="278" fill={gold ? BLACK : WHITE} fontFamily="'Noto Sans JP', sans-serif" fontWeight="700" fontSize="9.5" textAnchor="middle">
          {bond.name} / {bond.relation}
        </text>
      </g>
      <path d={cutPath(4.5)} fill="none" stroke={WHITE} strokeWidth="2" />
      <path d={cutPath(9)} fill="none" stroke={gold ? GOLD : WHITE} strokeOpacity={gold ? 1 : 0.45} strokeWidth=".8" />
    </svg>
  )
}

/** 小さな星座マーク(リスト用) */
function SigilGlyph({ bond, color, className }: { bond: Bond; color: string; className?: string }) {
  return (
    <svg viewBox="-1.3 -1.3 2.6 2.6" className={className} aria-hidden>
      <circle r="1.16" fill="none" stroke={color} strokeOpacity=".4" strokeWidth=".06" />
      <g stroke={color} strokeWidth=".08" strokeLinecap="round">
        {bond.edges.map(([a, b], i) => (
          <line key={i} x1={bond.stars[a][0]} y1={-bond.stars[a][1]} x2={bond.stars[b][0]} y2={-bond.stars[b][1]} />
        ))}
      </g>
      {bond.stars.map(([x, y], i) => (
        <path key={i} d={sparkle(x, -y, 0.22)} fill={color} />
      ))}
    </svg>
  )
}

/* ───────────── 3D: テクスチャ ───────────── */

const TEX_SCALE = 2.56 // 200×300 → 512×768

function drawFace(ctx: CanvasRenderingContext2D, bond: Bond, no: number, rank: number, gold: boolean, mask: boolean) {
  const acc = gold ? GOLD : RED
  const isMax = rank >= MAX_RANK
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, 512, 768)
  ctx.setTransform(TEX_SCALE, 0, 0, TEX_SCALE, 0, 0)
  ctx.save()
  ctx.clip(new Path2D(cutPath(0)))
  ctx.fillStyle = mask ? '#000' : BLACK
  ctx.fillRect(0, 0, 200, 300)
  if (!mask) {
    for (let y = 3; y < 150; y += 5.2) {
      for (let x = (Math.round(y / 5.2) % 2) * 2.6; x < 204; x += 5.2) {
        const rr = 1.8 * (1 - y / 150) ** 1.1
        if (rr < 0.25) continue
        ctx.fillStyle = 'rgba(227,20,30,.5)'
        ctx.beginPath()
        ctx.arc(x, y, rr, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
  ctx.beginPath()
  BAND.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.closePath()
  ctx.fillStyle = mask ? '#3a3a3a' : acc
  ctx.fill()
  // 星図
  ctx.beginPath()
  ctx.arc(SV.cx, SV.cy, SV.r, 0, Math.PI * 2)
  ctx.fillStyle = mask ? '#000' : 'rgba(12,11,13,.9)'
  ctx.fill()
  const ink = (a: number) => (mask ? `rgba(255,255,255,${Math.min(1, a * 1.6)})` : `rgba(246,241,231,${a})`)
  ctx.lineWidth = 1.2
  ctx.strokeStyle = ink(0.7)
  ctx.stroke()
  ctx.lineWidth = 0.6
  ctx.strokeStyle = ink(0.3)
  ctx.beginPath()
  ctx.arc(SV.cx, SV.cy, SV.r - 9, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([2, 3])
  ctx.strokeStyle = ink(0.2)
  ctx.beginPath()
  ctx.arc(SV.cx, SV.cy, SV.r * 0.5, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.lineWidth = 0.7
  ctx.strokeStyle = ink(0.45)
  ctx.stroke(new Path2D(TICKS))
  if (!mask) {
    ctx.strokeStyle = 'rgba(246,241,231,.12)'
    ctx.lineWidth = 0.6
    ctx.stroke(new Path2D(`M${SV.cx - SV.r} ${SV.cy}H${SV.cx + SV.r}M${SV.cx} ${SV.cy - SV.r}V${SV.cy + SV.r}`))
    // 下書きの点線と星の位置(3D の線と星がこの上をなぞる)
    const pts = bond.stars.map(svgStar)
    ctx.setLineDash([1.5, 2.5])
    ctx.strokeStyle = 'rgba(246,241,231,.2)'
    ctx.lineWidth = 0.8
    bond.edges.forEach(([a, b]) => {
      ctx.beginPath()
      ctx.moveTo(pts[a][0], pts[a][1])
      ctx.lineTo(pts[b][0], pts[b][1])
      ctx.stroke()
    })
    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(246,241,231,.35)'
    pts.forEach(([x, y]) => {
      ctx.beginPath()
      ctx.arc(x, y, 1.6, 0, Math.PI * 2)
      ctx.fill()
    })
  }
  // 文字類
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.fillStyle = mask ? '#fff' : WHITE
  ctx.font = '700 10px Orbitron, sans-serif'
  ctx.fillText(`No.${String(no + 1).padStart(2, '0')}`, 36, 24)
  ctx.beginPath()
  ;[
    [138, 13],
    [191, 9],
    [188, 47],
    [134, 50],
  ].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.closePath()
  ctx.fillStyle = mask ? '#000' : isMax ? GOLD : acc
  ctx.fill()
  if (!mask) {
    ctx.textAlign = 'center'
    ctx.fillStyle = isMax ? BLACK : WHITE
    ctx.font = '700 7px Orbitron, sans-serif'
    ctx.fillText('R A N K', 162, 23)
    ctx.font = `900 ${isMax ? 15 : 21}px Orbitron, sans-serif`
    ctx.fillText(isMax ? 'MAX' : String(rank), 162, 44)
    ctx.save()
    ctx.translate(100, 202)
    ctx.rotate((-17 * Math.PI) / 180)
    ctx.fillStyle = WHITE
    ctx.font = "italic 500 11.5px 'Playfair Display', serif"
    ctx.fillText(`— ${bond.en} —`, 0, 4)
    ctx.restore()
  }
  ctx.beginPath()
  ;[
    [12, 230],
    [188, 222],
    [188, 255],
    [12, 263],
  ].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.closePath()
  if (mask) {
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.stroke()
  } else {
    ctx.fillStyle = WHITE
    ctx.fill()
    ctx.save()
    ctx.translate(100, 243)
    ctx.rotate((-2.6 * Math.PI) / 180)
    ctx.textAlign = 'center'
    ctx.fillStyle = BLACK
    ctx.font = "900 22px 'Noto Sans JP', sans-serif"
    ctx.fillText(bond.sigil, 0, 6)
    ctx.restore()
    ctx.beginPath()
    ;[
      [26, 265],
      [176, 261],
      [171, 282],
      [21, 286],
    ].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
    ctx.closePath()
    ctx.fillStyle = acc
    ctx.fill()
    ctx.textAlign = 'center'
    ctx.fillStyle = gold ? BLACK : WHITE
    ctx.font = "700 9.5px 'Noto Sans JP', sans-serif"
    ctx.fillText(`${bond.name} / ${bond.relation}`, 98, 278)
  }
  ctx.restore()
  if (mask) {
    ctx.lineWidth = 2.4
    ctx.strokeStyle = '#fff'
    ctx.stroke(new Path2D(cutPath(0.8)))
  }
  ctx.lineWidth = 2
  ctx.strokeStyle = mask ? '#fff' : WHITE
  ctx.stroke(new Path2D(cutPath(4.5)))
  ctx.lineWidth = 0.8
  ctx.strokeStyle = mask ? '#fff' : gold ? GOLD : 'rgba(246,241,231,.45)'
  ctx.stroke(new Path2D(cutPath(9)))
}

function drawBack(ctx: CanvasRenderingContext2D, gold: boolean) {
  ctx.setTransform(TEX_SCALE, 0, 0, TEX_SCALE, 0, 0)
  ctx.save()
  ctx.clip(new Path2D(cutPath(0)))
  ctx.fillStyle = RED
  ctx.fillRect(0, 0, 200, 300)
  // 黒の網点(中心ほど小さい)
  ctx.fillStyle = BLACK
  for (let y = 0; y < 304; y += 6) {
    for (let x = (Math.round(y / 6) % 2) * 3; x < 204; x += 6) {
      const d = Math.hypot(x - 100, y - 150) / 150
      const rr = 2.6 * smooth(0.35, 1, d)
      if (rr < 0.2) continue
      ctx.beginPath()
      ctx.arc(x, y, rr, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  // 八方の星
  ctx.translate(100, 150)
  ctx.beginPath()
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2
    const r = i % 2 ? 22 : i % 4 === 0 ? 92 : 58
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  ctx.closePath()
  ctx.fillStyle = BLACK
  ctx.fill()
  ctx.strokeStyle = BLACK
  ctx.lineWidth = 2
  for (const r of [70, 78]) {
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.fillStyle = gold ? GOLD : WHITE
  ctx.font = "900 46px 'Noto Sans JP', sans-serif"
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineWidth = 6
  ctx.strokeStyle = BLACK
  ctx.strokeText('絆', 0, 2)
  ctx.fillText('絆', 0, 2)
  ctx.font = '900 9px Orbitron, sans-serif'
  ctx.fillStyle = BLACK
  ctx.fillText('B O N D   S I G I L', 0, 122)
  ctx.restore()
  ctx.lineWidth = 3
  ctx.strokeStyle = BLACK
  ctx.stroke(new Path2D(cutPath(5)))
}

function drawMarquee(ctx: CanvasRenderingContext2D, name: string, gold: boolean) {
  const seg = `BOND RANK ${gold ? 'MAX' : 'UP'} ✦ ${name} ✦ 絆 ✦ `
  ctx.font = "900 70px Orbitron, 'Noto Sans JP', sans-serif"
  const w = Math.ceil(ctx.measureText(seg).width)
  ctx.canvas.width = w
  ctx.canvas.height = 128
  ctx.fillStyle = gold ? GOLD : WHITE
  ctx.fillRect(0, 0, w, 128)
  ctx.fillStyle = BLACK
  ctx.fillRect(0, 0, w, 9)
  ctx.fillRect(0, 119, w, 9)
  ctx.font = "900 70px Orbitron, 'Noto Sans JP', sans-serif"
  ctx.textBaseline = 'middle'
  ctx.fillStyle = BLACK
  ctx.fillText(seg, 0, 68)
  return w / 128
}

/* ───────────── 3D: シェーダー ───────────── */

const FULLSCREEN_VS = /* glsl */ `
varying vec2 vUv;
void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.9999, 1.0); }`

const BG_FS = /* glsl */ `
uniform vec2 uRes; uniform vec2 uCenter; uniform float uDpr;
uniform float uTime; uniform float uIntro; uniform float uBand; uniform float uBurst; uniform float uFlash; uniform float uGold;
uniform vec3 uRed; uniform vec3 uGoldC; uniform vec3 uDeep;
varying vec2 vUv;
void main() {
  float asp = uRes.x / uRes.y;
  vec2 p = (vUv - uCenter) * vec2(asp, 1.0);
  float r = length(p);
  float a = atan(p.y, p.x);
  float burst = uBurst > 0.0 ? exp(-uBurst * 1.4) : 0.0;
  vec3 acc = mix(uRed, uGoldC, uGold);
  float spin = uTime * 0.035 + (uBurst > 0.0 ? (1.0 - exp(-uBurst * 3.0)) * 0.12 : 0.0);
  float rays = step(0.5, fract(a / 6.2831853 * 14.0 + spin));
  vec3 col = uDeep;
  col = mix(col, acc * 0.42, rays * (0.28 + burst * 0.5) * (1.0 - smoothstep(0.0, 1.5, r)));
  col += acc * (0.32 + burst * 0.9) * exp(-r * r * 2.2);
  // 画面を横切るギザギザの斜め帯
  vec2 d = normalize(vec2(1.0, 0.36));
  float along = dot(p, d);
  float across = dot(p, vec2(-d.y, d.x));
  float w = 0.1 * uBand;
  float jt = (fract(along * 4.0) - 0.5) * 0.06 * uBand;
  float jb = (fract(along * 4.0 + 0.4) - 0.5) * 0.06 * uBand;
  float band = step(across, w + jt) * step(-w + jb, across);
  float inner = step(abs(across - 0.012), 0.022 * uBand);
  float stripe = step(abs(across - 0.2), 0.008 * uBand) + step(abs(across + 0.2), 0.004 * uBand);
  col = mix(col, acc * (0.7 + burst * 0.7), band);
  col = mix(col, uDeep * 0.6, band * inner);
  col = mix(col, vec3(0.9), clamp(stripe, 0.0, 1.0));
  col *= uIntro;
  // 45° 網点のビネット
  vec2 px = vUv * uRes;
  float cell = 9.0 * uDpr;
  vec2 g = mat2(0.7071, -0.7071, 0.7071, 0.7071) * px / cell;
  vec2 f = fract(g) - 0.5;
  vec2 q = (vUv - 0.5) * vec2(asp, 1.0);
  float vig = smoothstep(0.28, 1.0, length(q * vec2(0.62 / max(asp * 0.5, 0.6), 1.15)));
  float dotR = vig * 0.78 - burst * 0.12;
  float dots = 1.0 - smoothstep(dotR - 0.05, dotR + 0.05, length(f));
  col = mix(col, vec3(0.0), dots * step(0.0, dotR));
  col = mix(col, vec3(1.0), uFlash);
  gl_FragColor = vec4(col, 1.0);
}`

const CARD_VS = /* glsl */ `
varying vec2 vUv; varying vec3 vWPos; varying vec3 vWN; varying float vFront;
void main() {
  vUv = position.xy / vec2(1.0, 1.5) + 0.5;
  vFront = step(0.0, normal.z);
  if (vFront < 0.5) vUv.x = 1.0 - vUv.x;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWPos = wp.xyz;
  vWN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`

const CARD_FS = /* glsl */ `
uniform sampler2D uFace; uniform sampler2D uMask; uniform sampler2D uBack;
uniform float uTime; uniform float uSheen; uniform float uFlash; uniform float uGold;
varying vec2 vUv; varying vec3 vWPos; varying vec3 vWN; varying float vFront;
vec3 irid(float h) { return 0.5 + 0.5 * cos(6.28318 * (h + vec3(0.0, 0.33, 0.67))); }
void main() {
  vec3 V = normalize(cameraPosition - vWPos);
  float ndv = abs(dot(normalize(vWN), V));
  float s = (vUv.x * 0.8 + vUv.y * 0.55) - uSheen;
  float sheen = exp(-s * s * 70.0);
  vec3 col;
  if (vFront > 0.5) {
    vec3 base = texture2D(uFace, vUv).rgb;
    float m = texture2D(uMask, vUv).r;
    float h = ndv * 1.9 + (vUv.x - vUv.y) * 1.2 + uTime * 0.07;
    vec3 ir = irid(h);
    vec3 goldFoil = vec3(1.0, 0.7, 0.26) * (0.8 + 0.55 * ir.g);
    vec3 foil = mix(mix(vec3(1.0), ir, 0.62) * 1.1, goldFoil * 1.25, uGold * 0.8);
    float grain = 0.5 + 0.5 * sin(vUv.x * 160.0 + vUv.y * 230.0);
    col = mix(base, base * 0.3 + foil, m * 0.88);
    col += foil * sheen * (0.22 + m * 1.9);
    col += foil * pow(1.0 - ndv, 2.0) * 0.4 * (0.3 + grain * 0.7);
  } else {
    col = texture2D(uBack, vUv).rgb + vec3(1.0, 0.85, 0.7) * sheen * 0.5;
  }
  col = mix(col, vec3(1.7), uFlash);
  gl_FragColor = vec4(col, 1.0);
}`

const PLANE_VS = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`

const AURA_FS = /* glsl */ `
uniform vec3 uColor; uniform float uI;
varying vec2 vUv;
void main() {
  vec2 p = (vUv - 0.5) * vec2(2.0, 2.5);
  vec2 q = abs(p) - vec2(0.5, 0.75);
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
  float g = exp(-max(d, 0.0) * 6.5) * smoothstep(-0.02, 0.02, d);
  gl_FragColor = vec4(uColor * g * uI, 1.0);
}`

const LINE_VS = /* glsl */ `
attribute float aSeg; attribute float aT; attribute float aSide;
varying float vSeg; varying float vT; varying float vSide;
void main() { vSeg = aSeg; vT = aT; vSide = aSide; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`

const LINE_FS = /* glsl */ `
uniform float uDraw; uniform vec3 uColor; uniform float uBoost;
varying float vSeg; varying float vT; varying float vSide;
void main() {
  float head = uDraw - vSeg;
  if (vT > head) discard;
  float edge = 1.0 - abs(vSide);
  float a = smoothstep(0.0, 0.7, edge);
  float hot = head < 1.0 ? exp(-(head - vT) * 9.0) : 0.0;
  gl_FragColor = vec4(uColor * (1.5 + hot * 4.0 + uBoost) * a, 1.0);
}`

const STAR_VS = /* glsl */ `
attribute float aOrder; attribute float aSeed;
uniform float uDraw; uniform float uFlare; uniform float uPx; uniform float uScale; uniform float uTime;
varying float vLit; varying float vFlare;
void main() {
  float since = uDraw - aOrder;
  vLit = step(0.0, since);
  vFlare = vLit * exp(-max(since, 0.0) * 2.2) * 1.4 + uFlare;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float tw = 0.85 + 0.15 * sin(uTime * 5.0 + aSeed * 40.0);
  gl_PointSize = uPx * uScale * (0.03 + 0.065 * vLit * tw + 0.085 * min(vFlare, 2.4)) / -mv.z;
  gl_Position = projectionMatrix * mv;
}`

const STAR_FS = /* glsl */ `
uniform vec3 uColor;
varying float vLit; varying float vFlare;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r = length(p);
  float core = exp(-r * r * 22.0);
  float cross = exp(-abs(p.x) * 26.0) * exp(-p.y * p.y * 2.5) + exp(-abs(p.y) * 26.0) * exp(-p.x * p.x * 2.5);
  float halo = exp(-r * r * 5.0) * 0.35;
  float lit = mix(0.18, 1.0, vLit);
  float a = (core * 1.2 + (cross * 0.9 + halo) * (0.35 + vFlare)) * lit;
  vec3 col = mix(uColor, vec3(1.0), core) * (1.1 + vFlare * 2.6);
  gl_FragColor = vec4(col * a, 1.0);
}`

const BURST_VS = /* glsl */ `
attribute vec3 aDir; attribute vec4 aMisc;
uniform float uAge; uniform float uPx; uniform float uScale;
varying float vA; varying float vHue; varying float vRot;
void main() {
  float age = max(uAge, 0.0);
  float k = (1.0 - exp(-age * 3.4)) / 3.4;
  vec3 p = aDir * aMisc.x * k;
  p.y -= 0.3 * age * age;
  vec4 mv = modelViewMatrix * vec4(p * uScale, 1.0);
  float lifeT = clamp(age / aMisc.z, 0.0, 1.0);
  vA = 1.0 - lifeT;
  vHue = aMisc.w;
  vRot = aMisc.x * 2.0 + age * aMisc.x;
  gl_PointSize = uPx * aMisc.y * uScale * (0.3 + 0.7 * vA) / -mv.z;
  gl_Position = projectionMatrix * mv;
}`

const BURST_FS = /* glsl */ `
uniform vec3 uRed; uniform vec3 uGoldC;
varying float vA; varying float vHue; varying float vRot;
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float cs = cos(vRot), sn = sin(vRot);
  c = mat2(cs, -sn, sn, cs) * c;
  if (abs(c.x) + abs(c.y) * 2.4 > 1.0) discard;
  vec3 col = vHue < 0.5 ? uRed * 2.4 : (vHue < 0.82 ? vec3(2.6) : uGoldC * 2.6);
  gl_FragColor = vec4(col * vA, 1.0);
}`

const STREAK_VS = /* glsl */ `
attribute float aAlong; attribute float aSide; attribute vec4 aStreak; attribute float aHue;
uniform float uAge; uniform float uScale;
varying float vA; varying float vSide; varying float vHue; varying float vAlong;
void main() {
  float age = max(uAge - aStreak.w, 0.0);
  float head = 0.55 + aStreak.y * (1.0 - exp(-age * 3.2));
  float len = aStreak.z * (1.0 - exp(-age * 12.0)) * exp(-age * 1.2);
  float r = mix(head - len, head, aAlong);
  vec2 dir = vec2(cos(aStreak.x), sin(aStreak.x));
  vec2 perp = vec2(-dir.y, dir.x);
  vec2 p = dir * r + perp * aSide * 0.022 * aAlong;
  vA = exp(-age * 2.4) * step(aStreak.w, uAge);
  vSide = aSide; vHue = aHue; vAlong = aAlong;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p * uScale, 0.0, 1.0);
}`

const STREAK_FS = /* glsl */ `
uniform vec3 uRed; uniform vec3 uGoldC; uniform float uGold;
varying float vA; varying float vSide; varying float vHue; varying float vAlong;
void main() {
  float a = (1.0 - vSide * vSide) * vAlong * vA;
  vec3 col = vHue < 0.55 ? vec3(2.2) : mix(uRed, uGoldC, uGold) * 2.6;
  gl_FragColor = vec4(col * a, 1.0);
}`

const RING_FS = /* glsl */ `
uniform float uAge; uniform vec3 uColA; uniform vec3 uColB;
varying vec2 vUv;
float ring(float r, float ang, float age, float speed, float th0, float jagAmt) {
  if (age <= 0.0) return 0.0;
  float R = 1.0 - exp(-age * speed);
  float life = 1.0 - clamp(age / 0.85, 0.0, 1.0);
  float jag = (abs(fract(ang * 2.546 + age * 0.4) - 0.5) - 0.25) * jagAmt + 0.012 * sin(ang * 23.0);
  float th = th0 * life + 0.003;
  return smoothstep(th, 0.0, abs(r - R * (1.0 + jag))) * life;
}
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  float ang = atan(p.y, p.x) * 4.0;
  float r1 = ring(r, ang, uAge, 4.2, 0.05, 0.08);
  float r2 = ring(r, ang + 1.3, uAge - 0.1, 3.0, 0.09, 0.14);
  float R1 = 1.0 - exp(-max(uAge, 0.0) * 4.2);
  float disc = uAge > 0.0 ? (1.0 - smoothstep(0.0, max(R1, 0.01), r)) * exp(-uAge * 10.0) * 0.9 : 0.0;
  vec3 col = uColA * r1 * 2.6 + uColB * r2 * 2.0 + vec3(1.4) * disc;
  gl_FragColor = vec4(col, 1.0);
}`

const BAND_FS = /* glsl */ `
uniform sampler2D uMap; uniform float uRepeat; uniform float uOffset;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(uMap, vec2(vUv.x * uRepeat - uOffset, vUv.y)).rgb;
  gl_FragColor = vec4(c * 0.78, 1.0);
}`

const DUST_VS = /* glsl */ `
attribute vec4 aDust;
uniform float uTime; uniform vec3 uBox; uniform float uPx;
varying float vA;
void main() {
  vec3 p = position;
  p.y = fract(p.y + uTime * aDust.x) - 0.5;
  p.x += sin(uTime * 0.6 + aDust.y * 6.28) * 0.02;
  vec4 mv = modelViewMatrix * vec4(p * uBox, 1.0);
  vA = (0.5 + 0.5 * sin(uTime * 3.0 + aDust.y * 30.0)) * aDust.w;
  gl_PointSize = uPx * aDust.z / -mv.z;
  gl_Position = projectionMatrix * mv;
}`

const DUST_FS = /* glsl */ `
uniform vec3 uColor;
varying float vA;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float a = exp(-dot(p, p) * 5.0) * vA;
  gl_FragColor = vec4(uColor * a, 1.0);
}`

/* ───────────── 3D: シーン一式 ───────────── */

const FOV = 35
const CAM_Z = 6
const VIEW_H = 2 * CAM_Z * Math.tan(((FOV / 2) * Math.PI) / 180)
const CARD_DEPTH = 0.024
const LINE_HW = 0.0095
const starXY = ([x, y]: Pt): Pt => [x * 0.268, 0.164 + y * 0.268]
const lin = (hex: string, k = 1) => new THREE.Color(hex).multiplyScalar(k)

function additive(vertexShader: string, fragmentShader: string, uniforms: Record<string, THREE.IUniform>) {
  return new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })
}

function buildRig(bond: Bond, no: number, gold: boolean) {
  const disposables: { dispose: () => void }[] = []
  const keep = <D extends { dispose: () => void }>(d: D) => (disposables.push(d), d)
  const acc = gold ? GOLD : RED
  const rnd = mulberry32(hash(bond.id))

  // テクスチャ
  const mk = () => {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 768
    return c
  }
  const faceC = mk()
  const maskC = mk()
  const backC = mk()
  const bandC = document.createElement('canvas')
  const faceT = keep(new THREE.CanvasTexture(faceC))
  const maskT = keep(new THREE.CanvasTexture(maskC))
  const backT = keep(new THREE.CanvasTexture(backC))
  const bandT = keep(new THREE.CanvasTexture(bandC))
  faceT.colorSpace = backT.colorSpace = bandT.colorSpace = THREE.SRGBColorSpace
  faceT.anisotropy = backT.anisotropy = 4
  bandT.wrapS = THREE.RepeatWrapping
  let rankShown = -1
  let bandRatio = 6
  const redraw = (rank: number) => {
    rankShown = rank
    drawFace(faceC.getContext('2d')!, bond, no, rank, gold, false)
    drawFace(maskC.getContext('2d')!, bond, no, rank, gold, true)
    drawBack(backC.getContext('2d')!, gold)
    bandRatio = drawMarquee(bandC.getContext('2d')!, bond.name, gold)
    faceT.needsUpdate = maskT.needsUpdate = backT.needsUpdate = bandT.needsUpdate = true
  }

  const root = new THREE.Group()

  // 背景(全画面三角形)
  const bgGeo = keep(new THREE.BufferGeometry())
  bgGeo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3))
  const bgMat = keep(
    new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VS,
      fragmentShader: BG_FS,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uRes: { value: new THREE.Vector2(1, 1) },
        uCenter: { value: new THREE.Vector2(0.3, 0.5) },
        uDpr: { value: 1 },
        uTime: { value: 0 },
        uIntro: { value: 0 },
        uBand: { value: 0 },
        uBurst: { value: -1 },
        uFlash: { value: 0 },
        uGold: { value: gold ? 1 : 0 },
        uRed: { value: lin(RED) },
        uGoldC: { value: lin(GOLD) },
        uDeep: { value: lin('#1a0507') },
      },
    }),
  )
  const bg = new THREE.Mesh(bgGeo, bgMat)
  bg.frustumCulled = false
  bg.renderOrder = -10
  root.add(bg)

  // 演出の中心(カードの最終位置)。カード以外のエフェクトはここに置き、回転させない
  const fx = new THREE.Group()
  root.add(fx)

  // カットインの帯(名前が流れる)
  const planeGeo = keep(new THREE.PlaneGeometry(1, 1))
  const bandMat = keep(
    new THREE.ShaderMaterial({ vertexShader: PLANE_VS, fragmentShader: BAND_FS, uniforms: { uMap: { value: bandT }, uRepeat: { value: 1 }, uOffset: { value: 0 } } }),
  )
  const band = new THREE.Mesh(planeGeo, bandMat)
  band.position.z = -1.2
  band.rotation.z = -0.3
  band.renderOrder = -5
  band.visible = false
  fx.add(band)

  // 集中線
  const STREAKS = 44
  const sPos: number[] = []
  const sAlong: number[] = []
  const sSide: number[] = []
  const sData: number[] = []
  const sHue: number[] = []
  const sIdx: number[] = []
  for (let i = 0; i < STREAKS; i++) {
    const ang = (i / STREAKS) * Math.PI * 2 + (rnd() - 0.5) * 0.12
    const data = [ang, 1.6 + rnd() * 2.6, 0.5 + rnd() * 1.1, rnd() * 0.08]
    const hue = rnd()
    const base = sPos.length / 3
    for (const along of [0, 1]) {
      for (const side of [-1, 1]) {
        sPos.push(0, 0, 0)
        sAlong.push(along)
        sSide.push(side)
        sData.push(...data)
        sHue.push(hue)
      }
    }
    sIdx.push(base, base + 1, base + 2, base + 2, base + 1, base + 3)
  }
  const streakGeo = keep(new THREE.BufferGeometry())
  streakGeo.setAttribute('position', new THREE.Float32BufferAttribute(sPos, 3))
  streakGeo.setAttribute('aAlong', new THREE.Float32BufferAttribute(sAlong, 1))
  streakGeo.setAttribute('aSide', new THREE.Float32BufferAttribute(sSide, 1))
  streakGeo.setAttribute('aStreak', new THREE.Float32BufferAttribute(sData, 4))
  streakGeo.setAttribute('aHue', new THREE.Float32BufferAttribute(sHue, 1))
  streakGeo.setIndex(sIdx)
  const streakMat = keep(
    additive(STREAK_VS, STREAK_FS, { uAge: { value: -1 }, uScale: { value: 1 }, uRed: { value: lin(RED) }, uGoldC: { value: lin(GOLD) }, uGold: { value: gold ? 1 : 0 } }),
  )
  const streaks = new THREE.Mesh(streakGeo, streakMat)
  streaks.frustumCulled = false
  streaks.position.z = -0.6
  streaks.renderOrder = -2
  streaks.visible = false
  fx.add(streaks)

  // 衝撃波リング
  const ringMat = keep(
    new THREE.ShaderMaterial({
      vertexShader: PLANE_VS,
      fragmentShader: RING_FS,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uAge: { value: -1 }, uColA: { value: lin(gold ? GOLD_LIGHT : WHITE) }, uColB: { value: lin(acc) } },
    }),
  )
  const ring = new THREE.Mesh(planeGeo, ringMat)
  ring.position.z = -0.3
  ring.renderOrder = -1
  ring.visible = false
  fx.add(ring)

  // 破片パーティクル
  const BURST = 260
  const bDir = new Float32Array(BURST * 3)
  const bMisc = new Float32Array(BURST * 4)
  for (let i = 0; i < BURST; i++) {
    const th = rnd() * Math.PI * 2
    const z = (rnd() - 0.3) * 0.7
    bDir.set([Math.cos(th), Math.sin(th), z], i * 3)
    bMisc.set([1.4 + rnd() ** 0.7 * 4.6, 0.035 + rnd() * 0.075, 0.5 + rnd() * 0.65, rnd()], i * 4)
  }
  const burstGeo = keep(new THREE.BufferGeometry())
  burstGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(BURST * 3), 3))
  burstGeo.setAttribute('aDir', new THREE.BufferAttribute(bDir, 3))
  burstGeo.setAttribute('aMisc', new THREE.BufferAttribute(bMisc, 4))
  const burstMat = keep(additive(BURST_VS, BURST_FS, { uAge: { value: -1 }, uPx: { value: 500 }, uScale: { value: 1 }, uRed: { value: lin(RED) }, uGoldC: { value: lin(GOLD) } }))
  const burst = new THREE.Points(burstGeo, burstMat)
  burst.frustumCulled = false
  burst.position.z = 0.25
  burst.renderOrder = 3
  burst.visible = false
  fx.add(burst)

  // 漂う光の粒
  const DUST = 120
  const dPos = new Float32Array(DUST * 3)
  const dData = new Float32Array(DUST * 4)
  for (let i = 0; i < DUST; i++) {
    dPos.set([rnd() - 0.5, rnd(), rnd() - 0.5], i * 3)
    dData.set([0.02 + rnd() * 0.05, rnd(), 0.015 + rnd() * 0.035, 0.4 + rnd() * 0.8], i * 4)
  }
  const dustGeo = keep(new THREE.BufferGeometry())
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3))
  dustGeo.setAttribute('aDust', new THREE.BufferAttribute(dData, 4))
  const dustMat = keep(
    additive(DUST_VS, DUST_FS, {
      uTime: { value: 0 },
      uBox: { value: new THREE.Vector3(10, 4, 4) },
      uPx: { value: 500 },
      uColor: { value: lin(gold ? GOLD_LIGHT : '#ffb0a8', 1.4) },
    }),
  )
  const dust = new THREE.Points(dustGeo, dustMat)
  dust.frustumCulled = false
  dust.renderOrder = 2
  root.add(dust)

  // カード本体
  const card = new THREE.Group()
  root.add(card)
  const shape = new THREE.Shape()
  const S = (x: number, y: number): [number, number] => [x / SV.w - 0.5, 0.75 - (y / SV.h) * 1.5]
  const outline: Pt[] = [
    [SV.c1, 0],
    [SV.w - SV.c2, 0],
    [SV.w, SV.c2],
    [SV.w, SV.h - SV.c1],
    [SV.w - SV.c1, SV.h],
    [SV.c2, SV.h],
    [0, SV.h - SV.c2],
    [0, SV.c1],
  ]
  outline.forEach(([x, y], i) => (i ? shape.lineTo(...S(x, y)) : shape.moveTo(...S(x, y))))
  shape.closePath()
  const cardGeo = keep(new THREE.ExtrudeGeometry(shape, { depth: CARD_DEPTH, bevelEnabled: false }))
  cardGeo.translate(0, 0, -CARD_DEPTH / 2)
  const faceMat = keep(
    new THREE.ShaderMaterial({
      vertexShader: CARD_VS,
      fragmentShader: CARD_FS,
      uniforms: {
        uFace: { value: faceT },
        uMask: { value: maskT },
        uBack: { value: backT },
        uTime: { value: 0 },
        uSheen: { value: -1 },
        uFlash: { value: 0 },
        uGold: { value: gold ? 1 : 0 },
      },
    }),
  )
  const edgeMat = keep(new THREE.MeshBasicMaterial({ color: lin(acc, 3), toneMapped: false }))
  const cardMesh = new THREE.Mesh(cardGeo, [faceMat, edgeMat])
  card.add(cardMesh)

  const auraMat = keep(additive(PLANE_VS, AURA_FS, { uColor: { value: lin(acc, 1.6) }, uI: { value: 0 } }))
  const aura = new THREE.Mesh(planeGeo, auraMat)
  aura.scale.set(2, 2.5, 1)
  aura.position.z = -0.05
  aura.renderOrder = -1
  card.add(aura)

  // 星座の線(線分ごとの帯)
  const lp: number[] = []
  const lSeg: number[] = []
  const lT: number[] = []
  const lSide: number[] = []
  const lIdx: number[] = []
  bond.edges.forEach(([a, b], i) => {
    const A = starXY(bond.stars[a])
    const B = starXY(bond.stars[b])
    const dx = B[0] - A[0]
    const dy = B[1] - A[1]
    const L = Math.hypot(dx, dy) || 1
    const nx = (-dy / L) * LINE_HW
    const ny = (dx / L) * LINE_HW
    const base = lp.length / 3
    for (const [P, t] of [
      [A, 0],
      [B, 1],
    ] as const) {
      for (const s of [-1, 1]) {
        lp.push(P[0] + nx * s, P[1] + ny * s, 0)
        lSeg.push(i)
        lT.push(t)
        lSide.push(s)
      }
    }
    lIdx.push(base, base + 1, base + 2, base + 2, base + 1, base + 3)
  })
  const lineGeo = keep(new THREE.BufferGeometry())
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3))
  lineGeo.setAttribute('aSeg', new THREE.Float32BufferAttribute(lSeg, 1))
  lineGeo.setAttribute('aT', new THREE.Float32BufferAttribute(lT, 1))
  lineGeo.setAttribute('aSide', new THREE.Float32BufferAttribute(lSide, 1))
  lineGeo.setIndex(lIdx)
  const lineColor = lin(gold ? GOLD_LIGHT : '#fff1dc')
  const lineMat = keep(additive(LINE_VS, LINE_FS, { uDraw: { value: 0 }, uColor: { value: lineColor }, uBoost: { value: 0 } }))
  const lines = new THREE.Mesh(lineGeo, lineMat)
  lines.position.z = CARD_DEPTH / 2 + 0.002
  lines.renderOrder = 1
  card.add(lines)

  const order = starOrder(bond)
  const stPos = new Float32Array(bond.stars.length * 3)
  bond.stars.forEach((s, i) => stPos.set([...starXY(s), 0], i * 3))
  const starGeo = keep(new THREE.BufferGeometry())
  starGeo.setAttribute('position', new THREE.BufferAttribute(stPos, 3))
  starGeo.setAttribute('aOrder', new THREE.Float32BufferAttribute(order, 1))
  starGeo.setAttribute(
    'aSeed',
    new THREE.Float32BufferAttribute(
      bond.stars.map(() => rnd()),
      1,
    ),
  )
  const starMat = keep(
    additive(STAR_VS, STAR_FS, { uDraw: { value: 0 }, uFlare: { value: 0 }, uPx: { value: 500 }, uScale: { value: 1 }, uTime: { value: 0 }, uColor: { value: lineColor } }),
  )
  const stars = new THREE.Points(starGeo, starMat)
  stars.position.z = CARD_DEPTH / 2 + 0.004
  stars.renderOrder = 2
  stars.frustumCulled = false
  card.add(stars)

  return {
    root,
    bg,
    fx,
    band,
    streaks,
    ring,
    burst,
    dust,
    card,
    nEdges: bond.edges.length,
    mats: { bg: bgMat, band: bandMat, streak: streakMat, ring: ringMat, burst: burstMat, dust: dustMat, face: faceMat, aura: auraMat, line: lineMat, star: starMat },
    get bandRatio() {
      return bandRatio
    },
    get rankShown() {
      return rankShown
    },
    redraw,
    dispose: () => disposables.forEach((d) => d.dispose()),
  }
}
type Rig = ReturnType<typeof buildRig>

function RigView({ bond, no, from, to, tl, onReady }: { bond: Bond; no: number; from: number; to: number; tl: RefObject<Timeline>; onReady: () => void }) {
  const gold = to >= MAX_RANK
  const rig: Rig = useMemo(() => buildRig(bond, no, gold), [bond, no, gold])
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const bloom = useRef<BloomEffect>(null)
  const ca = useRef<ChromaticAberrationEffect>(null)
  const caOffset = useMemo(() => new THREE.Vector2(), [])
  const st = useRef({ frames: 0, tiltX: 0, tiltY: 0 })

  useEffect(() => () => rig.dispose(), [rig])
  // テクスチャ(フォントの読み込み後にもう一度描く)
  useLayoutEffect(() => {
    let alive = true
    rig.redraw(from)
    const fonts = document.fonts
    if (fonts) {
      Promise.all(["900 22px 'Noto Sans JP'", "700 9px 'Noto Sans JP'", '900 20px Orbitron', '700 10px Orbitron', "italic 500 12px 'Playfair Display'"].map((f) => fonts.load(f)))
        .then(() => alive && rig.redraw(rig.rankShown < 0 ? from : rig.rankShown))
        .catch(() => {})
    }
    return () => {
      alive = false
    }
  }, [rig, from])
  // シェーダーを先にコンパイルしておく
  useLayoutEffect(() => {
    try {
      gl.compile(scene, camera)
    } catch {
      /* noop */
    }
  }, [gl, scene, camera, rig])

  useFrame((state) => {
    const s = st.current
    if (s.frames < 3 && ++s.frames === 3) onReady()
    const tlv = tl.current
    const t = Number.isNaN(tlv.start) ? -1 : (performance.now() - tlv.start) / 1000
    const clock = state.clock.elapsedTime
    const { width: W, height: H } = state.size
    const dpr = state.viewport.dpr
    const L = cardLayout(W, H)
    const vh = VIEW_H
    const vw = vh * (W / H)
    const tx = (L.fx - 0.5) * vw
    const ty = (0.5 - L.fy) * vh
    const sc = (L.h * vh) / 1.5
    const px = (H * dpr) / (2 * Math.tan(((FOV / 2) * Math.PI) / 180))
    const m = rig.mats

    // 経過時間の各区間
    const p = clamp01(t / T.fly)
    const e = 1 - (1 - p) ** 4
    const after = t - T.fly
    const wob = after > 0 ? Math.exp(-after * 6.5) * Math.sin(after * 21) : 0
    const charge = t > T.flare && t < T.slam ? (t - T.flare) / (T.slam - T.flare) : 0
    const as = t - T.slam
    const slamOn = as > 0
    const idle = smooth(T.fly + 0.15, T.fly + 1.1, t)

    s.tiltX += (state.pointer.x - s.tiltX) * 0.05
    s.tiltY += (state.pointer.y - s.tiltY) * 0.05

    // カード: 回転しながら飛び込み → 正面で止まって跳ね返る → ゆらぎ
    const card = rig.card
    card.visible = t >= 0
    card.position.set(
      tx + (1 - e) * vw * 0.72 + Math.sin(t * 93) * 0.018 * charge * sc,
      ty - (1 - e) * vh * 0.62 + idle * Math.sin(t * 1.3) * 0.025 * sc + Math.cos(t * 81) * 0.014 * charge * sc,
      -(1 - e) * 7,
    )
    card.rotation.set(
      0.7 * (1 - e) + idle * (Math.sin(t * 0.7) * 0.045 - s.tiltY * 0.16),
      -Math.PI * 5 * (1 - p) ** 2.6 + wob * 0.38 + idle * (Math.sin(t * 0.9) * 0.08 + s.tiltX * 0.24),
      -1.15 * (1 - e) - 0.07 + wob * 0.05,
    )
    const punch = slamOn ? 0.14 * Math.exp(-as * 9) * Math.cos(as * 26) : 0
    card.scale.setScalar(Math.max(0.001, sc * (0.35 + 0.65 * e) * (1 + wob * 0.06) * (1 - 0.045 * charge) * (1 + punch)))

    // カード表面
    const sweep = (t0: number, d = 0.55) => (t >= t0 && t < t0 + d ? -0.6 + (2.7 * (t - t0)) / d : null)
    const loopT = t > T.dialog + 0.8 ? (t - T.dialog - 0.8) % 3.8 : -1
    m.face.uniforms.uSheen.value = sweep(T.fly - 0.12) ?? sweep(T.slam, 0.5) ?? (loopT >= 0 && loopT < 0.7 ? -0.6 + (2.7 * loopT) / 0.7 : -2)
    m.face.uniforms.uTime.value = clock
    const flareAll = Math.exp(-(((t - T.flare) / 0.09) ** 2))
    m.face.uniforms.uFlash.value = flareAll * 0.18 + (slamOn ? Math.exp(-as * 8) * 0.85 : 0)
    if (t >= T.slam ? rig.rankShown !== to : rig.rankShown !== from) rig.redraw(t >= T.slam ? to : from)

    m.aura.uniforms.uI.value = t < 0 ? 0 : 0.35 + (after > 0 ? 1.1 * Math.exp(-after * 4) : 0.6 * p) + charge * 1.2 + (slamOn ? 2.4 * Math.exp(-as * 3) : 0)

    const draw = clamp01((t - T.drawStart) / (T.drawEnd - T.drawStart)) * rig.nEdges
    m.line.uniforms.uDraw.value = draw
    m.line.uniforms.uBoost.value = flareAll * 2 + charge * 1.2 + (slamOn ? 2 * Math.exp(-as * 3) : 0)
    m.star.uniforms.uDraw.value = draw + Math.max(0, t - T.drawEnd) * 4
    m.star.uniforms.uFlare.value = flareAll * 1.3 + charge * 0.5 + (slamOn ? 1.2 * Math.exp(-as * 2.5) : 0)
    m.star.uniforms.uPx.value = px
    m.star.uniforms.uScale.value = card.scale.x
    m.star.uniforms.uTime.value = clock

    // 演出の中心
    rig.fx.position.set(tx, ty, 0)
    const ringOn = slamOn && as < 1.2
    rig.ring.visible = ringOn
    if (ringOn) {
      const R = Math.hypot(vw, vh) * 0.62
      rig.ring.scale.set(R, R, 1)
      m.ring.uniforms.uAge.value = as
    }
    rig.streaks.visible = slamOn && as < 2.2
    m.streak.uniforms.uAge.value = as
    m.streak.uniforms.uScale.value = sc
    rig.burst.visible = slamOn && as < 1.3
    m.burst.uniforms.uAge.value = as
    m.burst.uniforms.uPx.value = px
    m.burst.uniforms.uScale.value = sc

    const ab = t - T.rankup
    rig.band.visible = ab > 0
    if (ab > 0) {
      const bh = sc * 0.27 * easeOutBack(clamp01(ab / 0.22), 2.4)
      const len = Math.hypot(vw, vh) * 1.6
      rig.band.scale.set(len, Math.max(bh, 0.001), 1)
      rig.band.position.set(-tx * 0.35, sc * 0.18, -1.2)
      m.band.uniforms.uRepeat.value = len / Math.max(sc * 0.27, 0.01) / rig.bandRatio
      m.band.uniforms.uOffset.value = t * 0.35
    }

    m.dust.uniforms.uTime.value = clock
    m.dust.uniforms.uPx.value = px
    m.dust.uniforms.uBox.value.set(vw * 1.1, vh * 1.1, 3)

    // 背景
    const bgU = m.bg.uniforms
    bgU.uRes.value.set(W * dpr, H * dpr)
    bgU.uDpr.value = dpr
    bgU.uCenter.value.set(L.fx, 1 - L.fy)
    bgU.uTime.value = clock
    bgU.uIntro.value = smooth(0, 0.45, clock)
    bgU.uBand.value = t > 0 ? easeOutBack(clamp01((t - 0.05) / 0.3), 2.2) : 0
    bgU.uBurst.value = slamOn ? as : -1
    bgU.uFlash.value = slamOn ? Math.exp(-as * 16) * 0.55 : 0

    // カメラ: 着地とランクアップで揺らし、少し押し込む
    const arrive = after > 0 ? Math.exp(-after * 9) * 0.03 : 0
    const amp = arrive + (slamOn ? 0.08 * Math.exp(-as * 6.5) : 0) + charge * 0.008
    state.camera.position.set(Math.sin(t * 73) * amp, Math.cos(t * 61) * amp, CAM_Z - (slamOn ? 0.4 * Math.exp(-as * 4.5) * Math.min(1, as * 30) : 0))

    if (bloom.current) bloom.current.intensity = 0.9 + flareAll * 0.6 + charge * 0.5 + (slamOn ? 1.8 * Math.exp(-as * 3) : 0)
    if (ca.current) {
      const k = slamOn ? 0.006 * Math.exp(-as * 5) : 0
      ca.current.offset.set(k, k * 0.6)
    }
  })

  return (
    <>
      <primitive object={rig.root} />
      <EffectComposer multisampling={0}>
        <Bloom ref={bloom} mipmapBlur luminanceThreshold={0.95} luminanceSmoothing={0.25} intensity={0.9} radius={0.72} />
        <ChromaticAberration ref={ca} offset={caOffset} radialModulation={false} modulationOffset={0} />
        <Vignette offset={0.28} darkness={0.55} />
      </EffectComposer>
    </>
  )
}

/* ───────────── 演出の DOM 部分 ───────────── */

const CSS = `
.bru-root{container-type:size}
@keyframes bru-shake{0%{transform:translate(0,0)}8%{transform:translate(-10px,7px)}18%{transform:translate(9px,-8px)}30%{transform:translate(-7px,-4px)}44%{transform:translate(5px,5px)}60%{transform:translate(-3px,2px)}78%{transform:translate(2px,-1px)}100%{transform:none}}
.bru-shake{animation:bru-shake .45s linear 1}
@keyframes bru-impact-a{0%{opacity:1}50%{opacity:0}100%{opacity:0}}
@keyframes bru-impact-b{0%{opacity:0}50%{opacity:1}100%{opacity:0}}
.bru-impact-a{animation:bru-impact-a .15s step-end forwards}
.bru-impact-b{opacity:0;animation:bru-impact-b .15s step-end forwards}
@keyframes bru-shimmer{from{background-position:180% 0}to{background-position:-80% 0}}
.bru-gold-shimmer{background-image:linear-gradient(100deg,transparent 35%,rgba(255,240,190,.75) 50%,transparent 65%);background-size:250% 100%;animation:bru-shimmer 2.6s linear infinite}
@keyframes bru-float{0%,100%{transform:translateY(0) rotate(5deg)}50%{transform:translateY(-7px) rotate(3.5deg)}}
.bru-float{animation:bru-float 4.2s ease-in-out infinite}
@keyframes bru-sheen{0%,62%{background-position:160% 0}100%{background-position:-60% 0}}
.bru-sheen{background-image:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.5) 49%,rgba(255,190,200,.35) 52%,transparent 60%);background-size:260% 100%;animation:bru-sheen 3.6s ease-in infinite}
@keyframes bru-wipe{0%{transform:translateX(-110%)}30%{transform:translateX(0)}58%{transform:translateX(0)}100%{transform:translateX(115%)}}
.bru-wipe{transform:translateX(-110%);animation:bru-wipe .82s cubic-bezier(.3,.7,.4,1) both}
@keyframes bru-blink{50%{opacity:0}}
.bru-blink{animation:bru-blink .8s steps(1) infinite}
@keyframes bru-drift{to{background-position:72px 0}}
.bru-drift{animation:bru-drift 6s linear infinite}
@keyframes bru-rays{to{transform:rotate(360deg)}}
.bru-rays{animation:bru-rays 40s linear infinite}
@media (prefers-reduced-motion: reduce) { :root:not([data-motion=full]) .bru-float,:root:not([data-motion=full]) .bru-sheen,:root:not([data-motion=full]) .bru-gold-shimmer,:root:not([data-motion=full]) .bru-drift,:root:not([data-motion=full]) .bru-rays { animation:none } } :root[data-motion=reduce] .bru-float,:root[data-motion=reduce] .bru-sheen,:root[data-motion=reduce] .bru-gold-shimmer,:root[data-motion=reduce] .bru-drift,:root[data-motion=reduce] .bru-rays { animation:none }
.bru-card{position:absolute;height:min(40cqh,75cqw);aspect-ratio:2/3;left:calc(33cqw - min(40cqh,75cqw)/3);top:calc(30cqh - min(40cqh,75cqw)/2)}
.bru-center{position:absolute;left:33cqw;top:30cqh}
.bru-cine{--ru:min(7.6cqw,6cqh);--num:min(15cqw,9.5cqh)}
.bru-rankup{position:absolute;left:34cqw;top:12cqh;width:56cqw}
.bru-num{position:absolute;left:55cqw;top:calc(12cqh + var(--ru) * 2.3 + 1.6rem)}
.bru-banner{position:absolute;left:0;right:0;top:54cqh}
.bru-dialog{position:absolute;left:3.5cqw;right:3.5cqw;top:66cqh}
.bru-tag{position:absolute;left:3cqw;top:1.6cqh}
@container (aspect-ratio >= 11/10){
.bru-card{height:min(74cqh,54cqw);left:calc(27cqw - min(74cqh,54cqw)/3);top:calc(48cqh - min(74cqh,54cqw)/2)}
.bru-center{left:27cqw;top:48cqh}
.bru-cine{--ru:min(6cqw,11cqh);--num:min(9cqw,15cqh)}
.bru-rankup{left:46cqw;top:8cqh;width:50cqw}
.bru-num{left:48cqw;top:30cqh}
.bru-banner{left:42cqw;right:0;top:52cqh}
.bru-dialog{left:45cqw;right:2.5cqw;top:auto;bottom:calc(var(--solo-footer-clearance,0px) + 3cqh)}
.bru-tag{left:2.5cqw;top:3cqh}
}
@container (min-width:64rem) and (min-height:620px){.bru-list{zoom:1.32}}
@container (min-width:100rem) and (min-height:900px){.bru-list{zoom:1.62}}
.bru-hint{display:none}
@container (min-width:56rem) and (min-height:560px){.bru-hint{display:inline}}
`

const JAG = 'polygon(0 14%, 7% 0, 38% 9%, 62% 0, 100% 12%, 96% 54%, 100% 90%, 70% 100%, 36% 91%, 4% 100%, 2% 56%)'
const BURST_PTS = (() => {
  const r = mulberry32(99)
  return Array.from({ length: 44 }, (_, i) => {
    const a = (i / 44) * Math.PI * 2
    const rad = i % 2 ? 9 + r() * 6 : 30 + r() * 20
    return `${(50 + Math.cos(a) * rad).toFixed(1)},${(50 + Math.sin(a) * rad).toFixed(1)}`
  }).join(' ')
})()

/** 台詞を1文字ずつ出す(React の再描画なしで textContent を書き換える) */
function Typewriter({ text, instant, onDone }: { text: string; instant: boolean; onDone: () => void }) {
  const ref = useRef<HTMLSpanElement>(null)
  const done = useRef(onDone)
  done.current = onDone
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const chars = [...text]
    if (instant) {
      el.textContent = text
      done.current()
      return
    }
    let i = 0
    el.textContent = ''
    const id = window.setInterval(() => {
      i++
      el.textContent = chars.slice(0, i).join('')
      if (i >= chars.length) {
        window.clearInterval(id)
        done.current()
      }
    }, 46)
    return () => window.clearInterval(id)
  }, [text, instant])
  return <span ref={ref} aria-hidden />
}

type CineInfo = { key: number; index: number; from: number; to: number }

function Cinematic({ info, reduced, onClose }: { info: CineInfo; reduced: boolean; onClose: () => void }) {
  const bond = BONDS[info.index]
  const gold = info.to >= MAX_RANK
  const acc = gold ? GOLD : RED
  const [use3D] = useState(() => !reduced && hasWebGL())
  const [glFailed, setGlFailed] = useState(false)
  const show3D = use3D && !glFailed
  const tl = useRef<Timeline>({ start: NaN, skipped: false })
  const opened = useRef(0)
  const phaseRef = useRef<number>(PH.idle)
  const [phase, setPhaseState] = useState<number>(PH.idle)
  const [skipped, setSkipped] = useState(false)
  const [ready, setReady] = useState(false)
  const [mount3D, setMount3D] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const k = reduced ? 0.3 : 1
  const bump = useCallback((p: number) => {
    if (p > phaseRef.current) {
      phaseRef.current = p
      setPhaseState(p)
    }
  }, [])
  const [ability, abilityDesc] = abilityFor(bond, info.to)
  const line = lineFor(bond, info.to)
  const shown = phase >= PH.slam ? info.to : info.from
  const fade = { duration: 0.2 }

  useEffect(() => {
    opened.current = performance.now()
    rootRef.current?.focus({ preventScroll: true })
    // 帯で画面が覆われてから Canvas を作る(初期化の一瞬の重さを隠す)
    const id = window.setTimeout(() => setMount3D(true), 240)
    return () => window.clearTimeout(id)
  }, [])

  // 段階の切り替え(区切りをまたいだときだけ state を更新)
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const now = performance.now()
      const tlv = tl.current
      if (Number.isNaN(tlv.start) && opened.current) {
        const waited = now - opened.current
        if ((!show3D && waited > (reduced ? 120 : 420)) || waited > 5000) tlv.start = now
      }
      if (!Number.isNaN(tlv.start)) bump(phaseAt((now - tlv.start) / 1000 / k))
      if (phaseRef.current < PH.dialog) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [show3D, reduced, k, bump])

  const onReady = useCallback(() => {
    if (Number.isNaN(tl.current.start)) tl.current.start = Math.max(performance.now(), (opened.current || performance.now()) + 420)
    setReady(true)
  }, [])

  const advance = () => {
    if (phaseRef.current >= PH.done) {
      onClose()
      return
    }
    tl.current.start = performance.now() - (T.dialog + 0.02) * 1000 * k
    tl.current.skipped = true
    setSkipped(true)
    bump(PH.done)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') onClose()
    else if (e.key === 'Enter' || e.key === ' ') advance()
    else return
    e.preventDefault()
    e.stopPropagation()
  }

  const enter = (from: TargetAndTransition, to: TargetAndTransition, spring: Transition = { type: 'spring', stiffness: 520, damping: 24 }) =>
    reduced
      ? { initial: { opacity: 0 } as TargetAndTransition, animate: { opacity: 1 } as TargetAndTransition, transition: fade as Transition }
      : { initial: skipped ? (false as const) : from, animate: to, transition: spring }

  return (
    <motion.div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${bond.name}との絆 ランクアップ演出`}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      onClick={advance}
      className="bru-cine absolute inset-0 z-50 cursor-pointer overflow-hidden bg-transparent outline-none"
      initial={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)' }}
      animate={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)' }}
      exit={reduced ? { opacity: 0, transition: fade } : { clipPath: 'polygon(100% 0%, 100% 0%, 120% 100%, 100% 100%)', transition: { duration: 0.32, ease: [0.6, 0, 0.9, 0.4] } }}
    >
      {/* 暗転: 周辺から網点が育って黒に沈む */}
      <motion.div
        className="absolute inset-0"
        style={{ background: `radial-gradient(ellipse at 30% 50%, transparent 25%, ${BLACK} 75%)` }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
      />
      <motion.div
        className="absolute inset-0"
        style={{
          background: BLACK,
          WebkitMaskImage: 'radial-gradient(circle, #000 var(--d), transparent calc(var(--d) + 0.6px))',
          maskImage: 'radial-gradient(circle, #000 var(--d), transparent calc(var(--d) + 0.6px))',
          WebkitMaskSize: '14px 14px',
          maskSize: '14px 14px',
        }}
        initial={{ '--d': '0px' } as never}
        animate={{ '--d': '11px' } as never}
        transition={{ duration: reduced ? 0.15 : 0.38, ease: 'easeIn' }}
      />

      {/* カード */}
      {show3D ? (
        <div className="absolute inset-0 transition-opacity duration-300" style={{ opacity: ready ? 1 : 0 }}>
          {mount3D && (
            <GLBoundary onError={() => setGlFailed(true)}>
              <Canvas
                dpr={[1, 1.5]}
                flat
                gl={{ antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false }}
                camera={{ fov: FOV, position: [0, 0, CAM_Z], near: 0.1, far: 60 }}
                onCreated={({ gl }) => gl.setClearColor(BLACK)}
              >
                <RigView bond={bond} no={info.index} from={info.from} to={info.to} tl={tl} onReady={onReady} />
              </Canvas>
            </GLBoundary>
          )}
        </div>
      ) : (
        phase >= PH.fly && (
          <>
            <motion.div
              className="absolute inset-0 overflow-hidden"
              style={{ background: `radial-gradient(ellipse at 30% 48%, ${gold ? '#5a3c08' : '#4a0a0e'} 0%, ${BLACK} 62%)` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div
                className="bru-rays bru-center absolute size-[220cqmax] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40"
                style={{
                  background: `repeating-conic-gradient(${acc}55 0 6deg, transparent 6deg 14deg)`,
                  maskImage: 'radial-gradient(circle, #000 0, transparent 30%)',
                  WebkitMaskImage: 'radial-gradient(circle, #000 0, transparent 30%)',
                }}
              />
            </motion.div>
            <div className="bru-card z-10 [perspective:900px]">
              <motion.div
                className="size-full"
                initial={skipped ? false : reduced ? { opacity: 0 } : { x: '240%', y: '120%', rotateY: -900, rotateZ: -60, scale: 0.3, opacity: 0 }}
                animate={{ x: 0, y: 0, rotateY: 0, rotateZ: -4, scale: phase === PH.slam && !reduced ? [1.14, 0.97, 1] : 1, opacity: 1 }}
                transition={reduced ? fade : { duration: T.fly, ease: [0.12, 0.9, 0.3, 1.06], scale: { duration: 0.35 } }}
              >
                <SigilCardSVG
                  bond={bond}
                  no={info.index}
                  rank={shown}
                  gold={gold}
                  draw={!reduced && !skipped}
                  delay={T.drawStart}
                  className="size-full drop-shadow-[0_0_18px_rgba(227,20,30,.6)]"
                />
              </motion.div>
            </div>
          </>
        )
      )}

      {/* 開幕の斜め帯 */}
      {/* CSS アニメーション(コンポジタ側)なので、裏で WebGL を初期化しても止まらない */}
      {!reduced && !skipped && (
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden>
          {[
            { c: RED, top: '-14%', h: '60%', d: 0 },
            { c: BLACK, top: '30%', h: '56%', d: 0.05 },
            { c: WHITE, top: '64%', h: '8%', d: 0.09 },
          ].map((b, i) => (
            <div key={i} className="absolute -left-[30%] w-[160%] -rotate-[14deg]" style={{ top: b.top, height: b.h }}>
              <div className="bru-wipe size-full" style={{ background: b.c, clipPath: 'polygon(2% 0, 100% 6%, 98% 100%, 0 92%)', animationDelay: `${b.d}s` }} />
            </div>
          ))}
        </div>
      )}

      {/* 文字類 */}
      <div className={`pointer-events-none absolute inset-0 z-30 ${phase >= PH.slam && !skipped && !reduced ? 'bru-shake' : ''}`}>
        {phase >= PH.fly && (
          <motion.div className="bru-tag flex max-w-[94cqw] flex-wrap items-center gap-1.5" {...enter({ x: -60, opacity: 0, skewX: -20 }, { x: 0, opacity: 1, skewX: 0 })}>
            <span className="-skew-x-12 px-2 py-0.5 font-['Orbitron'] text-[10px] font-black tracking-[.2em]" style={{ background: acc, color: gold ? BLACK : WHITE }}>
              BOND
            </span>
            <span className="-skew-x-12 bg-[#f6f1e7] px-2 py-0.5 text-[11px] font-black text-[#0c0b0d] @min-[40rem]:text-xs">{bond.sigil}</span>
            <span className="text-[10px] font-bold text-[#f6f1e7]/80 @min-[40rem]:text-[11px]">
              {bond.name} / {bond.relation}
            </span>
          </motion.div>
        )}

        {phase >= PH.charge && (
          <motion.div
            className="bru-num flex items-stretch gap-[0.08em]"
            style={{ fontSize: 'var(--num)' }}
            {...enter({ x: 80, opacity: 0, skewX: -30 }, { x: 0, opacity: 1, skewX: 0 }, { type: 'spring', stiffness: 600, damping: 26 })}
          >
            <span className="flex -skew-x-6 items-center bg-[#0c0b0d] px-[0.06em] font-['Orbitron'] text-[0.17em] font-black tracking-[.25em] text-[#f6f1e7] ring-2 ring-[#f6f1e7] [writing-mode:vertical-rl]">
              RANK
            </span>
            <span
              className={`relative grid h-[1.12em] place-items-center transition-[min-width] duration-100 [perspective:500px] ${shown >= MAX_RANK ? 'min-w-[1.85em]' : 'min-w-[1.25em]'}`}
            >
              <span className="absolute inset-0 -skew-x-6" style={{ background: shown >= MAX_RANK ? GOLD : WHITE, clipPath: JAG, boxShadow: 'none' }} />
              <span className="absolute inset-0 translate-x-[0.07em] translate-y-[0.06em] -skew-x-6" style={{ background: acc, clipPath: JAG, zIndex: -1 }} />
              <AnimatePresence initial={false}>
                <motion.span
                  key={shown}
                  className="absolute inset-0 grid place-items-center font-['Orbitron'] leading-none font-black"
                  style={{ color: shown > info.from ? (gold ? BLACK : RED) : BLACK, fontSize: shown >= MAX_RANK ? '0.52em' : '0.86em' }}
                  initial={reduced ? { opacity: 0 } : { rotateX: 110, scale: 2.6, opacity: 0 }}
                  animate={{ rotateX: 0, scale: 1, opacity: 1 }}
                  exit={reduced ? { opacity: 0 } : { rotateX: -100, opacity: 0, transition: { duration: 0.09 } }}
                  transition={reduced ? fade : { type: 'spring', stiffness: 720, damping: 17 }}
                >
                  {shown >= MAX_RANK ? 'MAX' : shown}
                </motion.span>
              </AnimatePresence>
            </span>
            {phase >= PH.slam && (
              <motion.span
                className="flex flex-col justify-center gap-[0.05em] self-center"
                {...enter({ scale: 0, rotate: -40 }, { scale: 1, rotate: -8 }, { type: 'spring', stiffness: 700, damping: 14, delay: 0.05 })}
              >
                <span className="-skew-x-12 px-[0.12em] font-['Orbitron'] text-[0.24em] font-black text-[#0c0b0d]" style={{ background: acc }}>
                  ▲+1
                </span>
                <span className="font-['Orbitron'] text-[0.15em] font-bold text-[#f6f1e7]/80">
                  {info.from} → {gold ? 'MAX' : info.to}
                </span>
              </motion.span>
            )}
          </motion.div>
        )}

        {phase >= PH.rankup && (
          <div className="bru-rankup">
            <div className="origin-left -rotate-[5deg]">
              <Ransom text={gold ? 'RANK MAX!' : 'RANK UP!'} size="var(--ru)" slam gold={gold} reduced={reduced} animateIn={!skipped} shadow={gold ? RED : BLACK} />
            </div>
            <motion.span
              className="mt-[0.6cqh] ml-[4%] inline-block -rotate-[6deg] -skew-x-12 bg-[#0c0b0d] px-2 py-0.5 text-[clamp(10px,1.1cqw+0.9cqh,20px)] font-black text-[#f6f1e7] ring-2"
              style={{ '--tw-ring-color': acc } as CSSProperties}
              {...enter({ x: -40, opacity: 0 }, { x: 0, opacity: 1 }, { type: 'spring', stiffness: 500, damping: 26, delay: 0.32 })}
            >
              {gold ? '絆がきわまった — 最高ランク到達' : `${bond.name}との絆が深まった`}
            </motion.span>
          </div>
        )}

        {phase >= PH.ability && (
          <motion.div className="bru-banner" {...enter({ x: '105%', skewX: -28 }, { x: '0%', skewX: 0 }, { type: 'spring', stiffness: 420, damping: 30 })}>
            <div className="absolute inset-x-0 -bottom-[0.45em] h-[0.5em] bg-[#f6f1e7]" style={{ clipPath: 'polygon(3% 0, 100% 0, 100% 100%, 0 100%)' }} />
            <div className="relative overflow-hidden px-[4cqw] py-[1.1cqh] pl-[6cqw]" style={{ background: acc, clipPath: 'polygon(3.5% 0, 100% 0, 100% 100%, 0 100%)' }}>
              <div
                className="bru-drift absolute inset-0 opacity-30"
                style={{ backgroundImage: 'radial-gradient(circle, #0c0b0d 0 1.5px, transparent 2px)', backgroundSize: '8px 8px' }}
              />
              <div className="relative flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <span className="-skew-x-12 bg-[#0c0b0d] px-2 py-0.5 text-[clamp(10px,0.8cqw+0.9cqh,16px)] font-black tracking-wider text-[#f6f1e7]">
                  {gold ? '絆 MAX ✦ 真なる力' : '新たな力'}
                </span>
                <span
                  className={`-skew-x-6 text-[clamp(18px,1.7cqw+2.4cqh,46px)] leading-tight font-black ${gold ? 'text-[#0c0b0d]' : 'text-[#f6f1e7]'}`}
                  style={{ textShadow: gold ? `2px 2px 0 ${WHITE}` : `3px 3px 0 ${BLACK}` }}
                >
                  {ability}
                </span>
              </div>
              <p className={`relative mt-0.5 text-[clamp(11px,0.7cqw+1.1cqh,19px)] font-bold ${gold ? 'text-[#0c0b0d]' : 'text-[#f6f1e7]'}`}>{abilityDesc}</p>
            </div>
          </motion.div>
        )}

        {phase >= PH.dialog && (
          <motion.div className="bru-dialog" {...enter({ y: 40, opacity: 0, rotate: -5 }, { y: 0, opacity: 1, rotate: -1.2 }, { type: 'spring', stiffness: 460, damping: 26 })}>
            <div
              className="relative bg-[#0c0b0d]/95 px-[1.1em] pt-[0.95em] pb-[0.6em] text-[clamp(12px,1.05cqw+1.45cqh,26px)] ring-2 ring-[#f6f1e7]"
              style={{ boxShadow: `0.35em 0.35em 0 ${acc}` }}
            >
              <span
                className="absolute -top-[0.8em] left-[0.6em] -skew-x-12 px-[0.6em] py-[0.1em] text-[0.8em] font-black"
                style={{ background: acc, color: gold ? BLACK : WHITE }}
              >
                {bond.name}
              </span>
              {/* 全文を透明で置いて高さを確保し、その上に1文字ずつ重ねる */}
              <p className="relative leading-[1.45] font-bold text-[#f6f1e7]">
                <span className="invisible" aria-hidden>
                  「{line}」<span className="ml-1 text-[0.8em]">▼</span>
                </span>
                <span className="absolute inset-0">
                  「
                  <Typewriter text={line} instant={skipped || reduced} onDone={() => bump(PH.done)} />
                  {phase >= PH.done && (
                    <>
                      」
                      <span className="bru-blink ml-1 text-[0.8em]" style={{ color: acc }}>
                        ▼
                      </span>
                    </>
                  )}
                </span>
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* 衝撃コマ(白黒反転の一瞬) */}
      {phase >= PH.slam && !skipped && !reduced && (
        <div className="pointer-events-none absolute inset-0 z-40" aria-hidden>
          <div className="bru-impact-a absolute inset-0 bg-[#0c0b0d]">
            <svg viewBox="0 0 100 100" className="bru-center absolute size-[170cqmax] -translate-x-1/2 -translate-y-1/2">
              <polygon points={BURST_PTS} fill={WHITE} />
            </svg>
          </div>
          <div className="bru-impact-b absolute inset-0 bg-[#f6f1e7]">
            <svg viewBox="0 0 100 100" className="bru-center absolute size-[170cqmax] -translate-x-1/2 -translate-y-1/2 rotate-12">
              <polygon points={BURST_PTS} fill={BLACK} />
              <circle cx="50" cy="50" r="6" fill={acc} />
            </svg>
          </div>
        </div>
      )}

      {/* 操作 */}
      <span className="pointer-events-none absolute bottom-[calc(var(--solo-footer-clearance,0px)_+_0.6rem)] bru-hint left-3 z-50 bg-[#0c0b0d]/85 px-1.5 py-0.5 font-['JetBrains_Mono'] text-[10px] text-[#f6f1e7]/80">
        {phase >= PH.done ? 'クリック / Enter:もどる' : 'クリック / Enter:スキップ'} ・ Esc:閉じる
      </span>
      <div className="absolute top-[1.2cqh] right-[1.5cqw] z-50 flex items-center gap-2">
        <button
          type="button"
          aria-label="演出を閉じる"
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="grid size-8 -skew-x-12 place-items-center bg-[#f6f1e7] text-lg leading-none font-black text-[#0c0b0d] shadow-[3px_3px_0_#e3141e] outline-none hover:bg-[#e3141e] hover:text-[#f6f1e7] focus-visible:ring-2 focus-visible:ring-[#f6f1e7] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0b0d]"
        >
          <span className="skew-x-12">×</span>
        </button>
      </div>

      <p className="sr-only" aria-live="polite">
        {phase >= PH.slam ? `${bond.name}との絆がランク${gold ? 'MAX' : info.to}に上がった。新たな力「${ability}」:${abilityDesc}。${bond.name}「${line}」` : ''}
      </p>
    </motion.div>
  )
}

/* ───────────── 絆リスト ───────────── */

const ROW_CLIP = 'polygon(1.2% 0, 100% 7%, 98.6% 100%, 0 88%)'

function Pips({ rank, selected, flashKey }: { rank: number; selected: boolean; flashKey?: number }) {
  const max = rank >= MAX_RANK
  return (
    <span className="flex shrink-0 items-center gap-[2px]" aria-hidden>
      {Array.from({ length: MAX_RANK }, (_, k) => {
        const on = k < rank
        const isNew = flashKey !== undefined && k === rank - 1
        return (
          <motion.span
            key={isNew ? `n${flashKey}` : k}
            className="block h-[11px] w-[6px] -skew-x-[22deg] @min-[30rem]:h-3 @min-[30rem]:w-[7px]"
            style={{ backgroundColor: on ? (max ? GOLD : selected ? RED : WHITE) : selected ? 'rgba(12,11,13,.14)' : 'rgba(246,241,231,.16)' }}
            initial={isNew ? { scale: 3, backgroundColor: WHITE, boxShadow: `0 0 14px ${WHITE}` } : false}
            animate={isNew ? { scale: 1, boxShadow: '0 0 0px rgba(0,0,0,0)', backgroundColor: max ? GOLD : selected ? RED : WHITE } : undefined}
            transition={{ type: 'spring', stiffness: 500, damping: 14, delay: 0.25 }}
          />
        )
      })}
    </span>
  )
}

function BondRow({
  bond,
  index,
  rank,
  selected,
  flashKey,
  layoutKey,
  reduced,
  btnRef,
  onSelect,
  onConfirm,
}: {
  bond: Bond
  index: number
  rank: number
  selected: boolean
  flashKey?: number
  layoutKey: string
  reduced: boolean
  btnRef: (el: HTMLButtonElement | null) => void
  onSelect: () => void
  onConfirm: () => void
}) {
  const max = rank >= MAX_RANK
  return (
    <motion.button
      ref={btnRef}
      type="button"
      role="option"
      aria-selected={selected}
      aria-label={`${bond.name}(${bond.relation}・${bond.sigil})ランク${max ? 'MAX' : rank}`}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          onSelect()
          onConfirm()
        }
      }}
      className="group relative block min-h-0 w-full flex-1 text-left outline-none"
      style={{ maxHeight: '4.4rem', marginLeft: `${index * 1.6}%`, width: `${100 - index * 1.6 - 3}%` }}
      initial={reduced ? { opacity: 0 } : { opacity: 0, x: -80, skewX: 20 }}
      animate={{ opacity: 1, x: 0, skewX: 0 }}
      transition={reduced ? { duration: 0.2 } : { type: 'spring', stiffness: 420, damping: 28, delay: 0.1 + index * 0.05 }}
    >
      {selected && (
        <motion.span
          layoutId={layoutKey}
          className="absolute -inset-y-[3px] right-[-10px] left-[6px]"
          style={{ background: max ? GOLD : RED, clipPath: JAG }}
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 30 }}
        />
      )}
      <span
        className="absolute inset-0 translate-x-[-1.5px] translate-y-[-1.5px]"
        style={{ clipPath: ROW_CLIP, background: max ? GOLD : 'rgba(246,241,231,.4)', transform: 'scale(1.012, 1.08)' }}
      />
      <motion.span
        className="relative flex h-full items-center gap-2 overflow-hidden py-1 pr-2.5 pl-1.5 @min-[30rem]:gap-2.5 @min-[30rem]:pr-3.5"
        style={{ clipPath: ROW_CLIP, background: selected ? WHITE : BLACK, color: selected ? BLACK : WHITE }}
        animate={{ x: selected ? 16 : 0, scale: selected ? 1.025 : 1 }}
        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 600, damping: 24 }}
      >
        {max && <span className="bru-gold-shimmer pointer-events-none absolute inset-0 opacity-60" />}
        <span className="relative grid aspect-square h-[78%] max-h-12 shrink-0 -skew-x-6 place-items-center p-[3px]" style={{ background: selected ? BLACK : max ? GOLD : RED }}>
          <SigilGlyph bond={bond} color={selected ? (max ? GOLD : WHITE) : max ? BLACK : WHITE} className="size-full" />
        </span>
        <span className="relative min-w-0 flex-1 leading-tight">
          <span className="flex items-baseline gap-1.5">
            <span className={`truncate text-[14px] font-black @min-[30rem]:text-[15px] ${max && !selected ? 'text-[#f2c14e]' : ''}`}>{bond.name}</span>
            {flashKey !== undefined && (
              <motion.span
                key={flashKey}
                className="shrink-0 -rotate-6 px-1 font-['Orbitron'] text-[9px] font-black"
                style={{ background: max ? GOLD : RED, color: max ? BLACK : WHITE }}
                initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 2.4, rotate: -30 }}
                animate={{ opacity: [0, 1, 1, 0], scale: 1, rotate: -6 }}
                transition={{ opacity: { duration: 2.6, times: [0, 0.06, 0.8, 1] }, default: { type: 'spring', stiffness: 600, damping: 16 } }}
              >
                RANK UP
              </motion.span>
            )}
          </span>
          <span className="block truncate text-[10px] font-bold opacity-75 @min-[30rem]:text-[11px]">
            {bond.relation}
            <span className={selected ? 'text-[#e3141e]' : 'text-[#e3141e]'}> ✦ </span>
            {bond.sigil}
          </span>
        </span>
        <span className="relative hidden @min-[22rem]:block">
          <Pips rank={rank} selected={selected} flashKey={flashKey} />
        </span>
        <span
          className={`relative w-[2.3em] shrink-0 text-right font-['Orbitron'] font-black tabular-nums ${max ? 'text-[13px]' : 'text-[20px] @min-[30rem]:text-[22px]'}`}
          style={{ color: max ? (selected ? '#b8860b' : GOLD) : undefined }}
        >
          {max ? 'MAX' : rank}
        </span>
      </motion.span>
      <span className="pointer-events-none absolute -inset-1 hidden border-2 border-dashed border-[#f6f1e7] group-focus-visible:block" />
    </motion.button>
  )
}

function RankUpButton({ disabled, gold, onClick, className = '' }: { disabled: boolean; gold: boolean; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group relative shrink-0 -skew-x-12 px-4 py-2 text-[14px] font-black tracking-wider outline-none transition-[transform,background-color,color] duration-150 focus-visible:ring-2 focus-visible:ring-[#f6f1e7] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0b0d] @min-[44rem]:px-6 @min-[44rem]:py-2.5 @min-[44rem]:text-[17px] ${
        disabled
          ? 'cursor-default bg-[#0c0b0d] text-[#f2c14e] ring-2 ring-[#f2c14e]'
          : `bg-[#0c0b0d] text-[#f6f1e7] shadow-[4px_4px_0_#f6f1e7] ring-2 ring-[#f6f1e7] hover:-translate-y-0.5 hover:bg-[#f6f1e7] hover:text-[#0c0b0d] hover:shadow-[5px_5px_0_#0c0b0d] active:translate-y-0.5`
      } ${className}`}
    >
      <span className="inline-block skew-x-12">{disabled ? '絆 MAX ✦' : gold ? 'ランクアップ ✦ MAX へ' : 'ランクアップ ▶'}</span>
    </button>
  )
}

/* ───────────── 本体 ───────────── */

export function BondRankUp() {
  const reduced = !!useReducedMotion()
  const layoutKey = `bru-hl-${useId()}`
  const [ranks, setRanks] = useState(() => BONDS.map((b) => b.rank))
  const [sel, setSel] = useState(0)
  const [cine, setCine] = useState<CineInfo | null>(null)
  const [flash, setFlash] = useState<{ index: number; key: number } | null>(null)
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([])
  const refocus = useRef(false)
  const bond = BONDS[sel]
  const rank = ranks[sel]
  const isMax = rank >= MAX_RANK
  const [nextAbility, nextDesc] = abilityFor(bond, Math.min(MAX_RANK, rank + 1))

  const start = (i = sel) => {
    if (cine || ranks[i] >= MAX_RANK) return
    setSel(i)
    setCine({ key: Date.now(), index: i, from: ranks[i], to: ranks[i] + 1 })
  }
  const close = () => {
    if (!cine) return
    const c = cine
    setRanks((r) => r.map((v, k) => (k === c.index ? Math.max(v, c.to) : v)))
    setFlash({ index: c.index, key: c.key })
    setCine(null)
    refocus.current = true
  }
  const move = (d: number) => {
    const n = (sel + d + BONDS.length) % BONDS.length
    setSel(n)
    rowRefs.current[n]?.focus()
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (cine) return
    if (e.key === 'ArrowDown') move(1)
    else if (e.key === 'ArrowUp') move(-1)
    else return
    e.preventDefault()
  }

  return (
    <div
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label="絆リスト。上下キーで仲間を選び、Enterでランクアップ"
      className="bru-root relative h-full w-full overflow-hidden bg-[#0c0b0d] font-['Noto_Sans_JP',sans-serif] text-[#f6f1e7] outline-none select-none focus-visible:ring-2 focus-visible:ring-[#e3141e] focus-visible:ring-inset"
    >
      <style>{CSS}</style>

      {/* 背景 */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(227,20,30,.28) 0 1.3px, transparent 1.8px)',
            backgroundSize: '10px 10px',
            maskImage: 'linear-gradient(110deg, #000 0%, transparent 55%)',
            WebkitMaskImage: 'linear-gradient(110deg, #000 0%, transparent 55%)',
          }}
        />
        <div
          className="absolute inset-y-0 right-0 w-[46%] @max-[44rem]:top-0 @max-[44rem]:bottom-auto @max-[44rem]:h-[5.2rem] @max-[44rem]:w-[60%]"
          style={{ background: isMax ? GOLD : RED, clipPath: 'polygon(16% 0, 100% 0, 100% 100%, 0 100%)', transition: 'background-color .3s' }}
        >
          <div
            className="bru-drift absolute inset-0 opacity-25"
            style={{ backgroundImage: 'radial-gradient(circle, #0c0b0d 0 1.6px, transparent 2.1px)', backgroundSize: '9px 9px' }}
          />
          <span className="absolute right-[3%] bottom-[5%] hidden -rotate-12 text-[13rem] leading-none font-black text-[#0c0b0d]/15 @min-[44rem]:block">絆</span>
        </div>
      </div>

      <div
        inert={!!cine}
        className="bru-list relative flex h-full flex-col gap-2 px-3 pt-3 pb-[calc(var(--solo-footer-clearance,0px)_+_0.75rem)] @min-[44rem]:grid @min-[44rem]:grid-cols-[minmax(0,1.22fr)_minmax(0,1fr)] @min-[44rem]:gap-x-8 @min-[44rem]:px-5 @min-[44rem]:pt-4"
      >
        {/* 左: 見出しとリスト */}
        <div className="flex min-h-0 flex-1 flex-col gap-2 @min-[44rem]:gap-3">
          <header className="flex shrink-0 items-end justify-between gap-2 pr-1">
            <div className="flex items-end gap-2">
              <span className="-rotate-[7deg]">
                <Ransom text="BONDS" size="clamp(26px, 4.2cqw, 40px)" reduced={reduced} />
              </span>
              <span className="mb-1 -rotate-3 -skew-x-12 bg-[#f6f1e7] px-1.5 py-0.5 text-[11px] font-black text-[#0c0b0d] shadow-[2px_2px_0_#e3141e]">絆の星図</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setRanks(BONDS.map((b) => b.rank))
                setFlash(null)
              }}
              className="mb-1 -skew-x-12 bg-[#0c0b0d] px-2 py-0.5 text-[10px] font-bold text-[#f6f1e7]/80 ring-1 ring-[#f6f1e7]/40 outline-none hover:text-[#f6f1e7] hover:ring-[#f6f1e7] focus-visible:ring-2 focus-visible:ring-[#f6f1e7]"
            >
              <span className="inline-block skew-x-12">リセット</span>
            </button>
          </header>
          <div role="listbox" aria-label="仲間との絆" className="flex min-h-0 flex-1 -rotate-[1.6deg] flex-col justify-center gap-[clamp(4px,1.2cqh,9px)] py-1">
            {BONDS.map((b, i) => (
              <BondRow
                key={b.id}
                bond={b}
                index={i}
                rank={ranks[i]}
                selected={sel === i}
                flashKey={flash?.index === i ? flash.key : undefined}
                layoutKey={layoutKey}
                reduced={reduced}
                btnRef={(el) => {
                  rowRefs.current[i] = el
                }}
                onSelect={() => setSel(i)}
                onConfirm={() => start(i)}
              />
            ))}
          </div>
        </div>

        {/* 右: 詳細(広いとき) */}
        <section aria-label="選択中の絆" className="relative hidden min-h-0 flex-col justify-center gap-3 @min-[44rem]:flex">
          <div className="flex items-center gap-4">
            <div className="relative w-[clamp(7.5rem,14cqw,12rem)] shrink-0 [perspective:900px]">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={bond.id}
                  initial={reduced ? { opacity: 0 } : { rotateY: -110, x: 50, opacity: 0, scale: 0.85 }}
                  animate={{ rotateY: 0, x: 0, opacity: 1, scale: 1 }}
                  exit={reduced ? { opacity: 0 } : { rotateY: 90, x: -40, opacity: 0, transition: { duration: 0.12 } }}
                  transition={reduced ? { duration: 0.15 } : { type: 'spring', stiffness: 420, damping: 22 }}
                >
                  <div className="bru-float relative drop-shadow-[6px_8px_0_rgba(12,11,13,.85)]">
                    <SigilCardSVG bond={bond} no={sel} rank={rank} gold={isMax} className="block w-full" />
                    <div
                      className="bru-sheen pointer-events-none absolute inset-0"
                      style={{ clipPath: 'polygon(14% 0, 97% 0, 100% 2%, 100% 90.7%, 86% 100%, 3% 100%, 0 98%, 0 9.3%)' }}
                    />
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={bond.id}
                className="min-w-0 flex-1"
                initial={reduced ? { opacity: 0 } : { x: 40, opacity: 0, skewX: -12 }}
                animate={{ x: 0, opacity: 1, skewX: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.08 } }}
                transition={reduced ? { duration: 0.15 } : { type: 'spring', stiffness: 520, damping: 30 }}
              >
                <span className="inline-block -skew-x-12 bg-[#0c0b0d] px-1.5 py-0.5 text-[11px] font-bold text-[#f6f1e7]">{bond.relation}</span>
                <h3 className="mt-1 -skew-x-6 text-[clamp(24px,3.2cqw,44px)] leading-none font-black text-[#f6f1e7] [text-shadow:3px_3px_0_#0c0b0d]">{bond.name}</h3>
                <p className="mt-1 text-[12px] font-black text-[#0c0b0d]">✦ {bond.sigil}</p>
                <div className="mt-2 flex items-end gap-2">
                  <span className="mb-1 font-['Orbitron'] text-[10px] font-bold tracking-[.25em] text-[#0c0b0d]">RANK</span>
                  <span className="font-['Orbitron'] text-[clamp(30px,4.4cqw,58px)] leading-none font-black text-[#f6f1e7] [text-shadow:3px_3px_0_#0c0b0d]">
                    {isMax ? 'MAX' : rank}
                  </span>
                  {!isMax && <span className="mb-1 font-['Orbitron'] text-[11px] font-bold text-[#0c0b0d]">/ 10</span>}
                </div>
                <div className="mt-1.5 -skew-x-6 bg-[#0c0b0d] px-2.5 py-1.5 text-[#f6f1e7] shadow-[3px_3px_0_#f6f1e7]">
                  <p className="text-[10px] font-bold text-[#f6f1e7]/70">{isMax ? '解放済みの真なる力' : '次のランクで得る力'}</p>
                  <p className="text-[14px] font-black" style={{ color: isMax ? GOLD : WHITE }}>
                    {isMax ? bond.max[0] : nextAbility}
                  </p>
                  <p className="line-clamp-2 text-[10.5px] leading-snug font-medium text-[#f6f1e7]/85">{isMax ? bond.max[1] : nextDesc}</p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="flex items-center justify-end gap-3 pr-2">
            <span className="hidden font-['JetBrains_Mono'] text-[10px] font-bold text-[#0c0b0d] @min-[56rem]:inline">↑↓ 選択 / Enter</span>
            <RankUpButton disabled={isMax} gold={rank === MAX_RANK - 1} onClick={() => start()} />
          </div>
        </section>

        {/* 下: 詳細(狭いとき) */}
        <div
          className="flex shrink-0 items-center gap-2.5 bg-[#0c0b0d] py-1.5 pr-1.5 pl-2 ring-2 ring-[#f6f1e7] shadow-[4px_4px_0_#e3141e] @min-[44rem]:hidden"
          style={{ clipPath: 'polygon(0 6%, 100% 0, 100% 100%, 1% 100%)' }}
        >
          <span className="grid size-10 shrink-0 -skew-x-6 place-items-center p-1" style={{ background: isMax ? GOLD : RED }}>
            <SigilGlyph bond={bond} color={isMax ? BLACK : WHITE} className="size-full" />
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[10px] font-bold text-[#f6f1e7]/70">{isMax ? '真なる力' : '次のランクで'}</span>
            <span className="block truncate text-[13px] font-black" style={{ color: isMax ? GOLD : WHITE }}>
              {isMax ? bond.max[0] : nextAbility}
            </span>
          </span>
          <RankUpButton disabled={isMax} gold={rank === MAX_RANK - 1} onClick={() => start()} className="!px-3 !text-[12px]" />
        </div>
      </div>

      <AnimatePresence
        onExitComplete={() => {
          if (refocus.current) {
            refocus.current = false
            rowRefs.current[sel]?.focus({ preventScroll: true })
          }
        }}
      >
        {cine && <Cinematic key={cine.key} info={cine} reduced={reduced} onClose={close} />}
      </AnimatePresence>
    </div>
  )
}
