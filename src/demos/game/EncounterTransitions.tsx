import { useFBO } from '@react-three/drei'
import { Canvas, createPortal, useFrame, useThree } from '@react-three/fiber'
import { animate, AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import * as THREE from 'three'
import { BattleStage, makeWorld, resetWorld, SHOTS, type BattleWorld } from './battle3d'
import { MONSTERS, TypeBadge, type MonsterData } from './monsters'

/**
 * RPGのエンカウント演出(2D ドット絵フィールド → GLSL トランジション → 3D バトル)。
 * - フィールドは 16px のドット絵タイルをオフスクリーン canvas に一度だけ描き、毎フレームはカメラ位置で切り出して最近傍拡大
 *   主人公は文字列で定義したドット絵スプライトを反転・足だけずらして歩行フレームを生成し、1マスずつ補間移動
 * - その canvas を CanvasTexture として、3D バトルシーン(createPortal + useFBO でオフスクリーン描画)と一緒に
 *   全画面クアッドのフラグメントシェーダーへ渡し、uProgress で2枚を合成する
 *   渦巻き(外周から内側へのブロック順をシェーダー内で計算)・横ブラインド・黒帯・ピクセル化・円形アイリス・スワール(ねじれ)
 * - 「ガラス割れ」は三角形に分割した平面の各頂点に重心と乱数を持たせ、頂点シェーダーで回転・飛散・落下させる
 * - 草むらで一定確率、または「いますぐ試す」で白い2回フラッシュ → トランジション → 相手が奥から滑り込みカメラが寄る
 * - ゲーム状態とアニメーション値は素のオブジェクトと uniform に持ち、motion の animate() で補間。React の再レンダーは画面切り替えと歩数だけ
 * - 動きを減らす設定ではフラッシュを省き、クロスフェードのみ
 */

type Dir = 'up' | 'down' | 'left' | 'right'
type Kind = 'fade' | 'spiral' | 'blinds' | 'bars' | 'pixel' | 'iris' | 'swirl' | 'shatter'
type Choice = 'random' | Exclude<Kind, 'fade'>

const KINDS: { id: Exclude<Kind, 'fade'>; label: string }[] = [
  { id: 'spiral', label: '渦巻き' },
  { id: 'blinds', label: '横ブラインド' },
  { id: 'bars', label: '黒帯' },
  { id: 'pixel', label: 'ピクセル化' },
  { id: 'iris', label: '円形ワイプ' },
  { id: 'swirl', label: 'スワール' },
  { id: 'shatter', label: 'ガラス割れ' },
]
const KIND_INDEX: Record<Kind, number> = { fade: 0, spiral: 1, blinds: 2, bars: 3, pixel: 4, iris: 5, swirl: 6, shatter: 7 }
const KIND_LABEL: Record<Kind, string> = { fade: 'フェード', spiral: '渦巻き', blinds: '横ブラインド', bars: '黒帯', pixel: 'ピクセル化', iris: '円形ワイプ', swirl: 'スワール', shatter: 'ガラス割れ' }
const DURATION: Record<Kind, number> = { fade: 0.7, spiral: 1.25, blinds: 1.0, bars: 1.3, pixel: 1.25, iris: 1.4, swirl: 1.35, shatter: 1.6 }

// ---------- マップ ----------
const T = 16
const MW = 32
const MH = 22
const MARGIN = 10
const START = { x: 16, y: 13 }
const STEP_MS = 165

function buildMap() {
  const g = Array.from({ length: MH }, () => Array<string>(MW).fill('.'))
  const rect = (x: number, y: number, w: number, h: number, c: string) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (g[yy]?.[xx] !== undefined) g[yy][xx] = c
  }
  rect(3, 2, 9, 6, 'g')
  rect(24, 2, 6, 7, 'g')
  rect(2, 14, 10, 6, 'g')
  rect(19, 14, 7, 5, 'g')
  rect(19, 2, 4, 4, 'w')
  rect(27, 16, 3, 3, 'w')
  rect(19, 7, 2, 2, 'T')
  rect(12, 14, 2, 2, 'T')
  rect(1, 10, MW - 2, 2, 'p')
  rect(15, 1, 2, MH - 2, 'p')
  rect(0, 0, MW, 1, 'T')
  rect(0, MH - 1, MW, 1, 'T')
  rect(0, 0, 1, MH, 'T')
  rect(MW - 1, 0, 1, MH, 'T')
  g[9][13] = 's'
  for (let y = 1; y < MH - 1; y++) for (let x = 1; x < MW - 1; x++) if (g[y][x] === '.' && hash(x, y) < 0.09) g[y][x] = 'f'
  return g
}

function hash(x: number, y: number) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

function tile(draw: (ctx: CanvasRenderingContext2D, px: (x: number, y: number, c: string) => void) => void) {
  const c = makeCanvas(T, T)
  const ctx = c.getContext('2d')!
  const px = (x: number, y: number, col: string) => {
    ctx.fillStyle = col
    ctx.fillRect(x, y, 1, 1)
  }
  draw(ctx, px)
  return c
}

const TUFT = ['..c...c.', '.cb..cb.', '.bb.cbb.', 'cbbcbbac', 'bbabbabb', 'babbabab', 'aaabaaab', 'aaaaaaaa']

function grassBase(ctx: CanvasRenderingContext2D, px: (x: number, y: number, c: string) => void, v: number) {
  ctx.fillStyle = '#8fd16a'
  ctx.fillRect(0, 0, T, T)
  for (let i = 0; i < 4; i++) {
    const x = 1 + Math.floor(hash(v * 7 + i, 3) * 13)
    const y = 2 + Math.floor(hash(v * 5 + i, 9) * 12)
    px(x, y, '#76bb55')
    px(x + 1, y - 1, '#76bb55')
    if (i % 2) px(x + 3, y + 1, '#aee68a')
  }
}

