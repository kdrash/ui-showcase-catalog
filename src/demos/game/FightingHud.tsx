import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { RotateCcw } from 'lucide-react'
import { Canvas, useFrame } from '@react-three/fiber'
import { MeshReflectorMaterial } from '@react-three/drei'
import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react'

/**
 * 対戦格闘ゲーム風の HUD。
 * - 体力バーは黄色(現在値)が即座に減り、背後の赤い「ダメージ跡」が連続技の区切りを待ってから追いかける二層構造
 * - 中央に 99 秒タイマーとラウンド勝利マーク、下部に 3 段階の必殺ゲージ。攻撃側の画面端にコンボ数と累計ダメージが跳ねる
 * - 「ROUND 1」「FIGHT!」の帯テロップ、K.O. は巨大な文字を叩きつけ、3D カメラが揺れながら倒れた側へ寄る
 * - ステージは React Three Fiber。夕焼けのネオン屋上(反射する床 MeshReflectorMaterial、ネオングリッド、縞の太陽、窓が灯るビル群のシェーダー、ネオン看板)
 * - 2 人のキャラクターはオリジナルのシルエットを SVG 文字列 → canvas テクスチャにしてビルボード化。彩度の高い部分だけ HDR に持ち上げて Bloom で光らせる
 * - ヒットスパークは GPU パーティクル + 星形の閃光。強攻撃・必殺・K.O. ではカメラが踏み込み、色収差が走る
 * - DOM の HUD は時刻を ref に書くだけで 3D 側は useFrame で読む。ダメージ数値は 3D の頭上を射影した CSS 変数で配置
 * - 1P が攻撃を始めると CPU も反撃。J / K / L で攻撃、Enter で次のラウンド(キー操作はデモにフォーカスがあるときだけ)。動きを減らす設定では揺れ・突進・カメラの寄りを抑える
 */

const MAX_HP = 1000
const LEVEL = 100
const MAX_METER = LEVEL * 3
const ROUND_TIME = 99
const NAMES = ['ハヤテ', 'ガンドウ'] as const
const SUPER_NAMES = ['奥義・蒼雷閃', '覇道・紅蓮砕'] as const
const COLORS = [
  { main: '#3fe0ff', deep: '#0284c7', soft: '#a5f3fc' },
  { main: '#ff4f7b', deep: '#be123c', soft: '#fecdd3' },
] as const
const SILHOUETTE = '#0a0d1c'

type Side = 0 | 1
type Move = 'light' | 'heavy' | 'super'
type Phase = 'intro' | 'fight' | 'ko' | 'result'
type Pair = [number, number]
type Combo = { side: Side; hits: number; dmg: number; id: number }
type Popup = { id: number; side: Side; value: number; big: boolean }
type Result = { winner: Side | null; perfect: boolean; timeUp: boolean; match: boolean }

const DMG: Record<Exclude<Move, 'super'>, Pair> = { light: [38, 54], heavy: [88, 116] }
const rand = ([a, b]: Pair) => a + Math.floor(Math.random() * (b - a + 1))

const CSS = `
@keyframes fh-blink { 50% { opacity: .35 } }
@keyframes fh-sway { 0%,100% { transform: rotate(0deg) } 50% { transform: rotate(-10deg) } }
@keyframes fh-glow { 0%,100% { filter: brightness(1) } 50% { filter: brightness(1.45) } }
@keyframes fh-scan { from { transform: translateX(-100%) } to { transform: translateX(100%) } }
.fh-low { animation: fh-blink .45s steps(2) infinite }
.fh-tail { transform-box: fill-box; transform-origin: 100% 30%; animation: fh-sway 1.2s ease-in-out infinite }
.fh-sash { transform-box: fill-box; transform-origin: 100% 0%; animation: fh-sway 1.6s ease-in-out infinite }
.fh-full { animation: fh-glow 1.1s ease-in-out infinite }
.fh-sheen::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, #ffffff66, transparent); animation: fh-scan 1.6s linear infinite }
.fh-stroke { paint-order: stroke fill; -webkit-text-stroke: 0.06em #12051c }
@media (prefers-reduced-motion: reduce) { :root:not([data-motion=full]) .fh-low,:root:not([data-motion=full]) .fh-tail,:root:not([data-motion=full]) .fh-sash,:root:not([data-motion=full]) .fh-full,:root:not([data-motion=full]) .fh-sheen::after { animation: none } } :root[data-motion=reduce] .fh-low,:root[data-motion=reduce] .fh-tail,:root[data-motion=reduce] .fh-sash,:root[data-motion=reduce] .fh-full,:root[data-motion=reduce] .fh-sheen::after { animation: none }
`

/** ref と state を同時に更新する(タイマーや CPU から最新値を読むため) */
function useSynced<T>(initial: T) {
  const ref = useRef(initial)
  const [value, setValue] = useState(initial)
  const set = useCallback((next: T) => {
    ref.current = next
    setValue(next)
  }, [])
  return [value, ref, set] as const
}

/* ───────────────────────── キャラクター(オリジナルのシルエット) ───────────────────────── */

function Portrait({ side }: { side: Side }) {
  const c = COLORS[side].main
  return (
    <svg viewBox="0 0 40 40" className="size-full" aria-hidden="true">
      <rect width="40" height="40" fill={COLORS[side].deep} opacity={0.35} />
      {side === 0 ? (
        <g transform="translate(-2 2)">
          <path d="M12 12 L9 2 L16 7 L19 0 L23 7 L30 3 L29 13 Z" fill={SILHOUETTE} />
          <circle cx="21" cy="20" r="11" fill={SILHOUETTE} />
          <path d="M10 17 L32 14.5" stroke={c} strokeWidth="3.5" />
          <path d="M24 21 L30 20.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M8 40 Q21 28 36 40 Z" fill={SILHOUETTE} />
        </g>
      ) : (
        <g transform="translate(40 2) scale(-1 1)">
          <path d="M11 14 L4 0 L16 9 Z M28 9 L37 -2 L32 14 Z" fill={SILHOUETTE} />
          <circle cx="20" cy="20" r="12" fill={SILHOUETTE} />
          <path d="M21 19.5 L31 18.5" stroke={c} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M2 40 Q20 26 40 40 Z" fill={SILHOUETTE} />
        </g>
      )}
    </svg>
  )
}

/* ───────────────────────── キャラクター(オリジナルのシルエット / SVG 文字列 → テクスチャ) ───────────────────────── */

/** 右向きに描いたシルエットの SVG。body=胴体色、accent=発光部の色 */
function fighterSvg(side: Side, body: string, accent: string, eye: string) {
  const limb = (d: string, w: number) => `<path d="${d}" fill="none" stroke="${body}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`
  const inner =
    side === 0
      ? `<path d="M55 37 C44 32 34 39 20 31 C28 41 40 42 54 42 Z" fill="${accent}"/>
         <path d="M55 41 C46 45 37 51 24 50 C35 56 46 51 56 45 Z" fill="${accent}" opacity="0.75"/>
         ${limb('M50 64 L49 87 L65 85', 11)}<circle cx="67" cy="84" r="6" fill="${accent}"/>
         ${limb('M57 100 L44 136 L30 170 L40 172', 15)}${limb('M61 100 L80 132 L92 170 L102 172', 15)}
         <path d="M46 58 Q62 51 80 58 L75 103 Q62 107 49 103 Z" fill="${body}"/>
         <path d="M58 58 L66 82" stroke="${accent}" stroke-width="1.6" opacity="0.55"/>
         <path d="M48 98 L76 98" stroke="${accent}" stroke-width="5"/>
         <path d="M60 99 L55 114 M63 99 L66 115" stroke="${accent}" stroke-width="3" stroke-linecap="round"/>
         ${limb('M63 49 L63 58', 9)}
         <path d="M54 37 L49 25 L58 30 L60 20 L66 29 L74 23 L73 34 Z" fill="${body}"/>
         <circle cx="64" cy="42" r="11" fill="${body}"/>
         <path d="M53 39 L75 36.5" stroke="${accent}" stroke-width="4"/>
         <path d="M68 42.5 L73.5 42" stroke="${eye}" stroke-width="1.6" stroke-linecap="round"/>
         ${limb('M76 63 L91 80 L100 66', 11)}<circle cx="101" cy="64" r="7" fill="${accent}"/>`
      : `<path d="M46 104 C32 114 24 132 12 144 C28 141 40 128 52 108 Z" fill="${accent}" opacity="0.85"/>
         ${limb('M40 66 L37 93 L57 95', 15)}<circle cx="60" cy="94" r="9" fill="${accent}"/>
         ${limb('M55 104 L39 138 L25 170 L39 172', 19)}${limb('M63 104 L84 134 L94 170 L108 172', 19)}
         <path d="M31 58 Q60 43 91 58 L83 109 Q60 116 39 109 Z" fill="${body}"/>
         <path d="M48 70 L73 70 L67 85 L54 85 Z" fill="${accent}" opacity="0.3"/>
         <path d="M38 104 L84 104" stroke="${accent}" stroke-width="7"/>
         <path d="M22 66 Q27 47 47 51 L45 69 Z" fill="${body}"/>
         <path d="M76 51 Q95 47 100 66 L78 69 Z" fill="${body}"/>
         <path d="M52 34 L42 18 L57 29 Z M71 30 L84 15 L76 35 Z" fill="${body}"/>
         <circle cx="63" cy="40" r="12.5" fill="${body}"/>
         <path d="M64 39.5 L75 38.5" stroke="${eye}" stroke-width="2.6" stroke-linecap="round"/>
         ${limb('M86 64 L102 84 L106 67', 15)}<circle cx="106" cy="63" r="9.5" fill="${accent}"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -10 140 200" width="420" height="600">${inner}</svg>`
}

