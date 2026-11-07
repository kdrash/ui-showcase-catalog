import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { Flame, FlaskConical, Shield, Skull, Sword, Wind, type LucideIcon } from 'lucide-react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Bloom, ChromaticAberration, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react'

/**
 * ダークファンタジーのアクション RPG 風ボス戦 HUD。
 * - 左上に細い体力・集中力・スタミナ。スタミナは MotionValue と rAF で再描画なしに自然回復する
 * - ボス出現で下部に名前と長い体力バーがフェードイン。被ダメージは白い跡が遅れて減り、累計ダメージ数値が出る
 * - ボスの予備動作(赤い気配)を見て回避すると無敵時間でかわせる。回復薬は残数つきの装備スロットに表示
 * - エリア進入時はセリフ体の地名が一文字ずつ滲み出し、勝敗時は画面中央を暗い帯が横切って大きな文字を出す
 * - 背景は React Three Fiber の 3D。城門と塔の廃墟、濡れた石畳(canvas 生成のテクスチャ)、月光の影、篝火、指数フォグと流れる霧の板
 * - 火の粉は GPU で動かす Points。ボスはプリミティブで組んだ巨人で、冠と目が発光し、剣を振り上げて叩きつけると衝撃波とカメラの揺れ
 * - ボスの鎧は onBeforeCompile で溶解シェーダーを足し、出現時はノイズで組み上がり、撃破時は縁が燃えながら火の粉になって崩れる
 * - DOM の HUD は合図(時刻)を ref に書くだけで、3D 側は useFrame でそれを読んで動く(毎フレームの React 再描画なし)
 * - Bloom・色収差(被弾時)・ACES・ノイズ・ビネット。城跡・ボス・自キャラはすべてオリジナル
 * - J 攻撃 / K 回避 / H 回復 / B ボス出現。動きを減らす設定ではカメラの揺れ・火の粉・マントの揺れを止める
 */

const P_HP = 1000
const B_HP = 4200
const FLASKS = 4
const BOSS_NAME = '灰冠の騎士 オルドヴァーン'
const AREA = '灰燼の古城'
const SERIF = "font-['Playfair_Display','Yu_Mincho','Hiragino_Mincho_ProN','Noto_Serif_JP',serif]"

type BossState = 'none' | 'entering' | 'active' | 'dead'
type Result = 'victory' | 'defeat' | null
type FxKind = 'slash' | 'crit' | 'swing' | 'hurt' | 'dodge' | 'evade' | 'heal'

function useSynced<T>(initial: T) {
  const ref = useRef(initial)
  const [value, setValue] = useState(initial)
  const set = useCallback((next: T) => {
    ref.current = next
    setValue(next)
  }, [])
  return [value, ref, set] as const
}

/* ───────────────────────── 3D: DOM 側からの合図(毎フレーム useFrame で読む) ───────────────────────── */

type Bus = {
  boss: BossState
  telegraph: boolean
  crit: boolean
  defeated: boolean
  playerX: number
  t: Record<'attack' | 'dodge' | 'heal' | 'hurt' | 'hit' | 'strike' | 'enter' | 'dead' | 'down', number>
}
const newBus = (): Bus => ({
  boss: 'none',
  telegraph: false,
  crit: false,
  defeated: false,
  playerX: 0,
  t: { attack: -99, dodge: -99, heal: -99, hurt: -99, hit: -99, strike: -99, enter: -99, dead: -99, down: -99 },
})
const secs = () => performance.now() / 1000
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const easeOut = (t: number) => 1 - (1 - t) ** 3
const BOSS_Z = -14

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

/* ───────────────────────── 3D: 石畳(canvas で生成したテクスチャ) ───────────────────────── */

function makeFlagstones() {
  const size = 512
  const color = document.createElement('canvas')
  const rough = document.createElement('canvas')
  color.width = color.height = rough.width = rough.height = size
  const g = color.getContext('2d')
  const r = rough.getContext('2d')
  const rng = mulberry32(9)
  if (g && r) {
    g.fillStyle = '#060607'
    g.fillRect(0, 0, size, size)
    r.fillStyle = '#808080'
    r.fillRect(0, 0, size, size)
    const rows = 6
    const h = size / rows
    for (let row = 0; row < rows; row++) {
      let x = -rng() * 80
      while (x < size) {
        const w = 60 + rng() * 100
        const shade = 34 + rng() * 26
        g.fillStyle = `rgb(${shade},${shade - 1},${shade + 3})`
        g.fillRect(x + 3, row * h + 3, w - 6, h - 6)
        for (let k = 0; k < 40; k++) {
          const s = shade + (rng() - 0.5) * 18
          g.fillStyle = `rgba(${s},${s},${s + 4},0.5)`
          g.fillRect(x + 3 + rng() * (w - 8), row * h + 3 + rng() * (h - 8), 2 + rng() * 6, 2 + rng() * 6)
        }
        const rv = 120 + rng() * 60
        r.fillStyle = `rgb(${rv},${rv},${rv})`
        r.fillRect(x + 3, row * h + 3, w - 6, h - 6)
        x += w
      }
    }
    // 水たまり(ざらつきを下げて月光を映す)
    for (let i = 0; i < 9; i++) {
      const px = rng() * size
      const py = rng() * size
      const pr = 20 + rng() * 60
      const gr = r.createRadialGradient(px, py, 0, px, py, pr)
      gr.addColorStop(0, 'rgb(18,18,18)')
      gr.addColorStop(1, 'rgba(18,18,18,0)')
      r.fillStyle = gr
      r.fillRect(0, 0, size, size)
    }
  }
  const map = new THREE.CanvasTexture(color)
  map.colorSpace = THREE.SRGBColorSpace
  const roughnessMap = new THREE.CanvasTexture(rough)
  for (const t of [map, roughnessMap]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(16, 16)
    t.anisotropy = 4
  }
  return { map, roughnessMap }
}

function Ground() {
  const tex = useMemo(makeFlagstones, [])
  useEffect(
    () => () => {
      tex.map.dispose()
      tex.roughnessMap.dispose()
    },
    [tex],
  )
  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[180, 180]} />
      <meshStandardMaterial map={tex.map} roughnessMap={tex.roughnessMap} metalness={0.15} roughness={1} color="#9a96a0" />
    </mesh>
  )
}

/* ───────────────────────── 3D: 城跡 ───────────────────────── */

const STONE = '#2a2830'

function Tower({ x, z, h, r, roof = true }: { x: number; z: number; h: number; r: number; roof?: boolean }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position-y={h / 2} castShadow receiveShadow>
        <cylinderGeometry args={[r * 0.9, r, h, 8]} />
        <meshStandardMaterial color={STONE} roughness={0.95} flatShading />
      </mesh>
      {roof ? (
        <mesh position-y={h + r * 1.6}>
          <coneGeometry args={[r * 1.15, r * 3.2, 8]} />
          <meshStandardMaterial color="#1b1a20" roughness={0.8} flatShading />
        </mesh>
      ) : (
        [0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} position={[Math.cos(i * 1.4) * r * 0.75, h + 0.6 + (i % 2) * 0.9, Math.sin(i * 1.4) * r * 0.75]}>
            <boxGeometry args={[r * 0.5, 1.4 + (i % 3) * 0.8, r * 0.5]} />
            <meshStandardMaterial color={STONE} flatShading />
          </mesh>
        ))
      )}
      <mesh position={[0, h * 0.62, r * 0.93]}>
        <boxGeometry args={[0.35, 1.4, 0.1]} />
        <meshBasicMaterial color={new THREE.Color(2.2, 0.8, 0.25)} />
      </mesh>
    </group>
  )
}

const GATE_FS = /* glsl */ `
  varying vec2 vUv;
  void main() {
    float glow = pow(1.0 - vUv.y, 2.4);
    float side = 1.0 - pow(abs(vUv.x - 0.5) * 2.0, 3.0) * 0.5;
    vec3 col = mix(vec3(0.16, 0.04, 0.02), vec3(2.4, 0.8, 0.22), glow * side);
    gl_FragColor = vec4(col, 1.0);
  }
`
/** 門の奥に燃え残る光(アーチ形・下ほど明るい) */
function GateGlow() {
  const { geo, mat } = useMemo(() => {
    const sh = new THREE.Shape()
    sh.moveTo(-5.6, 0)
    sh.lineTo(-5.6, 14.2)
    sh.absarc(0, 14.2, 5.6, Math.PI, 0, true)
    sh.lineTo(5.6, 0)
    sh.lineTo(-5.6, 0)
    const g = new THREE.ShapeGeometry(sh, 24)
    const pos = g.attributes.position as THREE.BufferAttribute
    const uv = g.attributes.uv as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + 5.6) / 11.2, pos.getY(i) / 19.8)
    const m = new THREE.ShaderMaterial({ vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: GATE_FS, fog: false })
    return { geo: g, mat: m }
  }, [])
  useEffect(
    () => () => {
      geo.dispose()
      mat.dispose()
    },
    [geo, mat],
  )
  return <mesh position={[0, 0, -26.2]} geometry={geo} material={mat} />
}

