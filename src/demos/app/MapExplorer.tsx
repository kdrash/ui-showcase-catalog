import NumberFlow from '@number-flow/react'
import { easeCubicInOut, interpolateZoom } from 'd3'
import {
  AnimatePresence,
  animate,
  motion,
  useDragControls,
  useMotionValue,
  useReducedMotion,
  type PanInfo,
} from 'motion/react'
import {
  ArrowLeft,
  Bath,
  Bike,
  BookOpen,
  Bookmark,
  Check,
  ChevronDown,
  Clock,
  Coffee,
  CornerUpLeft,
  CornerUpRight,
  Croissant,
  Flag,
  Footprints,
  History,
  House,
  LocateFixed,
  MapPin,
  MessageCircle,
  Minus,
  Moon,
  Navigation2,
  Package,
  Pause,
  Phone,
  Play,
  Plus,
  RotateCcw,
  Search,
  Share2,
  Soup,
  Star,
  Store,
  Sun,
  TrainFront,
  Trees,
  X,
  type LucideIcon,
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
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import {
  BEACH_PARK_D,
  BLOCKS_D,
  BRIDGES_D,
  BUILDINGS_D,
  CENTRAL_PARK_D,
  COAST_D,
  CONTOURS_D,
  DISTRICTS,
  HILL_PARK_D,
  HILL_TRAIL_D,
  ISLAND_D,
  MAJOR_D,
  MINOR_D,
  M_PER_UNIT,
  NODES,
  ORDER,
  PARK_LABELS,
  PARK_TRAILS_D,
  PIERS_D,
  PLACES,
  POND_D,
  RAIL,
  RAIL_D,
  RIVER_D,
  RIVER_LABEL_D,
  SEA_D,
  SMALL_PARKS_D,
  STATIONS,
  STREET_LABELS,
  USER_POS,
  WATER_LABELS,
  WORLD_H,
  WORLD_W,
  edgeBetween,
  polylineLength,
  routeBetween,
  toPathD,
  type Category,
  type Place,
  type Pt,
  type Station,
} from './MapExplorer.data'
import { CourierAvatar, PlacePhoto } from './MapExplorer.photos'

/**
 * 架空の港町「汐見市」を描いた地図アプリ(Google マップ風)。アプリ名「Komichi Maps」、地名・店・人物はすべてオリジナル。
 * - 街は歪ませた格子から交差点ノードと道路エッジを生成し、海岸・川(大通りだけ橋が架かる)・丘・公園で間引いて、
 *   区画と建物を乱数で敷き詰めたベクター地図。建物・道路・川は数本の大きな SVG path にまとめて軽くしている
 * - カメラ(中心・倍率・回転)は ref に持ち、パン/ズームのたびに SVG の <g> と HTML オーバーレイの transform、
 *   CSS 変数 --k(倍率)を直接書き換える。React の再レンダーはクラスタの段階が変わるときだけ。
 *   道路幅・文字サイズは calc(px / var(--k)) で画面上の太さを保ち、ラベルは data-lod 属性と CSS でズーム段階ごとにフェードする
 * - 操作は自前のポインタ処理: ドラッグ(慣性つき)、ホイール(カーソル位置を中心に滑らかに)、ピンチ+2本指回転、
 *   Ctrl/右ドラッグで回転、ダブルクリック、+/− ボタン、矢印キー。移動は d3.interpolateZoom による「引いて寄る」フライト
 * - 「探す」: 検索候補(店・カテゴリ・駅・地区・通り)、カテゴリチップ、ズームに応じて結合/分裂するピンのクラスタ(分裂は親の位置から飛び出す)、
 *   選ぶとカメラが飛んで詳細パネル(広い幅はサイドパネル、狭い幅はドラッグできるボトムシート)。経路はダイクストラ法で求め、
 *   徒歩・自転車・電車(駅まで歩いて汐見線に乗る)の所要時間を比べ、マスクで描き進むアニメーションと曲がり角ごとの案内を出す
 * - 「配達を追跡」: 配達員が経路上を進み(曲がり角で減速、信号で停止)、残り時間のカウントダウン・進捗・タイムラインが更新され、
 *   地図が配達員を追従する(進行方向を上にする回転も可)。地図をドラッグすると追従が外れ、ボタンで戻せる
 * - 現在地ボタン、方位磁針(回転中に押すと北へ戻る)、縮尺バー、ライト/ダークの地図スタイル切り替え。
 *   キー操作は地図やデモにフォーカスがあるときだけ。Esc で候補→経路→詳細の順に閉じる。useReducedMotion 時はフライトや慣性をやめて即座に切り替える
 */

/* ================================================================== */
/* 定数・テーマ                                                         */
/* ================================================================== */

type CatMeta = { id: Category; label: string; color: string; Icon: LucideIcon; aliases: string[] }
const CATS: CatMeta[] = [
  { id: 'cafe', label: 'カフェ', color: '#b0651c', Icon: Coffee, aliases: ['かふぇ', '喫茶', 'きっさ', 'コーヒー', '珈琲', 'coffee', 'cafe'] },
  { id: 'ramen', label: 'ラーメン', color: '#de4b2c', Icon: Soup, aliases: ['らーめん', '中華そば', 'ちゅうかそば', '麺', 'ramen'] },
  { id: 'park', label: '公園', color: '#2b9553', Icon: Trees, aliases: ['こうえん', '緑地', 'りょくち', 'park'] },
  { id: 'books', label: '書店', color: '#5a57d0', Icon: BookOpen, aliases: ['しょてん', '本屋', 'ほんや', '古書', 'こしょ', '古本', 'books'] },
  { id: 'bakery', label: 'パン', color: '#cc4677', Icon: Croissant, aliases: ['ぱん', 'ベーカリー', 'べーかりー', 'bakery'] },
  { id: 'sento', label: '銭湯', color: '#138ea0', Icon: Bath, aliases: ['せんとう', 'お風呂', 'おふろ', 'サウナ', 'さうな'] },
]
const CAT = Object.fromEntries(CATS.map((c) => [c.id, c])) as Record<Category, CatMeta>

const MAX_K = 6
const LOD_STEPS = [0.45, 0.8, 1.4, 2.5]

const THEMES: Record<'light' | 'dark', Record<string, string>> = {
  light: {
    '--land': '#f2efe8',
    '--block': '#e8e3d8',
    '--bldg': '#dad3c5',
    '--bldg-edge': '#c6bcaa',
    '--bldg-shadow': 'rgba(90,75,50,.13)',
    '--park': '#cfe6c1',
    '--contour': '#a9cd98',
    '--sand': '#efe3c3',
    '--water': '#a8d3ed',
    '--water-edge': '#86bde0',
    '--trail': '#93b97f',
    '--casing': '#d8cfbe',
    '--road': '#ffffff',
    '--major-casing': '#dfc275',
    '--major': '#fbeeb6',
    '--bridge': '#b9ad96',
    '--rail': '#878b95',
    '--rail-dash': '#ffffff',
    '--label': '#3d382f',
    '--label-2': '#7d7564',
    '--halo': 'rgba(255,255,255,.92)',
    '--water-label': '#3b7db2',
    '--park-label': '#3b7738',
    '--ui': '#ffffff',
    '--ui-2': '#f4f4f5',
    '--ui-3': '#e7e7ea',
    '--fg': '#18181b',
    '--muted': '#6b6b76',
    '--line': 'rgba(15,15,25,.09)',
    '--accent': '#2563eb',
    '--accent-soft': 'rgba(37,99,235,.1)',
    '--route': '#2f6bff',
    '--route-casing': '#1d47c4',
    '--deliver': '#0e9f78',
    '--traveled': '#9aa0aa',
    '--shadow': '0 8px 28px -8px rgba(20,22,40,.28), 0 1px 3px rgba(20,22,40,.12)',
  },
  dark: {
    '--land': '#1b1f26',
    '--block': '#21262f',
    '--bldg': '#2a303b',
    '--bldg-edge': '#38404d',
    '--bldg-shadow': 'rgba(0,0,0,.35)',
    '--park': '#1c3127',
    '--contour': '#2a4a37',
    '--sand': '#2b2a24',
    '--water': '#0e2537',
    '--water-edge': '#183a55',
    '--trail': '#3f6a4c',
    '--casing': '#1f232a',
    '--road': '#373d49',
    '--major-casing': '#2f2c25',
    '--major': '#57513f',
    '--bridge': '#0f1217',
    '--rail': '#646b78',
    '--rail-dash': '#1b1f26',
    '--label': '#d5d9e1',
    '--label-2': '#8a93a2',
    '--halo': 'rgba(18,20,26,.88)',
    '--water-label': '#6ea6d4',
    '--park-label': '#7dbb88',
    '--ui': '#1d2027',
    '--ui-2': '#272b33',
    '--ui-3': '#323741',
    '--fg': '#eceef2',
    '--muted': '#9aa1ad',
    '--line': 'rgba(255,255,255,.08)',
    '--accent': '#6a9cff',
    '--accent-soft': 'rgba(106,156,255,.14)',
    '--route': '#5b8cff',
    '--route-casing': '#2346a8',
    '--deliver': '#2fc597',
    '--traveled': '#5b616c',
    '--shadow': '0 10px 30px -8px rgba(0,0,0,.6), 0 1px 3px rgba(0,0,0,.4)',
  },
}

/** ズーム段階(data-lod)ごとの表示切り替えを CSS で生成 */
const LOD_CSS = (() => {
  let s = ''
  for (let lod = 0; lod <= 4; lod++) {
    const sel = `.mx-viewport[data-lod="${lod}"]`
    for (let n = 0; n <= lod; n++) s += `${sel} .mx-from-${n}{opacity:1}`
    for (let n = 0; n < lod; n++) s += `${sel} .mx-until-${n}{opacity:0!important}`
  }
  return s
})()

const STYLE = `
.mx-viewport{--k:1;--rinv:0;--rot:0;cursor:grab;outline:none}
.mx-viewport.mx-dragging{cursor:grabbing}
.mx-viewport:focus-visible{box-shadow:inset 0 0 0 3px var(--accent)}
.mx-map path,.mx-map text{transition:fill .45s ease,stroke .45s ease,opacity .3s ease}
.mx-lod{opacity:0;transition:opacity .3s ease}
.mx-land{fill:var(--land)}
.mx-park{fill:var(--park)}
.mx-contour{fill:none;stroke:var(--contour);stroke-width:calc(1.1px / var(--k))}
.mx-blocks{fill:var(--block)}
.mx-bldg{fill:var(--bldg);opacity:0}
.mx-viewport[data-lod="1"] .mx-bldg{opacity:.5}
.mx-viewport[data-lod="2"] .mx-bldg,.mx-viewport[data-lod="3"] .mx-bldg,.mx-viewport[data-lod="4"] .mx-bldg{opacity:1}
.mx-bldg-shadow{fill:var(--bldg-shadow)}
.mx-bldg-edge{fill:none;stroke:var(--bldg-edge);stroke-width:calc(.8px / var(--k))}
.mx-stroke{fill:none;stroke-linecap:round;stroke-linejoin:round}
.mx-riverbank{stroke:var(--park);stroke-width:120}
.mx-river{stroke:var(--water);stroke-width:46}
.mx-sand{stroke:var(--sand);stroke-width:36}
.mx-sea{fill:var(--water)}
.mx-coast{fill:none;stroke:var(--water-edge);stroke-width:calc(1.4px / var(--k))}
.mx-trail{stroke:var(--trail);stroke-width:calc(1.5px / var(--k));stroke-dasharray:calc(5px / var(--k)) calc(4px / var(--k))}
.mx-c-minor{stroke:var(--casing);stroke-width:calc(1.8px / var(--k) + 5px)}
.mx-minor{stroke:var(--road);stroke-width:calc(.7px / var(--k) + 4.2px)}
.mx-c-major{stroke:var(--major-casing);stroke-width:calc(2.6px / var(--k) + 8.5px)}
.mx-major{stroke:var(--major);stroke-width:calc(1.2px / var(--k) + 7px)}
.mx-bridge{stroke:var(--bridge);stroke-width:calc(3.5px / var(--k) + 11.5px);stroke-linecap:butt}
.mx-rail{stroke:var(--rail);stroke-width:calc(3.2px / var(--k) + 1.4px)}
.mx-rail-dash{stroke:var(--rail-dash);stroke-width:calc(1.5px / var(--k) + .5px);stroke-dasharray:calc(7px / var(--k)) calc(7px / var(--k));stroke-linecap:butt}
.mx-street{font-size:calc(10.5px / var(--k));fill:var(--label-2);stroke:var(--halo);stroke-width:calc(3px / var(--k));paint-order:stroke;stroke-linejoin:round;font-weight:500;letter-spacing:calc(.6px / var(--k))}
.mx-street.major{font-size:calc(11.5px / var(--k));fill:var(--label);font-weight:600}
.mx-river-label{font-size:calc(12px / var(--k));fill:var(--water-label);stroke:none;letter-spacing:calc(6px / var(--k));font-style:italic;font-weight:600}
.mx-route-casing{stroke:var(--route-casing);stroke-width:calc(9px / var(--k))}
.mx-route{stroke:var(--route);stroke-width:calc(6px / var(--k))}
.mx-route-bike{stroke:#16a36a;stroke-width:calc(6px / var(--k))}
.mx-route-bike-casing{stroke:#0b6e46;stroke-width:calc(9px / var(--k))}
.mx-route-dots{stroke:var(--route);stroke-width:calc(7px / var(--k));stroke-dasharray:0 calc(12px / var(--k))}
.mx-route-rail-casing{stroke:#fff;stroke-width:calc(11px / var(--k))}
.mx-route-rail{stroke:#e2553b;stroke-width:calc(7px / var(--k))}
.mx-deliver{stroke:var(--deliver);stroke-width:calc(6px / var(--k))}
.mx-deliver-casing{stroke:var(--ui);stroke-width:calc(10px / var(--k))}
.mx-traveled{stroke:var(--traveled);stroke-width:calc(5px / var(--k))}
.mx-hl{stroke:var(--accent);stroke-width:calc(10px / var(--k));opacity:.55}
.mx-upright{position:absolute;left:0;top:0;transform:rotate(calc(var(--rinv) * 1deg)) scale(calc(1 / var(--k)));transform-origin:0 0}
.mx-halo{text-shadow:0 0 2px var(--halo),0 0 2px var(--halo),0 0 3px var(--halo),0 0 4px var(--halo)}
@keyframes mx-pulse{from{transform:translate(-50%,-50%) scale(.5);opacity:.6}to{transform:translate(-50%,-50%) scale(2.6);opacity:0}}
.mx-pulse{animation:mx-pulse 2.2s cubic-bezier(.2,.6,.3,1) infinite}
.mx-scroll{scrollbar-width:thin;scrollbar-color:var(--ui-3) transparent}
.mx-noscroll{scrollbar-width:none}
.mx-noscroll::-webkit-scrollbar{display:none}
${LOD_CSS}
`

/* ================================================================== */
/* 小さなユーティリティ                                                  */
/* ================================================================== */

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const DEG = Math.PI / 180
const rot = (x: number, y: number, deg: number): Pt => {
  const c = Math.cos(deg * DEG)
  const s = Math.sin(deg * DEG)
  return [x * c - y * s, x * s + y * c]
}
const shortestAngle = (from: number, to: number) => {
  let d = (to - from) % 360
  if (d > 180) d -= 360
  if (d < -180) d += 360
  return d
}
const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1])
const toKana = (s: string) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60)).toLowerCase()
const fmtClock = (min: number) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`
}
const fmtDist = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`)
const fmtMin = (min: number) => (min < 60 ? `${Math.max(1, Math.round(min))}分` : `${Math.floor(min / 60)}時間${Math.round(min % 60)}分`)
const DAY_LABEL = ['日', '月', '火', '水', '木', '金', '土']

