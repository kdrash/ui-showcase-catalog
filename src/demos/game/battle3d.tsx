import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { type MonType, TYPE_COLORS } from './monsters'
import { Capsule3D, makeMonUniforms, Monster3D } from './monsters3d'

/**
 * 3D バトルステージ(MonsterBattle と EncounterTransitions で共有)。
 * - グラデーションの空(シェーダー球)・霧・遠景の丘と木・流れる雲・草の丸い足場
 * - 台本側は「ワールド」オブジェクト(カメラ姿勢・各モンスターの突進量/拡大率/フラッシュ/ディゾルブ・カプセル)を
 *   motion の animate() で直接書き換え、useFrame がそれを毎フレーム three のオブジェクトと uniform に反映する
 * - わざのエフェクトはタイプ色の弾・インスタンス化した粒子・広がるリング・点光源のフラッシュ
 */

export interface Actor {
  lunge: number
  hop: number
  scale: number
  flash: number
  dissolve: number
  spin: number
}
export interface CapState {
  show: number
  p: number
  h: number
  wobble: number
  dim: number
}
export interface CamPose {
  px: number
  py: number
  pz: number
  tx: number
  ty: number
  tz: number
}
export interface BattleWorld {
  enemy: Actor
  player: Actor
  cap: CapState
  cam: CamPose & { shake: number }
}

export const POS = { enemy: new THREE.Vector3(2.3, 0, -3.3), player: new THREE.Vector3(-1.5, 0, 1.3) }
const FACE = { enemy: -0.4, player: Math.PI - 0.72 }
const SIZE = { enemy: 1.25, player: 1 }

export const SHOTS = {
  default: { px: -0.35, py: 1.75, pz: 4.7, tx: 0.95, ty: 0.85, tz: -1.4 },
  intro: { px: 0.75, py: 1.0, pz: -1.3, tx: 2.3, ty: 0.75, tz: -3.3 },
  wide: { px: -1.2, py: 3.4, pz: 9.5, tx: 0.8, ty: 0.6, tz: -1.4 },
  playerShoulder: { px: -2.3, py: 1.35, pz: 3.4, tx: 1.9, ty: 0.95, tz: -2.9 },
  enemyClose: { px: 0.2, py: 1.25, pz: -0.4, tx: 2.3, ty: 0.85, tz: -3.3 },
  enemyFront: { px: 1.1, py: 1.15, pz: -0.9, tx: 2.3, ty: 0.9, tz: -3.3 },
  capture: { px: -0.2, py: 1.7, pz: 0.6, tx: 2.3, ty: 0.55, tz: -3.3 },
  playerClose: { px: 0.6, py: 1.2, pz: 3.3, tx: -1.5, ty: 0.75, tz: 1.3 },
} satisfies Record<string, CamPose>
export type ShotName = keyof typeof SHOTS

const actor = (): Actor => ({ lunge: 0, hop: 0, scale: 1, flash: 0, dissolve: 0, spin: 0 })
export function makeWorld(): BattleWorld {
  return { enemy: actor(), player: actor(), cap: { show: 0, p: 0, h: 1.3, wobble: 0, dim: 0 }, cam: { ...SHOTS.default, shake: 0 } }
}
export function resetWorld(w: BattleWorld) {
  Object.assign(w.enemy, actor())
  Object.assign(w.player, actor())
  Object.assign(w.cap, { show: 0, p: 0, h: 1.3, wobble: 0, dim: 0 })
  Object.assign(w.cam, { ...SHOTS.default, shake: 0 })
}

export type Fx3D = { id: number; kind: 'shot' | 'hit' | 'heal' | 'debuff' | 'stars' | 'appear'; to: 'enemy' | 'player'; type?: MonType; color?: string }

// ---------------- 小物 ----------------

type V3 = [number, number, number]
function Toon({ color, geometry, p, s }: { color: string; geometry: THREE.BufferGeometry; p: V3; s: V3 }) {
  return (
    <mesh geometry={geometry} position={p} scale={s}>
      <meshToonMaterial color={color} />
    </mesh>
  )
}

const SPHERE = new THREE.SphereGeometry(1, 24, 16)
const CONE = new THREE.ConeGeometry(1, 2, 12)
const CYL = new THREE.CylinderGeometry(1, 1, 2, 48)
const TORUS = new THREE.TorusGeometry(1, 0.06, 8, 64)
const OCT = new THREE.OctahedronGeometry(1)
const BOX = new THREE.BoxGeometry(1, 1, 1)
const DISC = new THREE.CircleGeometry(1, 40)