const SKY_FS = /* glsl */ `
  uniform vec3 uMoon;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    float y = clamp(d.y, 0.0, 1.0);
    vec3 col = mix(vec3(0.075, 0.08, 0.12), vec3(0.008, 0.008, 0.016), smoothstep(0.0, 0.55, y));
    float m = max(dot(d, uMoon), 0.0);
    col += vec3(0.25, 0.3, 0.45) * pow(m, 18.0) * 0.6;
    gl_FragColor = vec4(col, 1.0);
  }
`
function NightSky() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: SKY_FS,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { uMoon: { value: new THREE.Vector3(34, 42, -130).normalize() } },
      }),
    [],
  )
  useEffect(() => () => mat.dispose(), [mat])
  return (
    <mesh material={mat} renderOrder={-1}>
      <sphereGeometry args={[300, 32, 16]} />
    </mesh>
  )
}

function Keep() {
  const crenels = useMemo(() => Array.from({ length: 22 }, (_, i) => -26 + i * 2.5), [])
  return (
    <group>
      {/* 門の奥の残り火 */}
      <GateGlow />
      <pointLight position={[0, 5, -21]} color="#ff7a2a" intensity={160} distance={60} decay={2} />
      {/* 門の柱とアーチ */}
      {[-7, 7].map((x) => (
        <mesh key={x} position={[x, 7.5, -25]} castShadow>
          <boxGeometry args={[3, 15, 3]} />
          <meshStandardMaterial color={STONE} roughness={0.9} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 14.2, -25]}>
        <torusGeometry args={[7, 1.5, 6, 18, Math.PI]} />
        <meshStandardMaterial color={STONE} roughness={0.9} flatShading />
      </mesh>
      {/* 城壁 */}
      {[-1, 1].map((sgn) => (
        <mesh key={sgn} position={[sgn * 17, 8, -25.5]} receiveShadow>
          <boxGeometry args={[18, 16, 2.4]} />
          <meshStandardMaterial color={STONE} roughness={0.95} flatShading />
        </mesh>
      ))}
      {crenels.map((x) =>
        Math.abs(x) < 8 ? null : (
          <mesh key={x} position={[x, 16.7, -25.5]}>
            <boxGeometry args={[1.3, 1.4, 2.4]} />
            <meshStandardMaterial color={STONE} flatShading />
          </mesh>
        ),
      )}
      <Tower x={-26} z={-27} h={22} r={3.2} />
      <Tower x={26} z={-28} h={26} r={3.6} />
      <Tower x={-38} z={-44} h={30} r={4} />
      <Tower x={40} z={-46} h={18} r={3.4} roof={false} />
      <Tower x={-12} z={-48} h={34} r={2.6} />
      <Tower x={14} z={-52} h={28} r={2.4} />
      {/* 参道の折れた柱 */}
      {[
        [-6.5, -6, 6.5],
        [6.5, -6.5, 2.4],
        [-6, -11.5, 3.2],
        [6, -12, 7.5],
        [-6.2, -18, 5],
        [6.2, -18.5, 1.6],
      ].map(([x, z, h]) => (
        <group key={`${x}${z}`} position={[x, 0, z]}>
          <mesh position-y={h / 2} castShadow receiveShadow>
            <cylinderGeometry args={[0.55, 0.65, h, 8]} />
            <meshStandardMaterial color="#34313a" roughness={0.9} flatShading />
          </mesh>
          <mesh position-y={0.25}>
            <boxGeometry args={[1.6, 0.5, 1.6]} />
            <meshStandardMaterial color="#2c2a31" flatShading />
          </mesh>
        </group>
      ))}
      {[
        [-3.4, -7, 0.6],
        [3.5, -11, 0.9],
        [-2.6, -21, 1.2],
        [8.5, -9, 1.1],
      ].map(([x, z, s], i) => (
        <mesh key={i} position={[x, s * 0.35, z]} rotation={[i, i * 2, i * 0.5]} castShadow>
          <dodecahedronGeometry args={[s, 0]} />
          <meshStandardMaterial color="#2f2d34" flatShading />
        </mesh>
      ))}
    </group>
  )
}

function Brazier({ x, z, reduced }: { x: number; z: number; reduced: boolean }) {
  const flame = useRef<THREE.Mesh>(null)
  const light = useRef<THREE.PointLight>(null)
  useFrame((s) => {
    if (reduced) return
    const t = s.clock.elapsedTime + x
    const f = 1 + Math.sin(t * 13) * 0.12 + Math.sin(t * 7.7) * 0.1
    if (flame.current) flame.current.scale.set(1, f, 1)
    if (light.current) light.current.intensity = 26 * f
  })
  return (
    <group position={[x, 0, z]}>
      <mesh position-y={0.7}>
        <cylinderGeometry args={[0.15, 0.3, 1.4, 6]} />
        <meshStandardMaterial color="#19181c" metalness={0.6} roughness={0.5} />
      </mesh>
      <mesh position-y={1.5}>
        <cylinderGeometry args={[0.65, 0.35, 0.4, 8]} />
        <meshStandardMaterial color="#19181c" metalness={0.6} roughness={0.5} />
      </mesh>
      <mesh ref={flame} position-y={2.1}>
        <coneGeometry args={[0.45, 1.3, 7]} />
        <meshBasicMaterial color={new THREE.Color(6, 2.2, 0.5)} />
      </mesh>
      <pointLight ref={light} position-y={2.6} color="#ff8a3d" intensity={26} distance={16} decay={2} />
    </group>
  )
}

function Moon() {
  return (
    <group position={[34, 42, -130]}>
      <mesh>
        <sphereGeometry args={[7, 24, 16]} />
        <meshBasicMaterial color={new THREE.Color(2.4, 2.5, 2.8)} fog={false} />
      </mesh>
      <mesh>
        <circleGeometry args={[22, 40]} />
        <meshBasicMaterial color="#8a96c8" transparent opacity={0.12} fog={false} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

/* ───────────────────────── 3D: 霧と火の粉 ───────────────────────── */

function makeFogTexture() {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 128
  const g = c.getContext('2d')
  const rng = mulberry32(4)
  if (g)
    for (let i = 0; i < 40; i++) {
      const x = rng() * 256
      const y = 40 + rng() * 60
      const r = 20 + rng() * 40
      const gr = g.createRadialGradient(x, y, 0, x, y, r)
      gr.addColorStop(0, 'rgba(255,255,255,0.22)')
      gr.addColorStop(1, 'rgba(255,255,255,0)')
      g.fillStyle = gr
      g.fillRect(0, 0, 256, 128)
    }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = THREE.RepeatWrapping
  return t
}

function FogSheets({ reduced }: { reduced: boolean }) {
  const tex = useMemo(makeFogTexture, [])
  const layers = useMemo(
    () =>
      [
        { z: -4, y: 1.2, w: 60, o: 0.35, s: 0.006 },
        { z: -11, y: 1.8, w: 70, o: 0.45, s: -0.004 },
        { z: -19, y: 2.6, w: 80, o: 0.55, s: 0.003 },
        { z: -30, y: 4, w: 120, o: 0.6, s: -0.002 },
      ].map((l) => {
        const t = tex.clone()
        t.needsUpdate = true
        t.repeat.set(l.w / 40, 1)
        return { ...l, t }
      }),
    [tex],
  )
  useEffect(
    () => () => {
      tex.dispose()
      layers.forEach((l) => l.t.dispose())
    },
    [tex, layers],
  )
  useFrame((_, dt) => {
    if (!reduced) layers.forEach((l) => (l.t.offset.x += l.s * dt * 6))
  })
  return (
    <>
      {layers.map((l) => (
        <mesh key={l.z} position={[0, l.y, l.z]} renderOrder={2}>
          <planeGeometry args={[l.w, 7]} />
          <meshBasicMaterial map={l.t} color="#8d8a9c" transparent opacity={l.o} depthWrite={false} />
        </mesh>
      ))}
    </>
  )
}

const EMBER_VS = /* glsl */ `
  uniform float uTime;
  uniform float uPix;
  attribute vec4 aSeed;
  varying float vA;
  void main() {
    vec3 p = position;
    p.y = mod(p.y + uTime * aSeed.x, 16.0);
    p.x += sin(uTime * 0.7 + aSeed.y) * aSeed.w;
    p.z += cos(uTime * 0.5 + aSeed.y * 1.3) * aSeed.w * 0.6;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSeed.z * uPix * (10.0 / -mv.z);
    float flick = 0.55 + 0.45 * sin(uTime * 7.0 + aSeed.y * 5.0);
    vA = flick * smoothstep(0.0, 1.5, p.y) * (1.0 - smoothstep(11.0, 16.0, p.y));
  }
`
const EMBER_FS = /* glsl */ `
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vec3(3.2, 1.15, 0.32) * (0.6 + a), a * vA);
  }
`

function Embers({ reduced }: { reduced: boolean }) {
  const { geo, mat } = useMemo(() => {
    const n = 700
    const rng = mulberry32(21)
    const pos = new Float32Array(n * 3)
    const seed = new Float32Array(n * 4)
    for (let i = 0; i < n; i++) {
      pos.set([(rng() - 0.5) * 50, rng() * 16, -40 + rng() * 46], i * 3)
      seed.set([0.4 + rng() * 1.2, rng() * 6.28, 0.6 + rng() * 1.6, 0.2 + rng() * 0.8], i * 4)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4))
    const m = new THREE.ShaderMaterial({
      vertexShader: EMBER_VS,
      fragmentShader: EMBER_FS,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 3 }, uPix: { value: 1 } },
    })
    return { geo: g, mat: m }
  }, [])
  useEffect(
    () => () => {
      geo.dispose()
      mat.dispose()
    },
    [geo, mat],
  )
  useFrame((s, dt) => {
    mat.uniforms.uPix.value = s.gl.getPixelRatio()
    if (!reduced) mat.uniforms.uTime.value += dt
  })
  return <points geometry={geo} material={mat} frustumCulled={false} />
}