function buildTiles() {
  const grass = [0, 1, 2, 3].map((v) => tile((ctx, px) => grassBase(ctx, px, v)))
  const path = [0, 1, 2].map((v) =>
    tile((ctx, px) => {
      ctx.fillStyle = '#e8d39a'
      ctx.fillRect(0, 0, T, T)
      for (let i = 0; i < 5; i++) {
        px(Math.floor(hash(v, i) * 16), Math.floor(hash(i, v + 4) * 16), '#d3b97c')
        px(Math.floor(hash(v + 9, i) * 16), Math.floor(hash(i + 3, v) * 16), '#f6e6bb')
      }
    }),
  )
  const tall = tile((ctx, px) => {
    ctx.fillStyle = '#58a943'
    ctx.fillRect(0, 0, T, T)
    const col: Record<string, string> = { a: '#2f7a2c', b: '#5fb847', c: '#a3e57a' }
    for (const [ox, oy] of [[0, 0], [8, 0], [0, 8], [8, 8]])
      TUFT.forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && px(ox + x, oy + y, col[ch])))
  })
  const tree = tile((ctx, px) => {
    grassBase(ctx, px, 1)
    for (let y = 0; y < T; y++)
      for (let x = 0; x < T; x++) {
        const d = Math.hypot(x - 7.5, y - 6.5)
        if (d <= 7.3) {
          let c = '#45a046'
          if (d > 6.3) c = '#1f5a2a'
          else if (Math.hypot(x - 5, y - 3.5) < 2.6) c = '#8ed36a'
          else if (x - 7.5 + (y - 6.5) > 3.5) c = '#2f7f3a'
          else if (hash(x, y) < 0.14) c = '#3a8f40'
          px(x, y, c)
        } else if (x >= 6 && x <= 9 && y >= 12) {
          px(x, y, x === 6 || x === 9 ? '#4a2a14' : '#7a4a24')
        }
      }
  })
  const water = [0, 1].map((frame) =>
    [false, true].map((edge) =>
      tile((ctx, px) => {
        ctx.fillStyle = '#4b9be0'
        ctx.fillRect(0, 0, T, T)
        for (const [row, off] of [[4, 0], [9, 7], [13, 3]]) for (let i = 0; i < 3; i++) px((off + frame * 2 + i) % 16, row, '#a6dbff')
        if (edge) {
          ctx.fillStyle = '#86c6f0'
          ctx.fillRect(0, 0, T, 2)
          ctx.fillStyle = '#e1f5ff'
          ctx.fillRect(0, 0, T, 1)
        }
      }),
    ),
  )
  const petals = ['#ff6b8a', '#ffffff', '#ffd84a']
  const flower = [0, 1].map((frame) =>
    [0, 1, 2].map((v) =>
      tile((ctx, px) => {
        grassBase(ctx, px, v)
        for (let i = 0; i < 2; i++) {
          const cx = 3 + Math.floor(hash(v, i + 20) * 9) + (frame && i === 0 ? 1 : 0)
          const cy = 3 + i * 6 + Math.floor(hash(i, v + 30) * 3)
          const pc = petals[(v + i) % 3]
          px(cx, cy - 1, pc)
          px(cx - 1, cy, pc)
          px(cx + 1, cy, pc)
          px(cx, cy + 1, pc)
          px(cx, cy, '#f2a41f')
          px(cx - (frame ? 1 : 0), cy + 2, '#3d8a34')
        }
      }),
    ),
  )
  const sign = tile((ctx, px) => {
    grassBase(ctx, px, 2)
    ctx.fillStyle = '#4a2a14'
    ctx.fillRect(7, 9, 2, 6)
    ctx.fillRect(2, 2, 12, 8)
    ctx.fillStyle = '#c58b4a'
    ctx.fillRect(3, 3, 10, 6)
    ctx.fillStyle = '#9a6430'
    ctx.fillRect(4, 5, 8, 1)
    ctx.fillRect(4, 7, 5, 1)
    px(3, 3, '#e3ad6c')
  })
  return { grass, path, tall, tree, water, flower, sign }
}

function renderMap(map: string[][], frame: number, tiles: ReturnType<typeof buildTiles>) {
  const cols = MW + MARGIN * 2
  const rows = MH + MARGIN * 2
  const c = makeCanvas(cols * T, rows * T)
  const ctx = c.getContext('2d')!
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const mx = x - MARGIN
      const my = y - MARGIN
      const ch = map[my]?.[mx] ?? 'T'
      const v = Math.floor(hash(x, y) * 4)
      let img: HTMLCanvasElement
      if (ch === 'T') img = tiles.tree
      else if (ch === 'g') img = tiles.tall
      else if (ch === 'p') img = tiles.path[v % 3]
      else if (ch === 'w') img = tiles.water[frame][map[my - 1]?.[mx] === 'w' ? 0 : 1]
      else if (ch === 'f') img = tiles.flower[frame][v % 3]
      else if (ch === 's') img = tiles.sign
      else img = tiles.grass[v]
      ctx.drawImage(img, x * T, y * T)
    }
  return c
}

