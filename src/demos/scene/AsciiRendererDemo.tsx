import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { AsciiRenderer } from '@react-three/drei'
import * as THREE from 'three'

/**
 * 3D をアスキーアートで描画
 * - drei <AsciiRenderer> は three の AsciiEffect で、レンダリング結果の明るさを文字に置き換えて DOM に出力
 * - 文字セット・反転・カラーを切り替え、OFF にすると通常の WebGL 描画に戻る
 */

const CHARSETS = {
  classic: ' .:-+*=%@#',
  blocks: ' ░▒▓█',
  binary: ' 01',
  kana: ' ・ｰｼﾂﾐﾈ',
}
type Charset = keyof typeof CHARSETS

function Model() {
  const knot = useRef<THREE.Mesh>(null)
  const ring = useRef<THREE.Mesh>(null)
  useFrame((s, dt) => {
    if (knot.current) {
      knot.current.rotation.x += dt * 0.4
      knot.current.rotation.y += dt * 0.55
    }
    if (ring.current) {
      ring.current.rotation.x = Math.sin(s.clock.elapsedTime * 0.7) * 0.6 + 1.2
      ring.current.rotation.z += dt * 0.3
    }
  })
  return (
    <>
      <mesh ref={knot}>
        <torusKnotGeometry args={[1, 0.34, 160, 24]} />
        <meshStandardMaterial color="#ffffff" roughness={0.4} />
      </mesh>
      <mesh ref={ring}>
        <torusGeometry args={[2.1, 0.08, 16, 100]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </>
  )
}

export function AsciiRendererDemo() {
  const [on, setOn] = useState(true)
  const [charset, setCharset] = useState<Charset>('classic')
  const [invert, setInvert] = useState(true)

  return (
    <div className="relative h-full w-full overflow-hidden bg-black font-['JetBrains_Mono'] [&_table]:!font-['JetBrains_Mono']">
      <Canvas dpr={1} camera={{ position: [0, 0, 5.2], fov: 50 }}>
        <color attach="background" args={['#000000']} />
        <directionalLight position={[3, 3, 4]} intensity={3} />
        <pointLight position={[-4, -2, 2]} intensity={20} />
        <ambientLight intensity={0.1} />
        <Model />
        {on && <AsciiRenderer key={charset + invert} fgColor="#4ade80" bgColor="#000000" characters={CHARSETS[charset]} invert={invert} resolution={0.18} />}
      </Canvas>

      <div className="absolute top-3 left-3 z-10 text-[11px] text-emerald-400/80">
        &gt; ascii_renderer --mode={on ? 'text' : 'webgl'}
        <span className="ml-0.5 animate-pulse">_</span>
      </div>
      <div className="absolute inset-x-3 bottom-3 z-10 flex flex-wrap items-center gap-1.5 text-[11px]">
        <button
          onClick={() => setOn((v) => !v)}
          className={`rounded border px-2.5 py-1 transition ${on ? 'border-emerald-400 bg-emerald-400 text-black' : 'border-emerald-400/50 text-emerald-300'}`}
        >
          ASCII {on ? 'ON' : 'OFF'}
        </button>
        {(Object.keys(CHARSETS) as Charset[]).map((c) => (
          <button
            key={c}
            disabled={!on}
            onClick={() => setCharset(c)}
            className={`rounded border px-2 py-1 transition disabled:opacity-30 ${charset === c ? 'border-emerald-300 text-emerald-200' : 'border-emerald-900 text-emerald-600 hover:text-emerald-300'}`}
          >
            {c}
          </button>
        ))}
        <button
          disabled={!on}
          onClick={() => setInvert((v) => !v)}
          className="ml-auto rounded border border-emerald-900 px-2 py-1 text-emerald-500 transition hover:text-emerald-300 disabled:opacity-30"
        >
          invert: {String(invert)}
        </button>
      </div>
    </div>
  )
}
