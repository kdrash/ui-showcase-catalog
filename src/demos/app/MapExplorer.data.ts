/**
 * MapExplorer 用の架空都市「汐見市」のデータ。
 * 歪ませた格子から交差点ノードと道路エッジを作り、海・川・丘・公園で間引いてから、
 * 区画(ブロック)と建物を乱数で敷き詰める。描画用の path 文字列と経路探索用のグラフを同時に作る。
 * 地名・店名・駅名・人名はすべて架空。
 */

export type Pt = [number, number]

export const WORLD_W = 2400
export const WORLD_H = 1600
/** ワールド座標 1 単位あたりのメートル */
export const M_PER_UNIT = 1.2

const S = 125
const NI = 21
const NJ = 14

/* ------------------------------------------------------------------ */
/* 幾何ユーティリティ                                                    */
/* ------------------------------------------------------------------ */

export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Catmull-Rom で点列を補間して、元の頂点を通る密な折れ線にする(元の頂点 i は戻り値の i*n 番目) */
export function catmullRom(pts: Pt[], n = 8): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    for (let s = 0; s < n; s++) {
      const t = s / n
      const t2 = t * t
      const t3 = t2 * t
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])])
    }
  }
  out.push(pts[pts.length - 1])
  return out
}

export function distToSegment(p: Pt, a: Pt, b: Pt) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const l2 = dx * dx + dy * dy
  let t = l2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2 : 0
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}

export function distToPolyline(p: Pt, line: Pt[]) {
  let d = Infinity
  for (let i = 0; i < line.length - 1; i++) d = Math.min(d, distToSegment(p, line[i], line[i + 1]))
  return d
}

function segIntersect(a: Pt, b: Pt, c: Pt, d: Pt) {
  const o = (p: Pt, q: Pt, r: Pt) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
  const d1 = o(c, d, a)
  const d2 = o(c, d, b)
  const d3 = o(a, b, c)
  const d4 = o(a, b, d)
  return d1 * d2 < 0 && d3 * d4 < 0
}

function crossesPolyline(a: Pt, b: Pt, line: Pt[]) {
  for (let i = 0; i < line.length - 1; i++) if (segIntersect(a, b, line[i], line[i + 1])) return true
  return false
}

export function polylineLength(pts: Pt[]) {
  let l = 0
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
  return l
}

export function toPathD(pts: Pt[], close = false) {
  let d = ''
  for (let i = 0; i < pts.length; i++) d += `${i ? 'L' : 'M'}${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`
  return close ? d + 'Z' : d
}

/* ------------------------------------------------------------------ */
/* 地形                                                                */
/* ------------------------------------------------------------------ */

const COAST_CTRL: Pt[] = [
  [1080, 1700],
  [1180, 1560],
  [1290, 1480],
  [1430, 1425],
  [1620, 1370],
  [1790, 1240],
  [1930, 1150],
  [2060, 1085],
  [2190, 940],
  [2310, 850],
  [2520, 790],
]
/** 海岸線(西→東、x 単調増加) */
export const COAST = catmullRom(COAST_CTRL, 10)

export function coastY(x: number) {
  if (x <= COAST[0][0]) return Infinity
  for (let i = 0; i < COAST.length - 1; i++) {
    const a = COAST[i]
    const b = COAST[i + 1]
    if (x >= a[0] && x <= b[0]) return a[1] + ((x - a[0]) / (b[0] - a[0] || 1)) * (b[1] - a[1])
  }
  return COAST[COAST.length - 1][1]
}

export const SEA_D = toPathD([...COAST, [3800, 760], [3800, 3800], [1000, 3800]], true)
export const COAST_D = toPathD(COAST)

/** 鷺川(北西から南東の河口へ) */
export const RIVER = catmullRom(
  [
    [-120, 370],
    [150, 392],
    [330, 430],
    [500, 520],
    [640, 640],
    [730, 780],
    [800, 930],
    [910, 1060],
    [1060, 1150],
    [1200, 1262],
    [1300, 1380],
    [1370, 1500],
  ],
  10,
)
export const RIVER_D = toPathD(RIVER)
/** 川名ラベル用(川の中流部分) */
export const RIVER_LABEL_D = toPathD(RIVER.slice(30, 75))

/** 見晴らしの丘 */
export const HILL = { x: 1960, y: 300, r: 230 }

function wobbleRing(cx: number, cy: number, r: number, seed: number, amp = 0.09, n = 48): Pt[] {
  const rnd = mulberry32(seed)
  const ph = [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28]
  const pts: Pt[] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const k = 1 + amp * (Math.sin(a * 2 + ph[0]) * 0.6 + Math.sin(a * 3 + ph[1]) * 0.3 + Math.sin(a * 5 + ph[2]) * 0.15)
    pts.push([cx + Math.cos(a) * r * k * 1.08, cy + Math.sin(a) * r * k * 0.92])
  }
  return pts
}