// ---------- 主人公スプライト ----------
const PAL: Record<string, string> = {
  o: '#2b2233', h: '#e0463a', H: '#ff8a74', w: '#f4f4f4', s: '#ffd2a8', e: '#2b2233',
  b: '#6b3f22', c: '#3a7fd6', C: '#86bbff', k: '#e8a33a', p: '#3b3b55',
}
const mirrorHalf = (rows: string[]) => rows.map((r) => r + [...r].reverse().join(''))
const DOWN = mirrorHalf([
  '....oooo', '...ohhhh', '..ohHHhh', '..ohhhhh', '..owwwww', '..obssss', '..ossess', '..ossess',
  '...ossss', '..oCcccc', '.ocCcccc', '.osccccc', '..oopppp', '...opppo', '...opppo', '...oooo.',
])
const UP = mirrorHalf([
  '....oooo', '...ohhhh', '..ohhhhh', '..ohhhhh', '..ohhhhh', '..obbbbb', '..obbbbb', '..obbbbb',
  '...obbbb', '..oCcckk', '.occkkkk', '.osckkkk', '..oopppp', '...opppo', '...opppo', '...oooo.',
])
const LEFT = [
  '.....ooooo......', '....ohhhhho.....', '...ohHHhhhho....', '..ohhhhhhhhho...', '.owwwwwhhhhhho..', '..ossssbbbbbo...',
  '..osesssbbbbo...', '..osesssbbbbo...', '...ossssbbbo....', '....occccco.....', '....occckkko....', '....osckkkko....',
  '....opppppo.....', '....oppoppo.....', '....oppoppo.....', '....ooo.ooo.....',
]

function liftLeg(rows: string[], side: 0 | 1) {
  const out = rows.map((r) => [...r])
  for (let x = side * 8; x < side * 8 + 8; x++) {
    out[13][x] = rows[14][x]
    out[14][x] = rows[15][x]
    out[15][x] = '.'
  }
  return out.map((r) => r.join(''))
}

function spriteCanvas(rows: string[], flip = false) {
  return tile((_, px) =>
    rows.forEach((r, y) =>
      [...r.padEnd(16, '.').slice(0, 16)].forEach((ch, x) => ch !== '.' && px(flip ? 15 - x : x, y, PAL[ch] ?? '#f0f')),
    ),
  )
}

function buildSprites() {
  const set = (rows: string[], flip = false) => [rows, liftLeg(rows, 0), liftLeg(rows, 1)].map((r) => spriteCanvas(r, flip))
  return { down: set(DOWN), up: set(UP), left: set(LEFT), right: set(LEFT, true) } satisfies Record<Dir, HTMLCanvasElement[]>
}

// ---------- フィールドのエンジン(2D canvas) ----------
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

interface EngineOpts {
  onStep: () => void
  onEncounter: () => void
}

const DELTA: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }

function createEngine(opts: { current: EngineOpts }) {
  const canvas = makeCanvas(2, 2)
  const ctx = canvas.getContext('2d')!
  const map = buildMap()
  const tiles = buildTiles()
  const frames = [renderMap(map, 0, tiles), renderMap(map, 1, tiles)]
  const sprites = buildSprites()
  const st = {
    x: START.x, y: START.y, dir: 'down' as Dir, parity: 0 as 0 | 1,
    move: null as null | { fx: number; fy: number; tx: number; ty: number; t0: number },
    held: [] as Dir[], queued: [] as Dir[],
    locked: false, since: 0,
    rustle: null as null | { x: number; y: number; t0: number },
    w: 2, h: 2, scale: 2, center: { x: 0.5, y: 0.5 },
  }

  const walkable = (x: number, y: number) => ['.', 'p', 'g', 'f'].includes(map[y]?.[x] ?? 'T')

  function update(now: number) {
    if (st.locked) return
    if (st.move && now - st.move.t0 >= STEP_MS) {
      st.x = st.move.tx
      st.y = st.move.ty
      st.move = null
      opts.current.onStep()
      if (map[st.y][st.x] === 'g') {
        st.rustle = { x: st.x, y: st.y, t0: now }
        st.since += 1
        if (st.since >= 3 && Math.random() < 0.15) {
          st.locked = true
          opts.current.onEncounter()
          return
        }
      }
    }
    if (!st.move) {
      const dir = st.queued.shift() ?? st.held[st.held.length - 1]
      if (dir) {
        st.dir = dir
        const [dx, dy] = DELTA[dir]
        if (walkable(st.x + dx, st.y + dy)) {
          st.move = { fx: st.x, fy: st.y, tx: st.x + dx, ty: st.y + dy, t0: now }
          st.parity = st.parity ? 0 : 1
        }
      }
    }
  }

  function draw(now: number) {
    const s = st.scale
    const vw = st.w / s
    const vh = st.h / s
    let px = st.x
    let py = st.y
    let walking = false
    if (st.move) {
      const p = clamp01((now - st.move.t0) / STEP_MS)
      px = st.move.fx + (st.move.tx - st.move.fx) * p
      py = st.move.fy + (st.move.ty - st.move.fy) * p
      walking = p < 0.6
    }
    const ax = (px + MARGIN) * T
    const ay = (py + MARGIN) * T
    const fullW = (MW + MARGIN * 2) * T
    const fullH = (MH + MARGIN * 2) * T
    let cx = Math.max(0, Math.min(fullW - vw, ax + T / 2 - vw / 2))
    let cy = Math.max(0, Math.min(fullH - vh, ay + T / 2 - vh / 2))
    cx = Math.round(cx * s) / s
    cy = Math.round(cy * s) / s
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(frames[Math.floor(now / 600) % 2], cx, cy, vw, vh, 0, 0, st.w, st.h)

    const sx = Math.round((ax - cx) * s)
    const sy = Math.round((ay - cy) * s)
    ctx.fillStyle = 'rgba(30,40,20,.25)'
    ctx.fillRect(sx + 3 * s, sy + 14 * s, 10 * s, 2 * s)
    ctx.fillRect(sx + 2 * s, sy + 15 * s, 12 * s, 1 * s)
    ctx.drawImage(sprites[st.dir][walking ? 1 + st.parity : 0], sx, sy - (walking ? s : 0) - s, T * s, T * s)

    // 草むらの中では足元を草で隠す
    const gx = Math.round(px)
    const gy = Math.round(py)
    if (map[gy]?.[gx] === 'g') {
      const r = st.rustle && st.rustle.x === gx && st.rustle.y === gy ? clamp01((now - st.rustle.t0) / 260) : 1
      const jig = r < 1 ? Math.round(Math.sin(r * Math.PI * 4) * s) : 0
      const tx = Math.round(((gx + MARGIN) * T - cx) * s)
      const ty = Math.round(((gy + MARGIN) * T - cy) * s)
      ctx.drawImage(tiles.tall, 0, 9, T, 7, tx + jig, ty + 9 * s, T * s, 7 * s)
      if (r < 1) {
        ctx.fillStyle = '#a3e57a'
        for (let i = 0; i < 4; i++) {
          const lx = tx + ((i * 5 + 2) % 14) * s + Math.round((i - 1.5) * r * 6 * s)
          const ly = ty + 8 * s - Math.round(Math.sin(r * Math.PI) * (6 + i * 2) * s)
          ctx.fillRect(lx, ly, s * 2, s)
        }
      }
    }
    st.center = { x: (sx + 8 * s) / st.w, y: 1 - (sy + 8 * s) / st.h }
  }

  return {
    canvas,
    frame(now: number) {
      update(now)
      draw(now)
    },
    resize(cssW: number, cssH: number, dpr: number) {
      st.w = Math.max(2, Math.round(cssW * dpr))
      st.h = Math.max(2, Math.round(cssH * dpr))
      canvas.width = st.w
      canvas.height = st.h
      st.scale = Math.max(2, Math.round(cssH / 150)) * dpr
    },
    hold(dir: Dir, on: boolean) {
      st.held = st.held.filter((d) => d !== dir)
      if (on) st.held.push(dir)
    },
    tap(dir: Dir) {
      if (st.queued.length < 3) st.queued.push(dir)
    },
    clearHeld() {
      st.held = []
    },
    trigger() {
      if (st.locked) return false
      st.locked = true
      st.move = null
      return true
    },
    resume() {
      st.locked = false
      st.since = 0
      st.held = []
      st.queued = []
    },
    center: () => st.center,
  }
}

