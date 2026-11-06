import { useRef, type ReactNode } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, Float, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'

/**
 * パステルカラーの浮遊3Dオブジェクト
 * - drei <Float> でふわふわ浮かせる (speed / rotationIntensity / floatIntensity)
 * - MeshPhysicalMaterial + clearcoat でぷっくりした質感 (Claymorphism 的)
 * - ポインタ位置でカメラをずらしてパララックス
 * - drei <ContactShadows> で床に柔らかい影
 */

function Pastel({ color }: { color: string }) {
  return <meshPhysicalMaterial color={color} roughness={0.35} clearcoat={1} clearcoatRoughness={0.25} />
}

function Item({
  position,
  speed = 1.5,
  children,
}: {
  position: [number, number, number]
  speed?: number
  children: ReactNode
}) {
  return (
    <Float speed={speed} rotationIntensity={1.2} floatIntensity={1.4} floatingRange={[-0.15, 0.15]}>
      <group position={position}>{children}</group>
    </Float>
  )
}

function Rig() {
  const target = useRef(new THREE.Vector3())
  useFrame((state) => {
    target.current.set(state.pointer.x * 0.9, 0.4 + state.pointer.y * 0.5, 6)
    state.camera.position.lerp(target.current, 0.05)
    state.camera.lookAt(0, 0, 0)
  })
  return null
}

export function FloatingShapes() {
  const rootRef = useRef<HTMLDivElement>(null)
  return (
    <div ref={rootRef} className="relative h-full w-full overflow-hidden bg-gradient-to-br from-[#fdf2f8] via-[#f5f3ff] to-[#ecfeff]">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0.4, 6], fov: 45 }} eventSource={rootRef} eventPrefix="offset">
        <ambientLight intensity={0.9} />
        <directionalLight position={[4, 6, 5]} intensity={1.8} />
        <directionalLight position={[-5, -2, -3]} intensity={0.6} color="#c7d2fe" />

        <Item position={[-2.3, 0.6, 0]} speed={1.8}>
          <mesh>
            <torusKnotGeometry args={[0.45, 0.17, 160, 24]} />
            <Pastel color="#f9a8d4" />
          </mesh>
        </Item>
        <Item position={[2.4, 0.9, -0.5]} speed={1.3}>
          <mesh>
            <icosahedronGeometry args={[0.6, 0]} />
            <Pastel color="#a5b4fc" />
          </mesh>
        </Item>
        <Item position={[0, -0.1, 0.6]} speed={1.1}>
          <RoundedBox args={[0.95, 0.95, 0.95]} radius={0.22} smoothness={6}>
            <Pastel color="#fde68a" />
          </RoundedBox>
        </Item>
        <Item position={[-1.2, -0.9, 1]} speed={2}>
          <mesh>
            <torusGeometry args={[0.38, 0.16, 32, 64]} />
            <Pastel color="#6ee7b7" />
          </mesh>
        </Item>
        <Item position={[1.4, -0.7, 1.1]} speed={1.6}>
          <mesh>
            <sphereGeometry args={[0.38, 48, 48]} />
            <Pastel color="#7dd3fc" />
          </mesh>
        </Item>
        <Item position={[0.6, 1.4, -1]} speed={1.4}>
          <mesh>
            <octahedronGeometry args={[0.42, 0]} />
            <Pastel color="#c4b5fd" />
          </mesh>
        </Item>
        <Item position={[-0.5, 1.5, -1.6]} speed={1.9}>
          <mesh>
            <coneGeometry args={[0.32, 0.6, 32]} />
            <Pastel color="#fda4af" />
          </mesh>
        </Item>

        <ContactShadows position={[0, -1.7, 0]} opacity={0.3} scale={14} blur={2.6} far={4} color="#6d28d9" />
        <Rig />
      </Canvas>

      <div className="pointer-events-none absolute top-5 left-6 text-zinc-800">
        <div className="text-[11px] font-semibold tracking-[0.25em] text-violet-500 uppercase">Playful 3D</div>
        <div className="text-2xl font-bold tracking-tight">Soft shapes, soft vibes.</div>
      </div>
    </div>
  )
}