function svgTexture(svg: string) {
  return new Promise<THREE.Texture>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = 420
      c.height = 600
      c.getContext('2d')?.drawImage(img, 0, 0, 420, 600)
      const t = new THREE.CanvasTexture(c)
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = 4
      resolve(t)
    }
    img.onerror = reject
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  })
}

/* ───────────────────────── 3D: DOM 側からの合図 ───────────────────────── */

type FBus = {
  hitT: Pair
  lungeT: Pair
  lightT: number
  heavyT: number
  heavyDef: Side
  superT: number
  superSide: Side
  koT: number
  loser: Side | -1
  sparks: { def: Side; heavy: boolean }[]
}
const newFBus = (): FBus => ({ hitT: [-99, -99], lungeT: [-99, -99], lightT: -99, heavyT: -99, heavyDef: 1, superT: -99, superSide: 0, koT: -99, loser: -1, sparks: [] })
const secs = () => performance.now() / 1000
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const easeOut = (t: number) => 1 - (1 - t) ** 3
const FX = [-2.15, 2.15] as const
const PLANE_H = 4.3
const PLANE_W = PLANE_H * 0.7
const PLANE_Y = PLANE_H / 2 - PLANE_H * 0.07

/* ───────────────────────── 3D: ネオンの屋上ステージ ───────────────────────── */

const SKY_FS = /* glsl */ `
  uniform float uTime;
  uniform float uDim;
  varying vec2 vUv;
  void main() {
    float y = vUv.y;
    vec3 col = mix(vec3(1.5, 0.5, 0.28), vec3(0.85, 0.12, 0.38), smoothstep(0.0, 0.1, y));
    col = mix(col, vec3(0.2, 0.03, 0.26), smoothstep(0.08, 0.32, y));
    col = mix(col, vec3(0.015, 0.008, 0.05), smoothstep(0.3, 0.75, y));
    vec2 g = floor(vUv * vec2(320.0, 110.0));
    float h = fract(sin(dot(g, vec2(12.9898, 78.233))) * 43758.5453);
    col += step(0.995, h) * smoothstep(0.3, 0.6, y) * vec3(0.8) * (0.6 + 0.4 * sin(uTime * 2.0 + h * 50.0));
    gl_FragColor = vec4(col * (1.0 - uDim * 0.75), 1.0);
  }
`
const SUN_FS = /* glsl */ `
  uniform float uTime;
  uniform float uDim;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0) discard;
    float y = vUv.y;
    float band = fract(y * 11.0 + uTime * 0.25);
    float gap = mix(0.0, 0.55, smoothstep(0.62, 0.05, y));
    if (y < 0.6 && band < gap) discard;
    vec3 col = mix(vec3(1.5, 0.22, 0.6), vec3(1.7, 1.15, 0.3), smoothstep(0.1, 0.95, y));
    gl_FragColor = vec4(col * (1.0 - uDim * 0.7), 1.0);
  }
`
const SKYLINE_VS = /* glsl */ `
  attribute float aSeed;
  varying vec3 vW;
  varying vec3 vN;
  varying float vSeed;
  void main() {
    vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vW = w.xyz;
    vN = normalize(mat3(modelMatrix * instanceMatrix) * normal);
    vSeed = aSeed;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`
const SKYLINE_FS = /* glsl */ `
  uniform float uTime;
  uniform float uDim;
  varying vec3 vW;
  varying vec3 vN;
  varying float vSeed;
  void main() {
    float face = abs(vN.z) > 0.5 ? vW.x : vW.z;
    vec2 cell = vec2(face * 1.3, vW.y * 1.0);
    vec2 f = fract(cell);
    float win = step(0.22, f.x) * step(f.x, 0.72) * step(0.3, f.y) * step(f.y, 0.78);
    float h = fract(sin(dot(floor(cell) + vSeed * 17.0, vec2(12.9898, 78.233))) * 43758.5453);
    float lit = step(0.8, h) * (1.0 - step(0.5, abs(vN.y)));
    vec3 wc = mix(vec3(1.5, 0.85, 0.4), vec3(1.4, 0.3, 1.1), step(0.92, h));
    vec3 col = vec3(0.03, 0.015, 0.06) + win * lit * wc * (0.45 + 0.3 * sin(uTime * 0.6 + h * 30.0));
    float d = length(vW - cameraPosition);
    col = mix(col, vec3(0.25, 0.04, 0.22), smoothstep(30.0, 90.0, d) * 0.55);
    gl_FragColor = vec4(col * (1.0 - uDim * 0.6), 1.0);
  }
`
const GRID_FS = /* glsl */ `
  varying vec3 vW;
  void main() {
    vec2 c = vW.xz * 0.5;
    vec2 g = abs(fract(c - 0.5) - 0.5) / fwidth(c);
    float line = 1.0 - min(min(g.x, g.y), 1.0);
    float fade = smoothstep(26.0, 3.0, length(vW.xz - vec2(0.0, -2.0)));
    gl_FragColor = vec4(vec3(1.8, 0.3, 1.3) * line, line * fade * 0.5);
  }
`
const PASS_VS = 'varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }'

function useShader(fs: string, uniforms: Record<string, THREE.IUniform>, opts: Partial<THREE.ShaderMaterialParameters> = {}, vs = PASS_VS) {
  const mat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: vs, fragmentShader: fs, uniforms, ...opts }), []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => mat.dispose(), [mat])
  return mat
}

function neonSignTexture(text: string, color: string, vertical: boolean) {
  const c = document.createElement('canvas')
  c.width = vertical ? 128 : 512
  c.height = vertical ? 512 : 128
  const g = c.getContext('2d')
  if (g) {
    g.font = `900 ${vertical ? 100 : 88}px "Noto Sans JP", sans-serif`
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillStyle = color
    if (vertical) [...text].forEach((ch, i) => g.fillText(ch, 64, 80 + i * 118))
    else g.fillText(text, 256, 68)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function NeonSign({ text, color, glow, position, vertical = false, size, flicker = 0 }: { text: string; color: string; glow: number; position: [number, number, number]; vertical?: boolean; size: [number, number]; flicker?: number }) {
  const tex = useMemo(() => neonSignTexture(text, color, vertical), [text, color, vertical])
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, color: new THREE.Color(glow, glow, glow) }), [tex, glow])
  useEffect(
    () => () => {
      tex.dispose()
      mat.dispose()
    },
    [tex, mat],
  )
  useFrame((s) => {
    if (!flicker) return
    const t = s.clock.elapsedTime * flicker
    const on = Math.sin(t * 7.1) + Math.sin(t * 2.3) > -1.6 ? 1 : 0.15
    mat.color.setScalar(glow * on)
  })
  return (
    <group position={position}>
      <mesh position-z={-0.05}>
        <boxGeometry args={[size[0] + 0.3, size[1] + 0.3, 0.08]} />
        <meshStandardMaterial color="#0c0714" roughness={0.6} />
      </mesh>
      <mesh material={mat}>
        <planeGeometry args={size} />
      </mesh>
    </group>
  )
}

