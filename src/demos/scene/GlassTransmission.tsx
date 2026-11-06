import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Float, Lightformer, MeshTransmissionMaterial } from '@react-three/drei'
import * as THREE from 'three'

/**
 * 厚いガラスのオブジェクト越しに背景タイポが屈折して見えるヒーロー
 * - drei MeshTransmissionMaterial(透過・厚み・色収差・歪み)
 * - 屈折させたい文字は 3D シーン内に置く必要があるので、CanvasTexture で描いた板を背面に配置
 * - 環境光は <Environment> + <Lightformer>(HDRをダウンロードしない)
 */

function useTypeTexture() {
  const [tex, setTex] = useState<THREE.CanvasTexture | null>(null)
  useEffect(() => {
    let alive = true
    const draw = () => {
      const c = document.createElement('canvas')
      c.width = 2048
      c.height = 1024
      const g = c.getContext('2d')!
      const grad = g.createLinearGradient(0, 0, 2048, 1024)
      grad.addColorStop(0, '#ff5f6d')
      grad.addColorStop(0.5, '#ffc371')
      grad.addColorStop(1, '#5f9bff')
      g.fillStyle = '#0c0c10'
      g.fillRect(0, 0, 2048, 1024)
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillStyle = grad
      g.font = "700 420px 'Space Grotesk', Inter, sans-serif"
      g.fillText('GLASS', 1024, 430)
      g.fillStyle = '#ffffff'
      g.font = "500 64px 'Space Grotesk', Inter, sans-serif"
      g.fillText('REFRACTION · CHROMATIC · THICKNESS', 1024, 760)
      g.strokeStyle = 'rgba(255,255,255,0.12)'
      for (let x = 0; x <= 2048; x += 128) {
        g.beginPath()
        g.moveTo(x, 0)
        g.lineTo(x, 1024)
        g.stroke()
      }
      const t = new THREE.CanvasTexture(c)
      t.colorSpace = THREE.SRGBColorSpace
      if (alive) setTex(t)
    }
    document.fonts.load("700 100px 'Space Grotesk'").then(draw, draw)
    return () => {
      alive = false
    }
  }, [])
  useEffect(() => () => tex?.dispose(), [tex])
  return tex
}

function GlassKnot({ ca, rough, thick }: { ca: number; rough: number; thick: number }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((state, dt) => {
    if (!ref.current) return
    ref.current.rotation.x += dt * 0.25
    ref.current.rotation.y += dt * 0.35
    ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, state.pointer.x * 0.6, 0.05)
  })
  return (
    <Float speed={2} floatIntensity={0.6} rotationIntensity={0.3}>
      <mesh ref={ref} scale={0.8}>
        <torusKnotGeometry args={[1, 0.36, 220, 40]} />
        <MeshTransmissionMaterial
          samples={6}
          resolution={512}
          transmission={1}
          thickness={thick}
          roughness={rough}
          chromaticAberration={ca}
          anisotropicBlur={0.1}
          distortion={0.3}
          distortionScale={0.4}
          temporalDistortion={0.1}
          ior={1.4}
          color="#ffffff"
          backside
        />
      </mesh>
    </Float>
  )
}

function Backdrop() {
  const tex = useTypeTexture()
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), [])
  useEffect(() => {
    mat.map = tex
    mat.needsUpdate = true
  }, [tex, mat])
  useEffect(() => () => mat.dispose(), [mat])
  return (
    <mesh position={[0, 0, -2.5]} material={mat}>
      <planeGeometry args={[12, 6]} />
    </mesh>
  )
}

export function GlassTransmission() {
  const [ca, setCa] = useState(0.6)
  const [rough, setRough] = useState(0.05)
  const [thick, setThick] = useState(1.4)
  const rootRef = useRef<HTMLDivElement>(null)

  const sliders: [string, number, (v: number) => void, number, number, number][] = [
    ['色収差', ca, setCa, 0, 1.5, 0.05],
    ['ラフネス', rough, setRough, 0, 0.5, 0.01],
    ['厚み', thick, setThick, 0.2, 3, 0.1],
  ]

  return (
    <div ref={rootRef} className="relative h-full w-full overflow-hidden bg-[#0c0c10]">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 5], fov: 45 }} eventSource={rootRef} eventPrefix="offset">
        <color attach="background" args={['#0c0c10']} />
        <Backdrop />
        <GlassKnot ca={ca} rough={rough} thick={thick} />
        <Environment resolution={256}>
          <Lightformer form="rect" intensity={4} position={[0, 4, 3]} scale={[8, 1, 1]} />
          <Lightformer form="rect" intensity={2} color="#ff9a76" position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[6, 2, 1]} />
          <Lightformer form="rect" intensity={2} color="#6ea8ff" position={[5, -1, -1]} rotation-y={-Math.PI / 2} scale={[6, 2, 1]} />
          <Lightformer form="ring" intensity={3} position={[0, 0, 6]} scale={3} />
        </Environment>
      </Canvas>

      <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-white/10 bg-black/40 px-4 py-2.5 text-[11px] text-white/80 backdrop-blur-md">
        {sliders.map(([label, v, set, min, max, step]) => (
          <label key={label} className="flex items-center gap-2">
            <span className="w-12 shrink-0">{label}</span>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={v}
              onChange={(e) => set(Number(e.target.value))}
              className="h-1 w-20 accent-orange-300 sm:w-24"
            />
            <span className="w-8 font-mono tabular-nums text-white/50">{v.toFixed(2)}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
