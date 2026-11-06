import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { CuboidCollider, Physics, RigidBody } from '@react-three/rapier'
import { RoundedBox } from '@react-three/drei'
import { RotateCcw, Sparkles } from 'lucide-react'

/**
 * Rapier 物理演算のボールピット
 * - <Physics> の中に <RigidBody colliders="ball|cuboid"> を追加していくだけで落下・衝突・積み上げ
 * - トレイ(床+低い壁)は type="fixed"、見えない高い壁 CuboidCollider で外に落ちないようにする
 * - クリック位置の X に落とす / まとめて落とす / リセット(Physics を key で作り直す)
 */

type Kind = 'ball' | 'box' | 'key'
interface Item {
  id: number
  kind: Kind
  color: string
  x: number
  y: number
  z: number
  rot: [number, number, number]
}

const COLORS = ['#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#f4f4f5', '#22d3ee']
const KINDS: Kind[] = ['ball', 'box', 'key']
const MAX = 110
let seq = 0

function makeItem(x?: number): Item {
  return {
    id: seq++,
    kind: KINDS[Math.floor(Math.random() * 3)],
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    x: x ?? (Math.random() - 0.5) * 5,
    y: 6 + Math.random() * 2,
    z: (Math.random() - 0.5) * 2,
    rot: [Math.random() * 3, Math.random() * 3, Math.random() * 3],
  }
}

function Body({ item }: { item: Item }) {
  const pos: [number, number, number] = [item.x, item.y, item.z]
  if (item.kind === 'ball')
    return (
      <RigidBody colliders="ball" position={pos} restitution={0.55} friction={0.4}>
        <mesh castShadow>
          <sphereGeometry args={[0.32, 24, 24]} />
          <meshStandardMaterial color={item.color} roughness={0.25} metalness={0.1} />
        </mesh>
      </RigidBody>
    )
  if (item.kind === 'box')
    return (
      <RigidBody colliders="cuboid" position={pos} rotation={item.rot} restitution={0.2}>
        <mesh castShadow>
          <boxGeometry args={[0.55, 0.55, 0.55]} />
          <meshStandardMaterial color={item.color} roughness={0.5} />
        </mesh>
      </RigidBody>
    )
  // キーキャップ風(角丸の平たい箱 + 上面の凹み)
  return (
    <RigidBody colliders="cuboid" position={pos} rotation={item.rot} restitution={0.15}>
      <RoundedBox args={[0.7, 0.32, 0.7]} radius={0.08} smoothness={3} castShadow>
        <meshStandardMaterial color={item.color} roughness={0.35} />
      </RoundedBox>
      <mesh position={[0, 0.165, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.46, 0.46]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.18} />
      </mesh>
    </RigidBody>
  )
}

function Tray() {
  return (
    <RigidBody type="fixed" colliders={false}>
      {/* 床 */}
      <CuboidCollider args={[4, 0.2, 2.2]} position={[0, -0.2, 0]} />
      <mesh receiveShadow position={[0, -0.2, 0]}>
        <boxGeometry args={[8, 0.4, 4.4]} />
        <meshStandardMaterial color="#1e1b4b" roughness={0.8} />
      </mesh>
      {/* 低い見える壁 */}
      {[
        [0, 0.25, 2.25, 8.2, 0.5, 0.1],
        [0, 0.25, -2.25, 8.2, 0.5, 0.1],
        [4.05, 0.25, 0, 0.1, 0.5, 4.6],
        [-4.05, 0.25, 0, 0.1, 0.5, 4.6],
      ].map(([x, y, z, w, h, d], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color="#6366f1" emissive="#4338ca" emissiveIntensity={0.6} roughness={0.3} />
        </mesh>
      ))}
      {/* 見えない高い壁 */}
      <CuboidCollider args={[4.2, 5, 0.1]} position={[0, 5, 2.25]} />
      <CuboidCollider args={[4.2, 5, 0.1]} position={[0, 5, -2.25]} />
      <CuboidCollider args={[0.1, 5, 2.4]} position={[4.05, 5, 0]} />
      <CuboidCollider args={[0.1, 5, 2.4]} position={[-4.05, 5, 0]} />
    </RigidBody>
  )
}

export function RapierPhysicsPit() {
  const [items, setItems] = useState<Item[]>([])
  const [world, setWorld] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)

  const drop = useCallback((n = 1, x?: number) => {
    setItems((prev) => {
      const next = [...prev, ...Array.from({ length: n }, () => makeItem(x === undefined ? undefined : x + (Math.random() - 0.5) * 0.4))]
      return next.slice(-MAX)
    })
  }, [])

  // 最初に少しずつ降らせる
  useEffect(() => {
    let i = 0
    const t = setInterval(() => {
      drop(1)
      if (++i >= 16) clearInterval(t)
    }, 160)
    return () => clearInterval(t)
  }, [drop, world])

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full overflow-hidden bg-[radial-gradient(ellipse_at_50%_0%,#312e81_0%,#0b0a1a_70%)]"
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest('button')) return
        const r = rootRef.current!.getBoundingClientRect()
        const nx = (e.clientX - r.left) / r.width - 0.5
        drop(1, Math.max(-3.4, Math.min(3.4, nx * 9)))
      }}
    >
      <Canvas shadows="percentage" dpr={[1, 1.5]} camera={{ position: [0, 6, 9], fov: 38 }} onCreated={({ camera }) => camera.lookAt(0, 0.8, 0)}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[4, 10, 5]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]}>
          <orthographicCamera attach="shadow-camera" args={[-6, 6, 6, -6, 0.1, 30]} />
        </directionalLight>
        <pointLight position={[-4, 3, 2]} color="#ec4899" intensity={20} />
        <Suspense fallback={null}>
          <Physics key={world} gravity={[0, -12, 0]}>
            <Tray />
            {items.map((it) => (
              <Body key={it.id} item={it} />
            ))}
          </Physics>
        </Suspense>
      </Canvas>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
        <div>
          <div className="text-[11px] tracking-[0.25em] text-indigo-300/80 uppercase">Rapier physics</div>
          <div className="mt-1 font-mono text-2xl font-bold text-white tabular-nums">
            {items.length}
            <span className="ml-1 text-sm font-normal text-white/50">objects</span>
          </div>
        </div>
        <div className="pointer-events-auto flex gap-2">
          <button
            onClick={() => drop(12)}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-indigo-950 shadow-lg transition hover:scale-105 active:scale-95"
          >
            <Sparkles size={13} /> 12個落とす
          </button>
          <button
            onClick={() => {
              setItems([])
              setWorld((w) => w + 1)
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-white backdrop-blur transition hover:bg-white/20"
          >
            <RotateCcw size={13} /> リセット
          </button>
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 text-[11px] text-white/50">クリックした位置に落ちてきます</div>
    </div>
  )
}
