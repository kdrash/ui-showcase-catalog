import { useRef, useState, type ComponentRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { MeshDistortMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { ArrowRight, Sparkles } from 'lucide-react'

/**
 * うねるブロブ + ガラスのヒーローパネル
 * - drei の MeshDistortMaterial (MeshPhysicalMaterial を頂点ノイズで歪ませる)
 * - 色付きポイントライトでリムを発色させる
 * - ホバーで distort を lerp して激しく揺らす
 * - 上に Glassmorphism のパネル (backdrop-blur) を重ねる
 */

type DistortMat = ComponentRef<typeof MeshDistortMaterial>

function Blob() {
  const meshRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<DistortMat>(null)
  const [hovered, setHovered] = useState(false)

  useFrame((state, delta) => {
    const mesh = meshRef.current
    const mat = matRef.current
    if (!mesh || !mat) return
    // 横長のときはブロブを右に寄せる
    const targetX = state.viewport.width > 6 ? state.viewport.width * 0.2 : 0
    mesh.position.x = THREE.MathUtils.lerp(mesh.position.x, targetX, 0.08)
    mesh.rotation.y += delta * 0.15
    mesh.rotation.x = THREE.MathUtils.lerp(mesh.rotation.x, state.pointer.y * 0.4, 0.05)
    mat.distort = THREE.MathUtils.lerp(mat.distort, hovered ? 0.62 : 0.38, 0.06)
    const s = THREE.MathUtils.lerp(mesh.scale.x, hovered ? 1.08 : 1, 0.08)
    mesh.scale.setScalar(s)
  })

  return (
    <mesh
      ref={meshRef}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <icosahedronGeometry args={[1.35, 64]} />
      <MeshDistortMaterial
        ref={matRef}
        color="#7c5cff"
        speed={2.2}
        distort={0.38}
        radius={1}
        roughness={0.18}
        metalness={0.15}
        clearcoat={1}
        clearcoatRoughness={0.15}
      />
    </mesh>
  )
}

export function DistortBlob() {
  const rootRef = useRef<HTMLDivElement>(null)
  return (
    <div
      ref={rootRef}
      className="relative h-full w-full overflow-hidden bg-[radial-gradient(circle_at_70%_40%,#2a1b5e_0%,#0b0718_65%)]"
    >
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 4.2], fov: 50 }} eventSource={rootRef} eventPrefix="offset">
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 4, 3]} intensity={1.6} />
        <pointLight position={[-4, -2, 2]} color="#ff4fd8" intensity={3.5} decay={0} />
        <pointLight position={[4, 2, 2.5]} color="#22d3ee" intensity={3} decay={0} />
        <Blob />
      </Canvas>

      <div className="pointer-events-none absolute inset-0 flex items-center p-5 md:p-8">
        <div className="pointer-events-auto max-w-xs rounded-3xl border border-white/20 bg-white/10 p-6 text-white shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px]">
            <Sparkles size={12} /> Hover the blob
          </div>
          <h3 className="text-2xl leading-tight font-semibold tracking-tight md:text-3xl">Design that breathes.</h3>
          <p className="mt-2 text-sm text-white/70">Organic 3D shapes give your hero section a living, tactile feel.</p>
          <button className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition hover:gap-3">
            Get started <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
