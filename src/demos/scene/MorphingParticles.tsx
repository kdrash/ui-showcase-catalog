import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * 形が変わるパーティクル
 * - 球 / 立方体 / トーラス / ハートの点群(各12,000点)を事前に生成
 * - 頂点属性 aFrom / aTo と uProgress を渡し、頂点シェーダーで mix(+ 移動中だけ渦を巻くノイズ)
 * - 切り替え時は「今見えている位置」を CPU で計算して aFrom に入れ直すので、途中で押しても破綻しない
 * - 加算合成 + 円形のソフトな点で発光感
 */

const N = 12000
const SHAPES = ['Sphere', 'Cube', 'Torus', 'Heart'] as const
type Shape = (typeof SHAPES)[number]

function gen(shape: Shape) {
  const a = new Float32Array(N * 3)
  for (let i = 0; i < N; i++) {
    let x = 0, y = 0, z = 0
    if (shape === 'Sphere') {
      const u = Math.random() * 2 - 1
      const t = Math.random() * Math.PI * 2
      const r = 1.6 * (0.92 + Math.random() * 0.08)
      const s = Math.sqrt(1 - u * u)
      x = r * s * Math.cos(t); y = r * u; z = r * s * Math.sin(t)
    } else if (shape === 'Cube') {
      const f = Math.floor(Math.random() * 6)
      const p = [Math.random() * 2 - 1, Math.random() * 2 - 1]
      const s = f % 2 ? 1 : -1
      const v = f < 2 ? [s, p[0], p[1]] : f < 4 ? [p[0], s, p[1]] : [p[0], p[1], s]
      x = v[0] * 1.15; y = v[1] * 1.15; z = v[2] * 1.15
    } else if (shape === 'Torus') {
      const u = Math.random() * Math.PI * 2
      const v = Math.random() * Math.PI * 2
      const R = 1.3, r = 0.5
      x = (R + r * Math.cos(v)) * Math.cos(u); y = (R + r * Math.cos(v)) * Math.sin(u); z = r * Math.sin(v)
    } else {
      const t = Math.random() * Math.PI * 2
      const k = Math.sqrt(Math.random())
      const hx = 16 * Math.pow(Math.sin(t), 3)
      const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
      x = (hx / 17) * 1.7 * k; y = (hy / 17) * 1.7 * k + 0.2; z = (Math.random() - 0.5) * 0.9 * (1 - k * 0.7)
    }
    a[i * 3] = x; a[i * 3 + 1] = y; a[i * 3 + 2] = z
  }
  return a
}

const vert = /* glsl */ `
uniform float uProgress; uniform float uTime; uniform float uPixel;
attribute vec3 aFrom; attribute vec3 aTo; attribute float aRand;
varying vec3 vColor;
float ease(float t){ return t<.5 ? 4.*t*t*t : 1.-pow(-2.*t+2.,3.)/2.; }
void main(){
  float p = clamp(uProgress * 1.4 - aRand * 0.4, 0., 1.);
  float e = ease(p);
  vec3 pos = mix(aFrom, aTo, e);
  float swirl = sin(p * 3.14159);
  float ang = swirl * (1.5 + aRand * 2.);
  pos.xz = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * pos.xz;
  pos += normalize(pos + 0.001) * swirl * (0.4 + aRand * 0.6);
  pos += 0.03 * vec3(sin(uTime*1.3 + aRand*20.), cos(uTime*1.1 + aRand*17.), sin(uTime*0.9 + aRand*11.));
  vec4 mv = modelViewMatrix * vec4(pos, 1.);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uPixel * (2.2 + aRand * 2.2) * (6. / -mv.z);
  vColor = mix(vec3(0.38, 0.55, 1.0), vec3(1.0, 0.35, 0.75), clamp(pos.y * 0.35 + 0.5 + aRand*0.2, 0., 1.));
}`
const frag = /* glsl */ `
varying vec3 vColor;
void main(){
  float d = length(gl_PointCoord - .5);
  float a = smoothstep(.5, 0., d);
  gl_FragColor = vec4(vColor * a * 0.9, a);
}`