function Sky() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { top: { value: new THREE.Color('#5fb4ee') }, mid: { value: new THREE.Color('#bfe3f6') }, low: { value: new THREE.Color('#f8f1d6') } },
        vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader:
          'uniform vec3 top; uniform vec3 mid; uniform vec3 low; varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 c = mix(low, mid, smoothstep(-0.02, 0.18, h)); c = mix(c, top, smoothstep(0.18, 0.6, h)); gl_FragColor = vec4(c, 1.0); }',
      }),
    [],
  )
  useEffect(() => () => mat.dispose(), [mat])
  return <mesh geometry={SPHERE} material={mat} scale={80} renderOrder={-1} />
}

function Clouds({ still }: { still: boolean }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (ref.current && !still) ref.current.position.x = ((clock.elapsedTime * 0.25) % 30) - 15
  })
  const puffs: [number, number, number, number][] = [
    [-10, 9, -34, 2.4], [-8, 9.4, -34, 1.8], [-12, 8.8, -33, 1.6],
    [6, 11, -38, 2.8], [9, 11.2, -38, 2.2], [3.5, 10.6, -37, 1.8],
    [20, 8.5, -30, 2], [22, 8.8, -30, 1.5],
  ]
  return (
    <group ref={ref}>
      {puffs.map(([x, y, z, s], i) => (
        <mesh key={i} geometry={SPHERE} position={[x, y, z]} scale={[s * 1.3, s * 0.7, s]}>
          <meshBasicMaterial color="#ffffff" fog={false} />
        </mesh>
      ))}
    </group>
  )
}

function Scenery({ still }: { still: boolean }) {
  const hills: [number, number, number, number, string][] = [
    [-16, -3, -30, 11, '#83c26b'], [-3, -5, -36, 14, '#6fb15f'], [11, -3.5, -32, 11, '#8cc873'],
    [24, -2.5, -24, 8, '#79bb66'], [-26, -2, -18, 8, '#8cc873'], [28, -2, -10, 6, '#83c26b'],
  ]
  const trees: [number, number, number][] = [
    [-7, 0, -9], [-8.5, 0, -11], [-6, 0, -13], [8, 0, -10], [9.5, 0, -8], [11, 0, -12], [-11, 0, -4], [12, 0, -3], [6.5, 0, -15],
  ]
  return (
    <>
      <Sky />
      <Clouds still={still} />
      <mesh geometry={DISC} rotation={[-Math.PI / 2, 0, 0]} scale={70}>
        <meshToonMaterial color="#a6d77f" />
      </mesh>
      {hills.map(([x, y, z, s, c], i) => (
        <Toon key={i} geometry={SPHERE} color={c} p={[x, y, z]} s={[s * 1.4, s * 0.55, s]} />
      ))}
      {trees.map(([x, y, z], i) => (
        <group key={i} position={[x, y, z]} scale={0.9 + (i % 3) * 0.2}>
          <Toon geometry={CYL} color="#7a4a24" p={[0, 0.4, 0]} s={[0.15, 0.4, 0.15]} />
          <Toon geometry={CONE} color="#3f9a4a" p={[0, 1.5, 0]} s={[0.8, 0.8, 0.8]} />
          <Toon geometry={CONE} color="#4fae55" p={[0, 2.2, 0]} s={[0.6, 0.6, 0.6]} />
        </group>
      ))}
      {/* 足元の草の房 */}
      {Array.from({ length: 26 }, (_, i) => {
        const a = i * 2.39996
        const r = 3.5 + ((i * 37) % 9)
        return <Toon key={`g${i}`} geometry={CONE} color={i % 2 ? '#7cc05e' : '#8fce6c'} p={[Math.cos(a) * r, 0.12, Math.sin(a) * r - 1.5]} s={[0.12, 0.14, 0.12]} />
      })}
    </>
  )
}

