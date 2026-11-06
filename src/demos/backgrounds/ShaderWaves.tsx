import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Stripe 風の流れるグラデーションメッシュ (React Three Fiber + 自作 GLSL)
 * - 画面全体を覆う板ポリ (頂点シェーダーでクリップ座標に直接出力)
 * - フラグメントシェーダーで simplex noise によるドメインワープ → 4色をブレンド
 * - uTime / uResolution / uMouse を useFrame で更新
 */

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uMouse;
  varying vec2 vUv;

  // --- 3D simplex noise (Ashima Arts / Stefan Gustavson, MIT) ---
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }

  void main() {
    vec2 p = vUv;
    p.x *= uResolution.x / uResolution.y;
    float t = uTime * 0.12;

    // ドメインワープ: ノイズでノイズの座標を歪める
    float n1 = snoise(vec3(p * 1.1, t));
    float n2 = snoise(vec3(p * 1.7 + n1 * 0.7 + uMouse * 0.35, t * 1.4 + 10.0));
    float waves = sin((p.x * 0.9 + p.y * 0.55) * 4.5 + n2 * 2.6 + uTime * 0.5) * 0.5 + 0.5;

    vec3 violet = vec3(0.439, 0.220, 1.000); // #7038ff
    vec3 sky    = vec3(0.431, 0.765, 0.957); // #6ec3f4
    vec3 pink   = vec3(0.937, 0.000, 0.561); // #ef008f
    vec3 amber  = vec3(1.000, 0.729, 0.153); // #ffba27

    vec3 col = mix(violet, sky, smoothstep(-0.6, 0.6, n1));
    col = mix(col, pink, smoothstep(0.15, 0.9, n2) * 0.85);
    col = mix(col, amber, smoothstep(0.62, 1.0, waves) * smoothstep(-0.3, 0.6, n1) * 0.75);
    col += 0.07 * waves;

    // フィルムグレイン
    float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + uTime) * 43758.5453);
    col += (grain - 0.5) * 0.045;

    gl_FragColor = vec4(col, 1.0);
  }
`

function GradientPlane() {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uMouse: { value: new THREE.Vector2(0, 0) },
    }),
    [],
  )

  useFrame((state) => {
    const m = matRef.current
    if (!m) return
    m.uniforms.uTime.value = state.clock.elapsedTime
    m.uniforms.uResolution.value.set(state.size.width, state.size.height)
    const mouse = m.uniforms.uMouse.value as THREE.Vector2
    mouse.lerp(state.pointer, 0.04)
  })

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  )
}

export function ShaderWaves() {
  const rootRef = useRef<HTMLDivElement>(null)
  return (
    <div ref={rootRef} className="relative h-full w-full overflow-hidden bg-[#7038ff]">
      <Canvas dpr={[1, 1.5]} eventSource={rootRef} eventPrefix="offset" gl={{ antialias: false }}>
        <GradientPlane />
      </Canvas>
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-end p-6 text-white">
        <div className="mb-2 w-fit rounded-full bg-white/20 px-3 py-1 text-[11px] font-medium backdrop-blur-md">
          Custom GLSL · simplex noise
        </div>
        <h3 className="max-w-md text-3xl leading-tight font-bold tracking-tight drop-shadow-sm md:text-4xl">
          Gradients that move with your product.
        </h3>
      </div>
    </div>
  )
}
