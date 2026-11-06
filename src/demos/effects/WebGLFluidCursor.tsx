import { useEffect, useRef, useState } from 'react'

/* ---------------- シェーダー(GLSL ES 3.00) ---------------- */
const VS = `#version 300 es
in vec2 aPos; uniform vec2 texel;
out vec2 vUv; out vec2 vL; out vec2 vR; out vec2 vT; out vec2 vB;
void main() {
  vUv = aPos * 0.5 + 0.5;
  vL = vUv - vec2(texel.x, 0.0); vR = vUv + vec2(texel.x, 0.0);
  vT = vUv + vec2(0.0, texel.y); vB = vUv - vec2(0.0, texel.y);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`
const H = `#version 300 es
precision highp float; precision highp sampler2D;
in vec2 vUv; in vec2 vL; in vec2 vR; in vec2 vT; in vec2 vB; out vec4 o;
`
const FS = {
  splat: H + `uniform sampler2D uTarget; uniform float aspect; uniform vec3 color; uniform vec2 point; uniform float radius;
    void main() { vec2 p = vUv - point; p.x *= aspect; vec3 s = exp(-dot(p, p) / radius) * color; o = vec4(texture(uTarget, vUv).xyz + s, 1.0); }`,
  advect: H + `uniform sampler2D uVelocity; uniform sampler2D uSource; uniform vec2 simTexel; uniform float dt; uniform float dissipation;
    void main() { vec2 c = vUv - dt * texture(uVelocity, vUv).xy * simTexel; o = texture(uSource, c) / (1.0 + dissipation * dt); }`,
  curl: H + `uniform sampler2D uVelocity;
    void main() { float L = texture(uVelocity, vL).y, R = texture(uVelocity, vR).y, T = texture(uVelocity, vT).x, B = texture(uVelocity, vB).x;
      o = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0); }`,
  vorticity: H + `uniform sampler2D uVelocity; uniform sampler2D uCurl; uniform float curl; uniform float dt;
    void main() { float L = texture(uCurl, vL).x, R = texture(uCurl, vR).x, T = texture(uCurl, vT).x, B = texture(uCurl, vB).x, C = texture(uCurl, vUv).x;
      vec2 f = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L)); f /= length(f) + 1e-4; f *= curl * C; f.y *= -1.0;
      vec2 v = texture(uVelocity, vUv).xy + f * dt; o = vec4(clamp(v, -1000.0, 1000.0), 0.0, 1.0); }`,
  divergence: H + `uniform sampler2D uVelocity;
    void main() { float L = texture(uVelocity, vL).x, R = texture(uVelocity, vR).x, T = texture(uVelocity, vT).y, B = texture(uVelocity, vB).y;
      vec2 C = texture(uVelocity, vUv).xy;
      if (vL.x < 0.0) L = -C.x; if (vR.x > 1.0) R = -C.x; if (vT.y > 1.0) T = -C.y; if (vB.y < 0.0) B = -C.y;
      o = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0); }`,
  clear: H + `uniform sampler2D uTexture; uniform float value; void main() { o = value * texture(uTexture, vUv); }`,
  pressure: H + `uniform sampler2D uPressure; uniform sampler2D uDivergence;
    void main() { float L = texture(uPressure, vL).x, R = texture(uPressure, vR).x, T = texture(uPressure, vT).x, B = texture(uPressure, vB).x;
      o = vec4((L + R + B + T - texture(uDivergence, vUv).x) * 0.25, 0.0, 0.0, 1.0); }`,
  gradient: H + `uniform sampler2D uPressure; uniform sampler2D uVelocity;
    void main() { float L = texture(uPressure, vL).x, R = texture(uPressure, vR).x, T = texture(uPressure, vT).x, B = texture(uPressure, vB).x;
      o = vec4(texture(uVelocity, vUv).xy - vec2(R - L, T - B), 0.0, 1.0); }`,
  display: H + `uniform sampler2D uTexture;
    void main() { vec3 c = texture(uTexture, vUv).rgb; c = pow(c / (1.0 + c * 0.35), vec3(0.85)); o = vec4(c, 1.0); }`,
}

type Prog = { p: WebGLProgram; u: Record<string, WebGLUniformLocation | null> }
type FBO = { tex: WebGLTexture; fbo: WebGLFramebuffer; w: number; h: number }
type DFBO = { read: FBO; write: FBO; swap: () => void }

function hsv(h: number) {
  const f = (n: number) => {
    const k = (n + h * 6) % 6
    return 1 - Math.max(0, Math.min(k, 4 - k, 1))
  }
  return [f(5), f(3), f(1)]
}

