import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * 渦巻き銀河パーティクル (React Three Fiber)
 * - BufferGeometry に position / color 属性を詰めて <points> で描画
 * - AdditiveBlending で光が重なるほど明るくなる
 * - useFrame でゆっくり自転 + ポインタ位置に合わせて傾く
 */

const PARAMS = {
  count: 22000,
  radius: 5,
  branches: 4,
  spin: 1.1,
  randomness: 0.35,
  randomnessPower: 3,
  insideColor: '#ff7a3d',
  outsideColor: '#3b4dff',
}

function Galaxy() {
  const groupRef = useRef<THREE.Group>(null)

  const geometry = useMemo(() => {
    const { count, radius, branches, spin, randomness, randomnessPower } = PARAMS
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const inside = new THREE.Color(PARAMS.insideColor)
    const outside = new THREE.Color(PARAMS.outsideColor)

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const r = Math.pow(Math.random(), 1.6) * radius
      const branchAngle = ((i % branches) / branches) * Math.PI * 2
      const spinAngle = r * spin

      const rand = () =>
        Math.pow(Math.random(), randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * randomness * (r + 0.3)

      positions[i3] = Math.cos(branchAngle + spinAngle) * r + rand()
      positions[i3 + 1] = rand() * 0.6
      positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * r + rand()

      const mixed = inside.clone().lerp(outside, r / radius)
      colors[i3] = mixed.r
      colors[i3 + 1] = mixed.g
      colors[i3 + 2] = mixed.b
    }

    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return g
  }, [])

  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame((state, delta) => {
    const g = groupRef.current
    if (!g) return
    g.rotation.y += delta * 0.06
    // ポインタに向かってなめらかに傾ける (lerp)
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, state.pointer.y * 0.35, 0.05)
    g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, -state.pointer.x * 0.25, 0.05)
  })

  return (
    <group ref={groupRef}>
      <points geometry={geometry}>
        <pointsMaterial
          size={0.022}
          sizeAttenuation
          depthWrite={false}
          vertexColors
          transparent
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  )
}

export function ParticleGalaxy() {
  const rootRef = useRef<HTMLDivElement>(null)
  return (
    <div
      ref={rootRef}
      className="relative h-full w-full overflow-hidden bg-[radial-gradient(ellipse_at_center,#14102b_0%,#05040d_70%)]"
    >
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 3.2, 6.2], fov: 55 }}
        eventSource={rootRef}
        eventPrefix="offset"
      >
        <Galaxy />
      </Canvas>
      <div
        className="pointer-events-none absolute bottom-4 left-5 text-white"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        <div className="text-[10px] tracking-[0.3em] text-indigo-300/80 uppercase">Deep Field</div>
        <div className="text-2xl font-semibold">Spiral Galaxy</div>
        <div className="text-xs text-white/50">22,000 particles · move your pointer</div>
      </div>
    </div>
  )
}
