import NumberFlow from '@number-flow/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  Accessibility,
  Check,
  ChevronLeft,
  Clock,
  CreditCard,
  DoorOpen,
  Info,
  LoaderCircle,
  Maximize2,
  Minus,
  Plus,
  Sparkles,
  Ticket,
  TicketCheck,
  Wallet,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import {
  memo,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { TransformComponent, TransformWrapper, type ReactZoomPanPinchRef } from 'react-zoom-pan-pinch'

/**
 * 映画館の座席指定〜電子チケット発券。劇場「ルミナシネマ 汐見ベイ」・作品「潮騒のアーカイブ」・ロゴ・ポスターはすべて架空のオリジナル。
 * - 座席表は行ごとの文字列(s=一般 / p=プレミアム / w=車椅子 / d=ペアソファ / .=空き / |=通路)から座標付きの席データを生成し、
 *   固定サイズの板に absolute で並べる。板ごと react-zoom-pan-pinch に入れ、ResizeObserver で「全体が収まる倍率」を出して
 *   minScale / centerView に使う。ピンチ・ドラッグ・+/− ボタン・Ctrl+ホイールで拡大(素のホイールはページのスクロールを奪わない)
 * - 席はロービングフォーカス(tabIndex 0 は1席だけ)。矢印で同じ列の隣/前後の列のいちばん近い席へ、Home/End で列の端へ、Enter/Space で選択。
 *   拡大中に画面外の席へ移ると zoomToElement で追いかける。ホバーやキーボード移動で価格ツールチップ(板の外の層に座標変換して表示)
 * - 販売済み・他のお客様が選択中(斜線)の席は数秒ごとにランダムに変化し、変わった席が一瞬光る。上限 8 席、ペアソファは 2 席ぶん
 * - 「おまかせ」は人数ぶん通路をまたがずに並んで空いている区間を総当たりし、スクリーンからの距離と中心からのずれで採点して最良を選ぶ
 * - 最初の 1 席で 5 分の確保タイマーが始まり、0 になると座席を解放。券種(一般/学生/シニア)はステッパー、合計は NumberFlow
 * - 購入すると電子チケットが「発券口」から印刷されるように降りてくる。QR 風の模様は予約番号をシードにした擬似乱数(本物の QR 仕様ではない)。
 *   半券は下へドラッグ(または Enter)でもぎれて落ち、「入場済」のスタンプ。ウォレット追加ボタン付き
 * - 狭い幅では座席表を全面に出し、券種・合計は下からのシート(Esc で閉じる)。useReducedMotion 時は短いフェードだけにする
 */

/* ---------------------------------- データ ---------------------------------- */

type Kind = 'standard' | 'premium' | 'wheelchair' | 'sofa'
type SeatStatus = 'sold' | 'held'
type Seat = {
  id: string
  row: string
  ri: number
  col: number
  span: 1 | 2
  kind: Kind
  x: number
  y: number
  w: number
  label: string
}

const CELL = 26
const SEAT = 22
const AISLE = 22
const LABEL = 24
const PAD = 14
const SCREEN_H = 78
const GAP = 14
const LIMIT = 8
const HOLD_MS = 5 * 60 * 1000

const ROW_SPECS: [string, string][] = [
  ['A', '..ss|ssssssssssss|ss..'],
  ['B', '.sss|ssssssssssss|sss.'],
  ['C', 'ssss|ssssssssssss|ssss'],
  ['D', 'ssss|ssssssssssss|ssss'],
  ['E', 'ssss|ssssssssssss|ssss'],
  ['F', 'ssss|ssssssssssss|ssss'],
  ['G', 'ssss|pppppppppppp|ssss'],
  ['H', 'ssss|pppppppppppp|ssss'],
  ['I', 'ssss|ssssssssssss|ssss'],
  ['J', 'ssss|ssssssssssss|ssss'],
  ['K', 'ww..|ssssssssssss|..ww'],
  ['L', 'dddd|dddddddddddd|dddd'],
]

const colX = (col: number) => PAD + LABEL + (col - 1) * CELL + (col > 4 ? AISLE : 0) + (col > 16 ? AISLE : 0)
const rowY = (ri: number) => SCREEN_H + ri * CELL + (ri >= 6 ? GAP : 0) + (ri >= 11 ? GAP : 0)
const MAP_W = PAD * 2 + LABEL * 2 + 20 * CELL + AISLE * 2
const MAP_H = rowY(11) + CELL + 34
const block = (col: number) => (col <= 4 ? 0 : col <= 16 ? 1 : 2)

const SEATS: Seat[] = []
ROW_SPECS.forEach(([row, spec], ri) => {
  const chars = spec.replace(/\|/g, '').split('')
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i]
    const col = i + 1
    if (c === '.') continue
    if (c === 'd') {
      SEATS.push({ id: `${row}${col}`, row, ri, col, span: 2, kind: 'sofa', x: colX(col), y: rowY(ri), w: CELL * 2 - 4, label: `${row}列 ${col}・${col + 1}番` })
      i++
      continue
    }
    const kind: Kind = c === 'p' ? 'premium' : c === 'w' ? 'wheelchair' : 'standard'
    SEATS.push({ id: `${row}${col}`, row, ri, col, span: 1, kind, x: colX(col), y: rowY(ri), w: SEAT, label: `${row}列 ${col}番` })
  }
})
const SEAT_BY_ID = new Map(SEATS.map((s) => [s.id, s]))
const ROWS: Seat[][] = ROW_SPECS.map((_, ri) => SEATS.filter((s) => s.ri === ri))
const cx = (s: Seat) => s.x + s.w / 2

const KIND_INFO: Record<Kind, { name: string; surcharge: number; dot: string }> = {
  standard: { name: 'スタンダード', surcharge: 0, dot: 'bg-zinc-400' },
  premium: { name: 'プレミアム', surcharge: 800, dot: 'bg-amber-400' },
  wheelchair: { name: '車椅子スペース', surcharge: 0, dot: 'bg-sky-400' },
  sofa: { name: 'ペアソファ', surcharge: 1000, dot: 'bg-indigo-400' },
}

const TICKET_TYPES = [
  { id: 'general', label: '一般', note: '', price: 2000 },
  { id: 'student', label: '学生', note: '大学・専門・高校', price: 1500 },
  { id: 'senior', label: 'シニア', note: '60歳以上', price: 1300 },
] as const