function Platform({ at }: { at: THREE.Vector3 }) {
  return (
    <group position={at}>
      <mesh geometry={CYL} scale={[1.42, 0.05, 1.42]} position={[0, -0.02, 0]}>
        <meshBasicMaterial color="#5f8f45" />
      </mesh>
      <mesh geometry={CYL} scale={[1.35, 0.06, 1.35]} position={[0, 0, 0]}>
        <meshToonMaterial color="#9fcb72" />
      </mesh>
      <mesh geometry={DISC} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.065, 0]} scale={1.05}>
        <meshToonMaterial color="#c3e399" />
      </mesh>
      <mesh geometry={DISC} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]} scale={0.55}>
        <meshBasicMaterial color="#1e3317" transparent opacity={0.2} depthWrite={false} />
      </mesh>
    </group>
  )
}

// ---------------- エフェクト ----------------

type Shape = 's' | 'o' | 'b' | 'leaf'
const TYPE_FX: Partial<Record<MonType, { shape: Shape; g: number; speed: number }>> = {
  ほのお: { shape: 's', g: 3, speed: 2.2 },
  みず: { shape: 's', g: -7, speed: 3.2 },
  くさ: { shape: 'leaf', g: -1.5, speed: 2.6 },
  でんき: { shape: 'b', g: 0, speed: 4.2 },
  こおり: { shape: 'o', g: -2, speed: 2.6 },
  いわ: { shape: 'b', g: -9, speed: 3 },
  むし: { shape: 's', g: -3, speed: 2.4 },
  あく: { shape: 'b', g: 0, speed: 3.4 },
  ひこう: { shape: 'leaf', g: 1, speed: 3 },
}
const GEOS: Record<Shape, THREE.BufferGeometry> = { s: SPHERE, o: OCT, b: BOX, leaf: SPHERE }

function Particles({ at, color, shape, count, speed, g, life, size, up = 0, spread = 1 }: { at: THREE.Vector3; color: string; shape: Shape; count: number; speed: number; g: number; life: number; size: number; up?: number; spread?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const t0 = useRef<number | null>(null)
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const v = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 1.4 - 0.3 + up, Math.random() * 2 - 1).normalize()
        v.x *= spread
        v.z *= spread
        return { v: v.multiplyScalar(speed * (0.55 + Math.random() * 0.6)), spin: Math.random() * 10, s: size * (0.6 + Math.random() * 0.7), d: (i / count) * 0.08 }
      }),
    [count, speed, size, up, spread],
  )
  const dummy = useMemo(() => new THREE.Object3D(), [])
  useFrame(({ clock }) => {
    const m = ref.current
    if (!m) return
    if (t0.current === null) t0.current = clock.elapsedTime
    const e = clock.elapsedTime - t0.current
    seeds.forEach((sd, i) => {
      const t = Math.max(0, e - sd.d)
      const k = Math.max(0, 1 - t / life)
      dummy.position.set(at.x + sd.v.x * t, at.y + sd.v.y * t + 0.5 * g * t * t, at.z + sd.v.z * t)
      dummy.rotation.set(sd.spin * t, sd.spin * t * 0.7, 0)
      const s = sd.s * k
      if (shape === 'leaf') dummy.scale.set(s * 1.4, s * 0.25, s * 0.7)
      else dummy.scale.setScalar(s)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[GEOS[shape], undefined, count]} frustumCulled={false}>
      <meshBasicMaterial color={color} toneMapped={false} />
    </instancedMesh>
  )
}

function Ring({ at, color, from = 0.2, to = 1.8, life = 0.5, y = 0, flat = false }: { at: THREE.Vector3; color: string; from?: number; to?: number; life?: number; y?: number; flat?: boolean }) {
  const ref = useRef<THREE.Mesh>(null)
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  const t0 = useRef<number | null>(null)
  const { camera } = useThree()
  useFrame(({ clock }) => {
    if (!ref.current || !mat.current) return
    if (t0.current === null) t0.current = clock.elapsedTime
    const e = Math.min(1, (clock.elapsedTime - t0.current) / life)
    const s = from + (to - from) * (1 - (1 - e) ** 3)
    ref.current.scale.setScalar(s)
    ref.current.position.set(at.x, at.y + y * e, at.z)
    if (!flat) ref.current.lookAt(camera.position)
    mat.current.opacity = 1 - e
  })
  return (
    <mesh ref={ref} geometry={TORUS} rotation={flat ? [Math.PI / 2, 0, 0] : [0, 0, 0]}>
      <meshBasicMaterial ref={mat} color={color} transparent toneMapped={false} depthWrite={false} />
    </mesh>
  )
}

function Flash({ at, color, intensity = 14, life = 0.45 }: { at: THREE.Vector3; color: string; intensity?: number; life?: number }) {
  const ref = useRef<THREE.PointLight>(null)
  const t0 = useRef<number | null>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    if (t0.current === null) t0.current = clock.elapsedTime
    const e = Math.min(1, (clock.elapsedTime - t0.current) / life)
    ref.current.intensity = intensity * (1 - e) ** 2
  })
  return <pointLight ref={ref} position={[at.x, at.y + 0.4, at.z + 0.6]} color={color} distance={6} decay={1.5} />
}

