import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * ハイパースペース・ワープ (React Three Fiber)
 * - 星1つ = 線分1本 (LineSegments)。先頭が明るく尾が暗い頂点カラーでグラデーションの光跡に
 * - 毎フレーム z を進め、カメラを通り過ぎたら奥へリサイクル
 * - ホバーで速度を lerp して加速 → 尾が伸びてワープ感
 */

const COUNT = 1800
const FAR = -90

function Stars({ boost }: { boost: boolean }) {
  const speed = useRef(8)

  const { geometry, stars } = useMemo(() => {
    const positions = new Float32Array(COUNT * 6)
    const colors = new Float32Array(COUNT * 6)
    const stars = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) {
      const a = Math.random() * Math.PI * 2
      const r = 0.8 + Math.random() * 22
      stars[i * 3] = Math.cos(a) * r
      stars[i * 3 + 1] = Math.sin(a) * r
      stars[i * 3 + 2] = FAR + Math.random() * -FAR
      // head: 白〜青白 / tail: ほぼ黒(加算合成で透明に見える)
      const tint = Math.random()
      colors.set([0.75 + tint * 0.25, 0.85, 1, 0.05, 0.08, 0.25], i * 6)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return { geometry: g, stars }
  }, [])

  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    speed.current = THREE.MathUtils.lerp(speed.current, boost ? 75 : 8, 0.035)
    const v = speed.current
    const tail = 0.15 + v * 0.06
    const pos = geometry.attributes.position as THREE.BufferAttribute
    const arr = pos.array as Float32Array

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3
      stars[i3 + 2] += v * dt
      if (stars[i3 + 2] > 2) {
        const a = Math.random() * Math.PI * 2
        const r = 0.8 + Math.random() * 22
        stars[i3] = Math.cos(a) * r
        stars[i3 + 1] = Math.sin(a) * r
        stars[i3 + 2] = FAR - Math.random() * 10
      }
      const x = stars[i3]
      const y = stars[i3 + 1]
      const z = stars[i3 + 2]
      arr[i * 6] = x
      arr[i * 6 + 1] = y
      arr[i * 6 + 2] = z
      arr[i * 6 + 3] = x
      arr[i * 6 + 4] = y
      arr[i * 6 + 5] = z - tail
    }
    pos.needsUpdate = true

    // ゆっくりロール
    state.camera.rotation.z += dt * (0.02 + v * 0.001)
  })

  return (
    <lineSegments geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial vertexColors transparent blending={THREE.AdditiveBlending} depthWrite={false} />
    </lineSegments>
  )
}

export function StarWarp() {
  const [boost, setBoost] = useState(false)
  return (
    <div
      className="relative h-full w-full cursor-crosshair overflow-hidden bg-[radial-gradient(circle_at_center,#0c1445_0%,#000_70%)]"
      onPointerEnter={() => setBoost(true)}
      onPointerLeave={() => setBoost(false)}
    >
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 1], fov: 75, near: 0.1, far: 120 }}>
        <fog attach="fog" args={['#0b1240', 35, 90]} />
        <Stars boost={boost} />
      </Canvas>
      <div
        className="pointer-events-none absolute inset-0 grid place-items-center text-center transition-all duration-700"
        style={{ fontFamily: "'Orbitron', sans-serif", opacity: boost ? 0.15 : 1, letterSpacing: boost ? '0.6em' : '0.25em' }}
      >
        <div>
          <div className="text-[10px] text-sky-300/80">◇ NAVIGATION ◇</div>
          <div className="mt-1 text-xl font-bold text-white md:text-2xl">ENGAGE WARP DRIVE</div>
          <div className="mt-2 text-[10px] text-white/50">hover to accelerate</div>
        </div>
      </div>
    </div>
  )
}
