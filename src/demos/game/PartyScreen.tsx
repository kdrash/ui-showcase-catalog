/**
 * 携帯機モンスターRPG風の「手持ち」画面。
 * - 先頭の1体を左の大きな枠、残り5体を右の列に並べる。各カードは motion の layoutId で描画し、
 *   入れ替え時はカード自体が位置とサイズを補間しながら相手の枠へ移動する（共有レイアウトアニメーション）
 * - HPバーは requestAnimationFrame で数値をトゥイーンし、残量に応じて緑→黄→赤に色が変わる。回復アイテムでじわっと伸びる
 * - メッセージ窓はタイプライター表示。どく・まひ・ねむり・ひんしのバッジ、ひんし枠の減光
 * - ローヴィングタブインデックス + デモのルート要素の onKeyDown で、矢印キー / Enter / Esc だけでも操作できる
 * - モンスターはすべてオリジナルの SVG イラスト（グラデーションの陰影とつや）。動きを減らす設定ではトゥイーンと跳ねる動きを止める
 * - 選択中のカードはポインターに合わせて 3D に傾き、color-dodge のホログラム箔が流れる
 * - つよさ画面は6角形のレーダーチャート（ポリゴンをモンスター間でモーフィング）、回復・入れ替えにはリング/粒子/光線の演出
 */
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react'
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw, X } from 'lucide-react'

type Kind = 'fire' | 'water' | 'grass' | 'spark' | 'dream' | 'rock'
type Status = 'どく' | 'まひ' | 'ねむり' | null
type TypeName = 'ほのお' | 'みず' | 'くさ' | 'でんき' | 'ノーマル' | 'いわ' | 'ひこう' | 'じめん'
type Mode = 'browse' | 'menu' | 'items' | 'swap' | 'stats' | 'busy'

interface Mon {
  id: string
  kind: Kind
  name: string
  lv: number
  hp: number
  max: number
  status: Status
  types: TypeName[]
  ability: string
  held: string
  /** こうげき・ぼうぎょ・とくこう・とくぼう・すばやさ */
  stats: [number, number, number, number, number]
  memo: string
}

const INITIAL: Mon[] = [
  {
    id: 'hinokoro', kind: 'fire', name: 'ヒノコロ', lv: 24, hp: 61, max: 72, status: null, types: ['ほのお'],
    ability: 'ねっけつ', held: 'なし', stats: [68, 45, 62, 48, 74],
    memo: 'しっぽの 火が 大きいほど きげんが いい。さむい日は 主人の ひざで まるくなって ねむる。',
  },
  {
    id: 'mizutamaru', kind: 'water', name: 'ミズタマル', lv: 21, hp: 23, max: 66, status: 'どく', types: ['みず'],
    ability: 'しめりはだ', held: 'かいがらの鈴', stats: [44, 58, 61, 66, 39],
    memo: '頭の しずくは いつも つめたい。なかまが つかれると しずくを わけて あげる。',
  },
  {
    id: 'tsutamogu', kind: 'grass', name: 'ツタモグ', lv: 19, hp: 49, max: 58, status: null, types: ['くさ', 'じめん'],
    ability: 'ねっこはり', held: 'なし', stats: [57, 63, 41, 50, 33],
    memo: '土の中を ほりすすみ、日が さす場所で 頭の 葉っぱを ひろげて ひなたぼっこを する。',
  },
  {
    id: 'pirikaze', kind: 'spark', name: 'ピリカゼ', lv: 22, hp: 9, max: 55, status: 'まひ', types: ['でんき', 'ひこう'],
    ability: 'ほうでんばね', held: 'ひかる小石', stats: [52, 37, 70, 42, 88],
    memo: 'かみなりの 夜に とさかが ひかる。はばたくたびに パチパチと 小さな 音が する。',
  },
  {
    id: 'nemurisu', kind: 'dream', name: 'ネムリス', lv: 18, hp: 40, max: 52, status: 'ねむり', types: ['ノーマル'],
    ability: 'ゆめうつし', held: 'ほしのかけら', stats: [39, 47, 58, 61, 55],
    memo: '大きな しっぽを まくらにして 一日の ほとんどを ねて すごす。ねごとで 天気を あてる。',
  },
  {
    id: 'katakoro', kind: 'rock', name: 'カタコロ', lv: 20, hp: 0, max: 63, status: null, types: ['いわ'],
    ability: 'まるまりガード', held: 'なし', stats: [61, 82, 30, 45, 28],
    memo: 'こうらは 小石を かさねて できている。おどろくと まるまって 坂道を ころがっていく。',
  },
]

interface Item {
  id: string
  name: string
  desc: string
  kind: 'heal' | 'cure' | 'revive'
  amount?: number
  count: number
}

const ITEMS: Item[] = [
  { id: 'jelly', name: 'やくそうゼリー', desc: 'HPを 20 かいふくする。', kind: 'heal', amount: 20, count: 3 },
  { id: 'drop', name: 'ぎんのしずく', desc: 'HPを 60 かいふくする。', kind: 'heal', amount: 60, count: 1 },
  { id: 'herb', name: 'すっきりハーブ', desc: 'どく・まひ・ねむりを なおす。', kind: 'cure', count: 2 },
  { id: 'feather', name: 'ひだまりのはね', desc: 'ひんしから HPはんぶんで ふっかつ。', kind: 'revive', count: 1 },
]

const MENU = ['つよさを見る', '入れ替え', 'もちもの', 'やめる'] as const
const STAT_LABELS = ['こうげき', 'ぼうぎょ', 'とくこう', 'とくぼう', 'すばやさ'] as const
const DEFAULT_MSG = 'モンスターを えらんでください。'

const TYPE_COLOR: Record<TypeName, string> = {
  ほのお: '#ef8441', みず: '#4f8fe8', くさ: '#5fbf4a', でんき: '#e9bd25',
  ノーマル: '#a29f86', いわ: '#b39a45', ひこう: '#8ea2ee', じめん: '#d4a957',
}

const STATUS_STYLE: Record<string, string> = {
  どく: 'bg-[#9d4dcc] text-white',
  まひ: 'bg-[#e8b90c] text-[#3a2b00]',
  ねむり: 'bg-[#76839e] text-white',
  ひんし: 'bg-[#e0453a] text-white',
}

/** 回復エフェクトの色 [光, 文字, 背景] と粒の形 */
const FX_COLORS: Record<Item['kind'], [string, string, string]> = {
  heal: ['#7dffa8', '#d8ffe3', '#1f7a3acc'],
  cure: ['#7fe8ff', '#e0f9ff', '#1d6a8acc'],
  revive: ['#ffd76a', '#fff6cf', '#9a6a10cc'],
}
const FX_GLYPH: Record<Item['kind'], string> = { heal: '+', cure: '○', revive: '✦' }

const hpColor = (ratio: number) => (ratio > 0.5 ? '#3fd25c' : ratio > 0.2 ? '#f4c21b' : '#f04a3a')

/* ------------------------------------------------------------------ */
/* hooks                                                              */
/* ------------------------------------------------------------------ */

/** 数値を ease-out で追従させる（HPバー・数値用） */
function useTween(target: number, reduced: boolean, ms = 950) {
  const [value, setValue] = useState(target)
  const current = useRef(target)
  useEffect(() => {
    if (reduced) {
      current.current = target
      return
    }
    const from = current.current
    if (from === target) return
    const start = performance.now()
    let raf = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms)
      const v = from + (target - from) * (1 - Math.pow(1 - t, 3))
      current.current = v
      setValue(v)
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, reduced, ms])
  return reduced ? target : value
}