function Shot({ from, to, color, shape }: { from: THREE.Vector3; to: THREE.Vector3; color: string; shape: Shape }) {
  const ref = useRef<THREE.Group>(null)
  const t0 = useRef<number | null>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    if (t0.current === null) t0.current = clock.elapsedTime
    const e = Math.min(1, (clock.elapsedTime - t0.current) / 0.32)
    ref.current.position.lerpVectors(from, to, e)
    ref.current.position.y += Math.sin(e * Math.PI) * 0.6
    ref.current.rotation.set(e * 9, e * 6, 0)
    ref.current.visible = e < 1
  })
  return (
    <group ref={ref}>
      <mesh geometry={GEOS[shape]} scale={0.2}>
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh geometry={SPHERE} scale={0.32}>
        <meshBasicMaterial color={color} transparent opacity={0.35} toneMapped={false} depthWrite={false} />
      </mesh>
      <pointLight color={color} intensity={6} distance={4} />
    </group>
  )
}

function FxView({ fx }: { fx: Fx3D }) {
  const to = POS[fx.to].clone().add(new THREE.Vector3(0, 0.8, 0))
  const fromSide = fx.to === 'enemy' ? 'player' : 'enemy'
  const from = POS[fromSide].clone().add(new THREE.Vector3(0, 0.9, 0))
  const color = fx.color ?? (fx.type ? TYPE_COLORS[fx.type] : '#ffffff')
  const cfg = (fx.type && TYPE_FX[fx.type]) || { shape: 'o' as Shape, g: -2, speed: 2.8 }
  if (fx.kind === 'shot') return <Shot from={from} to={to} color={color} shape={cfg.shape} />
  if (fx.kind === 'hit')
    return (
      <>
        <Particles at={to} color={color} shape={cfg.shape} count={28} speed={cfg.speed} g={cfg.g} life={0.85} size={0.11} />
        <Particles at={to} color="#ffffff" shape="o" count={10} speed={3.4} g={0} life={0.35} size={0.06} />
        <Ring at={to} color={color} to={1.7} />
        <Ring at={to} color="#ffffff" to={1.1} life={0.3} />
        <Flash at={to} color={color} />
      </>
    )
  if (fx.kind === 'heal')
    return (
      <>
        <Particles at={POS[fx.to].clone().add(new THREE.Vector3(0, 0.2, 0))} color={color} shape="o" count={22} speed={0.6} g={1.6} life={1.1} size={0.07} up={2} spread={1.3} />
        <Ring at={POS[fx.to].clone().add(new THREE.Vector3(0, 0.1, 0))} color={color} to={1.3} y={1.3} life={0.9} flat />
      </>
    )
  if (fx.kind === 'debuff')
    return (
      <>
        <Ring at={to.clone().add(new THREE.Vector3(0, 0.7, 0))} color={color} from={0.9} to={0.7} y={-1.2} life={0.8} flat />
        <Ring at={to.clone().add(new THREE.Vector3(0, 1.0, 0))} color={color} from={0.7} to={0.5} y={-1.2} life={0.9} flat />
      </>
    )
  if (fx.kind === 'appear')
    return (
      <>
        <Particles at={to} color={color} shape="o" count={20} speed={2.4} g={-2} life={0.8} size={0.08} />
        <Ring at={POS[fx.to].clone().add(new THREE.Vector3(0, 0.1, 0))} color={color} from={0.3} to={1.6} flat />
        <Flash at={to} color={color} intensity={10} />
      </>
    )
  return (
    <>
      <Particles at={to} color={color} shape="o" count={18} speed={2} g={-3} life={1.1} size={0.09} up={1.5} />
      <Flash at={to} color={color} intensity={8} life={0.8} />
    </>
  )
}

// ---------------- カメラ ----------------

