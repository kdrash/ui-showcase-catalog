import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Mask, useMask } from '@react-three/drei'
import * as THREE from 'three'
import { ArrowLeft } from 'lucide-react'

/**
 * ポータルカード(ステンシルマスク版)
 * - 各カードの形を drei <Mask id> でステンシルバッファに書き込み、
 *   その奥に置いた「ミニ世界」のマテリアルに useMask(id) を渡して“窓の中だけ”描画する
 * - ダブルクリックで中に入る: その世界のマスクを外し、カメラをカードへ飛び込ませる
 * - 戻るボタンでカメラを引いてマスクを戻す
 */

type Stencil = ReturnType<typeof useMask> | Record<string, never>

function roundedPath<T extends THREE.Path>(s: T, w: number, h: number, r: number) {
  s.moveTo(-w / 2 + r, -h / 2)
  s.lineTo(w / 2 - r, -h / 2)
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r)
  s.lineTo(w / 2, h / 2 - r)
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2)
  s.lineTo(-w / 2 + r, h / 2)
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r)
  s.lineTo(-w / 2, -h / 2 + r)
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2)
  return s
}
const roundedRect = (w: number, h: number, r: number) => new THREE.ShapeGeometry(roundedPath(new THREE.Shape(), w, h, r), 8)
/** 角丸の枠(中央をくり抜いたリング)。中央を塞ぐと奥の世界が深度で隠れてしまうため */
function roundedFrame(w: number, h: number, r: number, t: number) {
  const outer = roundedPath(new THREE.Shape(), w + t * 2, h + t * 2, r + t)
  outer.holes.push(roundedPath(new THREE.Path(), w, h, r))
  return new THREE.ShapeGeometry(outer, 8)
}

function Spin({ children, speed = 0.4 }: { children: React.ReactNode; speed?: number }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((s, dt) => {
    if (!ref.current) return
    ref.current.rotation.y += dt * speed
    ref.current.position.y = Math.sin(s.clock.elapsedTime) * 0.08
  })
  return <group ref={ref}>{children}</group>
}