const BURST_VS = /* glsl */ `
  uniform float uT;
  uniform float uPix;
  attribute vec3 aVel;
  attribute float aLife;
  varying float vA;
  void main() {
    float t = max(uT, 0.0);
    vec3 p = position + aVel * t + vec3(0.0, 0.9 * t * t, 0.0);
    float life = clamp(t / aLife, 0.0, 1.0);
    vA = step(0.0, uT) * (1.0 - life) * smoothstep(0.0, 0.2, t);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (1.0 - life * 0.6) * 2.2 * uPix * (14.0 / -mv.z);
  }
`

/** 撃破時、ボスの体積からあふれ出る火の粉 */
function DeathBurst({ bus }: { bus: RefObject<Bus> }) {
  const { geo, mat } = useMemo(() => {
    const n = 1400
    const rng = mulberry32(31)
    const pos = new Float32Array(n * 3)
    const vel = new Float32Array(n * 3)
    const life = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const y = rng() * 9.5
      const r = (y > 7.5 ? 0.7 : y > 3.5 ? 1.8 : 1.2) * Math.sqrt(rng())
      const a = rng() * Math.PI * 2
      pos.set([Math.cos(a) * r, y, Math.sin(a) * r], i * 3)
      vel.set([Math.cos(a) * (0.3 + rng() * 1.6), 0.4 + rng() * 1.8, Math.sin(a) * (0.3 + rng() * 1.6)], i * 3)
      life[i] = 1.6 + rng() * 2.6
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aVel', new THREE.BufferAttribute(vel, 3))
    g.setAttribute('aLife', new THREE.BufferAttribute(life, 1))
    const m = new THREE.ShaderMaterial({
      vertexShader: BURST_VS,
      fragmentShader: EMBER_FS,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uT: { value: -1 }, uPix: { value: 1 } },
    })
    return { geo: g, mat: m }
  }, [])
  useEffect(
    () => () => {
      geo.dispose()
      mat.dispose()
    },
    [geo, mat],
  )
  useFrame((s) => {
    const b = bus.current
    mat.uniforms.uPix.value = s.gl.getPixelRatio()
    mat.uniforms.uT.value = b.boss === 'dead' ? secs() - b.t.dead - 0.2 : -1
  })
  return <points position={[0, 0, BOSS_Z]} geometry={geo} material={mat} frustumCulled={false} />
}

/* ───────────────────────── 3D: ボス(溶解シェーダー付き) ───────────────────────── */

type BossUniforms = { uDissolve: { value: number }; uHit: { value: number } }

const NOISE3 = /* glsl */ `
  float bbHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float bbNoise(vec3 x) {
    vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(bbHash(i), bbHash(i + vec3(1, 0, 0)), f.x), mix(bbHash(i + vec3(0, 1, 0)), bbHash(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(bbHash(i + vec3(0, 0, 1)), bbHash(i + vec3(1, 0, 1)), f.x), mix(bbHash(i + vec3(0, 1, 1)), bbHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
`

