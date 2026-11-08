import confetti from 'canvas-confetti'
import { AnimatePresence, animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, type Transition } from 'motion/react'
import {
  Archive,
  Bike,
  CalendarClock,
  Check,
  ChevronRight,
  Clock,
  CreditCard,
  DoorClosed,
  Download,
  FileText,
  Gauge,
  Hand,
  House,
  Lock,
  MapPin,
  MessageCircle,
  PackageOpen,
  Pause,
  Pencil,
  Phone,
  PhoneOff,
  Play,
  ReceiptText,
  RotateCcw,
  Send,
  Star,
  Truck,
  Warehouse,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'

/**
 * 架空のストア「TOMOSHI」の注文追跡ページ。配送会社「ハヤテ便」・地名・ドライバー・商品はすべて架空。
 * - 進行は「ティック」の配列(注文確定 → 梱包 → 引き渡し → ベース到着 → 配達出発 → 近く → まもなく → 完了)で表し、
 *   「進行をシミュレート」で 1 つずつ、「自動再生」で 2.4 秒ごとに進む。各ティックが追跡履歴のイベント・ステッパーの段階・地図上の位置を持つ
 * - ステッパーは 5 段階。進捗線は「段階 + 配達中の道のり」の連続値で spring 補間し、完了した丸はチェックが線を描くように現れ、現在地は脈打つ
 * - 地図は道路・川・公園・街区を描いたインライン SVG(外部タイルなし)。preserveAspectRatio="meet" で viewBox の外にも街を描いておき、
 *   カードの縦横比が変わっても余白が出ない。配送ルートは折れ線で、motion value を animate() で動かし、変化のたびに折れ線上の座標を計算して
 *   トラックの transform と「走行済み」線の strokeDashoffset を ref で直接書き換える(React の再レンダーなし)
 * - ルート上の他のお届け先は通過するとチェックに変わり、「あと n 件先」を数える。ETA は時間帯に合わせて計算し、配達中は残り分数を出す
 * - 受け取り設定タブで時間帯(配達出発後はロック)と置き配の場所を変更 → 確認ダイアログ(alertdialog)→ 追跡履歴に変更イベントが追加される
 * - ドライバーに連絡: 定型文チップか自由入力で送ると、入力中インジケーターのあと返信が届く。電話は発信中 → 通話中 → 終了の擬似表示
 * - 配達完了で canvas-confetti(デモ内の canvas にバインド)と、置き配の場所ごとに描き分けた配達証明写真(SVG・タイムスタンプ入り)のモーダル
 * - 注文内容タブに商品・金額・支払い、領収書はギザギザの紙のモーダル。Esc で一番上のオーバーレイを閉じる(デモ内にフォーカスがあるときのみ)
 * - useReducedMotion 時は紙吹雪・トラックの移動アニメ・スライドをやめ、短いフェードと即時の位置更新にする
 */

/* ───────────── データ ───────────── */

const ACCENT = '#245b52'
const COURIER = '#e4682f'

type SlotId = 'am' | '14' | '16' | '18' | '19'
const SLOTS: { id: SlotId; label: string; range: string; start: number }[] = [
  { id: 'am', label: '午前中', range: '8:00–12:00', start: 9 * 60 },
  { id: '14', label: '14–16時', range: '14:00–16:00', start: 14 * 60 },
  { id: '16', label: '16–18時', range: '16:00–18:00', start: 16 * 60 },
  { id: '18', label: '18–20時', range: '18:00–20:00', start: 18 * 60 },
  { id: '19', label: '19–21時', range: '19:00–21:00', start: 19 * 60 },
]

type PlaceId = 'door' | 'box' | 'meter' | 'bike' | 'hand'
const PLACES: { id: PlaceId; label: string; note: string; icon: LucideIcon }[] = [
  { id: 'door', label: '玄関前', note: 'ドアの前に置きます', icon: DoorClosed },
  { id: 'box', label: '宅配ボックス', note: '空きがない場合は玄関前', icon: Archive },
  { id: 'meter', label: 'メーターボックス', note: '扉の中に収めます', icon: Gauge },
  { id: 'bike', label: '自転車のかご', note: 'カバーをかけて置きます', icon: Bike },
  { id: 'hand', label: '置き配しない', note: '対面で手渡し', icon: Hand },
]

const STAGES: { label: string; icon: LucideIcon }[] = [
  { label: '注文確定', icon: ReceiptText },
  { label: '発送準備中', icon: PackageOpen },
  { label: '発送済み', icon: Warehouse },
  { label: '配達中', icon: Truck },
  { label: '配達完了', icon: House },
]

type Tick = { stage: number; date: string; at: number | ((slotStart: number) => number); title: string; detail: string; progress: number; minutes?: number }
const TICKS: Tick[] = [
  { stage: 0, date: '11/6', at: 21 * 60 + 14, title: 'ご注文を受け付けました', detail: 'TOMOSHI オンラインストア', progress: 0 },
  { stage: 1, date: '11/7', at: 9 * 60 + 2, title: '発送準備を開始しました', detail: 'あけぼの物流センター', progress: 0 },
  { stage: 1, date: '11/7', at: 15 * 60 + 40, title: '梱包が完了しました', detail: '段ボール 1 個口・2.1kg', progress: 0 },
  { stage: 2, date: '11/7', at: 18 * 60 + 26, title: 'ハヤテ便に引き渡しました', detail: '伝票番号 4821-0937-5520', progress: 0 },
  { stage: 2, date: '11/8', at: 6 * 60 + 48, title: 'みなと台ベースに到着しました', detail: '配達を担当する営業所です', progress: 0 },
  { stage: 3, date: '11/8', at: (s) => s - 55, title: '配達に出発しました', detail: '担当ドライバー:佐伯', progress: 0.05, minutes: 52 },
  { stage: 3, date: '11/8', at: (s) => s - 19, title: '近くまで来ています', detail: 'あと 2 件先です', progress: 0.5, minutes: 21 },
  { stage: 3, date: '11/8', at: (s) => s + 18, title: 'まもなく到着します', detail: '次がお客様のお届け先です', progress: 0.86, minutes: 4 },
  { stage: 4, date: '11/8', at: (s) => s + 32, title: '配達が完了しました', detail: '', progress: 1 },
]
const START_TICK = 4
const LAST = TICKS.length - 1

const hhmm = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`
const tickTime = (t: Tick, slot: SlotId) => {
  const s = SLOTS.find((x) => x.id === slot)!.start
  return typeof t.at === 'number' ? t.at : t.at(s)
}

const ITEMS = [
  { kind: 'tote' as const, name: '帆布トート L', variant: 'ベージュ / フリー', price: 6600, qty: 1, color: '#dbc8a4', shade: '#b29c74' },
  { kind: 'mug' as const, name: '粉引き ストーンウェアマグ', variant: 'ホワイト', price: 2420, qty: 2, color: '#f6f3ec', shade: '#c9c2b4' },
  { kind: 'socks' as const, name: 'ウール パイル ソックス', variant: 'マスタード / M', price: 1980, qty: 1, color: '#d6a53c', shade: '#a77c22' },
]
const SUBTOTAL = ITEMS.reduce((a, i) => a + i.price * i.qty, 0)
const POINTS = 300
const TOTAL = SUBTOTAL - POINTS
const TAX = Math.floor((TOTAL * 10) / 110)
const yen = (n: number) => `¥${n.toLocaleString('ja-JP')}`

/* ───────────── 地図 ───────────── */

const ROUTE: [number, number][] = [
  [58, 246],
  [58, 214],
  [176, 214],
  [176, 140],
  [300, 140],
  [300, 66],
  [400, 66],
]
const SEGS = ROUTE.slice(1).map((p, i) => Math.hypot(p[0] - ROUTE[i][0], p[1] - ROUTE[i][1]))
const ROUTE_LEN = SEGS.reduce((a, b) => a + b, 0)
function pointAt(t: number): [number, number] {
  let d = Math.max(0, Math.min(1, t)) * ROUTE_LEN
  for (let i = 0; i < SEGS.length; i++) {
    if (d <= SEGS[i]) {
      const k = SEGS[i] ? d / SEGS[i] : 0
      return [ROUTE[i][0] + (ROUTE[i + 1][0] - ROUTE[i][0]) * k, ROUTE[i][1] + (ROUTE[i + 1][1] - ROUTE[i][1]) * k]
    }
    d -= SEGS[i]
  }
  return ROUTE[ROUTE.length - 1]
}
const ROUTE_D = 'M' + ROUTE.map((p) => p.join(' ')).join(' L')
const STOPS = [0.2, 0.36, 0.62, 0.76]

const ROAD_X = [-300, -180, -60, 58, 176, 300, 408, 530, 650, 770]
const ROAD_Y = [-180, -60, 66, 140, 214, 330, 440]

function mulberry32(seed: number) {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const BLOCKS = (() => {
  const rnd = mulberry32(7)
  const out: { x: number; y: number; w: number; h: number; park?: boolean; bld: { x: number; y: number; w: number; h: number }[] }[] = []
  for (let i = 0; i < ROAD_X.length - 1; i++)
    for (let j = 0; j < ROAD_Y.length - 1; j++) {
      const x = ROAD_X[i] + 9
      const y = ROAD_Y[j] + 9
      const w = ROAD_X[i + 1] - ROAD_X[i] - 18
      const h = ROAD_Y[j + 1] - ROAD_Y[j] - 18
      const park = (i === 4 && j === 3) || (i === 1 && j === 4)
      const bld: { x: number; y: number; w: number; h: number }[] = []
      if (!park) {
        const cols = Math.max(1, Math.round(w / 34))
        const rows = Math.max(1, Math.round(h / 30))
        for (let c = 0; c < cols; c++)
          for (let r = 0; r < rows; r++) {
            if (rnd() < 0.3) continue
            const cw = w / cols
            const rh = h / rows
            bld.push({ x: x + c * cw + 3, y: y + r * rh + 3, w: cw - 6 - rnd() * 6, h: rh - 6 - rnd() * 5 })
          }
      }
      out.push({ x, y, w, h, park, bld })
    }
  return out
})()

function RouteMap({ progress, stage, place }: { progress: number; stage: number; place: PlaceId }) {
  const reduce = useReducedMotion()
  const mv = useMotionValue(progress)
  const vanRef = useRef<SVGGElement>(null)
  const pathRef = useRef<SVGPathElement>(null)
  const [p, setP] = useState(progress)

  const paint = (v: number) => {
    const [x, y] = pointAt(v)
    vanRef.current?.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`)
    pathRef.current?.setAttribute('stroke-dashoffset', String(1 - v))
  }
  useMotionValueEvent(mv, 'change', (v) => {
    paint(v)
    setP((old) => (STOPS.some((s) => (old < s) !== (v < s)) ? v : old))
  })
  useEffect(() => {
    if (reduce) {
      mv.jump(progress)
      paint(progress)
      setP(progress)
      return
    }
    const c = animate(mv, progress, { duration: progress < mv.get() ? 0.6 : 1.8, ease: [0.45, 0, 0.25, 1], onComplete: () => setP(progress) })
    return () => c.stop()
  }, [progress, reduce])

  const [vx, vy] = pointAt(progress)
  const home = ROUTE[ROUTE.length - 1]
  const hub = ROUTE[0]
  const delivered = stage >= 4
  const moving = stage === 3

  return (
    <svg viewBox="0 0 480 280" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full" role="img" aria-label={`配達ルートの地図。${delivered ? 'お届け済み' : moving ? `トラックはお届け先まであと${STOPS.filter((s) => s > p).length}件` : 'トラックはベースで待機中'}`}>
      <rect x="-600" y="-400" width="1700" height="1100" fill="#eceee6" />
      {/* 川 */}
      <path d="M-400 10 C -120 -10, 40 40, 120 30 S 250 -30, 360 4 S 560 30, 900 -20" fill="none" stroke="#c9dde3" strokeWidth="26" strokeLinecap="round" />
      <path d="M-400 10 C -120 -10, 40 40, 120 30 S 250 -30, 360 4 S 560 30, 900 -20" fill="none" stroke="#d9e8ec" strokeWidth="14" strokeLinecap="round" opacity=".8" />
      {/* 街区 */}
      {BLOCKS.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="6" fill={b.park ? '#d5e5c9' : '#e2e4db'} />
          {b.park &&
            [0.22, 0.5, 0.78, 0.36, 0.64].map((k, j) => <circle key={j} cx={b.x + b.w * k} cy={b.y + b.h * (j < 3 ? 0.35 : 0.7)} r="7" fill="#b9d3a8" />)}
          {b.bld.map((r, j) => (
            <rect key={j} x={r.x} y={r.y} width={Math.max(4, r.w)} height={Math.max(4, r.h)} rx="2.5" fill="#d7dacf" />
          ))}
        </g>
      ))}
      {/* 道路 */}
      <g stroke="#d3d6cb" strokeWidth="13" strokeLinecap="square">
        {ROAD_X.map((x) => (
          <path key={`x${x}`} d={`M${x} -400 V700`} />
        ))}
        {ROAD_Y.map((y) => (
          <path key={`y${y}`} d={`M-600 ${y} H1100`} />
        ))}
      </g>
      <g stroke="#fbfbf8" strokeWidth="10">
        {ROAD_X.map((x) => (
          <path key={`x${x}`} d={`M${x} -400 V700`} />
        ))}
        {ROAD_Y.map((y) => (
          <path key={`y${y}`} d={`M-600 ${y} H1100`} />
        ))}
      </g>
      <g fill="#9a9d92" fontSize="9" letterSpacing="1.5" style={{ fontFamily: 'inherit' }}>
        <text x="318" y="136.5">かもめ通り</text>
        <text x="66" y="210.5">さくら坂</text>
        <text x="173.5" y="96" transform="rotate(90 173.5 96)">あさぎ大通り</text>
        <text x="420" y="22" fill="#86a8b2">あさぎ川</text>
        <text x="200" y="182" fill="#7f9a6f">みなと台公園</text>
      </g>

      {/* ルート */}
      <path d={ROUTE_D} fill="none" stroke="#fff" strokeWidth="9" strokeLinejoin="round" strokeLinecap="round" />
      <path d={ROUTE_D} fill="none" stroke={ACCENT} strokeOpacity=".35" strokeWidth="4" strokeDasharray="2 6" strokeLinejoin="round" strokeLinecap="round" />
      <path ref={pathRef} d={ROUTE_D} fill="none" stroke={ACCENT} strokeWidth="4.5" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - progress} strokeLinejoin="round" strokeLinecap="round" />

      {/* 他のお届け先 */}
      {STOPS.map((s) => {
        const [x, y] = pointAt(s)
        const done = p >= s
        return (
          <g key={s} transform={`translate(${x} ${y})`}>
            <circle r="5.5" fill={done ? '#9aa39b' : '#fff'} stroke={done ? '#9aa39b' : COURIER} strokeWidth="2" />
            {done && <path d="M-2.4 0 L-0.6 1.8 L2.6 -1.6" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />}
          </g>
        )
      })}

      {/* ベース */}
      <g transform={`translate(${hub[0]} ${hub[1]})`}>
        <rect x="-13" y="-13" width="26" height="26" rx="7" fill="#fff" stroke="#c9ccc1" />
        <path d="M-7 6 V-2 L0 -7 L7 -2 V6 Z" fill="none" stroke="#5f655c" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M-3.5 6 V1.5 H3.5 V6" fill="none" stroke="#5f655c" strokeWidth="1.6" />
        <text x="17" y="4" fontSize="10.5" fontWeight="600" fill="#4b5048">みなと台ベース</text>
      </g>

      {/* お届け先 */}
      <g transform={`translate(${home[0]} ${home[1]})`}>
        {!delivered && !reduce && (
          <circle r="12" fill={ACCENT} opacity=".25">
            <animate attributeName="r" values="10;24" dur="1.8s" repeatCount="indefinite" />
            <animate attributeName="opacity" values=".35;0" dur="1.8s" repeatCount="indefinite" />
          </circle>
        )}
        <path d="M0 6 C -9 -3, -13 -8, -13 -15 A13 13 0 0 1 13 -15 C 13 -8, 9 -3, 0 6Z" transform="translate(0 -6)" fill={delivered ? ACCENT : '#fff'} stroke={ACCENT} strokeWidth="2.2" />
        {delivered ? (
          <path d="M-5 -21 L-1.5 -17.5 L5 -24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="M-5.5 -17 V-22 L0 -26 L5.5 -22 V-17Z" fill={ACCENT} />
        )}
        <text x="16" y="-14" fontSize="11" fontWeight="700" fill="#2f3a35">
          お届け先
        </text>
        <text x="16" y="-2" fontSize="9" fill="#6b7268">
          {PLACES.find((x) => x.id === place)!.label}
        </text>
      </g>

      {/* トラック */}
      <g ref={vanRef} transform={`translate(${vx} ${vy})`} style={{ opacity: delivered ? 0 : 1, transition: 'opacity .5s 1.2s' }}>
        {moving && !reduce && (
          <circle r="14" fill={COURIER} opacity=".2">
            <animate attributeName="r" values="12;22" dur="1.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values=".35;0" dur="1.4s" repeatCount="indefinite" />
          </circle>
        )}
        <circle r="13" fill="#fff" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.22))' }} />
        <circle r="10.5" fill={COURIER} />
        <g transform="translate(-6.5 -5)" fill="#fff">
          <rect x="0" y="1" width="8" height="6.5" rx="1" />
          <path d="M8.5 3 H11 L13 5.5 V7.5 H8.5Z" />
          <circle cx="3" cy="8.6" r="1.6" fill={COURIER} stroke="#fff" strokeWidth="1.2" />
          <circle cx="10.5" cy="8.6" r="1.6" fill={COURIER} stroke="#fff" strokeWidth="1.2" />
        </g>
      </g>
    </svg>
  )
}