type OpenInfo = { open: boolean; text: string; tone: 'open' | 'soon' | 'closed' }
function openInfo(p: Place, now: Date): OpenInfo {
  const day = now.getDay()
  const m = now.getHours() * 60 + now.getMinutes()
  if (p.hours.length === 1 && p.hours[0][0] === 0 && p.hours[0][1] === 1440) return { open: true, text: '24時間開放', tone: 'open' }
  const closedOn = (d: number) => p.closed?.includes(d)
  // 前日の深夜営業の続き
  const yday = (day + 6) % 7
  if (!closedOn(yday)) for (const [, c] of p.hours) if (c > 1440 && m < c - 1440) return closingInfo(c - 1440 - m, c)
  if (!closedOn(day)) {
    for (const [o, c] of p.hours) if (m >= o && m < c) return closingInfo(c - m, c)
    const next = p.hours.find(([o]) => o > m)
    if (next) return { open: false, text: `営業時間外 · ${fmtClock(next[0])}に開店`, tone: 'closed' }
  }
  for (let i = 1; i <= 7; i++) {
    const d = (day + i) % 7
    if (!closedOn(d)) return { open: false, text: `営業時間外 · ${i === 1 ? '明日' : `${DAY_LABEL[d]}曜`} ${fmtClock(p.hours[0][0])}に開店`, tone: 'closed' }
  }
  return { open: false, text: '休業中', tone: 'closed' }
}
function closingInfo(left: number, close: number): OpenInfo {
  if (left <= 60) return { open: true, text: `まもなく閉店 · ${fmtClock(close)}`, tone: 'soon' }
  return { open: true, text: `営業中 · ${fmtClock(close)}まで`, tone: 'open' }
}

/* ================================================================== */
/* 経路                                                                */
/* ================================================================== */

type TravelMode = 'walk' | 'bike' | 'transit'
type StepIcon = 'start' | 'left' | 'right' | 'straight' | 'goal' | 'train' | 'walk'
type Step = { icon: StepIcon; text: string; sub?: string }
type Leg = { kind: 'walk' | 'bike' | 'rail'; pts: Pt[]; meters: number; minutes: number }
type RouteOption = { mode: TravelMode; legs: Leg[]; minutes: number; meters: number; steps: Step[]; all: Pt[]; note?: string }

const SPEED = { walk: 80, bike: 230, rail: 600 } // m/min

const cardinal = (dx: number, dy: number) => {
  const a = (Math.atan2(dx, -dy) / DEG + 360) % 360
  return ['北', '北東', '東', '南東', '南', '南西', '西', '北西'][Math.round(a / 45) % 8]
}

function streetPath(from: Pt, to: Pt) {
  const ids = routeBetween(from, to)
  const pts: Pt[] = [from, ...ids.map((i) => NODES[i]!), to]
  return { ids, pts, meters: polylineLength(pts) * M_PER_UNIT }
}

function turnSteps(ids: number[], destName: string, startLabel: string): Step[] {
  const groups: { street: string; a: Pt; b: Pt; len: number }[] = []
  for (let i = 0; i < ids.length - 1; i++) {
    const e = edgeBetween(ids[i], ids[i + 1])
    const a = NODES[ids[i]]!
    const b = NODES[ids[i + 1]]!
    const street = e?.street ?? '路地'
    const last = groups[groups.length - 1]
    if (last && last.street === street) {
      last.b = b
      last.len += dist(a, b)
    } else groups.push({ street, a, b, len: dist(a, b) })
  }
  const steps: Step[] = []
  groups.forEach((g, i) => {
    const dx = g.b[0] - g.a[0]
    const dy = g.b[1] - g.a[1]
    const sub = fmtDist(g.len * M_PER_UNIT)
    if (i === 0) {
      steps.push({ icon: 'start', text: `${startLabel}から${g.street}を${cardinal(dx, dy)}へ`, sub })
      return
    }
    const p = groups[i - 1]
    const cross = (p.b[0] - p.a[0]) * dy - (p.b[1] - p.a[1]) * dx
    const right = cross > 0
    steps.push({ icon: right ? 'right' : 'left', text: `${right ? '右折' : '左折'}して${g.street}へ`, sub })
  })
  if (!groups.length) steps.push({ icon: 'start', text: `${startLabel}を出発` })
  steps.push({ icon: 'goal', text: `${destName}に到着` })
  return steps
}

const stationWalkCache = new Map<string, ReturnType<typeof streetPath>>()
function railSlice(a: Station, b: Station): Pt[] {
  const i0 = Math.min(a.railIndex, b.railIndex)
  const i1 = Math.max(a.railIndex, b.railIndex)
  const s = RAIL.slice(i0, i1 + 1)
  return a.railIndex <= b.railIndex ? s : s.reverse()
}

function computeRoutes(place: Place): Record<TravelMode, RouteOption> {
  const base = streetPath(USER_POS, place.pos)
  const walkMin = base.meters / SPEED.walk
  const bikeMin = base.meters / SPEED.bike + 1
  const walk: RouteOption = {
    mode: 'walk',
    legs: [{ kind: 'walk', pts: base.pts, meters: base.meters, minutes: walkMin }],
    minutes: walkMin,
    meters: base.meters,
    steps: turnSteps(base.ids, place.name, '現在地'),
    all: base.pts,
  }
  const bike: RouteOption = {
    mode: 'bike',
    legs: [{ kind: 'bike', pts: base.pts, meters: base.meters, minutes: bikeMin }],
    minutes: bikeMin,
    meters: base.meters,
    steps: turnSteps(base.ids, place.name, '現在地'),
    all: base.pts,
    note: 'シェアサイクルのポートが現在地の近くにあります',
  }
  // 電車: 駅のペアを総当たりして最短を選ぶ
  let best: RouteOption | null = null
  for (const sa of STATIONS)
    for (const sb of STATIONS) {
      if (sa === sb) continue
      const k1 = `u-${sa.id}`
      if (!stationWalkCache.has(k1)) stationWalkCache.set(k1, streetPath(USER_POS, sa.pos))
      const w1 = stationWalkCache.get(k1)!
      const w2 = streetPath(sb.pos, place.pos)
      const rail = railSlice(sa, sb)
      const railM = polylineLength(rail) * M_PER_UNIT
      const nStops = Math.abs(STATIONS.indexOf(sa) - STATIONS.indexOf(sb))
      const rideMin = railM / SPEED.rail + nStops * 0.6
      const total = w1.meters / SPEED.walk + 3 + rideMin + w2.meters / SPEED.walk
      if (!best || total < best.minutes) {
        const dir = STATIONS.indexOf(sb) > STATIONS.indexOf(sa) ? '丘ノ上方面' : '西汐見方面'
        best = {
          mode: 'transit',
          legs: [
            { kind: 'walk', pts: w1.pts, meters: w1.meters, minutes: w1.meters / SPEED.walk },
            { kind: 'rail', pts: rail, meters: railM, minutes: rideMin + 3 },
            { kind: 'walk', pts: w2.pts, meters: w2.meters, minutes: w2.meters / SPEED.walk },
          ],
          minutes: total,
          meters: w1.meters + railM + w2.meters,
          steps: [
            { icon: 'walk', text: `${sa.name}駅まで歩く`, sub: `${fmtMin(w1.meters / SPEED.walk)} · ${fmtDist(w1.meters)}` },
            { icon: 'train', text: `汐見線 ${dir}に乗車`, sub: `${nStops}駅 · ${fmtMin(rideMin)}(待ち時間 約3分)` },
            { icon: 'walk', text: `${sb.name}駅で降りて歩く`, sub: `${fmtMin(w2.meters / SPEED.walk)} · ${fmtDist(w2.meters)}` },
            { icon: 'goal', text: `${place.name}に到着` },
          ],
          all: [...w1.pts, ...rail, ...w2.pts],
        }
      }
    }
  const transit = best!
  if (transit.minutes >= walkMin) transit.note = '徒歩のほうが早く着きます'
  return { walk, bike, transit }
}

/* ================================================================== */
/* クラスタ                                                             */
/* ================================================================== */

type Marker = { id: string; x: number; y: number; members: Place[] }
function clusterPlaces(places: Place[], level: number): Marker[] {
  const k = 2 ** (level / 2)
  const R = 68 / k
  const left = [...places].sort((a, b) => b.reviews - a.reviews)
  const used = new Set<string>()
  const out: Marker[] = []
  for (const seed of left) {
    if (used.has(seed.id)) continue
    const members = left.filter((p) => !used.has(p.id) && dist(p.pos, seed.pos) < R)
    members.forEach((p) => used.add(p.id))
    const x = members.reduce((s, p) => s + p.pos[0], 0) / members.length
    const y = members.reduce((s, p) => s + p.pos[1], 0) / members.length
    const ids = members.map((p) => p.id).sort()
    out.push({ id: members.length === 1 ? `p-${ids[0]}` : `c-${ids.join('.')}`, x, y, members })
  }
  return out
}

/* ================================================================== */
/* 配達                                                                */
/* ================================================================== */

const COURIER_SPEED = 4.2 / M_PER_UNIT // ワールド単位/秒
const STOP_SEC = 8
const DELIVERY = (() => {
  const rest = PLACES.find((p) => p.id === ORDER.restaurantId)!
  const ids = routeBetween(rest.pos, USER_POS)
  const pts: Pt[] = [rest.pos, ...ids.map((i) => NODES[i]!), USER_POS]
  const cum = [0]
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + dist(pts[i - 1], pts[i]))
  // streets[i] は区間 pts[i-1]→pts[i] の通り名
  const streets = pts.map((_, i) => {
    if (i <= 1) return '店舗前の路地'
    if (i >= pts.length - 1) return 'お届け先の前'
    return edgeBetween(ids[i - 2], ids[i - 1])?.street ?? '路地'
  })
  // 曲がり角(進行方向が 30° 以上変わる点)
  const turns: number[] = []
  for (let i = 1; i < pts.length - 1; i++) {
    const a1 = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0])
    const a2 = Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0])
    if (Math.abs(shortestAngle(a1 / DEG, a2 / DEG)) > 30) turns.push(cum[i])
  }
  const stops = [turns[1] ?? cum[2], turns[Math.max(2, turns.length - 2)] ?? cum[cum.length - 3]].filter((v, i, a) => a.indexOf(v) === i)
  const L = cum[cum.length - 1]
  return { rest, pts, cum, streets, turns, stops, L, d: toPathD(pts) }
})()

function courierAt(d: number) {
  const { pts, cum } = DELIVERY
  let i = 1
  while (i < cum.length - 1 && cum[i] < d) i++
  const t = clamp((d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1), 0, 1)
  const a = pts[i - 1]
  const b = pts[i]
  return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, heading: Math.atan2(b[1] - a[1], b[0] - a[0]) / DEG, seg: i }
}

/* ================================================================== */
/* 検索                                                                */
/* ================================================================== */

type Suggestion =
  | { type: 'place'; id: string; label: string; sub: string; place: Place }
  | { type: 'cat'; id: string; label: string; sub: string; cat: Category }
  | { type: 'station'; id: string; label: string; sub: string; pos: Pt }
  | { type: 'district'; id: string; label: string; sub: string; pos: Pt }
  | { type: 'street'; id: string; label: string; sub: string; d: string }

const STREET_INDEX = STREET_LABELS.filter((s, i, a) => a.findIndex((t) => t.name === s.name) === i)

function searchAll(q: string): Suggestion[] {
  const n = toKana(q.trim())
  if (!n) return []
  const score = (...fields: string[]) => {
    let best = 9
    for (const f of fields) {
      const t = toKana(f)
      if (t.startsWith(n)) best = Math.min(best, 0)
      else if (t.includes(n)) best = Math.min(best, 1)
    }
    return best
  }
  const res: { s: Suggestion; sc: number }[] = []
  CATS.forEach((c) => {
    const sc = score(c.label, ...c.aliases)
    if (sc < 9) res.push({ s: { type: 'cat', id: `cat-${c.id}`, label: c.label, sub: `${PLACES.filter((p) => p.cat === c.id).length}件を地図に表示`, cat: c.id }, sc: sc - 0.5 })
  })
  PLACES.forEach((p) => {
    const sc = score(p.name, p.yomi, ...p.tags)
    if (sc < 9) res.push({ s: { type: 'place', id: p.id, label: p.name, sub: `${CAT[p.cat].label} · ${p.district}`, place: p }, sc })
  })
  STATIONS.forEach((s) => {
    const sc = score(s.name, s.yomi, `${s.name}駅`)
    if (sc < 9) res.push({ s: { type: 'station', id: s.id, label: `${s.name}駅`, sub: '汐見線', pos: s.pos }, sc: sc + 0.2 })
  })
  DISTRICTS.forEach((d) => {
    const sc = score(d.name, d.yomi)
    if (sc < 9) res.push({ s: { type: 'district', id: `d-${d.name}`, label: d.name, sub: '汐見市の地区', pos: d.pos }, sc: sc + 0.3 })
  })
  STREET_INDEX.forEach((s) => {
    const sc = score(s.name)
    if (sc < 9) res.push({ s: { type: 'street', id: `s-${s.id}`, label: s.name, sub: '通り', d: s.d }, sc: sc + 0.4 })
  })
  return res
    .sort((a, b) => a.sc - b.sc)
    .slice(0, 7)
    .map((r) => r.s)
}

const RECENT: Suggestion[] = [
  { type: 'station', id: 'r-st', label: '汐見中央駅', sub: '最近の検索', pos: STATIONS[2].pos },
  { type: 'place', id: 'r-shiori', label: '古書 しおり堂', sub: '最近の検索', place: PLACES.find((p) => p.id === 'shioridou')! },
  { type: 'cat', id: 'r-ramen', label: 'ラーメン', sub: '最近の検索', cat: 'ramen' },
]

/* ================================================================== */
/* メイン                                                               */
/* ================================================================== */

type Cam = { cx: number; cy: number; k: number; r: number }
type Pad = { l: number; r: number; t: number; b: number }
type Toast = { id: number; text: string }

