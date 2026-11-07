import type { ComponentType, CSSProperties, ReactNode } from 'react'

/**
 * ゲームUIデモ(バトル・エンカウント・図鑑)で共有するオリジナルモンスター。
 * - すべて 100×100 の viewBox に SVG の基本図形とパスだけで描いたベクター絵
 * - シルエット表示は呼び出し側で CSS filter: brightness(0) をかけるだけで済むよう、線と塗りを1枚の SVG にまとめている
 * - 能力値・タイプ・分類・説明文・わざもここに置き、3つのデモで同じデータを使う
 */

export type MonType =
  | 'ノーマル'
  | 'ほのお'
  | 'みず'
  | 'くさ'
  | 'でんき'
  | 'こおり'
  | 'いわ'
  | 'ひこう'
  | 'エスパー'
  | 'むし'
  | 'ゴースト'
  | 'ドラゴン'
  | 'はがね'
  | 'あく'

export const TYPE_COLORS: Record<MonType, string> = {
  ノーマル: '#a19a86',
  ほのお: '#f0703a',
  みず: '#4d8fe8',
  くさ: '#5bb848',
  でんき: '#f2c230',
  こおり: '#69cfd9',
  いわ: '#b29a5b',
  ひこう: '#8fa2f0',
  エスパー: '#ef5f8f',
  むし: '#9fb52a',
  ゴースト: '#6e5aa6',
  ドラゴン: '#5a4ee0',
  はがね: '#8ea4b8',
  あく: '#5d4f48',
}

/** 明るいタイプ色の上では黒文字にする */
export const typeTextColor = (t: MonType) => (t === 'でんき' || t === 'こおり' ? '#2b2233' : '#ffffff')