export const HILL_PARK_D = toPathD(wobbleRing(HILL.x, HILL.y, HILL.r + 30, 7, 0.06), true)
export const CONTOURS_D = [200, 160, 122, 86, 52, 22]
  .map((r, i) => toPathD(wobbleRing(HILL.x + i * 6, HILL.y - i * 4, r, 11 + i, 0.12), true))
  .join('')
/** 丘の遊歩道(装飾、経路探索には使わない) */
export const HILL_TRAIL_D = toPathD(
  catmullRom(
    [
      [1760, 420],
      [1830, 380],
      [1880, 400],
      [1930, 350],
      [1900, 300],
      [1955, 262],
      [2010, 300],
      [2060, 270],
      [2120, 320],
      [2170, 300],
    ],
    6,
  ),
)

/** 鴎島 */
export const ISLAND_D = toPathD(wobbleRing(2130, 1390, 70, 21, 0.15, 36), true)

/** 港町の埠頭 */
export const PIERS_D = [
  [
    [1960, 1110],
    [2010, 1205],
    [2045, 1190],
    [1998, 1092],
  ],
  [
    [2085, 1030],
    [2160, 1110],
    [2188, 1088],
    [2120, 1006],
  ],
  [
    [1700, 1300],
    [1730, 1395],
    [1765, 1386],
    [1740, 1285],
  ],
]
  .map((p) => toPathD(p as Pt[], true))
  .join('')

/** 汐見線(鉄道) */
const RAIL_CTRL: Pt[] = [
  [-120, 782],
  [280, 770],
  [620, 756],
  [860, 754],
  [1080, 752],
  [1320, 760],
  [1560, 770],
  [1800, 728],
  [2040, 640],
  [2520, 500],
]
const RAIL_N = 10
export const RAIL = catmullRom(RAIL_CTRL, RAIL_N)
export const RAIL_D = toPathD(RAIL)

export type Station = { id: string; name: string; yomi: string; pos: Pt; railIndex: number }
export const STATIONS: Station[] = [
  { id: 'st-nishi', name: '西汐見', yomi: 'にししおみ', pos: RAIL[1 * RAIL_N], railIndex: 1 * RAIL_N },
  { id: 'st-kawabata', name: '川端', yomi: 'かわばた', pos: RAIL[2 * RAIL_N], railIndex: 2 * RAIL_N },
  { id: 'st-chuo', name: '汐見中央', yomi: 'しおみちゅうおう', pos: RAIL[4 * RAIL_N], railIndex: 4 * RAIL_N },
  { id: 'st-minato', name: '港町', yomi: 'みなとまち', pos: RAIL[6 * RAIL_N], railIndex: 6 * RAIL_N },
  { id: 'st-okanoue', name: '丘ノ上', yomi: 'おかのうえ', pos: RAIL[8 * RAIL_N], railIndex: 8 * RAIL_N },
]

export const DISTRICTS: { name: string; yomi: string; pos: Pt }[] = [
  { name: '鷺ノ台', yomi: 'さぎのだい', pos: [430, 230] },
  { name: '北汐見', yomi: 'きたしおみ', pos: [1180, 175] },
  { name: '見晴らしの丘', yomi: 'みはらしのおか', pos: [1960, 560] },
  { name: '西汐見', yomi: 'にししおみ', pos: [210, 1010] },
  { name: '旧市街', yomi: 'きゅうしがい', pos: [640, 1250] },
  { name: '汐見中央', yomi: 'しおみちゅうおう', pos: [1250, 900] },
  { name: '港町', yomi: 'みなとまち', pos: [1700, 1020] },
  { name: '浜通り', yomi: 'はまどおり', pos: [1440, 1200] },
]

export const WATER_LABELS: { name: string; pos: Pt; size: number }[] = [
  { name: '汐見湾', pos: [1980, 1420], size: 18 },
  { name: '鴎島', pos: [2130, 1390], size: 12 },
]

/* ------------------------------------------------------------------ */
/* 街路網                                                              */
/* ------------------------------------------------------------------ */

export const ROW_NAMES = [
  '北辺通り',
  '雲雀通り',
  '北環状通り',
  '柳小路',
  '欅通り',
  '桜並木通り',
  '紺屋町通り',
  '駅前通り',
  '汐見大通り',
  '本町通り',
  '魚河岸通り',
  '浜手通り',
  '潮見坂',
  '岸壁通り',
]
export const COL_NAMES = [
  '西端通り',
  '松葉通り',
  '若宮通り',
  '西坂通り',
  '染井通り',
  '古書街通り',
  '白壁通り',
  '鷺橋通り',
  '鐘撞通り',
  '天神通り',
  '山王通り',
  '中央通り',
  '錦小路',
  '市場通り',
  '船大工通り',
  '港町通り',
  '灯籠小路',
  '潮騒通り',
  '岬通り',
  '灯台通り',
  '東端通り',
]
const MAJOR_ROWS = new Set([2, 5, 8, 11])
const MAJOR_COLS = new Set([3, 7, 11, 15, 19])