export function MapExplorer() {
  const reduce = !!useReducedMotion()
  const uid = useId().replace(/:/g, '')
  const rootRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const gRef = useRef<SVGGElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const compassRef = useRef<HTMLSpanElement>(null)
  const scaleBarRef = useRef<HTMLDivElement>(null)
  const scaleTextRef = useRef<HTMLSpanElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const cam = useRef<Cam>({ cx: 1180, cy: 760, k: 0.6, r: 0 })
  const size = useRef({ w: 900, h: 560 })
  const lodRef = useRef(-1)
  const animRef = useRef<number | null>(null)
  const reduceRef = useRef(reduce)
  reduceRef.current = reduce

  const [wide, setWide] = useState(true)
  const [viewH, setViewH] = useState(560)
  const [level, setLevel] = useState(-1)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [mode, setMode] = useState<'explore' | 'delivery'>('explore')
  const [category, setCategory] = useState<Category | null>(null)
  const [openOnly, setOpenOnly] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [routeMode, setRouteMode] = useState<TravelMode | null>(null)
  const [saved, setSaved] = useState<Set<string>>(() => new Set(['hiyorimi']))
  const [query, setQuery] = useState('')
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const [highlight, setHighlight] = useState<{ d: string; key: number } | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const [sheetSnap, setSheetSnap] = useState<'peek' | 'full'>('peek')
  const [rotated, setRotated] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [follow, setFollow] = useState(true)
  const [headingUp, setHeadingUp] = useState(false)

  const selected = selectedId ? PLACES.find((p) => p.id === selectedId) ?? null : null
  const routes = useMemo(() => (selected && routeMode ? computeRoutes(selected) : null), [selected, routeMode])
  const route = routes && routeMode ? routes[routeMode] : null

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  const showToast = useCallback((text: string) => setToast({ id: Date.now(), text }), [])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(t)
  }, [toast])

  /* ---------------- パネルとカメラの余白 ---------------- */
  const panelOpen = mode === 'delivery' || !!selected || !!category
  const sheetPeek = Math.round(clamp(viewH * 0.46, 200, 300))
  const padRef = useRef<Pad>({ l: 0, r: 0, t: 0, b: 0 })
  padRef.current = wide
    ? panelOpen
      ? { l: 392, r: 64, t: 24, b: 24 }
      : { l: 0, r: 0, t: 40, b: 0 }
    : panelOpen
      ? { l: 0, r: 44, t: mode === 'delivery' ? 64 : 104, b: sheetPeek }
      : { l: 0, r: 44, t: 104, b: 0 }

  /* ---------------- カメラ ---------------- */
  const minK = () => Math.max(0.2, Math.min(size.current.w / WORLD_W, size.current.h / WORLD_H) * 0.95)

  const apply = useCallback(() => {
    const c = cam.current
    const { w, h } = size.current
    c.k = clamp(c.k, minK(), MAX_K)
    c.cx = clamp(c.cx, 0, WORLD_W)
    c.cy = clamp(c.cy, 0, WORLD_H)
    const vp = viewportRef.current
    if (!vp) return
    gRef.current?.setAttribute('transform', `translate(${w / 2} ${h / 2}) rotate(${c.r}) scale(${c.k}) translate(${-c.cx} ${-c.cy})`)
    if (overlayRef.current)
      overlayRef.current.style.transform = `translate(${w / 2}px, ${h / 2}px) rotate(${c.r}deg) scale(${c.k}) translate(${-c.cx}px, ${-c.cy}px)`
    vp.style.setProperty('--k', String(c.k))
    vp.style.setProperty('--rinv', String(-c.r))
    vp.style.setProperty('--rot', String(c.r))
    if (compassRef.current) compassRef.current.style.transform = `rotate(${c.r}deg)`
    const lod = LOD_STEPS.filter((s) => c.k >= s).length
    if (lod !== lodRef.current) {
      lodRef.current = lod
      vp.dataset.lod = String(lod)
    }
    const lv = clamp(Math.round(Math.log2(c.k) * 2), -5, 5)
    setLevel(lv)
    const isRot = Math.abs(((c.r % 360) + 360) % 360) > 0.5 && Math.abs((((c.r % 360) + 360) % 360) - 360) > 0.5
    setRotated(isRot)
    // 縮尺バー
    const mpp = M_PER_UNIT / c.k
    const cands = [10, 20, 50, 100, 200, 300, 500, 1000, 2000]
    const m = cands.filter((v) => v / mpp <= 92).pop() ?? 10
    if (scaleBarRef.current) scaleBarRef.current.style.width = `${(m / mpp).toFixed(1)}px`
    if (scaleTextRef.current) scaleTextRef.current.textContent = m >= 1000 ? `${m / 1000} km` : `${m} m`
  }, [])

  const stopAnim = useCallback(() => {
    if (animRef.current != null) cancelAnimationFrame(animRef.current)
    animRef.current = null
  }, [])

  /** t: 0→1 の進行で毎フレーム frame を呼ぶ */
  const tween = useCallback(
    (duration: number, frame: (t: number) => void, ease: (t: number) => number = easeCubicInOut) => {
      stopAnim()
      if (reduceRef.current || duration <= 0) {
        frame(1)
        apply()
        return
      }
      const t0 = performance.now()
      const step = (now: number) => {
        const t = clamp((now - t0) / duration, 0, 1)
        frame(ease(t))
        apply()
        animRef.current = t < 1 ? requestAnimationFrame(step) : null
      }
      animRef.current = requestAnimationFrame(step)
    },
    [apply, stopAnim],
  )

  const screenToWorld = useCallback((sx: number, sy: number): Pt => {
    const c = cam.current
    const [x, y] = rot(sx - size.current.w / 2, sy - size.current.h / 2, -c.r)
    return [c.cx + x / c.k, c.cy + y / c.k]
  }, [])

  /** ワールド座標 p が余白を考慮した表示領域の中央に来るカメラ中心 */
  const centerFor = useCallback((p: Pt, k: number, r: number, pad: Pad): Pt => {
    const ox = (pad.l - pad.r) / 2
    const oy = (pad.t - pad.b) / 2
    const [x, y] = rot(ox, oy, -r)
    return [p[0] - x / k, p[1] - y / k]
  }, [])

  const flyTo = useCallback(
    (p: Pt, k: number, opts: { r?: number; pad?: Pad } = {}) => {
      const c0 = { ...cam.current }
      const k1 = clamp(k, minK(), MAX_K)
      const r1 = opts.r ?? c0.r
      const [cx1, cy1] = centerFor(p, k1, r1, opts.pad ?? padRef.current)
      const S = Math.min(size.current.w, size.current.h)
      const interp = interpolateZoom([c0.cx, c0.cy, S / c0.k], [cx1, cy1, S / k1])
      const dr = shortestAngle(c0.r, r1)
      const duration = clamp(interp.duration * 0.62, 450, 1500)
      tween(duration, (t) => {
        const [x, y, w] = interp(t)
        cam.current = { cx: x, cy: y, k: S / w, r: c0.r + dr * t }
      })
    },
    [centerFor, tween],
  )

  const fitPoints = useCallback(
    (pts: Pt[], opts: { maxK?: number; minK?: number; pad?: Pad; r?: number } = {}) => {
      const pad = opts.pad ?? padRef.current
      const r = opts.r ?? cam.current.r
      const rp = pts.map((p) => rot(p[0], p[1], r))
      const xs = rp.map((p) => p[0])
      const ys = rp.map((p) => p[1])
      const bw = Math.max(40, Math.max(...xs) - Math.min(...xs))
      const bh = Math.max(40, Math.max(...ys) - Math.min(...ys))
      const aw = Math.max(80, size.current.w - pad.l - pad.r - 60)
      const ah = Math.max(80, size.current.h - pad.t - pad.b - 60)
      let k = Math.min(aw / bw, ah / bh)
      k = clamp(k, opts.minK ?? 0, opts.maxK ?? 2.4)
      const mid = rot((Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...ys) + Math.min(...ys)) / 2, -r)
      flyTo(mid, k, { pad, r })
    },
    [flyTo],
  )

  const zoomAround = useCallback(
    (sx: number, sy: number, factor: number, duration = 320) => {
      const c0 = { ...cam.current }
      const anchor = screenToWorld(sx, sy)
      const k1 = clamp(c0.k * factor, minK(), MAX_K)
      const [ox, oy] = rot(sx - size.current.w / 2, sy - size.current.h / 2, -c0.r)
      tween(duration, (t) => {
        const k = c0.k * Math.pow(k1 / c0.k, t)
        cam.current = { ...cam.current, k, cx: anchor[0] - ox / k, cy: anchor[1] - oy / k }
      })
    },
    [screenToWorld, tween],
  )

  const rotateTo = useCallback(
    (r1: number) => {
      const c0 = { ...cam.current }
      const dr = shortestAngle(c0.r, r1)
      tween(Math.min(700, 250 + Math.abs(dr) * 3), (t) => {
        cam.current = { ...cam.current, r: c0.r + dr * t }
      })
    },
    [tween],
  )

  const panBy = useCallback(
    (dx: number, dy: number) => {
      const c0 = { ...cam.current }
      const [x, y] = rot(dx, dy, -c0.r)
      tween(220, (t) => {
        cam.current = { ...cam.current, cx: c0.cx + (x / c0.k) * t, cy: c0.cy + (y / c0.k) * t }
      })
    },
    [tween],
  )

  /* ---------------- サイズ監視 ---------------- */
  const firstLayout = useRef(true)
  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      size.current = { w: r.width, h: r.height }
      setWide(r.width >= 760)
      setViewH(r.height)
      if (firstLayout.current) {
        firstLayout.current = false
        cam.current.k = clamp(Math.max(r.width / 2500, r.height / 1300), 0.36, 1)
        cam.current.cx = r.width >= 760 ? 1120 : 1080
        cam.current.cy = 800
      }
      apply()
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [apply])

  /* ---------------- 地図の操作 ---------------- */
  const followRef = useRef(follow)
  followRef.current = follow
  const modeRef = useRef(mode)
  modeRef.current = mode
  const userInteracted = useCallback(() => {
    if (modeRef.current === 'delivery' && followRef.current) setFollow(false)
  }, [])

  const gest = useRef<{
    pointers: Map<number, Pt>
    mode: 'none' | 'pan' | 'pinch' | 'rotate'
    anchor: Pt
    k0: number
    r0: number
    d0: number
    a0: number
    sx: number
    moved: number
    samples: { t: number; x: number; y: number }[]
  }>({ pointers: new Map(), mode: 'none', anchor: [0, 0], k0: 1, r0: 0, d0: 1, a0: 0, sx: 0, moved: 0, samples: [] })

  const local = (e: { clientX: number; clientY: number }): Pt => {
    const r = viewportRef.current!.getBoundingClientRect()
    return [e.clientX - r.left, e.clientY - r.top]
  }

  const beginGesture = (rotateMode: boolean) => {
    const g = gest.current
    const pts = [...g.pointers.values()]
    g.k0 = cam.current.k
    g.r0 = cam.current.r
    g.samples = []
    if (pts.length >= 2) {
      const mid: Pt = [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2]
      g.mode = 'pinch'
      g.anchor = screenToWorld(mid[0], mid[1])
      g.d0 = Math.max(10, dist(pts[0], pts[1]))
      g.a0 = Math.atan2(pts[1][1] - pts[0][1], pts[1][0] - pts[0][0]) / DEG
    } else if (pts.length === 1) {
      g.mode = rotateMode ? 'rotate' : 'pan'
      g.anchor = screenToWorld(pts[0][0], pts[0][1])
      g.sx = pts[0][0]
    } else g.mode = 'none'
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.button !== 2) return
    const vp = viewportRef.current!
    vp.setPointerCapture(e.pointerId)
    vp.focus({ preventScroll: true })
    stopAnim()
    const g = gest.current
    g.pointers.set(e.pointerId, local(e))
    if (g.pointers.size === 1) g.moved = 0
    beginGesture(e.button === 2 || e.ctrlKey)
    vp.classList.add('mx-dragging')
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gest.current
    if (!g.pointers.has(e.pointerId)) return
    const prev = g.pointers.get(e.pointerId)!
    const p = local(e)
    g.pointers.set(e.pointerId, p)
    g.moved += dist(prev, p)
    if (g.moved > 4) userInteracted()
    const c = cam.current
    const { w, h } = size.current
    if (g.mode === 'pan') {
      const [ox, oy] = rot(p[0] - w / 2, p[1] - h / 2, -c.r)
      c.cx = g.anchor[0] - ox / c.k
      c.cy = g.anchor[1] - oy / c.k
      const t = performance.now()
      g.samples.push({ t, x: p[0], y: p[1] })
      while (g.samples.length > 2 && t - g.samples[0].t > 90) g.samples.shift()
    } else if (g.mode === 'rotate') {
      c.r = g.r0 + (p[0] - g.sx) * 0.45
    } else if (g.mode === 'pinch') {
      const pts = [...g.pointers.values()]
      const mid: Pt = [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2]
      const d = Math.max(10, dist(pts[0], pts[1]))
      const a = Math.atan2(pts[1][1] - pts[0][1], pts[1][0] - pts[0][0]) / DEG
      c.k = clamp(g.k0 * (d / g.d0), minK(), MAX_K)
      c.r = g.r0 + shortestAngle(g.a0, a)
      const [ox, oy] = rot(mid[0] - w / 2, mid[1] - h / 2, -c.r)
      c.cx = g.anchor[0] - ox / c.k
      c.cy = g.anchor[1] - oy / c.k
    }
    apply()
  }

  const startInertia = (vx: number, vy: number) => {
    if (reduceRef.current) return
    stopAnim()
    let last = performance.now()
    const step = (now: number) => {
      const dt = Math.min(40, now - last)
      last = now
      const c = cam.current
      const [x, y] = rot(vx * dt, vy * dt, -c.r)
      c.cx -= x / c.k
      c.cy -= y / c.k
      const f = Math.exp(-dt / 280)
      vx *= f
      vy *= f
      apply()
      animRef.current = Math.hypot(vx, vy) > 0.02 ? requestAnimationFrame(step) : null
    }
    animRef.current = requestAnimationFrame(step)
  }

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gest.current
    if (!g.pointers.has(e.pointerId)) return
    g.pointers.delete(e.pointerId)
    const wasMode = g.mode
    if (g.pointers.size > 0) {
      beginGesture(false)
      return
    }
    viewportRef.current?.classList.remove('mx-dragging')
    g.mode = 'none'
    if (wasMode === 'pan' && g.moved > 4 && g.samples.length >= 2) {
      const a = g.samples[0]
      const b = g.samples[g.samples.length - 1]
      const dt = performance.now() - a.t
      if (dt < 140 && b.t - a.t > 0) startInertia((b.x - a.x) / (b.t - a.t), (b.y - a.y) / (b.t - a.t))
    }
    if (g.moved <= 4) {
      setSuggestOpen(false)
    }
  }

  // ホイール(passive: false が必要なので手動で登録)
  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return
    let target = cam.current.k
    let raf: number | null = null
    let anchor: Pt = [0, 0]
    let sp: Pt = [0, 0]
    const run = () => {
      const c = cam.current
      const k = c.k * Math.pow(target / c.k, 0.28)
      const done = Math.abs(Math.log(target / k)) < 0.002
      c.k = done ? target : k
      const [ox, oy] = rot(sp[0] - size.current.w / 2, sp[1] - size.current.h / 2, -c.r)
      c.cx = anchor[0] - ox / c.k
      c.cy = anchor[1] - oy / c.k
      apply()
      raf = done ? null : requestAnimationFrame(run)
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      stopAnim()
      userInteracted()
      const r = vp.getBoundingClientRect()
      sp = [e.clientX - r.left, e.clientY - r.top]
      anchor = screenToWorld(sp[0], sp[1])
      if (raf == null) target = cam.current.k
      const dy = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1)
      target = clamp(target * Math.exp(-dy * (e.ctrlKey ? 0.012 : 0.0024)), minK(), MAX_K)
      if (reduceRef.current) {
        cam.current.k = target
        const [ox, oy] = rot(sp[0] - size.current.w / 2, sp[1] - size.current.h / 2, -cam.current.r)
        cam.current.cx = anchor[0] - ox / target
        cam.current.cy = anchor[1] - oy / target
        apply()
        return
      }
      if (raf == null) raf = requestAnimationFrame(run)
    }
    vp.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      vp.removeEventListener('wheel', onWheel)
      if (raf != null) cancelAnimationFrame(raf)
    }
  }, [apply, screenToWorld, stopAnim, userInteracted])

  const onDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const [x, y] = local(e)
    userInteracted()
    zoomAround(x, y, e.shiftKey ? 0.5 : 2)
  }

  const onMapKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const { w, h } = size.current
    let handled = true
    if (e.key === 'ArrowLeft') e.shiftKey ? rotateTo(cam.current.r - 15) : panBy(-100, 0)
    else if (e.key === 'ArrowRight') e.shiftKey ? rotateTo(cam.current.r + 15) : panBy(100, 0)
    else if (e.key === 'ArrowUp') panBy(0, -100)
    else if (e.key === 'ArrowDown') panBy(0, 100)
    else if (e.key === '+' || e.key === '=') zoomAround(w / 2, h / 2, 1.6)
    else if (e.key === '-' || e.key === '_') zoomAround(w / 2, h / 2, 1 / 1.6)
    else if (e.key === 'n' || e.key === 'N') rotateTo(0)
    else handled = false
    if (handled) {
      e.preventDefault()
      userInteracted()
    }
  }

  /* ---------------- 探すモードの操作 ---------------- */
  const selectPlace = useCallback(
    (p: Place, opts: { keepRoute?: boolean } = {}) => {
      setSelectedId(p.id)
      if (!opts.keepRoute) setRouteMode(null)
      setSuggestOpen(false)
      setSheetSnap('peek')
      // パネルが開いた後の余白でフライト
      requestAnimationFrame(() => flyTo(p.pos, Math.max(cam.current.k, 2.1)))
    },
    [flyTo],
  )

  const closePlace = useCallback(() => {
    setSelectedId(null)
    setRouteMode(null)
  }, [])

  const pickCategory = useCallback(
    (c: Category | null) => {
      setCategory(c)
      setSelectedId(null)
      setRouteMode(null)
      setSheetSnap('peek')
      if (c) {
        const pts = PLACES.filter((p) => p.cat === c).map((p) => p.pos)
        requestAnimationFrame(() => fitPoints([...pts, USER_POS], { maxK: 1.2 }))
      }
    },
    [fitPoints],
  )

  const startRoute = useCallback(
    (m: TravelMode = 'walk') => {
      if (!selected) return
      setRouteMode(m)
      setSheetSnap('peek')
    },
    [selected],
  )

  // 経路が決まったら全体が見えるように
  useEffect(() => {
    if (!route) return
    const id = requestAnimationFrame(() => fitPoints(route.all, { maxK: 2.2 }))
    return () => cancelAnimationFrame(id)
  }, [route, fitPoints])

  const pickSuggestion = (s: Suggestion) => {
    setSuggestOpen(false)
    inputRef.current?.blur()
    if (s.type === 'place') {
      setQuery(s.place.name)
      selectPlace(s.place)
    } else if (s.type === 'cat') {
      setQuery('')
      pickCategory(s.cat)
    } else if (s.type === 'street') {
      setQuery(s.label)
      setSelectedId(null)
      setRouteMode(null)
      const nums = s.d.match(/-?\d+(\.\d+)?/g)!.map(Number)
      const pts: Pt[] = []
      for (let i = 0; i < nums.length; i += 2) pts.push([nums[i], nums[i + 1]])
      setHighlight({ d: s.d, key: Date.now() })
      requestAnimationFrame(() => fitPoints(pts, { maxK: 1.6 }))
    } else {
      setQuery(s.label)
      setSelectedId(null)
      setRouteMode(null)
      requestAnimationFrame(() => flyTo(s.pos, s.type === 'station' ? 2.2 : 1.3))
    }
  }

  useEffect(() => {
    if (!highlight) return
    const t = setTimeout(() => setHighlight(null), 3200)
    return () => clearTimeout(t)
  }, [highlight])

  const suggestions = useMemo(() => (query.trim() ? searchAll(query) : RECENT), [query])
  useEffect(() => setActiveIdx(0), [query])

  const locate = () => {
    userInteracted()
    flyTo(USER_POS, Math.max(cam.current.k, 2), { r: cam.current.r })
  }

  const toggleSave = (id: string) => {
    setSaved((s) => {
      const n = new Set(s)
      if (n.has(id)) {
        n.delete(id)
        showToast('保存済みから削除しました')
      } else {
        n.add(id)
        showToast('「行きたい」リストに保存しました')
      }
      return n
    })
  }

  /* ---------------- クラスタ ---------------- */
  const visiblePlaces = useMemo(
    () =>
      PLACES.filter(
        (p) => (!category || p.cat === category) && (!openOnly || openInfo(p, now).open) && p.id !== selectedId,
      ),
    [category, openOnly, selectedId, now],
  )
  const markers = useMemo(() => (mode === 'explore' ? clusterPlaces(visiblePlaces, level) : []), [visiblePlaces, level, mode])
  const prevMarkers = useRef<Marker[]>([])
  const enterFrom = (m: Marker): Pt | null => {
    const prev = prevMarkers.current.find((pm) => pm.members.some((p) => p.id === m.members[0].id))
    return prev ? [prev.x - m.x, prev.y - m.y] : null
  }
  const exitTo = useCallback(
    (m: Marker): Pt | null => {
      const next = markers.find((nm) => nm.members.some((p) => p.id === m.members[0].id))
      return next ? [next.x - m.x, next.y - m.y] : null
    },
    [markers],
  )
  useEffect(() => {
    prevMarkers.current = markers
  }, [markers])
  const firstPins = useRef(true)
  useEffect(() => {
    const t = setTimeout(() => (firstPins.current = false), 1500)
    return () => clearTimeout(t)
  }, [])

  const onClusterClick = (m: Marker) => {
    userInteracted()
    if (m.members.length === 1) return selectPlace(m.members[0])
    const k = cam.current.k
    fitPoints(
      m.members.map((p) => p.pos),
      { maxK: Math.max(k * 2.2, 1.2), minK: k * 1.7 },
    )
  }

  /* ---------------- 配達モード ---------------- */
  const courierRef = useRef<HTMLDivElement>(null)
  const remainRef = useRef<SVGPathElement>(null)
  const sim = useRef({ d: 0, stopLeft: 0, done: new Set<number>(), paused: false, speed: 8, h: 0, arrived: false })
  const [dstate, setDstate] = useState({ eta: DELIVERY.L / COURIER_SPEED, p: 0, street: DELIVERY.streets[1], stopped: false, arrived: false })
  const [paused, setPaused] = useState(false)
  const [speed, setSpeed] = useState(8)
  const startClock = useRef(new Date())
  const headingUpRef = useRef(headingUp)
  headingUpRef.current = headingUp

  const resetDelivery = () => {
    sim.current = { ...sim.current, d: 0, stopLeft: 0, done: new Set(), arrived: false, paused: false }
    setPaused(false)
    startClock.current = new Date()
    setDstate({ eta: DELIVERY.L / COURIER_SPEED + DELIVERY.stops.length * STOP_SEC, p: 0, street: DELIVERY.streets[1], stopped: false, arrived: false })
    setFollow(true)
  }

  useEffect(() => {
    sim.current.paused = paused
  }, [paused])
  useEffect(() => {
    sim.current.speed = speed
  }, [speed])

  useEffect(() => {
    if (mode !== 'delivery') return
    let raf = 0
    let last = performance.now()
    let lastUi = 0
    const s = sim.current
    const tick = (nowT: number) => {
      const dt = Math.min(0.05, (nowT - last) / 1000)
      last = nowT
      if (!s.paused && !s.arrived) {
        let simDt = dt * s.speed
        if (s.stopLeft > 0) {
          const used = Math.min(s.stopLeft, simDt)
          s.stopLeft -= used
          simDt -= used
        }
        if (simDt > 0) {
          const nearTurn = DELIVERY.turns.reduce((m, t) => Math.min(m, Math.abs(t - s.d)), Infinity)
          const f = 0.4 + 0.6 * clamp(nearTurn / 45, 0, 1)
          const nd = Math.min(DELIVERY.L, s.d + COURIER_SPEED * f * simDt)
          const stop = DELIVERY.stops.find((sd) => !s.done.has(sd) && s.d < sd && nd >= sd)
          if (stop != null) {
            s.done.add(stop)
            s.d = stop
            s.stopLeft = STOP_SEC
          } else s.d = nd
          if (s.d >= DELIVERY.L) s.arrived = true
        }
      }
      const pos = courierAt(s.d)
      s.h += shortestAngle(s.h, pos.heading) * Math.min(1, dt * 8)
      const el = courierRef.current
      if (el) {
        el.style.transform = `translate(${pos.x}px, ${pos.y}px)`
        el.style.setProperty('--h', String(s.h))
      }
      const p = s.d / DELIVERY.L
      remainRef.current?.setAttribute('stroke-dashoffset', String(-p))
      // カメラ追従
      if (followRef.current && gest.current.mode === 'none' && animRef.current == null) {
        const c = cam.current
        const r1 = headingUpRef.current ? -90 - s.h : c.r
        const lerp = reduceRef.current ? 1 : 1 - Math.exp(-dt * 4)
        c.r += shortestAngle(c.r, r1) * lerp
        const [tx, ty] = centerFor([pos.x, pos.y], c.k, c.r, padRef.current)
        c.cx += (tx - c.cx) * lerp
        c.cy += (ty - c.cy) * lerp
        apply()
      }
      if (nowT - lastUi > 200) {
        lastUi = nowT
        const pending = DELIVERY.stops.filter((sd) => !s.done.has(sd)).length * STOP_SEC
        setDstate({
          eta: s.arrived ? 0 : (DELIVERY.L - s.d) / COURIER_SPEED + pending + s.stopLeft,
          p,
          street: DELIVERY.streets[pos.seg] ?? '',
          stopped: s.stopLeft > 0,
          arrived: s.arrived,
        })
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [mode, apply, centerFor])

  const switchMode = (m: 'explore' | 'delivery') => {
    if (m === mode) return
    setMode(m)
    setSuggestOpen(false)
    setSheetSnap('peek')
    if (m === 'delivery') {
      setFollow(false)
      requestAnimationFrame(() => {
        fitPoints(DELIVERY.pts, { maxK: 1.4, r: 0 })
        setTimeout(() => setFollow(true), reduceRef.current ? 0 : 1300)
      })
    } else {
      setHeadingUp(false)
      requestAnimationFrame(() => flyTo(selected ? selected.pos : USER_POS, 1.2, { r: 0 }))
    }
  }

  const enableFollow = () => {
    setFollow(true)
    const c = cam.current
    if (c.k < 1.4) {
      const pos = courierAt(sim.current.d)
      flyTo([pos.x, pos.y], 1.7)
    }
  }

  useEffect(() => {
    if (!headingUp && mode === 'delivery') rotateTo(0)
  }, [headingUp, mode, rotateTo])

  /* ---------------- Esc ---------------- */
  const onRootKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Escape') return
    if (suggestOpen) setSuggestOpen(false)
    else if (routeMode) setRouteMode(null)
    else if (selectedId) closePlace()
    else if (category) pickCategory(null)
    else return
    e.stopPropagation()
  }

  /* ---------------- 描画 ---------------- */
  const themeVars = THEMES[theme] as CSSProperties
  const view: 'delivery' | 'route' | 'place' | 'results' | null =
    mode === 'delivery' ? 'delivery' : route && selected ? 'route' : selected ? 'place' : category ? 'results' : null

  const panelBody =
    view === 'delivery' ? (
      <DeliveryPanel
        dstate={dstate}
        startClock={startClock.current}
        reduce={reduce}
        follow={follow}
        onFollow={enableFollow}
        headingUp={headingUp}
        setHeadingUp={setHeadingUp}
        paused={paused}
        setPaused={setPaused}
        speed={speed}
        setSpeed={setSpeed}
        onRestart={resetDelivery}
        toast={showToast}
      />
    ) : view === 'route' && selected && routes && routeMode ? (
      <RoutePanel place={selected} routes={routes} mode={routeMode} setMode={setRouteMode} onBack={() => setRouteMode(null)} now={now} />
    ) : view === 'place' && selected ? (
      <PlaceDetail
        place={selected}
        now={now}
        saved={saved.has(selected.id)}
        onSave={() => toggleSave(selected.id)}
        onRoute={() => startRoute('walk')}
        onBack={category ? () => closePlace() : undefined}
        onClose={() => {
          closePlace()
          setQuery('')
        }}
        toast={showToast}
      />
    ) : view === 'results' && category ? (
      <ResultsPanel
        cat={category}
        now={now}
        openOnly={openOnly}
        setOpenOnly={setOpenOnly}
        onPick={(p) => selectPlace(p)}
        onHover={setHoverId}
        onClose={() => pickCategory(null)}
        saved={saved}
      />
    ) : null

  return (
    <div
      ref={rootRef}
      className="@container relative h-full w-full overflow-clip bg-[var(--land)] text-[var(--fg)] transition-colors duration-500"
      style={themeVars}
      onKeyDown={onRootKey}
    >
      <style>{STYLE}</style>

      {/* ---------------- 地図 ---------------- */}
      <div
        ref={viewportRef}
        className="mx-viewport absolute inset-0 touch-none select-none overflow-clip"
        data-lod="1"
        tabIndex={0}
        role="application"
        aria-label="汐見市の地図。ドラッグで移動、ホイールでズーム、矢印キーで移動、+ と − でズーム、Shift+左右で回転、N で北を上に"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={onMapKey}
      >
        <svg className="mx-map absolute inset-0 h-full w-full" aria-hidden>
          <g ref={gRef}>
            <MapBase uid={uid} />
            {highlight && (
              <motion.path
                key={highlight.key}
                d={highlight.d}
                className="mx-stroke mx-hl"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: reduce ? 0 : 0.9, ease: 'easeInOut' }}
              />
            )}
            {mode === 'explore' && route && <RouteLayer key={`${selectedId}-${route.mode}`} route={route} uid={uid} reduce={reduce} />}
            {mode === 'delivery' && (
              <g>
                <path d={DELIVERY.d} className="mx-stroke mx-deliver-casing" />
                <path d={DELIVERY.d} className="mx-stroke mx-traveled" />
                <path ref={remainRef} d={DELIVERY.d} pathLength={1} strokeDasharray="1 1" className="mx-stroke mx-deliver" />
              </g>
            )}
          </g>
        </svg>

        <div ref={overlayRef} className="pointer-events-none absolute left-0 top-0 origin-top-left" style={{ width: WORLD_W, height: WORLD_H }}>
          <StaticLabels />
          <UserDot reduce={reduce} />
          <AnimatePresence custom={exitTo}>
            {markers.map((m, i) => (
              <MarkerView
                key={m.id}
                m={m}
                from={enterFrom(m)}
                exitTo={exitTo}
                hovered={m.members.some((p) => p.id === hoverId)}
                saved={m.members.length === 1 && saved.has(m.members[0].id)}
                onClick={() => onClusterClick(m)}
                reduce={reduce}
                delay={firstPins.current ? 0.25 + i * 0.025 : 0}
              />
            ))}
          </AnimatePresence>
          <AnimatePresence>
            {mode === 'explore' && selected && <SelectedPin key={selected.id} place={selected} reduce={reduce} />}
          </AnimatePresence>
          {mode === 'explore' && route && <RouteBubble route={route} />}
          {mode === 'delivery' && (
            <>
              <WorldAnchor pos={DELIVERY.rest.pos}>
                <div className="absolute left-0 top-0 flex w-max -translate-x-1/2 -translate-y-full flex-col items-center">
                  <div className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--ui)] py-1 pl-1 pr-2.5 text-[11px] font-semibold shadow-[var(--shadow)]">
                    <span className="grid size-6 place-items-center rounded-full bg-[#de4b2c] text-white">
                      <Store className="size-3.5" />
                    </span>
                    {DELIVERY.rest.name}
                  </div>
                  <span className="h-2 w-0.5 bg-[var(--fg)] opacity-40" />
                </div>
              </WorldAnchor>
              <WorldAnchor pos={USER_POS}>
                <div className="absolute left-0 top-0 flex w-max -translate-x-1/2 -translate-y-[calc(100%+10px)] flex-col items-center">
                  <div className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--fg)] py-1 pl-1 pr-2.5 text-[11px] font-semibold text-[var(--ui)] shadow-[var(--shadow)]">
                    <span className="grid size-6 place-items-center rounded-full bg-[var(--deliver)] text-white">
                      <House className="size-3.5" />
                    </span>
                    お届け先
                  </div>
                </div>
              </WorldAnchor>
              <div ref={courierRef} className="absolute left-0 top-0" style={{ transform: `translate(${DELIVERY.pts[0][0]}px, ${DELIVERY.pts[0][1]}px)` }}>
                <div className="mx-upright">
                  <div className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2">
                    <div
                      className="absolute left-1/2 top-1/2 size-[58px]"
                      style={{ transform: 'translate(-50%,-50%) rotate(calc((var(--h) + var(--rot) + 90) * 1deg))' }}
                    >
                      <svg viewBox="0 0 58 58" className="size-full">
                        <path d="M29 2 L37 15 Q29 12 21 15Z" fill="var(--deliver)" />
                      </svg>
                    </div>
                    {!reduce && <span className="mx-pulse absolute left-1/2 top-1/2 size-10 rounded-full bg-[var(--deliver)] opacity-40" />}
                    <div className="relative grid size-10 place-items-center rounded-full border-[3px] border-white bg-[var(--deliver)] text-white shadow-[0_4px_14px_-2px_rgba(0,0,0,.45)]">
                      <Bike className="size-5" strokeWidth={2.2} />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ---------------- 上部: 検索・チップ / モード切り替え ---------------- */}
      <div className="pointer-events-none absolute inset-x-2 top-2 z-20 flex flex-col gap-2 @3xl:inset-x-3 @3xl:top-3 @3xl:w-[372px]">
        <div className="flex gap-2">
          {mode === 'explore' ? (
            <SearchBox
              inputRef={inputRef}
              query={query}
              setQuery={setQuery}
              open={suggestOpen}
              setOpen={setSuggestOpen}
              items={suggestions}
              active={activeIdx}
              setActive={setActiveIdx}
              onPick={pickSuggestion}
              onClear={() => {
                setQuery('')
                closePlace()
                setCategory(null)
                inputRef.current?.focus()
              }}
              uid={uid}
              reduce={reduce}
            />
          ) : wide ? null : (
            <div className="pointer-events-auto flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-full bg-[var(--ui)] pl-2 pr-4 shadow-[var(--shadow)]">
              <span className="relative grid size-8 shrink-0 place-items-center rounded-full bg-[var(--deliver)] text-white">
                <Package className="size-4" />
              </span>
              <div className="min-w-0 leading-tight">
                <div className="truncate text-[13px] font-semibold">{dstate.arrived ? 'お届け完了' : '配達中'} · {DELIVERY.rest.name}</div>
                <div className="truncate text-[11px] text-[var(--muted)]">注文 #{ORDER.no}</div>
              </div>
            </div>
          )}
          {!wide && <ModeSwitch mode={mode} onChange={switchMode} compact />}
        </div>
        {mode === 'explore' && (
          <div className="mx-noscroll pointer-events-auto -mx-2 flex gap-1.5 overflow-x-auto px-2 pb-1 @3xl:mx-0 @3xl:px-0">
            {CATS.map((c) => {
              const on = category === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => pickCategory(on ? null : c.id)}
                  className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] ${
                    on ? 'border-transparent text-white' : 'border-[var(--line)] bg-[var(--ui)] text-[var(--fg)] hover:bg-[var(--ui-2)]'
                  }`}
                  style={on ? { background: c.color } : undefined}
                >
                  <c.Icon className="size-3.5" style={on ? undefined : { color: c.color }} />
                  {c.label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {wide && (
        <div className="absolute right-3 top-3 z-20">
          <ModeSwitch mode={mode} onChange={switchMode} />
        </div>
      )}

      {/* ---------------- 右側のコントロール ---------------- */}
      <div className={`absolute right-2 z-10 flex flex-col gap-1.5 @3xl:right-3 @3xl:gap-2 ${wide ? 'top-16' : mode === 'delivery' ? 'top-[62px]' : 'top-[100px]'}`}>
        <CtrlButton label={theme === 'light' ? 'ダークスタイルに切り替え' : 'ライトスタイルに切り替え'} onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}>
          {theme === 'light' ? <Moon className="size-[18px]" /> : <Sun className="size-[18px]" />}
        </CtrlButton>
        <CtrlButton label={rotated ? '北を上にする' : '方位磁針(北が上)'} onClick={() => rotateTo(0)}>
          <span ref={compassRef} className="grid size-full place-items-center">
            <svg viewBox="0 0 24 24" className="size-[22px]" aria-hidden>
              <path d="M12 2 L15.5 12 H8.5Z" fill="#e2453b" />
              <path d="M12 22 L8.5 12 H15.5Z" fill="var(--muted)" opacity="0.55" />
              <circle cx="12" cy="12" r="1.6" fill="var(--ui)" />
            </svg>
          </span>
        </CtrlButton>
        <CtrlButton label="現在地を表示" onClick={locate}>
          <LocateFixed className="size-[18px] text-[var(--accent)]" />
        </CtrlButton>
        <div className="flex flex-col overflow-hidden rounded-xl bg-[var(--ui)] shadow-[var(--shadow)]">
          <button
            type="button"
            aria-label="ズームイン"
            onClick={() => zoomAround(size.current.w / 2, size.current.h / 2, 1.7)}
            className="grid size-9 place-items-center text-[var(--fg)] transition-colors hover:bg-[var(--ui-2)] focus-visible:outline-2 focus-visible:-outline-offset-2 @3xl:size-10 focus-visible:outline-[var(--accent)]"
          >
            <Plus className="size-[18px]" />
          </button>
          <span className="mx-2 h-px bg-[var(--line)]" />
          <button
            type="button"
            aria-label="ズームアウト"
            onClick={() => zoomAround(size.current.w / 2, size.current.h / 2, 1 / 1.7)}
            className="grid size-9 place-items-center text-[var(--fg)] transition-colors hover:bg-[var(--ui-2)] focus-visible:outline-2 focus-visible:-outline-offset-2 @3xl:size-10 focus-visible:outline-[var(--accent)]"
          >
            <Minus className="size-[18px]" />
          </button>
        </div>
      </div>

      {/* ---------------- 縮尺・クレジット ---------------- */}
      <div className="pointer-events-none absolute bottom-2 right-2 z-10 flex items-end gap-2 @3xl:bottom-3 @3xl:right-3">
        <div className="rounded-md bg-[var(--ui)]/80 px-1.5 py-1 backdrop-blur-sm">
          <div className="text-[10px] font-semibold leading-none tabular-nums text-[var(--fg)]">
            <span ref={scaleTextRef}>200 m</span>
          </div>
          <div ref={scaleBarRef} className="mt-1 h-1.5 border-x-2 border-b-2 border-[var(--fg)]" style={{ width: 60 }} />
        </div>
        <div className="hidden rounded bg-[var(--ui)]/80 px-1.5 py-0.5 text-[10px] text-[var(--muted)] backdrop-blur-sm @md:block">© Komichi Maps · 地図データは架空です</div>
      </div>

      {/* ---------------- パネル ---------------- */}
      {wide ? (
        <AnimatePresence>
          {view && (
            <motion.aside
              key="side"
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: -24 }}
              transition={{ type: 'spring', stiffness: 420, damping: 38 }}
              className={`absolute bottom-3 left-3 z-10 flex w-[372px] flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--ui)] shadow-[var(--shadow)] ${
                mode === 'delivery' ? 'top-3' : 'top-[104px]'
              }`}
              aria-label="詳細パネル"
            >
              <PanelSwitch detailKey={`${view}-${selectedId}`} reduce={reduce}>
                {panelBody}
              </PanelSwitch>
            </motion.aside>
          )}
        </AnimatePresence>
      ) : (
        <Sheet open={!!view} h={viewH} peek={sheetPeek} snap={sheetSnap} setSnap={setSheetSnap} reduce={reduce} onClose={() => (mode === 'delivery' ? switchMode('explore') : routeMode ? setRouteMode(null) : selectedId ? closePlace() : pickCategory(null))}>
          {view && (
            <PanelSwitch detailKey={`${view}-${selectedId}`} reduce={reduce}>
              {panelBody}
            </PanelSwitch>
          )}
        </Sheet>
      )}

      {/* ---------------- トースト ---------------- */}
      <div className={`pointer-events-none absolute inset-x-0 z-30 flex justify-center ${wide ? 'bottom-6' : 'top-[104px]'}`} aria-live="polite">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: wide ? 12 : -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 rounded-full bg-[var(--fg)] px-4 py-2 text-[12.5px] font-medium text-[var(--ui)] shadow-[var(--shadow)]"
            >
              <Check className="size-4" />
              {toast.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ================================================================== */
/* 地図レイヤー                                                          */
/* ================================================================== */

const MapBase = memo(function MapBase({ uid }: { uid: string }) {
  return (
    <g>
      <rect x={-3000} y={-3000} width={WORLD_W + 6000} height={WORLD_H + 6000} className="mx-land" />
      <path d={RIVER_D} className="mx-stroke mx-riverbank" />
      <path d={HILL_PARK_D} className="mx-park" />
      <path d={CENTRAL_PARK_D} className="mx-park" />
      <path d={SMALL_PARKS_D} className="mx-park" />
      <path d={BEACH_PARK_D} className="mx-park" />
      <path d={CONTOURS_D} className="mx-contour mx-lod mx-from-1" />
      <path d={BLOCKS_D} className="mx-blocks" />
      <path d={BUILDINGS_D} className="mx-bldg-shadow mx-lod mx-from-3" transform="translate(2.2 2.8)" />
      <path d={BUILDINGS_D} className="mx-bldg" />
      <path d={BUILDINGS_D} className="mx-bldg-edge mx-lod mx-from-3" />
      <path d={POND_D} className="mx-sea" />
      <path d={RIVER_D} className="mx-stroke mx-river" />
      <path d={COAST_D} className="mx-stroke mx-sand" />
      <path d={SEA_D} className="mx-sea" />
      <path d={COAST_D} className="mx-coast" />
      <path d={ISLAND_D} className="mx-park" />
      <path d={PIERS_D} className="mx-blocks" />
      <path d={HILL_TRAIL_D + PARK_TRAILS_D} className="mx-stroke mx-trail mx-lod mx-from-2" />
      <path d={BRIDGES_D} className="mx-stroke mx-bridge" />
      <path d={MINOR_D} className="mx-stroke mx-c-minor" />
      <path d={MAJOR_D} className="mx-stroke mx-c-major" />
      <path d={MINOR_D} className="mx-stroke mx-minor" />
      <path d={MAJOR_D} className="mx-stroke mx-major" />
      <path d={RAIL_D} className="mx-stroke mx-rail" />
      <path d={RAIL_D} className="mx-stroke mx-rail-dash" />
      <defs>
        <path id={`${uid}-river`} d={RIVER_LABEL_D} />
        {STREET_LABELS.map((s) => (
          <path key={s.id} id={`${uid}-st-${s.id}`} d={s.d} />
        ))}
      </defs>
      <text className="mx-river-label">
        <textPath href={`#${uid}-river`} startOffset="50%" textAnchor="middle">
          鷺川
        </textPath>
      </text>
      {STREET_LABELS.map((s) => (
        <text key={s.id} className={`mx-street mx-lod ${s.major ? 'major mx-from-1' : 'mx-from-3'}`} dy="0.35em">
          <textPath href={`#${uid}-st-${s.id}`} startOffset="50%" textAnchor="middle">
            {s.name}
          </textPath>
        </text>
      ))}
    </g>
  )
})

