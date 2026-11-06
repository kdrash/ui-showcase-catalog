import { useEffect, useRef, useState } from 'react'
import { Mesh, Program, Renderer, Triangle } from 'ogl'

const TINTS: { name: string; c: [number, number, number]; css: string }[] = [
  { name: 'Pearl', c: [1, 0.9, 1], css: '#fde7ff' },
  { name: 'Chrome', c: [0.75, 0.82, 0.95], css: '#c3d1f2' },
  { name: 'Oil', c: [0.55, 1, 0.7], css: '#8dffb3' },
  { name: 'Sunset', c: [1, 0.6, 0.45], css: '#ff9a73' },
]

const vertex = /* glsl */ `
attribute vec2 position; attribute vec2 uv; varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }`

const fragment = /* glsl */ `
precision highp float;
uniform float uTime; uniform vec2 uRes; uniform vec2 uMouse; uniform vec3 uTint; uniform float uSpeed;
varying vec2 vUv;
vec3 pal(float t) { return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67))); }
void main() {
  float aspect = uRes.x / uRes.y;
  vec2 uv = (vUv - 0.5) * vec2(aspect, 1.0);
  vec2 m = (uMouse - 0.5) * vec2(aspect, 1.0);
  float d = length(uv - m);
  uv += 0.18 * (uv - m) * exp(-d * 3.5); // カーソル付近をレンズのように膨らませる
  float t = uTime * 0.25 * uSpeed;
  vec2 p = uv * 2.2;
  for (int i = 1; i < 7; i++) {
    float fi = float(i);
    p.x += 0.55 / fi * sin(fi * p.y + t + 0.3 * fi) + m.x * 0.08;
    p.y += 0.55 / fi * cos(fi * p.x + t * 1.1 + 0.5 * fi) + m.y * 0.08;
  }
  float v = 0.5 + 0.5 * sin(p.x + p.y);
  vec3 col = pal(v * 0.75 + t * 0.15 + d * 0.25);
  col = mix(col, col * uTint * 1.5, 0.5);
  float spec = pow(abs(sin(p.x * 1.4 - p.y * 0.8)), 22.0);
  col += spec * 0.55;
  col *= 0.85 + 0.15 * smoothstep(1.2, 0.0, length(uv));
  gl_FragColor = vec4(col, 1.0);
}`

/** OGL のフルスクリーンシェーダーで虹色に揺らめく「液体クローム」背景 */
export function OglIridescence() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [tint, setTint] = useState(0)
  const [speed, setSpeed] = useState(1)
  const uni = useRef<Program | null>(null)

  useEffect(() => {
    const root = rootRef.current!
    const renderer = new Renderer({ dpr: Math.min(window.devicePixelRatio, 1.5) })
    const gl = renderer.gl
    gl.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%'
    root.prepend(gl.canvas)
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        uRes: { value: [1, 1] },
        uMouse: { value: [0.5, 0.5] },
        uTint: { value: TINTS[0].c },
        uSpeed: { value: 1 },
      },
    })
    uni.current = program
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program })
    const resize = () => {
      renderer.setSize(root.clientWidth, root.clientHeight)
      program.uniforms.uRes.value = [root.clientWidth, root.clientHeight]
    }
    const ro = new ResizeObserver(resize)
    ro.observe(root)
    resize()
    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 }
    const onMove = (e: PointerEvent) => {
      const r = root.getBoundingClientRect()
      mouse.tx = (e.clientX - r.left) / r.width
      mouse.ty = 1 - (e.clientY - r.top) / r.height
    }
    root.addEventListener('pointermove', onMove)
    let raf = 0
    let time = 0
    let last = performance.now()
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      time += Math.min(0.05, (now - last) / 1000)
      last = now
      mouse.x += (mouse.tx - mouse.x) * 0.06
      mouse.y += (mouse.ty - mouse.y) * 0.06
      program.uniforms.uTime.value = time
      program.uniforms.uMouse.value = [mouse.x, mouse.y]
      renderer.render({ scene: mesh })
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      root.removeEventListener('pointermove', onMove)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      gl.canvas.remove()
      uni.current = null
    }
  }, [])

  useEffect(() => {
    if (uni.current) uni.current.uniforms.uTint.value = TINTS[tint].c
  }, [tint])
  useEffect(() => {
    if (uni.current) uni.current.uniforms.uSpeed.value = speed
  }, [speed])

  return (
    <div ref={rootRef} className="relative h-full w-full overflow-hidden bg-zinc-800 [container-type:inline-size]">
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="font-['Space_Grotesk'] text-[clamp(36px,11cqw,110px)] leading-none font-bold tracking-tighter text-white mix-blend-overlay">
            Iridescence
          </div>
          <div className="mt-2 text-xs tracking-[0.3em] text-white/80 uppercase drop-shadow">OGL · fragment shader</div>
        </div>
      </div>
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/30 bg-white/15 px-3 py-1.5 backdrop-blur-md">
        {TINTS.map((t, i) => (
          <button
            key={t.name}
            type="button"
            title={t.name}
            onClick={() => setTint(i)}
            className={`h-5 w-5 rounded-full ring-2 transition ${tint === i ? 'scale-110 ring-white' : 'ring-white/30'}`}
            style={{ background: t.css }}
          />
        ))}
        <input
          type="range"
          min={0.2}
          max={3}
          step={0.1}
          value={speed}
          onChange={(e) => setSpeed(+e.target.value)}
          className="w-20 accent-white"
          aria-label="speed"
        />
      </div>
    </div>
  )
}