/** メッセージ窓の1文字ずつ表示 */
function useTypewriter(text: string, reduced: boolean) {
  const [state, setState] = useState({ text, n: 0 })
  if (state.text !== text) setState({ text, n: 0 })
  useEffect(() => {
    if (reduced) return
    const id = window.setInterval(() => {
      setState((s) => {
        if (s.n >= s.text.length) {
          window.clearInterval(id)
          return s
        }
        return { ...s, n: s.n + 1 }
      })
    }, 28)
    return () => window.clearInterval(id)
  }, [text, reduced])
  return reduced ? text : text.slice(0, state.text === text ? state.n : 0)
}

/* ------------------------------------------------------------------ */
/* creature art                                                       */
/* ------------------------------------------------------------------ */

type EyeMode = 'open' | 'closed' | 'x'

function Eyes({ at, y, mode, r = 2.3, color = '#1d1410' }: { at: number[]; y: number; mode: EyeMode; r?: number; color?: string }) {
  return (
    <g>
      {at.map((x) =>
        mode === 'open' ? (
          <g key={x}>
            <ellipse cx={x} cy={y} rx={r} ry={r * 1.25} fill={color} />
            <circle cx={x + r * 0.35} cy={y - r * 0.45} r={r * 0.4} fill="#fff" />
          </g>
        ) : mode === 'closed' ? (
          <path key={x} d={`M${x - r} ${y} Q${x} ${y + r * 1.1} ${x + r} ${y}`} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        ) : (
          <path key={x} d={`M${x - r} ${y - r} L${x + r} ${y + r} M${x + r} ${y - r} L${x - r} ${y + r}`} stroke={color} strokeWidth="1.6" strokeLinecap="round" />
        ),
      )}
    </g>
  )
}

const radial = (id: string, a: string, b: string, c: string) => (
  <radialGradient id={id} cx="38%" cy="32%" r="75%">
    <stop offset="0" stopColor={a} />
    <stop offset=".55" stopColor={b} />
    <stop offset="1" stopColor={c} />
  </radialGradient>
)
const linear = (id: string, a: string, b: string, c: string) => (
  <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stopColor={a} />
    <stop offset=".5" stopColor={b} />
    <stop offset="1" stopColor={c} />
  </linearGradient>
)
/** 体のつや（ハイライト）の位置 [cx, cy, r] */
const GLOSS: Record<Kind, [number, number, number]> = {
  fire: [25, 21, 6],
  water: [22, 29, 7],
  grass: [23, 33, 7],
  spark: [26, 28, 6],
  dream: [20, 24, 5],
  rock: [28, 25, 8],
}