/** ワールド座標に置き、回転・拡大を打ち消して常に正立・等倍で表示する */
function WorldAnchor({ pos, children, className = '' }: { pos: Pt; children: ReactNode; className?: string }) {
  return (
    <div className={`absolute ${className}`} style={{ left: pos[0], top: pos[1] }}>
      <div className="mx-upright">{children}</div>
    </div>
  )
}

const StaticLabels = memo(function StaticLabels() {
  return (
    <>
      {DISTRICTS.map((d) => (
        <WorldAnchor key={d.name} pos={d.pos} className="mx-lod mx-from-0 mx-until-2">
          <div className="mx-halo absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[13px] font-bold tracking-[0.3em] text-[var(--label-2)]">
            {d.name}
          </div>
        </WorldAnchor>
      ))}
      {PARK_LABELS.map((p) => (
        <WorldAnchor key={p.name} pos={p.pos} className="mx-lod mx-from-2">
          <div className="mx-halo absolute left-0 top-0 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 whitespace-nowrap text-[11px] font-semibold text-[var(--park-label)]">
            <Trees className="size-3" />
            {p.name}
          </div>
        </WorldAnchor>
      ))}
      {WATER_LABELS.map((w) => (
        <WorldAnchor key={w.name} pos={w.pos}>
          <div
            className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-semibold italic tracking-[0.35em] text-[var(--water-label)]"
            style={{ fontSize: w.size }}
          >
            {w.name}
          </div>
        </WorldAnchor>
      ))}
      {STATIONS.map((s) => (
        <WorldAnchor key={s.id} pos={s.pos}>
          <div className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2">
            <div className="grid size-[18px] place-items-center rounded-[5px] border-2 border-[#3b3f48] bg-white text-[#3b3f48] shadow-sm">
              <TrainFront className="size-2.5" strokeWidth={2.6} />
            </div>
          </div>
          <div className="mx-halo mx-lod mx-from-1 absolute left-0 top-[12px] -translate-x-1/2 whitespace-nowrap text-[11.5px] font-bold text-[var(--label)]">
            {s.name}駅
          </div>
        </WorldAnchor>
      ))}
    </>
  )
})