type Engine = ReturnType<typeof createEngine>

// ---------- トランジションのシェーダー ----------
const VERT = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`

const FRAG = /* glsl */ `
uniform sampler2D tField; uniform sampler2D tBattle;
uniform float uP; uniform float uFlash; uniform float uFade; uniform float uTime;
uniform int uKind; uniform vec2 uRes; uniform vec2 uCenter;
varying vec2 vUv;

vec3 F(vec2 uv) { return texture2D(tField, clamp(uv, 0.0, 1.0)).rgb; }
vec3 B(vec2 uv) { return texture2D(tBattle, clamp(uv, 0.0, 1.0)).rgb; }
vec2 swirl(vec2 uv, float s) {
  float a = uRes.x / uRes.y;
  vec2 d = (uv - 0.5) * vec2(a, 1.0);
  float r = length(d);
  float ang = s * pow(max(0.0, 1.0 - r / 0.9), 2.0);
  float c = cos(ang), sn = sin(ang);
  d = mat2(c, -sn, sn, c) * d;
  return d / vec2(a, 1.0) + 0.5;
}

void main() {
  vec2 uv = vUv;
  float p = uP;
  float aspect = uRes.x / uRes.y;
  vec3 col;
  if (uKind == 0) {
    col = mix(F(uv), B(uv), smoothstep(0.0, 1.0, p));
  } else if (uKind == 1) {
    // 外周から内側へ、時計回りのブロック順をセル座標から算出
    vec2 grid = vec2(ceil(7.0 * aspect), 7.0);
    vec2 cell = floor(uv * grid);
    float ring = min(min(cell.x, cell.y), min(grid.x - 1.0 - cell.x, grid.y - 1.0 - cell.y));
    float w = grid.x - 2.0 * ring;
    float h = grid.y - 2.0 * ring;
    vec2 c = cell - ring;
    float pos;
    if (c.y > h - 1.5) pos = c.x;
    else if (c.x > w - 1.5) pos = (w - 1.0) + (h - 1.0 - c.y);
    else if (c.y < 0.5) pos = (w - 1.0) + (h - 1.0) + (w - 1.0 - c.x);
    else pos = 2.0 * (w - 1.0) + (h - 1.0) + (h - 1.0 - c.y);
    float idx = grid.x * grid.y - w * h + pos;
    float t = p * (grid.x * grid.y + 6.0);
    float k = clamp(t - idx, 0.0, 1.0);
    vec2 f = fract(uv * grid) - 0.5;
    float sq = step(max(abs(f.x), abs(f.y)), k * 0.5);
    float edge = step(0.44, max(abs(f.x), abs(f.y))) * (1.0 - smoothstep(0.85, 1.0, p));
    col = mix(F(uv), mix(B(uv), vec3(0.02), edge * 0.85), sq);
    col = mix(col, vec3(0.0), sq * (1.0 - smoothstep(0.0, 4.0, t - idx)) * 0.9);
  } else if (uKind == 2) {
    float N = 10.0;
    float i = floor((1.0 - uv.y) * N);
    float e = clamp((p * 1.55 - i * 0.045 - mod(i, 2.0) * 0.07) / 0.9, 0.0, 1.0);
    e = e * e * (3.0 - 2.0 * e);
    float x = mod(i, 2.0) < 0.5 ? uv.x : 1.0 - uv.x;
    float shown = step(x, e);
    float line = smoothstep(0.012, 0.0, abs(x - e)) * step(0.001, e) * step(e, 0.999);
    col = mix(F(uv), B(uv), shown) + line * 0.9;
  } else if (uKind == 3) {
    // 黒帯で閉じてから、開くとバトル
    float close = smoothstep(0.0, 0.5, p);
    float open = smoothstep(0.55, 1.0, p);
    float band = 0.5 * close * (1.0 - open);
    float d = abs(uv.y - 0.5);
    float black = step(0.5 - band, d);
    vec3 base = p < 0.52 ? F(uv) : B(uv);
    float glint = smoothstep(0.006, 0.0, abs(d - (0.5 - band))) * step(0.001, band);
    col = mix(base, vec3(0.0), black) + glint * 0.8;
  } else if (uKind == 4) {
    float m = sin(p * 3.14159);
    float b = 1.0 + m * m * (uRes.y / 9.0);
    vec2 q = (floor(uv * uRes / b) + 0.5) * b / uRes;
    col = mix(F(q), B(q), smoothstep(0.42, 0.58, p));
  } else if (uKind == 5) {
    vec2 d = (uv - uCenter) * vec2(aspect, 1.0);
    vec2 d2 = (uv - 0.5) * vec2(aspect, 1.0);
    float maxR = length(vec2(aspect, 1.0));
    if (p < 0.5) {
      float r = maxR * pow(1.0 - p * 2.0, 1.6);
      float inside = step(length(d), r);
      col = mix(vec3(0.0), F(uv), inside) + smoothstep(0.01, 0.0, abs(length(d) - r)) * 0.8 * step(0.001, r);
    } else {
      float r = maxR * pow((p - 0.5) * 2.0, 1.4);
      float inside = step(length(d2), r);
      col = mix(vec3(0.0), B(uv), inside) + smoothstep(0.01, 0.0, abs(length(d2) - r)) * 0.8 * step(0.001, r) * step(r, maxR * 0.99);
    }
  } else if (uKind == 6) {
    float s = sin(p * 3.14159) * 11.0;
    vec3 a = F(swirl(uv, s));
    vec3 b2 = B(swirl(uv, -s));
    float m = smoothstep(0.4, 0.6, p);
    col = mix(a, b2, m) + vec3(sin(p * 3.14159) * 0.25);
  } else {
    col = B(uv);
  }
  col = mix(col, vec3(1.0), uFlash);
  col *= 1.0 - uFade;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`

const SHARD_VERT = /* glsl */ `
attribute vec2 aCenter; attribute vec3 aRand;
uniform float uP; uniform vec2 uCenter;
varying vec2 vUv; varying float vShade;
void main() {
  vec2 c0 = uCenter * 2.0 - 1.0;
  float d = length(aCenter - c0);
  float t = clamp((uP - d * 0.16) / 0.72, 0.0, 1.0);
  float crack = smoothstep(0.0, 0.08, uP) * 0.012;
  vec2 local = position.xy - aCenter;
  float ang = t * (aRand.z - 0.5) * 10.0;
  local = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * local;
  float sc = (1.0 - crack * 6.0) * (1.0 - t * 0.35) + t * aRand.x * 0.35;
  vec2 dir = normalize(aCenter - c0 + vec2(0.001));
  vec2 pos = aCenter + local * sc + dir * (crack + t * (0.5 + aRand.y) * 1.7) + vec2(0.0, 0.5 * t - 4.2 * t * t);
  vUv = uv;
  vShade = 1.0 - t * 0.35 + (aRand.x - 0.5) * 0.3 * smoothstep(0.0, 0.1, t);
  gl_Position = vec4(pos, 0.0, 1.0);
}
`
const SHARD_FRAG = /* glsl */ `
uniform sampler2D tField; uniform float uFlash;
varying vec2 vUv; varying float vShade;
void main() {
  vec3 c = texture2D(tField, vUv).rgb * vShade;
  gl_FragColor = vec4(mix(c, vec3(1.0), uFlash), 1.0);
  #include <colorspace_fragment>
}
`

function shardGeometry(cols = 14, rows = 8) {
  const pos: number[] = []
  const uv: number[] = []
  const cen: number[] = []
  const rnd: number[] = []
  // 格子点を少しずらしてから三角形に割る
  const pt = (i: number, j: number): [number, number] => {
    const edge = i === 0 || j === 0 || i === cols || j === rows
    const jx = edge ? 0 : (hash(i, j) - 0.5) * 0.7
    const jy = edge ? 0 : (hash(j + 50, i) - 0.5) * 0.7
    return [((i + jx) / cols) * 2 - 1, ((j + jy) / rows) * 2 - 1]
  }
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const a = pt(i, j)
      const b = pt(i + 1, j)
      const c = pt(i + 1, j + 1)
      const d = pt(i, j + 1)
      const tris = (i + j) % 2 ? [[a, b, c], [a, c, d]] : [[a, b, d], [b, c, d]]
      for (const tri of tris) {
        const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3
        const cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3
        const r = [Math.random(), Math.random(), Math.random()]
        for (const [x, y] of tri) {
          pos.push(x, y, 0)
          uv.push((x + 1) / 2, (y + 1) / 2)
          cen.push(cx, cy)
          rnd.push(...r)
        }
      }
    }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setAttribute('aCenter', new THREE.Float32BufferAttribute(cen, 2))
  g.setAttribute('aRand', new THREE.Float32BufferAttribute(rnd, 3))
  return g
}

export type TransitionUniforms = {
  tField: { value: THREE.Texture | null }
  tBattle: { value: THREE.Texture | null }
  uP: { value: number }
  uFlash: { value: number }
  uFade: { value: number }
  uTime: { value: number }
  uKind: { value: number }
  uRes: { value: THREE.Vector2 }
  uCenter: { value: THREE.Vector2 }
}

function Compositor({ engine, U, world, enemy, battleOn }: { engine: Engine; U: TransitionUniforms; world: BattleWorld; enemy: string; battleOn: { current: boolean } }) {
  const { size, viewport } = useThree()
  const fbo = useFBO()
  const battleScene = useMemo(() => new THREE.Scene(), [])
  const battleCam = useMemo(() => new THREE.PerspectiveCamera(36, 1, 0.1, 200), [])
  const fieldTex = useMemo(() => {
    const t = new THREE.CanvasTexture(engine.canvas)
    t.magFilter = THREE.NearestFilter
    t.minFilter = THREE.LinearFilter
    t.generateMipmaps = false
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [engine])
  const quadMat = useMemo(() => new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false }), [U])
  const shardMat = useMemo(() => new THREE.ShaderMaterial({ uniforms: U, vertexShader: SHARD_VERT, fragmentShader: SHARD_FRAG, depthTest: false, depthWrite: false, side: THREE.DoubleSide }), [U])
  const shards = useMemo(() => shardGeometry(), [])
  const quad = useMemo(() => new THREE.PlaneGeometry(2, 2), [])
  const shardRef = useRef<THREE.Mesh>(null)
  const last = useRef({ w: 0, h: 0 })

  useEffect(() => {
    engine.resize(size.width, size.height, viewport.dpr)
  }, [engine, size.width, size.height, viewport.dpr])

  useEffect(
    () => () => {
      fieldTex.dispose()
      quadMat.dispose()
      shardMat.dispose()
      shards.dispose()
      quad.dispose()
    },
    [fieldTex, quadMat, shardMat, shards, quad],
  )

  useFrame(({ gl, scene, camera, clock }) => {
    engine.frame(performance.now())
    const c = engine.canvas
    if (c.width !== last.current.w || c.height !== last.current.h) {
      last.current = { w: c.width, h: c.height }
      fieldTex.dispose()
    }
    fieldTex.needsUpdate = true
    U.tField.value = fieldTex
    U.tBattle.value = fbo.texture
    U.uRes.value.set(c.width, c.height)
    U.uTime.value = clock.elapsedTime
    if (!battleOn.current) U.uCenter.value.set(engine.center().x, engine.center().y)
    if (shardRef.current) shardRef.current.visible = U.uKind.value === KIND_INDEX.shatter && U.uP.value > 0 && U.uP.value < 1
    if (battleOn.current || U.uP.value > 0) {
      gl.setRenderTarget(fbo)
      gl.render(battleScene, battleCam)
      gl.setRenderTarget(null)
    }
    gl.render(scene, camera)
  }, 1)

  return (
    <>
      {createPortal(<BattleStage world={world} enemy={enemy} player="ヒダマル" fx={[]} still={false} camera={battleCam} />, battleScene)}
      <mesh geometry={quad} material={quadMat} frustumCulled={false} renderOrder={0} />
      <mesh ref={shardRef} geometry={shards} material={shardMat} frustumCulled={false} renderOrder={1} visible={false} />
    </>
  )
}

/** motion は素のオブジェクトの値を内部にキャッシュするため、直接書き換えた値から始まるよう常に [現在値, 目標] で渡す */
function fromCurrent(obj: object, values: Record<string, number | number[] | undefined>) {
  const out: Record<string, number[]> = {}
  for (const [k, v] of Object.entries(values)) {
    if (v === undefined) continue
    out[k] = Array.isArray(v) ? v : [(obj as Record<string, number>)[k], v]
  }
  return out
}

const KEY_DIR: Record<string, Dir> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right',
}

function pickMonster() {
  const pool = MONSTERS.filter((m) => m.name !== 'ヒダマル')
  if (Math.random() < 0.06) return pool[pool.length - 1]
  return pool[Math.floor(Math.random() * (pool.length - 1))]
}

type Stage = 'field' | 'transition' | 'battle' | 'leaving'

export function EncounterTransitions() {
  const reduced = !!useReducedMotion()
  const rootRef = useRef<HTMLDivElement>(null)
  const [choice, setChoice] = useState<Choice>('random')
  const [stage, setStage] = useState<Stage>('field')
  const [enc, setEnc] = useState<{ mon: MonsterData; kind: Kind; lv: number; id: number }>(() => ({ mon: MONSTERS[0], kind: 'spiral', lv: 5, id: 0 }))
  const [steps, setSteps] = useState(0)
  const [count, setCount] = useState(0)
  const [focused, setFocused] = useState(false)
  const [banner, setBanner] = useState(true)
  const world = useRef(makeWorld()).current
  const battleOn = useRef(false)
  const anims = useRef(new Set<{ stop: () => void }>())
  const U = useMemo<TransitionUniforms>(
    () => ({
      tField: { value: null }, tBattle: { value: null }, uP: { value: 0 }, uFlash: { value: 0 }, uFade: { value: 0 },
      uTime: { value: 0 }, uKind: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uCenter: { value: new THREE.Vector2(0.5, 0.5) },
    }),
    [],
  )
  const choiceRef = useRef(choice)
  const reducedRef = useRef(reduced)
  useEffect(() => {
    choiceRef.current = choice
    reducedRef.current = reduced
  }, [choice, reduced])

  const opts = useRef<EngineOpts>({ onStep: () => {}, onEncounter: () => {} })
  const engine = useMemo(() => createEngine(opts), [])

  const tw = <T extends object>(obj: T, values: Record<string, number | number[]>, o: Parameters<typeof animate>[2] = {}) =>
    new Promise<void>((resolve) => {
      const c = animate(obj, fromCurrent(obj, values) as never, o) as unknown as { stop: () => void; then: (r: () => void) => unknown }
      anims.current.add(c)
      c.then(() => {
        anims.current.delete(c)
        resolve()
      })
    })

  const begin = async () => {
    const red = reducedRef.current
    const kind: Kind = red ? 'fade' : choiceRef.current === 'random' ? KINDS[Math.floor(Math.random() * KINDS.length)].id : choiceRef.current
    const mon = pickMonster()
    setEnc({ mon, kind, lv: 3 + Math.floor(Math.random() * 6), id: Date.now() })
    setCount((n) => n + 1)
    setStage('transition')
    resetWorld(world)
    Object.assign(world.cam, red ? SHOTS.default : SHOTS.wide)
    world.enemy.lunge = red ? 0 : -7
    world.player.scale = red ? 1 : 0
    U.uKind.value = KIND_INDEX[kind]
    U.uP.value = 0
    if (!red) await tw(U.uFlash, { value: [0, 0.95, 0, 0.95, 0] }, { duration: 0.75, ease: 'linear' })
    // バトル側の登場はトランジションの途中から始める
    const d = DURATION[kind]
    window.setTimeout(() => {
      if (red) return
      void tw(world.enemy, { lunge: 0 }, { duration: 1.1, ease: [0.15, 0.7, 0.3, 1] })
      void tw(world.cam, { ...SHOTS.default }, { duration: 1.9, ease: [0.3, 0, 0.2, 1] })
    }, d * 350)
    await tw(U.uP, { value: 1 }, { duration: d, ease: kind === 'shatter' ? 'linear' : [0.45, 0, 0.55, 1] })
    battleOn.current = true
    setStage('battle')
    if (!red) {
      await new Promise((r) => window.setTimeout(r, 500))
      void tw(world.player, { scale: [0, 1.15, 1] }, { duration: 0.5, ease: 'easeOut' })
    }
  }

  const runAway = async () => {
    if (rootRef.current?.contains(document.activeElement)) rootRef.current.focus({ preventScroll: true })
    setStage('leaving')
    await tw(U.uFade, { value: 1 }, { duration: reducedRef.current ? 0.2 : 0.4 })
    battleOn.current = false
    U.uP.value = 0
    U.uKind.value = 0
    engine.resume()
    setStage('field')
    await tw(U.uFade, { value: 0 }, { duration: reducedRef.current ? 0.2 : 0.45 })
  }

  useEffect(() => {
    opts.current.onStep = () => setSteps((n) => n + 1)
    opts.current.onEncounter = () => void begin()
  })

  useEffect(() => {
    const t = window.setTimeout(() => setBanner(false), 2600)
    const set = anims.current
    return () => {
      window.clearTimeout(t)
      set.forEach((a) => a.stop())
    }
  }, [])

  const trigger = () => {
    if (engine.trigger()) void begin()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const dir = KEY_DIR[e.key]
    if (stage !== 'field') {
      if (dir) e.preventDefault()
      return
    }
    if (dir) {
      e.preventDefault()
      if (!e.repeat) engine.hold(dir, true)
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
      e.preventDefault()
      trigger()
    }
  }
  const onKeyUp = (e: KeyboardEvent<HTMLDivElement>) => {
    const dir = KEY_DIR[e.key]
    if (dir) engine.hold(dir, false)
  }

  const pad = (dir: Dir) => ({
    onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => {
      e.preventDefault()
      rootRef.current?.focus()
      e.currentTarget.setPointerCapture(e.pointerId)
      engine.hold(dir, true)
    },
    onPointerUp: () => engine.hold(dir, false),
    onPointerCancel: () => engine.hold(dir, false),
    onLostPointerCapture: () => engine.hold(dir, false),
    onClick: (e: { detail: number }) => {
      if (e.detail === 0) engine.tap(dir)
    },
  })

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      data-encounter-root=""
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setFocused(false)
          engine.clearHeld()
        }
      }}
      aria-label="エンカウント演出デモ。矢印キーかWASDで歩き、草むらで野生のモンスターに出会う。Enterで今すぐ演出を試す"
      className="@container relative flex h-full w-full flex-col overflow-hidden bg-[#10131b] font-['Noto_Sans_JP',Inter,sans-serif] text-white outline-none select-none"
    >
      {/* 演出の選択 */}
      <div className="flex shrink-0 items-center gap-1.5 border-b-2 border-black bg-[#1a1f2c] px-2 py-1.5">
        <span className="shrink-0 pr-1 font-['Press_Start_2P'] text-[8px] text-[#ffd34a]">WIPE</span>
        <div role="radiogroup" aria-label="エンカウント演出" className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none]">
          {([{ id: 'random', label: 'ランダム' }, ...KINDS] as { id: Choice; label: string }[]).map((k) => (
            <button
              key={k.id}
              type="button"
              role="radio"
              aria-checked={choice === k.id}
              onClick={() => setChoice(k.id)}
              className="shrink-0 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-bold whitespace-nowrap text-white/75 transition-colors hover:bg-white/12 aria-checked:border-[#ffd34a] aria-checked:bg-[#ffd34a] aria-checked:text-[#1a1f2c]"
            >
              {k.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={stage !== 'field'}
          onClick={trigger}
          className="shrink-0 rounded-md border-2 border-black bg-[#e5533d] px-2.5 py-1 text-[11px] font-black whitespace-nowrap shadow-[inset_0_-2px_0_rgba(0,0,0,.25)] hover:bg-[#f0664f] disabled:opacity-40"
        >
          いますぐ試す
        </button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
        <Canvas className="!absolute inset-0" dpr={[1, 1.75]} flat gl={{ antialias: false }} aria-hidden>
          <Compositor engine={engine} U={U} world={world} enemy={enc.mon.name} battleOn={battleOn} />
        </Canvas>

        <AnimatePresence>
          {banner && stage === 'field' && (
            <motion.div
              initial={reduced ? { opacity: 0 } : { y: -50 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reduced ? { opacity: 0 } : { y: -50 }}
              transition={{ duration: 0.4 }}
              className="absolute top-2 left-2 rounded-[6px] border-[3px] border-[#4a2a14] bg-[#e9c88f] px-3 py-1 text-[13px] font-black text-[#4a2a14] shadow-[inset_0_0_0_2px_#f7e2b8]"
            >
              そよかぜの こみち
            </motion.div>
          )}
        </AnimatePresence>

        {stage === 'field' && (
          <>
            <div className="pointer-events-none absolute bottom-[calc(var(--solo-footer-clearance,0px)+8px)] left-2 max-w-[55%] rounded-md bg-black/55 px-2 py-1 text-[10px] leading-relaxed font-bold text-white/90 backdrop-blur-sm @min-[30rem]:text-[11px]">
              <p>{focused ? '矢印キー / WASD で移動・Enter で演出' : 'クリックしてキー操作を開始'}</p>
              <p className="font-['VT323'] text-[14px] leading-none text-[#ffd34a]">
                STEPS {String(steps).padStart(4, '0')}　ENCOUNTER {count}
              </p>
              {reduced && <p className="text-[#9fd6ff]">動きを減らす設定のためフェードで切り替え</p>}
            </div>
            <div className="absolute right-2 bottom-[calc(var(--solo-footer-clearance,0px)+8px)] grid grid-cols-3 grid-rows-3 gap-0.5 rounded-full bg-black/35 p-1.5">
              {(
                [
                  ['up', 'col-start-2 row-start-1', '▲', '上へ'],
                  ['left', 'col-start-1 row-start-2', '◀', '左へ'],
                  ['right', 'col-start-3 row-start-2', '▶', '右へ'],
                  ['down', 'col-start-2 row-start-3', '▼', '下へ'],
                ] as const
              ).map(([dir, pos, icon, label]) => (
                <button
                  key={dir}
                  type="button"
                  aria-label={label}
                  {...pad(dir)}
                  className={`${pos} grid size-8 touch-none place-items-center rounded-md border-2 border-black bg-[#2d3446] text-[11px] text-white/85 shadow-[inset_0_-3px_0_rgba(0,0,0,.35)] active:translate-y-px active:bg-[#46506a] @min-[40rem]:size-9`}
                >
                  {icon}
                </button>
              ))}
              <span aria-hidden className="col-start-2 row-start-2 m-auto size-3 rounded-full bg-[#2d3446]" />
            </div>
          </>
        )}

        {stage === 'transition' && (
          <span className="absolute top-2 right-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-[#ffd34a]">演出：{KIND_LABEL[enc.kind]}</span>
        )}
        {(stage === 'battle' || stage === 'leaving') && <BattleHud key={enc.id} {...enc} reduced={reduced} onRun={() => void runAway()} />}
      </div>
    </div>
  )
}