const yen = (n: number) => `¥${n.toLocaleString('ja-JP')}`

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashStr(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

function initialStatus(): Record<string, SeatStatus> {
  const rnd = mulberry32(20261114)
  const out: Record<string, SeatStatus> = {}
  for (const s of SEATS) {
    const center = 1 - Math.min(1, Math.abs(cx(s) - MAP_W / 2) / (MAP_W / 2))
    const rowPop = 1 - Math.abs(s.ri - 6.5) / 7
    const p = 0.08 + 0.42 * center * rowPop + (s.kind === 'sofa' ? 0.18 : 0) - (s.kind === 'wheelchair' ? 0.1 : 0)
    const r = rnd()
    if (r < p) out[s.id] = 'sold'
    else if (r < p + 0.035) out[s.id] = 'held'
  }
  return out
}

/** 人数ぶん並んで空いている区間のうち、いちばん観やすいものを探す */
function suggestSeats(n: number, status: Record<string, SeatStatus>): Seat[] | null {
  let best: Seat[] | null = null
  let bestScore = Infinity
  for (const row of ROWS) {
    const seats = row.filter((s) => s.kind === 'standard' || s.kind === 'premium')
    for (let i = 0; i + n <= seats.length; i++) {
      const run = seats.slice(i, i + n)
      let ok = true
      for (let k = 0; k < run.length; k++) {
        if (status[run[k].id]) ok = false
        if (k > 0 && (run[k].col !== run[k - 1].col + 1 || block(run[k].col) !== block(run[k - 1].col))) ok = false
      }
      if (!ok) continue
      const mid = (cx(run[0]) + cx(run[run.length - 1])) / 2
      const score = Math.abs(run[0].ri - 6.2) * 1.1 + (Math.abs(mid - MAP_W / 2) / CELL) * 0.42 - (run[0].kind === 'premium' ? 0.4 : 0)
      if (score < bestScore) {
        bestScore = score
        best = run
      }
    }
  }
  return best
}

/** QR コード「風」の模様(仕様準拠ではない)。3 隅のファインダー・タイミング・アライメントだけそれらしく置く */
function qrPath(seed: string, n = 25) {
  const rnd = mulberry32(hashStr(seed))
  const grid: boolean[][] = Array.from({ length: n }, () => Array.from({ length: n }, () => rnd() < 0.5))
  const reserved: boolean[][] = Array.from({ length: n }, () => Array(n).fill(false))
  const finder = (ox: number, oy: number) => {
    for (let y = -1; y <= 7; y++)
      for (let x = -1; x <= 7; x++) {
        const gx = ox + x
        const gy = oy + y
        if (gx < 0 || gy < 0 || gx >= n || gy >= n) continue
        const ring = Math.max(Math.abs(x - 3), Math.abs(y - 3))
        grid[gy][gx] = ring !== 2 && ring !== 4 && x >= 0 && y >= 0 && x <= 6 && y <= 6
        reserved[gy][gx] = true
      }
  }
  finder(0, 0)
  finder(n - 7, 0)
  finder(0, n - 7)
  for (let i = 8; i < n - 8; i++) {
    grid[6][i] = i % 2 === 0
    grid[i][6] = i % 2 === 0
  }
  const a = n - 9
  for (let y = -2; y <= 2; y++)
    for (let x = -2; x <= 2; x++) {
      const ring = Math.max(Math.abs(x), Math.abs(y))
      grid[a + y][a + x] = ring !== 1
    }
  let d = ''
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (grid[y][x]) d += `M${x} ${y}h1v1h-1z`
  return d
}

/* ---------------------------------- 小物 ---------------------------------- */

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect
      setSize((p) => (p && Math.abs(p.w - width) < 1 && Math.abs(p.h - height) < 1 ? p : { w: width, h: height }))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, size] as const
}

function BrandMark({ className = '' }: { className?: string }) {
  const gid = useId()
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fda4af" />
          <stop offset="1" stopColor="#f43f5e" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${gid})`} />
      <path d="M16 6c.9 5.6 4.4 9.1 10 10-5.6.9-9.1 4.4-10 10-.9-5.6-4.4-9.1-10-10 5.6-.9 9.1-4.4 10-10Z" fill="#fff" />
    </svg>
  )
}

/** 架空の作品「潮騒のアーカイブ」のキービジュアル(夜明け前の海と灯台) */
function PosterArt({ className = '' }: { className?: string }) {
  const uid = useId()
  const id = (n: string) => `${uid}-${n}`
  const stars = useMemo(() => {
    const r = mulberry32(7)
    return Array.from({ length: 26 }, () => ({ x: r() * 300, y: r() * 62, s: 0.4 + r() * 1.1, o: 0.35 + r() * 0.6 }))
  }, [])
  return (
    <svg viewBox="0 0 300 140" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#141a46" />
          <stop offset=".55" stopColor="#5b3a8f" />
          <stop offset=".85" stopColor="#e9877a" />
          <stop offset="1" stopColor="#f6c08c" />
        </linearGradient>
        <linearGradient id={id('sea')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#24305f" />
          <stop offset="1" stopColor="#0a1027" />
        </linearGradient>
        <radialGradient id={id('moon')} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#fff4dc" stopOpacity=".7" />
          <stop offset="1" stopColor="#fff4dc" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('beam')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff2c4" stopOpacity=".55" />
          <stop offset="1" stopColor="#fff2c4" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="300" height="140" fill={`url(#${id('sky')})`} />
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.s} fill="#fff" opacity={s.o} />
      ))}
      <circle cx="222" cy="40" r="34" fill={`url(#${id('moon')})`} />
      <circle cx="222" cy="40" r="12" fill="#fff1d6" />
      <path d="M52 63 L300 34 L300 70 Z" fill={`url(#${id('beam')})`} />
      <path d="M40 98 L44 64 L50 64 L54 98 Z" fill="#1a1838" />
      <rect x="42" y="58" width="10" height="7" rx="1" fill="#ffe9a8" />
      <path d="M40 58 L47 51 L54 58 Z" fill="#1a1838" />
      <path d="M0 96 Q 30 88 70 96 T 150 95 T 230 93 T 300 95 V140 H0Z" fill={`url(#${id('sea')})`} />
      <path d="M0 106 Q 40 100 80 106 T 160 105 T 240 104 T 300 106" stroke="#f6c08c" strokeOpacity=".35" fill="none" />
      <path d="M180 112 Q 205 108 230 112" stroke="#fff1d6" strokeOpacity=".5" strokeWidth="1.4" fill="none" />
      <path d="M195 120 Q 215 117 238 120" stroke="#fff1d6" strokeOpacity=".3" strokeWidth="1.2" fill="none" />
      <path d="M20 128 Q 60 122 100 128 T 190 127" stroke="#8ea0e0" strokeOpacity=".25" fill="none" />
    </svg>
  )
}