function UserDot({ reduce }: { reduce: boolean }) {
  return (
    <WorldAnchor pos={USER_POS}>
      <div className="absolute left-0 top-0">
        <svg viewBox="0 0 60 60" className="absolute left-0 top-0 size-[60px]" style={{ transform: 'translate(-50%,-50%) rotate(calc((var(--rot) + 40) * 1deg))' }} aria-hidden>
          <defs>
            <radialGradient id="mx-cone" cx="50%" cy="100%" r="100%">
              <stop offset="0" stopColor="#2f6bff" stopOpacity="0.45" />
              <stop offset="1" stopColor="#2f6bff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <path d="M30 30 L18 4 A28 28 0 0 1 42 4Z" fill="url(#mx-cone)" />
        </svg>
        {!reduce && <span className="mx-pulse absolute left-0 top-0 size-8 rounded-full bg-[#2f6bff]" />}
        <span className="absolute left-0 top-0 size-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-[#2f6bff] shadow-[0_2px_8px_rgba(0,0,0,.35)]" />
      </div>
    </WorldAnchor>
  )
}

function MarkerView({
  m,
  from,
  exitTo,
  hovered,
  saved,
  onClick,
  reduce,
  delay,
}: {
  m: Marker
  from: Pt | null
  exitTo: (m: Marker) => Pt | null
  hovered: boolean
  saved: boolean
  onClick: () => void
  reduce: boolean
  delay: number
}) {
  const single = m.members.length === 1
  const p = m.members[0]
  const meta = CAT[p.cat]
  const spring = reduce ? { duration: 0.15 } : { type: 'spring' as const, stiffness: 320, damping: 30, delay }
  return (
    <motion.div
      className="absolute"
      style={{ left: m.x, top: m.y, zIndex: hovered ? 5 : single ? 2 : 3 }}
      custom={exitTo}
      initial={reduce ? { opacity: 0 } : from ? { x: from[0], y: from[1], opacity: 0.4 } : { opacity: 0 }}
      animate={{ x: 0, y: 0, opacity: 1 }}
      exit="exit"
      variants={{
        exit: (fn: (m: Marker) => Pt | null) => {
          const t = reduce ? null : fn?.(m)
          return t ? { x: t[0], y: t[1], opacity: 0, transition: { duration: 0.32, ease: [0.4, 0, 0.2, 1] } } : { opacity: 0, transition: { duration: 0.15 } }
        },
      }}
      transition={spring}
    >
      <div className="mx-upright">
        <motion.div
          initial={reduce ? false : { scale: from ? 0.7 : 0 }}
          animate={{ scale: hovered ? 1.15 : 1 }}
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 24, delay }}
          className="absolute left-0 top-0"
        >
          {single ? (
            <div className="absolute left-0 top-0">
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                onClick={onClick}
                aria-label={`${p.name}(${meta.label})`}
                className="group pointer-events-auto absolute left-0 top-0 grid size-[30px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white text-white shadow-[0_3px_10px_-2px_rgba(0,0,0,.45)] transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                style={{ background: meta.color }}
              >
                <meta.Icon className="size-[15px]" strokeWidth={2.2} />
                {saved && (
                  <span className="absolute -right-1 -top-1 grid size-3.5 place-items-center rounded-full bg-[#f2b400] ring-2 ring-white">
                    <Bookmark className="size-2 fill-white text-white" />
                  </span>
                )}
              </button>
              <div
                className={`mx-halo pointer-events-none absolute left-[19px] top-0 -translate-y-1/2 whitespace-nowrap text-[11.5px] font-semibold text-[var(--label)] transition-opacity duration-300 ${
                  hovered ? 'opacity-100' : 'mx-lod mx-from-3'
                }`}
              >
                {p.name}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
              onClick={onClick}
              aria-label={`${m.members.length}件の場所。クリックで拡大`}
              className="pointer-events-auto absolute left-0 top-0 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full p-[3px] shadow-[0_4px_14px_-3px_rgba(0,0,0,.45)] transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              style={{
                width: 32 + Math.min(14, m.members.length * 2),
                height: 32 + Math.min(14, m.members.length * 2),
                background: clusterRing(m.members),
              }}
            >
              <span className="grid size-full place-items-center rounded-full bg-[var(--ui)] text-[13px] font-bold tabular-nums text-[var(--fg)]">
                {m.members.length}
              </span>
            </button>
          )}
        </motion.div>
      </div>
    </motion.div>
  )
}