/** 素の WebGL2 による安定流体(Stable Fluids)シミュレーション。カーソルで絵の具をかき混ぜる */
export function WebGLFluidCursor() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [unsupported, setUnsupported] = useState(false)

  useEffect(() => {
    const root = rootRef.current!
    // StrictMode の再実行でも失われたコンテキストを使い回さないよう、毎回 canvas を作る
    const canvas = document.createElement('canvas')
    canvas.className = 'absolute inset-0 h-full w-full'
    root.prepend(canvas)
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, preserveDrawingBuffer: false })
    if (!gl || !gl.getExtension('EXT_color_buffer_float')) {
      setUnsupported(true)
      canvas.remove()
      return
    }
    gl.getExtension('OES_texture_float_linear')

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader error')
      return s
    }
    const vs = compile(gl.VERTEX_SHADER, VS)
    const progs: Record<string, Prog> = {}
    for (const [name, src] of Object.entries(FS)) {
      const p = gl.createProgram()!
      gl.attachShader(p, vs)
      gl.attachShader(p, compile(gl.FRAGMENT_SHADER, src))
      gl.bindAttribLocation(p, 0, 'aPos')
      gl.linkProgram(p)
      const u: Prog['u'] = {}
      const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number
      for (let i = 0; i < n; i++) {
        const info = gl.getActiveUniform(p, i)!
        u[info.name] = gl.getUniformLocation(p, info.name)
      }
      progs[name] = { p, u }
    }

    const vao = gl.createVertexArray()
    gl.bindVertexArray(vao)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

    const textures: WebGLTexture[] = []
    const fbos: WebGLFramebuffer[] = []
    const makeFBO = (w: number, h: number): FBO => {
      const tex = gl.createTexture()!
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null)
      const fbo = gl.createFramebuffer()!
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
      gl.viewport(0, 0, w, h)
      gl.clearColor(0, 0, 0, 1)
      gl.clear(gl.COLOR_BUFFER_BIT)
      textures.push(tex)
      fbos.push(fbo)
      return { tex, fbo, w, h }
    }
    const makeDouble = (w: number, h: number): DFBO => {
      const d = {
        read: makeFBO(w, h),
        write: makeFBO(w, h),
        swap() {
          const t = d.read
          d.read = d.write
          d.write = t
        },
      }
      return d
    }

    let velocity: DFBO, dye: DFBO, pressure: DFBO, divergence: FBO, curl: FBO
    const res = (base: number) => {
      const a = canvas.width / canvas.height
      return a > 1 ? [Math.round(base * a), base] : [base, Math.round(base / a)]
    }
    const init = () => {
      textures.splice(0).forEach((t) => gl.deleteTexture(t))
      fbos.splice(0).forEach((f) => gl.deleteFramebuffer(f))
      const [sw, sh] = res(128)
      const [dw, dh] = res(512)
      velocity = makeDouble(sw, sh)
      pressure = makeDouble(sw, sh)
      divergence = makeFBO(sw, sh)
      curl = makeFBO(sw, sh)
      dye = makeDouble(dw, dh)
    }

    const use = (name: string, _t: null, texel: [number, number]) => {
      const pr = progs[name]
      gl.useProgram(pr.p)
      gl.uniform2f(pr.u.texel, texel[0], texel[1])
      return pr
    }
    let unit = 0
    const bindTex = (pr: Prog, name: string, f: FBO) => {
      gl.activeTexture(gl.TEXTURE0 + unit)
      gl.bindTexture(gl.TEXTURE_2D, f.tex)
      gl.uniform1i(pr.u[name], unit)
      unit++
    }
    const draw = (target: FBO | null) => {
      unit = 0
      if (target) {
        gl.viewport(0, 0, target.w, target.h)
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo)
      } else {
        gl.viewport(0, 0, canvas.width, canvas.height)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      }
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }
    const st = (): [number, number] => [1 / velocity.read.w, 1 / velocity.read.h]

    const splat = (x: number, y: number, dx: number, dy: number, color: number[]) => {
      const aspect = canvas.width / canvas.height
      const radius = (0.25 / 100) * (aspect > 1 ? aspect : 1)
      let pr = use('splat', null, st())
      unit = 0
      bindTex(pr, 'uTarget', velocity.read)
      gl.uniform1f(pr.u.aspect, aspect)
      gl.uniform2f(pr.u.point, x, y)
      gl.uniform3f(pr.u.color, dx, dy, 0)
      gl.uniform1f(pr.u.radius, radius)
      draw(velocity.write)
      velocity.swap()
      pr = use('splat', null, [1 / dye.read.w, 1 / dye.read.h])
      unit = 0
      bindTex(pr, 'uTarget', dye.read)
      gl.uniform1f(pr.u.aspect, aspect)
      gl.uniform2f(pr.u.point, x, y)
      gl.uniform3f(pr.u.color, color[0], color[1], color[2])
      gl.uniform1f(pr.u.radius, radius)
      draw(dye.write)
      dye.swap()
    }
    const randomSplat = () => {
      const c = hsv(Math.random()).map((v) => v * 0.9)
      splat(Math.random(), Math.random(), (Math.random() - 0.5) * 1800, (Math.random() - 0.5) * 1800, c)
    }

    const step = (dt: number) => {
      let pr = use('curl', null, st())
      unit = 0
      bindTex(pr, 'uVelocity', velocity.read)
      draw(curl)

      pr = use('vorticity', null, st())
      unit = 0
      bindTex(pr, 'uVelocity', velocity.read)
      bindTex(pr, 'uCurl', curl)
      gl.uniform1f(pr.u.curl, 28)
      gl.uniform1f(pr.u.dt, dt)
      draw(velocity.write)
      velocity.swap()

      pr = use('divergence', null, st())
      unit = 0
      bindTex(pr, 'uVelocity', velocity.read)
      draw(divergence)

      pr = use('clear', null, st())
      unit = 0
      bindTex(pr, 'uTexture', pressure.read)
      gl.uniform1f(pr.u.value, 0.8)
      draw(pressure.write)
      pressure.swap()

      pr = use('pressure', null, st())
      for (let i = 0; i < 20; i++) {
        unit = 0
        bindTex(pr, 'uDivergence', divergence)
        bindTex(pr, 'uPressure', pressure.read)
        draw(pressure.write)
        pressure.swap()
      }

      pr = use('gradient', null, st())
      unit = 0
      bindTex(pr, 'uPressure', pressure.read)
      bindTex(pr, 'uVelocity', velocity.read)
      draw(velocity.write)
      velocity.swap()

      pr = use('advect', null, st())
      unit = 0
      bindTex(pr, 'uVelocity', velocity.read)
      bindTex(pr, 'uSource', velocity.read)
      gl.uniform2f(pr.u.simTexel, ...st())
      gl.uniform1f(pr.u.dt, dt)
      gl.uniform1f(pr.u.dissipation, 0.2)
      draw(velocity.write)
      velocity.swap()

      pr = use('advect', null, [1 / dye.read.w, 1 / dye.read.h])
      unit = 0
      bindTex(pr, 'uVelocity', velocity.read)
      bindTex(pr, 'uSource', dye.read)
      gl.uniform2f(pr.u.simTexel, ...st())
      gl.uniform1f(pr.u.dt, dt)
      gl.uniform1f(pr.u.dissipation, 0.9)
      draw(dye.write)
      dye.swap()
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 1.5)
      const w = Math.max(2, Math.round(root.clientWidth * dpr))
      const h = Math.max(2, Math.round(root.clientHeight * dpr))
      if (w === canvas.width && h === canvas.height && velocity) return
      canvas.width = w
      canvas.height = h
      init()
      for (let i = 0; i < 6; i++) randomSplat()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(root)

    const ptr = { x: 0, y: 0, moved: false, dx: 0, dy: 0, color: hsv(Math.random()) }
    let lastInput = performance.now()
    let colorTimer = 0
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width
      const y = 1 - (e.clientY - r.top) / r.height
      ptr.dx = (x - ptr.x) * 6000
      ptr.dy = (y - ptr.y) * 6000
      if (Math.abs(ptr.dx) > 400 || Math.abs(ptr.dy) > 400) {
        // 初回やワープ時の大きなジャンプは無視
        ptr.dx = ptr.dy = 0
      }
      ptr.x = x
      ptr.y = y
      ptr.moved = true
      lastInput = performance.now()
    }
    const onDown = (e: PointerEvent) => {
      onMove(e)
      for (let i = 0; i < 3; i++) {
        const c = hsv(Math.random())
        splat(ptr.x, ptr.y, (Math.random() - 0.5) * 2500, (Math.random() - 0.5) * 2500, c.map((v) => v * 1.5))
      }
    }
    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerdown', onDown)

    let raf = 0
    let last = performance.now()
    let auto = 0
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const dt = Math.min((now - last) / 1000, 0.016667)
      last = now
      colorTimer += dt
      if (colorTimer > 0.6) {
        colorTimer = 0
        ptr.color = hsv(Math.random()).map((v) => v * 0.3)
      }
      if (ptr.moved) {
        ptr.moved = false
        splat(ptr.x, ptr.y, ptr.dx, ptr.dy, ptr.color)
      }
      if (now - lastInput > 1800) {
        auto += dt
        if (auto > 0.7) {
          auto = 0
          randomSplat()
        }
      }
      step(dt)
      const pr = use('display', null, [1 / canvas.width, 1 / canvas.height])
      unit = 0
      bindTex(pr, 'uTexture', dye.read)
      draw(null)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerdown', onDown)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      canvas.remove()
    }
  }, [])

  return (
    <div ref={rootRef} className="relative h-full w-full cursor-crosshair overflow-hidden bg-black [container-type:inline-size]">
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="text-center font-['Space_Grotesk'] text-[clamp(40px,12cqw,120px)] leading-none font-bold tracking-tighter text-white mix-blend-difference">
          fluid.
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-3 left-4 font-mono text-[10px] text-white/50">
        {unsupported ? 'WebGL2 + EXT_color_buffer_float が必要です' : 'move · click to burst — raw WebGL2 stable fluids'}
      </div>
    </div>
  )
}
