import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * カーソルに反応する InstancedMesh のグリッド
 * - 44×44 = 1,936 個の箱を1回の draw call(instancedMesh)で描画
 * - 見えない床の板で pointermove の交点を取り、その周りの箱を持ち上げる
 * - クリックで波紋(リング状の波)を発生、高さに応じて instanceColor をグラデーション
 */

const N = 44
const GAP = 0.32

function Grid() {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const pointer = useRef(new THREE.Vector3(999, 0, 999))
  const ripples = useRef<{ x: number; z: number; t: number }[]>([])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const color = useMemo(() => new THREE.Color(), [])
  const low = useMemo(() => new THREE.Color('#1e1b4b'), [])
  const mid = useMemo(() => new THREE.Color('#6366f1'), [])
  const high = useMemo(() => new THREE.Color('#f9a8d4'), [])
  const heights = useMemo(() => new Float32Array(N * N), [])
  const now = useRef(0)

  useEffect(() => {
    // instanceColor を初期化
    const m = mesh.current!
    for (let i = 0; i < N * N; i++) m.setColorAt(i, low)
  }, [low])

  useFrame((s, dt) => {
    const m = mesh.current
    if (!m) return
    const t = s.clock.elapsedTime
    now.current = t
    ripples.current = ripples.current.filter((r) => t - r.t < 3)
    let i = 0
    for (let x = 0; x < N; x++)
      for (let z = 0; z < N; z++, i++) {
        const px = (x - N / 2) * GAP
        const pz = (z - N / 2) * GAP
        let h = Math.sin(px * 0.6 + t * 0.8) * Math.cos(pz * 0.5 + t * 0.6) * 0.12
        const d = Math.hypot(px - pointer.current.x, pz - pointer.current.z)
        h += Math.exp(-d * d * 0.8) * 1.4
        for (const r of ripples.current) {
          const age = t - r.t
          const rd = Math.hypot(px - r.x, pz - r.z)
          const front = age * 4.5
          h += Math.exp(-Math.pow(rd - front, 2) * 3) * 0.9 * (1 - age / 3)
        }
        heights[i] = THREE.MathUtils.lerp(heights[i], h, Math.min(1, dt * 10))
        const hh = heights[i]
        dummy.position.set(px, hh / 2, pz)
        dummy.scale.set(1, 0.15 + Math.max(0, hh) * 2, 1)
        dummy.updateMatrix()
        m.setMatrixAt(i, dummy.matrix)
        const k = THREE.MathUtils.clamp(hh / 1.3, 0, 1)
        if (k < 0.5) color.lerpColors(low, mid, k * 2)
        else color.lerpColors(mid, high, (k - 0.5) * 2)
        m.setColorAt(i, color)
      }
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  })

  return (
    <>
      <instancedMesh ref={mesh} args={[undefined, undefined, N * N]}>
        <boxGeometry args={[GAP * 0.82, 0.5, GAP * 0.82]} />
        <meshStandardMaterial roughness={0.4} metalness={0.2} />
      </instancedMesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
        onPointerMove={(e) => pointer.current.copy(e.point)}
        onPointerOut={() => pointer.current.set(999, 0, 999)}
        onPointerDown={(e) => ripples.current.push({ x: e.point.x, z: e.point.z, t: now.current })}
      >
        <planeGeometry args={[N * GAP * 1.4, N * GAP * 1.4]} />
      </mesh>
    </>
  )
}

export function InstancedWaveGrid() {
  const rootRef = useRef<HTMLDivElement>(null)
  return (
    <div ref={rootRef} className="relative h-full w-full overflow-hidden bg-[#0b0a1f]">
      <Canvas dpr={[1, 1.5]} camera={{ position: [5.6, 10, 5.6], fov: 40 }} onCreated={({ camera }) => camera.lookAt(0, 0, 0)} eventSource={rootRef} eventPrefix="offset">
        <color attach="background" args={['#0b0a1f']} />
        <fog attach="fog" args={['#0b0a1f', 10, 22]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 10, 3]} intensity={2.2} />
        <pointLight position={[-4, 3, -4]} color="#ec4899" intensity={30} />
        <Grid />
      </Canvas>
      <div className="pointer-events-none absolute top-3 left-4">
        <div className="text-[11px] tracking-[0.25em] text-indigo-300/80 uppercase">InstancedMesh × 1,936</div>
        <div className="mt-0.5 text-xs text-white/50">カーソルで持ち上げ・クリックで波紋</div>
      </div>
    </div>
  )
}