function clusterRing(members: Place[]) {
  const counts = CATS.map((c) => ({ c, n: members.filter((p) => p.cat === c.id).length })).filter((x) => x.n)
  let acc = 0
  const stops = counts.map(({ c, n }) => {
    const a = (acc / members.length) * 360
    acc += n
    const b = (acc / members.length) * 360
    return `${c.color} ${a}deg ${b}deg`
  })
  return `conic-gradient(${stops.join(',')})`
}

function SelectedPin({ place, reduce }: { place: Place; reduce: boolean }) {
  const meta = CAT[place.cat]
  return (
    <WorldAnchor pos={place.pos} className="z-10">
      <motion.span
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        className="absolute left-0 top-0 h-2 w-5 -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-black/30 blur-[2px]"
      />
      <motion.div
        className="absolute left-0 top-0 origin-bottom"
        initial={reduce ? { opacity: 0 } : { y: -46, opacity: 0, scale: 0.6 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={reduce ? { opacity: 0 } : { y: -12, opacity: 0, scale: 0.7, transition: { duration: 0.18 } }}
        transition={reduce ? { duration: 0.15 } : { type: 'spring', stiffness: 520, damping: 20, delay: 0.15 }}
      >
        <svg viewBox="0 0 40 52" className="absolute left-0 top-0 h-[52px] w-[40px] -translate-x-1/2 -translate-y-full drop-shadow-[0_4px_6px_rgba(0,0,0,.35)]" aria-hidden>
          <path d="M20 51 C20 51 3 32 3 19 A17 17 0 0 1 37 19 C37 32 20 51 20 51Z" fill={meta.color} stroke="#fff" strokeWidth="2.5" />
        </svg>
        <div className="absolute left-0 top-[-44px] grid size-6 -translate-x-1/2 place-items-center text-white">
          <meta.Icon className="size-[17px]" strokeWidth={2.4} />
        </div>
        <div className="mx-halo absolute left-[22px] top-[-36px] whitespace-nowrap text-[13px] font-bold text-[var(--label)]">{place.name}</div>
      </motion.div>
    </WorldAnchor>
  )
}

function RouteLayer({ route, uid, reduce }: { route: RouteOption; uid: string; reduce: boolean }) {
  const mask = `${uid}-route-mask`
  const allD = toPathD(route.all)
  return (
    <g>
      <defs>
        <mask id={mask} maskUnits="userSpaceOnUse" x={-500} y={-500} width={WORLD_W + 1000} height={WORLD_H + 1000}>
          <motion.path
            d={allD}
            fill="none"
            stroke="#fff"
            strokeWidth={80}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: reduce ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: reduce ? 0 : 1.1, ease: [0.45, 0, 0.2, 1], delay: reduce ? 0 : 0.35 }}
          />
        </mask>
      </defs>
      <g mask={`url(#${mask})`}>
        {route.legs.map((l, i) =>
          l.kind === 'walk' ? (
            <path key={i} d={toPathD(l.pts)} className="mx-stroke mx-route-dots" />
          ) : l.kind === 'bike' ? (
            <g key={i}>
              <path d={toPathD(l.pts)} className="mx-stroke mx-route-bike-casing" />
              <path d={toPathD(l.pts)} className="mx-stroke mx-route-bike" />
            </g>
          ) : (
            <g key={i}>
              <path d={toPathD(l.pts)} className="mx-stroke mx-route-rail-casing" />
              <path d={toPathD(l.pts)} className="mx-stroke mx-route-rail" />
            </g>
          ),
        )}
      </g>
    </g>
  )
}

function RouteBubble({ route }: { route: RouteOption }) {
  const pts = route.all
  const L = polylineLength(pts)
  let acc = 0
  let pos: Pt = pts[0]
  for (let i = 1; i < pts.length; i++) {
    const d = dist(pts[i - 1], pts[i])
    if (acc + d >= L * 0.5) {
      const t = (L * 0.5 - acc) / d
      pos = [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t]
      break
    }
    acc += d
  }
  const Icon = route.mode === 'walk' ? Footprints : route.mode === 'bike' ? Bike : TrainFront
  return (
    <WorldAnchor pos={pos} className="z-10">
      <motion.div
        key={route.mode}
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.9, type: 'spring', stiffness: 400, damping: 25 }}
        className="absolute left-0 top-0 flex -translate-x-1/2 -translate-y-[calc(100%+8px)] items-center gap-1 whitespace-nowrap rounded-lg bg-[var(--route)] px-2 py-1 text-[12px] font-bold text-white shadow-[0_4px_12px_-2px_rgba(0,0,0,.4)]"
      >
        <Icon className="size-3.5" />
        {fmtMin(route.minutes)}
        <span className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rotate-45 bg-[var(--route)]" />
      </motion.div>
    </WorldAnchor>
  )
}

/* ================================================================== */
/* UI 部品                                                             */
/* ================================================================== */

function CtrlButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-9 place-items-center rounded-xl bg-[var(--ui)] text-[var(--fg)] shadow-[var(--shadow)] @3xl:size-10 transition-colors hover:bg-[var(--ui-2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
    >
      {children}
    </button>
  )
}

function ModeSwitch({ mode, onChange, compact }: { mode: 'explore' | 'delivery'; onChange: (m: 'explore' | 'delivery') => void; compact?: boolean }) {
  const items = [
    { id: 'explore' as const, label: '探す', Icon: Search },
    { id: 'delivery' as const, label: '配達を追跡', Icon: Package },
  ]
  return (
    <div role="tablist" aria-label="モード" className="pointer-events-auto relative flex h-11 shrink-0 items-center rounded-full bg-[var(--ui)] p-1 shadow-[var(--shadow)]">
      {items.map((it) => {
        const on = mode === it.id
        return (
          <button
            key={it.id}
            role="tab"
            type="button"
            aria-selected={on}
            aria-label={it.label}
            onClick={() => onChange(it.id)}
            className={`relative z-10 flex h-full items-center gap-1.5 rounded-full text-[12.5px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${
              compact ? 'w-10 justify-center' : 'px-3.5'
            } ${on ? 'text-white' : 'text-[var(--muted)] hover:text-[var(--fg)]'}`}
          >
            {on && (
              <motion.span
                layoutId="mx-mode-pill"
                className="absolute inset-0 -z-10 rounded-full"
                style={{ background: it.id === 'delivery' ? 'var(--deliver)' : 'var(--accent)' }}
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <it.Icon className="size-4" />
            {!compact && it.label}
            {it.id === 'delivery' && !on && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-[#ef4444] ring-2 ring-[var(--ui)]" />}
          </button>
        )
      })}
    </div>
  )
}

function SearchBox({
  inputRef,
  query,
  setQuery,
  open,
  setOpen,
  items,
  active,
  setActive,
  onPick,
  onClear,
  uid,
  reduce,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>
  query: string
  setQuery: (s: string) => void
  open: boolean
  setOpen: (b: boolean) => void
  items: Suggestion[]
  active: number
  setActive: (n: number) => void
  onPick: (s: Suggestion) => void
  onClear: () => void
  uid: string
  reduce: boolean
}) {
  const listId = `${uid}-suggest`
  const onKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive(Math.min(items.length - 1, active + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(Math.max(0, active - 1))
    } else if (e.key === 'Enter') {
      if (items[active]) onPick(items[active])
    }
  }
  const icon = (s: Suggestion) => {
    if (s.sub === '最近の検索') return <History className="size-4" />
    if (s.type === 'place') {
      const m = CAT[s.place.cat]
      return <m.Icon className="size-4" style={{ color: m.color }} />
    }
    if (s.type === 'cat') {
      const m = CAT[s.cat]
      return <m.Icon className="size-4" style={{ color: m.color }} />
    }
    if (s.type === 'station') return <TrainFront className="size-4" />
    if (s.type === 'street') return <Navigation2 className="size-4" />
    return <MapPin className="size-4" />
  }
  const showList = open && items.length > 0
  return (
    <div className="pointer-events-auto relative min-w-0 flex-1">
      <div
        className={`flex h-11 items-center gap-2 bg-[var(--ui)] pl-2 pr-1.5 shadow-[var(--shadow)] transition-[border-radius] ${showList ? 'rounded-t-[22px]' : 'rounded-full'}`}
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-white" aria-hidden>
          <svg viewBox="0 0 24 24" className="size-[18px]">
            <path d="M5 19 C8 13 9 15 12 10 S16 5 19 5" stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" />
            <circle cx="19" cy="5" r="2.2" fill="currentColor" />
            <circle cx="5" cy="19" r="2.2" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </span>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={showList ? `${listId}-${active}` : undefined}
          aria-autocomplete="list"
          aria-label="場所を検索"
          placeholder="Komichi で検索"
          className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-[var(--fg)] outline-none placeholder:text-[var(--muted)]"
        />
        {query ? (
          <button
            type="button"
            aria-label="検索をクリア"
            onClick={onClear}
            className="grid size-8 place-items-center rounded-full text-[var(--muted)] hover:bg-[var(--ui-2)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
          >
            <X className="size-4" />
          </button>
        ) : (
          <Search className="mr-2 size-4 text-[var(--muted)]" aria-hidden />
        )}
      </div>
      <AnimatePresence>
        {showList && (
          <motion.ul
            id={listId}
            role="listbox"
            aria-label="検索候補"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ duration: 0.16 }}
            className="absolute inset-x-0 top-full overflow-hidden rounded-b-[22px] border-t border-[var(--line)] bg-[var(--ui)] pb-2 shadow-[var(--shadow)]"
          >
            {items.map((s, i) => (
              <li
                key={s.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onPick(s)}
                className={`flex cursor-pointer items-center gap-3 px-3.5 py-2 ${i === active ? 'bg-[var(--ui-2)]' : ''}`}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--ui-2)] text-[var(--muted)]">{icon(s)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium">
                    <Highlight text={s.label} q={query} />
                  </span>
                  <span className="block truncate text-[11.5px] text-[var(--muted)]">{s.sub}</span>
                </span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

function Highlight({ text, q }: { text: string; q: string }) {
  const n = q.trim()
  const i = n ? text.toLowerCase().indexOf(n.toLowerCase()) : -1
  if (i < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, i)}
      <b className="font-bold text-[var(--accent)]">{text.slice(i, i + n.length)}</b>
      {text.slice(i + n.length)}
    </>
  )
}

function PanelSwitch({ detailKey, reduce, children }: { detailKey: string; reduce: boolean; children: ReactNode }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={detailKey}
        className="flex min-h-0 flex-1 flex-col"
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
        transition={{ duration: 0.18 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

function Sheet({
  open,
  h,
  peek,
  snap,
  setSnap,
  reduce,
  onClose,
  children,
}: {
  open: boolean
  h: number
  peek: number
  snap: 'peek' | 'full'
  setSnap: (s: 'peek' | 'full') => void
  reduce: boolean
  onClose: () => void
  children: ReactNode
}) {
  const fullH = Math.max(peek + 40, h - 60)
  const peekY = fullH - peek
  const hiddenY = fullH + 24
  const y = useMotionValue(hiddenY)
  const controls = useDragControls()
  const target = open ? (snap === 'full' ? 0 : peekY) : hiddenY
  useEffect(() => {
    const a = animate(y, target, reduce ? { duration: 0.15 } : { type: 'spring', stiffness: 380, damping: 38 })
    return () => a.stop()
  }, [target, y, reduce])
  const onDragEnd = (_: unknown, info: PanInfo) => {
    const cur = y.get()
    const v = info.velocity.y
    if (snap === 'peek' && (cur > peekY + 70 || v > 900)) return onClose()
    const next = v < -400 ? 'full' : v > 400 ? 'peek' : cur < peekY / 2 ? 'full' : 'peek'
    if (next === snap) animate(y, next === 'full' ? 0 : peekY, { type: 'spring', stiffness: 380, damping: 38 })
    else setSnap(next)
  }
  return (
    <motion.section
      aria-label="詳細シート"
      aria-hidden={!open}
      className="absolute inset-x-0 bottom-0 z-20 flex flex-col overflow-hidden rounded-t-[22px] border-t border-[var(--line)] bg-[var(--ui)] shadow-[0_-10px_30px_-12px_rgba(0,0,0,.35)]"
      style={{ height: fullH, y }}
      drag="y"
      dragListener={false}
      dragControls={controls}
      dragConstraints={{ top: 0, bottom: hiddenY }}
      dragElastic={0.04}
      dragMomentum={false}
      onDragEnd={onDragEnd}
    >
      <button
        type="button"
        aria-label={snap === 'full' ? 'シートを縮める' : 'シートを広げる'}
        onPointerDown={(e) => controls.start(e)}
        onClick={() => setSnap(snap === 'full' ? 'peek' : 'full')}
        className="flex h-6 shrink-0 cursor-grab touch-none items-center justify-center focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        <span className="h-1 w-10 rounded-full bg-[var(--ui-3)]" />
      </button>
      {/* ピーク時は見えている高さだけをスクロール領域にする(下端が画面外に出ないように) */}
      <div className="flex min-h-0 flex-col" style={{ height: (snap === 'full' ? fullH : peek) - 24 }}>
        {children}
      </div>
    </motion.section>
  )
}

function Stars({ value, size = 13 }: { value: number; size?: number }) {
  return (
    <span className="relative inline-flex" aria-label={`評価 ${value.toFixed(1)}`}>
      <span className="flex text-[var(--ui-3)]">
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} style={{ width: size, height: size }} className="fill-current" strokeWidth={0} />
        ))}
      </span>
      <span className="absolute inset-0 flex overflow-hidden text-[#f5a524]" style={{ width: `${(value / 5) * 100}%` }}>
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} style={{ width: size, height: size }} className="shrink-0 fill-current" strokeWidth={0} />
        ))}
      </span>
    </span>
  )
}

