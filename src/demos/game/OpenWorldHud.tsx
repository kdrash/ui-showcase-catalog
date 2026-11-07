import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, type MotionValue } from 'motion/react'
import { Diamond, Footprints, House, Mountain, RotateCcw, Tent, TowerControl, type LucideIcon } from 'lucide-react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'

/**
 * オープンワールドゲーム風の HUD(React Three Fiber の 3D ワールド + DOM の HUD)。
 * - 地形は fbm ノイズの高さ関数から生成したローポリ地形。川・海岸線・岬・森はミニマップの SVG と同じ制御点から作り、地図と 3D が一致する
 * - 夕暮れの空は自作のグラデーション + 太陽のシェーダー、指数フォグ、自作シェーダーの水面(フレネル + 太陽の照り返し)、針葉樹と岩の InstancedMesh
 * - 灯台(回転する光芒)・見張り塔・宿場町・野営地・商人の荷車・石橋を 3D で配置し、目的地には加算合成の光の柱が立つ
 * - 向き(heading)は MotionValue。カメラは useFrame で、HUD(コンパス帯・マーカー・ミニマップ)は ref 経由で直接更新し、毎フレームの React 再描画なし
 * - 前進するとカメラが地形に沿って移動し、距離表示・ミニマップ・3D の見え方がすべて同じワールド座標で連動する
 * - Bloom + ACES トーンマッピング + ビネット。ドラッグで風景をつかんで回す / ←→ で旋回 / ↑ で前進(キー操作はデモにフォーカスがあるときだけ)
 */

const VFOV = 52
const MAP_S = 100 / 320 // ミニマップ半径 100 = 320 m
const SPEED = 46 // m/s
const ARRIVE = 24
const SUN_BEARING = 334
const QUEST = '灯の消えた岬'
const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

type Point = { id: string; x: number; y: number; name: string; kind: 'objective' | 'landmark'; icon?: LucideIcon; index?: number }

const OBJECTIVES = [
  { id: 'o1', text: '風見の丘で旅の商人と話す', x: 170, y: 240 },
  { id: 'o2', text: '古い石橋を渡り、北の岬へ向かう', x: -230, y: 540 },
  { id: 'o3', text: '灯台の最上階で火を灯す', x: 60, y: 900 },
]
const LANDMARKS: Point[] = [
  { id: 'village', name: '宿場町', icon: House, x: -340, y: -160, kind: 'landmark' },
  { id: 'tower', name: '見張り塔', icon: TowerControl, x: 520, y: 80, kind: 'landmark' },
  { id: 'camp', name: '野営地', icon: Tent, x: -560, y: 260, kind: 'landmark' },
  { id: 'peak', name: '白嶺', icon: Mountain, x: 260, y: -640, kind: 'landmark' },
]
const POINTS: Point[] = [...OBJECTIVES.map((o, index) => ({ id: o.id, x: o.x, y: o.y, name: o.text, kind: 'objective' as const, index })), ...LANDMARKS]
const mod = (n: number, m: number) => ((n % m) + m) % m
const wrap180 = (d: number) => mod(d + 180, 360) - 180
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const fmtDist = (d: number) => (d < 1000 ? `${Math.max(0, Math.round(d))} m` : `${(d / 1000).toFixed(1)} km`)

function useSynced<T>(initial: T) {
  const ref = useRef(initial)
  const [value, setValue] = useState(initial)
  const set = useCallback((next: T) => {
    ref.current = next
    setValue(next)
  }, [])
  return [value, ref, set] as const
}

/* ───────────────────────── 3D ワールド: 地形の高さ関数(ミニマップと同じ地理) ───────────────────────── */

const hash2 = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}
const vnoise = (x: number, y: number) => {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash2(xi, yi)
  const b = hash2(xi + 1, yi)
  const c = hash2(xi, yi + 1)
  const d = hash2(xi + 1, yi + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}
const fbm = (x: number, y: number, oct = 5) => {
  let s = 0
  let a = 0.5
  let f = 1
  for (let i = 0; i < oct; i++) {
    s += a * vnoise(x * f, y * f)
    f *= 2.03
    a *= 0.5
  }
  return s
}
const ridged = (x: number, y: number) => {
  let s = 0
  let a = 0.5
  let f = 1
  for (let i = 0; i < 4; i++) {
    s += a * (1 - Math.abs(vnoise(x * f, y * f) * 2 - 1))
    f *= 2.1
    a *= 0.5
  }
  return s
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1)
  return t * t * (3 - 2 * t)
}
const smax = (a: number, b: number, k: number) => {
  const h = clamp(0.5 + (0.5 * (a - b)) / k, 0, 1)
  return lerp(b, a, h) + k * h * (1 - h)
}

/** ミニマップの SVG パスと同じ制御点から、x → y の参照表を作る */
type Seg = [number, number][]
function curveLut(segs: Seg[], kind: 'cubic' | 'quad') {
  const pts: [number, number][] = []
  for (const s of segs) {
    for (let i = 0; i <= 24; i++) {
      const t = i / 24
      const m = 1 - t
      if (kind === 'cubic') {
        const [p0, c1, c2, p1] = s
        pts.push([
          m * m * m * p0[0] + 3 * m * m * t * c1[0] + 3 * m * t * t * c2[0] + t * t * t * p1[0],
          m * m * m * p0[1] + 3 * m * m * t * c1[1] + 3 * m * t * t * c2[1] + t * t * t * p1[1],
        ])
      } else {
        const [p0, c, p1] = s
        pts.push([m * m * p0[0] + 2 * m * t * c[0] + t * t * p1[0], m * m * p0[1] + 2 * m * t * c[1] + t * t * p1[1]])
      }
    }
  }
  const lut = new Float32Array(1001)
  let j = 0
  for (let i = 0; i <= 1000; i++) {
    const x = -2000 + i * 4
    while (j < pts.length - 2 && pts[j + 1][0] < x) j++
    const [x0, y0] = pts[j]
    const [x1, y1] = pts[j + 1]
    lut[i] = y0 + (y1 - y0) * clamp((x - x0) / (x1 - x0 || 1), 0, 1)
  }
  return (x: number) => {
    const f = clamp((x + 2000) / 4, 0, 1000)
    const i = Math.floor(f)
    return lut[i] + (lut[Math.min(1000, i + 1)] - lut[i]) * (f - i)
  }
}
const riverY = curveLut(
  [
    [[-2000, 400], [-800, 300], [-500, 470], [-230, 400]],
    [[-230, 400], [40, 330], [200, 330], [500, 420]],
    [[500, 420], [800, 510], [900, 380], [2000, 450]],
  ],
  'cubic',
)
const coastY = curveLut(
  [
    [[-2000, 760], [-800, 700], [-500, 780]],
    [[-500, 780], [-200, 860], [0, 790]],
    [[0, 790], [200, 720], [500, 760]],
    [[500, 760], [800, 800], [2000, 800]],
  ],
  'quad',
)
const FORESTS = [
  { x: -160, y: 140, r: 90 },
  { x: -60, y: 110, r: 50 },
  { x: 360, y: -260, r: 130 },
  { x: -430, y: -40, r: 70 },
]