function BattleHud({ mon, kind, lv, reduced, onRun }: { mon: MonsterData; kind: Kind; lv: number; reduced: boolean; onRun: () => void }) {
  const [typed, setTyped] = useState(0)
  const btnRef = useRef<HTMLButtonElement>(null)
  const text = `やせいの ${mon.name}が あらわれた！`

  useEffect(() => {
    if (reduced) {
      setTyped(text.length)
      return
    }
    let n = 0
    const id = window.setInterval(() => {
      n += 1
      setTyped(n)
      if (n >= text.length) window.clearInterval(id)
    }, 40)
    return () => window.clearInterval(id)
  }, [reduced, text])

  useEffect(() => {
    const btn = btnRef.current
    // デモ内にフォーカスがあるときだけ「にげる」へ移す(ページ上の他の場所からは奪わない)
    if (typed >= text.length && btn?.closest('[data-encounter-root]')?.contains(document.activeElement)) btn.focus({ preventScroll: true })
  }, [typed, text])

  return (
    <div
      className="absolute inset-0 flex flex-col"
      onKeyDown={(e) => {
        if (e.key === 'Escape' || ((e.key === 'Enter' || e.key === ' ') && !(e.target instanceof HTMLButtonElement))) {
          e.preventDefault()
          onRun()
        }
      }}
    >
      <div className="relative min-h-0 flex-1">
        <motion.div
          initial={reduced ? { opacity: 0 } : { x: '-120%' }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut', delay: reduced ? 0 : 0.3 }}
          className="absolute top-[6%] left-[3%] w-[46%] max-w-[280px] rounded-[12px] rounded-br-[3px] border-[3px] border-[#30384a] bg-[#fbfaf0]/95 px-3 py-1.5 text-[#2b2f3a] shadow-[4px_4px_0_rgba(48,56,74,.28)]"
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-[14px] font-black">{mon.name}</span>
            <span className="font-['Press_Start_2P'] text-[8px]">Lv{lv}</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="rounded-[3px] bg-[#e8a33a] px-1 font-['Press_Start_2P'] text-[7px] leading-[11px] text-white">HP</span>
            <div className="h-[10px] flex-1 overflow-hidden rounded-full border-2 border-[#30384a] bg-[#4cd07a]" />
          </div>
          <div className="mt-1 flex gap-1">
            {mon.types.map((t) => (
              <TypeBadge key={t} type={t} className="!text-[9px]" />
            ))}
          </div>
        </motion.div>
        <span className="absolute top-2 right-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-[#ffd34a]">演出：{KIND_LABEL[kind]}</span>
      </div>

      <div className="flex h-[calc(84px+var(--solo-footer-clearance,0px))] shrink-0 gap-1.5 border-t-[3px] border-black bg-[#2d3446] p-1.5 pb-[calc(var(--solo-footer-clearance,0px)+6px)] @min-[40rem]:h-[calc(96px+var(--solo-footer-clearance,0px))]">
        <div className="relative min-w-0 flex-1 rounded-[10px] border-[3px] border-[#30384a] bg-[#fcfcf6] px-3.5 py-2 text-[14px] leading-[1.8] font-bold tracking-[0.06em] text-[#2b2f3a] shadow-[inset_0_0_0_3px_#fcfcf6,inset_0_0_0_5px_#8fbdd1] @min-[40rem]:text-[16px]">
          <span aria-hidden>{text.slice(0, typed)}</span>
          <span className="sr-only" aria-live="polite">
            {text}
          </span>
        </div>
        <button
          ref={btnRef}
          type="button"
          onClick={onRun}
          className="w-[30%] max-w-[180px] shrink-0 rounded-[10px] border-[3px] border-black bg-[#3b7fd9] text-[14px] font-black text-white shadow-[inset_0_-3px_0_rgba(0,0,0,.25)] hover:bg-[#4b8fe9]"
        >
          にげる
        </button>
      </div>
    </div>
  )
}
