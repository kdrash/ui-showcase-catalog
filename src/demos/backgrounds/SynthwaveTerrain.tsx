import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/**
 * シンセウェーブ風の無限地形 (素の Three.js / React Three Fiber なし)
 * - useEffect 内で WebGLRenderer / Scene / Camera を自前で作り、requestAnimationFrame で描画
 * - PlaneGeometry の頂点 y をずらして山を作り、2枚を交互に前へ流して無限スクロール
 * - グリッド線は ShaderMaterial + fwidth() で描画 (ワイヤーフレームの斜め線が出ない)
 * - 太陽はストライプを discard で抜いた円。空は CSS グラデーション (renderer は alpha: true)
 * - アンマウント時に rAF / ResizeObserver / geometry / material / renderer を全て破棄
 */

const W = 60 // 地形の幅 (横長画面でも端が見えないように広め)
const L = 40 // 地形1枚の奥行き
const SEG_X = 120
const SEG_Z = 80 // セルサイズ 0.5 x 0.5
const SKY_BOTTOM = new THREE.Vector3(0x3d / 255, 0x0b / 255, 0x5c / 255) // #3d0b5c (CSS の空の下端色と一致させる)

/** 周期的なハッシュ (行 0 と行 SEG_Z が同じ値 → 2枚の継ぎ目がつながる) */
function hash(i: number, j: number) {
  const s = Math.sin(i * 127.1 + (j % SEG_Z) * 311.7) * 43758.5453
  return s - Math.floor(s)
}

function createTerrainGeometry() {
  const g = new THREE.PlaneGeometry(W, L, SEG_X, SEG_Z)
  g.rotateX(-Math.PI / 2)
  const pos = g.attributes.position as THREE.BufferAttribute
  for (let iz = 0; iz <= SEG_Z; iz++) {
    for (let ix = 0; ix <= SEG_X; ix++) {
      const idx = iz * (SEG_X + 1) + ix
      const x = pos.getX(idx)
      const z = pos.getZ(idx)
      const side = Math.min(1, Math.max(0, Math.abs(x) - 2.5) / 7) // 中央は平らな道路
      const ridge =
        0.55 + 0.45 * Math.sin((z / L) * Math.PI * 2 * 3 + x * 0.8) * Math.cos((z / L) * Math.PI * 2 * 5 - x * 0.35)
      const h = side * side * (1.2 + ridge * 3.2 + hash(ix, iz) * 0.9)
      pos.setY(idx, h)
    }
  }
  pos.needsUpdate = true
  return g
}

const terrainVertex = /* glsl */ `
  varying vec3 vLocal;
  varying float vDepth;
  void main() {
    vLocal = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`

const terrainFragment = /* glsl */ `
  uniform vec3 uFog;
  uniform float uNear;
  uniform float uFar;
  varying vec3 vLocal;
  varying float vDepth;
  void main() {
    vec2 c = vLocal.xz * 2.0;                       // 0.5 単位のグリッド
    vec2 grid = abs(fract(c - 0.5) - 0.5) / fwidth(c);
    float line = 1.0 - min(min(grid.x, grid.y), 1.0);
    float h = clamp(vLocal.y / 4.0, 0.0, 1.0);
    vec3 lineCol = mix(vec3(1.0, 0.18, 0.84), vec3(0.25, 0.9, 1.0), h); // ピンク → シアン
    vec3 base = vec3(0.05, 0.0, 0.1);
    vec3 col = mix(base, lineCol, line);
    float fog = smoothstep(uNear, uFar, vDepth);
    gl_FragColor = vec4(mix(col, uFog, fog), 1.0);
  }
`

const sunVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const sunFragment = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    float d = distance(vUv, vec2(0.5));
    if (d > 0.5) discard;
    vec3 top = vec3(1.0, 0.86, 0.25);
    vec3 bottom = vec3(1.0, 0.13, 0.55);
    vec3 col = mix(bottom, top, smoothstep(0.1, 0.9, vUv.y));
    // 下半分を横縞で抜く (下ほど隙間が太い)
    if (vUv.y < 0.55) {
      float stripe = fract(vUv.y * 13.0 + uTime * 0.25);
      if (stripe < (0.55 - vUv.y) * 1.25) discard;
    }
    gl_FragColor = vec4(col, 1.0);
  }
