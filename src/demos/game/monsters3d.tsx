import { useFrame } from '@react-three/fiber'
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'

/**
 * ゲームUIデモ(バトル・エンカウント・図鑑)で共有する 3D モンスター。
 * - 球・円錐・円柱・トーラスなどのプリミティブだけで組み立てたオリジナルモデル
 * - MeshToonMaterial(3段階のグラデーションマップ)+ 裏面を法線方向に押し出した黒い殻(インバーテッドハル)で輪郭線
 * - onBeforeCompile でシェーダーに共通の uniform を差し込み、モデル単位で
 *   ・被弾時の白フラッシュ(uFlash)・ひんし時のブロック状ディゾルブ(uDissolve)
 *   ・図鑑用の黒シルエット(uSil)と、ワールド Y 座標の走査線で色が戻る演出(uScan)・リムライト(uRim)
 *   を切り替えられるようにしている
 */

export type MonUniforms = {
  uFlash: { value: number }
  uDissolve: { value: number }
  uSil: { value: number }
  uScan: { value: number }
  uScanColor: { value: THREE.Color }
  uRim: { value: number }
  uRimColor: { value: THREE.Color }
}

export function makeMonUniforms(): MonUniforms {
  return {
    uFlash: { value: 0 },
    uDissolve: { value: 0 },
    uSil: { value: 0 },
    uScan: { value: 100 },
    uScanColor: { value: new THREE.Color('#7dffb0') },
    uRim: { value: 0 },
    uRimColor: { value: new THREE.Color('#bfe9ff') },
  }
}

const Ctx = createContext<{ U: MonUniforms; still: boolean }>({ U: makeMonUniforms(), still: false })

let gradient: THREE.DataTexture | null = null
function toonGradient() {
  if (!gradient) {
    gradient = new THREE.DataTexture(new Uint8Array([105, 185, 255]), 3, 1, THREE.RedFormat)
    gradient.minFilter = THREE.NearestFilter
    gradient.magFilter = THREE.NearestFilter
    gradient.needsUpdate = true
  }
  return gradient
}

const FRAG_HEAD = /* glsl */ `
uniform float uFlash; uniform float uDissolve; uniform float uSil; uniform float uScan; uniform vec3 uScanColor;
uniform float uRim; uniform vec3 uRimColor;
varying vec3 vMonW;
float monHash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
`
const FRAG_MAIN = /* glsl */ `
  float monN = monHash(floor(vMonW * 13.0));
  if (monN < uDissolve) discard;
`
const FRAG_TAIL = /* glsl */ `
  #ifdef MON_BODY
    float monRim = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.6);
    gl_FragColor.rgb += uRimColor * monRim * uRim;
    gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0), uFlash);
  #endif
  if (uDissolve > 0.0) gl_FragColor.rgb = mix(vec3(1.0, 0.92, 0.55), gl_FragColor.rgb, smoothstep(uDissolve, uDissolve + 0.07, monN));
  float monShown = step(vMonW.y, uScan);
  gl_FragColor.rgb = mix(mix(gl_FragColor.rgb, vec3(0.03, 0.04, 0.05), uSil), gl_FragColor.rgb, monShown);
  float monBand = 1.0 - smoothstep(0.0, 0.07, abs(vMonW.y - uScan));
  gl_FragColor.rgb += uScanColor * monBand * uSil * 1.4;
`

