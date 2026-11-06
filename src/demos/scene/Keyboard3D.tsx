import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'

/**
 * 3D メカニカルキーボード
 * - RoundedBox のキーキャップを 15u 幅のレイアウトで並べる
 * - デモにホバー(=フォーカス)している間だけ実キーボードの keydown/keyup に反応して沈む
 *   (ページ全体のキー入力は奪わない。Space のスクロールだけ preventDefault)
 * - クリックでも押せる。押したキーは発光し、筐体の下からRGBアンダーグロー(シェーダー)
 */

type K = { code: string; label: string; w: number; tone?: 'mod' | 'accent' | 'warm' }
const R = (s: string) => s.split(' ').map((c) => ({ code: (/[A-Z]/.test(c) ? 'Key' : 'Digit') + c, label: c, w: 1 }))
const ROWS: K[][] = [
  [{ code: 'Escape', label: 'esc', w: 1, tone: 'warm' }, ...R('1 2 3 4 5 6 7 8 9 0'), { code: 'Minus', label: '-', w: 1 }, { code: 'Equal', label: '=', w: 1 }, { code: 'Backspace', label: '⌫', w: 2, tone: 'mod' }],
  [{ code: 'Tab', label: 'tab', w: 1.5, tone: 'mod' }, ...R('Q W E R T Y U I O P'), { code: 'BracketLeft', label: '[', w: 1 }, { code: 'BracketRight', label: ']', w: 1 }, { code: 'Backslash', label: '\\', w: 1.5, tone: 'mod' }],
  [{ code: 'CapsLock', label: 'caps', w: 1.75, tone: 'mod' }, ...R('A S D F G H J K L'), { code: 'Semicolon', label: ';', w: 1 }, { code: 'Quote', label: "'", w: 1 }, { code: 'Enter', label: 'enter', w: 2.25, tone: 'accent' }],
  [{ code: 'ShiftLeft', label: 'shift', w: 2.25, tone: 'mod' }, ...R('Z X C V B N M'), { code: 'Comma', label: ',', w: 1 }, { code: 'Period', label: '.', w: 1 }, { code: 'Slash', label: '/', w: 1 }, { code: 'ShiftRight', label: 'shift', w: 2.75, tone: 'mod' }],
  [{ code: 'ControlLeft', label: 'ctrl', w: 1.5, tone: 'mod' }, { code: 'MetaLeft', label: '◆', w: 1.25, tone: 'mod' }, { code: 'AltLeft', label: 'alt', w: 1.25, tone: 'mod' }, { code: 'Space', label: '', w: 6.5 }, { code: 'AltRight', label: 'alt', w: 1.25, tone: 'mod' }, { code: 'ContextMenu', label: 'fn', w: 1.25, tone: 'mod' }, { code: 'ControlRight', label: 'ctrl', w: 1.5, tone: 'mod' }],
]
const COLORS = { base: '#27272a', mod: '#52525b', accent: '#e11d48', warm: '#f97316' }

