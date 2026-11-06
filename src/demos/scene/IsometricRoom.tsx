import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrthographicCamera, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Lamp, Sun } from 'lucide-react'

/**
 * アイソメトリックな部屋のジオラマ
 * - OrthographicCamera を (1,1,1) 方向に置いて等角投影風に見下ろす
 * - 家具はすべて box / cylinder / RoundedBox の組み合わせ(ローポリ)
 * - ランプのトグルで昼(窓からの日差し)⇔夜(暖色のランプ + モニターの光)を補間
 */

type V3 = [number, number, number]
function Box({ p, s, c, e, ei = 0 }: { p: V3; s: V3; c: string; e?: string; ei?: number }) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} emissive={e ?? '#000000'} emissiveIntensity={ei} roughness={0.8} />
    </mesh>
  )
}

function Room({ night }: { night: boolean }) {
  const sun = useRef<THREE.DirectionalLight>(null)
  const lamp = useRef<THREE.PointLight>(null)
  const amb = useRef<THREE.AmbientLight>(null)
  const screen = useRef<THREE.MeshStandardMaterial>(null)
  const bulb = useRef<THREE.MeshStandardMaterial>(null)
  const group = useRef<THREE.Group>(null)
  useFrame((s, dt) => {
    const k = Math.min(1, dt * 4)
    if (sun.current) sun.current.intensity = THREE.MathUtils.lerp(sun.current.intensity, night ? 0.05 : 2.6, k)
    if (amb.current) amb.current.intensity = THREE.MathUtils.lerp(amb.current.intensity, night ? 0.15 : 0.9, k)
    if (lamp.current) lamp.current.intensity = THREE.MathUtils.lerp(lamp.current.intensity, night ? 9 : 0, k)
    if (screen.current) screen.current.emissiveIntensity = THREE.MathUtils.lerp(screen.current.emissiveIntensity, night ? 2.2 : 0.6, k)
    if (bulb.current) bulb.current.emissiveIntensity = THREE.MathUtils.lerp(bulb.current.emissiveIntensity, night ? 3 : 0, k)
    if (group.current) group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, s.pointer.x * 0.25, 0.05)
  })
  return (
    <group ref={group}>
      <ambientLight ref={amb} intensity={0.9} color="#e0e7ff" />
      <directionalLight ref={sun} position={[2, 6, 8]} intensity={2.6} color="#fff4e0" castShadow shadow-mapSize={[1024, 1024]}>
        <orthographicCamera attach="shadow-camera" args={[-6, 6, 6, -6, 0.1, 30]} />
      </directionalLight>
      <pointLight ref={lamp} position={[1.9, 1.9, -0.9]} color="#ffb259" intensity={0} distance={7} decay={1.4} castShadow />

      {/* 床と壁 */}
      <Box p={[0, -0.15, 0]} s={[5, 0.3, 5]} c="#c7a27c" />
      <Box p={[0, 1.6, -2.65]} s={[5, 3.5, 0.3]} c="#e8e2f4" />
      <Box p={[-2.65, 1.6, 0]} s={[0.3, 3.5, 5.6]} c="#d9d1ec" />
      {/* 窓 */}
      <Box p={[-2.48, 2, 0.4]} s={[0.06, 1.3, 1.6]} c={night ? '#1e2a5a' : '#bfe3ff'} e={night ? '#3b4a9a' : '#9fd3ff'} ei={night ? 0.4 : 0.6} />
      <Box p={[-2.44, 2, 0.4]} s={[0.04, 1.3, 0.06]} c="#ffffff" />
      {/* ラグ */}
      <mesh position={[0.3, 0.011, 0.6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.3, 40]} />
        <meshStandardMaterial color="#f472b6" roughness={1} />
      </mesh>
      {/* デスク + モニター */}
      <Box p={[0.9, 0.8, -2.0]} s={[2.4, 0.1, 0.9]} c="#8b5e3c" />
      <Box p={[-0.2, 0.4, -2.0]} s={[0.08, 0.8, 0.8]} c="#6b4429" />
      <Box p={[2.0, 0.4, -2.0]} s={[0.08, 0.8, 0.8]} c="#6b4429" />
      <Box p={[0.7, 0.88, -2.0]} s={[0.25, 0.05, 0.2]} c="#27272a" />
      <Box p={[0.7, 1.05, -2.05]} s={[0.06, 0.32, 0.06]} c="#27272a" />
      <mesh position={[0.7, 1.45, -2.08]}>
        <boxGeometry args={[1.1, 0.65, 0.06]} />
        <meshStandardMaterial ref={screen} color="#111827" emissive="#60a5fa" emissiveIntensity={0.6} />
      </mesh>
      {/* ランプ */}
      <Box p={[1.9, 0.9, -2.1]} s={[0.25, 0.06, 0.25]} c="#3f3f46" />
      <Box p={[1.9, 1.25, -2.1]} s={[0.04, 0.7, 0.04]} c="#3f3f46" />
      <mesh position={[1.9, 1.62, -2.0]} rotation={[0.4, 0, 0]}>
        <coneGeometry args={[0.2, 0.26, 20, 1, true]} />
        <meshStandardMaterial color="#fbbf24" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[1.9, 1.56, -1.96]}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshStandardMaterial ref={bulb} color="#fff7d6" emissive="#ffcf70" emissiveIntensity={0} />
      </mesh>
      {/* 椅子 */}
      <Box p={[0.7, 0.5, -1.15]} s={[0.6, 0.08, 0.6]} c="#4f46e5" />
      <Box p={[0.7, 0.85, -0.88]} s={[0.6, 0.7, 0.08]} c="#4f46e5" />
      <Box p={[0.7, 0.25, -1.15]} s={[0.06, 0.5, 0.06]} c="#27272a" />
      {/* ベッド */}
      <RoundedBox args={[1.5, 0.45, 2.4]} radius={0.08} position={[-1.65, 0.25, 1.3]} castShadow receiveShadow>
        <meshStandardMaterial color="#ffffff" />
      </RoundedBox>
      <RoundedBox args={[1.52, 0.2, 1.5]} radius={0.08} position={[-1.65, 0.52, 1.75]} castShadow>
        <meshStandardMaterial color="#38bdf8" />
      </RoundedBox>
      <RoundedBox args={[0.9, 0.18, 0.45]} radius={0.08} position={[-1.65, 0.56, 0.35]}>
        <meshStandardMaterial color="#fef3c7" />
      </RoundedBox>
      {/* 観葉植物 */}
      <mesh position={[2.0, 0.25, 1.9]} castShadow>
        <cylinderGeometry args={[0.25, 0.2, 0.5, 16]} />
        <meshStandardMaterial color="#f97316" />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[2.0 + Math.cos(i * 1.3) * 0.18, 0.75 + (i % 2) * 0.2, 1.9 + Math.sin(i * 1.3) * 0.18]} rotation={[Math.cos(i) * 0.5, i, Math.sin(i) * 0.5]} castShadow>
          <icosahedronGeometry args={[0.24, 0]} />
          <meshStandardMaterial color={i % 2 ? '#22c55e' : '#16a34a'} flatShading />
        </mesh>
      ))}
      {/* 本棚 */}
      <Box p={[-2.3, 1.6, -1.4]} s={[0.4, 0.06, 1.2]} c="#8b5e3c" />
      {['#ef4444', '#3b82f6', '#eab308', '#10b981', '#a855f7'].map((c, i) => (
        <Box key={c} p={[-2.3, 1.82, -1.85 + i * 0.2]} s={[0.3, 0.38 + (i % 2) * 0.08, 0.14]} c={c} />
      ))}
    </group>
  )
}

