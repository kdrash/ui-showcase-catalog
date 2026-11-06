import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Center, Environment, Float, Lightformer, Text3D } from '@react-three/drei'
import * as THREE from 'three'
// three.js 付属の typeface フォント(ローカル同梱・CDN不要)
import fontUrl from './fonts/helvetiker_bold.typeface.json?url'

/**
 * 押し出し3D文字のヒーロー
 * - drei <Text3D>(TextGeometry)+ <Center> で中央揃え、bevel で角を面取り
 * - クロームっぽい金属マテリアル + Lightformer で映り込み
 * - マウス位置に向けて group を lerp で傾ける(パララックス)
 */

function Title() {
  const group = useRef<THREE.Group>(null)
  useFrame((s) => {
    const g = group.current
    if (!g) return
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, s.pointer.x * 0.45, 0.06)
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, -s.pointer.y * 0.3, 0.06)
    // 横幅が狭いときは縮める
    const k = Math.min(1, s.viewport.width / 7.5)
    g.scale.setScalar(THREE.MathUtils.lerp(g.scale.x, k, 0.1))
  })
  return (
    <group ref={group}>
      <Float speed={1.6} rotationIntensity={0.15} floatIntensity={0.5}>
        <Center>
          <Text3D font={fontUrl} size={1} height={0.38} curveSegments={10} bevelEnabled bevelSize={0.035} bevelThickness={0.05} bevelSegments={5} letterSpacing={0.02}>
            MAKE
            <meshStandardMaterial color="#f5f3ff" metalness={0.7} roughness={0.22} />
          </Text3D>
          <Text3D
            font={fontUrl}
            size={1}
            height={0.38}
            curveSegments={10}
            bevelEnabled
            bevelSize={0.035}
            bevelThickness={0.05}
            bevelSegments={5}
            letterSpacing={0.02}
            position={[0, -1.3, 0]}
          >
            IT POP
            <meshStandardMaterial color="#fb7185" metalness={0.55} roughness={0.25} />
          </Text3D>
        </Center>
      </Float>
    </group>
  )
}

export function Text3DHero() {
  const rootRef = useRef<HTMLDivElement>(null)
  return (
    <div ref={rootRef} className="relative h-full w-full overflow-hidden bg-[radial-gradient(circle_at_50%_40%,#3b0764_0%,#0a0612_70%)]">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 6.5], fov: 45 }} eventSource={rootRef} eventPrefix="offset">
        <ambientLight intensity={0.5} />
        <directionalLight position={[2, 3, 5]} intensity={1.5} />
        <Suspense fallback={null}>
          <Title />
        </Suspense>
        <Environment resolution={256}>
          <Lightformer form="rect" intensity={5} position={[0, 5, 2]} scale={[10, 1.5, 1]} />
          <Lightformer form="rect" intensity={3} color="#f0abfc" position={[-5, 0, 1]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} />
          <Lightformer form="rect" intensity={3} color="#67e8f9" position={[5, 0, 1]} rotation-y={-Math.PI / 2} scale={[8, 3, 1]} />
          <Lightformer form="rect" intensity={1.5} position={[0, -4, 2]} rotation-x={-Math.PI / 2} scale={[10, 2, 1]} />
          <Lightformer form="rect" intensity={2.5} position={[0, 0, 6]} scale={[10, 4, 1]} />
        </Environment>
      </Canvas>
      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex flex-col items-center gap-2">
        <p className="text-xs tracking-wide text-white/60">押し出し文字 × メタリック × マウスで傾く</p>
        <button className="pointer-events-auto rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-purple-950 shadow-lg shadow-fuchsia-500/30 transition hover:scale-105">
          Get started →
        </button>
      </div>
    </div>
  )
}