/** 鎧の材質。ノイズで穴が広がり、縁が残り火のように光って溶けていく */
function bossMaterial(u: BossUniforms, cape: boolean) {
  const m = new THREE.MeshStandardMaterial({
    color: cape ? '#0d0c10' : '#1a191f',
    metalness: cape ? 0.1 : 0.82,
    roughness: cape ? 0.9 : 0.38,
    flatShading: true,
    side: cape ? THREE.DoubleSide : THREE.FrontSide,
  })
  m.customProgramCacheKey = () => (cape ? 'bb-boss-cape' : 'bb-boss')
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uDissolve = u.uDissolve
    sh.uniforms.uHit = u.uHit
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vBbPos;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvBbPos = (modelMatrix * vec4(transformed, 1.0)).xyz;')
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform float uDissolve;\nuniform float uHit;\nvarying vec3 vBbPos;\n${NOISE3}`)
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        float bbN = bbNoise(vBbPos * 1.4) * 0.65 + bbNoise(vBbPos * 4.3) * 0.35;
        float bbCut = uDissolve * 1.2 - 0.1;
        if (bbN < bbCut) discard;`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float bbEdge = (1.0 - smoothstep(bbCut, bbCut + 0.08, bbN)) * step(0.001, uDissolve);
        totalEmissiveRadiance += vec3(5.0, 1.6, 0.35) * bbEdge + vec3(1.4, 1.2, 1.1) * uHit;`,
      )
  }
  return m
}

/** 2 点を結ぶ円柱(腕・脚) */
function Limb({ from, to, r, material }: { from: [number, number, number]; to: [number, number, number]; r: number; material: THREE.Material }) {
  const { pos, quat, len } = useMemo(() => {
    const a = new THREE.Vector3(...from)
    const b = new THREE.Vector3(...to)
    const d = b.clone().sub(a)
    return { pos: a.clone().add(b).multiplyScalar(0.5), quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()), len: d.length() }
  }, [from, to])
  return (
    <mesh position={pos} quaternion={quat} material={material} castShadow>
      <cylinderGeometry args={[r * 0.85, r, len, 7]} />
    </mesh>
  )
}

const ARM_L: [number, number, number][] = [
  [-1.9, 0, 0],
  [-1.2, -1.4, 0.9],
  [-0.25, -2.2, 1.35],
]
const ARM_R: [number, number, number][] = [
  [1.9, 0, 0],
  [1.2, -1.4, 0.9],
  [0.25, -2.2, 1.35],
]

function BossModel({ bus, reduced }: { bus: RefObject<Bus>; reduced: boolean }) {
  const uni = useMemo<BossUniforms>(() => ({ uDissolve: { value: 1 }, uHit: { value: 0 } }), [])
  const mat = useMemo(() => bossMaterial(uni, false), [uni])
  const capeMat = useMemo(() => bossMaterial(uni, true), [uni])
  const eyeMat = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(7, 2, 0.4), transparent: true }), [])
  const tipMat = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 1, 0.25), transparent: true }), [])
  const runeMat = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.6, 0.12), transparent: true }), [])
  const crownMat = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.16, 0.05), transparent: true }), [])
  const capeGeo = useMemo(() => new THREE.PlaneGeometry(3.8, 6.8, 6, 14), [])
  const capeBase = useMemo(() => Float32Array.from(capeGeo.attributes.position.array), [capeGeo])
  const root = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const rig = useRef<THREE.Group>(null)
  const shock = useRef<THREE.Mesh>(null)
  const angle = useRef(0)
  useEffect(
    () => () => {
      for (const m of [mat, capeMat, eyeMat, tipMat, runeMat, crownMat]) m.dispose()
      capeGeo.dispose()
    },
    [mat, capeMat, eyeMat, tipMat, runeMat, crownMat, capeGeo],
  )

  useFrame((state, dt) => {
    const b = bus.current
    const t = secs()
    // 出現(1→0)・撃破(0→1)の溶解
    let d = 1
    if (b.boss === 'entering') d = 1 - clamp01((t - b.t.enter) / (reduced ? 0.4 : 2.2))
    else if (b.boss === 'active') d = 0
    else if (b.boss === 'dead') d = clamp01((t - b.t.dead) / (reduced ? 0.6 : 2.8))
    uni.uDissolve.value = d
    uni.uHit.value = Math.max(0, 1 - (t - b.t.hit) / 0.2)
    if (root.current) {
      root.current.visible = d < 0.999
      root.current.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) o.castShadow = d < 0.05
      })
      root.current.position.y = b.boss === 'entering' && !reduced ? -1.2 * d : 0
    }
    const fade = 1 - clamp01(d * 3)
    eyeMat.opacity = fade
    tipMat.opacity = fade
    runeMat.opacity = fade
    crownMat.opacity = fade
    const eyeK = b.telegraph ? 11 : 6
    eyeMat.color.setRGB(eyeK, eyeK * 0.28, eyeK * 0.06)

    // 剣: 予備動作で振り上げ → 振り下ろし(行き過ぎてから戻る)
    const since = t - b.t.strike
    let target = b.telegraph ? -2.35 : 0
    if (since >= 0 && since < 0.8) {
      const from = -2.35
      if (since < 0.14) target = from + (0.18 - from) * easeOut(since / 0.14)
      else target = 0.18 * (1 - easeOut((since - 0.14) / 0.66))
      angle.current = target
    } else angle.current += (target - angle.current) * Math.min(1, dt * (b.telegraph ? 5 : 3))
    if (rig.current) rig.current.rotation.x = reduced ? (b.telegraph ? -0.6 : 0) : angle.current

    // 被弾でのけぞり、呼吸
    const hitK = Math.max(0, 1 - (t - b.t.hit) / 0.3)
    if (body.current) {
      body.current.rotation.x = reduced ? 0 : -hitK * 0.05
      body.current.scale.y = 1 + (reduced ? 0 : Math.sin(state.clock.elapsedTime * 1.4) * 0.008)
    }
    // 衝撃波
    if (shock.current) {
      const k = (since - 0.13) / 0.55
      shock.current.visible = k > 0 && k < 1
      shock.current.scale.setScalar(1 + easeOut(clamp01(k)) * 12)
      ;(shock.current.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - clamp01(k))
    }
    // マントのはためき(頂点を直接更新)
    if (!reduced) {
      const p = capeGeo.attributes.position as THREE.BufferAttribute
      const et = state.clock.elapsedTime
      for (let i = 0; i < p.count; i++) {
        const x = capeBase[i * 3]
        const y = capeBase[i * 3 + 1]
        const k = (3.4 - y) / 6.8
        p.setZ(i, capeBase[i * 3 + 2] - k * k * 0.9 + Math.sin(y * 0.9 + et * 1.7 + x * 0.6) * 0.22 * k)
      }
      p.needsUpdate = true
    }
  })

  return (
    <group position={[0, 0, BOSS_Z]}>
      <group ref={root}>
        <group ref={body}>
          <Limb from={[-0.9, 3.4, 0]} to={[-1.15, 0.2, 0.25]} r={0.62} material={mat} />
          <Limb from={[0.9, 3.4, 0]} to={[1.2, 0.2, -0.2]} r={0.62} material={mat} />
          <mesh position={[0, 3.4, 0]} material={mat} castShadow>
            <cylinderGeometry args={[1.35, 2.25, 2.6, 8]} />
          </mesh>
          <mesh position={[0, 5.8, 0]} material={mat} castShadow>
            <cylinderGeometry args={[1.95, 1.3, 3.2, 6]} />
          </mesh>
          <mesh position={[0, 5.9, 0.95]} rotation-x={-0.12} material={mat}>
            <boxGeometry args={[1.6, 2.2, 0.5]} />
          </mesh>
          <mesh position={[0, 4.3, -1.25]} geometry={capeGeo} material={capeMat} castShadow />
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 2.05, 7.05, 0]}>
              <mesh scale={[1.25, 0.9, 1.15]} material={mat} castShadow>
                <sphereGeometry args={[1, 8, 6]} />
              </mesh>
              {[0, 1, 2].map((k) => (
                <group key={k} position={[s * (0.2 + k * 0.32), 0.7 - k * 0.12, -0.3 + k * 0.3]} rotation-z={-s * (0.35 + k * 0.25)}>
                  <mesh position-y={0.55} material={mat}>
                    <coneGeometry args={[0.22, 1.2, 5]} />
                  </mesh>
                </group>
              ))}
            </group>
          ))}
          {/* 兜と灰の冠 */}
          <mesh position={[0, 8.15, 0.1]} material={mat} castShadow>
            <cylinderGeometry args={[0.55, 0.65, 1.3, 8]} />
          </mesh>
          <mesh position={[0, 8.85, 0.1]} material={mat}>
            <sphereGeometry args={[0.56, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          {Array.from({ length: 9 }, (_, i) => {
            const a = (i / 9) * Math.PI * 2
            const h = i % 2 ? 0.9 : 1.5
            return (
              <group key={i} position={[Math.sin(a) * 0.5, 8.7 + h / 2, 0.1 + Math.cos(a) * 0.5]} rotation={[Math.cos(a) * 0.3, 0, -Math.sin(a) * 0.3]}>
                <mesh material={crownMat}>
                  <coneGeometry args={[0.17, h, 4]} />
                </mesh>
                <mesh position-y={h / 2 - 0.08} material={tipMat}>
                  <coneGeometry args={[0.05, 0.18, 4]} />
                </mesh>
              </group>
            )
          })}
          {[-0.2, 0.2].map((x) => (
            <mesh key={x} position={[x, 8.25, 0.7]} rotation-z={x > 0 ? -0.18 : 0.18} material={eyeMat}>
              <boxGeometry args={[0.26, 0.06, 0.05]} />
            </mesh>
          ))}
          {/* 腕と大剣(肩を支点に振り上げる) */}
          <group ref={rig} position={[0, 6.9, 0.25]}>
            <Limb from={ARM_L[0]} to={ARM_L[1]} r={0.48} material={mat} />
            <Limb from={ARM_L[1]} to={ARM_L[2]} r={0.42} material={mat} />
            <Limb from={ARM_R[0]} to={ARM_R[1]} r={0.48} material={mat} />
            <Limb from={ARM_R[1]} to={ARM_R[2]} r={0.42} material={mat} />
            <group position={[0, -2.2, 1.4]} rotation-x={0.16}>
              <mesh material={mat}>
                <sphereGeometry args={[0.5, 7, 5]} />
              </mesh>
              <mesh position-y={0.55} material={mat}>
                <boxGeometry args={[0.18, 1.1, 0.18]} />
              </mesh>
              <mesh position-y={-0.5} material={mat}>
                <boxGeometry args={[1.9, 0.2, 0.32]} />
              </mesh>
              <mesh position-y={-3.1} material={mat} castShadow>
                <boxGeometry args={[0.5, 5.0, 0.11]} />
              </mesh>
              <mesh position={[0, -3.0, 0.06]} material={runeMat}>
                <boxGeometry args={[0.07, 4.2, 0.02]} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
      <mesh ref={shock} rotation-x={-Math.PI / 2} position={[0, 0.06, 3]} visible={false}>
        <ringGeometry args={[0.8, 1, 48]} />
        <meshBasicMaterial color={new THREE.Color(3, 1.1, 0.3)} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

/* ───────────────────────── 3D: 自キャラ(背後から) ───────────────────────── */

function PlayerModel({ bus, reduced }: { bus: RefObject<Bus>; reduced: boolean }) {
  const root = useRef<THREE.Group>(null)
  const swing = useRef<THREE.Group>(null)
  const slash = useRef<THREE.Mesh>(null)
  const glow = useRef<THREE.PointLight>(null)
  const cloth = useMemo(() => new THREE.MeshStandardMaterial({ color: '#16141a', roughness: 0.85, flatShading: true }), [])
  const steel = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8d8f99', metalness: 0.9, roughness: 0.28 }), [])
  // 斬撃の軌跡: 先端ほど明るく、後ろへ細く消える三日月
  const slashMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `
          uniform float uOpacity;
          uniform vec3 uColor;
          varying vec2 vP;
          void main() {
            float t = clamp((atan(vP.y, vP.x) + 0.5) / 2.5, 0.0, 1.0);
            float head = pow(1.0 - t, 1.4);
            float w = 0.03 + 0.15 * head;
            float radial = clamp(1.0 - abs(length(vP) - 1.42) / w, 0.0, 1.0);
            float alpha = radial * radial * head * uOpacity;
            gl_FragColor = vec4(uColor * (1.0 + radial * head * 1.5), alpha);
          }`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: { uOpacity: { value: 0 }, uColor: { value: new THREE.Color(3, 3, 3) } },
      }),
    [],
  )
  useEffect(
    () => () => {
      cloth.dispose()
      steel.dispose()
      slashMat.dispose()
    },
    [cloth, steel, slashMat],
  )
  useFrame((state) => {
    const b = bus.current
    const t = secs()
    const g = root.current
    if (!g) return
    // 回避: 左へ転がってから戻る
    const ds = (t - b.t.dodge) / 0.8
    let x = 0
    let roll = 0
    if (ds >= 0 && ds < 1 && !reduced) {
      x = ds < 0.4 ? -2.3 * easeOut(ds / 0.4) : ds < 0.65 ? -2.3 : -2.3 * (1 - easeOut((ds - 0.65) / 0.35))
      roll = ds < 0.5 ? Math.sin((ds / 0.5) * Math.PI) : 0
    }
    // 攻撃: 踏み込み
    const as = (t - b.t.attack) / 0.34
    const lunge = as >= 0 && as < 1 && !reduced ? Math.sin(as * Math.PI) * 0.7 : 0
    // 被弾 / 倒れる
    const hs = Math.max(0, 1 - (t - b.t.hurt) / 0.35)
    const down = b.defeated ? clamp01((t - b.t.down) / (reduced ? 0.01 : 1.2)) : 0
    g.position.set(x, -down * 0.4 + (reduced ? 0 : Math.sin(state.clock.elapsedTime * 1.6) * 0.015), -lunge + hs * 0.35)
    g.rotation.set(down * -1.2 + hs * 0.15, 0, roll * 0.6)
    g.scale.set(1, 1 - roll * 0.3, 1)
    b.playerX = x
    if (swing.current) {
      const k = as >= 0 && as < 1 ? easeOut(Math.min(1, as * 1.6)) : 1
      swing.current.rotation.y = as >= 0 && as < 1 ? 1.4 - k * 3 : 0
      swing.current.rotation.x = as >= 0 && as < 1 ? 1.45 : 0.35
    }
    if (slash.current) {
      const k = (t - b.t.attack) / 0.38
      slash.current.visible = k > 0.05 && k < 1
      slashMat.uniforms.uOpacity.value = 1 - clamp01(k)
      ;(slashMat.uniforms.uColor.value as THREE.Color).setRGB(b.crit ? 4 : 2.6, b.crit ? 2.2 : 2.7, b.crit ? 0.7 : 3)
      slash.current.rotation.z = 0.5 - easeOut(clamp01(k * 1.5)) * 0.9
    }
    if (glow.current) {
      const hk = (t - b.t.heal) / 1.2
      glow.current.intensity = hk > 0 && hk < 1 ? Math.sin(hk * Math.PI) * 14 : 0
    }
  })
  return (
    <group ref={root}>
      <Limb from={[-0.2, 0.95, 0]} to={[-0.26, 0.05, 0.05]} r={0.13} material={cloth} />
      <Limb from={[0.2, 0.95, 0]} to={[0.28, 0.05, -0.08]} r={0.13} material={cloth} />
      <mesh position-y={1.15} material={cloth} castShadow>
        <cylinderGeometry args={[0.34, 0.68, 1.45, 7]} />
      </mesh>
      <mesh position-y={1.8} scale={[1.25, 0.6, 0.9]} material={cloth} castShadow>
        <sphereGeometry args={[0.38, 8, 6]} />
      </mesh>
      <mesh position-y={2.08} material={cloth}>
        <sphereGeometry args={[0.2, 8, 6]} />
      </mesh>
      <mesh position-y={2.16} material={cloth} castShadow>
        <coneGeometry args={[0.27, 0.52, 7]} />
      </mesh>
      <mesh position={[-0.55, 1.35, -0.12]} rotation={[0, -0.5, Math.PI / 2]} material={steel} castShadow>
        <cylinderGeometry args={[0.42, 0.42, 0.07, 10]} />
      </mesh>
      <group position={[0.48, 1.25, -0.12]}>
        <group ref={swing}>
          <mesh position-y={-0.68} material={steel} castShadow>
            <boxGeometry args={[0.07, 1.15, 0.02]} />
          </mesh>
          <mesh position-y={-0.08} material={cloth}>
            <boxGeometry args={[0.32, 0.06, 0.06]} />
          </mesh>
        </group>
      </group>
      <mesh ref={slash} position={[0.1, 1.55, -1.1]} rotation-x={-0.35} visible={false} material={slashMat}>
        <ringGeometry args={[1.22, 1.62, 48, 1, -0.5, 2.5]} />
      </mesh>
      <pointLight ref={glow} position={[0, 1.6, 0.4]} color="#ffae4a" intensity={0} distance={7} decay={2} />
    </group>
  )
}

/* ───────────────────────── 3D: カメラとポストエフェクト ───────────────────────── */

function CameraRig({ bus, reduced, caRef }: { bus: RefObject<Bus>; reduced: boolean; caRef: RefObject<THREE.Vector2> }) {
  const look = useMemo(() => new THREE.Vector3(), [])
  const camX = useRef(0)
  useFrame((state, dt) => {
    const b = bus.current
    const t = secs()
    const cam = state.camera as THREE.PerspectiveCamera
    // 画面が縦長になったら少し引く
    const back = Math.max(0, 1.6 - cam.aspect) * 3.2
    const enterK = b.boss === 'entering' ? 1 - easeOut(clamp01((t - b.t.enter) / 2.4)) : 0
    camX.current += (b.playerX * 0.45 - camX.current) * Math.min(1, dt * 5)
    let amp = 0
    const ss = t - b.t.strike - 0.13
    if (ss > 0 && ss < 0.6) amp += (1 - ss / 0.6) * 0.38
    const hs = t - b.t.hurt
    if (hs > 0 && hs < 0.4) amp += (1 - hs / 0.4) * 0.12
    const ks = t - b.t.hit
    if (ks > 0 && ks < 0.15) amp += (b.crit ? 0.1 : 0.04) * (1 - ks / 0.15)
    const dd = t - b.t.dead
    if (b.boss === 'dead' && dd > 0 && dd < 2.4) amp += 0.05 * (1 - dd / 2.4)
    if (reduced) amp = 0
    const e = state.clock.elapsedTime
    const sx = Math.sin(e * 47) * amp
    const sy = Math.cos(e * 39) * amp * 0.8
    const sway = reduced ? 0 : Math.sin(e * 0.35) * 0.08
    cam.position.set(1.5 + camX.current + sx + sway, 2.85 + sy + back * 0.35, 6.4 + back + enterK * 2.4)
    look.set(0.2 + camX.current * 0.4 + sx * 0.3, 3.5 + back * 0.15, -12)
    cam.lookAt(look)
    if (caRef.current) {
      const k = hs > 0 && hs < 0.45 && !reduced ? 1 - hs / 0.45 : 0
      caRef.current.set(0.0006 + k * 0.006, 0.0004 + k * 0.004)
    }
  })
  return null
}

function KeepWorld({ bus, reduced }: { bus: RefObject<Bus>; reduced: boolean }) {
  const ca = useMemo(() => new THREE.Vector2(0.0006, 0.0004), [])
  const caRef = useRef(ca)
  const fog = useRef<THREE.FogExp2>(null)
  useFrame((_, dt) => {
    const b = bus.current
    const target = b.boss === 'entering' ? 0.055 : b.boss === 'dead' ? 0.028 : 0.034
    if (fog.current) fog.current.density += (target - fog.current.density) * Math.min(1, dt * 1.2)
  })
  return (
    <>
      <color attach="background" args={['#07070b']} />
      <fogExp2 ref={fog} attach="fog" args={['#12131c', 0.034]} />
      <NightSky />
      <hemisphereLight args={['#39405e', '#0b0a0c', 0.55]} />
      <directionalLight
        position={[26, 34, -60]}
        intensity={1.6}
        color="#9fb3e6"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-camera-far={140}
      />
      <directionalLight position={[-6, 8, 12]} intensity={0.3} color="#ffb27a" />
      <directionalLight position={[8, 14, 20]} intensity={0.55} color="#7f8fc0" />
      <Moon />
      <Ground />
      <Keep />
      <Brazier x={-4.6} z={-19} reduced={reduced} />
      <Brazier x={4.6} z={-19} reduced={reduced} />
      <BossModel bus={bus} reduced={reduced} />
      <DeathBurst bus={bus} />
      <PlayerModel bus={bus} reduced={reduced} />
      <FogSheets reduced={reduced} />
      <Embers reduced={reduced} />
      <CameraRig bus={bus} reduced={reduced} caRef={caRef} />
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur intensity={1.15} luminanceThreshold={0.9} luminanceSmoothing={0.2} radius={0.75} />
        <ChromaticAberration offset={ca} radialModulation={false} modulationOffset={0} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.18} />
        <Vignette offset={0.22} darkness={0.9} />
      </EffectComposer>
    </>
  )
}

/* ───────────────────────── HUD パーツ ───────────────────────── */

function Slot({ icon: Icon, className = '', count, glow, label }: { icon: LucideIcon; className?: string; count?: number; glow?: boolean; label: string }) {
  return (
    <div
      className={`relative grid size-9 place-items-center border bg-gradient-to-b from-[#1c1a20]/90 to-[#09090b]/90 shadow-[inset_0_0_12px_#000] transition-[border-color,box-shadow] duration-300 @min-[44rem]:size-11 ${glow ? 'border-[#f0b45a] shadow-[0_0_16px_#f59e0b88,inset_0_0_12px_#000]' : 'border-[#cbb98f]/35'} ${className}`}
      aria-label={count === undefined ? label : `${label} 残り ${count}`}
      role="img"
    >
      <Icon size={18} strokeWidth={1.5} className={count === 0 ? 'text-[#d8c9a3]/25' : glow ? 'text-[#ffd08a]' : 'text-[#d8c9a3]/85'} aria-hidden="true" />
      {count !== undefined && (
        <span className={`absolute right-0.5 bottom-0 font-['Playfair_Display'] text-[11px] leading-none tabular-nums ${count === 0 ? 'text-[#a33]' : 'text-[#efe6cf]'}`}>{count}</span>
      )}
    </div>
  )
}