function OpenBadge({ info }: { info: OpenInfo }) {
  const [state, ...rest] = info.text.split(' · ')
  const color = info.tone === 'open' ? 'text-[#16a34a]' : info.tone === 'soon' ? 'text-[#d97706]' : 'text-[#dc2626]'
  return (
    <span className="text-[12px]">
      <span className={`font-semibold ${color}`}>{state}</span>
      {rest.length > 0 && <span className="text-[var(--muted)]"> · {rest.join(' · ')}</span>}
    </span>
  )
}

const straightMin = (p: Place) => (dist(p.pos, USER_POS) * M_PER_UNIT * 1.3) / SPEED.walk

function PanelHeader({ title, sub, onBack, onClose }: { title: ReactNode; sub?: ReactNode; onBack?: () => void; onClose?: () => void }) {
  return (
    <div className="flex shrink-0 items-start gap-2 px-4 pb-2 pt-3">
      {onBack && (
        <button
          type="button"
          aria-label="戻る"
          onClick={onBack}
          className="-ml-1.5 grid size-8 shrink-0 place-items-center rounded-full hover:bg-[var(--ui-2)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
        >
          <ArrowLeft className="size-[18px]" />
        </button>
      )}
      <div className="min-w-0 flex-1 pt-1">
        <div className="text-[16px] font-bold leading-tight">{title}</div>
        {sub && <div className="mt-0.5 text-[12px] text-[var(--muted)]">{sub}</div>}
      </div>
      {onClose && (
        <button
          type="button"
          aria-label="閉じる"
          onClick={onClose}
          className="-mr-1.5 grid size-8 shrink-0 place-items-center rounded-full bg-[var(--ui-2)] text-[var(--muted)] hover:text-[var(--fg)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}

function ResultsPanel({
  cat,
  now,
  openOnly,
  setOpenOnly,
  onPick,
  onHover,
  onClose,
  saved,
}: {
  cat: Category
  now: Date
  openOnly: boolean
  setOpenOnly: (b: boolean) => void
  onPick: (p: Place) => void
  onHover: (id: string | null) => void
  onClose: () => void
  saved: Set<string>
}) {
  const meta = CAT[cat]
  const list = PLACES.filter((p) => p.cat === cat && (!openOnly || openInfo(p, now).open)).sort((a, b) => dist(a.pos, USER_POS) - dist(b.pos, USER_POS))
  return (
    <>
      <PanelHeader
        title={
          <span className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-full text-white" style={{ background: meta.color }}>
              <meta.Icon className="size-3.5" />
            </span>
            汐見市の{meta.label}
          </span>
        }
        sub={`${list.length}件 · 現在地から近い順`}
        onClose={onClose}
      />
      <div className="flex shrink-0 gap-1.5 px-4 pb-2">
        <button
          type="button"
          aria-pressed={openOnly}
          onClick={() => setOpenOnly(!openOnly)}
          className={`flex h-7 items-center gap-1 rounded-full border px-2.5 text-[12px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${
            openOnly ? 'border-transparent bg-[var(--accent-soft)] text-[var(--accent)]' : 'border-[var(--line)] hover:bg-[var(--ui-2)]'
          }`}
        >
          {openOnly ? <Check className="size-3.5" /> : <Clock className="size-3.5" />}
          営業中
        </button>
        <span className="flex h-7 items-center rounded-full border border-[var(--line)] px-2.5 text-[12px] text-[var(--muted)]">評価 4.0 以上</span>
      </div>
      <ul className="mx-scroll min-h-0 flex-1 overflow-y-auto border-t border-[var(--line)]">
        {list.length === 0 && <li className="px-4 py-10 text-center text-[13px] text-[var(--muted)]">いま営業中の{meta.label}はありません</li>}
        {list.map((p, i) => {
          const info = openInfo(p, now)
          return (
            <motion.li
              key={p.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="border-b border-[var(--line)]"
            >
              <button
                type="button"
                onClick={() => onPick(p)}
                onMouseEnter={() => onHover(p.id)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(p.id)}
                onBlur={() => onHover(null)}
                className="flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--ui-2)] focus-visible:bg-[var(--ui-2)] focus-visible:outline-none"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[14px] font-semibold">{p.name}</span>
                    {saved.has(p.id) && <Bookmark className="size-3.5 shrink-0 fill-[#f2b400] text-[#f2b400]" />}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[var(--muted)]">
                    <span className="font-semibold text-[var(--fg)]">{p.rating.toFixed(1)}</span>
                    <Stars value={p.rating} size={11} />
                    <span>({p.reviews})</span>
                    {p.price > 0 && <span>· {'¥'.repeat(p.price)}</span>}
                  </div>
                  <div className="mt-0.5 text-[12px] text-[var(--muted)]">
                    {p.district} · <Footprints className="inline size-3 align-[-2px]" /> {fmtMin(straightMin(p))}
                  </div>
                  <div className="mt-0.5">
                    <OpenBadge info={info} />
                  </div>
                </div>
                <PlacePhoto cat={p.cat} variant={0} hue={p.hue} name={p.name} className="size-[72px] shrink-0 rounded-xl" />
              </button>
            </motion.li>
          )
        })}
      </ul>
    </>
  )
}

const REVIEWS: Record<Category, { who: string; text: string; stars: number; when: string }[]> = {
  cafe: [
    { who: '水野 ちさと', text: '窓際の席で読書していたら2時間経っていました。ブレンドは苦すぎずちょうどいい。', stars: 5, when: '1週間前' },
    { who: 'K. 早川', text: '朝のトーストセットがお得。混む前の8時台がおすすめです。', stars: 4, when: '1か月前' },
  ],
  ramen: [
    { who: '麺好きの船橋', text: 'スープを最後まで飲み干せる優しい味。味玉の半熟具合が完璧。', stars: 5, when: '3日前' },
    { who: '大槻 れい', text: '昼は20分ほど並びましたが回転は早め。券売機は現金のみ。', stars: 4, when: '2週間前' },
  ],
  park: [
    { who: '散歩人 たかの', text: '朝の空気が気持ちいい。犬連れの人も多くて和やかです。', stars: 5, when: '5日前' },
    { who: '佐伯 みのり', text: 'ベンチが多く、子どもを遊ばせながら休めます。トイレもきれい。', stars: 4, when: '1か月前' },
  ],
  books: [
    { who: '本の虫 えび原', text: '探していた絶版の画集が見つかりました。値付けも良心的。', stars: 5, when: '4日前' },
    { who: '野々村 しん', text: '棚の並びに店主のこだわりを感じます。長居してしまう。', stars: 5, when: '3週間前' },
  ],
  bakery: [
    { who: '朝ごはん係', text: '焼きたてを狙って開店直後に。塩気とバターのバランスが絶妙。', stars: 5, when: '2日前' },
    { who: '村井 あおい', text: '午後には人気の品が売り切れるので早めの時間が◎。', stars: 4, when: '2週間前' },
  ],
  sento: [
    { who: 'ととのい部長', text: '水風呂がキンキンで最高。湯上がりの瓶牛乳まで含めて完璧。', stars: 5, when: '6日前' },
    { who: '湯めぐり 小田', text: 'ペンキ絵が見事。常連さんも親切で居心地がいいです。', stars: 4, when: '1か月前' },
  ],
}

function PlaceDetail({
  place,
  now,
  saved,
  onSave,
  onRoute,
  onBack,
  onClose,
  toast,
}: {
  place: Place
  now: Date
  saved: boolean
  onSave: () => void
  onRoute: () => void
  onBack?: () => void
  onClose: () => void
  toast: (s: string) => void
}) {
  const meta = CAT[place.cat]
  const info = openInfo(place, now)
  const [hoursOpen, setHoursOpen] = useState(false)
  const today = now.getDay()
  const order = [1, 2, 3, 4, 5, 6, 0]
  return (
    <div className="mx-scroll min-h-0 flex-1 overflow-y-auto">
      <div className="relative">
        <div className="mx-noscroll flex snap-x snap-mandatory gap-1 overflow-x-auto">
          {[0, 1, 2].map((v) => (
            <PlacePhoto key={v} cat={place.cat} variant={v} hue={place.hue} name={place.name} className="h-[118px] w-[78%] shrink-0 snap-start @3xl:h-[150px]" />
          ))}
        </div>
        <div className="absolute left-3 top-3 flex gap-1.5">
          {onBack && (
            <button
              type="button"
              aria-label="一覧に戻る"
              onClick={onBack}
              className="grid size-8 place-items-center rounded-full bg-[var(--ui)]/90 shadow backdrop-blur focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
            >
              <ArrowLeft className="size-4" />
            </button>
          )}
        </div>
        <button
          type="button"
          aria-label="閉じる"
          onClick={onClose}
          className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-[var(--ui)]/90 shadow backdrop-blur focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
        >
          <X className="size-4" />
        </button>
        <span className="absolute bottom-2 right-3 rounded-full bg-black/55 px-2 py-0.5 text-[10.5px] font-medium text-white">写真 3枚</span>
      </div>
      <div className="px-4 pt-3">
        <h3 className="text-[19px] font-bold leading-snug">{place.name}</h3>
        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12.5px] text-[var(--muted)]">
          <span className="font-semibold text-[var(--fg)]">{place.rating.toFixed(1)}</span>
          <Stars value={place.rating} />
          <span>({place.reviews.toLocaleString()})</span>
          <span>·</span>
          <span style={{ color: meta.color }} className="font-medium">
            {meta.label}
          </span>
          {place.price > 0 && <span>· {'¥'.repeat(place.price)}</span>}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1 border-b border-[var(--line)] px-3 pb-3">
        <ActionBtn primary label="経路" onClick={onRoute}>
          <Navigation2 className="size-[18px] rotate-45" />
        </ActionBtn>
        <ActionBtn label={saved ? '保存済み' : '保存'} onClick={onSave} active={saved}>
          <Bookmark className={`size-[18px] ${saved ? 'fill-current' : ''}`} />
        </ActionBtn>
        <ActionBtn label="共有" onClick={() => toast('リンクをコピーしました')}>
          <Share2 className="size-[18px]" />
        </ActionBtn>
        <ActionBtn label="電話" onClick={() => toast('デモのため発信しません')}>
          <Phone className="size-[18px]" />
        </ActionBtn>
      </div>
      <div className="space-y-0.5 border-b border-[var(--line)] px-4 py-3 text-[13px]">
        <p className="leading-relaxed text-[var(--fg)]">{place.blurb}</p>
        <div className="flex flex-wrap gap-1.5 pt-2">
          {place.tags.map((t) => (
            <span key={t} className="rounded-full bg-[var(--ui-2)] px-2 py-0.5 text-[11.5px] text-[var(--muted)]">
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="border-b border-[var(--line)] px-4 py-2 text-[13px]">
        <div className="flex items-center gap-3 py-1.5">
          <MapPin className="size-4 shrink-0 text-[var(--accent)]" />
          <span>
            汐見市{place.district} {(place.hue % 5) + 1}-{(place.reviews % 19) + 2}
          </span>
        </div>
        <button
          type="button"
          aria-expanded={hoursOpen}
          onClick={() => setHoursOpen(!hoursOpen)}
          className="flex w-full items-center gap-3 rounded-lg py-1.5 text-left focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
        >
          <Clock className="size-4 shrink-0 text-[var(--accent)]" />
          <span className="flex-1">
            <OpenBadge info={info} />
          </span>
          <ChevronDown className={`size-4 text-[var(--muted)] transition-transform ${hoursOpen ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence initial={false}>
          {hoursOpen && (
            <motion.table
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="ml-7 block overflow-hidden text-[12.5px]"
            >
              <tbody className="table w-full">
                {order.map((d) => {
                  const closed = place.closed?.includes(d)
                  return (
                    <tr key={d} className={d === today ? 'font-semibold' : 'text-[var(--muted)]'}>
                      <td className="w-10 py-0.5">{DAY_LABEL[d]}曜</td>
                      <td className="py-0.5 tabular-nums">
                        {closed
                          ? '定休日'
                          : place.hours[0][0] === 0 && place.hours[0][1] === 1440
                            ? '24時間'
                            : place.hours.map(([o, c]) => `${fmtClock(o)}–${c >= 1440 ? `翌${fmtClock(c)}` : fmtClock(c)}`).join(', ')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </motion.table>
          )}
        </AnimatePresence>
        <div className="flex items-center gap-3 py-1.5">
          <Footprints className="size-4 shrink-0 text-[var(--accent)]" />
          <span>現在地から徒歩 約{fmtMin(straightMin(place))}</span>
        </div>
      </div>
      <div className="px-4 py-3">
        <div className="mb-2 text-[13px] font-bold">クチコミ</div>
        <div className="space-y-3">
          {REVIEWS[place.cat].map((r) => (
            <div key={r.who} className="flex gap-2.5">
              <span
                className="grid size-8 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white"
                style={{ background: `hsl(${(r.who.charCodeAt(0) * 37) % 360} 45% 52%)` }}
                aria-hidden
              >
                {r.who.slice(0, 1)}
              </span>
              <div className="min-w-0 text-[12.5px]">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold">{r.who}</span>
                  <Stars value={r.stars} size={10} />
                  <span className="text-[11px] text-[var(--muted)]">{r.when}</span>
                </div>
                <p className="mt-0.5 leading-relaxed text-[var(--muted)]">{r.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ActionBtn({ label, onClick, children, primary, active }: { label: string; onClick: () => void; children: ReactNode; primary?: boolean; active?: boolean }) {
  return (
    <button type="button" onClick={onClick} className="group flex flex-col items-center gap-1 rounded-xl py-1 focus-visible:outline-2 focus-visible:outline-[var(--accent)]">
      <span
        className={`grid size-10 place-items-center rounded-full transition-colors ${
          primary
            ? 'bg-[var(--accent)] text-white group-hover:brightness-110'
            : active
              ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
              : 'border border-[var(--line)] text-[var(--accent)] group-hover:bg-[var(--ui-2)]'
        }`}
      >
        {children}
      </span>
      <span className="text-[11.5px] font-medium text-[var(--accent)]">{label}</span>
    </button>
  )
}

function RoutePanel({
  place,
  routes,
  mode,
  setMode,
  onBack,
  now,
}: {
  place: Place
  routes: Record<TravelMode, RouteOption>
  mode: TravelMode
  setMode: (m: TravelMode) => void
  onBack: () => void
  now: Date
}) {
  const r = routes[mode]
  const arrive = now.getHours() * 60 + now.getMinutes() + r.minutes
  const tabs: { id: TravelMode; label: string; Icon: LucideIcon }[] = [
    { id: 'walk', label: '徒歩', Icon: Footprints },
    { id: 'bike', label: '自転車', Icon: Bike },
    { id: 'transit', label: '電車', Icon: TrainFront },
  ]
  const fastest = (Object.values(routes) as RouteOption[]).reduce((a, b) => (b.minutes < a.minutes ? b : a)).mode
  return (
    <>
      <div className="shrink-0 px-4 pb-3 pt-3">
        <div className="flex items-start gap-2">
          <button
            type="button"
            aria-label="詳細に戻る"
            onClick={onBack}
            className="-ml-1.5 grid size-8 shrink-0 place-items-center rounded-full hover:bg-[var(--ui-2)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
          >
            <ArrowLeft className="size-[18px]" />
          </button>
          <div className="relative min-w-0 flex-1 rounded-xl bg-[var(--ui-2)] py-1.5 pl-7 pr-3 text-[13px]">
            <span className="absolute left-2.5 top-[13px] size-2.5 rounded-full border-2 border-[#2f6bff] bg-[var(--ui)]" />
            <span className="absolute left-[14px] top-[24px] h-[14px] border-l-2 border-dotted border-[var(--muted)]" />
            <MapPin className="absolute left-[7px] top-[37px] size-3.5 text-[#e2453b]" />
            <div className="truncate py-0.5 text-[var(--muted)]">現在地</div>
            <div className="truncate border-t border-[var(--line)] py-0.5 font-semibold">{place.name}</div>
          </div>
        </div>
        <div role="tablist" aria-label="移動手段" className="mt-3 grid grid-cols-3 gap-1.5">
          {tabs.map((t) => {
            const on = t.id === mode
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setMode(t.id)}
                className={`relative flex flex-col items-center rounded-xl py-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${
                  on ? 'text-[var(--accent)]' : 'text-[var(--muted)] hover:bg-[var(--ui-2)]'
                }`}
              >
                {on && <motion.span layoutId="mx-route-tab" className="absolute inset-0 rounded-xl bg-[var(--accent-soft)]" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                <span className="relative flex items-center gap-1 text-[11.5px] font-medium">
                  <t.Icon className="size-4" />
                  {t.label}
                </span>
                <span className="relative mt-0.5 text-[13px] font-bold tabular-nums">{fmtMin(routes[t.id].minutes)}</span>
              </button>
            )
          })}
        </div>
      </div>
      <div className="mx-scroll min-h-0 flex-1 overflow-y-auto border-t border-[var(--line)]">
        <div className="px-4 py-3">
          <div className="flex items-baseline gap-2">
            <span className="text-[22px] font-bold tabular-nums">{fmtMin(r.minutes)}</span>
            <span className="text-[13px] text-[var(--muted)]">
              {fmtDist(r.meters)} · {fmtClock(arrive)} 到着
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5 text-[11.5px]">
            {fastest === mode && <span className="rounded-full bg-[#16a34a]/12 px-2 py-0.5 font-semibold text-[#16a34a]">いちばん早い</span>}
            {r.note && <span className="rounded-full bg-[var(--ui-2)] px-2 py-0.5 text-[var(--muted)]">{r.note}</span>}
          </div>
          {mode === 'transit' && (
            <div className="mt-3 flex h-2 overflow-hidden rounded-full">
              {r.legs.map((l, i) => (
                <span key={i} style={{ flexGrow: l.minutes, background: l.kind === 'rail' ? '#e2553b' : 'var(--route)', opacity: l.kind === 'rail' ? 1 : 0.45 }} className={i ? 'ml-0.5' : ''} />
              ))}
            </div>
          )}
        </div>
        <ol className="relative px-4 pb-4">
          {r.steps.map((s, i) => {
            const Icon =
              s.icon === 'left'
                ? CornerUpLeft
                : s.icon === 'right'
                  ? CornerUpRight
                  : s.icon === 'goal'
                    ? Flag
                    : s.icon === 'train'
                      ? TrainFront
                      : s.icon === 'walk'
                        ? Footprints
                        : s.icon === 'start'
                          ? Navigation2
                          : Navigation2
            return (
              <motion.li
                key={`${mode}-${i}`}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.04 * i }}
                className="flex gap-3 border-b border-[var(--line)] py-2.5 last:border-0"
              >
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-full ${
                    s.icon === 'goal' ? 'bg-[#e2453b] text-white' : s.icon === 'train' ? 'bg-[#e2553b]/12 text-[#e2553b]' : 'bg-[var(--ui-2)] text-[var(--fg)]'
                  }`}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 pt-0.5">
                  <div className="text-[13px] font-medium leading-snug">{s.text}</div>
                  {s.sub && <div className="text-[11.5px] text-[var(--muted)]">{s.sub}</div>}
                </div>
              </motion.li>
            )
          })}
        </ol>
      </div>
    </>
  )
}

function DeliveryPanel({
  dstate,
  startClock,
  reduce,
  follow,
  onFollow,
  headingUp,
  setHeadingUp,
  paused,
  setPaused,
  speed,
  setSpeed,
  onRestart,
  toast,
}: {
  dstate: { eta: number; p: number; street: string; stopped: boolean; arrived: boolean }
  startClock: Date
  reduce: boolean
  follow: boolean
  onFollow: () => void
  headingUp: boolean
  setHeadingUp: (b: boolean) => void
  paused: boolean
  setPaused: (b: boolean) => void
  speed: number
  setSpeed: (n: number) => void
  onRestart: () => void
  toast: (s: string) => void
}) {
  const eta = Math.max(0, Math.ceil(dstate.eta))
  const mm = Math.floor(eta / 60)
  const ss = eta % 60
  const base = startClock.getHours() * 60 + startClock.getMinutes()
  const total = DELIVERY.L / COURIER_SPEED / 60 + (DELIVERY.stops.length * STOP_SEC) / 60
  const steps = [
    { label: '注文を受け付けました', time: base - 16, state: 'done' },
    { label: '調理が完了しました', time: base - 4, state: 'done' },
    { label: '配達パートナーが受け取りました', time: base, state: 'done' },
    { label: dstate.stopped ? '信号待ち' : `${dstate.street}を走行中`, time: null, state: dstate.arrived ? 'done' : 'now' },
    { label: dstate.arrived ? 'お届けしました' : 'お届け予定', time: base + total, state: dstate.arrived ? 'done' : 'todo' },
  ] as const
  const sum = ORDER.items.reduce((s, i) => s + i.price * i.qty, 0) + ORDER.fee
  return (
    <div className="mx-scroll min-h-0 flex-1 overflow-y-auto">
      <div className="px-4 pt-3">
        <div className="text-[12px] font-medium text-[var(--muted)]">
          {DELIVERY.rest.name}から · 注文 #{ORDER.no}
        </div>
        <AnimatePresence mode="wait" initial={false}>
          {dstate.arrived ? (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-3 py-3">
              <motion.span
                initial={reduce ? false : { scale: 0, rotate: -40 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                className="grid size-12 place-items-center rounded-full bg-[var(--deliver)] text-white"
              >
                <Check className="size-6" strokeWidth={3} />
              </motion.span>
              <div>
                <div className="text-[20px] font-bold">お届けしました</div>
                <div className="text-[12.5px] text-[var(--muted)]">温かいうちにどうぞ。</div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="eta" exit={{ opacity: 0 }} className="py-2">
              <div className="flex items-end gap-3">
                <div className="text-[13px] font-semibold text-[var(--muted)]">到着まで</div>
              </div>
              <div className="flex items-baseline gap-2">
                <div className="flex items-baseline text-[38px] font-bold leading-none tabular-nums tracking-tight" aria-live="off">
                  <NumberFlow value={mm} animated={!reduce} />
                  <span className="mx-0.5">:</span>
                  <span className="inline-block w-[1.25em]">{String(ss).padStart(2, '0')}</span>
                </div>
                <div className="text-[13px] text-[var(--muted)]">{fmtClock(base + total)} ごろ到着</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="relative mt-1 h-2 rounded-full bg-[var(--ui-2)]">
          <div className="absolute inset-y-0 left-0 rounded-full bg-[var(--deliver)] transition-[width] duration-200 ease-linear" style={{ width: `${dstate.p * 100}%` }} />
          <div
            className="absolute top-1/2 grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-[var(--ui)] bg-[var(--deliver)] text-white shadow transition-[left] duration-200 ease-linear"
            style={{ left: `${dstate.p * 100}%` }}
          >
            <Bike className="size-3" />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <ToggleChip on={follow} onClick={onFollow} label={follow ? '追従中' : '配達員を追従'} icon={<LocateFixed className="size-3.5" />} />
          <ToggleChip on={headingUp} onClick={() => setHeadingUp(!headingUp)} label="進行方向を上に" icon={<Navigation2 className="size-3.5" />} />
        </div>
      </div>

      <div className="mx-4 mt-3 flex items-center gap-3 rounded-2xl border border-[var(--line)] p-3">
        <CourierAvatar className="size-11 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold">{ORDER.courier.name} さん</div>
          <div className="flex items-center gap-1 text-[11.5px] text-[var(--muted)]">
            <Star className="size-3 fill-[#f5a524] text-[#f5a524]" />
            {ORDER.courier.rating} · 配達 {ORDER.courier.trips.toLocaleString()}回 · {ORDER.courier.vehicle}
          </div>
        </div>
        <button
          type="button"
          aria-label="メッセージを送る"
          onClick={() => toast('「玄関前に置いてください」と送信しました')}
          className="grid size-9 place-items-center rounded-full bg-[var(--ui-2)] text-[var(--deliver)] hover:brightness-95 focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
        >
          <MessageCircle className="size-4" />
        </button>
        <button
          type="button"
          aria-label="電話する"
          onClick={() => toast('デモのため発信しません')}
          className="grid size-9 place-items-center rounded-full bg-[var(--ui-2)] text-[var(--deliver)] hover:brightness-95 focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
        >
          <Phone className="size-4" />
        </button>
      </div>

      <ol className="px-4 pt-4">
        {steps.map((s, i) => (
          <li key={i} className="relative flex gap-3 pb-3 last:pb-1">
            {i < steps.length - 1 && (
              <span className={`absolute left-[9px] top-5 h-[calc(100%-12px)] w-0.5 ${s.state === 'done' ? 'bg-[var(--deliver)]' : 'bg-[var(--ui-3)]'}`} />
            )}
            <span className="relative mt-0.5 grid size-5 shrink-0 place-items-center">
              {s.state === 'done' ? (
                <span className="grid size-5 place-items-center rounded-full bg-[var(--deliver)] text-white">
                  <Check className="size-3" strokeWidth={3} />
                </span>
              ) : s.state === 'now' ? (
                <>
                  {!reduce && <span className="mx-pulse absolute left-1/2 top-1/2 size-5 rounded-full bg-[var(--deliver)]" />}
                  <span className="size-3.5 rounded-full border-[3px] border-[var(--deliver)] bg-[var(--ui)]" />
                </>
              ) : (
                <span className="size-3 rounded-full border-2 border-[var(--ui-3)] bg-[var(--ui)]" />
              )}
            </span>
            <div className="flex min-w-0 flex-1 items-baseline justify-between gap-2 text-[13px]">
              <span className={s.state === 'todo' ? 'text-[var(--muted)]' : s.state === 'now' ? 'font-semibold' : ''}>{s.label}</span>
              {s.time != null && <span className="shrink-0 text-[12px] tabular-nums text-[var(--muted)]">{fmtClock(s.time)}</span>}
            </div>
          </li>
        ))}
      </ol>

      <div className="mx-4 mt-2 rounded-2xl bg-[var(--ui-2)] p-3 text-[12.5px]">
        {ORDER.items.map((it) => (
          <div key={it.name} className="flex justify-between py-0.5">
            <span>
              {it.name} × {it.qty}
            </span>
            <span className="tabular-nums">¥{(it.price * it.qty).toLocaleString()}</span>
          </div>
        ))}
        <div className="flex justify-between py-0.5 text-[var(--muted)]">
          <span>配達料</span>
          <span className="tabular-nums">¥{ORDER.fee}</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-[var(--line)] pt-1.5 font-semibold">
          <span>合計</span>
          <span className="tabular-nums">¥{sum.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => (dstate.arrived ? onRestart() : setPaused(!paused))}
          className="flex h-8 items-center gap-1.5 rounded-full bg-[var(--fg)] px-3 text-[12px] font-semibold text-[var(--ui)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          {dstate.arrived ? <RotateCcw className="size-3.5" /> : paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
          {dstate.arrived ? 'もう一度再生' : paused ? '再開' : '一時停止'}
        </button>
        <div role="radiogroup" aria-label="再生速度" className="flex rounded-full bg-[var(--ui-2)] p-0.5">
          {[1, 8, 30].map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={speed === s}
              onClick={() => setSpeed(s)}
              className={`h-7 rounded-full px-2.5 text-[11.5px] font-semibold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${
                speed === s ? 'bg-[var(--ui)] text-[var(--fg)] shadow-sm' : 'text-[var(--muted)]'
              }`}
            >
              ×{s}
            </button>
          ))}
        </div>
        {!dstate.arrived && (
          <button
            type="button"
            aria-label="最初から再生"
            onClick={onRestart}
            className="ml-auto grid size-8 place-items-center rounded-full text-[var(--muted)] hover:bg-[var(--ui-2)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
          >
            <RotateCcw className="size-4" />
          </button>
        )}
      </div>
      <p className="px-4 pb-4 text-[11px] text-[var(--muted)]">デモ用のシミュレーションです。×1 で実際の速さ、×8・×30 で早送りします。</p>
    </div>
  )
}

function ToggleChip({ on, onClick, label, icon }: { on: boolean; onClick: () => void; label: string; icon: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${
        on ? 'border-transparent bg-[var(--deliver)] text-white' : 'border-[var(--line)] text-[var(--fg)] hover:bg-[var(--ui-2)]'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