function Rooftop({ bus, reduced }: { bus: RefObject<FBus>; reduced: boolean }) {
  const sky = useShader(SKY_FS, { uTime: { value: 0 }, uDim: { value: 0 } }, { depthWrite: false, fog: false })
  const sun = useShader(SUN_FS, { uTime: { value: 0 }, uDim: { value: 0 } }, { fog: false })
  const grid = useShader(GRID_FS, {}, { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
  const skylineMat = useShader(SKYLINE_FS, { uTime: { value: 0 }, uDim: { value: 0 } }, {}, SKYLINE_VS)
  const beacon = useRef<THREE.MeshBasicMaterial>(null)
  const skyline = useMemo(() => {
    const rng = (() => {
      let a = 77
      return () => ((a = (a * 16807) % 2147483647) - 1) / 2147483646
    })()
    const n = 80
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), skylineMat, n)
    const seeds = new Float32Array(n)
    const m = new THREE.Matrix4()
    for (let i = 0; i < n; i++) {
      const row = i % 2
      const x = -70 + (i / n) * 140 + (rng() - 0.5) * 3
      const center = Math.abs(x) < (row ? 12 : 15)
      const h = center ? 2 + rng() * (row ? 6 : 3) : 6 + rng() * (row ? 26 : 18)
      m.compose(new THREE.Vector3(x, -6, row ? -48 - rng() * 8 : -30 - rng() * 6), new THREE.Quaternion(), new THREE.Vector3(2.4 + rng() * 4, h + 6, 2 + rng() * 4))
      mesh.setMatrixAt(i, m)
      seeds[i] = rng()
    }
    mesh.geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1))
    return mesh
  }, [skylineMat])
  useEffect(() => () => skyline.geometry.dispose(), [skyline])

  useFrame((s, dt) => {
    const t = secs()
    const b = bus.current
    const sk = t - b.superT
    const dim = sk >= 0 && sk < 1.2 ? Math.sin(Math.min(1, sk / 0.15) * Math.PI * 0.5) * (1 - clamp01((sk - 0.8) / 0.4)) : 0
    for (const m of [sky, sun, skylineMat]) {
      if (!reduced) m.uniforms.uTime.value += dt
      m.uniforms.uDim.value = dim
    }
    if (beacon.current) beacon.current.color.setRGB(Math.sin(s.clock.elapsedTime * 3) > 0 ? 6 : 0.4, 0.2, 0.2)
  })

  return (
    <group>
      <mesh position={[0, 32, -75]} material={sky} renderOrder={-2}>
        <planeGeometry args={[320, 80]} />
      </mesh>
      <mesh position={[0, 7, -70]} material={sun} renderOrder={-1}>
        <planeGeometry args={[30, 30]} />
      </mesh>
      <primitive object={skyline} />
      {/* 屋上の床(反射)とネオンのグリッド */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, -6]}>
        <planeGeometry args={[60, 40]} />
        <MeshReflectorMaterial
          resolution={512}
          blur={[320, 90]}
          mixBlur={1}
          mixStrength={4}
          mixContrast={1.1}
          roughness={0.85}
          metalness={0.55}
          depthScale={1.1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#120a1f"
        />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, -6]} material={grid}>
        <planeGeometry args={[60, 40]} />
      </mesh>
      {/* 奥の手すりとネオン管 */}
      <mesh position={[0, 0.5, -9]}>
        <boxGeometry args={[60, 1, 0.5]} />
        <meshStandardMaterial color="#0b0712" roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.04, -8.74]}>
        <boxGeometry args={[60, 0.06, 0.06]} />
        <meshBasicMaterial color={new THREE.Color(0.4, 3.2, 4)} />
      </mesh>
      {Array.from({ length: 25 }, (_, i) => (
        <mesh key={i} position={[-30 + i * 2.5, 1.6, -9]}>
          <boxGeometry args={[0.08, 1.2, 0.08]} />
          <meshStandardMaterial color="#160d22" />
        </mesh>
      ))}
      <mesh position={[0, 2.2, -9]}>
        <boxGeometry args={[60, 0.07, 0.07]} />
        <meshStandardMaterial color="#1d1229" />
      </mesh>
      {/* 給水塔・室外機・アンテナ */}
      <group position={[-6.8, 0, -13.5]}>
        <mesh position-y={4.1}>
          <cylinderGeometry args={[1.7, 1.7, 2.8, 16]} />
          <meshStandardMaterial color="#1a1024" roughness={0.6} metalness={0.3} />
        </mesh>
        <mesh position-y={5.9}>
          <coneGeometry args={[1.85, 0.9, 16]} />
          <meshStandardMaterial color="#140b1c" />
        </mesh>
        {[-1, 1].map((x) => (
          <mesh key={x} position={[x * 1.1, 1.35, 0]}>
            <boxGeometry args={[0.16, 2.7, 0.16]} />
            <meshStandardMaterial color="#120a1a" />
          </mesh>
        ))}
      </group>
      {[
        [6.5, -10.5],
        [8.4, -10.8],
      ].map(([x, z]) => (
        <mesh key={x} position={[x, 0.7, z]}>
          <boxGeometry args={[1.6, 1.4, 1.2]} />
          <meshStandardMaterial color="#1b1226" roughness={0.5} />
        </mesh>
      ))}
      <group position={[11, 0, -13]}>
        <mesh position-y={4}>
          <cylinderGeometry args={[0.06, 0.1, 8, 6]} />
          <meshStandardMaterial color="#150c1e" />
        </mesh>
        <mesh position-y={8.1}>
          <sphereGeometry args={[0.14, 8, 6]} />
          <meshBasicMaterial ref={beacon} color={new THREE.Color(6, 0.2, 0.2)} />
        </mesh>
      </group>
      <NeonSign text="烈風館" color="#ff5fb4" glow={2.4} position={[-13.5, 5.4, -16]} vertical size={[1.4, 5.4]} flicker={reduced ? 0 : 1} />
      <NeonSign text="夜光市場" color="#5ff2ff" glow={2} position={[14, 4.2, -18]} size={[6, 1.5]} />
      <hemisphereLight args={['#5a2a8a', '#12061c', 1.1]} />
      <pointLight position={[0, 6, 6]} color="#ff7ad9" intensity={40} distance={30} decay={2} />
    </group>
  )
}

/* ───────────────────────── 3D: ファイター(ビルボード) ───────────────────────── */

const FIGHTER_FS = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uFlash;
  uniform float uBoost;
  uniform vec3 uTint;
  varying vec2 vUv;
  void main() {
    vec4 c = texture2D(uMap, vUv);
    if (c.a < 0.04) discard;
    vec3 col = c.rgb;
    float sat = max(col.r, max(col.g, col.b)) - min(col.r, min(col.g, col.b));
    col *= 1.0 + smoothstep(0.25, 0.6, sat) * uBoost;
    col = mix(col * uTint, vec3(4.0), uFlash);
    gl_FragColor = vec4(col, c.a);
  }