function CameraRig({ world, camera, still }: { world: BattleWorld; camera?: THREE.PerspectiveCamera; still: boolean }) {
  const three = useThree()
  const target = useMemo(() => new THREE.Vector3(), [])
  const pos = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ clock, size }) => {
    const cam = (camera ?? three.camera) as THREE.PerspectiveCamera
    const aspect = size.width / Math.max(1, size.height)
    if (camera && Math.abs(cam.aspect - aspect) > 1e-3) {
      cam.aspect = aspect
      cam.updateProjectionMatrix()
    }
    const c = world.cam
    target.set(c.tx, c.ty, c.tz)
    // 縦長の画面では引いて両者が収まるように
    const k = aspect < 2.3 ? Math.min(2.4, (2.3 / aspect) ** 0.85) : 1
    pos.set(c.px, c.py, c.pz).sub(target).multiplyScalar(k).add(target)
    if (c.shake > 0 && !still) {
      const t = clock.elapsedTime * 60
      pos.x += Math.sin(t * 1.3) * c.shake * 0.08
      pos.y += Math.cos(t * 1.7) * c.shake * 0.06
    }
    cam.position.copy(pos)
    cam.lookAt(target)
  })
  return null
}

// ---------------- ステージ ----------------

function Fighter({ side, name, world }: { side: 'enemy' | 'player'; name: string; world: BattleWorld }) {
  const ref = useRef<THREE.Group>(null)
  const U = useMemo(() => makeMonUniforms(), [])
  const base = POS[side]
  const dir = useMemo(() => POS[side === 'enemy' ? 'player' : 'enemy'].clone().sub(POS[side]).setY(0).normalize(), [side])
  useFrame(() => {
    const g = ref.current
    if (!g) return
    const a = world[side]
    g.position.copy(base).addScaledVector(dir, a.lunge)
    g.position.y = a.hop
    g.scale.setScalar(Math.max(0.0001, a.scale * SIZE[side]))
    g.rotation.y = FACE[side] + a.spin
    g.visible = a.scale > 0.001 && a.dissolve < 1
    U.uFlash.value = a.flash
    U.uDissolve.value = a.dissolve
  })
  return (
    <group ref={ref}>
      <Monster3D name={name} uniforms={U} />
    </group>
  )
}

function Capsule({ world }: { world: BattleWorld }) {
  const ref = useRef<THREE.Group>(null)
  const U = useMemo(() => makeMonUniforms(), [])
  const a = useMemo(() => POS.player.clone().add(new THREE.Vector3(0.3, 1.3, 0)), [])
  const b = useMemo(() => POS.enemy.clone().add(new THREE.Vector3(0, 1.3, 0)), [])
  const ctrl = useMemo(() => a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, 2.4, 0)), [a, b])
  useFrame(() => {
    const g = ref.current
    if (!g) return
    const c = world.cap
    g.visible = c.show > 0.5
    if (c.p < 1) {
      const t = c.p
      g.position.set(0, 0, 0).addScaledVector(a, (1 - t) ** 2).addScaledVector(ctrl, 2 * (1 - t) * t).addScaledVector(b, t * t)
      g.rotation.set(t * Math.PI * 4, 0, t * Math.PI * 2)
    } else {
      g.position.set(POS.enemy.x, c.h, POS.enemy.z)
      g.rotation.set(0, FACE.enemy, c.wobble)
    }
    g.scale.setScalar(1.5 * Math.max(0.0001, c.show))
    U.uFlash.value = -c.dim * 0.35
  })
  return (
    <group ref={ref}>
      <Capsule3D uniforms={U} />
    </group>
  )
}

export function BattleStage({ world, enemy, player, fx, still, camera }: { world: BattleWorld; enemy: string; player: string; fx: Fx3D[]; still: boolean; camera?: THREE.PerspectiveCamera }) {
  return (
    <>
      <fog attach="fog" args={['#eef6dc', 16, 52]} />
      <hemisphereLight args={['#fff6e0', '#6f9e52', 1.1]} />
      <directionalLight position={[4, 9, 6]} intensity={1.7} />
      <ambientLight intensity={0.35} />
      <Scenery still={still} />
      <Platform at={POS.enemy} />
      <Platform at={POS.player} />
      <Fighter key={`e-${enemy}`} side="enemy" name={enemy} world={world} />
      <Fighter key={`p-${player}`} side="player" name={player} world={world} />
      <Capsule world={world} />
      {fx.map((f) => (
        <FxView key={f.id} fx={f} />
      ))}
      <CameraRig world={world} camera={camera} still={still} />
    </>
  )
}