function ActionButton({ label, hint, icon: Icon, disabled, onClick, sub }: { label: string; hint: string; icon: LucideIcon; disabled?: boolean; onClick: () => void; sub?: string }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`group flex w-[82px] items-center gap-1.5 border border-[#cbb98f]/30 bg-[#0a090c]/70 px-2 py-1.5 text-left text-[#e9e2d0] backdrop-blur-[2px] transition-colors hover:border-[#e8c98a]/80 hover:bg-[#1c140b]/80 focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[#e8c98a] active:bg-[#2a1b0c] disabled:cursor-not-allowed disabled:opacity-35 @min-[44rem]:w-28 ${SERIF}`}
    >
      <Icon size={14} strokeWidth={1.6} className="shrink-0 text-[#d8b878]" aria-hidden="true" />
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block text-[12px] tracking-[0.15em]">{label}</span>
        {sub && <span className="block font-sans text-[9px] tracking-normal text-[#cbb98f]/70">{sub}</span>}
      </span>
      <kbd className="hidden font-['JetBrains_Mono'] text-[9px] text-[#cbb98f]/60 @min-[44rem]:inline">{hint}</kbd>
    </button>
  )
}

/* ───────────────────────── 本体 ───────────────────────── */

export function BossBattleHud() {
  const reduced = useReducedMotion() ?? false
  const bus = useRef<Bus>(newBus())
  const [hp, hpRef, setHp] = useSynced(P_HP)
  const [hpTrail, setHpTrail] = useState(P_HP)
  const [flasks, flasksRef, setFlasks] = useSynced(FLASKS)
  const [boss, bossRef, setBoss] = useSynced<BossState>('none')
  const [bossHp, bossHpRef, setBossHp] = useSynced(B_HP)
  const [bossTrail, setBossTrail] = useState(B_HP)
  const [barVisible, setBarVisible] = useState(false)
  const [counter, setCounter] = useState<{ value: number; id: number } | null>(null)
  const [result, resultRef, setResult] = useSynced<Result>(null)
  const [drinking, drinkingRef, setDrinking] = useSynced(false)
  const [telegraph, setTelegraph] = useState(false)
  const [area, setArea] = useState<number | null>(1)
  const [fx, setFx] = useState<{ id: number; kind: FxKind }[]>([])
  const [staminaOut, setStaminaOut] = useState(0)

  const stamina = useMotionValue(100)
  const staminaWidth = useTransform(stamina, (v) => `${v}%`)
  const shards = useMotionValue(28460)
  const shardsText = useTransform(shards, (v) => Math.round(v).toLocaleString('ja-JP'))

  const timers = useRef(new Set<number>())
  const uid = useRef(0)
  const lastAct = useRef(0)
  const lastUse = useRef(0)
  const iframeUntil = useRef(0)
  const regenRaf = useRef(0)
  const hpTrailTimer = useRef(0)
  const bossTrailTimer = useRef(0)
  const counterTimer = useRef(0)

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

  // エリア名は進入直後にしばらく表示してから消える
  useEffect(() => {
    if (area === null) return
    const id = window.setTimeout(() => setArea(null), 4600)
    return () => window.clearTimeout(id)
  }, [area])

  useEffect(
    () => () => {
      clearAll()
      cancelAnimationFrame(regenRaf.current)
    },
    [clearAll],
  )

  /* スタミナ: 使用後 0.6 秒待ってから回復。React の再描画なしで MotionValue を更新する */
  const regen = () => {
    if (regenRaf.current) return
    let prev = performance.now()
    const step = (now: number) => {
      const dt = (now - prev) / 1000
      prev = now
      if (now - lastUse.current > 600) stamina.set(Math.min(100, stamina.get() + dt * 40))
      regenRaf.current = stamina.get() < 100 ? requestAnimationFrame(step) : 0
    }
    regenRaf.current = requestAnimationFrame(step)
  }
  const spend = (cost: number) => {
    if (stamina.get() < 1) {
      setStaminaOut((n) => n + 1)
      return false
    }
    stamina.set(Math.max(0, stamina.get() - cost))
    lastUse.current = performance.now()
    regen()
    return true
  }

  const pushFx = (kind: FxKind, ms: number) => {
    const id = ++uid.current
    setFx((f) => [...f.slice(-4), { id, kind }])
    later(() => setFx((f) => f.filter((x) => x.id !== id)), ms)
  }

  const canAct = () => resultRef.current !== 'defeat' && !drinkingRef.current

  const bossDefeated = () => {
    setBoss('dead')
    setTelegraph(false)
    bus.current.t.dead = secs()
    later(() => setBossTrail(0), 250)
    later(() => setBarVisible(false), 1400)
    later(() => setResult('victory'), 1500)
    later(() => animate(shards, shards.get() + 12000, { duration: reduced ? 0 : 2.4, ease: 'easeOut' }), 2600)
    later(() => {
      if (resultRef.current === 'victory') setResult(null)
    }, 7600)
  }

  const attack = () => {
    if (!canAct()) return
    const now = performance.now()
    if (now - lastAct.current < 380) return
    lastAct.current = now
    if (!spend(22)) return
    bus.current.t.attack = secs()
    bus.current.crit = false
    if (bossRef.current !== 'active') return
    const crit = Math.random() < 0.16
    const dmg = Math.round((150 + Math.random() * 90) * (crit ? 1.75 : 1))
    const next = Math.max(0, bossHpRef.current - dmg)
    setBossHp(next)
    cancel(bossTrailTimer.current)
    bossTrailTimer.current = later(() => setBossTrail(bossHpRef.current), 950)
    setCounter((c) => ({ value: (c?.value ?? 0) + dmg, id: ++uid.current }))
    cancel(counterTimer.current)
    counterTimer.current = later(() => setCounter(null), 1800)
    bus.current.crit = crit
    bus.current.t.hit = secs() + 0.08
    if (next === 0) bossDefeated()
  }

  const dodge = () => {
    if (!canAct()) return
    const now = performance.now()
    if (now - lastAct.current < 300) return
    lastAct.current = now
    if (!spend(18)) return
    iframeUntil.current = now + 520
    bus.current.t.dodge = secs()
  }

  const heal = () => {
    if (!canAct() || flasksRef.current <= 0) return
    setFlasks(flasksRef.current - 1)
    setDrinking(true)
    bus.current.t.heal = secs()
    later(() => {
      if (resultRef.current === 'defeat') return
      const next = Math.min(P_HP, hpRef.current + 420)
      setHp(next)
      setHpTrail(next)
    }, 650)
    later(() => setDrinking(false), 1100)
  }

  const summon = () => {
    if (bossRef.current === 'entering' || bossRef.current === 'active' || resultRef.current === 'defeat') return
    if (resultRef.current === 'victory') setResult(null)
    setBossHp(B_HP)
    setBossTrail(B_HP)
    setCounter(null)
    setBoss('entering')
    setBarVisible(true)
    bus.current.t.enter = secs()
    later(() => {
      setBoss('active')
    }, reduced ? 400 : 2200)
  }

  const bossStrike = () => {
    if (bossRef.current !== 'active' || resultRef.current) return
    bus.current.t.strike = secs()
    if (performance.now() < iframeUntil.current) {
      pushFx('evade', 800)
      return
    }
    const enraged = bossHpRef.current < B_HP / 2
    const dmg = Math.round((150 + Math.random() * 110) * (enraged ? 1.3 : 1))
    const next = Math.max(0, hpRef.current - dmg)
    setHp(next)
    cancel(hpTrailTimer.current)
    hpTrailTimer.current = later(() => setHpTrail(hpRef.current), 800)
    pushFx('hurt', 650)
    bus.current.t.hurt = secs() + 0.12
    if (next === 0) {
      setResult('defeat')
      setTelegraph(false)
      bus.current.defeated = true
      bus.current.t.down = secs() + 0.3
    }
  }

  // 3D 側が読む状態を同期
  useLayoutEffect(() => {
    bus.current.boss = boss
    bus.current.telegraph = telegraph
  }, [boss, telegraph])

  const latest = useRef({ bossStrike })
  useLayoutEffect(() => {
    latest.current = { bossStrike }
  })

  // ボスの攻撃ループ: 予備動作(赤い気配)→ 攻撃
  useEffect(() => {
    if (boss !== 'active' || result) return
    let t1 = 0
    let t2 = 0
    const schedule = () => {
      const enraged = bossHpRef.current < B_HP / 2
      t1 = window.setTimeout(() => {
        setTelegraph(true)
        t2 = window.setTimeout(() => {
          setTelegraph(false)
          latest.current.bossStrike()
          schedule()
        }, enraged ? 560 : 780)
      }, (enraged ? 1500 : 2200) + Math.random() * 1500)
    }
    schedule()
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      setTelegraph(false)
    }
  }, [boss, result, bossHpRef])

  const retry = () => {
    clearAll()
    setHp(P_HP)
    setHpTrail(P_HP)
    stamina.set(100)
    setFlasks(FLASKS)
    setBoss('none')
    setBossHp(B_HP)
    setBossTrail(B_HP)
    setBarVisible(false)
    setCounter(null)
    setResult(null)
    setDrinking(false)
    setFx([])
    bus.current = newBus()
    setArea((a) => (a ?? 0) + 1)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const k = e.key.toLowerCase()
    const map: Record<string, () => void> = { j: attack, k: dodge, h: heal, b: summon }
    if (map[k]) {
      e.preventDefault()
      if (!e.repeat) map[k]()
    } else if (k === 'enter' && e.target === e.currentTarget && resultRef.current === 'defeat') {
      e.preventDefault()
      retry()
    } else if (k.startsWith('arrow')) e.preventDefault()
  }

  const bossShown = boss === 'entering' || boss === 'active'
  const hpPct = (hp / P_HP) * 100

  return (
    <div
      className="@container relative h-full w-full overflow-hidden bg-[#060608] text-[#e9e2d0] outline-none select-none focus-visible:ring-1 focus-visible:ring-[#e8c98a]/60 focus-visible:ring-inset"
      tabIndex={0}
      role="group"
      onKeyDown={onKeyDown}
      aria-label="ダークファンタジーのボス戦 HUD デモ。J 攻撃、K 回避、H 回復、B ボス出現"
    >
      {/* ── 3D の世界 ── */}
      <div
        className="absolute inset-0"
        style={{ filter: result === 'defeat' ? 'grayscale(0.85) brightness(0.6)' : 'none', transition: 'filter 1.6s ease' }}
      >
        <Canvas
          dpr={[1, 1.75]}
          shadows
          camera={{ fov: 46, near: 0.1, far: 400, position: [1.15, 2.6, 5.6] }}
          gl={{ antialias: false, powerPreference: 'high-performance' }}
          aria-hidden="true"
        >
          <KeepWorld bus={bus} reduced={reduced} />
        </Canvas>
      </div>
      <AnimatePresence>
        {fx
          .filter((f) => f.kind === 'evade')
          .map((f) => (
            <motion.div
              key={f.id}
              className={`pointer-events-none absolute bottom-[40%] left-[36%] text-sm tracking-[0.4em] text-[#efe6cf] [text-shadow:0_0_10px_#000] ${SERIF}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: [0, 1, 0], y: -14 }}
              transition={{ duration: 0.8 }}
            >
              回避
            </motion.div>
          ))}
      </AnimatePresence>

      {/* 周辺減光 + 予備動作の赤い気配 + 被弾フラッシュ */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,transparent_45%,#000000cc_100%)]" />
      <AnimatePresence>
        {telegraph && (
          <motion.div
            key="tele"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,transparent_40%,#7f1d1d88_100%)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {fx
          .filter((f) => f.kind === 'hurt')
          .map((f) => (
            <motion.div
              key={f.id}
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,#b91c1c99_100%)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
            />
          ))}
      </AnimatePresence>

      {/* ── 左上: 体力・集中力・スタミナ ── */}
      <div className="absolute top-3 left-3 z-10 w-[min(360px,56%)] space-y-[5px] @min-[44rem]:top-5 @min-[44rem]:left-6">
        <div className="relative h-[7px] border border-[#d8c9a3]/35 bg-black/70 shadow-[0_0_0_1px_#000]" role="meter" aria-label="体力" aria-valuemin={0} aria-valuemax={P_HP} aria-valuenow={hp}>
          <div className="absolute inset-y-0 left-0 bg-[#e9c98a] transition-[width] duration-500 ease-out" style={{ width: `${(Math.max(hpTrail, hp) / P_HP) * 100}%` }} />
          <div
            className={`absolute inset-y-0 left-0 bg-gradient-to-b from-[#c8323a] to-[#6a0f15] ${hpPct <= 25 && hp > 0 ? 'motion-safe:animate-pulse' : ''}`}
            style={{ width: `${hpPct}%`, transition: drinking ? 'width .6s ease-out' : 'width 80ms linear' }}
          />
        </div>
        <div className="relative h-[7px] w-[72%] border border-[#d8c9a3]/35 bg-black/70 shadow-[0_0_0_1px_#000]" role="meter" aria-label="集中力" aria-valuemin={0} aria-valuemax={100} aria-valuenow={68}>
          <div className="absolute inset-y-0 left-0 w-[68%] bg-gradient-to-b from-[#4f73e0] to-[#1b2f7a]" />
        </div>
        <div className="relative h-[7px] w-[84%] border border-[#d8c9a3]/35 bg-black/70 shadow-[0_0_0_1px_#000]" role="meter" aria-label="スタミナ" aria-valuemin={0} aria-valuemax={100}>
          <motion.div className="absolute inset-y-0 left-0 bg-gradient-to-b from-[#5aa64d] to-[#23511c]" style={{ width: staminaWidth }} />
          <AnimatePresence>
            {staminaOut > 0 && (
              <motion.div key={staminaOut} className="absolute inset-0 bg-[#ff5050]/70" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.5 }} />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── 左下: 装備スロット ── */}
      <div className="absolute bottom-3 left-3 z-10 @min-[44rem]:bottom-6 @min-[44rem]:left-6">
        <div className="grid grid-cols-3 gap-1">
          <Slot icon={Flame} label="術: 残り火" className="col-start-2" />
          <Slot icon={Shield} label="左手: 黒鉄の盾" className="col-start-1 row-start-2" />
          <div className="col-start-2 row-start-2 grid place-items-center">
            <span className="size-2 rotate-45 border border-[#cbb98f]/50" />
          </div>
          <Slot icon={Sword} label="右手: 灰の長剣" className="col-start-3 row-start-2" />
          <Slot icon={FlaskConical} label="琥珀の霊薬" className="col-start-2 row-start-3" count={flasks} glow={drinking} />
        </div>
        <p className={`mt-1 text-center text-[10px] tracking-[0.2em] text-[#d8c9a3]/80 ${SERIF}`}>琥珀の霊薬</p>
      </div>

      {/* ── 右下: 所持している灰片 ── */}
      <div className={`absolute right-4 bottom-[calc(var(--solo-footer-clearance,0px)+1rem)] z-10 hidden items-center gap-2 border-y border-[#cbb98f]/25 bg-gradient-to-r from-transparent via-black/60 to-black/60 py-1 pr-1 pl-6 @min-[44rem]:flex ${SERIF}`}>
        <span className="size-2 rotate-45 bg-[#e9c98a] shadow-[0_0_8px_#f59e0b]" aria-hidden="true" />
        <motion.span className="min-w-[4.5rem] text-right text-sm tracking-wider tabular-nums">{shardsText}</motion.span>
      </div>

      {/* ── 下部: ボス名と体力バー ── */}
      <AnimatePresence>
        {barVisible && (
          <motion.div
            key="bossbar"
            className="absolute right-3 bottom-[var(--solo-footer-clearance,0.75rem)] left-[136px] z-10 @min-[44rem]:right-auto @min-[44rem]:bottom-7 @min-[44rem]:left-1/2 @min-[44rem]:w-[56%] @min-[44rem]:-translate-x-1/2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 1.4, delay: reduced ? 0 : 0.6 } }}
            exit={{ opacity: 0, transition: { duration: 1 } }}
          >
            <div className="mb-1 flex items-end justify-between gap-2">
              <span className={`truncate text-[13px] tracking-[0.12em] text-[#efe6cf] [text-shadow:0_1px_4px_#000] @min-[44rem]:text-[15px] ${SERIF}`}>{BOSS_NAME}</span>
              <AnimatePresence>
                {counter && (
                  <motion.span
                    key="counter"
                    className={`shrink-0 text-[14px] text-[#f4ead2] tabular-nums [text-shadow:0_1px_4px_#000] ${SERIF}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.5 } }}
                  >
                    <motion.span key={counter.id} className="inline-block" initial={reduced ? false : { scale: 1.25 }} animate={{ scale: 1 }}>
                      {counter.value.toLocaleString('ja-JP')}
                    </motion.span>
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <div className="relative h-[7px] border border-[#cbb98f]/40 bg-black/75 shadow-[0_0_0_1px_#000]" role="meter" aria-label={`${BOSS_NAME} の体力`} aria-valuemin={0} aria-valuemax={B_HP} aria-valuenow={bossHp}>
              <div className="absolute inset-y-0 left-0 bg-[#f1e7d0] transition-[width] duration-700 ease-out" style={{ width: `${(Math.max(bossTrail, bossHp) / B_HP) * 100}%` }} />
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-b from-[#b4232a] to-[#550a10]"
                initial={reduced ? false : { width: '0%' }}
                animate={{ width: `${(bossHp / B_HP) * 100}%` }}
                transition={boss === 'entering' ? { duration: 1.6, delay: 0.9, ease: 'easeOut' } : { duration: 0.08 }}
              />
              <div className="absolute inset-x-0 top-0 h-px bg-white/15" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 右: デモ操作 ── */}
      <div className="absolute top-1/2 right-2 z-20 flex -translate-y-1/2 flex-col gap-1.5 @min-[44rem]:right-5" role="group" aria-label="操作">
        <ActionButton label="攻撃" hint="J" icon={Sword} onClick={attack} disabled={result === 'defeat'} />
        <ActionButton label="回避" hint="K" icon={Wind} onClick={dodge} disabled={result === 'defeat'} />
        <ActionButton label="回復" hint="H" icon={FlaskConical} sub={`残り ${flasks}`} onClick={heal} disabled={result === 'defeat' || flasks === 0 || drinking} />
        <ActionButton
          label={boss === 'dead' ? '再戦' : 'ボス出現'}
          hint="B"
          icon={Skull}
          onClick={summon}
          disabled={bossShown || result === 'defeat'}
        />
      </div>

      {/* ── エリア名 ── */}
      <AnimatePresence>
        {area !== null && (
          <motion.div
            key={area}
            className="pointer-events-none absolute inset-x-0 top-[30%] z-20 px-4 text-center"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: reduced ? 0.3 : 1.8 } }}
          >
            <motion.div
              className="mx-auto h-px w-[min(440px,72%)] bg-gradient-to-r from-transparent via-[#d9c79c] to-transparent"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: reduced ? 0.2 : 2, ease: 'easeOut' }}
            />
            <h3 className={`my-2 text-[clamp(26px,6.5cqw,56px)] leading-tight tracking-[0.32em] text-[#efe6cf] [text-indent:0.32em] [text-shadow:0_0_24px_#000,0_0_6px_#000] ${SERIF}`}>
              {[...AREA].map((ch, i) => (
                <motion.span
                  key={i}
                  className="inline-block"
                  initial={reduced ? { opacity: 0 } : { opacity: 0, filter: 'blur(10px)', y: 6 }}
                  animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                  transition={{ delay: reduced ? 0 : 0.5 + i * 0.2, duration: reduced ? 0.3 : 1.5, ease: 'easeOut' }}
                >
                  {ch}
                </motion.span>
              ))}
            </h3>
            <motion.div
              className="mx-auto h-px w-[min(440px,72%)] bg-gradient-to-r from-transparent via-[#d9c79c] to-transparent"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: reduced ? 0.2 : 2, delay: reduced ? 0 : 0.3, ease: 'easeOut' }}
            />
            <motion.p
              className={`mt-2 text-[10px] tracking-[0.5em] text-[#cbb98f]/80 ${SERIF}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: reduced ? 0 : 1.8, duration: 1.2 }}
            >
              外郭 ・ 崩れた礼拝堂
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 勝敗の帯 ── */}
      <AnimatePresence>
        {result && (
          <motion.div
            key={result}
            className="absolute inset-x-0 top-1/2 z-30 -translate-y-1/2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0.3 : 1.4 }}
          >
            <div className="bg-[linear-gradient(180deg,transparent,#000000d9_22%,#000000d9_78%,transparent)] py-[clamp(18px,6cqw,44px)] text-center">
              <motion.h3
                className={`bg-clip-text text-[clamp(34px,8.5cqw,88px)] leading-none text-transparent ${SERIF} ${result === 'victory' ? 'bg-gradient-to-b from-[#fbf0c8] via-[#e2bd6c] to-[#9a6a22]' : 'bg-gradient-to-b from-[#d0454a] via-[#8f1218] to-[#4a0509]'}`}
                style={{ filter: result === 'victory' ? 'drop-shadow(0 0 18px #f59e0b55)' : 'drop-shadow(0 0 18px #dc262655)' }}
                initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.12, letterSpacing: '0.04em', textIndent: '0.04em' }}
                animate={{ opacity: 1, scale: 1, letterSpacing: '0.26em', textIndent: '0.26em' }}
                transition={{ duration: reduced ? 0.3 : 3, ease: [0.16, 1, 0.3, 1] }}
              >
                {result === 'victory' ? '宿敵討滅' : '灯火、潰える'}
              </motion.h3>
              <motion.p
                className={`mt-3 text-[11px] tracking-[0.3em] text-[#d8c9a3]/80 ${SERIF}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: reduced ? 0 : 1.4, duration: 1.2 }}
              >
                {result === 'victory' ? `${BOSS_NAME}は灰に還った ・ 灰片 +12,000` : '最後に灯した燭台から、もう一度'}
              </motion.p>
              {result === 'defeat' && (
                <motion.button
                  type="button"
                  onClick={retry}
                  className={`mt-4 border border-[#cbb98f]/50 bg-black/60 px-5 py-1.5 text-[13px] tracking-[0.3em] text-[#efe6cf] hover:border-[#e8c98a] hover:bg-[#1c140b] focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[#e8c98a] ${SERIF}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: reduced ? 0 : 2 }}
                >
                  再挑戦
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