/* ───────────── イラスト ───────────── */

function ItemArt({ kind, color, shade }: { kind: 'tote' | 'mug' | 'socks'; color: string; shade: string }) {
  const s = { stroke: shade, strokeWidth: 2.4, strokeLinejoin: 'round' as const }
  return (
    <svg viewBox="0 0 100 100" className="size-full" aria-hidden="true">
      {kind === 'tote' && (
        <>
          <path d="M38 38 Q38 16 50 16 Q62 16 62 38" fill="none" stroke={shade} strokeWidth="4" strokeLinecap="round" />
          <path d="M24 36 L76 36 L80 84 L20 84Z" fill={color} {...s} />
          <rect x="43" y="56" width="14" height="9" rx="1.5" fill={shade} opacity=".35" />
        </>
      )}
      {kind === 'mug' && (
        <>
          <path d="M70 44 Q86 44 86 58 Q86 72 70 72" fill="none" stroke={shade} strokeWidth="8" strokeLinecap="round" />
          <path d="M70 44 Q86 44 86 58 Q86 72 70 72" fill="none" stroke={color} strokeWidth="4.5" strokeLinecap="round" />
          <path d="M26 34 L74 34 L72 80 Q50 86 28 80Z" fill={color} {...s} />
          <ellipse cx="50" cy="34" rx="24" ry="5" fill={shade} />
        </>
      )}
      {kind === 'socks' && (
        <>
          <path d="M28 16 L46 16 L46 54 Q46 60 52 64 L68 74 Q76 80 72 86 Q66 92 58 88 L34 74 Q28 70 28 62Z" fill={shade} transform="translate(-8 4)" opacity=".9" />
          <path d="M36 14 L54 14 L54 52 Q54 58 60 62 L76 72 Q84 78 80 84 Q74 90 66 86 L42 72 Q36 68 36 60Z" fill={color} {...s} />
          <rect x="36" y="14" width="18" height="11" fill={shade} opacity=".6" />
        </>
      )}
    </svg>
  )
}