function Zoom() {
  // カードの大きさに合わせて正射影のズームを調整
  useFrame((s) => {
    const cam = s.camera as THREE.OrthographicCamera
    const z = Math.min(s.size.width / 9.5, s.size.height / 7.2)
    if (Math.abs(cam.zoom - z) > 0.01) {
      cam.zoom = z
      cam.updateProjectionMatrix()
    }
  })
  return null
}

export function IsometricRoom() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [night, setNight] = useState(false)
  return (
    <div
      ref={rootRef}
      className={`relative h-full w-full overflow-hidden transition-colors duration-700 ${night ? 'bg-gradient-to-b from-[#0f1030] to-[#1d1b4b]' : 'bg-gradient-to-b from-[#fde7f3] to-[#dbeafe]'}`}
    >
      <Canvas shadows="percentage" dpr={[1, 1.5]} eventSource={rootRef} eventPrefix="offset">
        <OrthographicCamera makeDefault position={[10, 9, 10]} zoom={40} near={0.1} far={100} onUpdate={(c) => c.lookAt(0, 0.9, 0)} />
        <Zoom />
        <Room night={night} />
      </Canvas>
      <button
        onClick={() => setNight((v) => !v)}
        className={`absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-lg transition hover:scale-105 ${
          night ? 'bg-amber-300 text-amber-950 shadow-amber-400/40' : 'bg-white text-indigo-900'
        }`}
      >
        {night ? <Sun size={13} /> : <Lamp size={13} />}
        {night ? '朝にする' : 'ランプをつける'}
      </button>
      <div className={`pointer-events-none absolute bottom-3 left-4 text-[11px] ${night ? 'text-indigo-200/60' : 'text-indigo-900/50'}`}>Isometric room · {night ? 'night' : 'day'}</div>
    </div>
  )
}
