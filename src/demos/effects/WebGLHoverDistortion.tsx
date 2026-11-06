import { useEffect, useRef, useState } from 'react'
import { Mesh, Program, Renderer, Texture, Triangle } from 'ogl'
import { art } from '../_shared/art'

const PAIRS: [string, string, string][] = [
  [art('landscape', 0, 1200, 800), art('gradient', 5, 1200, 800), 'Dusk → Bloom'],
  [art('landscape', 1, 1200, 800), art('geometric', 3, 1200, 800), 'Ocean → Grid'],
  [art('landscape', 6, 1200, 800), art('gradient', 2, 1200, 800), 'Tropic → Haze'],
]

const vertex = /* glsl */ `
attribute vec2 position; attribute vec2 uv; varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }`

const fragment = /* glsl */ `
precision highp float;
uniform sampler2D tA; uniform sampler2D tB;
uniform float uProgress; uniform float uTime; uniform float uHover;
uniform vec2 uMouse; uniform vec2 uRes; uniform vec2 uImg;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; } return v; }
vec2 cover(vec2 uv) {
  float rs = uRes.x / uRes.y, ri = uImg.x / uImg.y;
  vec2 s = rs > ri ? vec2(1.0, ri / rs) : vec2(rs / ri, 1.0);
  return (uv - 0.5) * s + 0.5;
}
void main() {
  vec2 uv = vUv;
  vec2 d = uv - uMouse; d.x *= uRes.x / uRes.y;
  float dist = length(d);
  // カーソル周りの波紋
  float ripple = sin(dist * 46.0 - uTime * 7.0) * exp(-dist * 7.0) * 0.012 * uHover;
  uv += normalize(d + 1e-5) * ripple;
  float n = fbm(uv * 3.5 + uTime * 0.08);
  float v = n * 0.45 + (1.0 - clamp(dist, 0.0, 1.0)) * 0.55;
  float th = 1.0 - uProgress * 1.35;
  float mask = smoothstep(th, th + 0.12, v);
  float t = uProgress;
  vec2 uvA = cover(uv + (n - 0.5) * 0.35 * t);
  vec2 uvB = cover(uv - (n - 0.5) * 0.35 * (1.0 - t));
  vec3 a = texture2D(tA, uvA).rgb;
  vec3 b = texture2D(tB, uvB).rgb;
  vec3 col = mix(a, b, mask);
  float edge = mask * (1.0 - mask) * 4.0;
  col += vec3(1.0, 0.55, 0.85) * edge * 0.7;
  gl_FragColor = vec4(col, 1.0);
}`

/** OGL のシェーダーで2枚の画像をノイズ変位でモーフィング + カーソル波紋 */
export function WebGLHoverDistortion() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [pair, setPair] = useState(0)
  const pairRef = useRef(0)
  const apiRef = useRef<{ load: (i: number) => void } | null>(null)

  useEffect(() => {
    const root = rootRef.current!
    const renderer = new Renderer({ dpr: Math.min(window.devicePixelRatio, 1.5) })
    const gl = renderer.gl
    gl.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%'
    root.prepend(gl.canvas)
    const texA = new Texture(gl, { generateMipmaps: false })
    const texB = new Texture(gl, { generateMipmaps: false })
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        tA: { value: texA },
        tB: { value: texB },
        uProgress: { value: 0 },
        uTime: { value: 0 },
        uHover: { value: 0 },
        uMouse: { value: [0.5, 0.5] },
        uRes: { value: [1, 1] },
        uImg: { value: [1200, 800] },
      },
    })
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program })
    const loadImg = (tex: Texture, src: string) => {
      const img = new Image()
      img.onload = () => (tex.image = img)
      img.src = src
    }
    const load = (i: number) => {
      loadImg(texA, PAIRS[i][0])
      loadImg(texB, PAIRS[i][1])
    }
    load(0)
    apiRef.current = { load }

    const resize = () => {
      renderer.setSize(root.clientWidth, root.clientHeight)
      program.uniforms.uRes.value = [root.clientWidth, root.clientHeight]
    }
    const ro = new ResizeObserver(resize)
    ro.observe(root)
    resize()

    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 }
    let hover = false
    let progress = 0
    let hv = 0
    const onMove = (e: PointerEvent) => {
      const r = root.getBoundingClientRect()
      mouse.tx = (e.clientX - r.left) / r.width
      mouse.ty = 1 - (e.clientY - r.top) / r.height
      hover = true
    }
    const onLeave = () => (hover = false)
    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerleave', onLeave)

    let raf = 0
    const start = performance.now()
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const t = (now - start) / 1000
      // ホバーしていない間はゆっくり自動で行き来(サムネイル用)
      const target = hover ? 1 : Math.sin(t * 0.7) > 0 ? 1 : 0
      progress += (target - progress) * 0.045
      hv += ((hover ? 1 : 0.35) - hv) * 0.05
      if (!hover) {
        mouse.tx = 0.5 + Math.sin(t * 0.7) * 0.25
        mouse.ty = 0.5 + Math.cos(t * 0.9) * 0.2
      }
      mouse.x += (mouse.tx - mouse.x) * 0.1
      mouse.y += (mouse.ty - mouse.y) * 0.1
      program.uniforms.uTime.value = t
      program.uniforms.uProgress.value = progress
      program.uniforms.uHover.value = hv
      program.uniforms.uMouse.value = [mouse.x, mouse.y]
      renderer.render({ scene: mesh })
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerleave', onLeave)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      gl.canvas.remove()
      apiRef.current = null
    }
  }, [])

  const next = () => {
    const i = (pairRef.current + 1) % PAIRS.length
    pairRef.current = i
    setPair(i)
    apiRef.current?.load(i)
  }

  return (
    <div ref={rootRef} className="relative h-full w-full cursor-pointer overflow-hidden bg-zinc-900" onClick={next}>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/60 to-transparent p-4 text-white">
        <div>
          <div className="font-mono text-[10px] tracking-[0.3em] text-white/60 uppercase">OGL · GLSL displacement</div>
          <div className="font-['Playfair_Display'] text-2xl font-bold italic">{PAIRS[pair][2]}</div>
        </div>
        <div className="text-[11px] text-white/70">hover で遷移 · click で次の画像</div>
      </div>
    </div>
  )
}