`

function Fighter({ side, bus, reduced, tex }: { side: Side; bus: RefObject<FBus>; reduced: boolean; tex: { body: THREE.Texture; glow: THREE.Texture } }) {
  const root = useRef<THREE.Group>(null)
  const pivot = useRef<THREE.Group>(null)
  const color = useMemo(() => new THREE.Color(COLORS[side].main), [side])
  const body = useShader(FIGHTER_FS, { uMap: { value: tex.body }, uFlash: { value: 0 }, uBoost: { value: 2.2 }, uTint: { value: new THREE.Vector3(1, 1, 1) } }, { transparent: true }, 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }')
  const rim = useMemo(
    () => new THREE.MeshBasicMaterial({ map: tex.glow, transparent: true, depthWrite: false, color: color.clone().multiplyScalar(2.4), alphaTest: 0.04 }),
    [tex.glow, color],
  )
  useEffect(() => () => rim.dispose(), [rim])
  useFrame((s) => {
    const g = root.current
    const p = pivot.current
    if (!g || !p) return
    const b = bus.current
    const t = secs()
    const lt = (t - b.lungeT[side]) / 0.2
    const ht = (t - b.hitT[side]) / 0.3
    const lunge = lt >= 0 && lt < 1 ? Math.sin(lt * Math.PI) * 0.5 : 0
    const recoil = ht >= 0 && ht < 1 ? Math.sin(ht * Math.PI) * 0.32 : 0
    const dir = side === 0 ? 1 : -1
    let fall = 0
    let slide = 0
    if (b.loser === side) {
      const k = clamp01((t - b.koT - 0.12) / (reduced ? 0.01 : 0.55))
      fall = easeOut(k)
      slide = fall * 1.1
    }
    g.position.x = FX[side] + dir * ((reduced ? 0 : lunge - recoil) - slide)
    p.position.y = reduced || fall ? 0 : Math.sin(s.clock.elapsedTime * (side ? 3.7 : 4.8)) * 0.035
    p.rotation.z = fall * 1.42
    body.uniforms.uFlash.value = ht >= 0 && ht < 0.5 ? 1 - ht * 2 : 0
    const st = t - b.superT
    const aura = b.superSide === side && st >= 0 && st < 1.3 ? 1 + Math.sin(st * 20) * 0.3 + 1.2 * (1 - st / 1.3) : 1
    rim.color.copy(color).multiplyScalar(2.4 * aura * (1 - fall * 0.7))
  })
  return (
    <group ref={root} position={[FX[side], 0, 0]} scale={[side === 0 ? 1 : -1, 1, 1]}>
      <mesh rotation-x={-Math.PI / 2} position-y={0.02}>
        <circleGeometry args={[0.95, 24]} />
        <meshBasicMaterial color="#000" transparent opacity={0.55} depthWrite={false} />
      </mesh>
      <group ref={pivot}>
        <mesh position={[0, PLANE_Y, -0.02]} scale={[1.045, 1.03, 1]} material={rim}>
          <planeGeometry args={[PLANE_W, PLANE_H]} />
        </mesh>
        <mesh position={[0, PLANE_Y, 0]} material={body}>
          <planeGeometry args={[PLANE_W, PLANE_H]} />
        </mesh>
      </group>
    </group>
  )
}

/* ───────────────────────── 3D: ヒットスパーク ───────────────────────── */

const SPARK_VS = /* glsl */ `
  uniform float uNow;
  uniform float uPix;
  attribute vec3 aVel;
  attribute float aStart;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vA;
  void main() {
    float t = uNow - aStart;
    float life = 0.42;
    float k = clamp(t / life, 0.0, 1.0);
    vec3 p = position + aVel * t * (1.0 - k * 0.5) + vec3(0.0, -3.2 * t * t, 0.0);
    vA = step(0.0, t) * (1.0 - k);
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (1.0 - k) * 0.11 * uPix * 900.0 / -mv.z;
  }
`
const SPARK_FS = /* glsl */ `
  varying vec3 vColor;
  varying float vA;
  void main() {
    vec2 q = gl_PointCoord - 0.5;
    float a = smoothstep(0.5, 0.0, length(q));
    gl_FragColor = vec4(vColor * (1.0 + a * 2.0), a * vA);
  }
`
const STAR_FS = /* glsl */ `
  uniform float uK;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    float ang = atan(p.y, p.x);
    float spikes = pow(abs(cos(ang * 4.0)), 18.0) * 0.9 + 0.1;
    float star = smoothstep(spikes, 0.0, r) ;
    float ring = smoothstep(0.08, 0.0, abs(r - (0.4 + uK * 0.55))) * (1.0 - uK);
    float a = (star * (1.0 - uK) + ring);
    gl_FragColor = vec4(mix(uColor, vec3(4.0, 3.6, 2.4), star) * 2.0, a);
  }