function DriverAvatar({ size = 40 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className="shrink-0 rounded-full" aria-hidden="true">
      <rect width="48" height="48" fill="#f6e6d8" />
      <path d="M8 48 Q10 34 24 33 Q38 34 40 48Z" fill={COURIER} />
      <path d="M20 33 L24 39 L28 33" fill="#fff" />
      <rect x="20" y="27" width="8" height="7" fill="#e8bf9c" />
      <ellipse cx="24" cy="21" rx="9" ry="10" fill="#f0c9a6" />
      <path d="M14 18 Q14 9 24 9 Q34 9 34 18 L36 19 Q24 15 12 19Z" fill="#2f3542" />
      <path d="M13 19 Q24 14.5 37 19 L39 21 Q26 17 11 21Z" fill="#232833" />
      <circle cx="20.5" cy="22" r="1.1" fill="#3a2a22" />
      <circle cx="27.5" cy="22" r="1.1" fill="#3a2a22" />
      <path d="M21 26.5 Q24 28.5 27 26.5" fill="none" stroke="#a5634a" strokeWidth="1.2" strokeLinecap="round" />
      <rect x="21" y="11" width="6" height="3" rx="1" fill={COURIER} />
    </svg>
  )
}

function Parcel({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 14 L34 0 L74 12 L40 28Z" fill="#dcb07a" />
      <path d="M0 14 L40 28 L40 72 L0 56Z" fill="#c9995b" />
      <path d="M40 28 L74 12 L74 56 L40 72Z" fill="#b5844a" />
      <path d="M17 7 L57 20 L57 26 L17 13Z" fill="#e8d4b0" opacity=".85" />
      <rect x="6" y="34" width="22" height="13" rx="1.5" fill="#f7f4ec" transform="skewY(19.3) translate(0 -2)" />
      <circle cx="12" cy="38" r="3" fill={ACCENT} transform="skewY(19.3) translate(0 -2)" />
    </g>
  )
}

function ProofPhoto({ place, time }: { place: PlaceId; time: string }) {
  return (
    <svg viewBox="0 0 320 210" className="h-full w-full" role="img" aria-label={`配達証明写真:${PLACES.find((p) => p.id === place)!.label}に置かれた荷物`}>
      <defs>
        <radialGradient id="ot-vig" cx="50%" cy="45%" r="75%">
          <stop offset="60%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity=".35" />
        </radialGradient>
      </defs>
      {place === 'door' && (
        <>
          <rect width="320" height="210" fill="#d9d2c4" />
          <rect x="0" y="160" width="320" height="50" fill="#a9a196" />
          <path d="M0 160 H320" stroke="#8d857a" strokeWidth="2" />
          <rect x="96" y="10" width="128" height="152" rx="2" fill="#6b4f3a" />
          <rect x="104" y="18" width="112" height="144" fill="#7d5c43" />
          <rect x="112" y="28" width="96" height="56" rx="2" fill="#6f523c" />
          <rect x="112" y="94" width="96" height="60" rx="2" fill="#6f523c" />
          <rect x="196" y="88" width="6" height="22" rx="3" fill="#cfc7b4" />
          <rect x="246" y="60" width="26" height="34" rx="3" fill="#f1ede4" stroke="#c2baa9" />
          <text x="259" y="81" fontSize="9" textAnchor="middle" fill="#6b6457">201</text>
          <path d="M70 168 H250 L262 196 H58Z" fill="#5b6b5e" />
          <Parcel x={124} y={118} s={0.95} />
        </>
      )}
      {place === 'box' && (
        <>
          <rect width="320" height="210" fill="#cfd3d6" />
          <rect x="0" y="176" width="320" height="34" fill="#a6abae" />
          <rect x="54" y="14" width="212" height="164" rx="4" fill="#9aa2a8" />
          {[0, 1, 2].map((c) =>
            [0, 1, 2].map((r) =>
              c === 1 && r === 1 ? null : (
                <g key={`${c}${r}`}>
                  <rect x={62 + c * 68} y={22 + r * 52} width="62" height="46" rx="2" fill="#b8c0c5" stroke="#8b939a" />
                  <circle cx={112 + c * 68} cy={45 + r * 52} r="3.5" fill="#6e767c" />
                </g>
              ),
            ),
          )}
          <rect x="130" y="74" width="62" height="46" fill="#3f474d" />
          <path d="M130 74 L104 66 L104 128 L130 120Z" fill="#c6cdd2" stroke="#8b939a" />
          <Parcel x={138} y={80} s={0.55} />
          <rect x="140" y="140" width="40" height="12" rx="2" fill="#2f3a35" />
          <text x="160" y="149" fontSize="8" fill="#9fe0b8" textAnchor="middle">
            205 使用中
          </text>
        </>
      )}
      {place === 'meter' && (
        <>
          <rect width="320" height="210" fill="#e1dccf" />
          <rect x="70" y="20" width="180" height="170" rx="3" fill="#b9b5ab" />
          <rect x="78" y="28" width="164" height="154" fill="#5e5f5a" />
          <circle cx="210" cy="64" r="20" fill="#e8e6df" stroke="#9c998f" strokeWidth="3" />
          <path d="M210 64 L222 54" stroke="#c94a3a" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M92 40 V100 M100 40 V100" stroke="#8a8b84" strokeWidth="3" />
          <Parcel x={110} y={98} s={0.95} />
          <path d="M250 20 L300 30 L300 184 L250 190Z" fill="#c9c5bb" stroke="#9c998f" />
        </>
      )}
      {place === 'bike' && (
        <>
          <rect width="320" height="210" fill="#d8dccb" />
          <rect x="0" y="150" width="320" height="60" fill="#b3b3a3" />
          <circle cx="92" cy="160" r="36" fill="none" stroke="#3b3f3c" strokeWidth="5" />
          <circle cx="232" cy="160" r="36" fill="none" stroke="#3b3f3c" strokeWidth="5" />
          <path d="M92 160 L140 110 L212 110 L232 160 M140 110 L160 160 L212 110 M160 160 L92 160" fill="none" stroke="#2f6c8f" strokeWidth="5" strokeLinejoin="round" />
          <path d="M212 110 L220 80 L244 74" fill="none" stroke="#3b3f3c" strokeWidth="5" strokeLinecap="round" />
          <path d="M132 108 L148 104" stroke="#3b3f3c" strokeWidth="7" strokeLinecap="round" />
          <path d="M214 64 L276 64 L270 110 L220 110Z" fill="none" stroke="#6b6e66" strokeWidth="3" />
          <path d="M218 76 H274 M216 88 H272 M218 100 H270" stroke="#6b6e66" strokeWidth="1.5" />
          <Parcel x={222} y={40} s={0.62} />
          <path d="M214 60 Q246 46 278 60 L276 70 Q246 58 216 70Z" fill="#4c6a85" opacity=".85" />
        </>
      )}
      {place === 'hand' && (
        <>
          <rect width="320" height="210" fill="#e9e3d6" />
          <Parcel x={118} y={44} s={1.1} />
          <path d="M70 210 Q80 150 128 132 L150 126 Q160 140 146 150 L126 158 Q110 190 112 210Z" fill="#e7bf9b" />
          <path d="M250 210 Q240 150 200 130 L190 120 Q178 132 190 146 L200 156 Q212 190 212 210Z" fill="#d9a986" />
          <rect x="20" y="20" width="84" height="48" rx="4" fill="#fbf9f4" stroke="#cfc6b5" />
          <text x="28" y="34" fontSize="7" fill="#8a8170">受領サイン</text>
          <path d="M30 54 q8 -14 14 -2 t12 -4 q6 -8 10 2 t14 -6" fill="none" stroke="#2c3e5c" strokeWidth="1.8" strokeLinecap="round" />
        </>
      )}
      <rect width="320" height="210" fill="url(#ot-vig)" />
      <rect x="10" y="10" width="92" height="18" rx="9" fill="rgba(0,0,0,.45)" />
      <circle cx="21" cy="19" r="3" fill={COURIER} />
      <text x="29" y="22.5" fontSize="9" fill="#fff" fontWeight="600">
        ハヤテ便 配達証明
      </text>
      <text x="308" y="198" fontSize="11" fill="#ffb24a" textAnchor="end" style={{ fontFamily: 'ui-monospace, monospace' }} letterSpacing="1">
        {time}
      </text>
    </svg>
  )
}