export function nodePos(i: number, j: number): Pt {
  return [-60 + i * S + 26 * Math.sin(j * 0.6 + i * 0.15), -50 + j * S + 20 * Math.sin(i * 0.5 + 0.7)]
}

const CENTRAL_PARK = { i0: 8, i1: 11, j0: 3, j1: 5 }
const SMALL_PARK_CELLS: { i: number; j: number; name: string }[] = [
  { i: 4, j: 9, name: '柳公園' },
  { i: 13, j: 5, name: '錦児童公園' },
  { i: 2, j: 3, name: '鷺ノ台緑地' },
]

const nid = (i: number, j: number) => j * NI + i

function nodeAllowed(i: number, j: number) {
  const p = nodePos(i, j)
  if (p[1] > coastY(p[0]) - 40) return false
  if (distToPolyline(p, RIVER) < 46) return false
  if (Math.hypot(p[0] - HILL.x, p[1] - HILL.y) < HILL.r - 8) return false
  if (i > CENTRAL_PARK.i0 && i < CENTRAL_PARK.i1 && j > CENTRAL_PARK.j0 && j < CENTRAL_PARK.j1) return false
  return true
}

export type Edge = { a: number; b: number; len: number; street: string; major: boolean; bridge: boolean; dir: 'h' | 'v' }

const nodes: (Pt | null)[] = []
for (let j = 0; j < NJ; j++) for (let i = 0; i < NI; i++) nodes[nid(i, j)] = nodeAllowed(i, j) ? nodePos(i, j) : null

const rawEdges: Edge[] = []
function nodeRemovedByRiverOnly(i: number, j: number) {
  const p = nodePos(i, j)
  return distToPolyline(p, RIVER) < 46 && p[1] <= coastY(p[0]) - 40
}
function tryEdge(i0: number, j0: number, i1: number, j1: number, dir: 'h' | 'v') {
  const a = nodes[nid(i0, j0)]
  const b = nodes[nid(i1, j1)]
  if (!a || !b) return
  const major = dir === 'h' ? MAJOR_ROWS.has(j0) : MAJOR_COLS.has(i0)
  const mid: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  if (mid[1] > coastY(mid[0]) - 25) return
  if (Math.hypot(mid[0] - HILL.x, mid[1] - HILL.y) < HILL.r - 8) return
  const crosses = crossesPolyline(a, b, RIVER)
  if (crosses && !major) return
  rawEdges.push({
    a: nid(i0, j0),
    b: nid(i1, j1),
    len: Math.hypot(b[0] - a[0], b[1] - a[1]),
    street: dir === 'h' ? ROW_NAMES[j0] : COL_NAMES[i0],
    major,
    bridge: crosses,
    dir,
  })
}
/** 1 本の通り(行または列)に沿って、存在するノード同士をつなぐ。大通りは川で消えたノードを飛び越えて橋を架ける */
function lineCells(dir: 'h' | 'v', idx: number): [number, number][] {
  return dir === 'h'
    ? Array.from({ length: NI }, (_, i) => [i, idx] as [number, number])
    : Array.from({ length: NJ }, (_, j) => [idx, j] as [number, number])
}
for (const dir of ['h', 'v'] as const) {
  const count = dir === 'h' ? NJ : NI
  for (let idx = 0; idx < count; idx++) {
    const major = dir === 'h' ? MAJOR_ROWS.has(idx) : MAJOR_COLS.has(idx)
    const cells = lineCells(dir, idx)
    let prev: [number, number] | null = null
    let skipped = 0
    for (const c of cells) {
      if (nodes[nid(c[0], c[1])]) {
        if (prev && (skipped === 0 || (major && skipped <= 2))) tryEdge(prev[0], prev[1], c[0], c[1], dir)
        prev = c
        skipped = 0
      } else if (prev && nodeRemovedByRiverOnly(c[0], c[1])) {
        skipped++
      } else {
        prev = null
        skipped = 0
      }
    }
  }
}

