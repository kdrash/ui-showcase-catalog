import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'

/**
 * ドットの地球儀 + 飛び交うアーク (React Three Fiber)
 * - フィボナッチ球面配置の点を、疑似ノイズで間引いて「大陸」っぽく
 * - 2点間を QuadraticBezierCurve3 で結び、setDrawRange で光の筋が流れるアニメ
 * - BackSide の球 + フレネル GLSL で大気グロー
 * - drei OrbitControls でドラッグ回転 + autoRotate、drei Stars で背景の星
 */

const R = 1.6
const SEG = 64
const TAIL = 18

function fibonacciLand(count: number) {
  const pts: THREE.Vector3[] = []
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const th = golden * i
    const x = Math.cos(th) * r
    const z = Math.sin(th) * r
    // 疑似ノイズで陸地っぽく間引く
    const n =
      Math.sin(x * 3.1 + 1.7) * Math.sin(y * 2.7 + 0.3) * Math.sin(z * 3.3 + 2.1) +
      0.45 * Math.sin(x * 6.3) * Math.sin(y * 5.9 + 1.0) * Math.sin(z * 6.7 + 0.5)
    if (n > -0.02) pts.push(new THREE.Vector3(x, y, z).multiplyScalar(R))
  }
  return pts
}

function makeDotTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(32, 32, 28, 0, Math.PI * 2)
  ctx.fill()
  return new THREE.CanvasTexture(c)
}

const atmosphereVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`
const atmosphereFragment = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float f = clamp(-dot(vNormal, vView), 0.0, 1.0);
    float g = pow(smoothstep(0.0, 0.62, f), 2.5);
    gl_FragColor = vec4(0.3, 0.55, 1.0, g * 0.85);
  }
`

function Globe() {
  const land = useMemo(() => fibonacciLand(7000), [])

  const { dotsGeo, dotTex } = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints(land)
    return { dotsGeo: g, dotTex: makeDotTexture() }
  }, [land])

  const arcs = useMemo(() => {
    return Array.from({ length: 12 }, (_, k) => {
      const a = land[(Math.random() * land.length) | 0]
      const b = land[(Math.random() * land.length) | 0]
      const mid = a.clone().add(b).multiplyScalar(0.5)
      mid.normalize().multiplyScalar(R + a.distanceTo(b) * 0.45)
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b)
      const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(SEG))
      const mat = new THREE.LineBasicMaterial({
        color: k % 2 ? '#22d3ee' : '#f472b6',
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
      return { line: new THREE.Line(geo, mat), offset: Math.random() * 2, speed: 0.3 + Math.random() * 0.3 }
    })
  }, [land])

  useEffect(
    () => () => {
      dotsGeo.dispose()
      dotTex.dispose()
      arcs.forEach(({ line }) => {
        line.geometry.dispose()
        ;(line.material as THREE.Material).dispose()
      })
    },
    [dotsGeo, dotTex, arcs],
  )

  useFrame((state) => {
    const t = state.clock.elapsedTime
    for (const arc of arcs) {
      const p = ((t * arc.speed + arc.offset) % 1.5) / 1.2 // 0..1.25 (最後に少し休む)
      const head = Math.floor(p * (SEG + TAIL))
      const start = THREE.MathUtils.clamp(head - TAIL, 0, SEG + 1)
      const end = THREE.MathUtils.clamp(head, 0, SEG + 1)
      arc.line.geometry.setDrawRange(start, Math.max(0, end - start))
    }
  })

  return (
    <group rotation={[0.35, 0, 0.15]}>
      {/* 中身の球 (裏側のドットを隠す) */}
      <mesh>
        <sphereGeometry args={[R * 0.985, 64, 64]} />
        <meshBasicMaterial color="#081226" />
      </mesh>
      <points geometry={dotsGeo}>
        <pointsMaterial size={0.028} map={dotTex} color="#7aa2ff" transparent alphaTest={0.4} sizeAttenuation />
      </points>
      {arcs.map(({ line }, i) => (
        <primitive key={i} object={line} />
      ))}
      {/* 大気グロー */}
      <mesh scale={1.25}>
        <sphereGeometry args={[R, 64, 64]} />
        <shaderMaterial
          vertexShader={atmosphereVertex}
          fragmentShader={atmosphereFragment}
          side={THREE.BackSide}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

export function DotGlobe() {
  const rootRef = useRef<HTMLDivElement>(null)
  return (
    <div ref={rootRef} className="relative h-full w-full cursor-grab overflow-hidden bg-[#030712] active:cursor-grabbing">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 5.2], fov: 45 }} eventSource={rootRef} eventPrefix="offset">
        <Stars radius={60} depth={30} count={1500} factor={3} fade speed={0.5} />
        <Globe />
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.7} rotateSpeed={0.5} />
      </Canvas>
      <div className="pointer-events-none absolute bottom-5 left-5 text-white">
        <div className="flex items-center gap-2 text-[11px] text-emerald-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          All systems operational
        </div>
        <div className="mt-1 text-2xl font-semibold tracking-tight">Global edge network</div>
        <div className="text-xs text-slate-400">ドラッグで回転できます</div>
      </div>
    </div>
  )
}