/* ───────────── 部品 ───────────── */

function Stepper({ stage, sub }: { stage: number; sub: number }) {
  const reduce = useReducedMotion()
  const fill = Math.min(1, (stage + sub) / (STAGES.length - 1))
  return (
    <ol className="relative mt-4 grid grid-cols-5" aria-label="配送状況">
      <div className="absolute top-[15px] right-[10%] left-[10%] h-[3px] rounded-full bg-stone-200" aria-hidden="true">
        <motion.div
          className="h-full origin-left rounded-full"
          style={{ background: `linear-gradient(90deg, ${ACCENT}, #3d8a7a)` }}
          initial={false}
          animate={{ scaleX: fill }}
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 60, damping: 18 }}
        />
      </div>
      {STAGES.map((s, i) => {
        const done = i < stage || (i === stage && stage === STAGES.length - 1)
        const current = i === stage && !done
        const Icon = s.icon
        return (
          <li key={s.label} className="relative flex flex-col items-center gap-1.5" aria-current={current ? 'step' : undefined}>
            <div className="relative">
              {current && !reduce && (
                <motion.span
                  className="absolute inset-0 rounded-full"
                  style={{ background: ACCENT }}
                  animate={{ scale: [1, 1.7], opacity: [0.35, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                />
              )}
              <motion.div
                className="relative grid size-8 place-items-center rounded-full border-2"
                initial={false}
                animate={{
                  backgroundColor: done ? ACCENT : current ? '#ffffff' : '#f5f5f2',
                  borderColor: done || current ? ACCENT : '#d6d3cc',
                  scale: current ? 1.08 : 1,
                }}
                transition={{ duration: reduce ? 0 : 0.3 }}
              >
                {done ? (
                  <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
                    <motion.path d="M5 12.5 L10 17 L19 7.5" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35, delay: 0.15 }} />
                  </svg>
                ) : (
                  <Icon className="size-4" style={{ color: current ? ACCENT : '#a8a39a' }} />
                )}
              </motion.div>
            </div>
            <span className={`text-center text-[10px] leading-tight whitespace-nowrap @md:text-[11px] ${current ? 'font-bold text-stone-900' : done ? 'text-stone-700' : 'text-stone-400'}`}>
              {s.label}
              <span className="sr-only">{done ? '(完了)' : current ? '(現在)' : ''}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function Overlay({ children, onClose, label, role = 'dialog', className = '' }: { children: ReactNode; onClose: () => void; label: string; role?: 'dialog' | 'alertdialog'; className?: string }) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    const el = ref.current?.querySelector<HTMLElement>('[data-autofocus]') ?? ref.current?.querySelector<HTMLElement>('button')
    el?.focus({ preventScroll: true })
    return () => {
      if (prev?.isConnected) requestAnimationFrame(() => prev.focus({ preventScroll: true }))
    }
  }, [])
  const trap = (e: ReactKeyboardEvent) => {
    if (e.key !== 'Tab' || !ref.current) return
    const els = [...ref.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex="0"]')]
    if (!els.length) return
    if (e.shiftKey && document.activeElement === els[0]) {
      e.preventDefault()
      els[els.length - 1].focus()
    } else if (!e.shiftKey && document.activeElement === els[els.length - 1]) {
      e.preventDefault()
      els[0].focus()
    }
  }
  return (
    <motion.div className="absolute inset-0 z-50 flex items-center justify-center p-3 @md:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
      <div className="absolute inset-0 bg-stone-900/45 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <motion.div
        ref={ref}
        role={role}
        aria-modal="true"
        aria-label={label}
        onKeyDown={trap}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 22, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.98 }}
        transition={reduce ? { duration: 0.15 } : { type: 'spring', stiffness: 420, damping: 34 }}
        className={`relative max-h-full w-full overflow-hidden ${className}`}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

function CloseBtn({ onClick, label = '閉じる', className = '' }: { onClick: () => void; label?: string; className?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className={`grid size-8 place-items-center rounded-full text-stone-500 hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-[#245b52] ${className}`}>
      <X className="size-4" />
    </button>
  )
}

type Ev = { key: string; date: string; time: string; title: string; detail: string; user?: boolean; stage?: number }
type Msg = { id: number; from: 'me' | 'driver'; text: string; time: string }

const QUICK_REPLIES = ['置き配でお願いします', 'インターホンを鳴らしてください', '少し遅れても大丈夫です', '駐車スペースは建物の裏です']
const DRIVER_REPLIES: Record<string, (place: string) => string> = {
  置き配でお願いします: (place) => `承知しました!${place}に置いて、写真でお知らせしますね。`,
  インターホンを鳴らしてください: () => 'かしこまりました。到着したら鳴らします。',
  少し遅れても大丈夫です: () => 'ありがとうございます、安全運転で伺います。',
  駐車スペースは建物の裏です: () => '助かります!裏に停めさせていただきます。',
}

/* ───────────── 本体 ───────────── */

export function OrderTracking() {
  const reduce = useReducedMotion()
  const [tick, setTick] = useState(START_TICK)
  const [auto, setAuto] = useState(false)
  const [slot, setSlot] = useState<SlotId>('14')
  const [place, setPlace] = useState<PlaceId>('door')
  const [draftSlot, setDraftSlot] = useState<SlotId>('14')
  const [draftPlace, setDraftPlace] = useState<PlaceId>('door')
  const [userEvents, setUserEvents] = useState<(Ev & { afterTick: number })[]>([])
  const [tab, setTab] = useState<'history' | 'order' | 'options'>('history')
  const [unseen, setUnseen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [driverOpen, setDriverOpen] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [proofOpen, setProofOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [typing, setTyping] = useState(false)
  const [call, setCall] = useState<'idle' | 'dialing' | 'talking'>('idle')
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fireRef = useRef<ReturnType<typeof confetti.create> | null>(null)
  const tabsId = useId()

  const t = TICKS[tick]
  const stage = t.stage
  const delivered = stage === 4
  const slotInfo = SLOTS.find((s) => s.id === slot)!
  const placeInfo = PLACES.find((p) => p.id === place)!
  const doneTime = hhmm(tickTime(TICKS[LAST], slot))
  const sub = stage === 3 ? t.progress * 0.92 : 0

  /* 進行 */
  const advance = () => {
    setTick((k) => Math.min(LAST, k + 1))
    if (tab !== 'history') setUnseen(true)
  }
  const reset = () => {
    setTick(0)
    setAuto(false)
    setUserEvents([])
    setProofOpen(false)
    setRating(0)
    setMsgs([])
    setUnseen(false)
  }
  useEffect(() => {
    if (!auto) return
    if (tick >= LAST) {
      setAuto(false)
      return
    }
    const id = setTimeout(advance, 2400)
    return () => clearTimeout(id)
  }, [auto, tick])

  useEffect(() => {
    if (tick !== LAST) return
    setDriverOpen(false)
    const id = setTimeout(() => {
      setProofOpen(true)
      if (!reduce && canvasRef.current) {
        fireRef.current ??= confetti.create(canvasRef.current, { resize: true, useWorker: false })
        const colors = [ACCENT, '#3d8a7a', '#f3c86b', COURIER, '#ffffff']
        fireRef.current({ particleCount: 90, spread: 70, startVelocity: 38, origin: { x: 0.5, y: 0.75 }, colors, scalar: 0.9 })
        setTimeout(() => fireRef.current?.({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0, y: 0.8 }, colors }), 180)
        setTimeout(() => fireRef.current?.({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1, y: 0.8 }, colors }), 260)
      }
    }, reduce ? 100 : 1500)
    return () => clearTimeout(id)
  }, [tick, reduce])
  useEffect(() => () => fireRef.current?.reset(), [])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(id)
  }, [toast])

  useEffect(() => {
    if (call !== 'dialing') return
    const id = setTimeout(() => setCall('talking'), 1800)
    return () => clearTimeout(id)
  }, [call])

  /* イベント */
  const events = useMemo(() => {
    const list: Ev[] = []
    for (let i = 0; i <= tick; i++) {
      const k = TICKS[i]
      list.push({
        key: `t${i}`,
        date: k.date,
        time: hhmm(tickTime(k, slot)),
        title: k.title,
        detail: i === LAST ? `置き配:${placeInfo.label}${place === 'hand' ? '(対面でお渡し)' : ''}` : k.detail,
        stage: k.stage,
      })
      userEvents.filter((u) => u.afterTick === i).forEach((u) => list.push(u))
    }
    return list.reverse()
  }, [tick, slot, place, placeInfo.label, userEvents])

  const lastTime = events[0]

  const applyChanges = () => {
    const changes: string[] = []
    const now = { date: TICKS[tick].date, time: hhmm(tickTime(TICKS[tick], slot)) }
    const add: (Ev & { afterTick: number })[] = []
    if (draftSlot !== slot) {
      const from = slotInfo.label
      const to = SLOTS.find((s) => s.id === draftSlot)!.label
      add.push({ key: `u${Date.now()}s`, ...now, title: 'お届け時間帯を変更しました', detail: `${from} → ${to}`, user: true, afterTick: tick })
      changes.push(`時間帯を${to}`)
      setSlot(draftSlot)
    }
    if (draftPlace !== place) {
      const to = PLACES.find((p) => p.id === draftPlace)!.label
      add.push({ key: `u${Date.now()}p`, ...now, title: draftPlace === 'hand' ? '対面での受け取りに変更しました' : '置き配の場所を指定しました', detail: `${placeInfo.label} → ${to}`, user: true, afterTick: tick })
      changes.push(draftPlace === 'hand' ? '手渡し' : `置き配を「${to}」`)
      setPlace(draftPlace)
    }
    setUserEvents((u) => [...u, ...add])
    setConfirmOpen(false)
    setToast({ id: Date.now(), text: `${changes.join('、')}に変更しました` })
  }
  const dirty = (draftSlot !== slot && stage < 3) || (draftPlace !== place && !delivered)

  useEffect(() => {
    if (stage >= 3) setDraftSlot(slot)
    if (delivered) setDraftPlace(place)
  }, [stage, delivered, slot, place])

  const sendMsg = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const time = hhmm(tickTime(TICKS[tick], slot))
    setMsgs((m) => [...m, { id: Date.now(), from: 'me', text: trimmed, time }])
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      setMsgs((m) => [...m, { id: Date.now() + 1, from: 'driver', text: DRIVER_REPLIES[trimmed]?.(place === 'hand' ? '玄関前' : placeInfo.label) ?? 'メッセージ確認しました。もうすぐ伺います!', time }])
    }, 1400)
  }

  const onRootKey = (e: ReactKeyboardEvent) => {
    if (e.key !== 'Escape') return
    if (confirmOpen) setConfirmOpen(false)
    else if (driverOpen) {
      setDriverOpen(false)
      setCall('idle')
    } else if (receiptOpen) setReceiptOpen(false)
    else if (proofOpen) setProofOpen(false)
    else return
    e.preventDefault()
    e.stopPropagation()
  }

  const eta = delivered ? (
    <>
      <span className="text-[13px] font-semibold text-stone-500">11月8日(日)</span> {doneTime} <span className="text-[13px] font-semibold">にお届けしました</span>
    </>
  ) : stage === 3 ? (
    <>
      あと約 <span className="tabular-nums">{t.minutes}</span> 分
    </>
  ) : (
    <>
      <span className="text-[13px] font-semibold text-stone-500">{stage < 2 ? '11月8日(日) 予定' : '本日'}</span> {slotInfo.range.replace('–', '〜')}
    </>
  )

  const spring: Transition = reduce ? { duration: 0.15 } : { type: 'spring', stiffness: 380, damping: 34 }
  const stopsLeft = STOPS.filter((s) => s > t.progress).length

  return (
    <div className="@container relative flex h-full w-full flex-col overflow-hidden bg-[#f2f1ec] text-stone-900" onKeyDown={onRootKey}>
      {/* ヘッダー */}
      <header className="flex h-[52px] shrink-0 items-center gap-2.5 border-b border-stone-200/80 bg-[#fbfaf7] px-3 @md:px-4">
        <svg viewBox="0 0 32 32" className="size-7 shrink-0" aria-hidden="true">
          <rect width="32" height="32" rx="9" fill={ACCENT} />
          <path d="M16 6 C20 11 21 14 21 17 a5 5 0 0 1 -10 0 C11 14 12 11 16 6Z" fill="#f3c86b" />
          <path d="M16 13 C18 15.5 18.5 17 18.5 18.2 a2.5 2.5 0 0 1 -5 0 C13.5 17 14 15.5 16 13Z" fill="#fbfaf7" />
        </svg>
        <div className="min-w-0 leading-tight">
          <p className="text-[13px] font-bold">注文の追跡</p>
          <p className="truncate text-[10.5px] text-stone-500 tabular-nums">注文番号 TM-2611-48203</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => (tick >= LAST ? reset() : setAuto((a) => !a))}
            aria-pressed={auto}
            aria-label={auto ? '自動再生を停止' : '自動で進める'}
            title={auto ? '自動再生を停止' : '自動で進める'}
            className="grid size-9 place-items-center rounded-full border border-stone-200 bg-white text-stone-600 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#245b52] disabled:opacity-40"
            disabled={tick >= LAST}
          >
            {auto ? <Pause className="size-4" /> : <Play className="size-4" />}
          </button>
          <button
            type="button"
            onClick={tick >= LAST ? reset : advance}
            className="flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-semibold text-white shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245b52]"
            style={{ background: tick >= LAST ? '#57534e' : ACCENT }}
          >
            {tick >= LAST ? <RotateCcw className="size-3.5" /> : <ChevronRight className="size-3.5" />}
            <span className="@md:hidden">{tick >= LAST ? '最初から' : '進める'}</span>
            <span className="hidden @md:inline">{tick >= LAST ? '最初からやり直す' : '進行をシミュレート'}</span>
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:thin] @4xl:overflow-hidden">
        <div className="grid gap-3 p-3 @4xl:h-full @4xl:grid-cols-[minmax(0,1fr)_360px] @6xl:grid-cols-[minmax(0,1fr)_400px]">
          {/* 左カラム */}
          <div className="flex min-w-0 flex-col gap-3 @4xl:min-h-0">
            <section className="rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,.05)] ring-1 ring-stone-200/70" aria-labelledby={`${tabsId}-status`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[11px] font-medium text-stone-500">
                    <span className="rounded px-1.5 py-px text-[10px] font-bold text-white" style={{ background: COURIER }}>
                      ハヤテ便
                    </span>
                    伝票 4821-0937-5520
                  </p>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.h2
                      key={stage}
                      id={`${tabsId}-status`}
                      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className="mt-1 text-[20px] font-bold tracking-tight @md:text-[22px]"
                      style={{ color: delivered ? ACCENT : undefined }}
                    >
                      {['ご注文を承りました', '発送の準備をしています', '発送しました', '配達中です', '配達が完了しました'][stage]}
                    </motion.h2>
                  </AnimatePresence>
                  <p className="mt-0.5 text-[18px] font-bold tracking-tight text-stone-800 @md:text-[20px]" aria-live="polite">
                    {eta}
                  </p>
                </div>
                {delivered ? (
                  <button
                    type="button"
                    onClick={() => setProofOpen(true)}
                    className="group relative h-16 w-24 shrink-0 overflow-hidden rounded-xl ring-1 ring-stone-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245b52]"
                    aria-label="配達証明写真を見る"
                  >
                    <ProofPhoto place={place} time={`2026.11.08 ${doneTime}`} />
                    <span className="absolute inset-x-0 bottom-0 bg-black/55 py-0.5 text-[9.5px] font-semibold text-white">写真を見る</span>
                  </button>
                ) : (
                  <div className="shrink-0 rounded-xl bg-stone-50 px-3 py-2 text-right ring-1 ring-stone-200/70">
                    <p className="flex items-center justify-end gap-1 text-[10px] text-stone-500">
                      <CalendarClock className="size-3" />
                      お届け予定
                    </p>
                    <p className="text-[13px] font-bold tabular-nums">11/8(日)</p>
                    <p className="text-[11px] text-stone-600 tabular-nums">{slotInfo.range}</p>
                  </div>
                )}
              </div>
              <Stepper stage={stage} sub={sub} />
            </section>

            <section className="relative flex h-[300px] flex-col overflow-hidden rounded-2xl bg-[#eceee6] shadow-[0_1px_2px_rgba(0,0,0,.05)] ring-1 ring-stone-200/70 @4xl:h-auto @4xl:min-h-[200px] @4xl:flex-1" aria-label="配達ルート">
              <div className="relative min-h-0 flex-1">
                <RouteMap progress={t.progress} stage={stage} place={place} />
                <div className="pointer-events-none absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={`${stage}-${stopsLeft}`}
                      initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold shadow-sm ring-1 ring-black/5"
                    >
                      <span className="size-2 rounded-full" style={{ background: delivered ? ACCENT : stage === 3 ? COURIER : '#a8a39a' }} />
                      {delivered ? 'お届け済み' : stage === 3 ? (stopsLeft > 0 ? `あと ${stopsLeft} 件先` : '次がお客様のお届け先') : stage === 2 ? 'ベースで配達準備中' : '出荷前'}
                    </motion.span>
                  </AnimatePresence>
                </div>
                {stage < 2 && (
                  <div className="absolute inset-0 grid place-items-center bg-[#eceee6]/70 backdrop-blur-[1.5px]">
                    <p className="flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-[12px] font-medium text-stone-600 shadow-sm">
                      <PackageOpen className="size-4" style={{ color: ACCENT }} />
                      配達ルートは発送後に表示されます
                    </p>
                  </div>
                )}
              </div>
              <AnimatePresence initial={false}>
                {stage === 3 && (
                  <motion.div
                    initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                    animate={reduce ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
                    exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="shrink-0 overflow-hidden"
                  >
                    <div className="flex items-center gap-2.5 border-t border-stone-200 bg-white px-3 py-2.5">
                      <DriverAvatar size={36} />
                      <div className="min-w-0 flex-1 leading-tight">
                        <p className="truncate text-[12.5px] font-semibold">佐伯 ゆうじ</p>
                        <p className="truncate text-[10.5px] text-stone-500">ハヤテ便 みなと台ベース・軽バン</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDriverOpen(true)}
                        className="flex h-9 items-center gap-1.5 rounded-full border border-stone-200 px-3 text-[12px] font-semibold text-stone-800 hover:border-stone-400 focus-visible:outline-2 focus-visible:outline-[#245b52]"
                      >
                        <MessageCircle className="size-4" />
                        <span className="hidden @md:inline">ドライバーに連絡</span>
                        <span className="@md:hidden">連絡</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          </div>

          {/* 右カラム(タブ) */}
          <section className="flex min-w-0 flex-col rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,.05)] ring-1 ring-stone-200/70 @4xl:min-h-0">
            <div role="tablist" aria-label="注文の詳細" className="flex shrink-0 gap-1 border-b border-stone-200 px-2 pt-2">
              {(
                [
                  ['history', '追跡履歴'],
                  ['order', '注文内容'],
                  ['options', '受け取り設定'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={`${tabsId}-tab-${id}`}
                  aria-selected={tab === id}
                  aria-controls={`${tabsId}-panel`}
                  tabIndex={tab === id ? 0 : -1}
                  onClick={() => {
                    setTab(id)
                    if (id === 'history') setUnseen(false)
                  }}
                  onKeyDown={(e) => {
                    const order = ['history', 'order', 'options'] as const
                    const i = order.indexOf(id)
                    const next = e.key === 'ArrowRight' ? order[(i + 1) % 3] : e.key === 'ArrowLeft' ? order[(i + 2) % 3] : null
                    if (next) {
                      e.preventDefault()
                      setTab(next)
                      if (next === 'history') setUnseen(false)
                      document.getElementById(`${tabsId}-tab-${next}`)?.focus()
                    }
                  }}
                  className={`relative flex-1 rounded-t-lg px-2 pt-1.5 pb-2.5 text-[12.5px] font-semibold transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#245b52] ${tab === id ? 'text-stone-900' : 'text-stone-400 hover:text-stone-700'}`}
                >
                  {label}
                  {id === 'history' && unseen && <span className="absolute top-1.5 right-2 size-2 rounded-full" style={{ background: COURIER }} aria-label="新しい更新" />}
                  {tab === id && <motion.span layoutId={`${tabsId}-ink`} className="absolute inset-x-3 bottom-0 h-[3px] rounded-full" style={{ background: ACCENT }} transition={spring} />}
                </button>
              ))}
            </div>
            <div id={`${tabsId}-panel`} role="tabpanel" aria-labelledby={`${tabsId}-tab-${tab}`} className="relative min-h-0 flex-1 @4xl:overflow-y-auto @4xl:[scrollbar-width:thin]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={tab} initial={{ opacity: 0, y: reduce ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
                  {tab === 'history' && <History events={events} latestKey={lastTime?.key} />}
                  {tab === 'order' && <OrderSummary onReceipt={() => setReceiptOpen(true)} />}
                  {tab === 'options' && (
                    <OptionsPanel
                      stage={stage}
                      slot={slot}
                      place={place}
                      draftSlot={draftSlot}
                      draftPlace={draftPlace}
                      setDraftSlot={setDraftSlot}
                      setDraftPlace={setDraftPlace}
                      dirty={dirty}
                      onSubmit={() => setConfirmOpen(true)}
                      onCancel={() => {
                        setDraftSlot(slot)
                        setDraftPlace(place)
                      }}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </section>
        </div>
      </div>

      {/* 確認ダイアログ */}
      <AnimatePresence>
        {confirmOpen && (
          <Overlay key="confirm" role="alertdialog" label="受け取り設定の変更確認" onClose={() => setConfirmOpen(false)} className="max-w-[380px] rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-[15px] font-bold">受け取り設定を変更しますか?</h3>
            <ul className="mt-3 space-y-2 text-[12.5px]">
              {draftSlot !== slot && stage < 3 && (
                <li className="flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-2.5">
                  <Clock className="size-4 shrink-0 text-stone-500" />
                  <span className="text-stone-500 line-through">{slotInfo.label}</span>
                  <ChevronRight className="size-3.5 text-stone-400" />
                  <span className="font-semibold">{SLOTS.find((s) => s.id === draftSlot)!.range}</span>
                </li>
              )}
              {draftPlace !== place && (
                <li className="flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-2.5">
                  <MapPin className="size-4 shrink-0 text-stone-500" />
                  <span className="text-stone-500 line-through">{placeInfo.label}</span>
                  <ChevronRight className="size-3.5 text-stone-400" />
                  <span className="font-semibold">{PLACES.find((p) => p.id === draftPlace)!.label}</span>
                </li>
              )}
            </ul>
            <p className="mt-3 text-[11.5px] leading-relaxed text-stone-500">変更内容はドライバーに通知されます。配達に出発した後は時間帯を変更できません。</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmOpen(false)} className="h-9 rounded-full px-4 text-[12.5px] font-medium text-stone-600 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-[#245b52]">
                やめる
              </button>
              <button type="button" data-autofocus onClick={applyChanges} className="h-9 rounded-full px-4 text-[12.5px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245b52]" style={{ background: ACCENT }}>
                変更する
              </button>
            </div>
          </Overlay>
        )}
      </AnimatePresence>

      {/* ドライバー連絡 */}
      <AnimatePresence>
        {driverOpen && (
          <Overlay
            key="driver"
            label="ドライバーに連絡"
            onClose={() => {
              setDriverOpen(false)
              setCall('idle')
            }}
            className="flex h-[min(440px,100%)] max-w-[400px] flex-col rounded-2xl bg-[#fbfaf7] shadow-2xl"
          >
            <DriverSheet
              msgs={msgs}
              typing={typing}
              call={call}
              onCall={() => setCall(call === 'idle' ? 'dialing' : 'idle')}
              onSend={sendMsg}
              onClose={() => {
                setDriverOpen(false)
                setCall('idle')
              }}
            />
          </Overlay>
        )}
      </AnimatePresence>

      {/* 領収書 */}
      <AnimatePresence>
        {receiptOpen && (
          <Overlay key="receipt" label="領収書" onClose={() => setReceiptOpen(false)} className="max-w-[360px] overflow-visible">
            <Receipt
              onClose={() => setReceiptOpen(false)}
              onSave={() => setToast({ id: Date.now(), text: '領収書(PDF)を保存しました' })}
              paidAt="2026年11月6日"
            />
          </Overlay>
        )}
      </AnimatePresence>

      {/* 配達完了 */}
      <AnimatePresence>
        {proofOpen && (
          <Overlay key="proof" label="配達完了" onClose={() => setProofOpen(false)} className="max-w-[440px] rounded-3xl bg-white shadow-2xl @3xl:max-w-[720px]">
            <div className="max-h-full overflow-y-auto @3xl:flex @3xl:items-stretch">
              <div className="relative aspect-[320/210] w-full shrink-0 @3xl:aspect-auto @3xl:min-h-[300px] @3xl:w-[56%] @3xl:bg-stone-900">
                <motion.div className="absolute inset-0" initial={reduce ? false : { scale: 1.08, filter: 'brightness(2.2)' }} animate={{ scale: 1, filter: 'brightness(1)' }} transition={{ duration: 0.7, ease: 'easeOut' }}>
                  <ProofPhoto place={place} time={`2026.11.08 ${doneTime}`} />
                </motion.div>
                <CloseBtn onClick={() => setProofOpen(false)} className="absolute top-2.5 right-2.5 bg-white/90 shadow-sm @3xl:hidden" />
              </div>
              <div className="relative p-5 text-center @3xl:flex @3xl:flex-1 @3xl:flex-col @3xl:justify-center">
                <CloseBtn onClick={() => setProofOpen(false)} className="absolute top-2.5 right-2.5 hidden @3xl:grid" />
                <motion.div
                  className="mx-auto -mt-11 grid @3xl:mt-0 size-12 place-items-center rounded-full text-white shadow-lg ring-4 ring-white"
                  style={{ background: ACCENT }}
                  initial={reduce ? false : { scale: 0, rotate: -40 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 14, delay: 0.25 }}
                >
                  <Check className="size-6" strokeWidth={3} />
                </motion.div>
                <h3 className="mt-2 text-[18px] font-bold">お届けしました!</h3>
                <p className="mt-1 text-[12px] text-stone-500 tabular-nums">
                  11月8日(日) {doneTime} ・ {place === 'hand' ? '対面でお渡し' : `置き配(${placeInfo.label})`}
                </p>
                <div className="mt-4 rounded-2xl bg-stone-50 p-3">
                  <p className="text-[12px] font-medium text-stone-600">{rating ? 'ご評価ありがとうございます!' : '今回の配達はいかがでしたか?'}</p>
                  <div role="radiogroup" aria-label="配達の評価" className="mt-1.5 flex justify-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <motion.button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={rating === n}
                        aria-label={`${n}つ星`}
                        onClick={() => setRating(n)}
                        whileTap={reduce ? undefined : { scale: 0.8 }}
                        animate={rating >= n && !reduce ? { scale: [1, 1.25, 1] } : { scale: 1 }}
                        transition={{ duration: 0.3, delay: (n - 1) * 0.04 }}
                        className="rounded p-0.5 focus-visible:outline-2 focus-visible:outline-[#245b52]"
                      >
                        <Star className={`size-7 ${rating >= n ? 'text-amber-400' : 'text-stone-300'}`} fill="currentColor" strokeWidth={0} />
                      </motion.button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  data-autofocus
                  onClick={() => setProofOpen(false)}
                  className="mt-4 h-10 w-full rounded-full text-[13px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245b52]"
                  style={{ background: ACCENT }}
                >
                  受け取りました
                </button>
              </div>
            </div>
          </Overlay>
        )}
      </AnimatePresence>

      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-[55] h-full w-full" aria-hidden="true" />

      {/* トースト */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-[60] flex justify-center px-4" aria-live="polite">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
              transition={spring}
              className="flex max-w-[440px] items-center gap-2 rounded-full bg-stone-900 px-4 py-2.5 text-[12px] text-white shadow-xl"
            >
              <Check className="size-3.5 shrink-0 text-emerald-300" />
              <span className="truncate">{toast.text}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ───────────── タブの中身 ───────────── */

function History({ events, latestKey }: { events: Ev[]; latestKey?: string }) {
  const reduce = useReducedMotion()
  return (
    <ol className="px-4 py-3" aria-label="追跡履歴">
      <AnimatePresence initial={false}>
        {events.map((e, i) => {
          const latest = e.key === latestKey
          const last = i === events.length - 1
          return (
            <motion.li
              key={e.key}
              layout={!reduce}
              initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: reduce ? 0.15 : 0.35, ease: [0.3, 0.7, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-[52px_20px_1fr] gap-x-2">
                <div className="pt-0.5 text-right leading-tight tabular-nums">
                  <p className={`text-[11.5px] font-semibold ${latest ? 'text-stone-900' : 'text-stone-500'}`}>{e.time}</p>
                  <p className="text-[10px] text-stone-400">{e.date}</p>
                </div>
                <div className="relative flex justify-center">
                  {!last && <span className="absolute top-4 bottom-0 w-px bg-stone-200" />}
                  <span className="relative mt-1 grid size-3.5 place-items-center">
                    {latest && !reduce && <span className="absolute inset-0 animate-ping rounded-full opacity-40" style={{ background: ACCENT }} />}
                    {e.user ? (
                      <span className="grid size-4 place-items-center rounded-full bg-amber-100 ring-2 ring-white">
                        <Pencil className="size-2.5 text-amber-700" />
                      </span>
                    ) : (
                      <span className="relative size-3 rounded-full ring-[3px] ring-white" style={{ background: latest ? ACCENT : '#cfccc4' }} />
                    )}
                  </span>
                </div>
                <div className="pb-4">
                  <p className={`text-[12.5px] leading-snug ${latest ? 'font-bold text-stone-900' : 'font-medium text-stone-700'}`}>{e.title}</p>
                  {e.detail && <p className={`mt-0.5 text-[11.5px] ${e.user ? 'text-amber-700' : 'text-stone-500'}`}>{e.detail}</p>}
                </div>
              </div>
            </motion.li>
          )
        })}
      </AnimatePresence>
    </ol>
  )
}

function Row({ k, v, strong, accent }: { k: ReactNode; v: ReactNode; strong?: boolean; accent?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between ${strong ? 'text-[14px] font-bold text-stone-900' : 'text-[12px] text-stone-600'}`}>
      <span>{k}</span>
      <span className={`tabular-nums ${accent ? 'text-[#c2412d]' : ''}`}>{v}</span>
    </div>
  )
}

function OrderSummary({ onReceipt }: { onReceipt: () => void }) {
  return (
    <div className="space-y-4 px-4 py-3">
      <ul className="space-y-2.5">
        {ITEMS.map((it) => (
          <li key={it.name} className="flex items-center gap-3">
            <div className="relative size-14 shrink-0 rounded-xl p-1.5" style={{ background: '#f1eee7' }}>
              <ItemArt kind={it.kind} color={it.color} shade={it.shade} />
              {it.qty > 1 && <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-stone-800 text-[10px] font-bold text-white">{it.qty}</span>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-medium">{it.name}</p>
              <p className="text-[11px] text-stone-500">
                {it.variant}・数量 {it.qty}
              </p>
            </div>
            <p className="text-[12.5px] font-semibold tabular-nums">{yen(it.price * it.qty)}</p>
          </li>
        ))}
      </ul>
      <div className="space-y-1.5 border-t border-dashed border-stone-200 pt-3">
        <Row k="小計" v={yen(SUBTOTAL)} />
        <Row k="送料" v="無料" />
        <Row k="ポイント利用" v={`−${yen(POINTS)}`} accent />
        <div className="pt-1">
          <Row k="合計(税込)" v={yen(TOTAL)} strong />
        </div>
        <p className="text-right text-[10.5px] text-stone-400 tabular-nums">うち消費税 {yen(TAX)}</p>
      </div>
      <div className="grid gap-2 rounded-xl bg-stone-50 p-3 text-[11.5px] text-stone-600 ring-1 ring-stone-200/70">
        <p className="flex items-center gap-2">
          <CreditCard className="size-3.5 shrink-0 text-stone-400" /> クレジットカード •••• 8105(一括)
        </p>
        <p className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-stone-400" />
          <span>
            〒123-0456 あさぎ市みなと台 3-14-2 グリーンハイツ 201
            <br />
            宮下 あかり 様
          </span>
        </p>
      </div>
      <button
        type="button"
        onClick={onReceipt}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-full border border-stone-300 text-[12.5px] font-semibold text-stone-800 transition-colors hover:border-stone-500 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#245b52]"
      >
        <FileText className="size-4" /> 領収書を表示
      </button>
    </div>
  )
}

function OptionsPanel({
  stage,
  slot,
  place,
  draftSlot,
  draftPlace,
  setDraftSlot,
  setDraftPlace,
  dirty,
  onSubmit,
  onCancel,
}: {
  stage: number
  slot: SlotId
  place: PlaceId
  draftSlot: SlotId
  draftPlace: PlaceId
  setDraftSlot: (s: SlotId) => void
  setDraftPlace: (p: PlaceId) => void
  dirty: boolean
  onSubmit: () => void
  onCancel: () => void
}) {
  const reduce = useReducedMotion()
  const slotLocked = stage >= 3
  const placeLocked = stage >= 4
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[12.5px] font-bold">お届け時間帯</h3>
        <span className="text-[11px] text-stone-500 tabular-nums">11月8日(日)</span>
      </div>
      {slotLocked && (
        <p className="mt-1.5 flex items-center gap-1.5 rounded-lg bg-stone-100 px-2.5 py-1.5 text-[11px] text-stone-600">
          <Lock className="size-3.5" /> {stage >= 4 ? '配達が完了しました' : '配達に出発したため、時間帯は変更できません'}
        </p>
      )}
      <div role="radiogroup" aria-label="お届け時間帯" className="mt-2 grid grid-cols-3 gap-1.5 @md:grid-cols-5 @4xl:grid-cols-3">
        {SLOTS.map((s) => {
          const on = draftSlot === s.id
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={slotLocked}
              onClick={() => setDraftSlot(s.id)}
              className={`relative rounded-xl border px-2 py-2 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#245b52] disabled:cursor-not-allowed ${on ? 'border-[#245b52] bg-[#245b52]/8' : 'border-stone-200 hover:border-stone-400'} ${slotLocked && !on ? 'opacity-40' : ''}`}
            >
              <p className={`text-[12px] font-semibold ${on ? 'text-[#245b52]' : ''}`}>{s.label}</p>
              <p className="text-[9.5px] text-stone-500 tabular-nums">{s.range}</p>
              {s.id === slot && <span className="absolute top-1 right-1 size-1.5 rounded-full bg-stone-400" title="現在の設定" />}
            </button>
          )
        })}
      </div>

      <h3 className="mt-4 text-[12.5px] font-bold">置き配の場所</h3>
      {placeLocked && (
        <p className="mt-1.5 flex items-center gap-1.5 rounded-lg bg-stone-100 px-2.5 py-1.5 text-[11px] text-stone-600">
          <Lock className="size-3.5" /> 配達が完了しました
        </p>
      )}
      <div role="radiogroup" aria-label="置き配の場所" className="mt-2 grid grid-cols-1 gap-1.5 @md:grid-cols-2 @4xl:grid-cols-1">
        {PLACES.map((p) => {
          const on = draftPlace === p.id
          const Icon = p.icon
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={placeLocked}
              onClick={() => setDraftPlace(p.id)}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#245b52] disabled:cursor-not-allowed ${on ? 'border-[#245b52] bg-[#245b52]/8' : 'border-stone-200 hover:border-stone-400'} ${placeLocked && !on ? 'opacity-40' : ''}`}
            >
              <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${on ? 'bg-[#245b52] text-white' : 'bg-stone-100 text-stone-500'}`}>
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-[12.5px] font-semibold ${on ? 'text-[#245b52]' : ''}`}>
                  {p.label}
                  {p.id === place && <span className="ml-1.5 rounded bg-stone-100 px-1 py-px text-[9.5px] font-medium text-stone-500">現在</span>}
                </span>
                <span className="block text-[10.5px] text-stone-500">{p.note}</span>
              </span>
              <span className={`grid size-4 shrink-0 place-items-center rounded-full border-2 ${on ? 'border-[#245b52]' : 'border-stone-300'}`}>{on && <span className="size-1.5 rounded-full bg-[#245b52]" />}</span>
            </button>
          )
        })}
      </div>

      <AnimatePresence>
        {dirty && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
            className="sticky bottom-0 mt-3 -mx-1 flex items-center gap-2 rounded-2xl bg-stone-900 p-2 pl-3.5 text-white shadow-xl"
          >
            <p className="min-w-0 flex-1 truncate text-[11.5px]">変更が保存されていません</p>
            <button type="button" onClick={onCancel} className="h-8 rounded-full px-3 text-[12px] text-white/75 hover:text-white focus-visible:outline-2 focus-visible:outline-white">
              取り消し
            </button>
            <button type="button" onClick={onSubmit} className="h-8 rounded-full bg-white px-3.5 text-[12px] font-semibold text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              変更を確定
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function DriverSheet({ msgs, typing, call, onCall, onSend, onClose }: { msgs: Msg[]; typing: boolean; call: 'idle' | 'dialing' | 'talking'; onCall: () => void; onSend: (t: string) => void; onClose: () => void }) {
  const reduce = useReducedMotion()
  const [text, setText] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: reduce ? 'auto' : 'smooth' })
  }, [msgs.length, typing, reduce])
  return (
    <>
      <div className="flex shrink-0 items-center gap-3 border-b border-stone-200 bg-white px-4 py-3">
        <DriverAvatar size={40} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-[13.5px] font-bold">佐伯 ゆうじ</p>
          <p className="text-[11px] text-stone-500">ハヤテ便・お届けまで あと少し</p>
        </div>
        <button
          type="button"
          onClick={onCall}
          aria-label={call === 'idle' ? '電話をかける' : '通話を終了'}
          className={`grid size-9 place-items-center rounded-full text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245b52] ${call === 'idle' ? 'bg-[#245b52]' : 'bg-[#c2412d]'}`}
        >
          {call === 'idle' ? <Phone className="size-4" /> : <PhoneOff className="size-4" />}
        </button>
        <CloseBtn onClick={onClose} />
      </div>
      <AnimatePresence initial={false}>
        {call !== 'idle' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="shrink-0 overflow-hidden"
          >
            <div className="flex items-center gap-2 bg-[#245b52] px-4 py-2 text-[12px] text-white" aria-live="polite">
              <span className="relative flex size-2.5">
                {!reduce && <span className="absolute inset-0 animate-ping rounded-full bg-white/70" />}
                <span className="relative size-2.5 rounded-full bg-white" />
              </span>
              {call === 'dialing' ? '発信中…(番号は通知されません)' : <CallTimer />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div ref={listRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3" aria-live="polite">
        <p className="mx-auto w-fit rounded-full bg-stone-200/70 px-2.5 py-0.5 text-[10px] text-stone-500">メッセージは配達完了まで利用できます</p>
        {msgs.length === 0 && !typing && <p className="pt-6 text-center text-[12px] text-stone-400">定型文を選ぶか、メッセージを入力してください</p>}
        {msgs.map((m) => (
          <motion.div
            key={m.id}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`flex items-end gap-1.5 ${m.from === 'me' ? 'justify-end' : ''}`}
          >
            {m.from === 'driver' && <DriverAvatar size={24} />}
            {m.from === 'me' && <span className="text-[9.5px] text-stone-400 tabular-nums">{m.time}</span>}
            <p className={`max-w-[75%] rounded-2xl px-3 py-2 text-[12.5px] leading-snug ${m.from === 'me' ? 'rounded-br-md bg-[#245b52] text-white' : 'rounded-bl-md bg-white text-stone-800 ring-1 ring-stone-200'}`}>{m.text}</p>
            {m.from === 'driver' && <span className="text-[9.5px] text-stone-400 tabular-nums">{m.time}</span>}
          </motion.div>
        ))}
        {typing && (
          <div className="flex items-end gap-1.5" aria-label="ドライバーが入力中">
            <DriverAvatar size={24} />
            <span className="flex gap-1 rounded-2xl rounded-bl-md bg-white px-3 py-2.5 ring-1 ring-stone-200">
              {[0, 1, 2].map((i) => (
                <motion.span key={i} className="size-1.5 rounded-full bg-stone-400" animate={reduce ? undefined : { y: [0, -3, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.12 }} />
              ))}
            </span>
          </div>
        )}
      </div>
      <div className="shrink-0 border-t border-stone-200 bg-white px-3 pt-2 pb-3">
        <div className="flex gap-1.5 overflow-x-auto pb-2 [scrollbar-width:none]">
          {QUICK_REPLIES.map((q) => (
            <button key={q} type="button" onClick={() => onSend(q)} className="shrink-0 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11.5px] text-stone-700 hover:border-[#245b52]/50 hover:text-[#245b52] focus-visible:outline-2 focus-visible:outline-[#245b52]">
              {q}
            </button>
          ))}
        </div>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            onSend(text)
            setText('')
          }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="メッセージを入力"
            aria-label="ドライバーへのメッセージ"
            className="h-9 min-w-0 flex-1 rounded-full border border-stone-200 bg-stone-50 px-3.5 text-[12.5px] outline-none focus:border-[#245b52] focus:ring-2 focus:ring-[#245b52]/15"
          />
          <button type="submit" disabled={!text.trim()} aria-label="送信" className="grid size-9 place-items-center rounded-full bg-[#245b52] text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245b52] disabled:opacity-40">
            <Send className="size-4" />
          </button>
        </form>
      </div>
    </>
  )
}

function CallTimer() {
  const [s, setS] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setS((x) => x + 1), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <span className="tabular-nums">
      通話中 {Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}
    </span>
  )
}

function Receipt({ onClose, onSave, paidAt }: { onClose: () => void; onSave: () => void; paidAt: string }) {
  const zig = Array.from({ length: 25 }, (_, i) => `${i * 4 + 2}% 100%, ${i * 4 + 4}% calc(100% - 8px)`).join(', ')
  return (
    <div className="relative max-h-full overflow-y-auto rounded-t-xl drop-shadow-2xl">
      <div className="bg-[#fffdf8] px-6 pt-6 pb-9" style={{ clipPath: `polygon(0 0, 100% 0, 100% calc(100% - 8px), ${zig}, 0 calc(100% - 8px))` }}>
        <CloseBtn onClick={onClose} className="absolute top-2 right-2" />
        <div className="text-center">
          <p className="text-[11px] tracking-[0.3em] text-stone-500">TOMOSHI</p>
          <h3 className="mt-1 text-[20px] font-bold tracking-[0.4em]">領収書</h3>
        </div>
        <div className="mt-4 flex items-end justify-between border-b border-stone-800 pb-1">
          <p className="text-[14px] font-semibold">宮下 あかり 様</p>
          <p className="text-[10.5px] text-stone-500">{paidAt}</p>
        </div>
        <div className="mt-4 rounded-md bg-stone-100 py-2.5 text-center">
          <p className="text-[22px] font-bold tracking-wide tabular-nums">{yen(TOTAL)}-</p>
          <p className="text-[10.5px] text-stone-500">(税込・うち消費税 10% {yen(TAX)})</p>
        </div>
        <p className="mt-2 text-[11px] text-stone-600">但し 生活雑貨代として 上記正に領収いたしました</p>
        <div className="mt-3 space-y-1 border-t border-dashed border-stone-300 pt-3 text-[11px] text-stone-600">
          {ITEMS.map((it) => (
            <div key={it.name} className="flex justify-between gap-3">
              <span className="truncate">
                {it.name} ×{it.qty}
              </span>
              <span className="tabular-nums">{yen(it.price * it.qty)}</span>
            </div>
          ))}
          <div className="flex justify-between text-[#c2412d]">
            <span>ポイント利用</span>
            <span className="tabular-nums">−{yen(POINTS)}</span>
          </div>
        </div>
        <div className="mt-4 flex items-end justify-between">
          <div className="text-[10px] leading-relaxed text-stone-500">
            ともし生活道具店 株式会社(架空)
            <br />
            注文番号 TM-2611-48203
            <br />
            登録番号 T0000000000000
          </div>
          <div className="grid size-14 rotate-[-8deg] place-items-center rounded-full border-2 border-[#c2412d]/80 text-center text-[9px] leading-tight font-bold text-[#c2412d]/85">
            TOMOSHI
            <br />
            受領
          </div>
        </div>
        <button
          type="button"
          onClick={onSave}
          className="mt-5 flex h-9 w-full items-center justify-center gap-2 rounded-full bg-stone-900 text-[12px] font-semibold text-white hover:bg-stone-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245b52]"
        >
          <Download className="size-3.5" /> PDF で保存
        </button>
      </div>
    </div>
  )
}
