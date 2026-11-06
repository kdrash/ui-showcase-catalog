import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * スクロールで進む3Dの旅
 * - Canvas の上にネイティブのスクロールコンテナ(縦4画面分)を重ね、scrollTop / 最大値 を ref で R3F に渡す
 *   (HTMLセクションは普通にスクロールするので、アクセシビリティや慣性スクロールもそのまま)
 * - useFrame で offset(0〜1)を damp しながらカメラを奥へ移動、range() 相当の区間計算で演出
 */

const PAGES = 4
const DEPTH = 34

function Tunnel({ progress }: { progress: React.RefObject<{ target: number; offset: number; px: number; py: number }> }) {
  const rings = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        z: -i * 1.4,
        color: new THREE.Color().setHSL(0.62 - i * 0.022, 0.85, 0.6),
        rot: i * 0.35,
      })),
    [],
  )
  const shapes = useMemo(
    () =>
      Array.from({ length: 60 }, () => {
        const a = Math.random() * Math.PI * 2
        const r = 1.6 + Math.random() * 2.2
        return { pos: [Math.cos(a) * r, Math.sin(a) * r, -Math.random() * DEPTH] as [number, number, number], s: 0.08 + Math.random() * 0.22, kind: Math.floor(Math.random() * 3) }
      }),
    [],
  )
  const group = useRef<THREE.Group>(null)
  const core = useRef<THREE.Mesh>(null)
  useFrame((state, dt) => {
    const p = progress.current
    p.offset = THREE.MathUtils.damp(p.offset, p.target, 5, dt)
    const o = p.offset
    state.camera.position.z = THREE.MathUtils.damp(state.camera.position.z, 5 - o * DEPTH, 4, dt)
    state.camera.position.x = THREE.MathUtils.damp(state.camera.position.x, Math.sin(o * Math.PI * 2) * 0.8 + p.px * 0.3, 4, dt)
    state.camera.position.y = THREE.MathUtils.damp(state.camera.position.y, p.py * 0.3, 4, dt)
    state.camera.lookAt(0, 0, state.camera.position.z - 6)
    if (group.current) group.current.rotation.z += dt * 0.05
    if (core.current) {
      // 最後の区間で中心の球が膨らむ
      const k = THREE.MathUtils.clamp((o - 0.75) / 0.25, 0, 1)
      core.current.scale.setScalar(0.4 + k * 1.6)
      core.current.rotation.y += dt * 0.6
    }
  })
  return (
    <>
      <group ref={group}>
        {rings.map((r, i) => (
          <mesh key={i} position={[0, 0, r.z]} rotation={[0, 0, r.rot]}>
            <torusGeometry args={[2.6, 0.025, 8, 6]} />
            <meshBasicMaterial color={r.color} toneMapped={false} />
          </mesh>
        ))}
        {shapes.map((s, i) => (
          <mesh key={i} position={s.pos} scale={s.s}>
            {s.kind === 0 ? <icosahedronGeometry args={[1, 0]} /> : s.kind === 1 ? <boxGeometry /> : <octahedronGeometry />}
            <meshStandardMaterial color="#c4b5fd" emissive="#4c1d95" flatShading />
          </mesh>
        ))}
      </group>
      <mesh ref={core} position={[0, 0, -DEPTH - 2]}>
        <icosahedronGeometry args={[1, 3]} />
        <meshStandardMaterial color="#fde68a" emissive="#f59e0b" emissiveIntensity={1.2} wireframe />
      </mesh>
    </>
  )
}

const SECTIONS = [
  { k: '01', t: 'スクロールして出発', d: 'ホイールやスワイプでカメラが奥へ進みます。' },
  { k: '02', t: 'リングをくぐる', d: 'scrollTop を ref で渡してカメラ位置を制御。' },
  { k: '03', t: '浮遊する結晶', d: 'HTML は普通にスクロールするだけ。' },
  { k: '04', t: '到着', d: '最後の区間だけコアが膨らみます。' },
]

export function Scroll3DJourney() {
  const progress = useRef({ target: 0, offset: 0, px: 0, py: 0 })
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#07051a]">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 5], fov: 60 }}>
        <color attach="background" args={['#07051a']} />
        <fog attach="fog" args={['#07051a', 4, 18]} />
        <ambientLight intensity={0.6} />
        <pointLight position={[0, 0, 2]} intensity={30} color="#a78bfa" />
        <Tunnel progress={progress} />
      </Canvas>
      <div
        className="absolute inset-0 overflow-y-auto overscroll-contain [scrollbar-width:none]"
        onScroll={(e) => {
          const el = e.currentTarget
          progress.current.target = el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight)
        }}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          progress.current.px = ((e.clientX - r.left) / r.width) * 2 - 1
          progress.current.py = -((e.clientY - r.top) / r.height) * 2 + 1
        }}
      >
        {SECTIONS.map((s, i) => (
          <section key={s.k} className={`flex h-full items-center px-6 ${i % 2 ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[240px] rounded-2xl border border-white/15 bg-black/30 p-4 text-white backdrop-blur-md">
              <div className="font-mono text-[11px] text-violet-300">{s.k} / 0{PAGES}</div>
              <div className="mt-1 text-lg leading-tight font-bold">{s.t}</div>
              <p className="mt-1 text-xs text-white/65">{s.d}</p>
            </div>
          </section>
        ))}
      </div>
      <div className="pointer-events-none absolute right-3 bottom-3 text-[10px] tracking-widest text-white/40">SCROLL ↓</div>
    </div>
  )
}