function Stepper({
  value,
  onDec,
  onInc,
  decDisabled,
  incDisabled,
  label,
  size = 'md',
}: {
  value: number
  onDec: () => void
  onInc: () => void
  decDisabled?: boolean
  incDisabled?: boolean
  label: string
  size?: 'sm' | 'md'
}) {
  const btn =
    'grid place-items-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-rose-400'
  const s = size === 'sm' ? 'h-7 w-7' : 'h-8 w-8'
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label={label}>
      <button type="button" className={`${btn} ${s}`} onClick={onDec} disabled={decDisabled} aria-label={`${label}を減らす`}>
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="w-5 text-center text-sm font-semibold tabular-nums text-zinc-100" aria-live="polite">
        {value}
      </span>
      <button type="button" className={`${btn} ${s}`} onClick={onInc} disabled={incDisabled} aria-label={`${label}を増やす`}>
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

/* ---------------------------------- 座席表 ---------------------------------- */

type GridProps = {
  status: Record<string, SeatStatus>
  selected: Set<string>
  focusId: string
  flashId: string | null
  suggested: Set<string>
  reduce: boolean
  onSeatClick: (s: Seat, e: ReactMouseEvent) => void
  onSeatHover: (id: string | null) => void
  setBtn: (id: string, el: HTMLButtonElement | null) => void
}

function seatClass(s: Seat, st: SeatStatus | undefined, sel: boolean) {
  const base =
    'absolute grid place-items-center text-white outline-none transition-[background-color,box-shadow,transform,opacity] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'
  const shape = s.kind === 'wheelchair' ? 'rounded-[6px]' : 'rounded-[7px_7px_4px_4px]'
  if (sel)
    return `${base} ${shape} bg-rose-500 shadow-[0_0_0_1px_rgba(255,255,255,.25)_inset,0_0_14px_rgba(244,63,94,.65)] hover:bg-rose-400`
  if (st === 'sold') return `${base} ${shape} cursor-not-allowed bg-white/[0.05] text-white/20`
  if (st === 'held')
    return `${base} ${shape} cursor-not-allowed border border-amber-300/30 bg-[repeating-linear-gradient(135deg,rgba(252,211,77,.32)_0_3px,transparent_3px_6px)]`
  const cushion = 'shadow-[inset_0_-4px_0_rgba(0,0,0,.28),inset_0_1px_0_rgba(255,255,255,.12)] hover:-translate-y-px'
  switch (s.kind) {
    case 'premium':
      return `${base} ${shape} ${cushion} bg-gradient-to-b from-[#c99a45] to-[#8a6424] hover:from-[#e5b65c] hover:to-[#a07630]`
    case 'sofa':
      return `${base} ${shape} ${cushion} bg-gradient-to-b from-[#5b63c9] to-[#373d8c] hover:from-[#6f78e0] hover:to-[#454ca8]`
    case 'wheelchair':
      return `${base} ${shape} border border-sky-400/70 bg-sky-400/10 text-sky-300 hover:bg-sky-400/25`
    default:
      return `${base} ${shape} ${cushion} bg-gradient-to-b from-[#4a4a60] to-[#34344a] hover:from-[#5d5d78] hover:to-[#43435c]`
  }
}

const SeatGrid = memo(function SeatGrid({ status, selected, focusId, flashId, suggested, reduce, onSeatClick, onSeatHover, setBtn }: GridProps) {
  return (
    <div className="relative" style={{ width: MAP_W, height: MAP_H }}>
      {/* スクリーン */}
      <svg className="absolute left-0 top-0" width={MAP_W} height={SCREEN_H} aria-hidden="true">
        <defs>
          <linearGradient id="sb-screen" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#c7d2fe" stopOpacity="0" />
            <stop offset=".2" stopColor="#e0e7ff" stopOpacity=".9" />
            <stop offset=".5" stopColor="#ffffff" />
            <stop offset=".8" stopColor="#e0e7ff" stopOpacity=".9" />
            <stop offset="1" stopColor="#c7d2fe" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="sb-cone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c7d2fe" stopOpacity=".22" />
            <stop offset="1" stopColor="#c7d2fe" stopOpacity="0" />
          </linearGradient>
          <filter id="sb-glow" x="-20%" y="-200%" width="140%" height="500%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>
        <path d={`M${MAP_W * 0.17} 22 Q ${MAP_W / 2} 6 ${MAP_W * 0.83} 22 L ${MAP_W * 0.98} ${SCREEN_H} L ${MAP_W * 0.02} ${SCREEN_H} Z`} fill="url(#sb-cone)" />
        <path d={`M${MAP_W * 0.17} 22 Q ${MAP_W / 2} 6 ${MAP_W * 0.83} 22`} stroke="#a5b4fc" strokeWidth="8" fill="none" filter="url(#sb-glow)" opacity=".8" />
        <path d={`M${MAP_W * 0.17} 22 Q ${MAP_W / 2} 6 ${MAP_W * 0.83} 22`} stroke="url(#sb-screen)" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <text x={MAP_W / 2} y="38" textAnchor="middle" fill="#a5b4fc" fillOpacity=".7" fontSize="9" letterSpacing="5" fontWeight="600">
          SCREEN
        </text>
      </svg>
      {/* 列ラベル */}
      {ROW_SPECS.map(([r], ri) => (
        <div key={r} aria-hidden="true">
          <span className="absolute grid place-items-center text-[10px] font-semibold text-zinc-500" style={{ left: PAD, top: rowY(ri), width: LABEL - 6, height: SEAT }}>
            {r}
          </span>
          <span className="absolute grid place-items-center text-[10px] font-semibold text-zinc-500" style={{ left: MAP_W - PAD - LABEL + 6, top: rowY(ri), width: LABEL - 6, height: SEAT }}>
            {r}
          </span>
        </div>
      ))}
      {/* 出入口 */}
      {[PAD, MAP_W - PAD - 64].map((x, i) => (
        <span key={i} aria-hidden="true" className="absolute flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-emerald-300" style={{ left: x, top: MAP_H - 22 }}>
          <DoorOpen className="h-2.5 w-2.5" /> 出入口
        </span>
      ))}
      <span aria-hidden="true" className="absolute -translate-x-1/2 text-[9px] tracking-[0.3em] text-zinc-600" style={{ left: MAP_W / 2, top: rowY(6) - GAP + 1 }}>
        ・ ・ ・
      </span>
      {SEATS.map((s) => {
        const st = status[s.id]
        const sel = selected.has(s.id)
        const flash = flashId === s.id && !reduce
        const sug = suggested.has(s.id) && !reduce
        const stateText = sel ? '選択中' : st === 'sold' ? '販売済み' : st === 'held' ? '他のお客様が選択中' : '空席'
        return (
          <button
            key={s.id}
            ref={(el) => setBtn(s.id, el)}
            type="button"
            data-seat={s.id}
            tabIndex={focusId === s.id ? 0 : -1}
            aria-label={`${s.label} ${KIND_INFO[s.kind].name} ${stateText}`}
            aria-pressed={st ? undefined : sel}
            aria-disabled={st && !sel ? true : undefined}
            className={seatClass(s, st, sel)}
            style={
              {
                left: s.x,
                top: s.y,
                width: s.w,
                height: SEAT,
                animation: flash
                  ? 'sb-flash 1.1s ease-out'
                  : sug
                    ? `sb-pop .5s cubic-bezier(.3,1.6,.5,1) ${(s.col % 8) * 40}ms both`
                    : sel && !reduce
                      ? 'sb-pop .32s cubic-bezier(.3,1.6,.5,1)'
                      : undefined,
              } as CSSProperties
            }
            onClick={(e) => onSeatClick(s, e)}
            onPointerEnter={() => onSeatHover(s.id)}
            onPointerLeave={() => onSeatHover(null)}
          >
            {sel ? (
              <Check className="h-3 w-3" strokeWidth={3} />
            ) : st === 'sold' ? (
              <X className="h-2.5 w-2.5" strokeWidth={2.5} />
            ) : s.kind === 'wheelchair' ? (
              <Accessibility className="h-3 w-3" />
            ) : s.kind === 'sofa' && !st ? (
              <span className="absolute inset-y-1 left-1/2 w-px bg-black/25" />
            ) : null}
          </button>
        )
      })}
    </div>
  )
})

/* ---------------------------------- 確保タイマー ---------------------------------- */

function HoldTimer({ deadline, onExpire }: { deadline: number; onExpire: () => void }) {
  const [now, setNow] = useState(() => Date.now())
  const expire = useRef(onExpire)
  useLayoutEffect(() => {
    expire.current = onExpire
  })
  useEffect(() => {
    const t = window.setInterval(() => {
      const n = Date.now()
      setNow(n)
      if (n >= deadline) expire.current()
    }, 250)
    return () => window.clearInterval(t)
  }, [deadline])
  const left = Math.max(0, deadline - now)
  const sec = Math.ceil(left / 1000)
  const urgent = sec <= 60
  const pct = left / HOLD_MS
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-3 py-2 transition-colors ${urgent ? 'border-rose-400/40 bg-rose-500/10' : 'border-white/10 bg-white/[0.03]'}`}
      role="timer"
      aria-label={`座席の確保 残り${Math.floor(sec / 60)}分${sec % 60}秒`}
    >
      <svg viewBox="0 0 36 36" className="h-8 w-8 shrink-0 -rotate-90" aria-hidden="true">
        <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeOpacity=".12" strokeWidth="3.5" className="text-white" />
        <circle
          cx="18"
          cy="18"
          r="15"
          fill="none"
          strokeWidth="3.5"
          strokeLinecap="round"
          className={urgent ? 'stroke-rose-400' : 'stroke-amber-300'}
          strokeDasharray={`${pct * 94.25} 94.25`}
          style={{ transition: 'stroke-dasharray .25s linear' }}
        />
      </svg>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-zinc-400">座席を確保しています</p>
        <p className={`font-mono text-lg font-semibold leading-tight tabular-nums ${urgent ? 'text-rose-300' : 'text-zinc-100'}`}>
          {String(Math.floor(sec / 60)).padStart(2, '0')}:{String(sec % 60).padStart(2, '0')}
        </p>
      </div>
      <Clock className={`h-4 w-4 ${urgent ? 'text-rose-300' : 'text-zinc-500'}`} aria-hidden="true" />
    </div>
  )
}

/* ---------------------------------- 本体 ---------------------------------- */

type Counts = { student: number; senior: number }

export function SeatBooking() {
  const reduce = !!useReducedMotion()
  const [rootRef, rootSize] = useSize<HTMLDivElement>()
  const [vpRef, vpSize] = useSize<HTMLDivElement>()
  const wide = (rootSize?.w ?? 1000) >= 760

  const [phase, setPhase] = useState<'select' | 'paying' | 'ticket'>('select')
  const [status, setStatus] = useState<Record<string, SeatStatus>>(initialStatus)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [focusId, setFocusId] = useState('G10')
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [kbTip, setKbTip] = useState(false)
  const [flashId, setFlashId] = useState<string | null>(null)
  const [suggested, setSuggested] = useState<Set<string>>(() => new Set())
  const [party, setParty] = useState(2)
  const [counts, setCounts] = useState<Counts>({ student: 0, senior: 0 })
  const [deadline, setDeadline] = useState<number | null>(null)
  const [notice, setNotice] = useState<{ id: number; text: string; tone: 'info' | 'warn' } | null>(null)
  const [sheet, setSheet] = useState(false)
  const [scale, setScale] = useState(1)
  const [tip, setTip] = useState<{ x: number; y: number; below: boolean } | null>(null)
  const [tipTick, setTipTick] = useState(0)

  const zoomRef = useRef<ReactZoomPanPinchRef>(null)
  const btns = useRef(new Map<string, HTMLButtonElement>())
  const down = useRef<{ x: number; y: number } | null>(null)
  const statusRef = useRef(status)
  const selectedRef = useRef(selected)
  useLayoutEffect(() => {
    statusRef.current = status
    selectedRef.current = selected
  })

  // 盤面全体が収まる倍率
  const fit = vpSize ? Math.max(0.3, Math.min(1.25, (vpSize.w - 16) / MAP_W, (vpSize.h - 8) / MAP_H)) : null
  useEffect(() => {
    if (fit == null) return
    zoomRef.current?.centerView(fit, 0)
  }, [fit])

  const say = useCallback((text: string, tone: 'info' | 'warn' = 'info') => setNotice({ id: Date.now(), text, tone }), [])
  useEffect(() => {
    if (!notice) return
    const t = window.setTimeout(() => setNotice(null), 2800)
    return () => window.clearTimeout(t)
  }, [notice])

  const selectedSeats = useMemo(() => SEATS.filter((s) => selected.has(s.id)), [selected])
  const people = selectedSeats.reduce((a, s) => a + s.span, 0)
  const student = Math.min(counts.student, people)
  const senior = Math.min(counts.senior, people - student)
  const general = people - student - senior
  const surcharge = selectedSeats.reduce((a, s) => a + KIND_INFO[s.kind].surcharge * s.span, 0)
  const base = general * 2000 + student * 1500 + senior * 1300
  const total = base + surcharge

  // 確保タイマー: 最初の 1 席で開始、0 席で停止
  useEffect(() => {
    if (people > 0 && deadline == null) setDeadline(Date.now() + HOLD_MS)
    if (people === 0 && deadline != null) setDeadline(null)
  }, [people, deadline])

  const onExpire = useCallback(() => {
    setSelected(new Set())
    setDeadline(null)
    setSheet(false)
    say('確保時間（5分）が過ぎたため、座席を解放しました', 'warn')
  }, [say])

  // 他のお客様の動き: 数秒ごとに空席が「選択中」になったり、選択中が販売済みになったりする
  useEffect(() => {
    if (phase !== 'select') return
    const rnd = mulberry32(99)
    const t = window.setInterval(() => {
      const st = statusRef.current
      const held = Object.keys(st).filter((k) => st[k] === 'held')
      const next = { ...st }
      let changed: string
      if (held.length > 5 && rnd() < 0.55) {
        changed = held[Math.floor(rnd() * held.length)]
        if (rnd() < 0.6) next[changed] = 'sold'
        else delete next[changed]
      } else {
        const free = SEATS.filter((s) => !st[s.id] && !selectedRef.current.has(s.id) && s.kind !== 'wheelchair')
        if (free.length < 30) return
        changed = free[Math.floor(rnd() * free.length)].id
        next[changed] = 'held'
      }
      setStatus(next)
      setFlashId(changed)
    }, 5200)
    return () => window.clearInterval(t)
  }, [phase])

  const setBtn = useCallback((id: string, el: HTMLButtonElement | null) => {
    if (el) btns.current.set(id, el)
    else btns.current.delete(id)
  }, [])

  const onSeatHover = useCallback((id: string | null) => {
    setHoverId(id)
    if (id) setKbTip(false)
  }, [])

  const onSeatClick = useCallback(
    (s: Seat, e: ReactMouseEvent) => {
      // ドラッグでパンしたあとの click は無視
      if (e.detail > 0 && down.current && Math.hypot(e.clientX - down.current.x, e.clientY - down.current.y) > 6) return
      setFocusId(s.id)
      setSuggested(new Set())
      const st = statusRef.current[s.id]
      const sel = selectedRef.current
      if (sel.has(s.id)) {
        const next = new Set(sel)
        next.delete(s.id)
        setSelected(next)
        return
      }
      if (st === 'sold') return say(`${s.label}は販売済みです`, 'warn')
      if (st === 'held') return say(`${s.label}は他のお客様が選択中です`, 'warn')
      const used = SEATS.reduce((a, x) => a + (sel.has(x.id) ? x.span : 0), 0)
      if (used + s.span > LIMIT) return say(`一度に選べるのは${LIMIT}席までです`, 'warn')
      const next = new Set(sel)
      next.add(s.id)
      setSelected(next)
      if (s.kind === 'wheelchair') say('車椅子スペースです。同伴の方は近くのお席をお選びください')
    },
    [say],
  )

  const removeSeat = (id: string) => {
    const next = new Set(selected)
    next.delete(id)
    setSelected(next)
  }

  const runSuggest = () => {
    const pick = suggestSeats(party, status)
    if (!pick) return say(`${party}席並びで空いているお席が見つかりませんでした`, 'warn')
    const ids = new Set(pick.map((s) => s.id))
    setSelected(ids)
    setSuggested(ids)
    setCounts({ student: 0, senior: 0 })
    setFocusId(pick[0].id)
    const first = pick[0]
    const last = pick[pick.length - 1]
    say(`${first.row}列 ${first.col}${pick.length > 1 ? `〜${last.col}` : ''}番をおすすめしました`)
    window.setTimeout(() => setSuggested(new Set()), 1400)
  }

  // キーボード: ロービングフォーカス
  const onGridKey = (e: ReactKeyboardEvent) => {
    const from = SEAT_BY_ID.get(focusId)
    if (!from) return
    const row = ROWS[from.ri]
    const i = row.indexOf(from)
    let to: Seat | undefined
    if (e.key === 'ArrowLeft') to = row[i - 1]
    else if (e.key === 'ArrowRight') to = row[i + 1]
    else if (e.key === 'Home') to = row[0]
    else if (e.key === 'End') to = row[row.length - 1]
    else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const ri = from.ri + (e.key === 'ArrowUp' ? -1 : 1)
      const r = ROWS[ri]
      if (r) to = r.reduce((b, s) => (Math.abs(cx(s) - cx(from)) < Math.abs(cx(b) - cx(from)) ? s : b), r[0])
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault()
      zoomRef.current?.zoomIn(0.4, 200)
      return
    } else if (e.key === '-') {
      e.preventDefault()
      zoomRef.current?.zoomOut(0.4, 200)
      return
    } else return
    e.preventDefault()
    if (!to) return
    setFocusId(to.id)
    setHoverId(null)
    setKbTip(true)
    const el = btns.current.get(to.id)
    el?.focus({ preventScroll: true })
    // 拡大中に画面外へ出たら追いかける
    const vp = vpRef.current
    if (el && vp && fit && scale > fit * 1.02) {
      const r = el.getBoundingClientRect()
      const v = vp.getBoundingClientRect()
      if (r.left < v.left + 8 || r.right > v.right - 8 || r.top < v.top + 8 || r.bottom > v.bottom - 8) {
        void zoomRef.current?.zoomToElement(el, scale, 220).then(() => setTipTick((t) => t + 1))
      }
    }
  }

  const tipId = hoverId ?? (kbTip ? focusId : null)
  useLayoutEffect(() => {
    if (!tipId) {
      setTip(null)
      return
    }
    const el = btns.current.get(tipId)
    const vp = vpRef.current
    if (!el || !vp) return
    const r = el.getBoundingClientRect()
    const v = vp.getBoundingClientRect()
    const x = Math.min(v.width - 90, Math.max(90, r.left - v.left + r.width / 2))
    const below = r.top - v.top < 74
    setTip({ x, y: below ? r.bottom - v.top + 8 : r.top - v.top - 8, below })
  }, [tipId, tipTick, scale, vpRef])

  const checkout = () => {
    if (!people) return
    setSheet(false)
    setPhase('paying')
    window.setTimeout(() => setPhase('ticket'), reduce ? 400 : 1300)
  }

  const restart = () => {
    setPhase('select')
    setSelected(new Set())
    setCounts({ student: 0, senior: 0 })
    setStatus(initialStatus())
  }

  const onRootKey = (e: ReactKeyboardEvent) => {
    if (e.key === 'Escape') {
      if (sheet) {
        e.stopPropagation()
        setSheet(false)
      } else if (kbTip) setKbTip(false)
    }
  }

  const orderNo = useMemo(() => {
    const h = hashStr([...selected].join(',') + 'lumina').toString(36).toUpperCase().padStart(7, '0')
    return `LM-${h.slice(0, 4)}-${h.slice(4, 7)}`
  }, [selected])

  const tipSeat = tipId ? SEAT_BY_ID.get(tipId) : undefined
  const fade = reduce ? { duration: 0.15 } : { type: 'spring' as const, stiffness: 380, damping: 32 }

  const summary = (
    <Summary
      seats={selectedSeats}
      people={people}
      general={general}
      student={student}
      senior={senior}
      surcharge={surcharge}
      total={total}
      deadline={deadline}
      onExpire={onExpire}
      onRemove={removeSeat}
      onClear={() => setSelected(new Set())}
      setCounts={(c) => setCounts({ student: Math.max(0, c.student), senior: Math.max(0, c.senior) })}
      onCheckout={checkout}
      paying={phase === 'paying'}
    />
  )

  return (
    <div
      ref={rootRef}
      onKeyDown={onRootKey}
      className="@container relative flex h-full w-full flex-col overflow-hidden bg-[#0a0a12] text-zinc-100 [font-feature-settings:'palt']"
      style={{ backgroundImage: 'radial-gradient(120% 60% at 50% -10%, rgba(99,102,241,.18), transparent 60%), radial-gradient(60% 50% at 100% 100%, rgba(244,63,94,.08), transparent 70%)' }}
    >
      <style>{`
        @keyframes sb-pop { 0% { transform: scale(.6) } 60% { transform: scale(1.18) } 100% { transform: scale(1) } }
        @keyframes sb-flash { 0% { box-shadow: 0 0 0 0 rgba(252,211,77,.9) } 100% { box-shadow: 0 0 0 10px rgba(252,211,77,0) } }
        @keyframes sb-scan { 0% { transform: translateY(-4%) } 100% { transform: translateY(104%) } }
      `}</style>

      {/* ヘッダー */}
      <header className="flex shrink-0 items-center gap-3 border-b border-white/[0.07] px-3 py-2.5 @3xl:px-5">
        <BrandMark className="hidden h-7 w-7 shrink-0 @md:block" />
        <div className="hidden min-w-0 flex-col leading-tight @3xl:flex">
          <span className="text-[13px] font-bold tracking-wide">LUMINA</span>
          <span className="text-[10px] text-zinc-500">ルミナシネマ 汐見ベイ</span>
        </div>
        <span className="hidden h-8 w-px bg-white/10 @3xl:block" />
        <div className="h-10 w-7 shrink-0 overflow-hidden rounded-[4px] ring-1 ring-white/15">
          <PosterArt className="h-full w-full" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
            潮騒のアーカイブ
            <span className="rounded border border-white/20 px-1 text-[9px] font-medium leading-4 text-zinc-300">G</span>
            <span className="hidden rounded bg-white/10 px-1 text-[9px] font-medium leading-4 text-zinc-300 @md:inline">字幕</span>
          </p>
          <p className="truncate text-[11px] text-zinc-400">
            11月14日(土) <span className="font-semibold text-zinc-200">18:40</span>〜20:48 ・ スクリーン5
          </p>
        </div>
        <ol className="hidden items-center gap-1.5 text-[11px] @3xl:flex" aria-label="購入の手順">
          {['座席・券種', 'お支払い', 'チケット'].map((l, i) => {
            const cur = phase === 'ticket' ? 2 : phase === 'paying' ? 1 : 0
            return (
              <li key={l} className="flex items-center gap-1.5" aria-current={i === cur ? 'step' : undefined}>
                {i > 0 && <span className={`h-px w-5 ${i <= cur ? 'bg-rose-400/70' : 'bg-white/15'}`} />}
                <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${i < cur ? 'bg-rose-500 text-white' : i === cur ? 'bg-white text-zinc-900' : 'bg-white/10 text-zinc-500'}`}>
                  {i < cur ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
                </span>
                <span className={i === cur ? 'text-zinc-100' : 'text-zinc-500'}>{l}</span>
              </li>
            )
          })}
        </ol>
      </header>

      <AnimatePresence mode="wait" initial={false}>
        {phase !== 'ticket' ? (
          <motion.div key="select" className="flex min-h-0 flex-1" exit={{ opacity: 0, y: reduce ? 0 : -12 }} transition={{ duration: 0.25 }}>
            {/* 座席表エリア */}
            <section className="relative flex min-w-0 flex-1 flex-col" aria-label="座席表">
              <div className="flex shrink-0 items-center gap-2 px-3 pt-2.5 @3xl:px-4">
                <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] py-1 pl-3 pr-1">
                  <span className="hidden text-[11px] text-zinc-400 @md:inline">おまかせ</span>
                  <Stepper
                    size="sm"
                    label="人数"
                    value={party}
                    onDec={() => setParty((p) => Math.max(1, p - 1))}
                    onInc={() => setParty((p) => Math.min(LIMIT, p + 1))}
                    decDisabled={party <= 1}
                    incDisabled={party >= LIMIT}
                  />
                  <span className="text-[11px] text-zinc-400">名</span>
                  <button
                    type="button"
                    onClick={runSuggest}
                    className="ml-1 flex items-center gap-1 rounded-full bg-gradient-to-r from-rose-500 to-fuchsia-500 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-[0_4px_14px_-4px_rgba(244,63,94,.7)] transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span className="hidden @sm:inline">ベスト席を</span>提案
                  </button>
                </div>
                <div className="ml-auto flex items-center gap-0.5 rounded-full border border-white/10 bg-white/[0.03] p-0.5">
                  <button type="button" aria-label="縮小" onClick={() => zoomRef.current?.zoomOut(0.4, 200)} disabled={!!fit && scale <= fit * 1.01} className="grid h-7 w-7 place-items-center rounded-full text-zinc-300 transition hover:bg-white/10 disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-rose-400">
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-10 text-center text-[10px] tabular-nums text-zinc-400" aria-live="polite">
                    {fit ? Math.round((scale / fit) * 100) : 100}%
                  </span>
                  <button type="button" aria-label="拡大" onClick={() => zoomRef.current?.zoomIn(0.4, 200)} disabled={!!fit && scale >= fit * 2.95} className="grid h-7 w-7 place-items-center rounded-full text-zinc-300 transition hover:bg-white/10 disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-rose-400">
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" aria-label="全体を表示" onClick={() => fit && zoomRef.current?.centerView(fit, 250)} className="grid h-7 w-7 place-items-center rounded-full text-zinc-300 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-rose-400">
                    <Maximize2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div
                ref={vpRef}
                className="relative min-h-0 flex-1 touch-none select-none"
                onPointerDownCapture={(e) => (down.current = { x: e.clientX, y: e.clientY })}
                onPointerMove={() => kbTip && setKbTip(false)}
              >
                {fit != null && (
                  <TransformWrapper
                    ref={zoomRef}
                    initialScale={fit}
                    minScale={fit}
                    maxScale={fit * 3}
                    centerOnInit
                    limitToBounds
                    centerZoomedOut
                    doubleClick={{ disabled: true }}
                    wheel={{ activationKeys: ['Control', 'Meta'], step: 0.15 }}
                    panning={{ velocityDisabled: true }}
                    onTransform={(_, s) => {
                      setScale(Math.round(s.scale * 1000) / 1000)
                      setHoverId(null)
                    }}
                  >
                    <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: MAP_W, height: MAP_H }}>
                      <div role="group" aria-label="座席表。矢印キーで移動、Enter で選択、+ − で拡大縮小" onKeyDown={onGridKey}>
                        <SeatGrid
                          status={status}
                          selected={selected}
                          focusId={focusId}
                          flashId={flashId}
                          suggested={suggested}
                          reduce={reduce}
                          onSeatClick={onSeatClick}
                          onSeatHover={onSeatHover}
                          setBtn={setBtn}
                        />
                      </div>
                    </TransformComponent>
                  </TransformWrapper>
                )}

                {/* ツールチップ */}
                <AnimatePresence>
                  {tip && tipSeat && (
                    <motion.div
                      key="tip"
                      role="tooltip"
                      initial={{ opacity: 0, scale: 0.94 }}
                      animate={{ opacity: 1, scale: 1, left: tip.x, top: tip.y }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: reduce ? 0 : 0.12 }}
                      className={`pointer-events-none absolute z-20 w-max -translate-x-1/2 ${tip.below ? '' : '-translate-y-full'}`}
                    >
                      <SeatTip seat={tipSeat} st={status[tipSeat.id]} sel={selected.has(tipSeat.id)} />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* トースト */}
                <AnimatePresence>
                  {notice && (
                    <motion.div
                      key={notice.id}
                      role="status"
                      initial={{ opacity: 0, y: reduce ? 0 : 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: reduce ? 0 : 6 }}
                      className={`pointer-events-none absolute bottom-2 left-1/2 z-30 flex max-w-[calc(100%-24px)] -translate-x-1/2 items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs shadow-xl backdrop-blur ${notice.tone === 'warn' ? 'border-amber-300/30 bg-amber-950/80 text-amber-100' : 'border-white/15 bg-zinc-900/90 text-zinc-100'}`}
                    >
                      {notice.tone === 'warn' ? <Info className="h-3.5 w-3.5 shrink-0" /> : <Sparkles className="h-3.5 w-3.5 shrink-0 text-rose-300" />}
                      <span className="truncate">{notice.text}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 凡例 */}
              <ul className="flex shrink-0 items-center gap-x-3.5 overflow-x-auto px-3 pb-2 pt-1 text-[10px] text-zinc-400 [scrollbar-width:none] @3xl:justify-center @3xl:px-4" aria-label="凡例">
                {[
                  ['bg-gradient-to-b from-[#4a4a60] to-[#34344a] rounded-[4px_4px_2px_2px]', '空席'],
                  ['bg-gradient-to-b from-[#c99a45] to-[#8a6424] rounded-[4px_4px_2px_2px]', 'プレミアム +¥800'],
                  ['bg-gradient-to-b from-[#5b63c9] to-[#373d8c] rounded-[4px_4px_2px_2px] w-6', 'ペアソファ +¥1,000/人'],
                  ['border border-sky-400/70 bg-sky-400/10 rounded-[3px]', '車椅子'],
                  ['bg-rose-500 rounded-[4px_4px_2px_2px]', '選択中'],
                  ['border border-amber-300/30 bg-[repeating-linear-gradient(135deg,rgba(252,211,77,.4)_0_2px,transparent_2px_4px)] rounded-[4px_4px_2px_2px]', '他の方が選択中'],
                  ['bg-white/[0.07] rounded-[4px_4px_2px_2px]', '販売済み'],
                ].map(([c, l]) => (
                  <li key={l} className="flex shrink-0 items-center gap-1.5">
                    <span className={`inline-block h-3 w-3 ${c}`} />
                    {l}
                  </li>
                ))}
              </ul>

              {/* 狭い幅: 下部バー */}
              {!wide && (
                <div className="flex shrink-0 items-center gap-3 border-t border-white/[0.07] bg-[#0d0d16]/95 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] text-zinc-400">
                      {people ? selectedSeats.map((s) => s.label.replace('列 ', '-').replace('番', '')).join('、') : '座席を選んでください'}
                    </p>
                    <p className="text-base font-semibold tabular-nums">
                      <NumberFlow value={total} locales="ja-JP" format={{ style: 'currency', currency: 'JPY' }} />
                      <span className="ml-1.5 text-[11px] font-normal text-zinc-500">{people}/{LIMIT}席</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!people}
                    onClick={() => setSheet(true)}
                    className="flex items-center gap-1.5 rounded-full bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_20px_-6px_rgba(244,63,94,.8)] transition hover:bg-rose-400 disabled:bg-white/10 disabled:text-zinc-500 disabled:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"
                  >
                    <Ticket className="h-4 w-4" /> 券種を選ぶ
                  </button>
                </div>
              )}
            </section>

            {/* 広い幅: 右パネル */}
            {wide && <aside className="flex w-[320px] shrink-0 flex-col border-l border-white/[0.07] bg-white/[0.015]">{summary}</aside>}

            {/* 狭い幅: シート */}
            <AnimatePresence>
              {!wide && sheet && (
                <>
                  <motion.button
                    key="scrim"
                    type="button"
                    aria-label="閉じる"
                    className="absolute inset-0 z-40 bg-black/60"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setSheet(false)}
                  />
                  <motion.div
                    key="sheet"
                    role="dialog"
                    aria-modal="true"
                    aria-label="券種とお支払い"
                    className="absolute inset-x-0 bottom-0 z-50 flex max-h-[86%] flex-col rounded-t-2xl border-t border-white/10 bg-[#11111b] shadow-2xl"
                    initial={reduce ? { opacity: 0 } : { y: '100%' }}
                    animate={reduce ? { opacity: 1 } : { y: 0 }}
                    exit={reduce ? { opacity: 0 } : { y: '100%' }}
                    transition={fade}
                  >
                    <div className="flex items-center justify-between px-4 pb-1 pt-3">
                      <span className="mx-auto h-1 w-10 rounded-full bg-white/20" aria-hidden="true" />
                    </div>
                    <button type="button" autoFocus aria-label="閉じる" onClick={() => setSheet(false)} className="absolute right-3 top-2.5 grid h-8 w-8 place-items-center rounded-full text-zinc-400 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-rose-400">
                      <X className="h-4 w-4" />
                    </button>
                    {summary}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <TicketView
            key="ticket"
            wide={wide}
            reduce={reduce}
            seats={selectedSeats}
            general={general}
            student={student}
            senior={senior}
            total={total}
            orderNo={orderNo}
            onRestart={restart}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function SeatTip({ seat, st, sel }: { seat: Seat; st?: SeatStatus; sel: boolean }) {
  const k = KIND_INFO[seat.kind]
  return (
    <div className="rounded-lg border border-white/15 bg-zinc-900/95 px-3 py-2 text-left shadow-[0_10px_30px_-8px_rgba(0,0,0,.8)] backdrop-blur">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-zinc-50">
        <span className={`h-1.5 w-1.5 rounded-full ${k.dot}`} />
        {seat.label}
        <span className="font-normal text-zinc-400">{k.name}</span>
      </p>
      <p className="mt-0.5 text-[11px] text-zinc-400">
        {st === 'sold' ? (
          <span className="text-zinc-500">販売済み</span>
        ) : st === 'held' && !sel ? (
          <span className="text-amber-300">他のお客様が選択中</span>
        ) : (
          <>
            一般 <span className="font-semibold text-zinc-100">{yen((2000 + k.surcharge) * seat.span)}</span>
            {seat.span === 2 && <span className="text-zinc-500">（2名）</span>}
            {k.surcharge > 0 && <span className="text-zinc-500"> ・ 指定料込み</span>}
            {sel && <span className="ml-1 text-rose-300">選択中</span>}
          </>
        )}
      </p>
    </div>
  )
}

/* ---------------------------------- サマリー ---------------------------------- */

function Summary(p: {
  seats: Seat[]
  people: number
  general: number
  student: number
  senior: number
  surcharge: number
  total: number
  deadline: number | null
  onExpire: () => void
  onRemove: (id: string) => void
  onClear: () => void
  setCounts: (c: Counts) => void
  onCheckout: () => void
  paying: boolean
}) {
  const reduce = useReducedMotion()
  const counts = { general: p.general, student: p.student, senior: p.senior }
  const premium = p.seats.filter((s) => s.kind === 'premium').length
  const sofa = p.seats.filter((s) => s.kind === 'sofa').length
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-3 pt-3 [scrollbar-width:thin]">
        {p.deadline != null && <HoldTimer deadline={p.deadline} onExpire={p.onExpire} />}

        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-xs font-semibold text-zinc-300">
              選択中の座席 <span className="ml-1 tabular-nums text-zinc-500">{p.people}/{LIMIT}</span>
            </h3>
            {p.people > 0 && (
              <button type="button" onClick={p.onClear} className="rounded text-[11px] text-zinc-500 hover:text-zinc-200 focus-visible:outline-2 focus-visible:outline-rose-400">
                すべて解除
              </button>
            )}
          </div>
          {p.seats.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-white/10 px-3 py-3 text-[11px] leading-relaxed text-zinc-500">
              <svg viewBox="0 0 40 30" className="h-7 w-9 shrink-0" aria-hidden="true">
                <rect x="2" y="4" width="10" height="9" rx="2.5" className="fill-zinc-700" />
                <rect x="15" y="4" width="10" height="9" rx="2.5" className="fill-rose-500" />
                <rect x="28" y="4" width="10" height="9" rx="2.5" className="fill-zinc-700" />
                <rect x="2" y="17" width="10" height="9" rx="2.5" className="fill-zinc-800" />
                <rect x="15" y="17" width="10" height="9" rx="2.5" className="fill-zinc-700" />
                <rect x="28" y="17" width="10" height="9" rx="2.5" className="fill-zinc-700" />
              </svg>
              座席表からお席を選ぶか、「おまかせ」で人数を指定してください。
            </div>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              <AnimatePresence mode="popLayout" initial={false}>
                {p.seats.map((s) => (
                  <motion.li
                    key={s.id}
                    layout={!reduce}
                    initial={{ opacity: 0, scale: reduce ? 1 : 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: reduce ? 1 : 0.7 }}
                    className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] py-1 pl-2.5 pr-1 text-xs"
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${KIND_INFO[s.kind].dot}`} />
                    <span className="font-semibold">{s.label.replace('列 ', '-').replace('番', '')}</span>
                    <button type="button" aria-label={`${s.label}を解除`} onClick={() => p.onRemove(s.id)} className="grid h-5 w-5 place-items-center rounded-full text-zinc-500 hover:bg-white/10 hover:text-zinc-100 focus-visible:outline-2 focus-visible:outline-rose-400">
                      <X className="h-3 w-3" />
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </section>

        <section aria-label="券種">
          <h3 className="mb-1.5 text-xs font-semibold text-zinc-300">券種</h3>
          <ul className="divide-y divide-white/[0.06] rounded-xl border border-white/10 bg-white/[0.02]">
            {TICKET_TYPES.map((t) => {
              const v = counts[t.id]
              return (
                <li key={t.id} className="flex items-center gap-2 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium">
                      {t.label} <span className="ml-1 text-xs font-normal text-zinc-400">{yen(t.price)}</span>
                    </p>
                    <p className="text-[10px] text-zinc-500">{t.id === 'general' ? '残りの人数が自動で一般になります' : t.note}</p>
                  </div>
                  {t.id === 'general' ? (
                    <span className="w-[86px] text-center text-sm font-semibold tabular-nums text-zinc-100">{v}</span>
                  ) : (
                    <Stepper
                      label={t.label}
                      value={v}
                      onDec={() => p.setCounts({ student: p.student - (t.id === 'student' ? 1 : 0), senior: p.senior - (t.id === 'senior' ? 1 : 0) })}
                      onInc={() => p.setCounts({ student: p.student + (t.id === 'student' ? 1 : 0), senior: p.senior + (t.id === 'senior' ? 1 : 0) })}
                      decDisabled={v <= 0}
                      incDisabled={p.general <= 0}
                    />
                  )}
                </li>
              )
            })}
          </ul>
          {(p.student > 0 || p.senior > 0) && <p className="mt-1.5 text-[10px] text-zinc-500">入場時に学生証・年齢の確認できるものをご提示ください。</p>}
        </section>

        <section className="space-y-1 text-xs text-zinc-400" aria-label="料金内訳">
          <div className="flex justify-between">
            <span>鑑賞料金</span>
            <span className="tabular-nums text-zinc-300">{yen(p.general * 2000 + p.student * 1500 + p.senior * 1300)}</span>
          </div>
          {premium > 0 && (
            <div className="flex justify-between">
              <span>プレミアム指定料 × {premium}</span>
              <span className="tabular-nums text-zinc-300">{yen(premium * 800)}</span>
            </div>
          )}
          {sofa > 0 && (
            <div className="flex justify-between">
              <span>ペアソファ指定料 × {sofa * 2}名</span>
              <span className="tabular-nums text-zinc-300">{yen(sofa * 2000)}</span>
            </div>
          )}
        </section>
      </div>

      <div className="shrink-0 border-t border-white/[0.07] px-4 pb-4 pt-3">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-xs text-zinc-400">合計（税込）</span>
          <span className="text-2xl font-bold tabular-nums tracking-tight">
            <NumberFlow value={p.total} locales="ja-JP" format={{ style: 'currency', currency: 'JPY' }} />
          </span>
        </div>
        <button
          type="button"
          disabled={!p.people || p.paying}
          onClick={p.onCheckout}
          className="relative flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-rose-500 text-sm font-semibold text-white shadow-[0_10px_30px_-10px_rgba(244,63,94,.9)] transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-zinc-500 disabled:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"
        >
          {p.paying ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" /> 決済しています…
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4" /> {p.people ? `${p.people}枚を購入する` : '座席を選択してください'}
            </>
          )}
        </button>
        <p className="mt-2 text-center text-[10px] text-zinc-600">登録済みのカード（ルミナペイ •••• 4021）で決済されます</p>
      </div>
    </div>
  )
}

/* ---------------------------------- 電子チケット ---------------------------------- */

const notchMask = (edge: 'top' | 'bottom'): CSSProperties => {
  const y = edge === 'top' ? '0' : '100%'
  const m = `radial-gradient(circle at 0 ${y}, transparent 11px, #000 11.5px) left / 51% 100% no-repeat, radial-gradient(circle at 100% ${y}, transparent 11px, #000 11.5px) right / 51% 100% no-repeat`
  return { mask: m, WebkitMask: m }
}

function TicketView({
  wide,
  reduce,
  seats,
  general,
  student,
  senior,
  total,
  orderNo,
  onRestart,
}: {
  wide: boolean
  reduce: boolean
  seats: Seat[]
  general: number
  student: number
  senior: number
  total: number
  orderNo: string
  onRestart: () => void
}) {
  const [torn, setTorn] = useState(false)
  const [wallet, setWallet] = useState<'idle' | 'adding' | 'added'>('idle')
  const [sheen, setSheen] = useState(0)
  const qr = useMemo(() => qrPath(orderNo), [orderNo])
  const seatText = seats.map((s) => s.label.replace('列 ', '-').replace('番', '')).join(', ')
  const typeText = [general && `一般×${general}`, student && `学生×${student}`, senior && `シニア×${senior}`].filter(Boolean).join('　')
  const people = general + student + senior

  const tear = () => setTorn(true)
  const addWallet = () => {
    if (wallet !== 'idle') return
    setWallet('adding')
    setSheen((s) => s + 1)
    window.setTimeout(() => setWallet('added'), reduce ? 200 : 900)
  }

  const ticket = (
    <div className="relative" style={{ clipPath: 'inset(0 -200px -600px -200px)' }}>
      <motion.div
        initial={reduce ? { opacity: 0 } : { y: -440 }}
        animate={reduce ? { opacity: 1 } : { y: 0 }}
        transition={reduce ? { duration: 0.2 } : { type: 'spring', stiffness: 70, damping: 16, delay: 0.15 }}
        className="relative w-[288px] drop-shadow-[0_24px_40px_rgba(0,0,0,.55)]"
      >
        {/* 本券 */}
        <div className="relative overflow-hidden rounded-t-2xl bg-[#14141f] ring-1 ring-inset ring-white/10" style={notchMask('bottom')}>
          <div className="relative h-[84px]">
            <PosterArt className="absolute inset-0 h-full w-full" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#14141f] via-transparent to-black/20" />
            <div className="absolute left-3 top-2.5 flex items-center gap-1.5">
              <BrandMark className="h-5 w-5" />
              <span className="text-[10px] font-bold tracking-[0.2em] text-white/90">LUMINA</span>
            </div>
            <span className="absolute right-3 top-2.5 rounded-full bg-black/35 px-2 py-0.5 text-[9px] font-semibold tracking-[0.18em] text-white/85 backdrop-blur">E-TICKET</span>
          </div>
          <div className="px-4 pb-3">
            <h3 className="text-[17px] font-bold leading-tight tracking-tight">潮騒のアーカイブ</h3>
            <p className="text-[10px] text-zinc-500">字幕 ・ G ・ 128分</p>
            <div className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[11px]">
              <span className="text-zinc-500">日時</span>
              <span className="font-semibold">
                2026.11.14 SAT <span className="text-rose-300">18:40</span>
                <span className="font-normal text-zinc-500"> – 20:48</span>
              </span>
              <span className="text-zinc-500">劇場</span>
              <span>汐見ベイ ・ スクリーン5</span>
              <span className="text-zinc-500">座席</span>
              <span className="font-semibold">{seatText}</span>
              <span className="text-zinc-500">券種</span>
              <span>{typeText}</span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="relative h-[92px] w-[92px] shrink-0 overflow-hidden rounded-lg bg-white p-1">
                <motion.svg
                  viewBox="0 0 25 25"
                  className="h-full w-full"
                  shapeRendering="crispEdges"
                  aria-label={`入場用コード ${orderNo}`}
                  role="img"
                  initial={reduce ? { opacity: 0 } : { clipPath: 'inset(0 0 100% 0)' }}
                  animate={reduce ? { opacity: torn ? 0.25 : 1 } : { clipPath: 'inset(0 0 0% 0)', opacity: torn ? 0.25 : 1 }}
                  transition={{ duration: 0.7, delay: reduce ? 0 : 0.9, ease: 'easeOut' }}
                >
                  <path d={qr} fill="#111" />
                </motion.svg>
                {!reduce && !torn && (
                  <span className="pointer-events-none absolute inset-x-1 top-0 h-full" style={{ animation: 'sb-scan 2.2s 1.8s ease-in-out infinite alternate' }}>
                    <span className="block h-0.5 w-full rounded-full bg-rose-500/70 shadow-[0_0_8px_2px_rgba(244,63,94,.5)]" />
                  </span>
                )}
                <AnimatePresence>
                  {torn && (
                    <motion.div
                      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.8, rotate: -4 }}
                      animate={{ opacity: 1, scale: 1, rotate: -14 }}
                      transition={reduce ? { duration: 0.15 } : { type: 'spring', stiffness: 500, damping: 18, delay: 0.25 }}
                      className="absolute inset-0 grid place-items-center"
                    >
                      <span className="rounded-md border-[2.5px] border-rose-600 px-1.5 py-0.5 text-sm font-black tracking-widest text-rose-600">入場済</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="min-w-0 text-[10px] leading-relaxed text-zinc-400">
                <p className="text-zinc-500">予約番号</p>
                <p className="font-mono text-[13px] font-semibold tracking-wider text-zinc-100">{orderNo}</p>
                <p className="mt-1">{torn ? '入場が確認されました。上映をお楽しみください。' : `入場口でこのコードをかざしてください（${people}名分）`}</p>
              </div>
            </div>
          </div>
          {/* ウォレット追加時のきらめき */}
          {sheen > 0 && !reduce && (
            <motion.span
              key={sheen}
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent"
              initial={{ x: 0, skewX: -18 }}
              animate={{ x: '320%' }}
              transition={{ duration: 0.9, ease: 'easeInOut' }}
            />
          )}
        </div>
        {/* 半券 */}
        <motion.div
          role="button"
          tabIndex={torn ? -1 : 0}
          aria-label="半券をもぎって入場する"
          aria-disabled={torn || undefined}
          onKeyDown={(e) => {
            if (!torn && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault()
              tear()
            }
          }}
          drag={torn ? false : 'y'}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.55 }}
          dragSnapToOrigin
          onDragEnd={(_, info) => info.offset.y > 36 && tear()}
          animate={torn ? (reduce ? { opacity: 0 } : { y: 190, rotate: 11, x: 26, opacity: 0 }) : { y: 0, rotate: 0, x: 0, opacity: 1 }}
          transition={torn ? { duration: reduce ? 0.2 : 0.75, ease: [0.5, 0, 0.75, 0] } : { type: 'spring', stiffness: 400, damping: 30 }}
          className={`relative flex h-[62px] items-center gap-3 rounded-b-2xl bg-[#1b1b29] px-4 outline-none ring-1 ring-inset ring-white/10 focus-visible:ring-2 focus-visible:ring-rose-400 ${torn ? '' : 'cursor-grab active:cursor-grabbing'}`}
          style={{ ...notchMask('top'), touchAction: 'none' }}
        >
          <span className="absolute inset-x-4 top-0 border-t-2 border-dashed border-white/15" aria-hidden="true" />
          <TicketCheck className="h-5 w-5 shrink-0 text-rose-300" aria-hidden="true" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-[9px] font-semibold tracking-[0.2em] text-zinc-500">ADMIT {people}</p>
            <p className="truncate text-xs font-semibold">SCREEN 5 ・ {seatText}</p>
          </div>
          <span className="shrink-0 text-[9px] text-zinc-500">↓ もぎる</span>
        </motion.div>
      </motion.div>
    </div>
  )

  const actions = (
    <div className="w-full max-w-[300px] space-y-3">
      <motion.div
        initial={{ opacity: 0, y: reduce ? 0 : 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduce ? 0 : 0.6 }}
        className="flex items-center gap-2.5"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-300">
          <Check className="h-5 w-5" strokeWidth={3} />
        </span>
        <div>
          <p className="text-sm font-semibold">購入が完了しました</p>
          <p className="text-[11px] text-zinc-400">確認メールを送信しました ・ 合計 {yen(total)}</p>
        </div>
      </motion.div>
      <button
        type="button"
        onClick={addWallet}
        disabled={wallet !== 'idle'}
        className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${wallet === 'added' ? 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/30' : 'bg-white text-zinc-900 hover:bg-zinc-200'}`}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={wallet} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }} className="flex items-center gap-2">
            {wallet === 'idle' && (
              <>
                <Wallet className="h-4 w-4" /> ウォレットに追加
              </>
            )}
            {wallet === 'adding' && (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" /> 追加しています…
              </>
            )}
            {wallet === 'added' && (
              <>
                <Check className="h-4 w-4" strokeWidth={3} /> ウォレットに追加しました
              </>
            )}
          </motion.span>
        </AnimatePresence>
      </button>
      <button
        type="button"
        onClick={tear}
        disabled={torn}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] text-sm text-zinc-200 transition hover:bg-white/10 disabled:text-zinc-500 focus-visible:outline-2 focus-visible:outline-rose-400"
      >
        <TicketCheck className="h-4 w-4" /> {torn ? '入場済み' : '半券をもぎって入場（デモ）'}
      </button>
      <button type="button" onClick={onRestart} className="mx-auto flex items-center gap-1 rounded text-xs text-zinc-500 hover:text-zinc-200 focus-visible:outline-2 focus-visible:outline-rose-400">
        <ChevronLeft className="h-3.5 w-3.5" /> 座席選択からやり直す
      </button>
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden ${wide ? 'flex items-start justify-center gap-12 px-8' : 'flex flex-col items-center gap-5 px-4 pb-6'}`}
    >
      <div className="flex shrink-0 flex-col items-center pt-3">
        {/* 発券口 */}
        <div className="relative z-10 h-2.5 w-[320px] rounded-full bg-black shadow-[inset_0_2px_4px_rgba(0,0,0,.9),0_1px_0_rgba(255,255,255,.08)]" aria-hidden="true" />
        <div className="-mt-1">{ticket}</div>
      </div>
      <div className={wide ? 'flex h-full items-center' : ''}>{actions}</div>
    </motion.div>
  )
}