// 最大連結成分だけ残す(経路探索で到達できない孤立ノードを消す)
const adjRaw = new Map<number, number[]>()
rawEdges.forEach((e) => {
  ;(adjRaw.get(e.a) ?? adjRaw.set(e.a, []).get(e.a)!).push(e.b)
  ;(adjRaw.get(e.b) ?? adjRaw.set(e.b, []).get(e.b)!).push(e.a)
})
const reach = new Set<number>()
{
  const start = nid(10, 7)
  const stack = [start]
  reach.add(start)
  while (stack.length) {
    const n = stack.pop()!
    for (const m of adjRaw.get(n) ?? []) if (!reach.has(m)) (reach.add(m), stack.push(m))
  }
}
export const EDGES: Edge[] = rawEdges.filter((e) => reach.has(e.a) && reach.has(e.b))
export const NODES: (Pt | null)[] = nodes.map((p, i) => (p && reach.has(i) ? p : null))
const edgeKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`)
const edgeMap = new Map<string, Edge>()
EDGES.forEach((e) => edgeMap.set(edgeKey(e.a, e.b), e))
export const ADJ: { to: number; e: Edge }[][] = NODES.map(() => [])
EDGES.forEach((e) => {
  ADJ[e.a].push({ to: e.b, e })
  ADJ[e.b].push({ to: e.a, e })
})
export function edgeBetween(a: number, b: number) {
  return edgeMap.get(edgeKey(a, b))
}

/** 道路の描画用パスと、通りの名前ラベル用の連続区間 */
function buildRuns() {
  const majorRuns: Pt[][] = []
  const minorRuns: Pt[][] = []
  const labels: { id: string; name: string; d: string; major: boolean }[] = []
  const handleLine = (cells: [number, number][], dir: 'h' | 'v', name: string, major: boolean, idx: number) => {
    let run: Pt[] = []
    const runs: Pt[][] = []
    const present = cells.map(([i, j]) => nid(i, j)).filter((n) => NODES[n])
    for (let k = 0; k < present.length - 1; k++) {
      const e = edgeMap.get(edgeKey(present[k], present[k + 1]))
      if (e) {
        if (!run.length) run.push(NODES[present[k]]!)
        run.push(NODES[present[k + 1]]!)
      } else if (run.length) {
        runs.push(run)
        run = []
      }
    }
    if (run.length) runs.push(run)
    runs.forEach((r) => (major ? majorRuns : minorRuns).push(r))
    const best = runs.map((r) => ({ r, l: polylineLength(r) })).sort((a, b) => b.l - a.l)[0]
    if (best && best.l > 300) {
      // ラベルは一番長い区間の中央付近だけに付ける
      labels.push({ id: `${dir}${idx}`, name, d: toPathD(best.r), major })
    }
  }
  for (let j = 0; j < NJ; j++) handleLine(lineCells('h', j), 'h', ROW_NAMES[j], MAJOR_ROWS.has(j), j)
  for (let i = 0; i < NI; i++) handleLine(lineCells('v', i), 'v', COL_NAMES[i], MAJOR_COLS.has(i), i)
  return {
    majorD: majorRuns.map((r) => toPathD(r)).join(''),
    minorD: minorRuns.map((r) => toPathD(r)).join(''),
    labels,
  }
}
const runs = buildRuns()
export const MAJOR_D = runs.majorD
export const MINOR_D = runs.minorD
export const STREET_LABELS = runs.labels
export const BRIDGES_D = EDGES.filter((e) => e.bridge)
  .map((e) => {
    const a = NODES[e.a]!
    const b = NODES[e.b]!
    const p = (t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
    // 川面の上にかかる区間だけを橋にする
    let t0 = 1
    let t1 = 0
    for (let t = 0; t <= 1; t += 0.01)
      if (distToPolyline(p(t), RIVER) < 34) {
        t0 = Math.min(t0, t)
        t1 = Math.max(t1, t)
      }
    return t1 > t0 ? toPathD([p(t0), p(t1)]) : ''
  })
  .join('')

/* ------------------------------------------------------------------ */
/* 区画・建物・公園                                                      */
/* ------------------------------------------------------------------ */

const bil = (q: Pt[], u: number, v: number): Pt => [
  (1 - u) * (1 - v) * q[0][0] + u * (1 - v) * q[1][0] + u * v * q[2][0] + (1 - u) * v * q[3][0],
  (1 - u) * (1 - v) * q[0][1] + u * (1 - v) * q[1][1] + u * v * q[2][1] + (1 - u) * v * q[3][1],
]
const quadD = (q: Pt[], u0: number, v0: number, u1: number, v1: number) =>
  toPathD([bil(q, u0, v0), bil(q, u1, v0), bil(q, u1, v1), bil(q, u0, v1)], true)

function buildBlocks() {
  let blocks = ''
  let buildings = ''
  let smallParks = ''
  const smallParkLabels: { name: string; pos: Pt }[] = []
  for (let j = 0; j < NJ - 1; j++)
    for (let i = 0; i < NI - 1; i++) {
      const ids = [nid(i, j), nid(i + 1, j), nid(i + 1, j + 1), nid(i, j + 1)]
      if (ids.some((n) => !NODES[n])) continue
      const q = ids.map((n) => NODES[n]!) as Pt[]
      if (i >= CENTRAL_PARK.i0 && i < CENTRAL_PARK.i1 && j >= CENTRAL_PARK.j0 && j < CENTRAL_PARK.j1) continue
      const c = bil(q, 0.5, 0.5)
      if (distToPolyline(c, RIVER) < 80) continue
      if (c[1] > coastY(c[0]) - 60) continue
      const sp = SMALL_PARK_CELLS.find((s) => s.i === i && s.j === j)
      if (sp) {
        smallParks += quadD(q, 0.08, 0.08, 0.92, 0.92)
        smallParkLabels.push({ name: sp.name, pos: c })
        continue
      }
      blocks += quadD(q, 0.075, 0.075, 0.925, 0.925)
      const rnd = mulberry32(i * 977 + j * 131 + 5)
      const dCenter = Math.hypot(c[0] - 1180, c[1] - 760)
      const dense = dCenter < 520 || (c[0] > 1500 && c[1] > 800)
      const nu = dense ? 2 + Math.floor(rnd() * 2) : 3 + Math.floor(rnd() * 2)
      const nv = dense ? 2 : 2 + Math.floor(rnd() * 2)
      const gap = dense ? 0.012 : 0.03
      const u0 = 0.1
      const u1 = 0.9
      // 列ごとに幅を揺らす
      const cuts: number[] = [u0]
      for (let a = 1; a < nu; a++) cuts.push(u0 + ((u1 - u0) * (a + (rnd() - 0.5) * 0.5)) / nu)
      cuts.push(u1)
      const vcuts: number[] = [0.1]
      for (let b = 1; b < nv; b++) vcuts.push(0.1 + (0.8 * (b + (rnd() - 0.5) * 0.4)) / nv)
      vcuts.push(0.9)
      for (let a = 0; a < nu; a++)
        for (let b = 0; b < nv; b++) {
          const r = rnd()
          if (!dense && r < 0.18) continue // 空き地・庭
          if (dense && r < 0.05) continue
          // 内側は少し後退させて中庭っぽく
          const shrink = dense ? 0 : 0.04 + rnd() * 0.05
          buildings += quadD(
            q,
            cuts[a] + gap,
            vcuts[b] + gap + (b === 0 ? 0 : shrink * 0.3),
            cuts[a + 1] - gap,
            vcuts[b + 1] - gap - (b === nv - 1 ? 0 : shrink),
          )
        }
    }
  return { blocks, buildings, smallParks, smallParkLabels }
}
const blk = buildBlocks()
const smallParkPos = (name: string) => blk.smallParkLabels.find((l) => l.name === name)?.pos ?? ([600, 1100] as Pt)
export const BLOCKS_D = blk.blocks
export const BUILDINGS_D = blk.buildings
export const SMALL_PARKS_D = blk.smallParks

const cp = [
  nodePos(CENTRAL_PARK.i0, CENTRAL_PARK.j0),
  nodePos(CENTRAL_PARK.i1, CENTRAL_PARK.j0),
  nodePos(CENTRAL_PARK.i1, CENTRAL_PARK.j1),
  nodePos(CENTRAL_PARK.i0, CENTRAL_PARK.j1),
] as Pt[]
export const CENTRAL_PARK_D = quadD(cp, 0.035, 0.05, 0.965, 0.95)
export const CENTRAL_PARK_CENTER = bil(cp, 0.5, 0.5)
export const POND_D = toPathD(wobbleRing(bil(cp, 0.62, 0.55)[0], bil(cp, 0.62, 0.55)[1], 62, 3, 0.18, 32), true)
export const PARK_TRAILS_D =
  toPathD(catmullRom([bil(cp, 0.05, 0.3), bil(cp, 0.3, 0.42), bil(cp, 0.42, 0.75), bil(cp, 0.62, 0.9), bil(cp, 0.95, 0.85)], 6)) +
  toPathD(catmullRom([bil(cp, 0.2, 0.06), bil(cp, 0.3, 0.42), bil(cp, 0.5, 0.25), bil(cp, 0.8, 0.22), bil(cp, 0.95, 0.4)], 6))

/** 浜の公園(海岸沿い、海で上書きされて海岸線に沿う) */
export const BEACH_PARK_D = toPathD(wobbleRing(1530, 1385, 120, 41, 0.1, 36), true)

export const PARK_LABELS: { name: string; pos: Pt }[] = [
  { name: '汐見中央公園', pos: [CENTRAL_PARK_CENTER[0] - 40, CENTRAL_PARK_CENTER[1] - 40] },
  { name: '見晴らしの丘公園', pos: [HILL.x, HILL.y + 150] },
  { name: '鷺川緑地', pos: [930, 1010] },
  { name: '汐見浜公園', pos: [1500, 1350] },
  ...blk.smallParkLabels,
]

/* ------------------------------------------------------------------ */
/* 経路探索                                                            */
/* ------------------------------------------------------------------ */

export function nearestNode(p: Pt) {
  let best = -1
  let bd = Infinity
  NODES.forEach((n, i) => {
    if (!n || !ADJ[i].length) return
    const d = Math.hypot(n[0] - p[0], n[1] - p[1])
    if (d < bd) (bd = d), (best = i)
  })
  return best
}

/** 近い順に n 個のノード */
export function nearestNodes(p: Pt, n: number) {
  const list: { i: number; d: number }[] = []
  NODES.forEach((q, i) => {
    if (q && ADJ[i].length) list.push({ i, d: Math.hypot(q[0] - p[0], q[1] - p[1]) })
  })
  return list.sort((a, b) => a.d - b.d).slice(0, n)
}

/** 単一始点の最短路(大通りをわずかに優先) */
export function shortestFrom(from: number, to = -1) {
  const n = NODES.length
  const dist = new Float64Array(n).fill(Infinity)
  const prev = new Int32Array(n).fill(-1)
  const done = new Uint8Array(n)
  dist[from] = 0
  for (;;) {
    let u = -1
    let ud = Infinity
    for (let i = 0; i < n; i++) if (!done[i] && dist[i] < ud) (ud = dist[i]), (u = i)
    if (u < 0 || u === to) break
    done[u] = 1
    for (const { to: v, e } of ADJ[u]) {
      const w = e.len * (e.major ? 0.93 : 1)
      if (dist[u] + w < dist[v]) (dist[v] = dist[u] + w), (prev[v] = u)
    }
  }
  const pathTo = (t: number) => {
    const path: number[] = []
    for (let c = t; c !== -1; c = prev[c]) path.unshift(c)
    return path[0] === from ? path : [from]
  }
  return { dist, pathTo }
}

export function dijkstra(from: number, to: number): number[] {
  return shortestFrom(from, to).pathTo(to)
}

/** 任意の 2 点間の道順。両端の候補ノードを 3 つずつ試し、取り付け道路を含めて最短の組を選ぶ */
export function routeBetween(a: Pt, b: Pt) {
  const ca = nearestNodes(a, 3)
  const cb = nearestNodes(b, 3)
  let best: { ids: number[]; cost: number } | null = null
  for (const s of ca) {
    const r = shortestFrom(s.i)
    for (const t of cb) {
      const cost = s.d * 1.15 + r.dist[t.i] + t.d * 1.15
      if (!best || cost < best.cost) best = { ids: r.pathTo(t.i), cost }
    }
  }
  return best!.ids
}

/* ------------------------------------------------------------------ */
/* 場所(POI)                                                           */
/* ------------------------------------------------------------------ */

export type Category = 'cafe' | 'ramen' | 'park' | 'books' | 'bakery' | 'sento'

export type Place = {
  id: string
  name: string
  yomi: string
  cat: Category
  pos: Pt
  district: string
  rating: number
  reviews: number
  price: number
  /** 分単位の営業時間帯。閉店が 1440 を超えると翌日にまたがる */
  hours: [number, number][]
  closed?: number[]
  blurb: string
  tags: string[]
  hue: number
}

const at = (i: number, j: number, dx: number, dy: number): Pt => {
  const p = nodePos(i, j)
  return [p[0] + dx, p[1] + dy]
}
const h = (a: number, b: number): [number, number] => [a * 60, b * 60]

export const USER_POS: Pt = at(9, 6, 50, 40)

export const PLACES: Place[] = [
  { id: 'hiyorimi', name: '珈琲 ひよりみ', yomi: 'こーひー ひよりみ', cat: 'cafe', pos: at(4, 10, 44, 36), district: '旧市街', rating: 4.6, reviews: 212, price: 2, hours: [h(8, 19)], closed: [2], blurb: '自家焙煎の深煎りと、厚切りのバタートーストが名物の古い喫茶。', tags: ['禁煙', 'モーニング', '電源あり'], hue: 28 },
  { id: 'sagi', name: '喫茶 鷺', yomi: 'きっさ さぎ', cat: 'cafe', pos: at(3, 2, 46, 44), district: '鷺ノ台', rating: 4.3, reviews: 98, price: 1, hours: [h(7.5, 18)], blurb: '窓辺から川沿いの並木が見える、小さなカウンターの喫茶店。', tags: ['テイクアウト', 'Wi-Fi'], hue: 200 },
  { id: 'lantern', name: 'ランタン珈琲スタンド', yomi: 'らんたんこーひーすたんど', cat: 'cafe', pos: at(10, 7, 40, 30), district: '汐見中央', rating: 4.4, reviews: 356, price: 1, hours: [h(9, 21)], blurb: '駅前の立ち飲みスタンド。浅煎りのハンドドリップを一杯ずつ。', tags: ['駅近', 'テイクアウト'], hue: 42 },
  { id: 'baisen', name: '汐見焙煎所', yomi: 'しおみばいせんじょ', cat: 'cafe', pos: at(15, 8, 42, 34), district: '港町', rating: 4.7, reviews: 187, price: 2, hours: [h(10, 18)], closed: [1], blurb: '倉庫を改装した焙煎所。豆の量り売りと、焼き菓子のペアリング。', tags: ['豆の販売', 'テラス席'], hue: 18 },
  { id: 'yohaku', name: 'ブックカフェ 余白', yomi: 'ぶっくかふぇ よはく', cat: 'cafe', pos: at(8, 1, 44, 46), district: '北汐見', rating: 4.5, reviews: 143, price: 2, hours: [h(11, 22)], blurb: '壁一面の本棚に囲まれて、閉店まで静かに読書ができる。', tags: ['静か', '電源あり', 'Wi-Fi'], hue: 150 },
  { id: 'polaris', name: '港の喫茶 ポラリス', yomi: 'みなとのきっさ ぽらりす', cat: 'cafe', pos: at(16, 8, 46, 40), district: '港町', rating: 4.2, reviews: 76, price: 2, hours: [h(7, 20)], blurb: '船乗りたちが通った老舗。ナポリタンとクリームソーダ。', tags: ['レトロ', '喫煙席なし'], hue: 350 },
  { id: 'shiosai', name: '麺処 しおさい', yomi: 'めんどころ しおさい', cat: 'ramen', pos: at(5, 11, 40, 34), district: '旧市街', rating: 4.5, reviews: 642, price: 1, hours: [h(11, 15), h(17.5, 22)], closed: [3], blurb: '昆布と貝の出汁を合わせた透き通る塩らーめん。昼は行列必至。', tags: ['塩', '券売機', 'デリバリー対応'], hue: 195 },
  { id: 'akari', name: '中華そば 灯', yomi: 'ちゅうかそば あかり', cat: 'ramen', pos: at(12, 6, 40, 36), district: '汐見中央', rating: 4.6, reviews: 521, price: 1, hours: [h(11, 21)], blurb: '煮干しと鶏ガラの醤油。チャーシューは低温でしっとり。', tags: ['醤油', '駅近'], hue: 12 },
  { id: 'hinata', name: '鶏白湯 ひなた', yomi: 'とりぱいたん ひなた', cat: 'ramen', pos: at(11, 2, 40, 40), district: '北汐見', rating: 4.2, reviews: 233, price: 1, hours: [h(11.5, 15), h(18, 23)], blurb: 'ポタージュのように濃厚な鶏白湯。柚子の香りで後味は軽い。', tags: ['鶏白湯', 'カウンター'], hue: 40 },
  { id: 'konagi', name: '煮干しそば 小凪', yomi: 'にぼしそば こなぎ', cat: 'ramen', pos: at(1, 8, 44, 36), district: '西汐見', rating: 4.4, reviews: 311, price: 1, hours: [h(11, 20)], closed: [1], blurb: '数種の煮干しを使い分けた、香り高い一杯。替え玉は細麺。', tags: ['煮干し', '替え玉'], hue: 220 },
  { id: 'hatoba', name: '波止場家', yomi: 'はとばや', cat: 'ramen', pos: at(12, 10, 42, 34), district: '浜通り', rating: 3.9, reviews: 410, price: 1, hours: [h(11, 26)], blurb: '太麺に濃いめの豚骨醤油。深夜2時まで開いている港の味方。', tags: ['深夜営業', 'ライス無料'], hue: 30 },
  { id: 'miharashi', name: '見晴らしの丘公園', yomi: 'みはらしのおかこうえん', cat: 'park', pos: [HILL.x - 20, HILL.y + 40], district: '見晴らしの丘', rating: 4.6, reviews: 980, price: 0, hours: [h(0, 24)], blurb: '標高 64m の展望広場から、汐見湾と市街が一望できる。', tags: ['展望台', '遊歩道', '桜'], hue: 120 },
  { id: 'chuo-park', name: '汐見中央公園', yomi: 'しおみちゅうおうこうえん', cat: 'park', pos: [CENTRAL_PARK_CENTER[0] - 60, CENTRAL_PARK_CENTER[1] + 10], district: '汐見中央', rating: 4.5, reviews: 1204, price: 0, hours: [h(0, 24)], blurb: 'ボート池と芝生広場のある市内最大の公園。週末は朝市も。', tags: ['ボート池', '芝生広場'], hue: 140 },
  { id: 'kawa-ryokuchi', name: '鷺川緑地', yomi: 'さぎがわりょくち', cat: 'park', pos: [960, 1020], district: '旧市街', rating: 4.3, reviews: 402, price: 0, hours: [h(0, 24)], blurb: '川沿いに続く芝生とサイクリングロード。夕暮れどきが美しい。', tags: ['川沿い', 'サイクリング'], hue: 160 },
  { id: 'hama-park', name: '汐見浜公園', yomi: 'しおみはまこうえん', cat: 'park', pos: [1560, 1330], district: '浜通り', rating: 4.4, reviews: 655, price: 0, hours: [h(6, 21)], blurb: '鴎島を望む砂浜と遊歩道。夏は海の家が並ぶ。', tags: ['砂浜', '遊歩道'], hue: 190 },
  { id: 'yanagi-park', name: '柳公園', yomi: 'やなぎこうえん', cat: 'park', pos: smallParkPos('柳公園'), district: '旧市街', rating: 4.0, reviews: 88, price: 0, hours: [h(0, 24)], blurb: '大きな柳の木陰にベンチが並ぶ、旧市街の小さな公園。', tags: ['遊具', 'ベンチ'], hue: 100 },
  { id: 'shioridou', name: '古書 しおり堂', yomi: 'こしょ しおりどう', cat: 'books', pos: at(5, 9, 46, 36), district: '旧市街', rating: 4.7, reviews: 164, price: 0, hours: [h(12, 20)], closed: [3], blurb: '文学と美術書が中心の古書店。店主の手書きポップが楽しい。', tags: ['古書', '美術書'], hue: 30 },
  { id: 'bookcenter', name: '汐見ブックセンター', yomi: 'しおみぶっくせんたー', cat: 'books', pos: at(11, 7, 46, 34), district: '汐見中央', rating: 4.1, reviews: 287, price: 0, hours: [h(10, 22)], blurb: '3フロアの大型書店。地元の作家コーナーと文具売り場がある。', tags: ['新刊', '文具'], hue: 230 },
  { id: 'kotori', name: '絵本と雑貨 ことり', yomi: 'えほんとざっか ことり', cat: 'books', pos: at(5, 3, 44, 40), district: '鷺ノ台', rating: 4.8, reviews: 121, price: 0, hours: [h(11, 18)], closed: [1, 2], blurb: '絵本と手しごとの雑貨。土曜の午前は読み聞かせ会。', tags: ['絵本', '雑貨'], hue: 340 },
  { id: 'sagibunko', name: '古書 鷺文庫', yomi: 'こしょ さぎぶんこ', cat: 'books', pos: at(6, 10, 42, 40), district: '旧市街', rating: 4.5, reviews: 73, price: 0, hours: [h(13, 19)], blurb: '文庫と新書の均一棚が充実。百円棚目当ての常連が多い。', tags: ['文庫', '均一棚'], hue: 15 },
  { id: 'mugi', name: 'ブーランジェリー 麦と潮', yomi: 'ぶーらんじぇりー むぎとしお', cat: 'bakery', pos: at(14, 9, 40, 30), district: '港町', rating: 4.6, reviews: 389, price: 2, hours: [h(7, 18)], closed: [1], blurb: '塩バターロールが看板。朝7時の焼き上がりを狙って行列ができる。', tags: ['イートイン', '朝7時〜'], hue: 35 },
  { id: 'komugi', name: 'パン工房 こむぎ堂', yomi: 'ぱんこうぼう こむぎどう', cat: 'bakery', pos: at(13, 3, 44, 40), district: '北汐見', rating: 4.3, reviews: 152, price: 1, hours: [h(8, 19)], blurb: '昔ながらの惣菜パンとあんぱん。焼きそばパンは昼に売り切れる。', tags: ['惣菜パン'], hue: 45 },
  { id: 'futaba', name: 'ベーグル フタバ', yomi: 'べーぐる ふたば', cat: 'bakery', pos: at(2, 6, 46, 38), district: '西汐見', rating: 4.4, reviews: 97, price: 1, hours: [h(9, 17)], closed: [0, 1], blurb: 'もっちり系のベーグル専門店。季節のクリームチーズが十数種。', tags: ['ベーグル', 'テイクアウト'], hue: 90 },
  { id: 'matsunoyu', name: '松の湯', yomi: 'まつのゆ', cat: 'sento', pos: at(7, 12, 40, 30), district: '旧市街', rating: 4.5, reviews: 267, price: 1, hours: [h(15, 24)], closed: [5], blurb: '昭和初期から続く宮造りの銭湯。富士ではなく汐見湾のペンキ絵。', tags: ['サウナ', '露天風呂'], hue: 180 },
  { id: 'minatoyu', name: '港湯', yomi: 'みなとゆ', cat: 'sento', pos: at(17, 7, 40, 36), district: '港町', rating: 4.2, reviews: 141, price: 1, hours: [h(14, 23.5)], blurb: '漁師町の朝風呂文化が残る銭湯。週末は朝6時から営業。', tags: ['朝風呂', '水風呂'], hue: 200 },
]

export const ORDER = {
  restaurantId: 'shiosai',
  no: 'KM-4821',
  items: [
    { name: '特製塩らーめん', qty: 2, price: 1180 },
    { name: '味玉', qty: 1, price: 150 },
  ],
  fee: 280,
  courier: { name: '長瀬 陸', rating: 4.9, trips: 1820, vehicle: '自転車' },
}
