import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * うねるドットの海 (React Three Fiber + GLSL)
 * - 140x70 のグリッド状の点を <points> + ShaderMaterial で描画
 * - 波の計算は頂点シェーダー (GPU) で行うので CPU 負荷ほぼゼロ
 * - Raycaster で y=0 平面とポインタの交点を求め、そこから波紋 (ripple) を発生
 * - gl_PointCoord で丸い点にして、距離で奥をフェード
 */

const COLS = 140
const ROWS = 70
const SPACING = 0.12

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uPixelRatio;
  varying float vH;
  varying float vDepth;
  void main() {
    vec3 p = position;
    float w = sin(p.x * 0.8 + uTime * 1.2) * 0.22
            + cos(p.z * 1.1 + uTime * 0.9) * 0.18
            + sin((p.x + p.z) * 0.5 + uTime * 0.6) * 0.12;
    float d = distance(p.xz, uMouse);
    w += exp(-d * d * 0.7) * 0.45 * sin(d * 5.0 - uTime * 5.0);
    p.y += w;
    vH = w;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vDepth = -mv.z;
    gl_PointSize = 2.4 * uPixelRatio * (6.0 / vDepth);
    gl_Position = projectionMatrix * mv;
  }
`

const fragmentShader = /* glsl */ `
  varying float vH;
  varying float vDepth;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    if (dot(c, c) > 0.25) discard;
    vec3 low = vec3(0.23, 0.47, 1.0);
    vec3 high = vec3(0.98, 0.45, 0.9);
    vec3 col = mix(low, high, smoothstep(-0.35, 0.45, vH));
    float fade = smoothstep(13.0, 3.5, vDepth);
    gl_FragColor = vec4(col, fade);
  }
`

function Dots() {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), [])
  const hit = useMemo(() => new THREE.Vector3(), [])
  const hit2 = useMemo(() => new THREE.Vector2(), [])

  const geometry = useMemo(() => {
    const positions = new Float32Array(COLS * ROWS * 3)
    let k = 0
    for (let j = 0; j < ROWS; j++) {
      for (let i = 0; i < COLS; i++) {
        positions[k++] = (i - COLS / 2) * SPACING
        positions[k++] = 0
        positions[k++] = (j - ROWS / 2) * SPACING
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])

  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uMouse: { value: new THREE.Vector2(99, 99) }, uPixelRatio: { value: 1 } }),
    [],
  )

  useFrame((state) => {
    const m = matRef.current
    if (!m) return
    m.uniforms.uTime.value = state.clock.elapsedTime
    m.uniforms.uPixelRatio.value = state.viewport.dpr
    // ポインタ → 床平面との交点
    state.raycaster.setFromCamera(state.pointer, state.camera)
    if (state.raycaster.ray.intersectPlane(plane, hit)) {
      ;(m.uniforms.uMouse.value as THREE.Vector2).lerp(hit2.set(hit.x, hit.z), 0.15)
    }
  })

  return (
    <points geometry={geometry}>
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
      />
    </points>
  )
}

export function DotWave() {
  const rootRef = useRef<HTMLDivElement>(null)
  return (
    <div ref={rootRef} className="relative h-full w-full overflow-hidden bg-[linear-gradient(to_bottom,#020617,#0f172a)]">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 2.1, 5.2], fov: 50 }}
        eventSource={rootRef}
        eventPrefix="offset"
        onCreated={({ camera }) => camera.lookAt(0, 0, -0.8)}
      >
        <Dots />
      </Canvas>
      <div className="pointer-events-none absolute top-6 left-0 w-full text-center">
        <div className="text-[11px] tracking-[0.35em] text-blue-300/70 uppercase">Signal</div>
        <h3 className="mt-1 text-3xl font-semibold tracking-tight text-white">Ride the wave.</h3>
        <p className="mt-1 text-xs text-slate-400">ポインタの位置から波紋が広がります</p>
      </div>
    </div>
  )
}