`

function HitFx({ bus }: { bus: RefObject<FBus> }) {
  const N = 600
  const cursor = useRef(0)
  const base = useRef(secs())
  const { geo, mat } = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3))
    g.setAttribute('aVel', new THREE.BufferAttribute(new Float32Array(N * 3), 3))
    g.setAttribute('aStart', new THREE.BufferAttribute(new Float32Array(N).fill(-99), 1))
    g.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(N * 3), 3))
    const m = new THREE.ShaderMaterial({ vertexShader: SPARK_VS, fragmentShader: SPARK_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uNow: { value: 0 }, uPix: { value: 1 } } })
    return { geo: g, mat: m }
  }, [])
  const stars = [
    useShader(STAR_FS, { uK: { value: 1 }, uColor: { value: new THREE.Color(COLORS[1].main) } }, { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }, 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'),
    useShader(STAR_FS, { uK: { value: 1 }, uColor: { value: new THREE.Color(COLORS[0].main) } }, { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }, 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'),
  ]
  const starMesh = [useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null)]
  const heavyStar = useRef<[boolean, boolean]>([false, false])
  useEffect(
    () => () => {
      geo.dispose()
      mat.dispose()
    },
    [geo, mat],
  )
  useFrame((s) => {
    const b = bus.current
    const t = secs() - base.current
    mat.uniforms.uNow.value = t
    mat.uniforms.uPix.value = s.gl.getPixelRatio()
    if (b.sparks.length) {
      const pos = geo.attributes.position as THREE.BufferAttribute
      const vel = geo.attributes.aVel as THREE.BufferAttribute
      const st = geo.attributes.aStart as THREE.BufferAttribute
      const col = geo.attributes.aColor as THREE.BufferAttribute
      for (const sp of b.sparks) {
        const att = (1 - sp.def) as Side
        const ac = new THREE.Color(COLORS[att].main)
        const ox = FX[sp.def] - (sp.def === 0 ? -1 : 1) * 0.35
        const n = sp.heavy ? 46 : 26
        for (let i = 0; i < n; i++) {
          const k = cursor.current
          cursor.current = (k + 1) % N
          const a = Math.random() * Math.PI * 2
          const sp2 = (sp.heavy ? 5 : 3.2) * (0.35 + Math.random())
          pos.setXYZ(k, ox, 2.55 + (Math.random() - 0.5) * 0.3, 0.4)
          vel.setXYZ(k, Math.cos(a) * sp2 + (sp.def === 0 ? -1.4 : 1.4), Math.sin(a) * sp2 + 1, (Math.random() - 0.2) * 2)
          st.setX(k, t + Math.random() * 0.03)
          const white = Math.random() < 0.45
          col.setXYZ(k, white ? 3 : ac.r * 2.6, white ? 2.6 : ac.g * 2.6, white ? 1.8 : ac.b * 2.6)
        }
        heavyStar.current[sp.def] = sp.heavy
      }
      b.sparks.length = 0
      pos.needsUpdate = vel.needsUpdate = st.needsUpdate = col.needsUpdate = true
    }
    for (const side of [0, 1] as Side[]) {
      const m = starMesh[side].current
      const k = (secs() - b.hitT[side]) / 0.2
      if (!m) continue
      m.visible = k >= 0 && k < 1
      stars[side].uniforms.uK.value = clamp01(k)
      m.scale.setScalar((heavyStar.current[side] ? 2.4 : 1.6) * (0.6 + easeOut(clamp01(k)) * 0.6))
      m.position.set(FX[side] - (side === 0 ? -1 : 1) * 0.35, 2.55, 0.45)
    }
  })
  return (
    <>
      <points geometry={geo} material={mat} frustumCulled={false} />
      {([0, 1] as Side[]).map((side) => (
        <mesh key={side} ref={starMesh[side]} material={stars[side]} visible={false} rotation-z={side * 0.4}>
          <planeGeometry args={[1, 1]} />
        </mesh>
      ))}
    </>
  )
}

/* ───────────────────────── 3D: カメラ・画面座標の受け渡し ───────────────────────── */

function CameraRig({ bus, reduced, rootRef, caRef }: { bus: RefObject<FBus>; reduced: boolean; rootRef: RefObject<HTMLDivElement | null>; caRef: RefObject<THREE.Vector2> }) {
  const cur = useRef({ x: 0, z: 0 })
  const v = useMemo(() => new THREE.Vector3(), [])
  const last = useRef('')
  useFrame((state, dt) => {
    const cam = state.camera as THREE.PerspectiveCamera
    const b = bus.current
    const t = secs()
    const tanH = Math.tan(((cam.fov / 2) * Math.PI) / 180)
    const dist = Math.max(3.5 / tanH, 4.9 / (tanH * cam.aspect))
    let tx = 0
    let tz = 0
    let amp = 0
    const hk = t - b.heavyT
    if (hk >= 0 && hk < 0.4) {
      const k = 1 - hk / 0.4
      tx += FX[b.heavyDef] * 0.18 * k
      tz -= 1.1 * k
      amp += 0.07 * k
    }
    const lk = t - b.lightT
    if (lk >= 0 && lk < 0.14) amp += 0.025 * (1 - lk / 0.14)
    const sk = t - b.superT
    if (sk >= 0 && sk < 1.3) {
      const k = Math.sin(clamp01(sk / 1.3) * Math.PI)
      tx += FX[b.superSide] * 0.3 * k
      tz -= 2.2 * k
    }
    const kk = t - b.koT
    if (b.loser !== -1 && kk >= 0) {
      if (kk > 0.12 && kk < 0.85) amp += 0.32 * (1 - (kk - 0.12) / 0.73)
      const k = easeOut(clamp01(kk / 1.8))
      tx += FX[b.loser] * 0.35 * k
      tz -= 2.4 * k
    }
    if (reduced) {
      amp = 0
      tx *= 0.3
      tz *= 0.3
    }
    cur.current.x += (tx - cur.current.x) * Math.min(1, dt * 9)
    cur.current.z += (tz - cur.current.z) * Math.min(1, dt * 9)
    const e = state.clock.elapsedTime
    const sx = Math.sin(e * 53) * amp
    const sy = Math.cos(e * 41) * amp
    cam.position.set(cur.current.x + sx, 2.05 + sy, dist + cur.current.z)
    cam.lookAt(cur.current.x * 0.7 + sx * 0.4, 1.7 + sy * 0.4, 0)
    if (caRef.current) {
      const k = Math.max(hk >= 0 && hk < 0.25 ? 1 - hk / 0.25 : 0, b.loser !== -1 && kk >= 0 && kk < 0.5 ? 1 - kk / 0.5 : 0)
      caRef.current.set(0.0005 + (reduced ? 0 : k * 0.005), 0.0003 + (reduced ? 0 : k * 0.003))
    }
    // ダメージ数値(DOM)を 3D の頭上へ合わせるため、画面座標を CSS 変数で渡す
    const root = rootRef.current
    if (root) {
      cam.updateMatrixWorld()
      const parts: string[] = []
      for (const side of [0, 1] as Side[]) {
        v.set(FX[side], 2.7, 0).project(cam)
        parts.push(((v.x * 0.5 + 0.5) * 100).toFixed(1), ((-v.y * 0.5 + 0.5) * 100).toFixed(1))
      }
      const key = parts.join(',')
      if (key !== last.current) {
        last.current = key
        root.style.setProperty('--fh-x0', `${parts[0]}%`)
        root.style.setProperty('--fh-y0', `${parts[1]}%`)
        root.style.setProperty('--fh-x1', `${parts[2]}%`)
        root.style.setProperty('--fh-y1', `${parts[3]}%`)
      }
    }
  })
  return null
}

function Arena({ bus, reduced, rootRef }: { bus: RefObject<FBus>; reduced: boolean; rootRef: RefObject<HTMLDivElement | null> }) {
  const [tex, setTex] = useState<{ body: THREE.Texture; glow: THREE.Texture }[] | null>(null)
  const ca = useMemo(() => new THREE.Vector2(0.0005, 0.0003), [])
  const caRef = useRef(ca)
  useEffect(() => {
    let alive = true
    let made: THREE.Texture[] = []
    Promise.all(
      ([0, 1] as Side[]).flatMap((side) => [svgTexture(fighterSvg(side, SILHOUETTE, COLORS[side].main, '#ffffff')), svgTexture(fighterSvg(side, '#ffffff', '#ffffff', '#ffffff'))]),
    )
      .then((list) => {
        made = list
        if (alive) setTex([0, 1].map((i) => ({ body: list[i * 2], glow: list[i * 2 + 1] })))
        else list.forEach((t) => t.dispose())
      })
      .catch(() => undefined)
    return () => {
      alive = false
      made.forEach((t) => t.dispose())
    }
  }, [])
  return (
    <>
      <color attach="background" args={['#0d0726']} />
      <fog attach="fog" args={['#2a0a33', 18, 70]} />
      <Rooftop bus={bus} reduced={reduced} />
      {tex && ([0, 1] as Side[]).map((side) => <Fighter key={side} side={side} bus={bus} reduced={reduced} tex={tex[side]} />)}
      <HitFx bus={bus} />
      <CameraRig bus={bus} reduced={reduced} rootRef={rootRef} caRef={caRef} />
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur intensity={1.25} luminanceThreshold={0.85} luminanceSmoothing={0.25} radius={0.72} />
        <ChromaticAberration offset={ca} radialModulation={false} modulationOffset={0} />
        <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.12} />
        <Vignette offset={0.28} darkness={0.75} />
      </EffectComposer>
    </>
  )
}

/* ───────────────────────── HUD パーツ ───────────────────────── */

function HealthBar({ side, hp, trail }: { side: Side; hp: number; trail: number }) {
  const pct = (hp / MAX_HP) * 100
  const trailPct = (Math.max(trail, hp) / MAX_HP) * 100
  const anchor = side === 0 ? { left: 0 } : { right: 0 }
  const low = hp > 0 && pct <= 25
  return (
    <div
      className="relative h-4 min-w-0 flex-1 border-2 border-white/85 bg-[#14081f] shadow-[0_0_0_2px_#0008,0_0_14px_#0009] @min-[40rem]:h-[22px]"
      style={{ transform: `skewX(${side === 0 ? -20 : 20}deg)` }}
      role="meter"
      aria-label={`${NAMES[side]} の体力`}
      aria-valuemin={0}
      aria-valuemax={MAX_HP}
      aria-valuenow={hp}
    >
      <div className="absolute inset-y-0 bg-gradient-to-b from-[#ff6b5b] to-[#b4121f] transition-[width] duration-500 ease-out" style={{ ...anchor, width: `${trailPct}%` }} />
      <div
        className={`absolute inset-y-0 bg-gradient-to-b from-[#fff7a8] via-[#ffd23a] to-[#e89a12] ${low ? 'fh-low' : ''}`}
        style={{ ...anchor, width: `${pct}%`, transition: 'width 70ms linear' }}
      />
      <div className="absolute inset-x-0 top-0 h-1/3 bg-white/25" />
      <div className="absolute inset-0 [background:repeating-linear-gradient(90deg,transparent_0_calc(10%_-_1px),#0005_calc(10%_-_1px)_10%)]" />
    </div>
  )
}

function WinPips({ side, wins }: { side: Side; wins: number }) {
  return (
    <div className={`flex gap-1 ${side === 0 ? 'flex-row-reverse' : ''}`} aria-label={`${NAMES[side]} ${wins} 勝`}>
      {[0, 1].map((i) => {
        const on = i < wins
        return (
          <motion.span
            key={`${i}-${on}`}
            initial={on ? { scale: 2.2, opacity: 0 } : false}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 18 }}
            className={`grid size-3.5 rotate-45 place-items-center border ${on ? 'border-[#fff3b0] bg-[#ffc531] shadow-[0_0_10px_#ffc531]' : 'border-white/40 bg-black/50'}`}
          >
            {on && <span className="-rotate-45 text-[8px] leading-none font-black text-[#5a2a00]">V</span>}
          </motion.span>
        )
      })}
    </div>
  )
}