export function TypeBadge({ type, className = '' }: { type: MonType; className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-[4px] px-1.5 py-[1px] text-[10px] leading-[1.4] font-black tracking-wider shadow-[inset_0_-2px_0_rgba(0,0,0,.2),inset_0_1px_0_rgba(255,255,255,.35)] ${className}`}
      style={{ background: TYPE_COLORS[type], color: typeTextColor(type) }}
    >
      {type}
    </span>
  )
}

export type Stats = { hp: number; atk: number; def: number; spa: number; spd: number; spe: number }
export const STAT_LABELS: readonly (readonly [keyof Stats, string])[] = [
  ['hp', 'HP'],
  ['atk', 'こうげき'],
  ['def', 'ぼうぎょ'],
  ['spa', 'とくこう'],
  ['spd', 'とくぼう'],
  ['spe', 'すばやさ'],
]

export interface Move {
  name: string
  type: MonType
  /** 0 は変化わざ */
  power: number
  pp: number
  /** 変化わざの効果 */
  effect?: 'lowerAtk'
}

export const MOVES = {
  ひのこ: { name: 'ひのこ', type: 'ほのお', power: 40, pp: 25 },
  たいあたり: { name: 'たいあたり', type: 'ノーマル', power: 40, pp: 35 },
  なきごえ: { name: 'なきごえ', type: 'ノーマル', power: 0, pp: 40, effect: 'lowerAtk' },
  かみつく: { name: 'かみつく', type: 'あく', power: 60, pp: 25 },
  はっぱカッター: { name: 'はっぱカッター', type: 'くさ', power: 55, pp: 25 },
  みずでっぽう: { name: 'みずでっぽう', type: 'みず', power: 40, pp: 25 },
  まきつく: { name: 'まきつく', type: 'ノーマル', power: 25, pp: 20 },
  でんきショック: { name: 'でんきショック', type: 'でんき', power: 40, pp: 30 },
  ひっかく: { name: 'ひっかく', type: 'ノーマル', power: 40, pp: 35 },
  こなゆき: { name: 'こなゆき', type: 'こおり', power: 40, pp: 25 },
  むしくい: { name: 'むしくい', type: 'むし', power: 50, pp: 20 },
  かぜおこし: { name: 'かぜおこし', type: 'ひこう', power: 40, pp: 35 },
  いわおとし: { name: 'いわおとし', type: 'いわ', power: 50, pp: 15 },
  まるくなる: { name: 'まるくなる', type: 'ノーマル', power: 0, pp: 40 },
} satisfies Record<string, Move>

export type MoveKey = keyof typeof MOVES

/** 一部だけの簡易相性表(攻撃タイプ → 受けるタイプ → 倍率) */
const CHART: Partial<Record<MonType, Partial<Record<MonType, number>>>> = {
  ノーマル: { いわ: 0.5, はがね: 0.5, ゴースト: 0 },
  ほのお: { くさ: 2, むし: 2, こおり: 2, はがね: 2, みず: 0.5, いわ: 0.5, ほのお: 0.5, ドラゴン: 0.5 },
  みず: { ほのお: 2, いわ: 2, みず: 0.5, くさ: 0.5, ドラゴン: 0.5 },
  くさ: { みず: 2, いわ: 2, ほのお: 0.5, くさ: 0.5, むし: 0.5, ひこう: 0.5, ドラゴン: 0.5, はがね: 0.5 },
  でんき: { みず: 2, ひこう: 2, でんき: 0.5, くさ: 0.5, ドラゴン: 0.5 },
  こおり: { くさ: 2, ひこう: 2, ドラゴン: 2, ほのお: 0.5, みず: 0.5, こおり: 0.5, はがね: 0.5 },
  むし: { くさ: 2, エスパー: 2, あく: 2, ほのお: 0.5, ひこう: 0.5, ゴースト: 0.5, はがね: 0.5 },
  あく: { エスパー: 2, ゴースト: 2, あく: 0.5 },
  いわ: { ほのお: 2, こおり: 2, ひこう: 2, むし: 2 },
  ひこう: { くさ: 2, むし: 2, でんき: 0.5, いわ: 0.5, はがね: 0.5 },
}

export function typeMultiplier(attack: MonType, defender: readonly MonType[]) {
  return defender.reduce((m, d) => m * (CHART[attack]?.[d] ?? 1), 1)
}

type ArtProps = { className?: string; style?: CSSProperties }

const O = '#2b2233'

function Svg({ className, style, children }: ArtProps & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 100 100" className={className} style={style} aria-hidden="true" overflow="visible">
      <g stroke={O} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round">
        {children}
      </g>
    </svg>
  )
}

/** 左右対称のパーツを x=50 で鏡写しにして2つ描く */
function Mirror({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <g transform="matrix(-1 0 0 1 100 0)">{children}</g>
    </>
  )
}

function Eye({ x, y, rx = 4, ry = 5.5 }: { x: number; y: number; rx?: number; ry?: number }) {
  return (
    <>
      <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={O} stroke="none" />
      <circle cx={x + rx * 0.35} cy={y - ry * 0.4} r={rx * 0.45} fill="#fff" stroke="none" />
    </>
  )
}

function Pomleaf(p: ArtProps) {
  return (
    <Svg {...p}>
      <path d="M50 32 Q49 22 52 15" fill="none" stroke="#3d7a2a" strokeWidth={3.5} />
      <path d="M52 16 Q66 2 80 11 Q67 25 52 16Z" fill="#6cc24a" />
      <path d="M58 13 Q66 10 72 12" fill="none" stroke="#3d7a2a" strokeWidth={1.5} />
      <path d="M51 18 Q37 5 24 13 Q37 27 51 18Z" fill="#8ad65e" />
      <Mirror>
        <ellipse cx={34} cy={89} rx={10} ry={6} fill="#c9b26a" />
      </Mirror>
      <path d="M50 28 C77 28 87 48 87 64 C87 82 71 91 50 91 C29 91 13 82 13 64 C13 48 23 28 50 28Z" fill="#a8d86a" />
      <path d="M81 58 C84 78 70 89 50 89 C68 84 78 74 81 58Z" fill="#7fb24a" stroke="none" opacity={0.7} />
      <ellipse cx={50} cy={74} rx={21} ry={12} fill="#eaf5bf" stroke="none" />
      <ellipse cx={31} cy={41} rx={8} ry={4} fill="#fff" stroke="none" opacity={0.55} transform="rotate(-30 31 41)" />
      <Mirror>
        <Eye x={38} y={55} rx={4.5} ry={6.5} />
        <ellipse cx={28} cy={65} rx={5} ry={3} fill="#f59aa0" stroke="none" opacity={0.85} />
      </Mirror>
      <path d="M45 64 Q50 69 55 64" fill="none" strokeWidth={2.2} />
    </Svg>
  )
}

function Hidamaru(p: ArtProps) {
  return (
    <Svg {...p}>
      <path d="M68 76 C88 74 94 58 87 44 C85 52 81 54 79 50 C81 40 75 31 68 29 C70 40 66 46 62 49Z" fill="#ffb02e" />
      <path d="M71 70 C82 68 87 58 84 51 C80 57 76 57 74 53 C72 59 70 63 66 66Z" fill="#ffe36b" stroke="none" />
      <Mirror>
        <path d="M27 36 L21 7 L44 25Z" fill="#f2793a" />
        <path d="M29 29 L26 15 L37 25Z" fill="#ffb02e" stroke="none" />
      </Mirror>
      <path d="M30 93 C26 75 34 60 50 60 C66 60 74 75 70 93Z" fill="#f2793a" />
      <path d="M41 93 C41 79 45 70 50 70 C55 70 59 79 59 93Z" fill="#ffe2b8" stroke="none" />
      <Mirror>
        <ellipse cx={39} cy={92} rx={7} ry={5} fill="#f2793a" />
      </Mirror>
      <path d="M44 25 C43 16 50 14 50 6 C55 13 59 16 56 25Z" fill="#ffb02e" />
      <path d="M21 45 C21 29 35 22 50 22 C65 22 79 29 79 45 C79 59 66 67 50 67 C34 67 21 59 21 45Z" fill="#f2793a" />
      <path d="M74 38 C79 50 72 62 56 66 C70 58 75 48 74 38Z" fill="#d6582a" stroke="none" opacity={0.6} />
      <ellipse cx={50} cy={53} rx={13} ry={9} fill="#ffe2b8" stroke="none" />
      <ellipse cx={50} cy={47.5} rx={3.5} ry={2.5} fill={O} stroke="none" />
      <Mirror>
        <Eye x={37.5} y={40} rx={4} ry={5.5} />
      </Mirror>
      <path d="M45 53 Q47.5 56 50 53 Q52.5 56 55 53" fill="none" strokeWidth={2} />
    </Svg>
  )
}

/** バトル画面の自分側に使う後ろ姿 */
export function HidamaruBack(p: ArtProps) {
  return (
    <Svg {...p}>
      <Mirror>
        <path d="M25 38 L18 6 L44 24Z" fill="#f2793a" />
      </Mirror>
      <path d="M20 104 C16 78 30 60 50 60 C70 60 84 78 80 104Z" fill="#f2793a" />
      <path d="M50 66 C46 76 46 92 50 104 C54 92 54 76 50 66Z" fill="#d6582a" stroke="none" opacity={0.8} />
      <path d="M43 25 C42 15 50 12 50 4 C55 12 60 15 57 25Z" fill="#ffb02e" />
      <path d="M18 46 C18 28 33 20 50 20 C67 20 82 28 82 46 C82 61 67 70 50 70 C33 70 18 61 18 46Z" fill="#f2793a" />
      <path d="M30 32 C38 26 46 25 52 26" fill="none" stroke="#ffd2a4" strokeWidth={3} opacity={0.7} />
      <path d="M62 104 C88 102 98 84 92 62 C89 71 85 73 82 68 C84 57 77 48 70 46 C73 57 69 64 64 67 C70 78 70 92 62 104Z" fill="#ffb02e" />
      <path d="M68 98 C84 96 90 84 88 72 C85 78 82 78 79 74 C79 82 76 88 70 90Z" fill="#ffe36b" stroke="none" />
    </Svg>
  )
}

function Shizukurage(p: ArtProps) {
  return (
    <Svg {...p}>
      <g fill="none" stroke="#3f7fcf" strokeWidth={4}>
        <path d="M33 62 C28 74 40 80 33 95" />
        <path d="M45 64 C42 76 52 83 47 97" />
        <path d="M56 64 C60 76 51 84 57 97" />
        <path d="M67 62 C73 72 62 82 69 93" />
      </g>
      <path d="M50 5 C59 20 83 34 83 52 C83 65 68 69 50 69 C32 69 17 65 17 52 C17 34 41 20 50 5Z" fill="#7cc6f2" />
      <path d="M50 18 C56 28 73 38 73 52 C73 58 62 61 50 61 C38 61 27 58 27 52 C27 38 44 28 50 18Z" fill="#b6e4ff" stroke="none" opacity={0.65} />
      <path d="M17 54 Q23 63 30 56 Q36 65 43 58 Q50 67 57 58 Q64 65 70 56 Q77 63 83 54" fill="none" />
      <path d="M33 30 Q28 38 28 47" fill="none" stroke="#fff" strokeWidth={4} opacity={0.85} />
      <Mirror>
        <Eye x={40} y={46} rx={3.6} ry={5} />
      </Mirror>
      <path d="M46 54 Q50 57 54 54" fill="none" strokeWidth={2} />
      <circle cx={86} cy={22} r={4} fill="#dff3ff" strokeWidth={1.6} />
      <circle cx={91} cy={12} r={2.4} fill="#dff3ff" strokeWidth={1.4} />
      <circle cx={12} cy={30} r={3} fill="#dff3ff" strokeWidth={1.4} />
    </Svg>
  )
}

function Pirimog(p: ArtProps) {
  return (
    <Svg {...p}>
      <Mirror>
        <path d="M31 31 L17 15 L28 16 L20 2 L40 22 L31 22Z" fill="#ffd93b" />
      </Mirror>
      <path d="M50 20 C74 20 86 40 86 62 C86 82 70 92 50 92 C30 92 14 82 14 62 C14 40 26 20 50 20Z" fill="#f6c933" />
      <path d="M80 50 C86 74 72 90 50 90 C70 84 80 70 80 50Z" fill="#d9a414" stroke="none" opacity={0.7} />
      <ellipse cx={50} cy={72} rx={22} ry={16} fill="#fff1b0" stroke="none" />
      <path d="M42 21 L50 33 L58 21" fill="#5a3b1e" stroke="none" />
      <Mirror>
        <circle cx={26} cy={57} r={6} fill="#ff6a4a" stroke="none" />
        <path d="M33 47 Q37.5 42 42 47" fill="none" strokeWidth={2.6} />
        <path d="M17 76 C7 75 5 85 11 89 L15 85 L18 91 L22 85 L27 88 C31 82 26 75 17 76Z" fill="#fff6dc" />
      </Mirror>
      <ellipse cx={50} cy={55} rx={6.5} ry={4.8} fill="#ff8fa3" />
      <path d="M46 62 Q50 66 54 62" fill="none" strokeWidth={2} />
      <path d="M8 46 L4 52 L9 52 L5 59" fill="none" stroke="#ffd93b" strokeWidth={2} />
      <path d="M92 46 L96 52 L91 52 L95 59" fill="none" stroke="#ffd93b" strokeWidth={2} />
    </Svg>
  )
}

function Iwakoron(p: ArtProps) {
  return (
    <Svg {...p}>
      <rect x={30} y={82} width={11} height={10} rx={3.5} fill="#6e655c" />
      <rect x={64} y={82} width={11} height={10} rx={3.5} fill="#6e655c" />
      <path d="M14 70 C14 40 32 18 56 18 C78 18 92 38 92 62 C92 80 80 89 62 89 L28 89 C19 89 14 81 14 70Z" fill="#9a8f84" />
      <g fill="none" strokeWidth={2.2}>
        <path d="M34 24 C27 42 27 70 33 89" />
        <path d="M54 18 C47 40 47 70 52 89" />
        <path d="M74 23 C68 42 68 70 72 88" />
      </g>
      <path d="M86 44 C92 64 86 84 66 88 C80 80 87 64 86 44Z" fill="#776d63" stroke="none" />
      <g fill="#c7bdb0" stroke="none" opacity={0.8}>
        <ellipse cx={42} cy={30} rx={4} ry={2} transform="rotate(-20 42 30)" />
        <ellipse cx={62} cy={28} rx={4} ry={2} transform="rotate(-10 62 28)" />
      </g>
      <path d="M60 40 L64 46 L60 50" fill="none" strokeWidth={1.6} />
      <path d="M5 66 C5 53 16 49 25 53 C32 57 33 74 24 79 C15 83 5 77 5 66Z" fill="#d9c7a8" />
      <path d="M14 49 L12 42 L19 47" fill="#d9c7a8" />
      <Eye x={15} y={62} rx={2.8} ry={4} />
      <path d="M9 72 Q13 75 17 72" fill="none" strokeWidth={1.8} />
      <ellipse cx={22} cy={70} rx={3} ry={1.8} fill="#e9a08e" stroke="none" />
    </Svg>
  )
}

function Yumefukuro(p: ArtProps) {
  return (
    <Svg {...p}>
      <Mirror>
        <path d="M27 25 L20 5 L39 18Z" fill="#7a5cc4" />
        <rect x={36} y={88} width={8} height={7} rx={2} fill="#ffb84a" strokeWidth={2} />
      </Mirror>
      <path d="M50 13 C74 13 87 33 87 56 C87 80 71 93 50 93 C29 93 13 80 13 56 C13 33 26 13 50 13Z" fill="#8e6fd6" />
      <path d="M30 67 C30 55 40 51 50 51 C60 51 70 55 70 67 C70 82 61 90 50 90 C39 90 30 82 30 67Z" fill="#ece2fd" stroke="none" />
      <g fill="none" stroke="#a991e6" strokeWidth={2}>
        <path d="M40 66 L44 70 L48 66 M52 66 L56 70 L60 66 M46 77 L50 81 L54 77" />
      </g>
      <Mirror>
        <path d="M15 49 C4 62 7 81 21 85 C23 72 22 60 15 49Z" fill="#6b4fb4" />
        <circle cx={37} cy={38} r={11.5} fill="#fff7d6" />
        <circle cx={37} cy={39} r={5.8} fill={O} stroke="none" />
        <circle cx={39} cy={36.5} r={2} fill="#fff" stroke="none" />
      </Mirror>
      <path d="M46 46 L54 46 L50 55Z" fill="#ffb84a" strokeWidth={2} />
      <path d="M48 15 A7 7 0 1 0 57 25 A5.6 5.6 0 1 1 48 15Z" fill="#ffe36b" strokeWidth={1.6} />
    </Svg>
  )
}

function Koorisu(p: ArtProps) {
  return (
    <Svg {...p}>
      <path d="M56 86 C84 88 98 62 89 39 C83 22 63 18 59 33 C56 44 70 47 72 39 C79 52 75 68 56 72Z" fill="#d6f2ff" />
      <g fill="none" stroke="#8fd0f0" strokeWidth={2}>
        <path d="M74 54 L84 46 M76 66 L88 61 M66 28 L74 35 M82 34 L86 26" />
      </g>
      <path d="M29 93 C23 77 30 60 44 59 C58 59 64 73 60 93Z" fill="#a9dcf5" />
      <path d="M27 31 L24 10 L41 24Z" fill="#a9dcf5" />
      <path d="M28 25 L27 16 L35 23Z" fill="#fff" stroke="none" />
      <path d="M53 22 L65 8 L64 31Z" fill="#a9dcf5" />
      <path d="M58 21 L63 15 L62 25Z" fill="#fff" stroke="none" />
      <circle cx={44} cy={42} r={21} fill="#a9dcf5" />
      <ellipse cx={44} cy={50} rx={12} ry={8} fill="#ecfaff" stroke="none" />
      <Eye x={36} y={40} rx={3.6} ry={5} />
      <Eye x={52} y={40} rx={3.6} ry={5} />
      <ellipse cx={44} cy={47} rx={2.6} ry={1.8} fill={O} stroke="none" />
      <path d="M40 51 Q44 54 48 51" fill="none" strokeWidth={1.8} />
      <ellipse cx={29} cy={48} rx={4} ry={2.4} fill="#f6b3c8" stroke="none" />
      <ellipse cx={59} cy={48} rx={4} ry={2.4} fill="#f6b3c8" stroke="none" />
      <path d="M44 66 L49 75 L44 84 L39 75Z" fill="#effcff" />
      <path d="M44 70 L44 80" fill="none" stroke="#8fd0f0" strokeWidth={1.4} />
      <ellipse cx={36} cy={76} rx={5} ry={4} fill="#a9dcf5" />
      <ellipse cx={52} cy={76} rx={5} ry={4} fill="#a9dcf5" />
    </Svg>
  )
}

function Kageboh(p: ArtProps) {
  return (
    <Svg {...p}>
      <path d="M50 9 C72 9 83 27 83 47 C83 65 75 77 69 86 C65 79 61 92 55 85 C50 94 45 85 40 92 C36 83 30 88 30 79 C22 71 17 59 17 47 C17 27 28 9 50 9Z" fill="#4b3a78" />
      <path d="M73 24 C82 40 80 62 68 78 C74 60 76 42 73 24Z" fill="#33285a" stroke="none" />
      <path d="M30 22 C25 30 24 38 25 44" fill="none" stroke="#7d69b8" strokeWidth={3} />
      <path d="M30 40 Q37 33 45 42 Q37 46 30 40Z" fill="#ffe86b" stroke="none" />
      <path d="M70 40 Q63 33 55 42 Q63 46 70 40Z" fill="#ffe86b" stroke="none" />
      <path d="M37 56 L41 61 L45 56 L50 61 L55 56 L59 61 L63 56" fill="none" stroke="#ffe86b" strokeWidth={2.2} />
      <path d="M79 53 C88 54 91 61 88 67" fill="none" strokeWidth={3} />
      <rect x={81} y={66} width={15} height={19} rx={4.5} fill="#ffcf5c" />
      <path d="M81 71 L96 71 M81 80 L96 80" fill="none" strokeWidth={1.5} />
      <path d="M88.5 70 C85 74 85 78 88.5 81 C92 78 92 74 88.5 70Z" fill="#ff7a3a" stroke="none" />
    </Svg>
  )
}

function Tsunodraco(p: ArtProps) {
  return (
    <Svg {...p}>
      <path d="M64 84 C80 89 91 80 94 66 C88 73 79 76 70 73Z" fill="#3fb5a5" />
      <path d="M94 66 L99 60 L97 70Z" fill="#f2c94c" />
      <Mirror>
        <path d="M30 60 C15 47 4 52 3 63 C10 60 15 64 19 69 C22 64 26 62 31 65Z" fill="#f2c94c" />
        <rect x={34} y={86} width={11} height={8} rx={3} fill="#2f8c80" />
      </Mirror>
      <path d="M31 92 C25 72 32 55 50 55 C68 55 75 72 69 92Z" fill="#3fb5a5" />
      <path d="M42 92 C40 78 44 64 50 64 C56 64 60 78 58 92Z" fill="#f6e7b0" stroke="none" />
      <path d="M43 72 L57 72 M42 80 L58 80 M42 87 L58 87" fill="none" stroke="#d8c27f" strokeWidth={1.6} />
      <Mirror>
        <path d="M31 27 L17 17 L33 19Z" fill="#fff4d6" />
      </Mirror>
      <path d="M25 39 C25 22 37 14 50 14 C63 14 75 22 75 39 C75 53 64 61 50 61 C36 61 25 53 25 39Z" fill="#3fb5a5" />
      <path d="M46 17 L50 2 L54 17Z" fill="#fff4d6" />
      <path d="M70 30 C76 44 68 56 54 60 C66 52 71 42 70 30Z" fill="#2f8c80" stroke="none" />
      <ellipse cx={50} cy={50} rx={13} ry={8} fill="#7fd6c9" stroke="none" />
      <Mirror>
        <ellipse cx={37} cy={36} rx={5} ry={6} fill="#fff" />
        <ellipse cx={38} cy={36.5} rx={2} ry={4.6} fill={O} stroke="none" />
        <circle cx={46} cy={49} r={1.3} fill={O} stroke="none" />
      </Mirror>
      <path d="M42 55 Q50 59 58 55" fill="none" strokeWidth={2} />
      <path d="M44 55.8 L45.5 59 L47 56.6" fill="#fff" strokeWidth={1.2} />
    </Svg>
  )
}

function Mayumoth(p: ArtProps) {
  return (
    <Svg {...p}>
      <Mirror>
        <path d="M44 46 C30 21 5 21 5 42 C5 57 22 63 40 56Z" fill="#f4b6c8" />
        <path d="M42 60 C26 64 14 77 22 89 C30 95 42 81 46 66Z" fill="#c8e6a0" />
        <circle cx={21} cy={40} r={6.5} fill="#fff" strokeWidth={2} />
        <circle cx={21} cy={40} r={3.2} fill="#8a4a7a" stroke="none" />
        <path d="M44 25 C40 13 33 8 26 9" fill="none" />
        <path d="M33 11 L30 4 M38 15 L37 7 M29 10 L24 5" fill="none" strokeWidth={1.8} />
      </Mirror>
      <ellipse cx={50} cy={62} rx={14} ry={24} fill="#fff3d6" />
      <path d="M38 56 L62 56 M37 66 L63 66 M39 76 L61 76" fill="none" stroke="#e6cf9e" strokeWidth={2} />
      <path d="M36 46 Q40 41 44 46 Q48 41 52 46 Q56 41 60 46 Q64 41 66 47" fill="#fffaf0" />
      <circle cx={50} cy={35} r={14} fill="#fff3d6" />
      <Mirror>
        <ellipse cx={43} cy={34} rx={4.6} ry={5.6} fill={O} stroke="none" />
        <circle cx={44.6} cy={32} r={1.8} fill="#fff" stroke="none" />
      </Mirror>
      <path d="M47 42 Q50 44 53 42" fill="none" strokeWidth={1.8} />
    </Svg>
  )
}

function Zenmaigame(p: ArtProps) {
  return (
    <Svg {...p}>
      <rect x={24} y={66} width={13} height={18} rx={5} fill="#bfe08a" />
      <rect x={64} y={66} width={13} height={18} rx={5} fill="#bfe08a" />
      <rect x={50} y={12} width={6} height={16} fill="#c9a24a" />
      <path d="M40 9 C40 2 52 2 51 9 L55 9 C55 2 67 2 67 9 C67 17 55 17 55 12 L51 12 C51 17 40 17 40 9Z" fill="#e6c26a" />
      <path d="M18 63 C18 37 34 25 53 25 C71 25 86 37 86 63Z" fill="#9fb3c8" />
      <path d="M30 63 C30 45 40 33 53 33 C66 33 75 45 75 63" fill="none" stroke="#6c8299" strokeWidth={2} />
      <path d="M53 33 L53 63 M37 42 L45 63 M69 42 L61 63" fill="none" stroke="#6c8299" strokeWidth={1.6} />
      <g fill="#6c8299" stroke="none">
        <circle cx={26} cy={55} r={1.8} />
        <circle cx={34} cy={39} r={1.8} />
        <circle cx={72} cy={39} r={1.8} />
        <circle cx={80} cy={55} r={1.8} />
      </g>
      <path d="M36 32 C42 28 48 27 54 27" fill="none" stroke="#e2edf7" strokeWidth={3} />
      <rect x={12} y={60} width={80} height={10} rx={5} fill="#7d8fa3" />
      <path d="M90 64 L98 62 L94 68Z" fill="#bfe08a" />
      <circle cx={13} cy={56} r={11} fill="#bfe08a" />
      <Eye x={10} y={53} rx={2.8} ry={4} />
      <path d="M5 61 Q9 63 12 61" fill="none" strokeWidth={1.6} />
    </Svg>
  )
}

function Hoshikujira(p: ArtProps) {
  return (
    <Svg {...p}>
      <path d="M84 47 C90 34 95 29 99 20 C92 25 88 25 83 21 C86 30 84 38 79 44Z" fill="#2f3f8f" />
      <path d="M7 56 C7 34 30 22 54 24 C76 26 90 40 90 54 C90 70 72 80 50 80 C26 80 7 72 7 56Z" fill="#2f3f8f" />
      <path d="M12 61 C25 76 70 80 87 61 C81 74 65 80 48 80 C30 80 17 72 12 61Z" fill="#9fb0ff" stroke="none" />
      <path d="M20 66 L74 70 M24 72 L66 75" fill="none" stroke="#7f8fe6" strokeWidth={1.4} />
      <path d="M44 66 C40 76 46 84 54 86 C52 78 54 72 56 68Z" fill="#253275" />
      <g fill="#ffe86b" stroke="none">
        <path d="M40 34 l1.6 3.4 3.6.4 -2.7 2.4 .8 3.6 -3.3-1.9 -3.3 1.9 .8-3.6 -2.7-2.4 3.6-.4Z" />
        <circle cx={58} cy={33} r={1.6} />
        <circle cx={68} cy={40} r={1.2} />
        <circle cx={28} cy={42} r={1.2} />
        <circle cx={52} cy={44} r={1} />
      </g>
      <Eye x={22} y={54} rx={3} ry={4} />
      <path d="M10 62 Q18 66 28 63" fill="none" strokeWidth={1.8} />
      <g fill="none" stroke="#bfe6ff" strokeWidth={2}>
        <path d="M34 22 C32 14 26 10 22 10 M36 21 C38 12 44 8 48 9" />
      </g>
    </Svg>
  )
}

export interface MonsterData {
  no: number
  name: string
  types: MonType[]
  category: string
  height: number
  weight: number
  stats: Stats
  flavor: string
  /** 一覧の小アイコンや背景に使う代表色 */
  color: string
  moves: MoveKey[]
  Art: ComponentType<ArtProps>
}

export const MONSTERS: MonsterData[] = [
  {
    no: 1, name: 'ポムリーフ', types: ['くさ'], category: 'ふたばモンスター', height: 0.4, weight: 5.2,
    stats: { hp: 45, atk: 49, def: 49, spa: 62, spd: 60, spe: 44 }, color: '#a8d86a',
    flavor: 'あたまの ふたばで ひなたぼっこを する。おなかが いっぱいに なると ふたばが すこしだけ のびる。',
    moves: ['はっぱカッター', 'たいあたり'], Art: Pomleaf,
  },
  {
    no: 2, name: 'ヒダマル', types: ['ほのお'], category: 'ひだまりモンスター', height: 0.5, weight: 7.8,
    stats: { hp: 42, atk: 58, def: 40, spa: 60, spd: 48, spe: 66 }, color: '#f2793a',
    flavor: 'しっぽの ほのおは きげんで いろが かわる。ねむっている あいだも からだは ぽかぽかと あたたかい。',
    moves: ['ひのこ', 'たいあたり', 'なきごえ', 'かみつく'], Art: Hidamaru,
  },
  {
    no: 3, name: 'シズクラゲ', types: ['みず'], category: 'しずくモンスター', height: 0.6, weight: 3.1,
    stats: { hp: 50, atk: 40, def: 45, spa: 66, spd: 72, spe: 52 }, color: '#7cc6f2',
    flavor: 'あめあがりの みずたまりに すがたを みせる。からだの ほとんどが すんだ みずで できている。',
    moves: ['みずでっぽう', 'まきつく'], Art: Shizukurage,
  },
  {
    no: 4, name: 'ピリモグ', types: ['でんき'], category: 'でんきモグラモンスター', height: 0.3, weight: 4.4,
    stats: { hp: 38, atk: 55, def: 42, spa: 58, spd: 40, spe: 78 }, color: '#f6c933',
    flavor: 'じめんの したで でんきを ためこむ。ほっぺが あかく ひかって いるときは さわらない ほうが よい。',
    moves: ['でんきショック', 'ひっかく'], Art: Pirimog,
  },
  {
    no: 5, name: 'イワコロン', types: ['いわ'], category: 'ころいわモンスター', height: 0.7, weight: 38,
    stats: { hp: 60, atk: 72, def: 96, spa: 30, spd: 44, spe: 28 }, color: '#9a8f84',
    flavor: 'まるくなって さかみちを ころがり おりる。こうらの すじの かずで としが わかると いわれる。',
    moves: ['いわおとし', 'まるくなる'], Art: Iwakoron,
  },
  {
    no: 6, name: 'ユメフクロ', types: ['ひこう', 'エスパー'], category: 'ゆめみモンスター', height: 0.9, weight: 12.5,
    stats: { hp: 68, atk: 48, def: 52, spa: 88, spd: 82, spe: 60 }, color: '#8e6fd6',
    flavor: 'ひたいの みかづきで ねむる ひとの ゆめを のぞく。よい ゆめを みた よるは ひときわ たかく なく。',
    moves: ['かぜおこし', 'なきごえ'], Art: Yumefukuro,
  },
  {
    no: 7, name: 'コオリス', types: ['こおり'], category: 'しもふりモンスター', height: 0.4, weight: 2.9,
    stats: { hp: 46, atk: 52, def: 44, spa: 64, spd: 56, spe: 84 }, color: '#a9dcf5',
    flavor: 'こおりの みを しっぽに たくわえて ふゆを こす。うまく かくした ばしょを よく わすれる。',
    moves: ['こなゆき', 'ひっかく'], Art: Koorisu,
  },
  {
    no: 8, name: 'カゲボウ', types: ['ゴースト'], category: 'ちょうちんモンスター', height: 1.1, weight: 0.2,
    stats: { hp: 52, atk: 40, def: 48, spa: 90, spd: 70, spe: 64 }, color: '#4b3a78',
    flavor: 'まよった たびびとの まえに ちょうちんを ともして あらわれる。ついて いくと もとの みちに もどされる。',
    moves: ['かみつく', 'なきごえ'], Art: Kageboh,
  },
  {
    no: 9, name: 'ツノドラコ', types: ['ドラゴン'], category: 'こりゅうモンスター', height: 0.8, weight: 15.3,
    stats: { hp: 58, atk: 74, def: 60, spa: 54, spd: 52, spe: 62 }, color: '#3fb5a5',
    flavor: 'はなさきの つのを いわに こすって みがく。つのが ひかる ほど なかまから みとめられる。',
    moves: ['かみつく', 'ひっかく'], Art: Tsunodraco,
  },
  {
    no: 10, name: 'マユモス', types: ['むし', 'ひこう'], category: 'まゆかぜモンスター', height: 0.6, weight: 2.4,
    stats: { hp: 55, atk: 36, def: 50, spa: 70, spd: 74, spe: 58 }, color: '#f4b6c8',
    flavor: 'はねの もようで てきを おどろかせる。つきの あかるい よるに むれで ゆっくりと わたって いく。',
    moves: ['むしくい', 'かぜおこし'], Art: Mayumoth,
  },
  {
    no: 11, name: 'ゼンマイガメ', types: ['はがね'], category: 'ねじまきモンスター', height: 0.5, weight: 46,
    stats: { hp: 64, atk: 66, def: 104, spa: 40, spd: 58, spe: 26 }, color: '#9fb3c8',
    flavor: 'せなかの ねじが とまると その ばで ねむって しまう。まいて あげると いちにちじゅう あるきつづける。',
    moves: ['たいあたり', 'まるくなる'], Art: Zenmaigame,
  },
  {
    no: 12, name: 'ホシクジラ', types: ['みず', 'ひこう'], category: 'そらおよぎモンスター', height: 7.2, weight: 420,
    stats: { hp: 130, atk: 82, def: 80, spa: 100, spd: 96, spe: 62 }, color: '#2f3f8f',
    flavor: 'ほしの ない よるに くもの うえを およぐ。せなかの ひかりは とおい むかしに のみこんだ ほしだと いう。',
    moves: ['みずでっぽう', 'かぜおこし'], Art: Hoshikujira,
  },
]

export const monsterByName = (name: string) => MONSTERS.find((m) => m.name === name) ?? MONSTERS[0]

/** 捕獲カプセル(オリジナルの道具デザイン) */
export function CaptureCapsule({ className, style }: ArtProps) {
  return (
    <svg viewBox="0 0 40 40" className={className} style={style} aria-hidden="true">
      <g stroke={O} strokeWidth={2.4} strokeLinejoin="round">
        <rect x={9} y={3} width={22} height={34} rx={11} fill="#f4f1e6" />
        <path d="M9 20 L9 14 A11 11 0 0 1 31 14 L31 20Z" fill="#2fb39a" />
        <rect x={7} y={18} width={26} height={5} rx={2} fill="#ffcf4a" />
        <circle cx={20} cy={20.5} r={3.4} fill="#fff" />
      </g>
      <path d="M14 9 Q16 6 19 6" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" opacity={0.8} />
    </svg>
  )
}