/** ワールド座標(x 東 / y 北, m)の地面の高さ。水面は 0 */
function heightAt(x: number, y: number) {
  const r = Math.hypot(x, y)
  let h = 9 + (fbm(x * 0.0035 + 3.1, y * 0.0035 - 1.7) - 0.48) * 34 + (fbm(x * 0.02, y * 0.02, 3) - 0.45) * 3
  h = smax(h, 3, 4)
  // 開始地点は見晴らしのよい小高い丘
  h = smax(h, 6 + 30 * Math.exp(-(r * r) / (2 * 62 * 62)), 6)
  h += smooth(-200, -750, y) * ridged(x * 0.0032, y * 0.0032) * 150
  h += 170 * Math.exp(-((x - 260) ** 2 + (y + 640) ** 2) / (2 * 170 * 170))
  h += smooth(950, 1500, r) * (50 + ridged(x * 0.002, y * 0.002) * 170)
  h = lerp(h, -3.5, 1 - smooth(9, 34, Math.abs(y - riverY(x))))
  let sea = smooth(coastY(x) - 30, coastY(x) + 50, y)
  if (x > -90 && x < 170) {
    const k = Math.sin(Math.PI * clamp((x + 70) / 220, 0, 1))
    const top = 760 + 215 * Math.pow(k, 0.7)
    sea *= smooth(top - 30, top + 20, y)
  }
  return lerp(h, -16 - fbm(x * 0.01, y * 0.01, 2) * 8, sea)
}

const SUN_DIR = (() => {
  const b = (SUN_BEARING * Math.PI) / 180
  const e = (3 * Math.PI) / 180
  return new THREE.Vector3(Math.sin(b) * Math.cos(e), Math.sin(e), -Math.cos(b) * Math.cos(e))
})()
const FOG = new THREE.Color().setRGB(0.8, 0.52, 0.4)
const ground = (x: number, y: number, lift = 0): [number, number, number] => [x, Math.max(heightAt(x, y), 0) + lift, -y]

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ───────────────────────── 3D ワールド: 各オブジェクト ───────────────────────── */