function SuperMeter({ side, value }: { side: Side; value: number }) {
  const level = Math.floor(value / LEVEL)
  const color = COLORS[side]
  return (
    <div className={`flex min-w-0 items-end gap-2 ${side === 1 ? 'flex-row-reverse text-right' : ''}`}>
      <motion.div
        key={level}
        initial={{ scale: 1.6 }}
        animate={{ scale: 1 }}
        className="fh-stroke w-7 shrink-0 font-['Orbitron'] text-[28px] leading-none font-black italic"
        style={{ color: level > 0 ? color.main : '#ffffff55', textShadow: level > 0 ? `0 0 12px ${color.main}` : 'none' }}
      >
        {level}
      </motion.div>
      <div className="min-w-0 flex-1">
        <div className={`mb-0.5 flex items-center gap-1.5 font-['Orbitron'] text-[9px] font-bold tracking-[0.25em] text-white/70 ${side === 1 ? 'flex-row-reverse' : ''}`}>
          <span>SUPER</span>
          {level >= 3 && <span className="rounded-sm bg-white px-1 text-[8px] tracking-normal text-black">MAX</span>}
        </div>
        <div className={`flex gap-1 ${side === 1 ? 'flex-row-reverse' : ''}`} role="meter" aria-label={`${NAMES[side]} の必殺ゲージ`} aria-valuemin={0} aria-valuemax={MAX_METER} aria-valuenow={value}>
          {[0, 1, 2].map((i) => {
            const fill = Math.min(1, Math.max(0, (value - i * LEVEL) / LEVEL))
            const full = fill >= 1
            return (
              <div
                key={i}
                className="relative h-2.5 flex-1 overflow-hidden border border-white/50 bg-black/60 @min-[40rem]:h-3"
                style={{ transform: `skewX(${side === 0 ? -24 : 24}deg)` }}
              >
                <div
                  className={`absolute inset-y-0 transition-[width] duration-200 ${full ? 'fh-full fh-sheen' : ''}`}
                  style={{
                    ...(side === 0 ? { left: 0 } : { right: 0 }),
                    width: `${fill * 100}%`,
                    background: full ? `linear-gradient(180deg, ${color.soft}, ${color.main} 45%, ${color.deep})` : `${color.deep}`,
                    boxShadow: full ? `0 0 10px ${color.main}` : 'none',
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ArcadeButton({
  label,
  hint,
  color,
  disabled,
  onPress,
}: {
  label: string
  hint: string
  color: string
  disabled?: boolean
  onPress: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <button
        type="button"
        disabled={disabled}
        onPointerDown={(e) => {
          if (e.pointerType !== 'mouse' || e.button === 0) {
            e.preventDefault()
            onPress()
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            e.stopPropagation()
            onPress()
          }
        }}
        className="grid size-11 place-items-center rounded-full border-2 border-black/60 text-[13px] font-black text-white shadow-[inset_0_-5px_0_#0006,inset_0_3px_0_#fff6,0_3px_0_#000a] transition-[transform,filter,opacity] active:translate-y-0.5 active:shadow-[inset_0_-2px_0_#0006,inset_0_3px_0_#fff6,0_1px_0_#000a] disabled:opacity-35 disabled:saturate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white @min-[40rem]:size-12"
        style={{ background: `radial-gradient(circle at 50% 35%, ${color}, color-mix(in oklab, ${color} 55%, black))`, textShadow: '0 1px 2px #000a' }}
      >
        {label}
      </button>
      <kbd className="font-['JetBrains_Mono'] text-[9px] text-white/55">{hint}</kbd>
    </div>
  )
}

/* ───────────────────────── 本体 ───────────────────────── */

export function FightingHud() {
  const reduced = useReducedMotion() ?? false
  const fbus = useRef<FBus>(newFBus())
  const rootRef = useRef<HTMLDivElement>(null)
  const [hp, hpRef, setHp] = useSynced<Pair>([MAX_HP, MAX_HP])
  const [trail, setTrail] = useState<Pair>([MAX_HP, MAX_HP])
  const [meter, meterRef, setMeter] = useSynced<Pair>([0, 0])
  const [phase, phaseRef, setPhase] = useSynced<Phase>('intro')
  const [wins, winsRef, setWins] = useSynced<Pair>([0, 0])
  const [time, timeRef, setTime] = useSynced(ROUND_TIME)
  const [round, setRound] = useState(1)
  const [intro, setIntro] = useState<'round' | 'fight' | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [combo, setCombo] = useState<Combo | null>(null)
  const [popups, setPopups] = useState<Popup[]>([])
  const [superCut, setSuperCut] = useState<{ side: Side; id: number } | null>(null)
  const [flash, setFlash] = useState(0)

  const timers = useRef(new Set<number>())
  const comboRef = useRef<Combo | null>(null)
  const comboTimer = useRef(0)
  const trailTimers = useRef<Pair>([0, 0])
  const lockRef = useRef(false)
  const cpuArmed = useRef(false)
  const lastPress = useRef(0)
  const uid = useRef(0)

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.current.delete(id)
      fn()
    }, ms)
    timers.current.add(id)
    return id
  }, [])
  const cancel = (id: number) => {
    window.clearTimeout(id)
    timers.current.delete(id)
  }
  const clearAll = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id))
    timers.current.clear()
  }, [])

  const startIntro = useCallback(() => {
    setPhase('intro')
    setIntro('round')
    later(() => setIntro('fight'), 1400)
    later(() => {
      setIntro(null)
      setPhase('fight')
    }, 2250)
  }, [later, setPhase])

  useEffect(() => {
    startIntro()
    return clearAll
  }, [startIntro, clearAll])

  const finish = (winner: Side | null, timeUp: boolean) => {
    setPhase('ko')
    lockRef.current = false
    const w = [...winsRef.current] as Pair
    if (winner !== null) w[winner] += 1
    const perfect = winner !== null && hpRef.current[winner] === MAX_HP
    setResult({ winner, perfect, timeUp, match: winner !== null && w[winner] >= 2 })
    later(() => setWins(w), timeUp ? 600 : 900)
    if (!timeUp) {
      setFlash((f) => f + 1)
      if (winner !== null) {
        fbus.current.koT = secs() + 0.2
        fbus.current.loser = (1 - winner) as Side
      }
    }
    later(() => setPhase('result'), timeUp ? 1700 : 2100)
  }

  const strike = (att: Side, move: Move, base: number) => {
    if (phaseRef.current !== 'fight') return
    const def = (1 - att) as Side
    const prev = comboRef.current && comboRef.current.side === att ? comboRef.current : null
    const hits = (prev?.hits ?? 0) + 1
    const dmg = Math.max(1, Math.round(base * Math.max(0.35, 1 - (hits - 1) * 0.07)))

    const nextHp = [...hpRef.current] as Pair
    nextHp[def] = Math.max(0, nextHp[def] - dmg)
    setHp(nextHp)

    // 赤いダメージ跡は「最後のヒットから少し待って」追いかける
    cancel(trailTimers.current[def])
    trailTimers.current[def] = later(() => {
      setTrail((t) => {
        const n = [...t] as Pair
        n[def] = hpRef.current[def]
        return n
      })
    }, 750)

    const m = [...meterRef.current] as Pair
    if (move !== 'super') m[att] = Math.min(MAX_METER, m[att] + (move === 'heavy' ? 28 : 15))
    m[def] = Math.min(MAX_METER, m[def] + 9)
    setMeter(m)

    const nextCombo: Combo = { side: att, hits, dmg: (prev?.dmg ?? 0) + dmg, id: ++uid.current }
    comboRef.current = nextCombo
    setCombo(nextCombo)
    cancel(comboTimer.current)
    comboTimer.current = later(() => {
      comboRef.current = null
      setCombo(null)
    }, 1300)

    const pid = ++uid.current
    setPopups((p) => [...p.slice(-5), { id: pid, side: def, value: dmg, big: move !== 'light' }])
    later(() => setPopups((p) => p.filter((x) => x.id !== pid)), 750)

    // 3D 側への合図(突進・のけぞり・スパーク・カメラの寄り)
    const b = fbus.current
    const ts = secs()
    b.hitT[def] = ts
    b.lungeT[att] = ts
    b.sparks.push({ def, heavy: move !== 'light' })
    if (move === 'light') b.lightT = ts
    else {
      b.heavyT = ts
      b.heavyDef = def
    }
    if (nextHp[def] === 0) finish(att, false)
  }

  const doSuper = (att: Side) => {
    if (phaseRef.current !== 'fight' || lockRef.current || meterRef.current[att] < LEVEL) return
    const m = [...meterRef.current] as Pair
    m[att] -= LEVEL
    setMeter(m)
    lockRef.current = true
    setSuperCut({ side: att, id: ++uid.current })
    const wait = reduced ? 450 : 900
    later(() => setSuperCut(null), wait)
    later(() => {
      fbus.current.superT = secs()
      fbus.current.superSide = att
    }, wait - 120)
    const n = 5
    for (let i = 0; i < n; i++) later(() => strike(att, 'super', i === n - 1 ? 150 : 56), wait + i * 95)
    later(() => {
      lockRef.current = false
    }, wait + n * 95)
  }

  const timeUp = () => {
    const [a, b] = hpRef.current
    finish(a === b ? null : a > b ? 0 : 1, true)
  }

  const cpuTurn = () => {
    if (phaseRef.current !== 'fight' || lockRef.current) return
    const r = Math.random()
    if (meterRef.current[1] >= LEVEL && r < 0.22) doSuper(1)
    else if (r < 0.62) [0, 150, 300].slice(0, 2 + Math.floor(Math.random() * 2)).forEach((d) => later(() => strike(1, 'light', rand(DMG.light) * 0.8), d))
    else strike(1, 'heavy', rand(DMG.heavy) * 0.85)
  }

  // タイマー・CPU のループから常に最新の関数を呼ぶ
  const latest = useRef({ timeUp, cpuTurn })
  useLayoutEffect(() => {
    latest.current = { timeUp, cpuTurn }
  })

  useEffect(() => {
    if (phase !== 'fight') return
    const id = window.setInterval(() => {
      const t = Math.max(0, timeRef.current - 1)
      setTime(t)
      if (t === 0) latest.current.timeUp()
    }, 1000)
    return () => window.clearInterval(id)
  }, [phase, setTime, timeRef])

  useEffect(() => {
    if (phase !== 'fight') return
    let id = 0
    const loop = () => {
      id = window.setTimeout(() => {
        if (cpuArmed.current) latest.current.cpuTurn()
        loop()
      }, 1500 + Math.random() * 1600)
    }
    loop()
    return () => window.clearTimeout(id)
  }, [phase])

  const attack = (move: Move) => {
    if (phaseRef.current !== 'fight' || lockRef.current) return
    const now = performance.now()
    if (now - lastPress.current < (move === 'heavy' ? 240 : 110)) return
    lastPress.current = now
    cpuArmed.current = true
    if (move === 'super') doSuper(0)
    else strike(0, move, rand(DMG[move]))
  }

  const nextRound = (full = false) => {
    clearAll()
    const restart = full || result?.match
    if (restart) {
      setWins([0, 0])
      setMeter([0, 0])
      setRound(1)
    } else setRound((r) => r + 1)
    setHp([MAX_HP, MAX_HP])
    setTrail([MAX_HP, MAX_HP])
    setTime(ROUND_TIME)
    comboRef.current = null
    setCombo(null)
    setPopups([])
    setResult(null)
    setSuperCut(null)
    lockRef.current = false
    cpuArmed.current = false
    fbus.current = newFBus()
    startIntro()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const k = e.key.toLowerCase()
    if (k === 'j' || k === 'k' || k === 'l') {
      e.preventDefault()
      if (!e.repeat) attack(k === 'j' ? 'light' : k === 'k' ? 'heavy' : 'super')
    } else if ((k === 'enter' || k === ' ') && e.target === e.currentTarget && phaseRef.current === 'result') {
      e.preventDefault()
      nextRound()
    } else if (k.startsWith('arrow')) e.preventDefault()
  }

  const finalRound = wins[0] === 1 && wins[1] === 1
  const fighting = phase === 'fight'
  const lowTime = fighting && time <= 10

  return (
    <div
      ref={rootRef}
      className="@container relative h-full w-full touch-manipulation overflow-hidden bg-[#0d0726] text-white outline-none select-none focus-visible:ring-2 focus-visible:ring-[#3fe0ff]/70 focus-visible:ring-inset"
      tabIndex={0}
      onKeyDown={onKeyDown}
      role="group"
      aria-label="対戦格闘ゲームの HUD デモ。J で弱、K で強、L で必殺、Enter で次のラウンド"
    >
      <style>{CSS}</style>

      {/* ── 3D ステージ ── */}
      <div className="absolute inset-0">
        <Canvas dpr={[1, 1.75]} camera={{ fov: 32, near: 0.1, far: 300, position: [0, 2.15, 10] }} gl={{ antialias: false, powerPreference: 'high-performance' }} aria-hidden="true">
          <Arena bus={fbus} reduced={reduced} rootRef={rootRef} />
        </Canvas>
      </div>

      {/* ダメージ数値(3D の頭上を射影した位置) */}
      <AnimatePresence>
        {popups.map((p) => (
          <motion.span
            key={p.id}
            className="fh-stroke pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full font-['Orbitron'] font-black italic"
            style={{
              left: `var(--fh-x${p.side}, ${p.side === 0 ? '30%' : '70%'})`,
              top: `var(--fh-y${p.side}, 40%)`,
              fontSize: p.big ? 28 : 20,
              color: p.big ? '#ffd23a' : '#fff',
              textShadow: `0 0 14px ${COLORS[(1 - p.side) as Side].main}`,
            }}
            initial={{ y: 0, scale: 1.7, opacity: 1 }}
            animate={{ y: -40, scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            {p.value}
          </motion.span>
        ))}
      </AnimatePresence>

      {/* 上部 HUD */}
      <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/60 to-transparent px-3 pt-3 pb-6 @min-[40rem]:px-5">
        <div className="flex items-start gap-1.5 @min-[40rem]:gap-3">
          {([0, 1] as Side[]).map((side) => (
            <div key={side} className={`flex min-w-0 flex-1 items-start gap-2 ${side === 1 ? 'order-3 flex-row-reverse' : ''}`}>
              <div
                className="hidden size-9 shrink-0 overflow-hidden border-2 border-white/80 shadow-[0_0_12px_#0009] @min-[30rem]:block @min-[40rem]:size-11"
                style={{ transform: `skewX(${side === 0 ? -8 : 8}deg)`, boxShadow: `0 0 12px ${COLORS[side].deep}` }}
              >
                <Portrait side={side} />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <HealthBar side={side} hp={hp[side]} trail={trail[side]} />
                <div className={`mt-1.5 flex items-center justify-between gap-2 ${side === 1 ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex min-w-0 items-baseline gap-1.5 ${side === 1 ? 'flex-row-reverse' : ''}`}>
                    <span className="rounded-sm px-1 font-['Orbitron'] text-[9px] font-black text-black" style={{ background: COLORS[side].main }}>
                      {side + 1}P
                    </span>
                    <span className="truncate text-[12px] font-black tracking-wider italic [text-shadow:0_2px_0_#000] @min-[40rem]:text-sm">{NAMES[side]}</span>
                  </div>
                  <WinPips side={side} wins={wins[side]} />
                </div>
              </div>
            </div>
          ))}
          <div className="order-2 flex w-12 shrink-0 flex-col items-center @min-[40rem]:w-16" role="timer" aria-label={`残り ${time} 秒`}>
            <div
              className={`grid h-11 w-full place-items-center border-2 bg-[#14081f]/90 [clip-path:polygon(12%_0,88%_0,100%_50%,88%_100%,12%_100%,0_50%)] @min-[40rem]:h-14 ${lowTime ? 'border-[#ff4f7b]' : 'border-white/80'}`}
            >
              <span
                className={`font-['Orbitron'] text-2xl leading-none font-black tabular-nums @min-[40rem]:text-[32px] ${lowTime ? 'fh-low text-[#ff6b6b]' : 'text-[#ffe9a8]'}`}
                style={{ textShadow: lowTime ? '0 0 12px #ff4f7b' : '0 0 10px #ffb34788' }}
              >
                {String(time).padStart(2, '0')}
              </span>
            </div>
            <span className="mt-1 font-['Orbitron'] text-[8px] font-bold tracking-[0.2em] text-white/60">{finalRound ? 'FINAL' : `RD ${round}`}</span>
          </div>
        </div>
      </div>

      {/* コンボ表示(攻撃側の画面端) */}
      <AnimatePresence>
        {combo && combo.hits >= 2 && (
          <motion.div
            key={`combo-${combo.side}`}
            className={`pointer-events-none absolute top-[30%] z-10 ${combo.side === 0 ? 'left-3 text-left @min-[40rem]:left-6' : 'right-3 text-right @min-[40rem]:right-6'}`}
            initial={{ opacity: 0, x: combo.side === 0 ? -40 : 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: combo.side === 0 ? -30 : 30, transition: { duration: 0.25 } }}
          >
            <div className={`flex items-end gap-1 ${combo.side === 1 ? 'flex-row-reverse' : ''}`}>
              <motion.span
                key={combo.hits}
                className="fh-stroke font-['Orbitron'] text-[44px] leading-none font-black italic @min-[40rem]:text-[56px]"
                style={{ color: COLORS[combo.side].soft, textShadow: `0 0 18px ${COLORS[combo.side].main}` }}
                initial={reduced ? false : { scale: 1.9, rotate: combo.side === 0 ? -8 : 8 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 700, damping: 20 }}
              >
                {combo.hits}
              </motion.span>
              <span className="fh-stroke mb-1 font-['Orbitron'] text-sm font-black text-[#ffd23a] italic @min-[40rem]:text-lg">HITS</span>
            </div>
            <div className="mt-0.5 font-['Orbitron'] text-[11px] font-bold tracking-wider text-white/85 [text-shadow:0_1px_2px_#000]">
              <span className="text-[#ffd23a] tabular-nums">{combo.dmg}</span> DAMAGE
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 必殺技カットイン */}
      <AnimatePresence>
        {superCut && (
          <motion.div key={superCut.id} className="pointer-events-none absolute inset-0 z-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <div className="absolute inset-0 bg-[#05020c]/70" />
            <motion.div
              className="absolute inset-x-[-10%] top-1/2 flex h-[30%] -translate-y-1/2 -rotate-6 items-center overflow-hidden"
              style={{ background: `linear-gradient(90deg, transparent, ${COLORS[superCut.side].deep} 18%, ${COLORS[superCut.side].main} 50%, ${COLORS[superCut.side].deep} 82%, transparent)` }}
              initial={reduced ? { opacity: 0 } : { x: superCut.side === 0 ? '-100%' : '100%' }}
              animate={reduced ? { opacity: 1 } : { x: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <div className="absolute inset-0 opacity-40 [background:repeating-linear-gradient(90deg,transparent_0_18px,#fff6_18px_20px)]" />
              <motion.div
                className="fh-stroke relative w-full text-center text-[clamp(26px,7cqw,64px)] font-black tracking-[0.1em] italic"
                style={{ color: '#fff', textShadow: `0 0 20px ${COLORS[superCut.side].main}` }}
                initial={reduced ? false : { x: superCut.side === 0 ? 60 : -60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.12, duration: 0.5 }}
              >
                {SUPER_NAMES[superCut.side]}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ROUND / FIGHT! 帯テロップ */}
      <AnimatePresence mode="wait">
        {intro === 'round' && (
          <motion.div key="round" className="pointer-events-none absolute inset-x-0 top-1/2 z-30 -translate-y-1/2" initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }}>
            <motion.div
              className="relative flex h-16 items-center justify-center overflow-hidden border-y-2 border-[#ffd23a] bg-gradient-to-r from-transparent via-black/80 to-transparent @min-[40rem]:h-20"
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <motion.span
                className="fh-stroke font-['Orbitron'] text-[clamp(30px,7cqw,56px)] font-black tracking-[0.12em] text-white italic [text-shadow:0_0_20px_#ffd23a]"
                initial={reduced ? { opacity: 0 } : { x: '-60vw', skewX: -20 }}
                animate={reduced ? { opacity: 1 } : { x: 0, skewX: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 0.1 }}
              >
                {finalRound ? 'FINAL ROUND' : `ROUND ${round}`}
              </motion.span>
            </motion.div>
          </motion.div>
        )}
        {intro === 'fight' && (
          <motion.div
            key="fight"
            className="pointer-events-none absolute inset-0 z-30 grid place-items-center"
            initial={reduced ? { opacity: 0 } : { scale: 3, opacity: 0, filter: 'blur(8px)' }}
            animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
            exit={{ scale: reduced ? 1 : 1.4, opacity: 0, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', stiffness: 420, damping: 22 }}
          >
            <span
              className="fh-stroke bg-gradient-to-b from-[#fff7c2] via-[#ffbf1f] to-[#ff3d3d] bg-clip-text font-['Orbitron'] text-[clamp(56px,15cqw,150px)] leading-none font-black text-transparent italic"
              style={{ filter: 'drop-shadow(0 4px 0 #3a0614) drop-shadow(0 0 24px #ff6a00aa)' }}
            >
              FIGHT!
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* K.O. / TIME UP */}
      <AnimatePresence>
        {phase === 'ko' && result && (
          <motion.div key="ko" className="pointer-events-none absolute inset-0 z-30 grid place-items-center" exit={{ opacity: 0, transition: { duration: 0.3 } }}>
            {result.timeUp ? (
              <motion.span
                className="fh-stroke font-['Orbitron'] text-[clamp(44px,11cqw,110px)] font-black text-[#ffe9a8] italic [text-shadow:0_0_24px_#ff8a00]"
                initial={reduced ? { opacity: 0 } : { y: -60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                TIME UP
              </motion.span>
            ) : (
              <motion.span
                className="fh-stroke bg-gradient-to-b from-white via-[#ff6b6b] to-[#9b0a1d] bg-clip-text font-['Orbitron'] text-[clamp(80px,24cqw,240px)] leading-none font-black text-transparent italic"
                style={{ filter: 'drop-shadow(0 6px 0 #1a0208) drop-shadow(0 0 30px #ff2d55)' }}
                initial={reduced ? { opacity: 0 } : { scale: 5, opacity: 0, rotate: -12 }}
                animate={{ scale: 1, opacity: 1, rotate: -4 }}
                transition={reduced ? { duration: 0.2 } : { type: 'spring', stiffness: 520, damping: 26, mass: 1.2 }}
              >
                K.O.
              </motion.span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {flash > 0 && phase === 'ko' && (
          <motion.div
            key={flash}
            className="pointer-events-none absolute inset-0 z-20 bg-white"
            initial={{ opacity: reduced ? 0.4 : 0.9 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
          />
        )}
      </AnimatePresence>

      {/* リザルト */}
      <AnimatePresence>
        {phase === 'result' && result && (
          <motion.div
            key="result"
            className="absolute inset-0 z-30 grid place-items-center bg-[#05020c]/55 px-4 pb-20 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="text-center">
              {result.perfect && (
                <motion.div
                  className="fh-stroke mb-1 font-['Orbitron'] text-[clamp(20px,5cqw,40px)] font-black tracking-[0.2em] text-[#ffd23a] italic [text-shadow:0_0_18px_#ffb000]"
                  initial={reduced ? false : { scale: 2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15 }}
                >
                  PERFECT
                </motion.div>
              )}
              <motion.div
                className="fh-stroke font-['Orbitron'] text-[clamp(36px,9cqw,84px)] leading-none font-black italic"
                style={{
                  color: result.winner === null ? '#fff' : COLORS[result.winner].soft,
                  textShadow: result.winner === null ? '0 0 20px #fff8' : `0 0 24px ${COLORS[result.winner].main}`,
                }}
                initial={reduced ? false : { y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
              >
                {result.winner === null ? 'DRAW' : `${result.winner + 1}P WIN`}
              </motion.div>
              <p className="mt-2 text-sm font-bold text-white/85">
                {result.winner === null
                  ? '時間切れ・体力同点'
                  : result.match
                    ? `${NAMES[result.winner]} が 2 本先取で勝利`
                    : `${NAMES[result.winner]} がこのラウンドを制した${result.timeUp ? '(判定)' : ''}`}
              </p>
              <button
                type="button"
                onClick={() => nextRound()}
                className="mt-4 inline-flex items-center gap-2 border-2 border-white bg-white px-5 py-2 text-sm font-black text-[#14081f] shadow-[4px_4px_0_#ff4f7b] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#3fe0ff] active:translate-y-0.5"
                style={{ transform: 'skewX(-10deg)' }}
              >
                <span style={{ transform: 'skewX(10deg)' }}>{result.match ? 'もう一度対戦する' : '次のラウンドへ'}</span>
                <kbd className="font-['JetBrains_Mono'] text-[10px] text-[#14081f]/60" style={{ transform: 'skewX(10deg)' }}>
                  Enter
                </kbd>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 下部: 必殺ゲージと操作 */}
      <div className="absolute inset-x-0 bottom-0 z-40 bg-gradient-to-t from-black/85 via-black/55 to-transparent px-3 pt-6 pb-[var(--solo-footer-clearance,0.6rem)] @min-[40rem]:px-5">
        <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1.5">
          <div className="order-2 w-[calc(50%-0.4rem)] @min-[36rem]:order-1 @min-[36rem]:w-[30%] @min-[36rem]:max-w-64">
            <SuperMeter side={0} value={meter[0]} />
          </div>
          <div className="order-1 flex w-full items-end justify-center gap-3 @min-[36rem]:order-2 @min-[36rem]:w-auto" role="group" aria-label="1P の攻撃">
            <ArcadeButton label="弱" hint="J" color="#3b82f6" disabled={!fighting} onPress={() => attack('light')} />
            <ArcadeButton label="強" hint="K" color="#ef4444" disabled={!fighting} onPress={() => attack('heavy')} />
            <ArcadeButton label="必殺" hint="L" color="#f59e0b" disabled={!fighting || meter[0] < LEVEL} onPress={() => attack('super')} />
            <div className="flex flex-col items-center gap-0.5">
              <button
                type="button"
                onClick={() => nextRound(true)}
                aria-label="最初からやり直す"
                className="grid size-8 place-items-center rounded-full border border-white/30 bg-white/10 text-white/80 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white"
              >
                <RotateCcw size={14} aria-hidden="true" />
              </button>
              <span className="text-[9px] text-white/45">リセット</span>
            </div>
          </div>
          <div className="order-3 w-[calc(50%-0.4rem)] @min-[36rem]:w-[30%] @min-[36rem]:max-w-64">
            <SuperMeter side={1} value={meter[1]} />
          </div>
        </div>
      </div>
    </div>
  )
}