function Points({ shape }: { shape: Shape }) {
  const targets = useMemo(() => Object.fromEntries(SHAPES.map((s) => [s, gen(s)])) as Record<Shape, Float32Array>, [])
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const rand = new Float32Array(N).map(() => Math.random())
    g.setAttribute('position', new THREE.BufferAttribute(targets.Sphere.slice(), 3))
    g.setAttribute('aFrom', new THREE.BufferAttribute(targets.Sphere.slice(), 3))
    g.setAttribute('aTo', new THREE.BufferAttribute(targets.Sphere.slice(), 3))
    g.setAttribute('aRand', new THREE.BufferAttribute(rand, 1))
    return g
  }, [targets])
  const uniforms = useMemo(() => ({ uProgress: { value: 1 }, uTime: { value: 0 }, uPixel: { value: 1 } }), [])
  const ref = useRef<THREE.Points>(null)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    // 現在の補間位置(ノイズ抜き)を aFrom に焼き込む
    const from = geo.getAttribute('aFrom') as THREE.BufferAttribute
    const to = geo.getAttribute('aTo') as THREE.BufferAttribute
    const rand = geo.getAttribute('aRand') as THREE.BufferAttribute
    const P = uniforms.uProgress.value
    for (let i = 0; i < N; i++) {
      const p = Math.min(1, Math.max(0, P * 1.4 - rand.getX(i) * 0.4))
      const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2
      for (let k = 0; k < 3; k++) {
        const idx = i * 3 + k
        ;(from.array as Float32Array)[idx] = from.array[idx] + (to.array[idx] - from.array[idx]) * e
      }
    }
    ;(to.array as Float32Array).set(targets[shape])
    from.needsUpdate = true
    to.needsUpdate = true
    uniforms.uProgress.value = 0
  }, [shape, geo, targets, uniforms])

  useEffect(() => () => geo.dispose(), [geo])

  useFrame((s, dt) => {
    uniforms.uTime.value = s.clock.elapsedTime
    uniforms.uPixel.value = s.gl.getPixelRatio()
    uniforms.uProgress.value = Math.min(1, uniforms.uProgress.value + dt * 0.55)
    if (ref.current) {
      ref.current.rotation.y += dt * 0.15
      ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, s.pointer.y * 0.4, 0.05)
    }
  })

  return (
    <points ref={ref} geometry={geo} frustumCulled={false}>
      <shaderMaterial vertexShader={vert} fragmentShader={frag} uniforms={uniforms} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}

export function MorphingParticles() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [shape, setShape] = useState<Shape>('Sphere')
  const [auto, setAuto] = useState(true)
  useEffect(() => {
    if (!auto) return
    const t = setInterval(() => setShape((s) => SHAPES[(SHAPES.indexOf(s) + 1) % SHAPES.length]), 3800)
    return () => clearInterval(t)
  }, [auto])

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full cursor-pointer overflow-hidden bg-[radial-gradient(circle_at_50%_50%,#160f2e_0%,#030208_70%)]"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return
        setAuto(false)
        setShape((s) => SHAPES[(SHAPES.indexOf(s) + 1) % SHAPES.length])
      }}
    >
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 6], fov: 50 }} eventSource={rootRef} eventPrefix="offset">
        <Points shape={shape} />
      </Canvas>
      <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
        {SHAPES.map((s) => (
          <button
            key={s}
            onClick={() => {
              setAuto(false)
              setShape(s)
            }}
            className={`rounded-full px-3 py-1 text-[11px] font-medium backdrop-blur transition ${
              s === shape ? 'bg-white text-indigo-950' : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="pointer-events-none absolute top-3 left-4 text-[11px] tracking-[0.25em] text-white/50 uppercase">12,000 particles · click to morph</div>
    </div>
  )
}