function labelTexture(label: string, w: number) {
  const c = document.createElement('canvas')
  c.width = 128 * Math.ceil(w)
  c.height = 128
  const g = c.getContext('2d')!
  g.fillStyle = '#f4f4f5'
  g.font = `600 ${label.length > 1 ? 34 : 54}px Inter, sans-serif`
  g.textBaseline = 'top'
  g.fillText(label, 18, 16)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

function Key({ k, x, z, pressed, flash, onPress }: { k: K; x: number; z: number; pressed: React.RefObject<Set<string>>; flash: React.RefObject<Map<string, number>>; onPress: (code: string, down: boolean) => void }) {
  const ref = useRef<THREE.Group>(null)
  const mat = useRef<THREE.MeshStandardMaterial>(null)
  const tex = useMemo(() => (k.label ? labelTexture(k.label, k.w) : null), [k])
  useEffect(() => () => tex?.dispose(), [tex])
  const glow = useMemo(() => new THREE.Color(), [])
  useFrame((s) => {
    if (!ref.current || !mat.current) return
    const down = pressed.current.has(k.code)
    ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, down ? -0.16 : 0, 0.35)
    const t = flash.current.get(k.code) ?? -1e9
    const a = Math.max(0, 1 - (performance.now() / 1000 - t) * 1.6)
    glow.setHSL((x / 15 + s.clock.elapsedTime * 0.15) % 1, 0.9, 0.55)
    mat.current.emissive.copy(glow)
    mat.current.emissiveIntensity = down ? 1.1 : a * 0.9
  })
  const w = k.w * 1 - 0.12
  return (
    <group ref={ref} position={[x, 0, z]}>
      <group
        onPointerDown={(e) => {
          e.stopPropagation()
          onPress(k.code, true)
        }}
        onPointerUp={() => onPress(k.code, false)}
        onPointerOut={() => onPress(k.code, false)}
      >
        <RoundedBox args={[w, 0.42, 0.88]} radius={0.1} smoothness={3} position={[0, 0.21, 0]}>
          <meshStandardMaterial ref={mat} color={COLORS[k.tone ?? 'base']} roughness={0.55} />
        </RoundedBox>
        {tex && (
          <mesh position={[0, 0.425, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[Math.ceil(k.w) * 0.72, 0.72]} />
            <meshBasicMaterial map={tex} transparent opacity={k.tone === 'accent' || k.tone === 'warm' ? 1 : 0.85} />
          </mesh>
        )}
      </group>
    </group>
  )
}

const glowVert = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`
const glowFrag = /* glsl */ `
varying vec2 vUv; uniform float uTime;
vec3 hsv(float h){ return clamp(abs(mod(h*6.+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.); }
void main(){
  vec3 c = hsv(vUv.x*0.8 + uTime*0.12);
  float edge = smoothstep(0.0, 0.18, min(min(vUv.x,1.-vUv.x)*3., min(vUv.y,1.-vUv.y)));
  gl_FragColor = vec4(c * (0.55 + 0.6*(1.-edge)), 1.0);
}`

function Board({ pressed, flash, onPress }: { pressed: React.RefObject<Set<string>>; flash: React.RefObject<Map<string, number>>; onPress: (code: string, down: boolean) => void }) {
  const group = useRef<THREE.Group>(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])
  useFrame((s) => {
    uniforms.uTime.value = s.clock.elapsedTime
    const g = group.current
    if (!g) return
    g.scale.setScalar(Math.min(1, s.viewport.width / 19.5))
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, s.pointer.y * -0.12, 0.05)
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, s.pointer.x * 0.12, 0.05)
  })
  const keys = useMemo(() => {
    const out: { k: K; x: number; z: number }[] = []
    ROWS.forEach((row, r) => {
      let x = -7.5
      row.forEach((k) => {
        out.push({ k, x: x + k.w / 2, z: (r - 2) * 1 })
        x += k.w
      })
    })
    return out
  }, [])
  return (
    <group ref={group}>
      {/* 筐体 */}
      <RoundedBox args={[15.7, 0.5, 5.7]} radius={0.22} smoothness={4} position={[0, -0.2, 0]}>
        <meshStandardMaterial color="#18181b" metalness={0.6} roughness={0.35} />
      </RoundedBox>
      {/* アンダーグロー(キーの隙間から見える光るプレート) */}
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[15.2, 5.2]} />
        <shaderMaterial vertexShader={glowVert} fragmentShader={glowFrag} uniforms={uniforms} />
      </mesh>
      {keys.map(({ k, x, z }) => (
        <Key key={k.code} k={k} x={x} z={z} pressed={pressed} flash={flash} onPress={onPress} />
      ))}
    </group>
  )
}

export function Keyboard3D() {
  const rootRef = useRef<HTMLDivElement>(null)
  const pressed = useRef(new Set<string>())
  const flash = useRef(new Map<string, number>())
  const [typed, setTyped] = useState('')
  const [focused, setFocused] = useState(false)

  const press = (code: string, down: boolean) => {
    if (down) {
      pressed.current.add(code)
      flash.current.set(code, performance.now() / 1000)
    } else pressed.current.delete(code)
  }

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      onPointerEnter={() => rootRef.current?.focus({ preventScroll: true })}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false)
        pressed.current.clear()
      }}
      onKeyDown={(e) => {
        if (e.code === 'Space') e.preventDefault()
        press(e.code, true)
        if (e.key.length === 1) setTyped((t) => (t + e.key).slice(-28))
        else if (e.key === 'Backspace') setTyped((t) => t.slice(0, -1))
      }}
      onKeyUp={(e) => press(e.code, false)}
      className="relative h-full w-full overflow-hidden bg-[radial-gradient(ellipse_at_50%_100%,#1e1b4b_0%,#09090b_65%)] outline-none"
    >
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 10, 9.5], fov: 34 }} onCreated={({ camera }) => camera.lookAt(0, -0.6, 0.4)} eventSource={rootRef} eventPrefix="offset">
        <ambientLight intensity={0.6} />
        <directionalLight position={[-4, 10, 6]} intensity={2} />
        <pointLight position={[0, 3, 5]} intensity={8} color="#a78bfa" />
        <Board pressed={pressed} flash={flash} onPress={press} />
      </Canvas>

      <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
        <div className="min-w-[60%] rounded-xl border border-white/10 bg-black/50 px-4 py-2 font-mono text-sm text-emerald-300 backdrop-blur">
          {typed || <span className="text-white/35">{focused ? 'タイプしてみてください…' : 'ホバーしてキーを押す / クリックでも押せます'}</span>}
          <span className="ml-0.5 inline-block h-4 w-2 translate-y-0.5 animate-pulse bg-emerald-300/80" />
        </div>
      </div>
    </div>
  )
}