`

const glowFragment = /* glsl */ `
  varying vec2 vUv;
  void main() {
    float d = distance(vUv, vec2(0.5));
    float a = smoothstep(0.5, 0.0, d);
    // alpha にフォールオフを入れる (alpha=1 だと透明キャンバス上で黒い四角になる)
    gl_FragColor = vec4(1.0, 0.2, 0.65, a * a * 0.9);
  }
`

export function SynthwaveTerrain() {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    // --- renderer / scene / camera ---
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.setClearColor(0x000000, 0)
    mount.appendChild(renderer.domElement)
    renderer.domElement.style.display = 'block'

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 200)
    camera.position.set(0, 1.5, 5)

    // --- terrain (2枚を交互に流す) ---
    const terrainGeo = createTerrainGeometry()
    const terrainMat = new THREE.ShaderMaterial({
      vertexShader: terrainVertex,
      fragmentShader: terrainFragment,
      uniforms: { uFog: { value: SKY_BOTTOM }, uNear: { value: 8 }, uFar: { value: 32 } },
    })
    const tiles = [new THREE.Mesh(terrainGeo, terrainMat), new THREE.Mesh(terrainGeo, terrainMat)]
    tiles[0].position.z = 0
    tiles[1].position.z = -L
    tiles.forEach((t) => scene.add(t))

    // --- sun + glow ---
    const sunGeo = new THREE.PlaneGeometry(9, 9)
    const sunMat = new THREE.ShaderMaterial({
      vertexShader: sunVertex,
      fragmentShader: sunFragment,
      uniforms: { uTime: { value: 0 } },
      transparent: true,
    })
    const sun = new THREE.Mesh(sunGeo, sunMat)
    sun.position.set(0, 2.4, -36)
    scene.add(sun)

    const glowGeo = new THREE.PlaneGeometry(34, 34)
    const glowMat = new THREE.ShaderMaterial({
      vertexShader: sunVertex,
      fragmentShader: glowFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const glow = new THREE.Mesh(glowGeo, glowMat)
    glow.position.set(0, 2.4, -37)
    scene.add(glow)

    // --- resize ---
    const resize = () => {
      const w = mount.clientWidth
      const h = mount.clientHeight
      if (!w || !h) return
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(mount)
    resize()

    // --- pointer steering ---
    let pointerX = 0
    const onMove = (e: PointerEvent) => {
      const r = mount.getBoundingClientRect()
      pointerX = ((e.clientX - r.left) / r.width) * 2 - 1
    }
    mount.addEventListener('pointermove', onMove)

    // --- loop ---
    // THREE.Clock は r18x で非推奨 → THREE.Timer を使う
    const timer = new THREE.Timer()
    let raf = 0
    const tick = (now?: number) => {
      raf = requestAnimationFrame(tick)
      timer.update(now)
      const dt = Math.min(timer.getDelta(), 0.05)
      const speed = 7
      for (const t of tiles) {
        t.position.z += speed * dt
        if (t.position.z - L / 2 > camera.position.z + 1) t.position.z -= L * 2
      }
      sunMat.uniforms.uTime.value = timer.getElapsed()
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, pointerX * 1.6, 0.04)
      camera.lookAt(camera.position.x * 0.4, 1.3, -20)
      renderer.render(scene, camera)
    }
    tick()

    return () => {
      cancelAnimationFrame(raf)
      timer.dispose()
      ro.disconnect()
      mount.removeEventListener('pointermove', onMove)
      terrainGeo.dispose()
      terrainMat.dispose()
      sunGeo.dispose()
      sunMat.dispose()
      glowGeo.dispose()
      glowMat.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return (
    <div className="relative h-full w-full overflow-hidden bg-[linear-gradient(to_bottom,#05000f_0%,#1b0638_35%,#3d0b5c_58%,#3d0b5c_100%)]">
      <div ref={mountRef} className="absolute inset-0" />
      {/* スキャンライン */}
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(to_bottom,transparent_0px,transparent_2px,rgba(0,0,0,0.22)_3px)]" />
      <div
        className="pointer-events-none absolute inset-x-0 top-6 text-center"
        style={{ fontFamily: "'Orbitron', sans-serif" }}
      >
        <div className="bg-gradient-to-b from-white via-cyan-200 to-fuchsia-500 bg-clip-text text-3xl font-black tracking-[0.2em] text-transparent italic drop-shadow-[0_0_12px_rgba(255,47,214,0.6)] md:text-4xl">
          NEON HORIZON
        </div>
        <div className="mt-1 text-[10px] tracking-[0.5em] text-cyan-200/70">VANILLA THREE.JS · GLSL</div>
      </div>
    </div>
  )
}