function Creature({ kind, eyes = 'open', className }: { kind: Kind; eyes?: EyeMode; className?: string }) {
  const g = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const common = { strokeWidth: 1.6, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }
  let art: ReactNode = null
  switch (kind) {
    case 'fire':
      art = (
        <>
          <g stroke="#4a1f10" {...common}>
            <path d="M44 46 C56 44 61 31 54 19 C53 26 49 28 48 24 C45 30 50 35 44 40 Z" fill={`url(#${g}flame)`} />
            <path d="M15 25 L16 8 L27 18 Z" fill={`url(#${g}fireDark)`} />
            <path d="M36 18 L47 8 L47 25 Z" fill={`url(#${g}fireDark)`} />
            <ellipse cx="32" cy="46" rx="15" ry="11" fill={`url(#${g}fireBody)`} />
            <circle cx="31" cy="29" r="14" fill={`url(#${g}fireBody)`} />
            <ellipse cx="31" cy="35.5" rx="8" ry="5.5" fill="#ffe0bf" />
            <ellipse cx="24" cy="56" rx="5" ry="3" fill={`url(#${g}fireDark)`} />
            <ellipse cx="39" cy="56" rx="5" ry="3" fill={`url(#${g}fireDark)`} />
          </g>
          <path d="M46 42 C52 40 55 33 53 27 C51 31 48 32 47 30 C46 35 49 38 46 42 Z" fill="#ffe36b" />
          <path d="M18 21 L18.5 13 L24 18 Z" fill="#ffc69a" />
          <path d="M39 18 L44.5 13 L44.5 21 Z" fill="#ffc69a" />
          <Eyes at={[25, 37]} y={28} mode={eyes} />
          <ellipse cx="31" cy="33" rx="1.7" ry="1.2" fill="#2a120a" />
          <path d="M28.5 35.5 Q31 38 33.5 35.5" stroke="#2a120a" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <ellipse cx="20" cy="32" rx="2.6" ry="1.6" fill="#ff8f80" opacity=".75" />
          <ellipse cx="42" cy="32" rx="2.6" ry="1.6" fill="#ff8f80" opacity=".75" />
        </>
      )
      break
    case 'water':
      art = (
        <>
          <g stroke="#163a5c" {...common}>
            <path d="M34 4 C38 10 41 13 41 17 A7 7 0 0 1 27 17 C27 13 30 10 34 4 Z" fill={`url(#${g}waterDrop)`} />
            <path d="M12 50 C4 52 2 58 8 59 C12 59 15 55 16 52 Z" fill={`url(#${g}waterDark)`} />
            <path d="M52 50 C60 52 62 58 56 59 C52 59 49 55 48 52 Z" fill={`url(#${g}waterDark)`} />
            <path d="M8 48 C6 32 18 21 32 21 C47 21 58 32 57 46 C56 55 44 58 32 58 C18 58 9 56 8 48 Z" fill={`url(#${g}waterBody)`} />
            <ellipse cx="32" cy="47" rx="14" ry="8.5" fill="#e3f5ff" />
          </g>
          <ellipse cx="31" cy="11" rx="1.6" ry="3" fill="#fff" opacity=".85" />
          <Eyes at={[24, 40]} y={34} mode={eyes} />
          <ellipse cx="32" cy="39" rx="2.2" ry="1.5" fill="#163a5c" />
          <path d="M26 41 L18 40 M26 43 L19 44 M38 41 L46 40 M38 43 L45 44" stroke="#163a5c" strokeWidth=".9" strokeLinecap="round" />
        </>
      )
      break
    case 'grass':
      art = (
        <>
          <path d="M32 27 C32 21 33 18 34 15" fill="none" stroke="#2f6b22" strokeWidth="2.2" strokeLinecap="round" />
          <g stroke="#2b4d1c" {...common}>
            <path d="M34 15 C28 6 19 8 19 13 C23 17 30 17 34 15 Z" fill={`url(#${g}leaf)`} />
            <path d="M34 15 C38 5 48 6 48 11 C45 16 38 17 34 15 Z" fill={`url(#${g}leaf)`} />
          </g>
          <g stroke="#3d2614" {...common}>
            <ellipse cx="32" cy="42" rx="19" ry="16" fill={`url(#${g}grassBody)`} />
            <ellipse cx="32" cy="46" rx="11" ry="8.5" fill="#efcf9f" />
            <ellipse cx="16" cy="55" rx="5.5" ry="3.5" fill="#efcf9f" />
            <ellipse cx="48" cy="55" rx="5.5" ry="3.5" fill="#efcf9f" />
            <ellipse cx="32" cy="42.5" rx="3.2" ry="2.3" fill="#ff8b9d" />
          </g>
          <path d="M24 12 C27 12 31 13 33 15 M44 9 C41 11 37 13 35 15" stroke="#2b4d1c" strokeWidth=".8" fill="none" />
          <Eyes at={[25, 39]} y={37} mode={eyes} r={1.8} />
          <path d="M29 47 Q32 49.5 35 47" stroke="#3d2614" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </>
      )
      break
    case 'spark':
      art = (
        <>
          <g stroke="#4a3500" {...common}>
            <path d="M15 40 L4 33 L10 44 L2 45 L15 51 Z" fill={`url(#${g}sparkCrest)`} />
            <path d="M24 25 L26 8 L31 17 L36 6 L37 20 L42 14 L40 27 Z" fill={`url(#${g}sparkCrest)`} />
            <circle cx="32" cy="38" r="17" fill={`url(#${g}sparkBody)`} />
            <path d="M18 37 C18 48 26 52 32 50 C28 46 26 42 26 35 Z" fill="#f4b81c" />
            <ellipse cx="36" cy="46" rx="9" ry="6.5" fill="#fff4c2" />
            <path d="M45 34 L55 37 L45 40 Z" fill="#ff8a3d" />
          </g>
          <path d="M28 55 v4 M36 55 v4" stroke="#ff8a3d" strokeWidth="2.2" strokeLinecap="round" />
          <Eyes at={[39]} y={31} mode={eyes} r={2.4} />
          <ellipse cx="42" cy="38.5" rx="2.6" ry="1.6" fill="#69d2ff" />
        </>
      )
      break
    case 'dream':
      art = (
        <>
          <g stroke="#3d2b5c" {...common}>
            <path d="M38 55 C58 55 63 32 52 20 C44 11 32 16 36 25 C39 31 47 28 46 23 C52 30 50 44 38 47 Z" fill={`url(#${g}dreamTail)`} />
            <path d="M15 23 L13 9 L24 17 Z" fill={`url(#${g}dreamTail)`} />
            <path d="M29 17 L38 8 L38 22 Z" fill={`url(#${g}dreamTail)`} />
            <ellipse cx="27" cy="47" rx="12" ry="10.5" fill={`url(#${g}dreamBody)`} />
            <circle cx="26" cy="30" r="12" fill={`url(#${g}dreamBody)`} />
            <ellipse cx="27" cy="49" rx="6" ry="5.5" fill="#fff" />
            <ellipse cx="20" cy="57" rx="4.5" ry="2.6" fill={`url(#${g}dreamTail)`} />
            <ellipse cx="33" cy="57" rx="4.5" ry="2.6" fill={`url(#${g}dreamTail)`} />
          </g>
          <path d="M26 15.5 l1.5 3 3.2.4-2.4 2.2.7 3.2-3-1.6-3 1.6.7-3.2-2.4-2.2 3.2-.4z" fill="#fff1a6" stroke="#3d2b5c" strokeWidth=".9" strokeLinejoin="round" />
          <Eyes at={[21, 31]} y={30} mode={eyes} r={2} color="#2c1d47" />
          <path d="M23.5 35 q1.25 1.4 2.5 0 q1.25 1.4 2.5 0" stroke="#2c1d47" strokeWidth="1" fill="none" strokeLinecap="round" />
          <ellipse cx="17" cy="34" rx="2.3" ry="1.4" fill="#ff9fc4" opacity=".8" />
          <ellipse cx="35" cy="34" rx="2.3" ry="1.4" fill="#ff9fc4" opacity=".8" />
        </>
      )
      break
    case 'rock':
      art = (
        <>
          <g stroke="#2e2a26" {...common}>
            <rect x="18" y="49" width="7" height="8" rx="2" fill="#8a7a66" />
            <rect x="42" y="49" width="7" height="8" rx="2" fill="#8a7a66" />
            <path d="M10 51 C10 30 22 18 36 18 C50 18 60 30 60 51 Z" fill={`url(#${g}rockShell)`} />
            <path d="M15 37 C5 37 1 45 3 50 C7 55 16 53 19 48 Z" fill={`url(#${g}rockHead)`} />
            <path d="M12 37.5 L9 30 L17 35.5 Z" fill="#b39f80" />
          </g>
          <path d="M24 21 C20 30 19 40 20 50 M36 18.5 C34 28 34 40 35 50 M48 21 C50 30 51 40 50 50" fill="none" stroke="#6c737c" strokeWidth="1.5" />
          <circle cx="30" cy="30" r="2.2" fill="#c3c9d0" />
          <circle cx="42" cy="38" r="2.6" fill="#c3c9d0" />
          <circle cx="28" cy="43" r="1.6" fill="#c3c9d0" />
          <circle cx="53" cy="44" r="1.8" fill="#c3c9d0" />
          <Eyes at={[10]} y={43} mode={eyes} r={1.8} />
          <circle cx="3.6" cy="48.5" r="1.1" fill="#2e2a26" />
        </>
      )
      break
  }
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" overflow="visible">
      <defs>
        {radial(`${g}fireBody`, '#ffb27a', '#f2743f', '#c4461f')}
        {radial(`${g}fireDark`, '#f2764a', '#de5428', '#a8361a')}
        {linear(`${g}flame`, '#fff07a', '#ffb13b', '#ff6a2a')}
        {radial(`${g}waterBody`, '#a6dcff', '#4f9de8', '#2a65b4')}
        {radial(`${g}waterDrop`, '#f2fdff', '#a6e6ff', '#5cbcf0')}
        {radial(`${g}waterDark`, '#5b9be0', '#3a7fc8', '#245a9a')}
        {radial(`${g}grassBody`, '#c4946a', '#8f6242', '#5e3a22')}
        {linear(`${g}leaf`, '#b6f08f', '#6fcf55', '#3d9a34')}
        {radial(`${g}sparkBody`, '#fff7c2', '#ffd93d', '#e3a314')}
        {linear(`${g}sparkCrest`, '#ffe680', '#ffb21e', '#f07a10')}
        {radial(`${g}dreamBody`, '#fbf6ff', '#d8c8f7', '#a690dc')}
        {linear(`${g}dreamTail`, '#d9c8fa', '#b59be6', '#8466c8')}
        {radial(`${g}rockShell`, '#d7dde3', '#9aa1aa', '#636a73')}
        {radial(`${g}rockHead`, '#efe0c4', '#c9b596', '#a08867')}
        <radialGradient id={`${g}gloss`}>
          <stop offset="0" stopColor="#fff" stopOpacity=".85" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      {art}
      <ellipse cx={GLOSS[kind][0]} cy={GLOSS[kind][1]} rx={GLOSS[kind][2]} ry={GLOSS[kind][2] * 0.62} fill={`url(#${g}gloss)`} transform={`rotate(-25 ${GLOSS[kind][0]} ${GLOSS[kind][1]})`} />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* small parts                                                        */
/* ------------------------------------------------------------------ */

function StatusBadge({ label }: { label: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-[4px] px-1.5 py-px text-[9px] leading-[13px] font-black tracking-wider shadow-[0_1px_0_rgba(0,0,0,.35)] ${STATUS_STYLE[label]}`}>
      {label}
    </span>
  )
}

function TypeBadge({ type }: { type: TypeName }) {
  return (
    <span className="inline-flex rounded-full px-2 py-px text-[10px] leading-[15px] font-black text-white shadow-[inset_0_-2px_0_rgba(0,0,0,.2)] [text-shadow:0_1px_0_rgba(0,0,0,.35)]" style={{ background: TYPE_COLOR[type] }}>
      {type}
    </span>
  )
}

function HpBar({ shown, max, big }: { shown: number; max: number; big?: boolean }) {
  const ratio = Math.max(0, shown) / max
  return (
    <div className="flex items-center gap-1 rounded-full bg-[#263534] p-[2px] pr-[3px] shadow-[0_1px_0_rgba(255,255,255,.25)]">
      <span className={`rounded-full bg-[#f6b33c] px-1 font-black text-[#3a2a08] ${big ? 'text-[9px] leading-[12px]' : 'text-[8px] leading-[10px]'}`}>HP</span>
      <div className={`relative flex-1 overflow-hidden rounded-full bg-[#4c5856] ${big ? 'h-[9px]' : 'h-[7px]'}`}>
        <div
          className="h-full rounded-full shadow-[inset_0_-2px_0_rgba(0,0,0,.2),inset_0_1px_0_rgba(255,255,255,.45)]"
          style={{ width: `${ratio * 100}%`, background: hpColor(ratio), transition: 'background-color .25s' }}
        />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* slot card                                                          */
/* ------------------------------------------------------------------ */

interface CardProps {
  mon: Mon
  lead: boolean
  active: boolean
  swapSource: boolean
  flash: boolean
  fx: { key: number; text: string; kind: Item['kind'] } | null
  reduced: boolean
}

function SlotCard({ mon, lead, active, swapSource, flash, fx, reduced }: CardProps) {
  const shown = useTween(mon.hp, reduced)
  const fainted = mon.hp <= 0
  const badge = fainted ? 'ひんし' : mon.status
  const tone = fainted
    ? 'border-[#3b1d22] bg-[linear-gradient(160deg,#8b5054,#5b3138)] saturate-[.55]'
    : active
      ? 'border-white bg-[linear-gradient(160deg,#ffbf5a,#f2762c)] shadow-[0_0_0_3px_rgba(255,190,90,.35),0_6px_18px_rgba(0,0,0,.35)]'
      : 'border-[#163961] bg-[linear-gradient(160deg,#4f97de,#2b60aa)] shadow-[0_4px_0_rgba(10,30,60,.45)]'
  const eyes: EyeMode = fainted ? 'x' : mon.status === 'ねむり' ? 'closed' : 'open'
  const hop = !reduced && !fainted && mon.status !== 'ねむり'

  const icon = (
    <motion.div
      className="h-full w-full"
      animate={hop ? { y: active ? [0, -5, 0] : [0, -2, 0] } : { y: 0 }}
      transition={hop ? { duration: active ? 0.42 : 1.1, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
    >
      <Creature kind={mon.kind} eyes={eyes} className={`h-full w-full drop-shadow-[0_2px_0_rgba(0,0,0,.25)] ${fainted ? 'grayscale-[.7] brightness-75' : ''}`} />
    </motion.div>
  )

  return (
    <motion.div
      layoutId={mon.id}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      style={{ borderRadius: lead ? 20 : 14, zIndex: flash ? 20 : undefined }}
      className={`absolute inset-0 overflow-hidden border-[3px] text-white [text-shadow:0_1px_0_rgba(0,0,0,.45)] ${tone}`}
    >
      {/* gloss */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/18 to-transparent" />
      {active && !fainted && <div className={`party-holo pointer-events-none absolute inset-0 ${reduced ? '' : 'party-holo-anim'}`} />}
      <motion.div layout className={`relative flex h-full w-full ${lead ? 'flex-col p-2.5 @min-[40rem]:p-3.5' : 'items-center gap-2 px-2 py-1 @min-[40rem]:gap-3 @min-[40rem]:px-3'}`}>
        {lead ? (
          <>
            <div className="flex items-center justify-between gap-1">
              <span className="rounded-full bg-black/25 px-2 py-px text-[9px] font-black tracking-[.2em] [text-shadow:none]">せんとう</span>
              {badge && <StatusBadge label={badge} />}
            </div>
            <div className="relative min-h-0 flex-1">
              <div className="absolute inset-0 m-auto h-full max-h-[150px] w-full @min-[60rem]:max-h-[230px]">
                <div className="relative mx-auto aspect-square h-full max-w-full">
                  <div className="absolute bottom-[0%] left-1/2 h-[12%] w-[72%] -translate-x-1/2 rounded-[50%] bg-black/25 blur-[2px]" />
                  {icon}
                </div>
              </div>
              {mon.status === 'ねむり' && !fainted && <Zzz reduced={reduced} />}
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="min-w-0 truncate text-[15px] font-black tracking-wide @min-[40rem]:text-lg">{mon.name}</span>
              <span className="shrink-0 font-mono text-[12px] font-bold">Lv{mon.lv}</span>
            </div>
            <div className="mt-1">
              <HpBar shown={shown} max={mon.max} big />
            </div>
            <div className="mt-0.5 text-right font-mono text-[12px] font-bold tabular-nums">
              {Math.round(shown)}<span className="opacity-70">/</span>{mon.max}
            </div>
          </>
        ) : (
          <>
            <div className="relative size-10 shrink-0 @min-[40rem]:size-12">
              {icon}
              {mon.status === 'ねむり' && !fainted && <Zzz reduced={reduced} small />}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <div className="flex items-center gap-1.5">
                <span className="min-w-0 truncate text-[12px] font-black tracking-wide @min-[40rem]:text-[13px]">{mon.name}</span>
                <span className="shrink-0 font-mono text-[10px] font-bold">Lv{mon.lv}</span>
                <span className="ml-auto">{badge && <StatusBadge label={badge} />}</span>
              </div>
              <HpBar shown={shown} max={mon.max} />
              <div className="text-right font-mono text-[10px] leading-none font-bold tabular-nums">
                {Math.round(shown)}<span className="opacity-70">/</span>{mon.max}
              </div>
            </div>
          </>
        )}
      </motion.div>

      {swapSource && (
        <motion.div
          className="pointer-events-none absolute inset-1 rounded-[inherit] border-2 border-dashed border-[#fff6a8]"
          animate={reduced ? { opacity: 1 } : { opacity: [1, 0.35, 1] }}
          transition={{ duration: 0.8, repeat: reduced ? 0 : Infinity }}
        />
      )}
      <AnimatePresence>
        {flash && (
          <motion.div key="flash" className="pointer-events-none absolute inset-0" initial={{ opacity: 1 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0.01 : 0.7 }}>
            <div className="absolute inset-0 bg-white/80" />
            {!reduced && (
              <div className="absolute inset-0">
                {Array.from({ length: 10 }, (_, i) => (
                  <motion.span
                    key={i}
                    className="absolute top-1/2 left-1/2 h-[3px] w-10 origin-left rounded-full bg-gradient-to-r from-[#fff6a8] to-transparent"
                    style={{ rotate: i * 36 }}
                    initial={{ scaleX: 0.2, x: 0 }}
                    animate={{ scaleX: [0.2, 1.6, 0.4], x: [0, 30, 60] }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {fx && (
          <motion.div key={fx.key} className="pointer-events-none absolute inset-0" initial={{ opacity: 1 }} animate={{ opacity: [1, 1, 0] }} transition={{ duration: 1.5, times: [0, 0.7, 1] }}>
            <motion.div
              className="absolute inset-0"
              style={{ background: `radial-gradient(circle at 50% 60%, ${FX_COLORS[fx.kind][0]}88, transparent 70%)` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.2] }}
              transition={{ duration: 0.9 }}
            />
            <div className="absolute inset-0 grid place-items-center">
              {!reduced && (
                <>
                  <motion.span
                    className="absolute size-16 rounded-full border-[3px]"
                    style={{ borderColor: FX_COLORS[fx.kind][0], boxShadow: `0 0 18px ${FX_COLORS[fx.kind][0]}` }}
                    initial={{ scale: 0.2, opacity: 1 }}
                    animate={{ scale: lead ? 4 : 2.6, opacity: 0 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                  {Array.from({ length: 12 }, (_, i) => (
                    <motion.span
                      key={i}
                      className="absolute font-black"
                      style={{ left: `${8 + ((i * 37) % 84)}%`, bottom: '8%', color: FX_COLORS[fx.kind][1], fontSize: 10 + (i % 3) * 5, textShadow: `0 0 8px ${FX_COLORS[fx.kind][0]}` }}
                      initial={{ y: 0, opacity: 0, rotate: 0 }}
                      animate={{ y: -50 - (i % 4) * 18, opacity: [0, 1, 0], rotate: (i % 2 ? 1 : -1) * 40 }}
                      transition={{ duration: 1.1, delay: (i % 6) * 0.07, ease: 'easeOut' }}
                    >
                      {FX_GLYPH[fx.kind]}
                    </motion.span>
                  ))}
                </>
              )}
              <motion.span
                className="relative rounded-full px-2.5 py-0.5 font-mono text-base font-black shadow-lg [text-shadow:none]"
                style={{ background: FX_COLORS[fx.kind][2], color: FX_COLORS[fx.kind][1] }}
                initial={{ y: 10, scale: 0.4 }}
                animate={{ y: reduced ? 0 : -14, scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 16 }}
              >
                {fx.text}
              </motion.span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function Zzz({ reduced, small }: { reduced: boolean; small?: boolean }) {
  return (
    <div className={`pointer-events-none absolute font-black text-[#e8e2ff] ${small ? '-top-1 -right-1 text-[9px]' : 'top-1 right-[18%] text-sm'}`}>
      {['z', 'Z'].map((z, i) => (
        <motion.span
          key={i}
          className="absolute"
          style={{ left: i * 7, top: -i * 6 }}
          animate={reduced ? { opacity: 1 } : { opacity: [0, 1, 0], y: [4, -4, -10] }}
          transition={{ duration: 1.8, repeat: reduced ? 0 : Infinity, delay: i * 0.6 }}
        >
          {z}
        </motion.span>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* main                                                               */
/* ------------------------------------------------------------------ */

const PARTY_CSS = `
.party-tilt { transform: perspective(900px) rotateX(0deg) rotateY(0deg); transition: transform .35s cubic-bezier(.2,.9,.3,1); }
.party-slot[data-active] .party-tilt { transform: perspective(900px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)); transition: transform .12s ease-out; }
.party-holo {
  mix-blend-mode: color-dodge; opacity: .55; border-radius: inherit;
  background:
    radial-gradient(circle at var(--mx, 50%) var(--my, 30%), rgba(255,255,255,.7), transparent 42%),
    repeating-linear-gradient(115deg, rgba(255,60,160,0) 0%, rgba(255,60,160,.5) 5%, rgba(255,226,60,.5) 10%, rgba(60,255,170,.5) 15%, rgba(60,170,255,.5) 20%, rgba(190,80,255,.5) 25%, rgba(255,60,160,0) 30%),
    radial-gradient(circle, rgba(255,255,255,.9) 0 1px, transparent 1.6px);
  background-size: 100% 100%, 260% 260%, 13px 13px;
  background-position: 0 0, 50% 50%, 0 0;
}
.party-holo-anim { animation: party-holo 5s linear infinite; }
@keyframes party-holo { 0% { background-position: 0 0, 0% 0%, 0 0 } 100% { background-position: 0 0, 260% 260%, 13px 13px } }
.party-stripes { background-image: repeating-linear-gradient(135deg, rgba(255,255,255,.05) 0 16px, transparent 16px 32px); background-size: 45.25px 45.25px; }
.party-stripes-anim { animation: party-stripes 2.4s linear infinite; }
@keyframes party-stripes { to { background-position: 45.25px 0 } }
.party-rays { background: repeating-conic-gradient(from 0deg, rgba(255,255,255,.9) 0 8deg, transparent 8deg 22deg); }
.party-rays-anim { animation: party-rays 14s linear infinite; }
@keyframes party-rays { to { transform: rotate(360deg) } }
`

export function PartyScreen() {
  const reduced = !!useReducedMotion()
  const [party, setParty] = useState<Mon[]>(() => INITIAL.map((m) => ({ ...m })))
  const [bag, setBag] = useState<number[]>(() => ITEMS.map((i) => i.count))
  const [cursor, setCursor] = useState(0)
  const [lastRight, setLastRight] = useState(1)
  const [mode, setMode] = useState<Mode>('browse')
  const [menuCursor, setMenuCursor] = useState(0)
  const [itemCursor, setItemCursor] = useState(0)
  const [swapFrom, setSwapFrom] = useState<number | null>(null)
  const [message, setMessage] = useState(DEFAULT_MSG)
  const [flashIds, setFlashIds] = useState<string[]>([])
  const [fx, setFx] = useState<{ id: string; key: number; text: string; kind: Item['kind'] } | null>(null)

  const rootRef = useRef<HTMLDivElement>(null)
  const refs = useRef(new Map<string, HTMLButtonElement | null>())
  const timers = useRef<number[]>([])
  const fxKey = useRef(0)
  const typed = useTypewriter(message, reduced)

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }
  const reg = (key: string) => (el: HTMLButtonElement | null) => {
    refs.current.set(key, el)
  }

  const selected = party[cursor]

  // ---- roving focus: フォーカスがデモ内にあるときだけ、現在のカーソル位置へ移す
  const focusKey = mode === 'menu' ? `m${menuCursor}` : mode === 'items' ? `i${itemCursor}` : mode === 'stats' ? 'stats' : `s${cursor}`
  useEffect(() => {
    const root = rootRef.current
    const active = document.activeElement
    if (!root || !active || !root.contains(active)) return
    refs.current.get(focusKey)?.focus({ preventScroll: true })
  }, [focusKey])

  const select = (i: number) => {
    setCursor(i)
    if (i > 0) setLastRight(i)
  }

  const openMenu = (i: number) => {
    select(i)
    setMenuCursor(0)
    setMode('menu')
    setMessage(`${party[i].name}を どうする？`)
  }

  const closeToBrowse = (msg = DEFAULT_MSG) => {
    setMode('browse')
    setSwapFrom(null)
    setMessage(msg)
  }

  const doSwap = (to: number) => {
    if (swapFrom === null) return
    if (to === swapFrom) {
      select(to)
      closeToBrowse()
      return
    }
    const a = party[swapFrom]
    const b = party[to]
    setParty((p) => {
      const n = [...p]
      n[swapFrom] = p[to]
      n[to] = p[swapFrom]
      return n
    })
    setFlashIds([a.id, b.id])
    later(() => setFlashIds([]), 650)
    select(to)
    closeToBrowse(`${a.name}と ${b.name}を いれかえた！`)
  }

  const chooseMenu = (idx: number) => {
    const opt = MENU[idx]
    if (opt === 'つよさを見る') {
      setMode('stats')
      setMessage(`${selected.name}の つよさ。 ←→で きりかえ`)
    } else if (opt === '入れ替え') {
      setSwapFrom(cursor)
      setMode('swap')
      setMessage(`${selected.name}を どこへ いどうする？`)
    } else if (opt === 'もちもの') {
      setItemCursor(0)
      setMode('items')
      setMessage(`${selected.name}に どの どうぐを つかう？`)
    } else {
      closeToBrowse()
    }
  }

  const applyItem = (idx: number) => {
    if (idx >= ITEMS.length) {
      setMode('menu')
      setMessage(`${selected.name}を どうする？`)
      return
    }
    const item = ITEMS[idx]
    const mon = selected
    if (bag[idx] <= 0) {
      setMessage(`${item.name}は もう のこっていない！`)
      return
    }
    const fainted = mon.hp <= 0
    let next: Mon | null = null
    let msg = ''
    let fxText = ''
    if (item.kind === 'heal' && !fainted && mon.hp < mon.max) {
      const gain = Math.min(item.amount ?? 0, mon.max - mon.hp)
      next = { ...mon, hp: mon.hp + gain }
      msg = `${mon.name}の HPが ${gain} かいふくした！`
      fxText = `+${gain}`
    } else if (item.kind === 'cure' && !fainted && mon.status) {
      next = { ...mon, status: null }
      msg = `${mon.name}の ${mon.status}が なおった！`
      fxText = 'なおった！'
    } else if (item.kind === 'revive' && fainted) {
      const gain = Math.floor(mon.max / 2)
      next = { ...mon, hp: gain }
      msg = `${mon.name}は げんきを とりもどした！`
      fxText = `+${gain}`
    }
    if (!next) {
      setMessage('つかっても こうかが ないよ。')
      return
    }
    const updated = next
    setParty((p) => p.map((m) => (m.id === updated.id ? updated : m)))
    setBag((b) => b.map((c, i) => (i === idx ? c - 1 : c)))
    setFx({ id: mon.id, key: ++fxKey.current, text: fxText, kind: item.kind })
    later(() => setFx((f) => (f && f.id === mon.id ? null : f)), 1500)
    setMode('busy')
    setMessage(msg)
    later(() => setMode('browse'), reduced ? 300 : 1100)
  }

  const reset = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
    setParty(INITIAL.map((m) => ({ ...m })))
    setBag(ITEMS.map((i) => i.count))
    setCursor(0)
    setLastRight(1)
    setFx(null)
    setFlashIds([])
    closeToBrowse('てもちを さいしょの じょうたいに もどした。')
  }

  const clickSlot = (i: number) => {
    if (mode === 'busy') return
    if (mode === 'swap') return doSwap(i)
    if (mode === 'browse') return openMenu(i)
    select(i)
    closeToBrowse()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const k = e.key
    const target = e.target as HTMLElement
    const onButton = target !== e.currentTarget && target.tagName === 'BUTTON'
    const isActivate = k === 'Enter' || k === ' '
    // フォーカス中のボタンは標準のクリックで決定させる（二重発火を防ぐ）
    if (isActivate && onButton) return
    const isArrow = k.startsWith('Arrow')
    const isBack = k === 'Escape' || k === 'Backspace'
    if (!isArrow && !isActivate && !isBack) return
    if (mode === 'busy') {
      e.preventDefault()
      return
    }

    if (mode === 'browse' || mode === 'swap') {
      if (k === 'ArrowLeft') select(0)
      else if (k === 'ArrowRight') select(cursor === 0 ? lastRight : cursor)
      else if (k === 'ArrowDown') select(cursor === 5 ? 0 : cursor + 1)
      else if (k === 'ArrowUp') select(cursor === 0 ? 5 : cursor - 1)
      else if (isActivate) {
        if (mode === 'swap') doSwap(cursor)
        else openMenu(cursor)
      } else if (isBack) {
        if (mode !== 'swap') return
        closeToBrowse()
      }
    } else if (mode === 'menu') {
      if (k === 'ArrowDown') setMenuCursor((c) => (c + 1) % MENU.length)
      else if (k === 'ArrowUp') setMenuCursor((c) => (c + MENU.length - 1) % MENU.length)
      else if (isActivate) chooseMenu(menuCursor)
      else if (isBack) closeToBrowse()
      else if (!isArrow) return
    } else if (mode === 'items') {
      const n = ITEMS.length + 1
      if (k === 'ArrowDown') setItemCursor((c) => (c + 1) % n)
      else if (k === 'ArrowUp') setItemCursor((c) => (c + n - 1) % n)
      else if (isActivate) applyItem(itemCursor)
      else if (isBack) {
        setMode('menu')
        setMessage(`${selected.name}を どうする？`)
      } else if (!isArrow) return
    } else if (mode === 'stats') {
      if (k === 'ArrowRight' || k === 'ArrowDown') statsStep(1)
      else if (k === 'ArrowLeft' || k === 'ArrowUp') statsStep(-1)
      else if (isActivate || isBack) closeToBrowse()
    }
    e.preventDefault()
  }

  const statsStep = (d: number) => {
    const n = (cursor + d + party.length) % party.length
    select(n)
    setMessage(`${party[n].name}の つよさ。 ←→で きりかえ`)
  }

  const slotButton = (i: number) => {
    const mon = party[i]
    const active = cursor === i && mode !== 'stats'
    const focusable = (mode === 'browse' || mode === 'swap' || mode === 'busy') && cursor === i
    return (
      <button
        key={`slot-${i}`}
        ref={reg(`s${i}`)}
        type="button"
        tabIndex={focusable ? 0 : -1}
        onClick={() => clickSlot(i)}
        aria-label={`${i === 0 ? 'せんとう ' : ''}${mon.name} レベル${mon.lv} HP ${mon.hp}/${mon.max}${mon.hp <= 0 ? ' ひんし' : mon.status ? ` ${mon.status}` : ''}`}
        aria-current={cursor === i ? 'true' : undefined}
        onPointerMove={(e) => {
          if (reduced) return
          const r = e.currentTarget.getBoundingClientRect()
          const x = (e.clientX - r.left) / r.width
          const y = (e.clientY - r.top) / r.height
          const st = e.currentTarget.style
          st.setProperty('--mx', `${x * 100}%`)
          st.setProperty('--my', `${y * 100}%`)
          st.setProperty('--ry', `${(x - 0.5) * (i === 0 ? 14 : 8)}deg`)
          st.setProperty('--rx', `${(0.5 - y) * (i === 0 ? 12 : 10)}deg`)
        }}
        onPointerLeave={(e) => {
          const st = e.currentTarget.style
          st.setProperty('--rx', '0deg')
          st.setProperty('--ry', '0deg')
          st.setProperty('--mx', '50%')
          st.setProperty('--my', '30%')
        }}
        data-active={active || undefined}
        className="party-slot group relative block h-full min-h-0 w-full rounded-[16px] text-left outline-none focus-visible:ring-[3px] focus-visible:ring-[#fff6a8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1f7f75]"
      >
        <div className="party-tilt absolute inset-0">
        <SlotCard
          mon={mon}
          lead={i === 0}
          active={active}
          swapSource={mode === 'swap' && swapFrom === i}
          flash={flashIds.includes(mon.id)}
          fx={fx && fx.id === mon.id ? fx : null}
          reduced={reduced}
        />
        </div>
      </button>
    )
  }

  const panelAnim = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0, y: 12, scale: 0.96 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 8, scale: 0.97 } }

  const itemHint = mode === 'items' ? (itemCursor < ITEMS.length ? ITEMS[itemCursor].desc : 'メニューに もどる。') : ''

  return (
    <MotionConfig reducedMotion="user">
      <style>{PARTY_CSS}</style>
      <div
        ref={rootRef}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="@container relative flex h-full w-full items-center justify-center overflow-hidden bg-[#22887d] px-3 pt-3 pb-[var(--solo-footer-clearance,0.75rem)] font-sans outline-none select-none [background-image:repeating-linear-gradient(135deg,rgba(255,255,255,.07)_0_16px,transparent_16px_32px),radial-gradient(ellipse_at_20%_10%,#3cb3a4,transparent_60%),radial-gradient(ellipse_at_90%_100%,#145b55,transparent_65%)]"
      >
        <div aria-hidden="true" className={`party-stripes pointer-events-none absolute inset-0 ${reduced ? '' : 'party-stripes-anim'}`} />
        {/* dotted pattern band */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-[#16685f]/70 [background-image:radial-gradient(rgba(255,255,255,.18)_1px,transparent_1.4px)] [background-size:8px_8px]" />
        <div className="relative flex h-full max-h-[640px] w-full max-w-[1040px] min-w-0 flex-col gap-2">
          <div className="flex shrink-0 items-center justify-between gap-2 text-white">
            <h2 className="rounded-r-full border-y-2 border-r-2 border-white/70 bg-[#0f4f49] py-0.5 pr-4 pl-2 text-[11px] font-black tracking-[.25em] shadow-[0_2px_0_rgba(0,0,0,.25)]">
              てもち モンスター
            </h2>
            <span className="hidden font-mono text-[10px] font-bold text-white/80 @min-[36rem]:inline">
              ↑↓←→ えらぶ ・ Enter けってい ・ Esc もどる
            </span>
          </div>

          <div className="relative grid min-h-0 flex-1 grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-2 @min-[40rem]:grid-cols-[minmax(0,4fr)_minmax(0,6fr)] @min-[40rem]:gap-3">
            <div className="min-h-0">{slotButton(0)}</div>
            <div className="grid min-h-0 grid-rows-5 gap-1.5 @min-[40rem]:gap-2">{[1, 2, 3, 4, 5].map((i) => slotButton(i))}</div>

            {/* つよさ */}
            <AnimatePresence>
              {mode === 'stats' && (
                <motion.section
                  key="stats"
                  role="dialog"
                  aria-label={`${selected.name}の つよさ`}
                  {...panelAnim}
                  transition={{ duration: 0.22 }}
                  className="absolute inset-0 z-40 flex flex-col overflow-hidden rounded-[20px] border-[3px] border-white bg-[#fbf7ea] text-[#2c2a26] shadow-[0_10px_30px_rgba(0,0,0,.45)]"
                >
                  <header
                    className="flex shrink-0 items-center gap-2 px-3 py-1.5 text-white [text-shadow:0_1px_0_rgba(0,0,0,.4)]"
                    style={{ background: `linear-gradient(90deg, ${TYPE_COLOR[selected.types[0]]}, ${TYPE_COLOR[selected.types[selected.types.length - 1]]}cc)` }}
                  >
                    <button type="button" tabIndex={-1} onClick={() => statsStep(-1)} aria-label="まえの モンスター" className="grid size-6 place-items-center rounded-full bg-black/20 hover:bg-black/35">
                      <ChevronLeft size={15} />
                    </button>
                    <span className="min-w-0 truncate text-sm font-black tracking-wide">No.{cursor + 1} {selected.name}</span>
                    <span className="font-mono text-xs font-bold">Lv{selected.lv}</span>
                    <button type="button" tabIndex={-1} onClick={() => statsStep(1)} aria-label="つぎの モンスター" className="grid size-6 place-items-center rounded-full bg-black/20 hover:bg-black/35">
                      <ChevronRight size={15} />
                    </button>
                    <button
                      ref={reg('stats')}
                      type="button"
                      onClick={() => closeToBrowse()}
                      aria-label="とじる"
                      className="ml-auto grid size-7 place-items-center rounded-full bg-white/90 text-[#2c2a26] outline-none [text-shadow:none] hover:bg-white focus-visible:ring-2 focus-visible:ring-[#2c2a26]"
                    >
                      <X size={15} />
                    </button>
                  </header>
                  <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 overflow-y-auto p-3 @min-[44rem]:grid-cols-[minmax(0,3fr)_minmax(0,4fr)_minmax(0,3fr)]">
                    <div className="flex min-w-0 flex-col items-center justify-center gap-2">
                      <div
                        className="relative grid aspect-square w-full max-w-[170px] place-items-center overflow-hidden rounded-full shadow-[inset_0_-6px_0_rgba(0,0,0,.08),0_6px_16px_rgba(0,0,0,.12)]"
                        style={{ background: `radial-gradient(circle at 50% 40%, #fff, ${TYPE_COLOR[selected.types[0]]}55 70%, ${TYPE_COLOR[selected.types[0]]}99)` }}
                      >
                        <div className={`party-rays absolute -inset-1/2 opacity-40 ${reduced ? '' : 'party-rays-anim'}`} />
                        <div className="absolute inset-x-[20%] bottom-[12%] h-[10%] rounded-[50%] bg-black/20 blur-[2px]" />
                        <motion.div
                          key={selected.id}
                          className="relative w-[72%]"
                          initial={reduced ? false : { scale: 0.4, opacity: 0, y: 10 }}
                          animate={{ scale: 1, opacity: 1, y: 0 }}
                          transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                        >
                          <Creature
                            kind={selected.kind}
                            eyes={selected.hp <= 0 ? 'x' : selected.status === 'ねむり' ? 'closed' : 'open'}
                            className={`h-full w-full drop-shadow-[0_3px_0_rgba(0,0,0,.2)] ${selected.hp <= 0 ? 'grayscale-[.7]' : ''}`}
                          />
                        </motion.div>
                      </div>
                      <div className="flex flex-wrap justify-center gap-1">
                        {selected.types.map((t) => (
                          <TypeBadge key={t} type={t} />
                        ))}
                        {(selected.hp <= 0 || selected.status) && <StatusBadge label={selected.hp <= 0 ? 'ひんし' : (selected.status as string)} />}
                      </div>
                    </div>
                    <div className="flex min-w-0 flex-col items-center justify-center gap-1">
                      <Radar
                        values={[selected.max, selected.stats[0], selected.stats[1], selected.stats[4], selected.stats[3], selected.stats[2]]}
                        labels={['HP', STAT_LABELS[0], STAT_LABELS[1], STAT_LABELS[4], STAT_LABELS[3], STAT_LABELS[2]]}
                        color={TYPE_COLOR[selected.types[0]]}
                        reduced={reduced}
                      />
                      <div className="grid w-full max-w-[220px] grid-cols-[auto_1fr_auto] items-center gap-1.5 text-[11px] font-bold">
                        <span>HP</span>
                        <StatBar value={selected.hp} max={selected.max} color={hpColor(selected.hp / selected.max)} reduced={reduced} />
                        <span className="font-mono tabular-nums">
                          {selected.hp}/{selected.max}
                        </span>
                      </div>
                    </div>
                    <div className="col-span-2 flex min-w-0 flex-col justify-center gap-1.5 text-[11px] @min-[44rem]:col-span-1">
                      <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 rounded-lg bg-[#efe7d0] px-2 py-1 font-bold">
                        <dt className="text-[#8a7a55]">とくせい</dt>
                        <dd className="truncate">{selected.ability}</dd>
                        <dt className="text-[#8a7a55]">もちもの</dt>
                        <dd className="truncate">{selected.held}</dd>
                        <dt className="text-[#8a7a55]">とくい</dt>
                        <dd className="truncate">{STAT_LABELS[selected.stats.indexOf(Math.max(...selected.stats))]}</dd>
                      </dl>
                      <p className="rounded-lg border border-dashed border-[#cbbd96] px-2 py-1 text-[10.5px] leading-relaxed text-[#5b5240]">{selected.memo}</p>
                    </div>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* コマンドメニュー */}
            <AnimatePresence>
              {(mode === 'menu' || mode === 'items') && (
                <motion.div
                  key={mode}
                  {...panelAnim}
                  transition={{ duration: 0.16 }}
                  role="menu"
                  aria-label={mode === 'menu' ? `${selected.name}の メニュー` : 'どうぐ'}
                  className="absolute right-0 bottom-0 z-30 w-[min(100%,15.5rem)] rounded-[14px] border-[3px] border-[#4a4f57] bg-white p-1.5 text-[#2a2d33] shadow-[0_0_0_3px_#fff,0_10px_24px_rgba(0,0,0,.45)]"
                >
                  {mode === 'menu'
                    ? MENU.map((label, i) => (
                        <MenuButton key={label} ref={reg(`m${i}`)} active={menuCursor === i} onClick={() => chooseMenu(i)} onFocus={() => setMenuCursor(i)}>
                          {label}
                        </MenuButton>
                      ))
                    : (
                        <>
                          {ITEMS.map((item, i) => (
                            <MenuButton key={item.id} ref={reg(`i${i}`)} active={itemCursor === i} onClick={() => applyItem(i)} onFocus={() => setItemCursor(i)} dim={bag[i] <= 0}>
                              <span className="min-w-0 flex-1 truncate">{item.name}</span>
                              <span className="font-mono text-[11px] tabular-nums">×{bag[i]}</span>
                            </MenuButton>
                          ))}
                          <MenuButton ref={reg(`i${ITEMS.length}`)} active={itemCursor === ITEMS.length} onClick={() => applyItem(ITEMS.length)} onFocus={() => setItemCursor(ITEMS.length)}>
                            もどる
                          </MenuButton>
                          <p className="mt-1 rounded-md bg-[#eef3f6] px-2 py-1 text-[10px] leading-snug font-bold text-[#4a5560]">{itemHint}</p>
                        </>
                      )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* メッセージ窓 */}
          <div className="flex shrink-0 items-stretch gap-2">
            <div className="relative min-h-[46px] min-w-0 flex-1 rounded-[12px] border-[3px] border-[#4a4f57] bg-white px-3 py-1.5 text-[13px] leading-snug font-bold text-[#2a2d33] shadow-[0_0_0_2px_#fff,0_4px_0_rgba(0,0,0,.25)]">
              <span className="sr-only" aria-live="polite">{message}</span>
              <span aria-hidden="true">{typed}</span>
              {mode === 'swap' && (
                <span aria-hidden="true" className="ml-1 inline-block rounded bg-[#ffe2a0] px-1 text-[10px] text-[#7a4a00]">
                  Escで やめる
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={reset}
              className="flex shrink-0 items-center gap-1 rounded-[12px] border-[3px] border-[#7a2c22] bg-[linear-gradient(#f2705a,#d4483a)] px-2.5 text-[11px] font-black text-white shadow-[0_4px_0_rgba(0,0,0,.25)] [text-shadow:0_1px_0_rgba(0,0,0,.35)] outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-white active:translate-y-px"
            >
              <RotateCcw size={13} aria-hidden="true" />
              <span className="hidden @min-[28rem]:inline">リセット</span>
              <span className="sr-only @min-[28rem]:hidden">リセット</span>
            </button>
          </div>
        </div>
      </div>
    </MotionConfig>
  )
}

function Radar({ values, labels, color, reduced }: { values: number[]; labels: string[]; color: string; reduced: boolean }) {
  const C = [90, 74] as const
  const R = 50
  const pt = (i: number, r: number) => {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / values.length
    return [C[0] + Math.cos(a) * r, C[1] + Math.sin(a) * r] as const
  }
  const poly = (rs: number[]) => rs.map((r, i) => pt(i, r).map((v) => v.toFixed(1)).join(',')).join(' ')
  const data = values.map((v) => R * Math.max(0.08, Math.min(1, v / 90)))
  return (
    <svg viewBox="-36 0 252 150" className="h-auto max-h-[210px] w-full max-w-[340px]" role="img" aria-label={labels.map((l, i) => `${l} ${values[i]}`).join('、')}>
      {[1, 2 / 3, 1 / 3].map((f) => (
        <polygon key={f} points={poly(values.map(() => R * f))} fill={f === 1 ? '#f3ecd8' : 'none'} stroke="#d6c9a4" strokeWidth="1" />
      ))}
      {values.map((_, i) => {
        const [x, y] = pt(i, R)
        return <line key={i} x1={C[0]} y1={C[1]} x2={x} y2={y} stroke="#d6c9a4" strokeWidth="1" />
      })}
      <motion.polygon
        initial={reduced ? false : { points: poly(values.map(() => 4)) }}
        animate={{ points: poly(data) }}
        transition={{ type: 'spring', stiffness: 160, damping: 18 }}
        fill={color}
        fillOpacity=".45"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {labels.map((l, i) => {
        const [x, y] = pt(i, R + 11)
        const anchor = Math.abs(x - C[0]) < 4 ? 'middle' : x < C[0] ? 'end' : 'start'
        return (
          <text key={l} x={x} y={y + 3} textAnchor={anchor} fontSize="8.5" fontWeight="800" fill="#4a4436">
            {l}
            <tspan fill="#9a8a5e" dx="3" fontFamily="'JetBrains Mono', monospace">
              {values[i]}
            </tspan>
          </text>
        )
      })}
    </svg>
  )
}

function StatBar({ value, max, color, reduced }: { value: number; max: number; color: string; reduced: boolean }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-[#e2d9c0]">
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={reduced ? false : { width: 0 }}
        animate={{ width: `${Math.min(100, (value / max) * 100)}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </div>
  )
}

interface MenuButtonProps {
  active: boolean
  dim?: boolean
  onClick: () => void
  onFocus: () => void
  children: ReactNode
  ref: (el: HTMLButtonElement | null) => void
}

function MenuButton({ active, dim, onClick, onFocus, children, ref }: MenuButtonProps) {
  return (
    <button
      ref={ref}
      type="button"
      role="menuitem"
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      onFocus={onFocus}
      className={`relative flex w-full items-center gap-2 rounded-lg py-1.5 pr-2 pl-6 text-left text-[13px] font-black outline-none ${active ? 'bg-[#e7f1fb]' : 'hover:bg-[#f2f5f8]'} ${dim ? 'text-[#a3a8ae]' : ''}`}
    >
      {active && <span className="absolute left-1.5 text-[11px] text-[#e2552a]">▶</span>}
      {children}
    </button>
  )
}