function Terrain() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(3600, 3600, 240, 240)
    const pos = g.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) pos.setZ(i, heightAt(pos.getX(i), pos.getY(i)))
    g.rotateX(-Math.PI / 2)
    g.computeVertexNormals()
    const nrm = g.attributes.normal as THREE.BufferAttribute
    const col = new Float32Array(pos.count * 3)
    const C = {
      deep: new THREE.Color('#29505a'),
      wet: new THREE.Color('#8b8a6c'),
      sand: new THREE.Color('#d8c597'),
      meadow: new THREE.Color('#a3a85a'),
      g1: new THREE.Color('#6f9147'),
      g2: new THREE.Color('#40643a'),
      rock: new THREE.Color('#857d72'),
      snow: new THREE.Color('#f1f2f4'),
    }
    const c = new THREE.Color()
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = -pos.getZ(i)
      const h = pos.getY(i)
      const ny = nrm.getY(i)
      const n = fbm(x * 0.012 + 5, y * 0.012, 3)
      if (h < -0.4) c.copy(C.wet).lerp(C.deep, clamp(-h / 14, 0, 1))
      else if (h < 2.4) c.copy(C.sand)
      else {
        c.copy(C.g1).lerp(C.g2, smooth(0.35, 0.65, n))
        c.lerp(C.meadow, (1 - smooth(2.4, 6, h)) * 0.6)
        c.lerp(C.rock, Math.max(smooth(0.88, 0.7, ny), smooth(60, 110, h) * 0.8))
        c.lerp(C.snow, smooth(110, 140, h + n * 30) * smooth(0.55, 0.8, ny))
      }
      col.set([c.r, c.g, c.b], i * 3)
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    return g
  }, [])
  const mat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, metalness: 0 })
    // 頂点色だけでは単調なので、ワールド座標のノイズで細かな濃淡を足す
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>
          varying vec3 vWPos;`)
        .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
          vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`)
      sh.fragmentShader = sh.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          varying vec3 vWPos;
          float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float n21(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
            return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          float dn = n21(vWPos.xz * 0.045) * 0.5 + n21(vWPos.xz * 0.21) * 0.32 + n21(vWPos.xz * 1.3) * 0.18;
          diffuseColor.rgb *= 0.72 + dn * 0.5;`,
        )
    }
    return m
  }, [])
  useEffect(
    () => () => {
      geo.dispose()
      mat.dispose()
    },
    [geo, mat],
  )
  return <mesh geometry={geo} material={mat} receiveShadow />
}

const WATER_VS = /* glsl */ `
  #include <fog_pars_vertex>
  varying vec3 vWorld;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    vec4 mvPosition = viewMatrix * wp;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`
const WATER_FS = /* glsl */ `
  #include <fog_pars_fragment>
  uniform float uTime;
  uniform vec3 uSun;
  uniform vec3 uDeep;
  uniform vec3 uSky;
  varying vec3 vWorld;
  void main() {
    vec2 p = vWorld.xz;
    float t = uTime;
    vec3 n = normalize(vec3(
      sin(p.x * 0.09 + t * 1.1) * 0.05 + sin((p.x + p.y) * 0.23 + t * 1.7) * 0.03 + sin(p.x * 0.6 - t * 2.3) * 0.012,
      1.0,
      cos(p.y * 0.07 + t * 0.9) * 0.05 + cos((p.x - p.y) * 0.19 - t * 1.4) * 0.03 + cos(p.y * 0.55 + t * 2.1) * 0.012));
    vec3 V = normalize(cameraPosition - vWorld);
    float fres = pow(1.0 - max(dot(V, n), 0.0), 4.0);
    vec3 R = reflect(-V, n);
    float s = max(dot(R, uSun), 0.0);
    vec3 col = mix(uDeep, uSky, clamp(fres * 1.15, 0.0, 1.0));
    col += vec3(1.0, 0.78, 0.5) * (pow(s, 260.0) * 14.0 + pow(s, 18.0) * 0.35);
    gl_FragColor = vec4(col, mix(0.72, 0.97, fres));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`

function Water({ reduced }: { reduced: boolean }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: WATER_VS,
        fragmentShader: WATER_FS,
        transparent: true,
        fog: true,
        depthWrite: false,
        uniforms: THREE.UniformsUtils.merge([
          THREE.UniformsLib.fog,
          { uTime: { value: 0 }, uSun: { value: SUN_DIR }, uDeep: { value: new THREE.Color('#1d4a5c') }, uSky: { value: new THREE.Color('#f0cfa8') } },
        ]),
      }),
    [],
  )
  useEffect(() => () => mat.dispose(), [mat])
  useFrame((_, dt) => {
    if (!reduced) mat.uniforms.uTime.value += dt
  })
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0} material={mat} renderOrder={1}>
      <planeGeometry args={[9000, 9000]} />
    </mesh>
  )
}

/** 針葉樹と岩をインスタンス描画(森はミニマップの森の位置に密集させる) */
function Forest() {
  const meshes = useMemo(() => {
    const rng = mulberry32(11)
    const spots: { x: number; y: number; s: number }[] = []
    const tryAdd = (x: number, y: number, p: number) => {
      const h = heightAt(x, y)
      if (h < 3.2 || h > 95 || Math.hypot(x, y) < 22 || rng() > p) return
      if (Math.abs(heightAt(x + 5, y) - heightAt(x - 5, y)) + Math.abs(heightAt(x, y + 5) - heightAt(x, y - 5)) > 9) return
      spots.push({ x, y, s: 0.7 + rng() * 0.75 })
    }
    for (const f of FORESTS)
      for (let i = 0; i < f.r * 2.2; i++) {
        const a = rng() * Math.PI * 2
        const d = Math.sqrt(rng()) * f.r
        tryAdd(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d, 0.95)
      }
    // 開始地点の手前に数本(前景の奥行き)
    for (const [x, y, k] of [
      [-15, 13, 1.5],
      [-25, 5, 1.2],
      [-21, 24, 1.35],
      [-33, 18, 1],
    ])
      spots.push({ x, y, s: k })
    for (let i = 0; i < 14000 && spots.length < 2600; i++) {
      const x = (rng() * 2 - 1) * 1500
      const y = (rng() * 2 - 1) * 1500
      tryAdd(x, y, fbm(x * 0.006 + 9, y * 0.006) > 0.56 ? 0.55 : 0.05)
    }
    const coneGeo = new THREE.ConeGeometry(2.4, 8.5, 7).translate(0, 7.2, 0)
    const trunkGeo = new THREE.CylinderGeometry(0.35, 0.5, 3.2, 5).translate(0, 1.6, 0)
    const cones = new THREE.InstancedMesh(coneGeo, new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.9 }), spots.length)
    const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: '#4a3528', roughness: 1 }), spots.length)
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const sc = new THREE.Vector3()
    const p = new THREE.Vector3()
    const c = new THREE.Color()
    spots.forEach((t, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng() * Math.PI * 2)
      sc.set(t.s, t.s * (0.85 + rng() * 0.4), t.s)
      p.set(t.x, heightAt(t.x, t.y) - 0.3, -t.y)
      m.compose(p, q, sc)
      cones.setMatrixAt(i, m)
      trunks.setMatrixAt(i, m)
      cones.setColorAt(i, c.setHSL(0.27 + rng() * 0.07, 0.35 + rng() * 0.15, 0.18 + rng() * 0.08))
    })
    const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#8d877d', flatShading: true }), 220)
    for (let i = 0; i < 220; i++) {
      const x = (rng() * 2 - 1) * 1300
      const y = (rng() * 2 - 1) * 1300
      const s = 0.8 + rng() * rng() * 6
      q.setFromEuler(new THREE.Euler(rng() * 3, rng() * 3, rng() * 3))
      m.compose(p.set(x, heightAt(x, y) + s * 0.2, -y), q, sc.set(s, s * 0.7, s))
      rocks.setMatrixAt(i, m)
    }
    const bushes = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ flatShading: true, roughness: 1 }), 1800)
    let nb = 0
    for (let i = 0; i < 6000 && nb < 1800; i++) {
      const x = (rng() * 2 - 1) * 900
      const y = (rng() * 2 - 1) * 900
      const hh = heightAt(x, y)
      if (hh < 3 || hh > 60 || Math.hypot(x, y) < 12) continue
      const s = 0.6 + rng() * 1.6
      m.compose(p.set(x, hh + s * 0.25, -y), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng() * 6), sc.set(s * 1.3, s * 0.8, s * 1.3))
      bushes.setMatrixAt(nb, m)
      bushes.setColorAt(nb, c.setHSL(0.22 + rng() * 0.08, 0.4, 0.2 + rng() * 0.1))
      nb++
    }
    bushes.count = nb
    // 開始地点の丘の草むら(足元の手前に奥行きを出す)
    const tufts = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.45, 0), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), 2600)
    for (let i = 0; i < 2600; i++) {
      const a = rng() * Math.PI * 2
      const d = 6 + Math.sqrt(rng()) * 190
      const x = Math.cos(a) * d
      const y = Math.sin(a) * d
      const k = 0.5 + rng() * 0.9
      q.setFromEuler(new THREE.Euler((rng() - 0.5) * 0.6, rng() * 6, (rng() - 0.5) * 0.6))
      m.compose(p.set(x, heightAt(x, y), -y), q, sc.set(k * 1.3, k * (0.4 + rng() * 0.4), k * 1.3))
      tufts.setMatrixAt(i, m)
      tufts.setColorAt(i, c.setHSL(0.2 + rng() * 0.08, 0.42, 0.22 + rng() * 0.1))
    }
    for (const im of [cones, trunks, rocks, bushes]) {
      im.castShadow = true
      im.receiveShadow = im !== cones
    }
    return [cones, trunks, rocks, bushes, tufts]
  }, [])
  useEffect(
    () => () =>
      meshes.forEach((im) => {
        im.geometry.dispose()
        ;(im.material as THREE.Material).dispose()
        im.dispose()
      }),
    [meshes],
  )
  return (
    <>
      {meshes.map((im, i) => (
        <primitive key={i} object={im} />
      ))}
    </>
  )
}

const GLOW = (r: number, g: number, b: number) => new THREE.Color(r, g, b)

function Lighthouse({ reduced }: { reduced: boolean }) {
  const beam = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (beam.current && !reduced) beam.current.rotation.y += dt * 0.8
  })
  return (
    <group position={ground(60, 900)}>
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[5, 6, 3, 10]} />
        <meshStandardMaterial color="#8d8a84" flatShading />
      </mesh>
      <mesh position={[0, 14, 0]}>
        <cylinderGeometry args={[2.3, 3.4, 22, 16]} />
        <meshStandardMaterial color="#f1ede4" roughness={0.6} />
      </mesh>
      <mesh position={[0, 8, 0]}>
        <cylinderGeometry args={[2.92, 3.08, 3.4, 16]} />
        <meshStandardMaterial color="#b4322c" />
      </mesh>
      <mesh position={[0, 17, 0]}>
        <cylinderGeometry args={[2.6, 2.75, 3.4, 16]} />
        <meshStandardMaterial color="#b4322c" />
      </mesh>
      <mesh position={[0, 25.2, 0]}>
        <cylinderGeometry args={[3.4, 3.4, 0.6, 16]} />
        <meshStandardMaterial color="#2c2f36" />
      </mesh>
      <mesh position={[0, 27, 0]}>
        <cylinderGeometry args={[1.6, 1.6, 3, 12]} />
        <meshBasicMaterial color={GLOW(9, 6.5, 3)} />
      </mesh>
      <mesh position={[0, 29.7, 0]}>
        <coneGeometry args={[2.3, 2.6, 12]} />
        <meshStandardMaterial color="#7a1f1c" />
      </mesh>
      <group ref={beam} position={[0, 27, 0]}>
        {[0, Math.PI].map((r) => (
          <group key={r} rotation-y={r}>
            <mesh position={[45, 0, 0]} rotation-z={Math.PI / 2}>
              <coneGeometry args={[9, 90, 20, 1, true]} />
              <meshBasicMaterial color="#ffe2a0" transparent opacity={0.09} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} fog={false} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}

function WatchTower() {
  return (
    <group position={ground(520, 80)}>
      {[
        [-2.2, -2.2],
        [2.2, -2.2],
        [-2.2, 2.2],
        [2.2, 2.2],
      ].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 6, z]} rotation={[z * 0.02, 0, -x * 0.02]}>
          <boxGeometry args={[0.6, 12.5, 0.6]} />
          <meshStandardMaterial color="#5a4332" />
        </mesh>
      ))}
      <mesh position={[0, 12.3, 0]}>
        <boxGeometry args={[6.4, 0.6, 6.4]} />
        <meshStandardMaterial color="#6b5040" />
      </mesh>
      <mesh position={[0, 13.4, 0]}>
        <boxGeometry args={[6.2, 1.6, 6.2]} />
        <meshStandardMaterial color="#5d4636" />
      </mesh>
      <mesh position={[0, 16.4, 0]} rotation-y={Math.PI / 4}>
        <coneGeometry args={[5, 3.4, 4]} />
        <meshStandardMaterial color="#3d3a3f" flatShading />
      </mesh>
      <mesh position={[0, 14.6, 0]}>
        <sphereGeometry args={[0.5, 8, 6]} />
        <meshBasicMaterial color={GLOW(8, 3.6, 1.2)} />
      </mesh>
    </group>
  )
}

function Village() {
  const houses = useMemo(() => {
    const rng = mulberry32(5)
    return [
      [0, 0],
      [16, 8],
      [-14, 12],
      [6, -18],
      [-20, -10],
      [24, -12],
      [-4, 24],
    ].map(([dx, dy]) => ({ x: -340 + dx, y: -160 + dy, rot: rng() * Math.PI, w: 6 + rng() * 3 }))
  }, [])
  return (
    <>
      {houses.map((h, i) => (
        <group key={i} position={ground(h.x, h.y, -0.4)} rotation-y={h.rot}>
          <mesh position={[0, 2.3, 0]}>
            <boxGeometry args={[h.w, 4.6, 5.6]} />
            <meshStandardMaterial color="#d6c2a2" flatShading />
          </mesh>
          <mesh position={[0, 6.1, 0]} rotation-y={Math.PI / 4} scale={[h.w / 5.6, 1, 1]}>
            <coneGeometry args={[4.6, 3, 4]} />
            <meshStandardMaterial color="#8d4b3a" flatShading />
          </mesh>
          <mesh position={[h.w * 0.2, 2.2, 2.82]}>
            <boxGeometry args={[1, 1.1, 0.1]} />
            <meshBasicMaterial color={GLOW(5, 3.2, 1.3)} />
          </mesh>
        </group>
      ))}
    </>
  )
}

function Camp({ reduced }: { reduced: boolean }) {
  const fire = useRef<THREE.Mesh>(null)
  useFrame((s) => {
    if (fire.current && !reduced) fire.current.scale.y = 1 + Math.sin(s.clock.elapsedTime * 13) * 0.18 + Math.sin(s.clock.elapsedTime * 7.3) * 0.12
  })
  return (
    <group position={ground(-560, 260)}>
      {[
        [0, 0],
        [8, 3],
        [-6, 6],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 2, z]} rotation-y={i}>
          <coneGeometry args={[3, 4, 4]} />
          <meshStandardMaterial color="#c9b48e" flatShading />
        </mesh>
      ))}
      <mesh ref={fire} position={[2, 0.8, 6]}>
        <coneGeometry args={[0.7, 1.8, 6]} />
        <meshBasicMaterial color={GLOW(10, 4, 1)} />
      </mesh>
    </group>
  )
}

function MerchantCart() {
  return (
    <group position={ground(170, 240)} rotation-y={0.6}>
      <mesh position={[0, 1.6, 0]}>
        <boxGeometry args={[3.4, 1.2, 2.2]} />
        <meshStandardMaterial color="#7b5537" />
      </mesh>
      <mesh position={[0, 3.1, 0]}>
        <cylinderGeometry args={[1.25, 1.25, 3.4, 10, 1, true, 0, Math.PI]} />
        <meshStandardMaterial color="#e8dcc4" side={THREE.DoubleSide} />
      </mesh>
      {[-1.15, 1.15].map((z) => (
        <mesh key={z} position={[0, 0.9, z]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.9, 0.9, 0.2, 10]} />
          <meshStandardMaterial color="#4a3426" />
        </mesh>
      ))}
      <mesh position={[1.9, 3.2, 0]}>
        <sphereGeometry args={[0.3, 8, 6]} />
        <meshBasicMaterial color={GLOW(8, 5, 2)} />
      </mesh>
    </group>
  )
}

function Bridge() {
  return (
    <group position={[-230, 3.2, -400]} rotation-y={0.2}>
      <mesh>
        <boxGeometry args={[7, 1.4, 64]} />
        <meshStandardMaterial color="#9a9184" flatShading />
      </mesh>
      {[-3.2, 3.2].map((x) => (
        <mesh key={x} position={[x, 1.1, 0]}>
          <boxGeometry args={[0.6, 1, 64]} />
          <meshStandardMaterial color="#857d71" />
        </mesh>
      ))}
      {[-14, 0, 14].map((z) => (
        <mesh key={z} position={[0, -3.5, z]}>
          <boxGeometry args={[6, 6, 3]} />
          <meshStandardMaterial color="#7e776c" flatShading />
        </mesh>
      ))}
    </group>
  )
}

const BEAM_VS = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vW;
  void main() {
    vUv = uv;
    vN = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vW = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`
const BEAM_FS = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vW;
  void main() {
    float f = abs(dot(normalize(vN), normalize(cameraPosition - vW)));
    float a = pow(1.0 - vUv.y, 1.4) * pow(f, 1.6);
    a *= 0.75 + 0.25 * sin(uTime * 2.4 - vUv.y * 60.0);
    gl_FragColor = vec4(uColor * 2.6, a * 0.85);
  }
`

/** 現在の目的地に立つ光の柱 */
function Beacon({ step, reduced }: { step: number; reduced: boolean }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: BEAM_VS,
        fragmentShader: BEAM_FS,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color('#ffc65a') } },
      }),
    [],
  )
  const ring = useRef<THREE.Mesh>(null)
  useEffect(() => () => mat.dispose(), [mat])
  useFrame((s, dt) => {
    if (!reduced) mat.uniforms.uTime.value += dt
    if (ring.current) {
      const k = reduced ? 0.5 : (s.clock.elapsedTime * 0.6) % 1
      ring.current.scale.setScalar(1 + k * 3)
      ;(ring.current.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - k)
    }
  })
  const o = OBJECTIVES[step]
  if (!o) return null
  return (
    <group position={ground(o.x, o.y)}>
      <mesh position-y={260} material={mat}>
        <cylinderGeometry args={[3.2, 3.2, 520, 24, 1, true]} />
      </mesh>
      <mesh position-y={260} material={mat} scale={[0.25, 1, 0.25]}>
        <cylinderGeometry args={[3.2, 3.2, 520, 12, 1, true]} />
      </mesh>
      <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={0.6}>
        <ringGeometry args={[3.5, 4.2, 40]} />
        <meshBasicMaterial color={GLOW(4, 2.8, 1)} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

function Clouds() {
  const sprites = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 256
    c.height = 128
    const g = c.getContext('2d')
    const rng = mulberry32(3)
    if (g)
      for (let i = 0; i < 30; i++) {
        const x = 40 + rng() * 176
        const y = 52 + rng() * 34
        const r = 16 + rng() * 34
        const gr = g.createRadialGradient(x, y, 0, x, y, r)
        gr.addColorStop(0, 'rgba(255,255,255,0.5)')
        gr.addColorStop(1, 'rgba(255,255,255,0)')
        g.fillStyle = gr
        g.fillRect(0, 0, 256, 128)
      }
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    return Array.from({ length: 12 }, (_, i) => {
      const mat = new THREE.SpriteMaterial({ map: tex, color: i % 3 ? '#fff1e0' : '#ffd9c0', transparent: true, depthWrite: false, fog: false, opacity: 0.85 })
      const s = new THREE.Sprite(mat)
      const a = (i / 12) * Math.PI * 2 + rng() * 0.4
      const d = 1700 + rng() * 1200
      s.position.set(Math.sin(a) * d, 240 + rng() * 260, -Math.cos(a) * d)
      s.scale.set(900 + rng() * 700, 260 + rng() * 140, 1)
      return s
    })
  }, [])
  useEffect(
    () => () => {
      sprites[0]?.material.map?.dispose()
      sprites.forEach((s) => s.material.dispose())
    },
    [sprites],
  )
  return (
    <>
      {sprites.map((s, i) => (
        <primitive key={i} object={s} />
      ))}
    </>
  )
}

/** 向き(MotionValue)と位置(ref)からカメラを毎フレーム動かす(React の再描画なし) */
function CameraRig({ heading, posRef, inputRef, reduced }: { heading: MotionValue<number>; posRef: RefObject<{ x: number; y: number }>; inputRef: RefObject<{ turn: number; walk: boolean }>; reduced: boolean }) {
  const bob = useRef(0)
  const camY = useRef<number | null>(null)
  useFrame((state, dt) => {
    const cam = state.camera as THREE.PerspectiveCamera
    const { x, y } = posRef.current
    const walking = inputRef.current.walk
    if (walking && !reduced) bob.current += dt * 8.5
    const groundY = Math.max(heightAt(x, y), 0) + 2.6
    camY.current = camY.current === null ? groundY : lerp(camY.current, groundY, Math.min(1, dt * 6))
    cam.position.set(x, camY.current + (walking && !reduced ? Math.abs(Math.sin(bob.current)) * 0.25 : 0), -y)
    cam.rotation.set(-0.06 + (walking && !reduced ? Math.sin(bob.current * 2) * 0.004 : 0), (-heading.get() * Math.PI) / 180, 0, 'YXZ')
    const fov = walking && !reduced ? VFOV + 5 : VFOV
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = lerp(cam.fov, fov, Math.min(1, dt * 4))
      cam.updateProjectionMatrix()
    }
  })
  return null
}

/** 夕日の平行光源。影のカメラをプレイヤーの周囲 ±170 m に追従させる */
const SKY_VS = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const SKY_FS = /* glsl */ `
  uniform vec3 uSun;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    float y = d.y;
    float s = max(dot(d, uSun), 0.0);
    vec3 horizon = mix(vec3(0.92, 0.5, 0.34), vec3(1.3, 0.58, 0.26), pow(s, 3.0));
    vec3 mid = vec3(0.4, 0.38, 0.6);
    vec3 zenith = vec3(0.06, 0.11, 0.3);
    vec3 col = mix(horizon, mid, smoothstep(0.0, 0.14, y));
    col = mix(col, zenith, smoothstep(0.1, 0.5, y));
    col = mix(col, vec3(0.7, 0.55, 0.48), smoothstep(0.0, -0.25, y));
    col += vec3(1.0, 0.55, 0.25) * pow(s, 6.0) * 0.55;
    col += vec3(1.0, 0.72, 0.42) * pow(s, 90.0) * 1.6;
    col += vec3(1.0, 0.9, 0.72) * smoothstep(0.99935, 0.9997, s) * 9.0;
    gl_FragColor = vec4(col, 1.0);
  }
`

/** 夕暮れの空(カメラに追従する球) */
function SkyDome() {
  const ref = useRef<THREE.Mesh>(null)
  const mat = useMemo(
    () => new THREE.ShaderMaterial({ vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uSun: { value: SUN_DIR } } }),
    [],
  )
  useEffect(() => () => mat.dispose(), [mat])
  useFrame((state) => ref.current?.position.copy(state.camera.position))
  return (
    <mesh ref={ref} material={mat} renderOrder={-1}>
      <sphereGeometry args={[4000, 32, 16]} />
    </mesh>
  )
}

function SunLight() {
  const light = useRef<THREE.DirectionalLight>(null)
  useFrame((state) => {
    const l = light.current
    if (!l) return
    const c = state.camera.position
    l.position.set(c.x + SUN_DIR.x * 400, c.y + SUN_DIR.y * 400 + 60, c.z + SUN_DIR.z * 400)
    l.target.position.set(c.x, c.y - 20, c.z)
    l.target.updateMatrixWorld()
  })
  return (
    <directionalLight
      ref={light}
      intensity={3.4}
      color="#ffc98f"
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-bias={-0.0004}
      shadow-normalBias={0.6}
      shadow-camera-left={-170}
      shadow-camera-right={170}
      shadow-camera-top={170}
      shadow-camera-bottom={-170}
      shadow-camera-near={1}
      shadow-camera-far={900}
    />
  )
}

function World(props: { heading: MotionValue<number>; posRef: RefObject<{ x: number; y: number }>; inputRef: RefObject<{ turn: number; walk: boolean }>; step: number; reduced: boolean }) {
  return (
    <>
      <fogExp2 attach="fog" args={[FOG, 0.0009]} />
      <SkyDome />
      <hemisphereLight args={['#b9c9e6', '#4a5236', 0.75]} />
      <SunLight />
      <Terrain />
      <Water reduced={props.reduced} />
      <Forest />
      <Lighthouse reduced={props.reduced} />
      <WatchTower />
      <Village />
      <Camp reduced={props.reduced} />
      <MerchantCart />
      <Bridge />
      <Clouds />
      <Beacon step={props.step} reduced={props.reduced} />
      <CameraRig heading={props.heading} posRef={props.posRef} inputRef={props.inputRef} reduced={props.reduced} />
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur intensity={0.75} luminanceThreshold={1} luminanceSmoothing={0.25} radius={0.7} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <Vignette offset={0.32} darkness={0.55} />
      </EffectComposer>
    </>
  )
}

/* ───────────────────────── ミニマップの地形(ワールド座標・北が +y) ───────────────────────── */

function MapTerrain() {
  return (
    <g>
      <rect x="-2000" y="-2000" width="4000" height="4000" fill="#2c3d33" />
      <circle cx="-160" cy="140" r="90" fill="#24382b" />
      <circle cx="-60" cy="110" r="50" fill="#24382b" />
      <circle cx="360" cy="-260" r="130" fill="#24382b" />
      <circle cx="-430" cy="-40" r="70" fill="#24382b" />
      <ellipse cx="260" cy="-640" rx="160" ry="90" fill="#4a544f" />
      <ellipse cx="260" cy="-640" rx="70" ry="38" fill="#7d8580" />
      <path d="M-2000 760 Q-800 700 -500 780 T0 790 T500 760 T2000 800 V2000 H-2000 Z" fill="#335f78" />
      <path d="M-70 760 Q-10 980 70 965 Q160 940 150 770 Z" fill="#2c3d33" />
      <path d="M-2000 400 C-800 300 -500 470 -230 400 S200 330 500 420 S900 380 2000 450" fill="none" stroke="#3f7593" strokeWidth="26" />
      <rect x="-246" y="366" width="32" height="66" fill="#bfa77a" transform="rotate(-12 -230 400)" />
      <g fill="none" stroke="#e7dcc0" strokeOpacity="0.55" strokeWidth="6" strokeDasharray="14 10" strokeLinecap="round">
        <path d="M-340 -160 L-150 -60 L0 0 L170 240 L-120 380 L-230 400 L-230 540 L-20 700 L60 900" />
        <path d="M0 0 L260 40 L520 80" />
        <path d="M-150 -60 L-560 260" />
      </g>
    </g>
  )
}

/* ───────────────────────── 本体 ───────────────────────── */

type Notice = { id: number; title: string; text: string; gold?: boolean }

export function OpenWorldHud() {
  const reduced = useReducedMotion() ?? false
  const heading = useMotionValue(8)
  const posRef = useRef({ x: 0, y: 0 })
  const [dims, setDims] = useState({ w: 0, h: 0, c: 0 })
  const sizeRef = useRef(dims)
  const [step, stepRef, setStep] = useSynced(0)
  const [done, setDone] = useState(0)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [walking, setWalking] = useState(false)
  const [dragging, setDragging] = useState(false)

  const rootRef = useRef<HTMLDivElement>(null)
  const compassRef = useRef<HTMLDivElement>(null)
  const stripRef = useRef<HTMLDivElement>(null)
  const headingEl = useRef<HTMLSpanElement>(null)
  const mapGroup = useRef<SVGGElement>(null)
  const northEl = useRef<SVGGElement>(null)
  const trackerDist = useRef<HTMLSpanElement>(null)
  const compassEls = useRef<Record<string, HTMLDivElement | null>>({})
  const distEls = useRef<Record<string, HTMLSpanElement | null>>({})
  const mapEls = useRef<Record<string, SVGGElement | null>>({})

  const input = useRef({ turn: 0, walk: false })
  const loopRaf = useRef(0)
  const drag = useRef<{ id: number; x: number } | null>(null)
  const completing = useRef(false)
  const timers = useRef(new Set<number>())
  const noticeTimer = useRef(0)
  const uid = useRef(0)

  /** 向き・位置から HUD と風景の DOM を直接更新する */
  const apply = useCallback(() => {
    const { w, c } = sizeRef.current
    if (!w || !c) return
    const h = heading.get()
    const hn = mod(h, 360)
    const ppd = c / 180
    const { x: px, y: py } = posRef.current
    const s = stepRef.current
    const rad = (h * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)

    if (stripRef.current) stripRef.current.style.transform = `translate3d(${c / 2 - (hn + 180) * ppd}px,0,0)`
    if (headingEl.current) headingEl.current.textContent = `${String(Math.round(hn) % 360).padStart(3, '0')}° ${CARDINALS[Math.round(hn / 45) % 8]}`

    for (const p of POINTS) {
      const active = p.kind === 'landmark' || p.index === s
      const dx = p.x - px
      const dy = p.y - py
      const dist = Math.hypot(dx, dy)
      const diff = wrap180((Math.atan2(dx, dy) * 180) / Math.PI - hn)

      const ce = compassEls.current[p.id]
      if (ce) {
        let x = diff
        let op = 1
        if (p.kind === 'objective') {
          x = clamp(diff, -82, 82)
          op = active ? 1 : 0
        } else {
          const a = Math.abs(diff)
          op = a > 82 ? 0 : a > 66 ? (82 - a) / 16 : 0.9
        }
        ce.style.transform = `translate3d(${c / 2 + x * ppd}px,0,0)`
        ce.style.opacity = String(op)
      }
      const de = distEls.current[p.id]
      if (de) de.textContent = fmtDist(dist)

      const me = mapEls.current[p.id]
      if (me) {
        let X = MAP_S * (dx * cos - dy * sin)
        let Y = MAP_S * (-dx * sin - dy * cos)
        const r = Math.hypot(X, Y)
        let op = active ? 1 : 0
        if (p.kind === 'objective' && r > 84) {
          X *= 84 / r
          Y *= 84 / r
        } else if (p.kind === 'landmark' && r > 90) op = 0
        me.setAttribute('transform', `translate(${X.toFixed(2)} ${Y.toFixed(2)})`)
        me.style.opacity = String(op)
      }
      if (p.index === s && trackerDist.current) trackerDist.current.textContent = fmtDist(dist)
    }

    mapGroup.current?.setAttribute('transform', `rotate(${(-h).toFixed(2)}) scale(${MAP_S}) translate(${(-px).toFixed(1)} ${py.toFixed(1)})`)
    northEl.current?.setAttribute('transform', `translate(${(-89 * sin).toFixed(2)} ${(-89 * cos).toFixed(2)})`)
  }, [heading, stepRef])

  useEffect(() => heading.on('change', apply), [heading, apply])
  // React の再描画(目標の切り替えなど)で差し替わった要素にも位置を反映
  useLayoutEffect(() => apply())

  // サイズ計測(コンパス幅で目盛りを並べ直し、ルート幅をドラッグ量の換算に使う)
  useLayoutEffect(() => {
    const root = rootRef.current
    const compass = compassRef.current
    if (!root || !compass) return
    const measure = () => {
      const next = { w: root.clientWidth, h: root.clientHeight, c: compass.clientWidth }
      sizeRef.current = next
      setDims((d) => (d.w === next.w && d.h === next.h && d.c === next.c ? d : next))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(root)
    ro.observe(compass)
    return () => ro.disconnect()
  }, [])

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.current.delete(id)
      fn()
    }, ms)
    timers.current.add(id)
    return id
  }, [])

  const showNotice = useCallback(
    (n: Omit<Notice, 'id'>) => {
      setNotice({ ...n, id: ++uid.current })
      window.clearTimeout(noticeTimer.current)
      timers.current.delete(noticeTimer.current)
      noticeTimer.current = later(() => setNotice(null), 3600)
    },
    [later],
  )

  useEffect(() => {
    later(() => showNotice({ title: '新しい目標', text: OBJECTIVES[0].text }), 700)
    const t = timers.current
    return () => {
      t.forEach((id) => window.clearTimeout(id))
      t.clear()
      cancelAnimationFrame(loopRaf.current)
      loopRaf.current = 0
    }
  }, [later, showNotice])

  const complete = () => {
    const s = stepRef.current
    if (s >= OBJECTIVES.length || completing.current) return
    completing.current = true
    setDone(s + 1)
    later(() => {
      completing.current = false
      setStep(s + 1)
      if (s + 1 < OBJECTIVES.length) showNotice({ title: '新しい目標', text: OBJECTIVES[s + 1].text })
      else showNotice({ title: 'クエスト達成', text: QUEST, gold: true })
    }, 1000)
  }
  const latest = useRef(complete)
  useLayoutEffect(() => {
    latest.current = complete
  })

  /* 旋回・前進のループ(入力がある間だけ rAF を回す) */
  const move = useCallback(
    (m: number) => {
      const r = (heading.get() * Math.PI) / 180
      posRef.current = { x: posRef.current.x + Math.sin(r) * m, y: posRef.current.y + Math.cos(r) * m }
      apply()
      const o = OBJECTIVES[stepRef.current]
      if (o && Math.hypot(o.x - posRef.current.x, o.y - posRef.current.y) < ARRIVE) latest.current()
    },
    [apply, heading, stepRef],
  )
  const run = useCallback(() => {
    if (loopRaf.current) return
    let prev = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000)
      prev = now
      const { turn, walk } = input.current
      if (turn) heading.set(heading.get() + turn * 95 * dt)
      if (walk) move(SPEED * dt)
      loopRaf.current = turn || walk ? requestAnimationFrame(tick) : 0
    }
    loopRaf.current = requestAnimationFrame(tick)
  }, [heading, move])

  const setWalk = (on: boolean) => {
    input.current.walk = on
    setWalking(on)
    if (on) run()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      heading.stop()
      input.current.turn = e.key === 'ArrowLeft' ? -1 : 1
      run()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!input.current.walk) setWalk(true)
    } else if (e.key === 'ArrowDown') e.preventDefault()
  }
  const onKeyUp = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.key === 'ArrowLeft' && input.current.turn === -1) || (e.key === 'ArrowRight' && input.current.turn === 1)) input.current.turn = 0
    if (e.key === 'ArrowUp') setWalk(false)
  }
  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    // デモ内のボタンへフォーカスが移っただけなら入力を維持する
    if (e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)) return
    input.current.turn = 0
    if (input.current.walk) setWalk(false)
  }

  /* ドラッグ: 指でつかんだ風景がそのまま付いてくる量だけ向きを変える */
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    drag.current = { id: e.pointerId, x: e.clientX }
    e.currentTarget.setPointerCapture(e.pointerId)
    heading.stop()
    setDragging(true)
    rootRef.current?.focus({ preventScroll: true })
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId || !sizeRef.current.w) return
    const dx = e.clientX - d.x
    d.x = e.clientX
    // つかんだ地点が指に付いてくるよう、水平視野角 / 幅 で角度に換算する
    const { w, h } = sizeRef.current
    const hfov = (2 * Math.atan(Math.tan((VFOV * Math.PI) / 360) * (w / Math.max(1, h))) * 180) / Math.PI
    heading.set(heading.get() - (dx * hfov) / w)
  }
  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== e.pointerId) return
    drag.current = null
    setDragging(false)
  }

  const reset = () => {
    timers.current.forEach((id) => window.clearTimeout(id))
    timers.current.clear()
    completing.current = false
    posRef.current = { x: 0, y: 0 }
    const target = Math.round(heading.get() / 360) * 360 + 8
    if (reduced) heading.set(target)
    else animate(heading, target, { type: 'spring', stiffness: 120, damping: 20 })
    setStep(0)
    setDone(0)
    apply()
    later(() => showNotice({ title: '新しい目標', text: OBJECTIVES[0].text }), 400)
  }

  const finished = step >= OBJECTIVES.length
  const ticks = []
  if (dims.c) {
    const ppd = dims.c / 180
    for (let d = -180; d <= 540; d += 5) {
      const n = mod(d, 360)
      const x = (d + 180) * ppd
      const major = n % 15 === 0
      ticks.push(<span key={`t${d}`} className="absolute bottom-0 w-px bg-white" style={{ left: x, height: major ? 7 : 4, opacity: major ? 0.85 : 0.4 }} />)
      if (n % 45 === 0)
        ticks.push(
          <span
            key={`l${d}`}
            className={`absolute top-0 -translate-x-1/2 text-[11px] leading-none font-bold ${n === 0 ? 'text-[#ffd98a]' : 'text-white'}`}
            style={{ left: x }}
          >
            {CARDINALS[n / 45]}
          </span>,
        )
      else if (major)
        ticks.push(
          <span key={`n${d}`} className="absolute top-0.5 -translate-x-1/2 font-['JetBrains_Mono'] text-[8px] leading-none text-white/55" style={{ left: x }}>
            {n}
          </span>,
        )
    }
  }

  return (
    <div
      ref={rootRef}
      className="@container relative h-full w-full overflow-hidden bg-[#7f9cbf] text-white outline-none select-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-inset"
      tabIndex={0}
      role="group"
      aria-label="オープンワールドの HUD デモ。左右の矢印キーかドラッグで向きを変え、上矢印キーで前進"
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onBlur={onBlur}
    >
      {/* ── 風景(ドラッグで旋回) ── */}
      <div
        className={`absolute inset-0 touch-pan-y ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <Canvas
          dpr={[1, 1.75]}
          camera={{ fov: VFOV, near: 0.5, far: 6000, position: [0, 10, 0] }}
          shadows
          gl={{ antialias: false, powerPreference: 'high-performance' }}
          aria-hidden="true"
        >
          <World heading={heading} posRef={posRef} inputRef={input} step={step} reduced={reduced} />
        </Canvas>
      </div>

      {/* ── コンパス ── */}
      <div className="pointer-events-none absolute top-2 left-1/2 z-10 w-[calc(100%-1.5rem)] max-w-[560px] -translate-x-1/2 @min-[52rem]:top-3 @min-[52rem]:w-[44%]">
        <div className="absolute top-0 left-1/2 z-10 -translate-x-1/2 border-x-[5px] border-t-[6px] border-x-transparent border-t-[#ffd98a]" />
        <div ref={compassRef} className="relative h-12 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
          <div className="absolute inset-x-0 top-0 h-6 border-b border-white/40 bg-gradient-to-b from-[#0b141c]/45 to-[#0b141c]/15" />
          <div ref={stripRef} className="absolute top-1 left-0 h-5 will-change-transform [text-shadow:0_1px_2px_#0008]">
            {ticks}
          </div>
          {POINTS.map((p) => {
            const Icon = p.icon
            return (
              <div key={p.id} ref={(el) => void (compassEls.current[p.id] = el)} className="group absolute top-[23px] left-0 opacity-0 will-change-transform">
                <div className="flex -translate-x-1/2 flex-col items-center leading-none [text-shadow:0_1px_3px_#000a]">
                  {p.kind === 'objective' ? (
                    <span className="size-2.5 rotate-45 border border-white bg-[#ffc94d] shadow-[0_0_8px_#ffc94d]" />
                  ) : (
                    Icon && <Icon size={11} strokeWidth={2.2} className="text-white drop-shadow-[0_1px_2px_#000a]" aria-hidden="true" />
                  )}
                  <span
                    ref={(el) => void (distEls.current[p.id] = el)}
                    className={`mt-[3px] font-['JetBrains_Mono'] text-[9px] tabular-nums ${p.kind === 'objective' ? 'font-bold text-[#ffe3a0]' : 'text-white/80'}`}
                  />
                </div>
              </div>
            )
          })}
        </div>
        <div className="mx-auto -mt-0.5 w-fit rounded-sm bg-[#0b141c]/40 px-1.5 py-px font-['JetBrains_Mono'] text-[9px] tracking-wider text-white/85">
          <span ref={headingEl} />
        </div>
      </div>

      {/* ── クエスト追跡 ── */}
      <section
        className="absolute top-[86px] right-2 z-10 w-[min(15rem,56%)] bg-[linear-gradient(270deg,#0b141c88,#0b141c44_70%,transparent)] py-2 pr-2 pl-4 [text-shadow:0_1px_3px_#0009] @min-[52rem]:top-3 @min-[52rem]:right-3 @min-[52rem]:w-52"
        aria-label="クエスト"
      >
        <div className="flex items-center gap-1.5 text-[9px] font-bold tracking-[0.25em] text-[#ffd98a]">
          <Diamond size={9} fill="currentColor" aria-hidden="true" />
          メインクエスト
        </div>
        <h2 className="mt-0.5 text-[15px] leading-tight font-bold">{QUEST}</h2>
        <div className="my-1.5 h-px bg-gradient-to-r from-white/70 to-transparent" />
        <ul className="space-y-1.5" aria-live="polite">
          <AnimatePresence initial={false}>
            {OBJECTIVES.slice(0, Math.min(step + 1, OBJECTIVES.length)).map((o, i) => {
              const checked = i < done
              return (
                <motion.li
                  key={o.id}
                  layout={!reduced}
                  initial={{ opacity: 0, x: reduced ? 0 : 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.45 }}
                  className={`flex items-start gap-2 text-[11.5px] leading-snug @min-[44rem]:text-[12px] ${checked && i < step ? '@max-[30rem]:hidden' : ''}`}
                >
                  <span className={`mt-[2px] grid size-3.5 shrink-0 place-items-center border transition-colors ${checked ? 'border-[#ffd98a] bg-[#ffd98a]/20' : 'border-white/80'}`}>
                    {checked && (
                      <svg viewBox="0 0 14 14" className="size-3" aria-hidden="true">
                        <motion.path
                          d="M2.5 7.5 L5.8 10.5 L11.5 3.5"
                          fill="none"
                          stroke="#ffd98a"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          initial={{ pathLength: reduced ? 1 : 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.35 }}
                        />
                      </svg>
                    )}
                  </span>
                  <span className={`min-w-0 transition-colors duration-500 ${checked ? 'text-white/55 line-through decoration-white/50' : 'text-white'}`}>
                    {o.text}
                    {!checked && i === step && (
                      <span ref={trackerDist} className="ml-1.5 inline-block font-['JetBrains_Mono'] text-[9.5px] text-[#ffe3a0] tabular-nums" />
                    )}
                  </span>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
        {finished && (
          <motion.button
            type="button"
            onClick={reset}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 inline-flex items-center gap-1 rounded-full border border-[#ffd98a]/70 px-2.5 py-0.5 text-[10.5px] font-semibold text-[#ffe3a0] hover:bg-[#ffd98a]/15 focus-visible:outline-2 focus-visible:outline-white"
          >
            <RotateCcw size={11} aria-hidden="true" /> もう一度
          </motion.button>
        )}
      </section>

      {/* ── 新しい目標の通知 ── */}
      <AnimatePresence>
        {notice && (
          <motion.div
            key={notice.id}
            role="status"
            className="pointer-events-none absolute inset-x-0 top-[47%] z-20 flex flex-col items-center px-4 text-center [text-shadow:0_1px_6px_#000a] @min-[52rem]:inset-x-auto @min-[52rem]:top-[88px] @min-[52rem]:left-1/2 @min-[52rem]:w-[44%] @min-[52rem]:-translate-x-1/2"
            initial={{ opacity: 0, y: reduced ? 0 : -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduced ? 0 : -6, transition: { duration: 0.8 } }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <div className={`flex items-center gap-2 text-[10px] font-bold tracking-[0.35em] ${notice.gold ? 'text-[#ffe08a]' : 'text-[#ffd98a]'}`}>
              <motion.span
                className="h-px w-8 bg-gradient-to-r from-transparent to-current @min-[40rem]:w-14"
                style={{ originX: 1 }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, delay: 0.15 }}
              />
              {notice.title}
              <motion.span
                className="h-px w-8 bg-gradient-to-l from-transparent to-current @min-[40rem]:w-14"
                style={{ originX: 0 }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, delay: 0.15 }}
              />
            </div>
            <div
              className={`mt-1 bg-[radial-gradient(ellipse_at_center,#0b141c99,transparent_72%)] px-8 py-1.5 font-bold ${notice.gold ? 'text-[clamp(18px,4cqw,28px)] tracking-[0.2em]' : 'text-[clamp(14px,2.6cqw,19px)]'}`}
            >
              {notice.text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ミニマップ ── */}
      <div className="absolute right-3 bottom-[calc(var(--solo-footer-clearance,0px)+0.75rem)] z-10 size-28 @min-[44rem]:right-5 @min-[44rem]:size-40" role="img" aria-label="向きに合わせて回転するミニマップ">
        <svg viewBox="-100 -100 200 200" className="size-full overflow-visible drop-shadow-[0_4px_12px_#0007]">
          <defs>
            <clipPath id="ow-clip">
              <circle r="96" />
            </clipPath>
            <radialGradient id="ow-cone" cx="0.5" cy="1" r="1">
              <stop offset="0" stopColor="#fff" stopOpacity="0.32" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle r="98" fill="#0f1915" />
          <g clipPath="url(#ow-clip)">
            <g ref={mapGroup}>
              <g transform="scale(1 -1)">
                <MapTerrain />
              </g>
            </g>
            <path d="M0 0 L-44 -96 L44 -96 Z" fill="url(#ow-cone)" />
            {POINTS.map((p) => (
              <g key={p.id} ref={(el) => void (mapEls.current[p.id] = el)} style={{ opacity: 0 }}>
                {p.kind === 'objective' ? (
                  <rect x="-5" y="-5" width="10" height="10" transform="rotate(45)" fill="#ffc94d" stroke="#fff" strokeWidth="1.5" />
                ) : (
                  <>
                    <circle r="5" fill="#0f1915" stroke="#fff" strokeOpacity="0.85" strokeWidth="1.2" />
                    <circle r="1.6" fill="#fff" />
                  </>
                )}
              </g>
            ))}
          </g>
          <circle r="97" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="1.5" />
          <circle r="92" fill="none" stroke="#fff" strokeOpacity="0.15" strokeWidth="0.8" strokeDasharray="2 6" />
          <g ref={northEl}>
            <circle r="8" fill="#0f1915" stroke="#ffd98a" strokeWidth="1.2" />
            <text y="3.2" textAnchor="middle" fontSize="9" fontWeight="700" fill="#ffd98a" fontFamily="Inter, sans-serif">
              N
            </text>
          </g>
          <path d="M0 -8 L6 6 L0 2.5 L-6 6 Z" fill="#fff" stroke="#0f1915" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </div>

      {/* ── 操作 ── */}
      <div className="absolute bottom-[calc(var(--solo-footer-clearance,0px)+0.75rem)] left-3 z-10 flex max-w-[calc(100%-9.5rem)] flex-col gap-1.5 @min-[44rem]:bottom-[calc(var(--solo-footer-clearance,0px)+1.25rem)] @min-[44rem]:left-5 @min-[44rem]:max-w-[calc(100%-14rem)]">
        <p className="text-[10px] leading-snug text-white/90 [text-shadow:0_1px_3px_#000c]">
          <kbd className="font-['JetBrains_Mono']">←→</kbd> / ドラッグで向きを変える ・ <kbd className="font-['JetBrains_Mono']">↑</kbd> 長押しで前進
        </p>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            aria-pressed={walking}
            onPointerDown={(e) => {
              if (e.pointerType === 'mouse' && e.button !== 0) return
              e.currentTarget.setPointerCapture(e.pointerId)
              setWalk(true)
            }}
            onPointerUp={() => setWalk(false)}
            onPointerCancel={() => setWalk(false)}
            onLostPointerCapture={() => input.current.walk && setWalk(false)}
            onClick={(e) => {
              if (e.detail === 0) move(40) // キーボードでの押下は 40 m 進む
            }}
            className="inline-flex touch-none items-center gap-1 rounded-full border border-white/50 bg-[#0b141c]/45 px-3 py-1 text-[11px] font-semibold backdrop-blur-sm hover:bg-[#0b141c]/65 focus-visible:outline-2 focus-visible:outline-white disabled:opacity-40 aria-pressed:border-[#ffd98a] aria-pressed:text-[#ffe3a0]"
          >
            <Footprints size={12} aria-hidden="true" /> 前進
          </button>
          <button
            type="button"
            onClick={() => latest.current()}
            disabled={finished}
            className="inline-flex items-center gap-1 rounded-full border border-[#ffd98a]/80 bg-[#0b141c]/45 px-3 py-1 text-[11px] font-semibold text-[#ffe3a0] backdrop-blur-sm hover:bg-[#0b141c]/65 focus-visible:outline-2 focus-visible:outline-white disabled:opacity-40"
          >
            <Diamond size={10} fill="currentColor" aria-hidden="true" /> 目標を達成
          </button>
          <button
            type="button"
            onClick={reset}
            aria-label="最初からやり直す"
            className="grid size-[26px] place-items-center rounded-full border border-white/40 bg-[#0b141c]/45 backdrop-blur-sm hover:bg-[#0b141c]/65 focus-visible:outline-2 focus-visible:outline-white"
          >
            <RotateCcw size={12} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}