function patch(mat: THREE.Material, U: MonUniforms, outline: number) {
  const isOutline = outline > 0
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, U, { uOutline: { value: outline } })
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMonW;\nuniform float uOutline;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${isOutline ? 'transformed += normalize(normal) * uOutline;' : ''}`)
      .replace('#include <project_vertex>', '#include <project_vertex>\nvMonW = (modelMatrix * vec4(transformed, 1.0)).xyz;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAG_HEAD}`)
      .replace('void main() {', `void main() {\n${FRAG_MAIN}`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>\n${FRAG_TAIL}`)
  }
  mat.customProgramCacheKey = () => (isOutline ? 'mon-outline' : 'mon-body')
}

function makeMats(color: string, U: MonUniforms, outline: number) {
  const body = new THREE.MeshToonMaterial({ color, gradientMap: toonGradient() })
  body.defines = { MON_BODY: '' }
  patch(body, U, 0)
  const line = outline > 0 ? new THREE.MeshBasicMaterial({ color: '#241a2c', side: THREE.BackSide }) : null
  if (line) patch(line, U, outline)
  return { body, line }
}

export const GEO = {
  s: new THREE.SphereGeometry(1, 32, 24),
  c: new THREE.ConeGeometry(1, 2, 24),
  y: new THREE.CylinderGeometry(1, 1, 2, 28),
  t: new THREE.TorusGeometry(1, 0.22, 12, 48),
  o: new THREE.OctahedronGeometry(1),
  b: new THREE.BoxGeometry(2, 2, 2),
  h: new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
}
type G = keyof typeof GEO
type V3 = [number, number, number]

/** 1パーツ = トゥーンの本体 + 輪郭線の殻 */
function P({ g = 's', c, p = [0, 0, 0], s = 1, r = [0, 0, 0], o = 0.028 }: { g?: G; c: string; p?: V3; s?: number | V3; r?: V3; o?: number }) {
  const { U } = useContext(Ctx)
  const sc: V3 = typeof s === 'number' ? [s, s, s] : s
  const avg = (sc[0] + sc[1] + sc[2]) / 3
  const outline = o > 0 ? o / avg : 0
  const mats = useMemo(() => makeMats(c, U, outline), [c, U, outline])
  useEffect(
    () => () => {
      mats.body.dispose()
      mats.line?.dispose()
    },
    [mats],
  )
  return (
    <group position={p} rotation={r} scale={sc}>
      <mesh geometry={GEO[g]} material={mats.body} />
      {mats.line && <mesh geometry={GEO[g]} material={mats.line} />}
    </group>
  )
}

/** x=0 で鏡写し(three は負のスケールで面の向きを自動で反転する) */
function M({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <group scale={[-1, 1, 1]}>{children}</group>
    </>
  )
}

function Eye({ p, s = 0.09, white = false }: { p: V3; s?: number; white?: boolean }) {
  return (
    <group position={p}>
      {white && <P c="#ffffff" s={[s * 1.25, s * 1.35, s * 0.7]} o={0.012} />}
      <P c="#1d1622" s={[s * 0.8, s * 1.05, s * 0.6]} p={[0, 0, white ? s * 0.35 : 0]} o={0} />
      <P c="#ffffff" s={s * 0.32} p={[s * 0.3, s * 0.4, s * (white ? 0.85 : 0.5)]} o={0} />
    </group>
  )
}

/** 揺れ・羽ばたき・炎のゆらぎなどの小さなループアニメ */
function Wobble({ kind, speed = 1, amp = 1, phase = 0, children, p, r }: { kind: 'bob' | 'flicker' | 'sway' | 'flap'; speed?: number; amp?: number; phase?: number; children: ReactNode; p?: V3; r?: V3 }) {
  const ref = useRef<THREE.Group>(null)
  const { still } = useContext(Ctx)
  useFrame(({ clock }) => {
    const g = ref.current
    if (!g || still) return
    const t = clock.elapsedTime * speed + phase
    if (kind === 'bob') g.position.y = Math.sin(t * 2) * 0.06 * amp
    else if (kind === 'flicker') g.scale.set(1 + Math.sin(t * 13) * 0.06 * amp, 1 + Math.sin(t * 9 + 1) * 0.12 * amp, 1 + Math.sin(t * 11) * 0.06 * amp)
    else if (kind === 'sway') g.rotation.z = Math.sin(t * 2.2) * 0.18 * amp
    else if (kind === 'flap') g.rotation.y = Math.sin(t * 6) * 0.35 * amp
  })
  return (
    <group position={p} rotation={r}>
      <group ref={ref}>{children}</group>
    </group>
  )
}

// ---------------- モデル(+Z が正面、足元が y=0) ----------------

function Pomleaf() {
  return (
    <>
      <M>
        <P c="#c9b26a" p={[0.3, 0.07, 0.12]} s={[0.2, 0.1, 0.24]} />
        <Eye p={[0.2, 0.68, 0.5]} s={0.085} />
        <P c="#f59aa0" p={[0.38, 0.52, 0.43]} s={[0.09, 0.05, 0.03]} o={0} />
      </M>
      <P c="#a8d86a" p={[0, 0.55, 0]} s={[0.62, 0.55, 0.58]} />
      <P c="#eaf5bf" p={[0, 0.42, 0.36]} s={[0.4, 0.28, 0.24]} o={0} />
      <P g="c" c="#1d1622" p={[0, 0.5, 0.57]} s={[0.05, 0.02, 0.02]} r={[0, 0, Math.PI]} o={0} />
      <Wobble kind="sway" speed={0.8} p={[0, 1.05, 0]}>
        <P g="y" c="#3d7a2a" p={[0, 0.12, 0]} s={[0.035, 0.14, 0.035]} o={0.015} />
        <P c="#6cc24a" p={[0.24, 0.3, 0]} s={[0.26, 0.05, 0.13]} r={[0, 0, 0.45]} o={0.018} />
        <P c="#8ad65e" p={[-0.24, 0.3, 0]} s={[0.26, 0.05, 0.13]} r={[0, 0, -0.45]} o={0.018} />
      </Wobble>
    </>
  )
}

function Hidamaru() {
  return (
    <>
      <M>
        <P c="#f2793a" p={[0.18, 0.08, 0.18]} s={[0.13, 0.09, 0.17]} />
        <P g="c" c="#f2793a" p={[0.27, 1.5, 0]} s={[0.15, 0.24, 0.1]} r={[0, 0, -0.38]} />
        <P g="c" c="#ffb02e" p={[0.27, 1.47, 0.06]} s={[0.08, 0.15, 0.04]} r={[0, 0, -0.38]} o={0} />
        <Eye p={[0.17, 1.2, 0.36]} s={0.075} />
      </M>
      <P c="#f2793a" p={[0, 0.45, 0]} s={[0.36, 0.42, 0.34]} />
      <P c="#ffe2b8" p={[0, 0.45, 0.2]} s={[0.22, 0.3, 0.17]} o={0} />
      <P c="#f2793a" p={[0, 1.12, 0]} s={[0.46, 0.4, 0.4]} />
      <P c="#ffe2b8" p={[0, 1.02, 0.3]} s={[0.21, 0.14, 0.13]} o={0.015} />
      <P c="#1d1622" p={[0, 1.08, 0.42]} s={[0.045, 0.03, 0.03]} o={0} />
      <Wobble kind="flicker" p={[0, 1.5, 0.04]}>
        <P g="c" c="#ffb02e" p={[0, 0.06, 0]} s={[0.09, 0.12, 0.09]} />
      </Wobble>
      <Wobble kind="flicker" speed={1.3} p={[0.28, 0.55, -0.34]} r={[-0.5, 0, -0.5]}>
        <P g="c" c="#ffb02e" p={[0, 0.25, 0]} s={[0.2, 0.3, 0.2]} />
        <P g="c" c="#ffe36b" p={[0, 0.2, 0.06]} s={[0.11, 0.2, 0.11]} o={0} />
        <P c="#ffb02e" p={[0, 0, 0]} s={0.19} />
      </Wobble>
    </>
  )
}

function Shizukurage() {
  return (
    <>
      <M>
        {[0.16, 0.42].map((x, i) => (
          <Wobble key={x} kind="sway" amp={1.4} phase={i * 1.7} p={[x, 0.7, 0.05 * i]}>
            <P g="y" c="#3f7fcf" p={[0, -0.28, 0]} s={[0.045, 0.3, 0.045]} o={0.015} />
            <P c="#3f7fcf" p={[0, -0.58, 0]} s={0.06} o={0.015} />
          </Wobble>
        ))}
        <Eye p={[0.19, 1.0, 0.52]} s={0.075} />
      </M>
      <Wobble kind="bob" speed={0.9}>
        <P c="#7cc6f2" p={[0, 1.0, 0]} s={[0.6, 0.5, 0.58]} />
        <P g="c" c="#7cc6f2" p={[0, 1.55, 0]} s={[0.26, 0.28, 0.26]} o={0.02} />
        <P g="t" c="#5aa8e4" p={[0, 0.74, 0]} s={[0.57, 0.57, 0.6]} r={[Math.PI / 2, 0, 0]} />
        <P c="#d4f0ff" p={[-0.22, 1.25, 0.38]} s={[0.1, 0.16, 0.05]} r={[0, 0, 0.5]} o={0} />
      </Wobble>
    </>
  )
}

function Pirimog() {
  return (
    <>
      <M>
        <P g="b" c="#ffd93b" p={[0.33, 1.12, 0]} s={[0.05, 0.16, 0.05]} r={[0, 0, -0.5]} o={0.015} />
        <P g="b" c="#ffd93b" p={[0.42, 1.3, 0]} s={[0.05, 0.12, 0.05]} r={[0, 0, 0.6]} o={0.015} />
        <P c="#ff6a4a" p={[0.4, 0.58, 0.36]} s={[0.1, 0.1, 0.05]} o={0} />
        <P c="#1d1622" p={[0.2, 0.78, 0.5]} s={[0.07, 0.022, 0.03]} o={0} />
        <P c="#fff6dc" p={[0.56, 0.3, 0.28]} s={[0.18, 0.09, 0.16]} />
      </M>
      <P c="#f6c933" p={[0, 0.58, 0]} s={[0.6, 0.58, 0.55]} />
      <P c="#fff1b0" p={[0, 0.45, 0.32]} s={[0.36, 0.3, 0.25]} o={0} />
      <P c="#ff8fa3" p={[0, 0.63, 0.55]} s={[0.08, 0.06, 0.05]} o={0.012} />
      <P g="c" c="#5a3b1e" p={[0, 1.08, 0.22]} s={[0.1, 0.06, 0.04]} r={[0.4, 0, Math.PI]} o={0} />
    </>
  )
}

function Iwakoron() {
  return (
    <>
      <M>
        <P c="#6e655c" p={[0.4, 0.08, 0.15]} s={[0.15, 0.1, 0.17]} />
      </M>
      <P c="#9a8f84" p={[0, 0.6, -0.05]} s={[0.72, 0.58, 0.64]} />
      {[-0.3, 0, 0.3].map((z) => (
        <P key={z} g="t" c="#7d7368" p={[0, 0.6, z - 0.05]} s={[0.6 - Math.abs(z) * 0.6, 0.55 - Math.abs(z) * 0.5, 0.6]} o={0} />
      ))}
      <P c="#d9c7a8" p={[0, 0.42, 0.5]} s={[0.27, 0.24, 0.2]} />
      <M>
        <Eye p={[0.1, 0.48, 0.66]} s={0.05} />
      </M>
      <P c="#c7bdb0" p={[-0.3, 1.0, 0.3]} s={[0.12, 0.05, 0.08]} o={0} />
    </>
  )
}

function Yumefukuro() {
  return (
    <>
      <M>
        <P g="c" c="#7a5cc4" p={[0.3, 1.5, 0]} s={[0.1, 0.18, 0.08]} r={[0, 0, -0.35]} />
        <Wobble kind="flap" amp={0.3} p={[0.55, 0.8, -0.05]}>
          <P c="#6b4fb4" p={[0, 0, 0]} s={[0.12, 0.42, 0.3]} r={[0, 0, 0.15]} />
        </Wobble>
        <P c="#fff7d6" p={[0.21, 1.08, 0.43]} s={[0.17, 0.17, 0.07]} o={0.02} />
        <P c="#1d1622" p={[0.21, 1.08, 0.49]} s={[0.08, 0.08, 0.03]} o={0} />
        <P c="#ffffff" p={[0.24, 1.12, 0.51]} s={0.025} o={0} />
        <P c="#ffb84a" p={[0.16, 0.06, 0.22]} s={[0.08, 0.05, 0.12]} />
      </M>
      <P c="#8e6fd6" p={[0, 0.8, 0]} s={[0.56, 0.7, 0.5]} />
      <P c="#ece2fd" p={[0, 0.58, 0.28]} s={[0.36, 0.38, 0.25]} o={0} />
      <P g="c" c="#ffb84a" p={[0, 0.92, 0.5]} s={[0.05, 0.07, 0.05]} r={[Math.PI / 2 + 0.4, 0, 0]} o={0.012} />
      <P c="#ffe36b" p={[0, 1.38, 0.32]} s={[0.07, 0.07, 0.03]} o={0.012} />
    </>
  )
}

function Koorisu() {
  return (
    <>
      <Wobble kind="sway" amp={0.4} p={[0, 0.3, -0.3]}>
        {[
          [0.05, 0.1, 0, 0.26],
          [0.12, 0.45, -0.12, 0.3],
          [0.1, 0.85, -0.12, 0.3],
          [0.02, 1.15, 0.05, 0.24],
          [-0.02, 1.3, 0.25, 0.16],
        ].map(([x, y, z, s], i) => (
          <P key={i} c={i % 2 ? '#d6f2ff' : '#c4ebfb'} p={[x, y, z]} s={s} />
        ))}
      </Wobble>
      <M>
        <P g="c" c="#a9dcf5" p={[0.24, 1.32, 0]} s={[0.1, 0.18, 0.07]} r={[0, 0, -0.3]} />
        <Eye p={[0.15, 1.02, 0.33]} s={0.07} />
        <P c="#f6b3c8" p={[0.27, 0.92, 0.3]} s={[0.06, 0.035, 0.02]} o={0} />
        <P c="#a9dcf5" p={[0.16, 0.06, 0.14]} s={[0.11, 0.07, 0.15]} />
      </M>
      <P c="#a9dcf5" p={[0, 0.42, 0]} s={[0.32, 0.4, 0.3]} />
      <P c="#a9dcf5" p={[0, 1.0, 0.02]} s={0.38} />
      <P c="#ecfaff" p={[0, 0.92, 0.24]} s={[0.18, 0.12, 0.13]} o={0} />
      <P c="#1d1622" p={[0, 0.97, 0.37]} s={[0.035, 0.025, 0.02]} o={0} />
      <Wobble kind="bob" speed={1.4} amp={0.3} p={[0, 0.5, 0.33]}>
        <P g="o" c="#effcff" s={[0.11, 0.15, 0.11]} o={0.015} />
      </Wobble>
    </>
  )
}

function Kageboh() {
  return (
    <Wobble kind="bob" speed={0.7} amp={1.5}>
      <P c="#4b3a78" p={[0, 1.0, 0]} s={[0.56, 0.62, 0.5]} />
      <P g="c" c="#4b3a78" p={[0, 0.45, -0.05]} s={[0.38, 0.4, 0.34]} r={[Math.PI - 0.2, 0, 0]} />
      <M>
        <P c="#ffe86b" p={[0.2, 1.08, 0.44]} s={[0.12, 0.06, 0.04]} r={[0, 0, 0.35]} o={0} />
      </M>
      <P g="b" c="#ffe86b" p={[0, 0.82, 0.48]} s={[0.17, 0.02, 0.02]} o={0} />
      <Wobble kind="sway" speed={0.8} p={[0.62, 0.95, 0.15]}>
        <P g="y" c="#2b2233" p={[0, -0.1, 0]} s={[0.012, 0.12, 0.012]} o={0} />
        <P g="y" c="#ffcf5c" p={[0, -0.36, 0]} s={[0.12, 0.15, 0.12]} />
        <P c="#ff7a3a" p={[0, -0.36, 0.08]} s={[0.05, 0.08, 0.05]} o={0} />
      </Wobble>
    </Wobble>
  )
}

function Tsunodraco() {
  return (
    <>
      <P g="c" c="#3fb5a5" p={[0, 0.35, -0.55]} s={[0.12, 0.35, 0.12]} r={[-1.9, 0, 0]} />
      <M>
        <Wobble kind="flap" amp={0.4} p={[0.32, 0.85, -0.2]}>
          <P c="#f2c94c" p={[0.2, 0.05, 0]} s={[0.3, 0.2, 0.04]} r={[0, -0.4, 0.4]} />
        </Wobble>
        <P g="c" c="#fff4d6" p={[0.3, 1.45, -0.12]} s={[0.05, 0.12, 0.05]} r={[-0.5, 0, -0.6]} />
        <P c="#2f8c80" p={[0.2, 0.07, 0.12]} s={[0.13, 0.09, 0.17]} />
        <group position={[0.18, 1.2, 0.34]}>
          <P c="#ffffff" s={[0.09, 0.1, 0.05]} o={0.014} />
          <P c="#1d1622" p={[0, 0, 0.04]} s={[0.025, 0.08, 0.02]} o={0} />
        </group>
      </M>
      <P c="#3fb5a5" p={[0, 0.5, 0]} s={[0.4, 0.46, 0.38]} />
      <P c="#f6e7b0" p={[0, 0.48, 0.22]} s={[0.24, 0.33, 0.18]} o={0} />
      <P c="#3fb5a5" p={[0, 1.15, 0]} s={[0.44, 0.38, 0.4]} />
      <P c="#7fd6c9" p={[0, 1.04, 0.3]} s={[0.22, 0.13, 0.14]} o={0.015} />
      <P g="c" c="#fff4d6" p={[0, 1.42, 0.24]} s={[0.06, 0.13, 0.06]} r={[0.5, 0, 0]} />
    </>
  )
}

function Mayumoth() {
  return (
    <Wobble kind="bob" speed={0.9}>
      <M>
        <Wobble kind="flap" speed={1.3} amp={0.8} p={[0.15, 1.0, -0.1]}>
          <P c="#f4b6c8" p={[0.42, 0.22, 0]} s={[0.42, 0.3, 0.04]} r={[0, 0, 0.3]} />
          <P c="#ffffff" p={[0.5, 0.3, 0.04]} s={[0.1, 0.1, 0.02]} o={0.01} />
          <P c="#8a4a7a" p={[0.5, 0.3, 0.06]} s={[0.05, 0.05, 0.02]} o={0} />
          <P c="#c8e6a0" p={[0.3, -0.3, 0]} s={[0.28, 0.24, 0.04]} r={[0, 0, -0.4]} />
        </Wobble>
        <P g="y" c="#2b2233" p={[0.12, 1.55, 0.1]} s={[0.012, 0.15, 0.012]} r={[0.3, 0, -0.4]} o={0} />
        <P c="#f7d9a0" p={[0.19, 1.68, 0.15]} s={[0.07, 0.04, 0.02]} o={0.01} />
        <Eye p={[0.1, 1.3, 0.2]} s={0.075} />
      </M>
      <P c="#fff3d6" p={[0, 0.8, 0]} s={[0.24, 0.42, 0.24]} />
      <P g="t" c="#fffaf0" p={[0, 1.08, 0]} s={[0.22, 0.22, 0.4]} r={[Math.PI / 2, 0, 0]} />
      <P c="#fff3d6" p={[0, 1.3, 0.02]} s={0.24} />
    </Wobble>
  )
}

function Zenmaigame() {
  return (
    <>
      <M>
        <P c="#bfe08a" p={[0.4, 0.12, 0.3]} s={[0.13, 0.13, 0.13]} />
        <P c="#bfe08a" p={[0.4, 0.12, -0.3]} s={[0.13, 0.13, 0.13]} />
        <Eye p={[0.1, 0.55, 0.92]} s={0.05} />
      </M>
      <P g="h" c="#9fb3c8" p={[0, 0.3, 0]} s={[0.66, 0.55, 0.66]} />
      <P g="t" c="#7d8fa3" p={[0, 0.3, 0]} s={[0.66, 0.66, 0.5]} r={[Math.PI / 2, 0, 0]} />
      <P c="#bfe08a" p={[0, 0.48, 0.78]} s={[0.22, 0.2, 0.22]} />
      <Wobble kind="flap" speed={0.5} amp={2} p={[0, 0.85, 0]}>
        <P g="y" c="#c9a24a" p={[0, 0.1, 0]} s={[0.04, 0.12, 0.04]} o={0.012} />
        <P g="t" c="#e6c26a" p={[0.12, 0.26, 0]} s={0.1} o={0.012} />
        <P g="t" c="#e6c26a" p={[-0.12, 0.26, 0]} s={0.1} o={0.012} />
      </Wobble>
    </>
  )
}

function Hoshikujira() {
  return (
    <Wobble kind="bob" speed={0.6} amp={1.6}>
      <group position={[0, 0.95, 0]} rotation={[0, -0.5, 0]}>
        <P c="#2f3f8f" s={[1.0, 0.5, 0.55]} />
        <P c="#9fb0ff" p={[0.05, -0.18, 0]} s={[0.9, 0.3, 0.48]} o={0} />
        <Wobble kind="sway" amp={1.2} p={[-0.95, 0.12, 0]}>
          <P g="c" c="#2f3f8f" p={[-0.12, 0.18, 0]} s={[0.12, 0.25, 0.08]} r={[0, 0, 1.1]} />
          <P g="c" c="#2f3f8f" p={[-0.12, -0.05, 0]} s={[0.12, 0.25, 0.08]} r={[0, 0, 2.0]} />
        </Wobble>
        <P c="#253275" p={[0.2, -0.3, 0.48]} s={[0.25, 0.06, 0.12]} r={[0.4, 0, -0.4]} />
        <M>
          <group position={[0.7, 0.02, 0.38]}>
            <Eye p={[0, 0, 0]} s={0.06} />
          </group>
        </M>
        {[
          [-0.2, 0.46, 0.1],
          [0.25, 0.48, -0.05],
          [0.5, 0.36, 0.2],
          [-0.55, 0.32, -0.1],
        ].map((p, i) => (
          <P key={i} g="o" c="#ffe86b" p={p as V3} s={0.05} o={0} />
        ))}
      </group>
    </Wobble>
  )
}

const MODELS: Record<string, { Model: () => ReactNode; fit: number }> = {
  ポムリーフ: { Model: Pomleaf, fit: 1.05 },
  ヒダマル: { Model: Hidamaru, fit: 1 },
  シズクラゲ: { Model: Shizukurage, fit: 1 },
  ピリモグ: { Model: Pirimog, fit: 1.05 },
  イワコロン: { Model: Iwakoron, fit: 1.05 },
  ユメフクロ: { Model: Yumefukuro, fit: 1 },
  コオリス: { Model: Koorisu, fit: 1.05 },
  カゲボウ: { Model: Kageboh, fit: 1 },
  ツノドラコ: { Model: Tsunodraco, fit: 1 },
  マユモス: { Model: Mayumoth, fit: 1 },
  ゼンマイガメ: { Model: Zenmaigame, fit: 1.1 },
  ホシクジラ: { Model: Hoshikujira, fit: 0.85 },
}

/** 名前からモデルを描く。uniforms を渡すとフラッシュ・ディゾルブ・シルエットを外から操作できる */
export function Monster3D({ name, uniforms, still = false }: { name: string; uniforms?: MonUniforms; still?: boolean }) {
  const own = useMemo(() => makeMonUniforms(), [])
  const U = uniforms ?? own
  const ctx = useMemo(() => ({ U, still }), [U, still])
  const entry = MODELS[name] ?? MODELS['ヒダマル']
  const Model = entry.Model
  return (
    <Ctx.Provider value={ctx}>
      <group scale={entry.fit}>
        <Model />
      </group>
    </Ctx.Provider>
  )
}

/** 捕獲カプセル(オリジナルの道具デザイン) */
export function Capsule3D({ uniforms }: { uniforms?: MonUniforms }) {
  const own = useMemo(() => makeMonUniforms(), [])
  const ctx = useMemo(() => ({ U: uniforms ?? own, still: false }), [uniforms, own])
  return (
    <Ctx.Provider value={ctx}>
      <P g="h" c="#2fb39a" p={[0, 0.02, 0]} s={0.16} />
      <P g="h" c="#f4f1e6" p={[0, -0.02, 0]} s={0.16} r={[Math.PI, 0, 0]} />
      <P g="y" c="#ffcf4a" s={[0.17, 0.025, 0.17]} o={0.012} />
      <P c="#ffffff" p={[0, 0, 0.16]} s={[0.045, 0.045, 0.02]} o={0.01} />
    </Ctx.Provider>
  )
}
