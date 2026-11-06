import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'

/**
 * ネオン発光のポストエフェクト
 * - emissive を 1 以上 + toneMapped={false} にした素材だけが Bloom(luminanceThreshold)で光る
 * - EffectComposer に Bloom / ChromaticAberration / Noise / Vignette を重ねる
 * - 各エフェクトはトグルで ON/OFF(key で Composer を作り直してパスを再構築)
 */

function NeonShape({
  geometry,
  color,
  position,
  speed,
  wire = true,
}: {
  geometry: React.ReactNode
  color: string
  position: [number, number, number]
  speed: number
  wire?: boolean
}) {
  const ref = useRef<THREE.Mesh>(null)
  const c = useMemo(() => new THREE.Color(color).multiplyScalar(3.2), [color])
  useFrame((s, dt) => {
    if (!ref.current) return
    ref.current.rotation.x += dt * speed
    ref.current.rotation.y += dt * speed * 1.3
    ref.current.position.y = position[1] + Math.sin(s.clock.elapsedTime * speed * 2 + position[0]) * 0.18
  })
  return (
    <mesh ref={ref} position={position}>
      {geometry}
      <meshBasicMaterial color={c} wireframe={wire} toneMapped={false} />
    </mesh>
  )
}

function Rig() {
  useFrame((s) => {
    s.camera.position.x = THREE.MathUtils.lerp(s.camera.position.x, s.pointer.x * 1.2, 0.04)
    s.camera.position.y = THREE.MathUtils.lerp(s.camera.position.y, 1 + s.pointer.y * 0.6, 0.04)
    s.camera.lookAt(0, 0.2, 0)
  })
  return null
}

function Floor() {
  const grid = useMemo(() => {
    const g = new THREE.GridHelper(30, 40, '#ff2bd6', '#3b1d6e')
    ;(g.material as THREE.Material).transparent = true
    ;(g.material as THREE.Material).opacity = 0.7
    return g
  }, [])
  return <primitive object={grid} position={[0, -1.3, 0]} />
}

const EFFECTS = [
  ['bloom', 'Bloom'],
  ['ca', '色収差'],
  ['noise', 'ノイズ'],
  ['vignette', 'ビネット'],
] as const
type Fx = (typeof EFFECTS)[number][0]

export function NeonBloomPostFx() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [on, setOn] = useState<Record<Fx, boolean>>({ bloom: true, ca: true, noise: true, vignette: true })
  const [intensity, setIntensity] = useState(1.6)
  const caOffset = useMemo(() => new THREE.Vector2(0.0025, 0.0018), [])
  const key = EFFECTS.map(([k]) => (on[k] ? 1 : 0)).join('')

  return (
    <div ref={rootRef} className="relative h-full w-full overflow-hidden bg-[#05010d]">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 1, 6], fov: 50 }} eventSource={rootRef} eventPrefix="offset">
        <color attach="background" args={['#05010d']} />
        <fog attach="fog" args={['#05010d', 6, 16]} />
        <Rig />
        <Floor />
        <NeonShape geometry={<icosahedronGeometry args={[1, 1]} />} color="#22d3ee" position={[0, 0.3, 0]} speed={0.35} />
        <NeonShape geometry={<torusGeometry args={[0.6, 0.04, 16, 80]} />} color="#ff2bd6" position={[-2.3, 0.2, -0.6]} speed={0.6} wire={false} />
        <NeonShape geometry={<octahedronGeometry args={[0.55]} />} color="#facc15" position={[2.3, 0.4, -0.4]} speed={0.5} />
        <NeonShape geometry={<torusKnotGeometry args={[0.35, 0.08, 120, 12]} />} color="#a3e635" position={[1.3, -0.6, 1.2]} speed={0.4} wire={false} />
        <NeonShape geometry={<boxGeometry args={[0.6, 0.6, 0.6]} />} color="#818cf8" position={[-1.4, -0.5, 1.1]} speed={0.45} />
        <EffectComposer key={key} multisampling={0}>
          {on.bloom && <Bloom intensity={intensity} luminanceThreshold={0.25} luminanceSmoothing={0.3} mipmapBlur radius={0.75} />}
          {on.ca && <ChromaticAberration offset={caOffset} radialModulation={false} modulationOffset={0} />}
          {on.noise && <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.35} />}
          {on.vignette && <Vignette offset={0.25} darkness={0.85} />}
        </EffectComposer>
      </Canvas>

      <div className="absolute top-3 left-3 font-['Orbitron'] text-[11px] tracking-[0.3em] text-fuchsia-300 drop-shadow-[0_0_8px_#ff2bd6]">
        POST&nbsp;FX
      </div>
      <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center gap-1.5">
        {EFFECTS.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setOn((p) => ({ ...p, [k]: !p[k] }))}
            className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${
              on[k]
                ? 'border-fuchsia-400/70 bg-fuchsia-500/20 text-fuchsia-100 shadow-[0_0_14px_rgba(255,43,214,0.45)]'
                : 'border-white/15 bg-black/40 text-white/50'
            }`}
          >
            {label}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 rounded-full bg-black/40 px-3 py-1 text-[11px] text-white/70">
          強さ
          <input
            type="range"
            min={0}
            max={4}
            step={0.1}
            value={intensity}
            onChange={(e) => setIntensity(Number(e.target.value))}
            className="h-1 w-20 accent-fuchsia-400"
          />
        </label>
      </div>
    </div>
  )
}