const WORLDS: { name: string; jp: string; bg: string; Scene: (p: { st: Stencil }) => React.ReactElement }[] = [
  {
    name: 'Dunes',
    jp: '砂の惑星',
    bg: '#f59e0b',
    Scene: ({ st }) => (
      <>
        <Spin>
          <mesh position={[0, -0.3, 0]}>
            <coneGeometry args={[0.7, 0.9, 4]} />
            <meshStandardMaterial color="#fde68a" flatShading {...st} />
          </mesh>
          <mesh position={[0.8, -0.45, -0.5]}>
            <coneGeometry args={[0.45, 0.6, 4]} />
            <meshStandardMaterial color="#fcd34d" flatShading {...st} />
          </mesh>
        </Spin>
        <mesh position={[-0.5, 0.75, -1.5]}>
          <sphereGeometry args={[0.3, 32, 32]} />
          <meshBasicMaterial color="#fff7ed" {...st} />
        </mesh>
        <mesh position={[0, -0.75, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[6, 48]} />
          <meshStandardMaterial color="#b45309" {...st} />
        </mesh>
      </>
    ),
  },
  {
    name: 'Abyss',
    jp: '深海',
    bg: '#0e3a5f',
    Scene: ({ st }) => (
      <Spin speed={0.6}>
        <mesh>
          <icosahedronGeometry args={[0.55, 0]} />
          <meshStandardMaterial color="#67e8f9" emissive="#0891b2" emissiveIntensity={0.6} flatShading {...st} />
        </mesh>
        {Array.from({ length: 12 }, (_, i) => (
          <mesh key={i} position={[Math.cos(i * 2.1) * 0.9, Math.sin(i * 1.7) * 0.8, Math.sin(i) * 0.6]}>
            <sphereGeometry args={[0.04 + (i % 3) * 0.035, 16, 16]} />
            <meshStandardMaterial color="#e0f2fe" transparent opacity={0.75} {...st} />
          </mesh>
        ))}
      </Spin>
    ),
  },
  {
    name: 'Grove',
    jp: '森の奥',
    bg: '#14532d',
    Scene: ({ st }) => (
      <>
        <Spin speed={0.25}>
          {[
            [-0.5, -0.2, 0.9],
            [0.35, 0.1, 1.1],
            [0.8, -0.7, 0.8],
            [-0.05, -1.0, 0.7],
            [-0.9, -0.9, 0.6],
          ].map(([x, z, s], i) => (
            <group key={i} position={[x, -0.5, z]} scale={s}>
              <mesh position={[0, 0.55, 0]}>
                <coneGeometry args={[0.35, 0.9, 7]} />
                <meshStandardMaterial color={i % 2 ? '#4ade80' : '#22c55e'} flatShading {...st} />
              </mesh>
              <mesh>
                <cylinderGeometry args={[0.06, 0.08, 0.3]} />
                <meshStandardMaterial color="#78350f" {...st} />
              </mesh>
            </group>
          ))}
        </Spin>
        <mesh position={[0, -0.66, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[6, 48]} />
          <meshStandardMaterial color="#166534" {...st} />
        </mesh>
      </>
    ),
  },
]

const X = (i: number) => (i - 1) * 2.05

function World({ i, active }: { i: number; active: number | null }) {
  const w = WORLDS[i]
  const masked = useMask(i + 1)
  const st: Stencil = active === i ? {} : masked
  const visible = active === null || active === i
  return (
    <group position={[X(i), 0, -1.6]} visible={visible}>
      {/* 世界の背景(奥の大きな板) */}
      <mesh position={[0, 0, -3]}>
        <planeGeometry args={[40, 30]} />
        <meshBasicMaterial color={w.bg} {...st} />
      </mesh>
      <w.Scene st={st} />
    </group>
  )
}

function Card({ i, active, onEnter }: { i: number; active: number | null; onEnter: (i: number) => void }) {
  const geo = useMemo(() => roundedRect(1.6, 2.3, 0.14), [])
  const frame = useMemo(() => roundedFrame(1.6, 2.3, 0.14, 0.045), [])
  const group = useRef<THREE.Group>(null)
  const [hover, setHover] = useState(false)
  useFrame(() => {
    if (group.current) group.current.scale.setScalar(THREE.MathUtils.lerp(group.current.scale.x, hover && active === null ? 1.05 : 1, 0.15))
  })
  return (
    <group ref={group} position={[X(i), 0, 0]} visible={active === null}>
      <mesh geometry={frame}>
        <meshBasicMaterial color={hover ? '#ffffff' : '#3f3f46'} />
      </mesh>
      <Mask id={i + 1} geometry={geo} />
      <mesh
        geometry={geo}
        onDoubleClick={(e) => {
          e.stopPropagation()
          onEnter(i)
        }}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
      >
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

function CameraRig({ active }: { active: number | null }) {
  useFrame((s, dt) => {
    const tx = active === null ? s.pointer.x * 0.25 : X(active)
    const tz = active === null ? 5.4 : 1.4
    s.camera.position.x = THREE.MathUtils.damp(s.camera.position.x, tx, 3, dt)
    s.camera.position.z = THREE.MathUtils.damp(s.camera.position.z, tz, 3, dt)
    s.camera.lookAt(s.camera.position.x, 0, s.camera.position.z - 5)
  })
  return null
}

export function PortalCards() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<number | null>(null)
  return (
    <div ref={rootRef} className="relative h-full w-full overflow-hidden bg-zinc-950 select-none">
      <Canvas dpr={[1, 1.5]} gl={{ stencil: true }} camera={{ position: [0, 0, 5.4], fov: 42 }} eventSource={rootRef} eventPrefix="offset">
        <color attach="background" args={[active === null ? '#09090b' : WORLDS[active].bg]} />
        <ambientLight intensity={0.9} />
        <directionalLight position={[2, 3, 3]} intensity={2} />
        <CameraRig active={active} />
        {WORLDS.map((_, i) => (
          <Card key={i} i={i} active={active} onEnter={setActive} />
        ))}
        {WORLDS.map((_, i) => (
          <World key={i} i={i} active={active} />
        ))}
      </Canvas>
      <div className={`pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-[13%] transition-opacity ${active === null ? 'opacity-100' : 'opacity-0'}`}>
        {WORLDS.map((w) => (
          <div key={w.name} className="text-center">
            <div className="text-xs font-semibold text-white">{w.name}</div>
            <div className="text-[10px] text-white/50">{w.jp}</div>
          </div>
        ))}
      </div>
      {active === null ? (
        <div className="pointer-events-none absolute top-3 left-4 text-[11px] text-white/50">カードをダブルクリックして中に入る</div>
      ) : (
        <div className="absolute top-3 left-3 flex items-center gap-3">
          <button
            onClick={() => setActive(null)}
            className="inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-xs text-white backdrop-blur transition hover:bg-black/60"
          >
            <ArrowLeft size={13} /> 戻る
          </button>
          <span className="text-sm font-bold text-white drop-shadow">{WORLDS[active].name}</span>
        </div>
      )}
    </div>
  )
}
