import { AnimatePresence, animate, motion, useReducedMotion, type Transition, type Variants } from 'motion/react'
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from 'react'

/**
 * スタイリッシュJRPG風の傾いたポーズメニュー(赤・黒・白のパンチのある演出)。
 * - ポーズの開閉: 通常画面(横スクロールする夜の街)を Esc / ボタンで一時停止すると、CSS アニメを止めて
 *   グレースケール+赤の乗算で「静止画」化 → 白フラッシュ → 画面をまたぐ斜めの帯(山形の切り口)が走り、
 *   背景がクリップパスの斜めワイプで差し込まれる。項目は画面外から 1 つずつ叩きつけられ(オーバーシュートする spring)、
 *   それぞれの傾きで止まる。切り抜き文字の「PAUSE」が中央に押されてから左上へ飛ぶ。閉じるときは逆向きに素早く抜ける
 * - 背景は生 WebGL のフラグメントシェーダ1枚: 揺らぐ放射状の集中線、fbm の墨雲、45°の網点(トーンは距離とノイズで変化)、
 *   選択・決定で走る衝撃波リング、開くときのズームと回転。dpr は 1.5 まで、画面外では描画を止める(WebGL 不可なら CSS の放射模様)
 * - 待機中: 破片が二層でゆっくり漂い、ポインタでずれる(視差)。ハイライトのギザギザは rAF で頂点を 12fps でずらす「線の震え」と
 *   ゆっくりした呼吸を DOM 属性に直接書く(React は再描画しない)。赤い影は柔らかさの違う spring 3 枚で残像になる
 * - 選択: 選んだ項目の文字は 1 字ずつ飛び込み、切り抜き風に黒箱・赤字が混ざり、steps() のキーフレームで順にカクッと跳ねる。
 *   移動元→移動先をつなぐ白いモーションスミア、画面全体の小さな揺れ、キャラクターの頭・目の光・腕が反応
 * - 決定: 一瞬の色反転(インパクトフレーム)→ 赤地に集中線 → 目元の帯・切り抜き文字の帯・英字の帯が交互の向きで走るカットイン。
 *   サブ画面は斜めにすべり込み、ギザギザのタブ(layoutId で赤い札が移動)、切り抜き文字の見出し、
 *   項目ごとの振り付け(リストの段差スライド・カードを配る・バーが伸びる・レーダーが開く・数値のカウントアップ)で入る。
 *   Esc で逆向きの斬撃とともに戻る。←→ でタブ切替
 * - 右のキャラクターは部位ごとに分けた 2D SVG のオリジナルシルエット。白い輪郭と赤いずらし影は feMorphology の膨張フィルタ
 * - キー操作はデモのルート要素にフォーカスがあるときだけ。useReducedMotion 時は帯・カットイン・震えを省き、短いフェードで切り替える
 */

const RED = '#e3141e'
const BLACK = '#0c0b0d'
const WHITE = '#f6f1e7'

const rnd = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

const MENU = [
  { label: 'スキル', en: 'SKILL', x: 22, y: 4, rot: -10, size: 46 },
  { label: 'アイテム', en: 'ITEM', x: 74, y: 64, rot: -6, size: 38 },
  { label: '装備', en: 'EQUIP', x: 36, y: 116, rot: -13, size: 50 },
  { label: '仲間', en: 'PARTY', x: 104, y: 170, rot: -5, size: 40 },
  { label: 'ステータス', en: 'STATUS', x: 48, y: 230, rot: -8, size: 30 },
  { label: 'システム', en: 'SYSTEM', x: 130, y: 282, rot: -4, size: 26 },
] as const
const itemWidth = (i: number) => MENU[i].label.length * MENU[i].size * 1.03 + MENU[i].en.length * 6.6 + 20

/** ハイライトの形。毎回少し違うギザギザにする */
const JAGS = [
  '0,22 8,0 36,10 60,1 100,14 93,50 100,88 66,100 34,90 3,100 8,58',
  '4,8 30,0 52,12 82,2 100,20 95,62 99,100 58,90 26,100 0,84 6,44',
  '0,14 22,4 44,0 70,10 98,0 92,46 100,78 74,100 40,92 10,100 4,52',
]
const JAG_PTS = JAGS.map((s) => s.split(/[ ,]/).map(Number))

const RM = createContext(false)

/* ───────── WebGL 背景(集中線 + 墨 + 網点) ───────── */

type Fx = { open: number; target: number; pulse: number; mx: number; my: number; dirty: boolean }

const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'
const FRAG = `
precision highp float;
uniform vec2 uRes; uniform vec2 uC; uniform float uTime; uniform float uPulse; uniform float uOpen; uniform float uDpr;
const vec3 RED = vec3(.890,.078,.118);
const vec3 DEEP = vec3(.42,.03,.055);
const vec3 INK = vec3(.047,.043,.051);
const vec3 PAPER = vec3(.965,.945,.906);
float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x), mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x), f.y); }
float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<3;i++){ s+=a*noise(p); p=p*2.03+17.1; a*=.5; } return s; }
void main(){
  vec2 fc = gl_FragCoord.xy;
  float S = min(uRes.x, uRes.y);
  float zoom = mix(.28, 1., uOpen);
  vec2 p = (fc - uC*uRes) / S * zoom;
  float r = length(p);
  float a = atan(p.y, p.x);
  const float N = 22.;
  float spin = uTime*.025 + (1.-uOpen)*1.7;
  float u = (a + spin) / 6.2831853 * N + .07*sin(r*5.5 - uTime*1.3);
  float id = mod(floor(u), N);
  float c = abs(fract(u) - .5);
  float w = .085 + .14*hash(vec2(id, 3.)) + uPulse*.08;
  float aa = N * zoom / (6.2831853 * max(r, .002) * S) * 1.4;
  float ray = smoothstep(w + aa, w - aa, c);
  float deep = smoothstep(w + .07 + aa, w + .07 - aa, c);
  vec3 col = mix(INK, DEEP, deep);
  col = mix(col, RED, ray);
  col = mix(col, RED, smoothstep(.045, .0, r));
  float ink = smoothstep(.46, .78, fbm(p*1.6 + vec2(uTime*.03, -uTime*.02)) + (r - .55)*.6);
  col = mix(col, INK, ink*.9);
  float rr = (1. - uPulse) * 1.8;
  float ring = smoothstep(.045, 0., abs(r - rr)) * uPulse;
  col = mix(col, PAPER, ring*.85);
  float cell = 7. * uDpr;
  vec2 q = mat2(.7071, -.7071, .7071, .7071) * fc / cell;
  vec2 g = fract(q) - .5;
  float tone = clamp(smoothstep(.45, 1.35, r)*.7 + (fbm(p*2.3 - uTime*.04) - .5)*.9 + ink*.2, 0., 1.);
  float rad = tone * .6;
  float dotm = 1. - smoothstep(rad - 1.1/cell, rad + 1.1/cell, length(g));
  vec3 dc = ray > .5 ? INK : RED * .78;
  col = mix(col, dc, dotm * step(.07, tone) * .92);
  col *= 1. - smoothstep(.5, 1.6, r) * .55;
  col += (hash(fc + fract(uTime*7.)*91.) - .5) * .035;
  gl_FragColor = vec4(col, 1.);
}`

function Backdrop({ fx, reduced }: { fx: RefObject<Fx>; reduced: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' })
    if (!gl) {
      setFailed(true)
      return
    }
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)
      if (!s) return null
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null
    }
    const vs = compile(gl.VERTEX_SHADER, VERT)
    const fs = compile(gl.FRAGMENT_SHADER, FRAG)
    const prog = gl.createProgram()
    if (!vs || !fs || !prog) {
      setFailed(true)
      return
    }
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      setFailed(true)
      return
    }
    gl.useProgram(prog)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const U = (n: string) => gl.getUniformLocation(prog, n)
    const uRes = U('uRes'), uC = U('uC'), uTime = U('uTime'), uPulse = U('uPulse'), uOpen = U('uOpen'), uDpr = U('uDpr')

    let w = 1, h = 1, dpr = 1, visible = true, raf = 0, last = performance.now(), t = 3
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const r = canvas.getBoundingClientRect()
      w = Math.max(1, Math.round(r.width * dpr))
      h = Math.max(1, Math.round(r.height * dpr))
      canvas.width = w
      canvas.height = h
      gl.viewport(0, 0, w, h)
      fx.current.dirty = true
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
    })
    io.observe(canvas)

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (!visible) return
      const f = fx.current
      if (reduced) {
        if (f.open !== f.target) {
          f.open = f.target
          f.dirty = true
        }
        f.pulse = 0
      } else {
        f.open += (f.target - f.open) * Math.min(1, dt * (f.target > f.open ? 4.2 : 9))
        if (Math.abs(f.target - f.open) < 0.002) f.open = f.target
        f.pulse = Math.max(0, f.pulse - dt * 1.5)
        t += dt
      }
      if (f.target === 0 && f.open === 0) return
      if (reduced && !f.dirty) return
      f.dirty = false
      gl.uniform2f(uRes, w, h)
      gl.uniform2f(uC, 0.3 + f.mx * 0.02, 0.45 - f.my * 0.02)
      gl.uniform1f(uTime, t)
      gl.uniform1f(uPulse, f.pulse)
      gl.uniform1f(uOpen, f.open)
      gl.uniform1f(uDpr, dpr)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      // StrictMode の再実行で同じ canvas を使い回すので、コンテキストは失わせずリソースだけ解放する
      gl.deleteBuffer(buf)
      gl.deleteProgram(prog)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
    }
  }, [fx, reduced])

  if (failed)
    return (
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute top-[55%] left-[30%] aspect-square w-[210%] max-w-none"
          style={{
            background: `repeating-conic-gradient(from 0deg, ${RED} 0deg 6deg, #6b0810 6deg 9deg, ${BLACK} 9deg 18deg)`,
            transform: 'translate(-50%, -50%)',
            animation: reduced ? undefined : 'tpm-spin 90s linear infinite',
          }}
        />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 30% 55%, transparent 0 18%, rgba(12,11,13,.55) 45%, rgba(12,11,13,.95) 80%)' }} />
      </div>
    )
  return <canvas ref={ref} className="absolute inset-0 size-full" />
}

/* ───────── 通常画面(ポーズ前の夜の街) ───────── */

function skyline(seed: number, w: number, h: number, minH: number, maxH: number, winP: number) {
  let x = 0
  let k = 0
  let d = ''
  let win = ''
  while (x < w) {
    const bw = 34 + rnd(seed + k * 3.1) * 70
    const bh = minH + rnd(seed + k * 5.7) * (maxH - minH)
    const top = Math.round(h - bh)
    d += `M${x.toFixed(0)} ${h}V${top}H${(x + bw).toFixed(0)}V${h}Z`
    if (rnd(seed + k * 9.3) > 0.68) d += `M${(x + bw * 0.3).toFixed(0)} ${top}V${top - 16}H${(x + bw * 0.62).toFixed(0)}V${top}Z`
    if (winP > 0)
      for (let wy = top + 10; wy < h - 14; wy += 14)
        for (let wx = x + 7; wx < x + bw - 10; wx += 11) if (rnd(seed + wx * 0.37 + wy * 0.71) < winP) win += `M${wx.toFixed(0)} ${wy}h5v7h-5Z`
    x += bw + rnd(seed + k * 1.3) * 6
    k++
  }
  return { d, win }
}
const FAR = skyline(11, 1200, 300, 110, 250, 0.06)
const NEAR = skyline(47, 1200, 300, 50, 190, 0.3)

function World() {
  const strip = (layer: typeof FAR, fill: string, win: string, cls: string, dur: number) => (
    <div className={`tpm-anim absolute left-0 flex w-max ${cls}`} style={{ animation: `tpm-scroll ${dur}s linear infinite` }}>
      {[0, 1, 2].map((k) => (
        <svg key={k} viewBox="0 0 1200 300" preserveAspectRatio="none" className="h-full w-auto shrink-0" aria-hidden>
          <path d={layer.d} fill={fill} />
          <path d={layer.win} fill={win} />
        </svg>
      ))}
    </div>
  )
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: 'linear-gradient(#15141c, #2a2633 42%, #5e4a52 76%, #7f625c)' }}>
      <div className="absolute top-[10%] right-[20%] size-[16cqmin] rounded-full bg-[#ece2cf] shadow-[0_0_70px_24px_rgba(236,226,207,.18)]" />
      {strip(FAR, '#383341', 'rgba(233,215,156,.35)', 'bottom-[17%] h-[52%] opacity-90', 90)}
      {strip(NEAR, '#131218', '#e9d79c', 'bottom-[15%] h-[40%]', 32)}
      <div className="absolute inset-x-0 bottom-0 h-[15.5%] bg-[#0f0e12]" />
      <div
        className="tpm-anim absolute inset-x-0 bottom-[7%] h-[3px]"
        style={{ background: 'repeating-linear-gradient(90deg, #6b6470 0 40px, transparent 40px 80px)', animation: 'tpm-road .5s linear infinite' }}
      />
      {/* 通常画面の HUD */}
      <div className="absolute top-3 left-3 flex items-center gap-2 font-mono text-[11px] font-bold text-[#ece2cf] @min-[40rem]:top-4 @min-[40rem]:left-5">
        <span className="rounded-sm bg-black/50 px-2 py-0.5">駅前通り</span>
        <span className="opacity-70">18:42</span>
      </div>
      <div className="absolute inset-x-3 bottom-[calc(var(--solo-footer-clearance,0px)_+_2.6rem)] mx-auto max-w-xl rounded-md border border-white/20 bg-black/65 px-4 py-2 text-[13px] text-[#ece2cf] @min-[40rem]:text-sm">
        <span className="mr-2 text-[11px] font-bold opacity-60">カイリ</span>
        ──今日はまっすぐ帰るか、少し寄り道するか。
      </div>
    </div>
  )
}

/* ───────── 切り抜き文字(脅迫状風) ───────── */

const RANSOM = [
  { bg: BLACK, fg: WHITE },
  { bg: RED, fg: WHITE },
  { bg: WHITE, fg: BLACK },
  { bg: BLACK, fg: RED },
  { bg: WHITE, fg: RED },
]
const LATIN = ["'Playfair Display',serif", "'Space Grotesk',sans-serif", "'Orbitron',sans-serif", "'Noto Sans JP',sans-serif"]

function Ransom({ text, seed = 0, deal = false, delay = 0, className = '' }: { text: string; seed?: number; deal?: boolean; delay?: number; className?: string }) {
  const reduced = useContext(RM)
  return (
    <span className={`inline-flex items-center ${className}`}>
      <span className="sr-only">{text}</span>
      {[...text].map((ch, j) => {
        const r1 = rnd(seed * 13.1 + j * 7.7)
        const r2 = rnd(seed * 3.3 + j * 1.9 + 4)
        const r3 = rnd(seed + j * 5.1 + 9)
        const c = RANSOM[Math.floor(r1 * RANSOM.length)]
        const latin = /[A-Za-z0-9!?]/.test(ch)
        const font = latin ? LATIN[Math.floor(r2 * LATIN.length)] : "'Noto Sans JP',sans-serif"
        const serif = font.startsWith("'Playfair")
        const rot = (r3 - 0.5) * 18
        const cut = `polygon(${(r1 * 9).toFixed(1)}% ${(r2 * 10).toFixed(1)}%, ${(100 - r3 * 8).toFixed(1)}% 0, 100% ${(100 - r1 * 9).toFixed(1)}%, ${(r2 * 7).toFixed(1)}% 100%)`
        return (
          <motion.span
            key={j}
            aria-hidden
            className="inline-block leading-none"
            style={{
              background: c.bg,
              color: c.fg,
              fontFamily: font,
              fontStyle: serif ? 'italic' : undefined,
              fontWeight: serif ? 600 : 900,
              fontSize: `${0.84 + r2 * 0.3}em`,
              padding: '0.12em 0.13em 0.08em',
              marginLeft: j ? '-0.03em' : 0,
              clipPath: cut,
              boxShadow: c.bg === WHITE ? `inset 0 0 0 2px ${BLACK}` : undefined,
            }}
            initial={deal && !reduced ? { y: '-1.4em', rotate: rot + (r1 - 0.5) * 140, scale: 2.4, opacity: 0 } : false}
            animate={{ y: `${((r1 - 0.5) * 0.14).toFixed(3)}em`, rotate: rot, scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 700, damping: 17, delay: delay + j * 0.045 }}
          >
            {ch}
          </motion.span>
        )
      })}
    </span>
  )
}

/* ───────── キャラクター(2D SVG のオリジナルシルエット) ───────── */

const INK = '#0e0d12'
const INK_LIGHT = '#2a2632'
/** 部位ごとの回転の支点(viewBox 座標) */
const origin = (x: number, y: number) => ({ transformBox: 'view-box' as const, transformOrigin: `${x}px ${y}px` })
const STAR = 'M0-12 2.4-2.4 12 0 2.4 2.4 0 12-2.4 2.4-12 0-2.4-2.4Z'

/**
 * 黒いシルエットに、SVG フィルタ(feMorphology の膨張)で白い輪郭と赤いずらし影をまとめて付ける。
 * 部位を分けた <g> を Motion で回し、待機の揺れ・カーソルへの視線(選択のたびに頭と腕がピクッと反応)・決定時の決めポーズを作る
 */
function Hero({ cursor, pose, reduced }: { cursor: number; pose: number; reduced: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const fx = `hero-fx-${uid}`
  const glow = `hero-glow-${uid}`
  const [posing, setPosing] = useState(false)
  useEffect(() => {
    if (!pose) return
    setPosing(true)
    const id = window.setTimeout(() => setPosing(false), 1300)
    return () => window.clearTimeout(id)
  }, [pose])

  const spring = reduced ? { duration: 0 } : { type: 'spring' as const, stiffness: 260, damping: 18 }
  const loop = (duration: number, values: number[]) =>
    reduced ? {} : { animate: { rotate: values }, transition: { duration, repeat: Infinity, ease: 'easeInOut' as const } }
  const twitch = (from: number) => (reduced ? { initial: false as const } : { initial: { rotate: from }, animate: { rotate: 0 }, transition: { type: 'spring' as const, stiffness: 620, damping: 13 } })

  return (
    <svg viewBox="0 0 340 540" className="h-full w-auto overflow-visible" aria-hidden>
      <defs>
        <filter id={fx} x="-20%" y="-10%" width="150%" height="125%">
          <feMorphology in="SourceAlpha" operator="dilate" radius="3.2" result="fat" />
          <feFlood floodColor={WHITE} />
          <feComposite in2="fat" operator="in" result="outline" />
          <feOffset in="fat" dx="11" dy="7" result="off" />
          <feFlood floodColor={RED} />
          <feComposite in2="off" operator="in" result="shadow" />
          <feMerge>
            <feMergeNode in="shadow" />
            <feMergeNode in="outline" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={glow} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="2.4" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <motion.g
        filter={`url(#${fx})`}
        style={origin(150, 520)}
        animate={posing ? { rotate: -5, x: -14, y: -6 } : { rotate: 0, x: 0, y: 0 }}
        transition={spring}
      >
        {/* マフラーの長い端(風になびく) */}
        <motion.g style={origin(176, 128)} {...loop(2.6, [0, -4, 2, 0])}>
          <motion.path
            d="M170 122C198 112 224 126 252 108 270 96 292 102 318 82L310 100 330 98C304 118 284 120 266 132 238 150 208 142 176 138Z"
            fill={RED}
            animate={posing ? { rotate: -14 } : { rotate: 0 }}
            transition={spring}
            style={origin(176, 128)}
          />
        </motion.g>

        {/* コートの裾(後ろ側、右へ大きく翻る) */}
        <motion.g style={origin(190, 250)} {...loop(2.2, [0, 3, -1, 0])}>
          <motion.path
            d="M116 244H190C206 288 236 328 300 352L268 366 296 396 244 392 254 420 206 382 196 306 168 296 150 290 132 300 118 362 94 438 80 430 98 340Z"
            fill={INK}
            animate={posing ? { rotate: 10, scaleX: 1.08 } : { rotate: 0, scaleX: 1 }}
            transition={spring}
            style={origin(190, 250)}
          />
        </motion.g>

        {/* 脚(重心を左脚に乗せたコントラポスト) */}
        <path d="M130 250H156L152 330 147 418 146 490H131L129 418 127 330Z" fill={INK} />
        <path d="M158 248 182 250 190 326 204 372 206 484H192L188 382 170 336Z" fill={INK} />
        <path d="M132 262 136 262 133 482 131 482ZM172 340 175 338 191 382 193 476 190 476 187 386Z" fill={INK_LIGHT} />
        <path d="M128 486H148L150 502 108 506 112 496Z" fill={INK} />
        <path d="M190 480H207L217 498 178 502 182 492Z" fill={INK} />

        {/* 胴とコート前身頃 */}
        <path d="M110 136C124 122 140 120 150 124 164 120 182 122 196 138L198 176 186 248H122L106 180Z" fill={INK} />
        <path d="M118 246 150 250 142 300 120 372 104 434 92 428 104 360Z" fill={INK} />
        <path d="M112 140 126 134 122 206 112 186Z" fill={INK_LIGHT} />
        <path d="M150 126 146 246" stroke={INK_LIGHT} strokeWidth="2" fill="none" />
        <path d="M123 234 187 237" stroke={RED} strokeWidth="4" fill="none" />
        <path d="M146 130 156 182 166 130Z" fill={RED} />

        {/* 右腕(ポケットに手を入れている) */}
        <path d="M184 134 200 138 210 202 196 206Z" fill={INK} />
        <path d="M196 200 210 204 198 264 182 258Z" fill={INK} />

        {/* 立ち襟と首巻き */}
        <path d="M126 122 116 92 142 116ZM176 116 190 88 192 126Z" fill={INK} />
        <path d="M134 116C148 128 166 128 180 114L184 126C168 142 146 142 130 128Z" fill={RED} />

        {/* 頭(カーソルの項目へ視線を向ける。選択のたびにピクッと振れ、目が光る) */}
        <motion.g
          style={origin(152, 118)}
          animate={{ rotate: posing ? -8 : (cursor - 2.5) * 2.4 }}
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 180, damping: 16 }}
        >
          <motion.g key={cursor} style={origin(152, 118)} {...twitch(cursor % 2 ? 7 : -7)}>
            <path d="M144 106H160L162 124H142Z" fill={INK} />
            <path d="M128 70C128 50 140 40 154 40 168 40 178 52 177 70 176 86 168 104 152 114 140 108 130 92 128 70Z" fill={INK} />
            <path d="M122 78 112 60 124 60 114 38 130 44 126 20 144 32 150 8 162 28 178 10 180 32 200 22 190 44 212 42 196 58 210 70 188 70 186 86 177 70 172 56 162 64 158 52 148 64 142 54 135 68 131 84Z" fill={INK} />
            <path d="M150 50 170 34 162 56Z" fill={INK_LIGHT} />
            <motion.path
              d="M136 75 156 70 141 81Z"
              fill={RED}
              filter={`url(#${glow})`}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              initial={reduced ? false : { scale: 2.2, fill: WHITE }}
              animate={{ scale: 1, fill: RED }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            />
            {!reduced && (
              <g transform="translate(140 72)">
                <motion.path
                  d={STAR}
                  fill={WHITE}
                  style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: [0, 1.3, 0], rotate: 45 }}
                  transition={{ duration: 0.38, ease: 'easeOut' }}
                />
              </g>
            )}
          </motion.g>
        </motion.g>

        {/* 左腕: 待機では手を顔に、決定時は前へ突き出す */}
        <motion.g animate={{ opacity: posing ? 0 : 1 }} transition={{ duration: reduced ? 0 : 0.08 }}>
          <motion.g key={cursor} style={origin(112, 136)} {...twitch(cursor % 2 ? -6 : 6)}>
            <path d="M106 132 124 140 112 198 94 194Z" fill={INK} />
            <path d="M94 190 110 198 138 112 124 104Z" fill={INK} />
            <path d="M120 106 128 100 138 102 150 84 156 88 148 102 160 92 162 98 150 110 158 106 158 112 144 120 126 120Z" fill={WHITE} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
            <path d="M123 108 137 112" stroke={RED} strokeWidth="4" />
          </motion.g>
        </motion.g>
        <motion.g
          style={origin(116, 136)}
          initial={false}
          animate={posing ? { opacity: 1, rotate: 0, scale: 1 } : { opacity: 0, rotate: 40, scale: 0.9 }}
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 16 }}
        >
          <path d="M108 130 124 142 70 132 62 116Z" fill={INK} />
          <path d="M70 134 62 114 20 92 14 106Z" fill={INK} />
          <path d="M18 92 4 80 0 86 6 94-14 90-14 96 2 100-10 104 6 108 14 106 22 102Z" fill={WHITE} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          <path d="M24 92 18 106" stroke={RED} strokeWidth="4" />
        </motion.g>
      </motion.g>
    </svg>
  )
}

/** カットインの目元。顔はすべて SVG で描いたオリジナル */
function Eyes() {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const eye = `eye-${uid}`
  return (
    <svg viewBox="0 0 600 160" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden>
      <defs>
        <clipPath id={eye}>
          <path d="M168 110Q204 84 266 96l12 10q-34 22-98 14Z" />
        </clipPath>
      </defs>
      <rect width="600" height="160" fill="#f3e4d6" />
      <path d="M330 0h270v160H300Z" fill="rgba(12,11,13,.1)" />
      <g id={`${eye}-half`}>
        <path d="M168 110Q204 84 266 96l12 10q-34 22-98 14Z" fill="#fff" />
        <g clipPath={`url(#${eye})`}>
          <circle cx="232" cy="106" r="15" fill={RED} />
          <circle cx="232" cy="106" r="7" fill={BLACK} />
          <circle cx="238" cy="100" r="4" fill="#fff" />
        </g>
        <path d="M164 110Q204 80 268 92l18 8" fill="none" stroke={BLACK} strokeWidth="8" strokeLinecap="square" />
        <path d="M182 122q46 4 92-14" fill="none" stroke={BLACK} strokeWidth="2.5" />
        <path d="M166 76 270 64l10 12-104 12Z" fill={BLACK} />
      </g>
      <use href={`#${eye}-half`} transform="translate(600 0) scale(-1 1)" />
      <path d="M300 112l-8 40" stroke="rgba(12,11,13,.25)" strokeWidth="3" />
      <path d="M0 0H600V30L572 74 552 24 520 66 496 20 462 70 440 22 404 58 384 16 352 54 330 12 300 50 270 12 248 54 216 16 196 58 164 20 140 70 106 22 82 66 50 24 28 74 0 30Z" fill={BLACK} />
      {[232, 368].map((x) => (
        <g key={x} transform={`translate(${x + 6} 100)`}>
          <motion.path
            d={STAR}
            fill="#fff"
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            initial={{ scale: 0, rotate: 0 }}
            animate={{ scale: [0, 1.6, 0.9, 0], rotate: 90 }}
            transition={{ duration: 0.5, delay: 0.28, times: [0, 0.3, 0.7, 1] }}
          />
        </g>
      ))}
    </svg>
  )
}

/* ───────── サブ画面 ───────── */

const rowCls = 'flex items-center gap-2 bg-[#0c0b0d] px-3 py-1.5 text-[#f6f1e7] transition-colors duration-100 hover:bg-[#e3141e]'
const clipRow = (i: number) => (i % 2 ? 'polygon(0 0, 100% 8%, 99% 100%, 1% 92%)' : 'polygon(1% 6%, 100% 0, 100% 92%, 0 100%)')
const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-[#e3141e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6f1e7]'

/** 段差をつけて右からすべり込む(hover の transition に遅延が乗らないよう animate 側に持たせる) */
const slideIn = (i: number, reduced: boolean, base = 0.18) =>
  reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1, transition: { duration: 0.15 } } }
    : {
        initial: { x: 110, skewX: -26, opacity: 0 },
        animate: { x: 0, skewX: 0, opacity: 1, transition: { delay: base + i * 0.05, type: 'spring' as const, stiffness: 560, damping: 25 } },
        transition: { type: 'spring' as const, stiffness: 700, damping: 30 },
      }

function Bar({ v, max = 100, red, delay = 0.3 }: { v: number; max?: number; red?: boolean; delay?: number }) {
  const reduced = useContext(RM)
  return (
    <span className="block h-2 min-w-0 flex-1 -skew-x-[30deg] bg-current/20">
      <motion.span
        className={`block h-full ${red ? 'bg-[#e3141e]' : 'bg-current'}`}
        style={{ width: `${(v / max) * 100}%`, originX: 0 }}
        initial={reduced ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay, type: 'spring', stiffness: 240, damping: 15 }}
      />
    </span>
  )
}

const SKILLS = [
  { n: '紅蓮の一閃', el: '火炎', sp: 8, d: '敵ひとりに炎の斬撃。まれに火傷を負わせる。' },
  { n: '雷鳴の鎖', el: '電撃', sp: 12, d: '敵全体に雷を落とす。感電で動きを止めることがある。' },
  { n: '静寂の帳', el: '補助', sp: 6, d: '3ターンのあいだ、味方全体の受けるダメージを軽減。' },
  { n: '夜明けの祈り', el: '回復', sp: 10, d: '味方ひとりの体力を大きく回復する。' },
  { n: '影踏み', el: '物理', sp: 5, d: '敵の背後へ回り込み、次のターン必ず先手を取る。' },
]

function SkillSub() {
  const reduced = useContext(RM)
  const [sel, setSel] = useState(0)
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 font-mono text-[10px] font-bold">
        SP <Bar v={84} max={120} red delay={0.15} /> 84/120
      </div>
      {SKILLS.map((s, i) => (
        <motion.button
          key={s.n}
          type="button"
          aria-describedby="tpm-skill-desc"
          onFocus={() => setSel(i)}
          onMouseEnter={() => setSel(i)}
          className={`${rowCls} ${focusRing} w-full text-left ${sel === i ? '!bg-[#e3141e]' : ''}`}
          style={{ clipPath: clipRow(i), marginLeft: `${i * 1.6}%`, width: `${100 - i * 1.6}%` }}
          whileHover={reduced ? undefined : { x: 6 }}
          {...slideIn(i, reduced)}
        >
          <span className="w-10 -skew-x-12 bg-[#f6f1e7] text-center text-[10px] font-black text-[#0c0b0d]">{s.el}</span>
          <span className="flex-1 text-sm font-black">{s.n}</span>
          <span className="font-mono text-[11px] font-bold">SP {s.sp}</span>
        </motion.button>
      ))}
      <div className="relative mt-1 min-h-[2.6em] -rotate-1 overflow-hidden border-l-4 border-[#e3141e] bg-[#0c0b0d] px-2 py-1 text-[11px] font-bold text-[#f6f1e7]">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.p
            key={sel}
            id="tpm-skill-desc"
            aria-live="polite"
            initial={reduced ? { opacity: 0 } : { x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { x: -40, opacity: 0 }}
            transition={{ duration: 0.14 }}
          >
            {SKILLS[sel].d}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  )
}

function ItemSub() {
  const reduced = useContext(RM)
  const [items, setItems] = useState([
    { n: '回復の小瓶', c: 4, msg: '体力が少し戻った' },
    { n: '澄んだ水', c: 2, msg: '気力がよみがえった' },
    { n: '気付けの香', c: 1, msg: '意識がはっきりした' },
    { n: '煙玉', c: 3, msg: '逃げ道ができた' },
  ])
  const [log, setLog] = useState({ k: 0, t: '使うアイテムを選んでください' })
  const used = useRef(false)
  return (
    <div className="flex flex-col gap-1.5">
      {items.map((it, i) => (
        <motion.button
          key={it.n}
          type="button"
          disabled={it.c === 0}
          onClick={() => {
            used.current = true
            setItems((l) => l.map((x, j) => (j === i ? { ...x, c: x.c - 1 } : x)))
            setLog({ k: Date.now(), t: `${it.n}を使った! ${it.msg}` })
          }}
          className={`${rowCls} ${focusRing} w-full text-left focus-visible:bg-[#e3141e] disabled:opacity-40`}
          style={{ clipPath: clipRow(i), marginLeft: `${i * 2}%`, width: `${100 - i * 2}%` }}
          whileHover={reduced ? undefined : { x: 6 }}
          whileTap={reduced ? undefined : { scale: 0.96, skewX: -8 }}
          {...slideIn(i, reduced)}
        >
          <span className="flex-1 text-sm font-black">{it.n}</span>
          <motion.span
            key={it.c}
            className="inline-block font-['Playfair_Display'] text-lg font-black italic tabular-nums"
            initial={reduced || !used.current ? false : { scale: 2, rotate: -14, color: RED }}
            animate={{ scale: 1, rotate: 0, color: WHITE }}
            transition={{ type: 'spring', stiffness: 600, damping: 14 }}
          >
            ×{it.c}
          </motion.span>
          <span className="-skew-x-12 bg-[#f6f1e7] px-1.5 text-[10px] font-black text-[#0c0b0d]">使う</span>
        </motion.button>
      ))}
      <div className="relative mt-1 min-h-[1.6em] overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.p
            key={log.k}
            aria-live="polite"
            className="-rotate-1 border-l-4 border-[#e3141e] pl-2 text-[11px] font-bold text-[#0c0b0d]"
            initial={reduced ? { opacity: 0 } : { x: 60, skewX: -20, opacity: 0 }}
            animate={{ x: 0, skewX: 0, opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.08 } }}
            transition={{ type: 'spring', stiffness: 600, damping: 26 }}
          >
            {log.k > 0 && <span className="mr-1 -skew-x-12 bg-[#e3141e] px-1 text-[10px] text-[#f6f1e7]">USE!</span>}
            {log.t}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  )
}

const ICONS: Record<string, string> = {
  dagger: 'M8 34 28 14l5 5-20 20Zm22-22 6-6 4 4-6 6ZM6 30l10 10-3 3-10-10Z',
  coat: 'M14 6h16l8 10-5 4-3-4v24H14V16l-3 4-5-4Z',
  cord: 'M10 26c0-10 8-18 14-18s10 6 6 12-14 8-14 16 8 6 12 2M18 36l-4 8M22 36l2 8',
}
const SLOTS = [
  { k: '武器', n: '夜鳴きの短刀', s: '攻 +24', icon: 'dagger' },
  { k: '防具', n: '影縫いの外套', s: '防 +18', icon: 'coat' },
  { k: '装飾', n: '赤い組紐', s: '速 +5', icon: 'cord' },
  { k: '装飾', n: '— 空き —', s: '', icon: '' },
]

function EquipSub() {
  const reduced = useContext(RM)
  return (
    <div className="flex flex-col gap-2.5">
      <ul className="grid grid-cols-2 gap-x-3 gap-y-2.5 px-1 pt-1">
        {SLOTS.map((s, i) => {
          const rot = [-3, 2.5, -1.5, 3][i]
          return (
            <motion.li
              key={i}
              className="relative flex items-center gap-2 bg-[#0c0b0d] px-2.5 py-2 text-[#f6f1e7] shadow-[4px_4px_0_#e3141e]"
              style={{ clipPath: 'polygon(0 4%, 96% 0, 100% 88%, 3% 100%)' }}
              initial={reduced ? { opacity: 0 } : { x: 320 + i * 30, y: -60 + i * 20, rotate: 40 + i * 12, opacity: 0 }}
              animate={{ x: 0, y: 0, rotate: rot, opacity: 1, transition: reduced ? { duration: 0.15 } : { delay: 0.16 + i * 0.08, type: 'spring', stiffness: 420, damping: 22 } }}
              whileHover={reduced ? undefined : { y: -4, rotate: 0, scale: 1.04 }}
              transition={{ type: 'spring', stiffness: 600, damping: 26 }}
            >
              <svg viewBox="0 0 44 48" className="size-9 shrink-0 bg-[#e3141e] p-1" aria-hidden style={{ clipPath: 'polygon(10% 0, 100% 6%, 92% 100%, 0 92%)' }}>
                {s.icon ? (
                  <path d={ICONS[s.icon]} fill={s.icon === 'cord' ? 'none' : BLACK} stroke={BLACK} strokeWidth={s.icon === 'cord' ? 4 : 1} strokeLinecap="round" />
                ) : (
                  <path d="M10 10h24v28H10Z" fill="none" stroke={BLACK} strokeWidth="3" strokeDasharray="5 4" />
                )}
              </svg>
              <span className="flex min-w-0 flex-col">
                <span className="w-fit -skew-x-12 bg-[#f6f1e7] px-1 text-[9px] font-black text-[#0c0b0d]">{s.k}</span>
                <span className={`truncate text-[13px] font-black ${s.icon ? '' : 'opacity-50'}`}>{s.n}</span>
                <span className="font-mono text-[10px] font-bold text-[#e3141e]">{s.s || '—'}</span>
              </span>
            </motion.li>
          )
        })}
      </ul>
      {[
        ['攻撃力', 128, 200],
        ['防御力', 96, 200],
      ].map(([k, v, m], i) => (
        <motion.div key={k} className="flex items-center gap-2 font-mono text-[11px] font-black" {...slideIn(i, reduced, 0.5)}>
          <span className="w-12 font-['Noto_Sans_JP']">{k}</span>
          <Bar v={v as number} max={m as number} red={i === 0} delay={0.6 + i * 0.08} />
          <span className="w-8 text-right tabular-nums">{v}</span>
        </motion.div>
      ))}
    </div>
  )
}

function PartySub() {
  const reduced = useContext(RM)
  const members = [
    { n: 'カイリ', lv: 27, hp: 88, sp: 52 },
    { n: 'スズネ', lv: 25, hp: 64, sp: 90 },
    { n: 'ゲンジ', lv: 26, hp: 23, sp: 31 },
  ]
  return (
    <ul className="grid grid-cols-3 gap-2 px-1 pt-2">
      {members.map((m, i) => (
        <motion.li
          key={m.n}
          className="flex flex-col items-stretch gap-1 bg-[#0c0b0d] p-2 text-[#f6f1e7] shadow-[3px_3px_0_#e3141e]"
          style={{ clipPath: clipRow(i) }}
          initial={reduced ? { opacity: 0 } : { y: 260, x: (1 - i) * 60, rotate: (i - 1) * 30 + 20, opacity: 0 }}
          animate={{ y: 0, x: 0, rotate: (i - 1) * 3.5, opacity: 1, transition: reduced ? { duration: 0.15 } : { delay: 0.18 + i * 0.09, type: 'spring', stiffness: 380, damping: 20 } }}
          whileHover={reduced ? undefined : { y: -6, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 600, damping: 24 }}
        >
          <svg viewBox="0 0 48 40" className="mx-auto h-12 bg-[#e3141e]" aria-hidden>
            <path d="M6 40c2-8 9-11 18-11s16 3 18 11Z" fill={BLACK} />
            <ellipse cx="24" cy="18" rx="9" ry="11" fill={BLACK} />
            <path d={['M14 20 15 9l6-5 9 1 5 6v10l-4-6-3 4-2-7-4 6-3-6-3 6Z', 'M13 24C12 10 18 6 24 6s12 4 11 18h-3l-1-11H17l-1 11Z', 'M12 14h24l2 4H10Z'][i]} fill={BLACK} />
          </svg>
          <span className="flex items-baseline justify-center gap-1 text-xs font-black">
            {m.n}
            <span className="font-mono text-[9px] text-[#e3141e]">Lv{m.lv}</span>
          </span>
          <span className="flex items-center gap-1 font-mono text-[9px]">
            HP
            <Bar v={m.hp} red={m.hp < 30} delay={0.45 + i * 0.09} />
          </span>
          <span className="flex items-center gap-1 font-mono text-[9px]">
            SP
            <Bar v={m.sp} red delay={0.5 + i * 0.09} />
          </span>
        </motion.li>
      ))}
    </ul>
  )
}

const STATS = [
  ['力', 42],
  ['魔', 35],
  ['耐', 28],
  ['速', 47],
  ['運', 19],
] as const

function StatusSub() {
  const reduced = useContext(RM)
  const lvRef = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = lvRef.current
    if (!el || reduced) return
    const c = animate(1, 27, { duration: 0.7, delay: 0.2, ease: 'circOut', onUpdate: (v) => (el.textContent = String(Math.round(v))) })
    return () => c.stop()
  }, [reduced])
  const pt = (k: number, r: number) => {
    const a = -Math.PI / 2 + (k * Math.PI * 2) / 5
    return `${(60 + Math.cos(a) * r).toFixed(1)},${(60 + Math.sin(a) * r).toFixed(1)}`
  }
  return (
    <div className="grid grid-cols-1 items-center gap-2 @min-[40rem]:grid-cols-[auto_1fr] @min-[40rem]:gap-4">
      <div className="flex items-center gap-3 @min-[40rem]:flex-col @min-[40rem]:gap-0">
        <div className="flex items-baseline gap-1 text-[#0c0b0d]">
          <span className="font-['Playfair_Display'] text-xl font-black italic">Lv</span>
          <span ref={lvRef} className="w-[1.6em] font-['Playfair_Display'] text-4xl leading-none font-black italic tabular-nums">
            27
          </span>
        </div>
        <svg viewBox="0 0 120 120" className="mt-2 size-24 shrink-0 overflow-visible @min-[40rem]:size-32" aria-hidden>
          {[46, 30, 14].map((r) => (
            <polygon key={r} points={STATS.map((_, k) => pt(k, r)).join(' ')} fill="none" stroke="rgba(12,11,13,.25)" strokeWidth="1" />
          ))}
          <motion.polygon
            points={STATS.map(([, v], k) => pt(k, (v / 50) * 46)).join(' ')}
            fill={RED}
            stroke={BLACK}
            strokeWidth="2"
            strokeLinejoin="round"
            style={{ transformBox: 'view-box', transformOrigin: '60px 60px' }}
            initial={reduced ? false : { scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 260, damping: 13 }}
          />
          {STATS.map(([k], i) => {
            const [x, y] = pt(i, 57).split(',')
            return (
              <text key={k} x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="11" fontWeight="900" fill={BLACK}>
                {k}
              </text>
            )
          })}
        </svg>
      </div>
      <div className="flex flex-col gap-1.5">
        <motion.div className="flex items-center gap-1 font-mono text-[10px] font-bold text-[#0c0b0d]" {...slideIn(0, reduced, 0.1)}>
          NEXT <Bar v={62} red delay={0.25} />
        </motion.div>
        {STATS.map(([k, v], i) => (
          <motion.div key={k} className={rowCls} style={{ clipPath: clipRow(i) }} {...slideIn(i + 1, reduced)}>
            <span className="w-5 text-sm font-black text-[#e3141e]">{k}</span>
            <Bar v={v} max={60} delay={0.35 + i * 0.06} />
            <span className="w-6 text-right font-mono text-xs font-bold tabular-nums">{v}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function SystemSub() {
  const reduced = useContext(RM)
  const [vol, setVol] = useState(7)
  const [speed, setSpeed] = useState(1)
  const [vibe, setVibe] = useState(true)
  const seg = (on: boolean) =>
    `-skew-x-12 px-2 py-0.5 text-[11px] font-black outline-none focus-visible:ring-2 focus-visible:ring-[#e3141e] focus-visible:ring-offset-1 ${on ? 'bg-[#e3141e] text-[#f6f1e7]' : 'bg-[#f6f1e7] text-[#0c0b0d] hover:bg-[#f6f1e7]/80'}`
  return (
    <div className="flex flex-col gap-1.5">
      <motion.div className={rowCls} style={{ clipPath: clipRow(0) }} {...slideIn(0, reduced)}>
        <span className="w-20 shrink-0 text-xs font-black">BGM 音量</span>
        <button type="button" aria-label="音量を下げる" className={seg(false)} onClick={() => setVol((v) => Math.max(0, v - 1))}>
          −
        </button>
        <span className="flex flex-1 gap-0.5" role="meter" aria-valuemin={0} aria-valuemax={10} aria-valuenow={vol} aria-label={`音量 ${vol}`}>
          {Array.from({ length: 10 }, (_, i) => (
            <motion.span
              key={i}
              className="h-3 flex-1 -skew-x-12"
              animate={{ backgroundColor: i < vol ? RED : 'rgba(246,241,231,.2)', scaleY: i === vol - 1 ? [1.8, 1] : 1 }}
              transition={{ duration: 0.18 }}
            />
          ))}
        </span>
        <button type="button" aria-label="音量を上げる" className={seg(false)} onClick={() => setVol((v) => Math.min(10, v + 1))}>
          ＋
        </button>
      </motion.div>
      <motion.div className={rowCls} style={{ clipPath: clipRow(1) }} {...slideIn(1, reduced)}>
        <span className="w-20 shrink-0 text-xs font-black">文字送り</span>
        {['遅い', '普通', '速い'].map((s, i) => (
          <button key={s} type="button" aria-pressed={speed === i} className={seg(speed === i)} onClick={() => setSpeed(i)}>
            {s}
          </button>
        ))}
      </motion.div>
      <motion.div className={rowCls} style={{ clipPath: clipRow(2) }} {...slideIn(2, reduced)}>
        <span className="w-20 shrink-0 text-xs font-black">振動</span>
        <button type="button" aria-pressed={vibe} className={seg(vibe)} onClick={() => setVibe((v) => !v)}>
          {vibe ? 'ON' : 'OFF'}
        </button>
      </motion.div>
      <motion.div className={rowCls} style={{ clipPath: clipRow(3) }} {...slideIn(3, reduced)}>
        <span className="w-20 shrink-0 text-xs font-black">セーブ</span>
        <span className="text-[11px] font-bold opacity-70">最終記録 11/07 18:40</span>
      </motion.div>
    </div>
  )
}

const SUBS: ReactNode[] = [<SkillSub key="s" />, <ItemSub key="i" />, <EquipSub key="e" />, <PartySub key="p" />, <StatusSub key="st" />, <SystemSub key="sy" />]

/* ───────── 演出パーツ ───────── */

const CHEVRON = 'polygon(0 0, 97% 0, 100% 50%, 97% 100%, 0 100%, 3% 50%)'
const SWEEP_BANDS = [
  { top: 8, h: 12, c: RED, d: 0 },
  { top: 22, h: 24, c: BLACK, d: 0.035 },
  { top: 47.5, h: 2.5, c: WHITE, d: 0.015 },
  { top: 51, h: 21, c: RED, d: 0.06 },
  { top: 74, h: 5, c: WHITE, d: 0.09 },
  { top: 80.5, h: 14, c: BLACK, d: 0.045 },
]
const SHARD_BURST = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2 + rnd(i * 3) * 0.4
  return { a, d: 380 + rnd(i * 7) * 420, s: 18 + rnd(i * 5) * 46, c: [RED, WHITE, BLACK][i % 3], r: (rnd(i * 11) - 0.5) * 540 }
})

/** ポーズ開閉の斜め帯(in は左→右、out は右→左) */
function Sweep({ dir }: { dir: 'in' | 'out' }) {
  const s = dir === 'in' ? 1 : -1
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      <div className="absolute inset-[-35%] rotate-[-14deg]">
        {SWEEP_BANDS.map((b, i) => (
          <motion.div
            key={i}
            className="absolute inset-x-0"
            style={{ top: `${b.top}%`, height: `${b.h}%`, background: b.c, clipPath: CHEVRON }}
            initial={{ x: `${-130 * s}%` }}
            animate={{ x: [`${-130 * s}%`, '0%', `${4 * s}%`, `${130 * s}%`] }}
            transition={{ duration: dir === 'in' ? 0.62 : 0.42, times: [0, 0.36, 0.58, 1], ease: ['circOut', 'linear', 'circIn'], delay: b.d }}
          />
        ))}
      </div>
      {dir === 'in' && (
        <div className="absolute top-[45%] left-[34%]">
          {SHARD_BURST.map((p, i) => (
            <motion.svg
              key={i}
              viewBox="0 0 40 40"
              className="absolute"
              style={{ width: p.s, height: p.s, marginLeft: -p.s / 2, marginTop: -p.s / 2 }}
              initial={{ x: 0, y: 0, scale: 0, rotate: 0 }}
              animate={{ x: Math.cos(p.a) * p.d, y: Math.sin(p.a) * p.d * 0.7, scale: [0, 1.3, 1], rotate: p.r, opacity: [1, 1, 0] }}
              transition={{ duration: 0.6, ease: [0.1, 0.8, 0.3, 1], delay: 0.05 }}
            >
              <polygon points="0,6 40,0 22,40" fill={p.c} stroke={p.c === BLACK ? WHITE : BLACK} strokeWidth="2.5" />
            </motion.svg>
          ))}
        </div>
      )}
    </div>
  )
}

/** サブ画面から戻るときの逆向きの斬撃 */
function Slash() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      <div className="absolute inset-[-30%] rotate-[-20deg]">
        <motion.div
          className="absolute inset-x-0 top-[49%] h-[0.8%] origin-right bg-[#f6f1e7]"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: [0, 1, 1], opacity: [1, 1, 0] }}
          transition={{ duration: 0.32, times: [0, 0.35, 1] }}
        />
        <motion.div
          className="absolute inset-x-0 top-[37%] h-[11%] bg-[#0c0b0d]"
          style={{ clipPath: CHEVRON }}
          initial={{ x: '130%' }}
          animate={{ x: ['130%', '0%', '-130%'] }}
          transition={{ duration: 0.4, times: [0, 0.45, 1], ease: ['circOut', 'circIn'], delay: 0.04 }}
        />
        <motion.div
          className="absolute inset-x-0 top-[52%] h-[4%] bg-[#e3141e]"
          style={{ clipPath: CHEVRON }}
          initial={{ x: '130%' }}
          animate={{ x: ['130%', '0%', '-130%'] }}
          transition={{ duration: 0.36, times: [0, 0.45, 1], ease: ['circOut', 'circIn'], delay: 0.08 }}
        />
      </div>
    </div>
  )
}

/** 漫画の集中線(2 組をちらつかせる) */
const speedLines = (seed: number) =>
  Array.from({ length: 70 }, (_, i) => {
    const a = (i / 70) * Math.PI * 2 + rnd(seed + i) * 0.08
    const d = 0.004 + rnd(seed + i * 2.3) * 0.014
    const ri = 42 + rnd(seed + i * 4.1) * 40
    const P = (ang: number, r: number) => `${(Math.cos(ang) * r).toFixed(1)},${(Math.sin(ang) * r).toFixed(1)}`
    return `M${P(a - d, 170)}L${P(a, ri)}L${P(a + d, 170)}Z`
  }).join('')
const SPEED_A = speedLines(1)
const SPEED_B = speedLines(9)

function CutIn({ label, en }: { label: string; en: string }) {
  const sweep: Transition = { duration: 0.95, times: [0, 0.2, 0.72, 1], ease: ['circOut', 'linear', 'circIn'] }
  const band = (s: 1 | -1, delay = 0): { initial: { x: string }; animate: { x: string[] }; transition: Transition } => ({
    initial: { x: `${-110 * s}%` },
    animate: { x: [`${-110 * s}%`, '0%', `${2 * s}%`, `${110 * s}%`] },
    transition: { ...sweep, delay },
  })
  return (
    <motion.div className="pointer-events-auto absolute inset-0 z-40 overflow-hidden" aria-hidden exit={{ opacity: 0, transition: { duration: 0.1 } }}>
      {/* インパクトフレーム(一瞬の色反転) */}
      <motion.div className="absolute inset-0 bg-white mix-blend-difference" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.01, delay: 0.07 }} />
      {/* 赤地 + 集中線 */}
      <motion.div className="absolute inset-0 bg-[#e3141e]" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }} transition={{ duration: 0.98, times: [0, 0.08, 0.74, 1] }}>
        <svg viewBox="-100 -100 200 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
          <path d={SPEED_A} fill={BLACK} className="tpm-flick" />
          <path d={SPEED_B} fill={BLACK} className="tpm-flick" style={{ animationDelay: '-.06s' }} />
        </svg>
      </motion.div>
      <motion.div className="absolute inset-0 bg-[#f6f1e7]" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.95, 0] }} transition={{ duration: 0.24, delay: 0.07 }} />

      {/* 英字の帯(右→左) */}
      <div className="absolute inset-x-[-20%] top-[13%] h-[9%] rotate-[-9deg]">
        <motion.div className="flex h-full items-center gap-6 overflow-hidden bg-[#0c0b0d] whitespace-nowrap" {...band(-1, 0.03)}>
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className="font-['Space_Grotesk'] text-[clamp(18px,5cqh,40px)] font-bold tracking-tighter text-transparent italic [-webkit-text-stroke:1.5px_#f6f1e7]">
              {en} ///
            </span>
          ))}
        </motion.div>
      </div>
      {/* 目元の帯(左→右) */}
      <div className="absolute inset-x-[-20%] top-1/2 h-[34%] -translate-y-1/2 rotate-[-9deg] @min-[40rem]:h-[32%]">
        <motion.div className="relative h-full overflow-hidden border-y-[6px] border-[#0c0b0d] bg-[#0c0b0d] shadow-[0_0_0_4px_#f6f1e7]" {...band(1)}>
          <motion.div className="absolute inset-y-0 left-[22%] w-[56%]" initial={{ scale: 1.35 }} animate={{ scale: 1.04 }} transition={{ duration: 0.9, ease: 'easeOut' }}>
            <Eyes />
          </motion.div>
          <div
            className="absolute inset-0"
            style={{
              background: 'repeating-linear-gradient(0deg, transparent 0 9px, rgba(246,241,231,.2) 9px 10px, transparent 10px 23px)',
              maskImage: 'linear-gradient(90deg, #000 0 20%, transparent 24% 76%, #000 80%)',
              WebkitMaskImage: 'linear-gradient(90deg, #000 0 20%, transparent 24% 76%, #000 80%)',
              animation: 'tpm-lines .3s linear infinite',
            }}
          />
        </motion.div>
      </div>
      {/* 切り抜き文字の帯(右→左) */}
      <div className="absolute inset-x-[-20%] top-[72%] h-[13%] rotate-[-10deg]">
        <motion.div className="flex h-full items-center justify-end bg-[#f6f1e7] pr-[26%] shadow-[0_0_0_4px_#0c0b0d]" style={{ clipPath: CHEVRON }} {...band(-1, 0.05)}>
          <Ransom text={`${label}!`} seed={label.length * 3 + 1} className="text-[clamp(22px,8.5cqh,84px)]" deal delay={0.12} />
        </motion.div>
      </div>
      <div className="absolute inset-x-[-20%] top-[88%] h-[2.5%] rotate-[-10deg]">
        <motion.div className="h-full bg-[#0c0b0d]" {...band(1, 0.08)} />
      </div>
    </motion.div>
  )
}

/** 漂う破片 */
const SHARDS = Array.from({ length: 16 }, (_, i) => {
  const r = (k: number) => rnd(i * 17.3 + k)
  const side = i % 2 ? r(1) * 30 : 55 + r(1) * 45
  return {
    x: side,
    y: r(2) * 100,
    s: 12 + r(3) * 34,
    rot: r(4) * 360,
    c: [WHITE, BLACK, RED, BLACK][i % 4],
    depth: i % 3 === 0 ? 2 : 1,
    pts: `0,${(8 + r(5) * 12).toFixed(0)} 40,${(r(6) * 6).toFixed(0)} ${(22 + r(7) * 12).toFixed(0)},${(18 + r(12) * 10).toFixed(0)} ${(r(13) * 12).toFixed(0)},40`,
    dur: 5 + r(8) * 5,
    fx: `${((r(9) - 0.5) * 30).toFixed(0)}px`,
    fy: `${((r(10) - 0.5) * 30).toFixed(0)}px`,
    fr: `${((r(11) - 0.5) * 40).toFixed(0)}deg`,
  }
})

function Shards({ animated }: { animated: boolean }) {
  return (
    <>
      {[1, 2].map((depth) => (
        <div key={depth} aria-hidden className={`pointer-events-none absolute inset-0 ${depth === 1 ? 'tpm-par1' : 'tpm-par2'}`}>
          {SHARDS.filter((s) => s.depth === depth).map((s, i) => (
            <svg
              key={i}
              viewBox="-2 -2 44 44"
              className="absolute"
              style={
                {
                  left: `${s.x}%`,
                  top: `${s.y}%`,
                  width: s.s * (depth === 2 ? 1.4 : 1),
                  height: s.s * (depth === 2 ? 1.4 : 1),
                  rotate: `${s.rot}deg`,
                  opacity: depth === 2 ? 0.95 : 0.6,
                  animation: animated ? `tpm-float ${s.dur}s ease-in-out infinite` : undefined,
                  '--fx': s.fx,
                  '--fy': s.fy,
                  '--fr': s.fr,
                } as CSSProperties
              }
            >
              <polygon points={s.pts} fill={s.c} stroke={s.c === BLACK ? RED : BLACK} strokeWidth="2.5" strokeLinejoin="round" />
            </svg>
          ))}
        </div>
      ))}
    </>
  )
}

/** 選択中の項目の文字: 1 字ずつ飛び込み、切り抜き風の黒箱・赤字が混ざり、順にカクッと跳ねる */
function Letters({ text, item, reduced }: { text: string; item: number; reduced: boolean }) {
  return (
    <>
      {[...text].map((ch, j) => {
        const k = (j + item) % 4
        const cls = k === 1 ? 'bg-[#0c0b0d] px-[0.05em] text-[#f6f1e7]' : k === 3 ? 'text-[#e3141e]' : 'text-[#0c0b0d]'
        const tilt = (rnd(item * 9 + j * 3.7) - 0.5) * 12
        return (
          <motion.span
            key={j}
            className={`inline-block ${reduced ? '' : 'tpm-jolt'} ${cls}`}
            style={{ '--j': j } as CSSProperties}
            initial={reduced ? false : { y: '-0.6em', rotate: tilt * 4, scale: 1.7, opacity: 0 }}
            animate={{ y: '0em', rotate: tilt, scale: k === 1 ? 0.9 : 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 900, damping: 19, delay: j * 0.028 }}
          >
            {ch}
          </motion.span>
        )
      })}
    </>
  )
}

/** 移動元 → 移動先をつなぐ一瞬のモーションスミア(メニューの設計座標で描く) */
function Smear({ from, to }: { from: number; to: number }) {
  const a = MENU[from]
  const b = MENU[to]
  const down = to > from
  const ya = down ? a.y : a.y + a.size
  const yb = down ? b.y + b.size : b.y
  const ax0 = a.x - 18, ax1 = a.x + itemWidth(from) * 0.85
  const bx0 = b.x - 18, bx1 = b.x + itemWidth(to) * 0.85
  const lerp = (p: number, q: number, t: number) => p + (q - p) * t
  return (
    <motion.svg
      aria-hidden
      viewBox="0 0 340 320"
      className="pointer-events-none absolute inset-0 size-full overflow-visible"
      initial={{ opacity: 0.9 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
    >
      <polygon points={`${ax0},${ya} ${ax1},${ya} ${bx1},${yb} ${bx0},${yb}`} fill={WHITE} opacity={0.32} />
      {[0.08, 0.22, 0.4, 0.55, 0.72, 0.9].map((t, k) => (
        <line
          key={t}
          x1={lerp(ax0, ax1, t)}
          y1={ya}
          x2={lerp(bx0, bx1, t)}
          y2={yb}
          stroke={k % 2 ? RED : WHITE}
          strokeWidth={k % 3 === 0 ? 4 : 1.6}
        />
      ))}
    </motion.svg>
  )
}

/* ───────── 本体 ───────── */

const CSS = `
@keyframes tpm-spin { to { transform: translate(-50%, -50%) rotate(360deg) } }
@keyframes tpm-lines { to { background-position: -400px 0 } }
@keyframes tpm-scroll { to { transform: translateX(-33.3333%) } }
@keyframes tpm-road { to { background-position: -80px 0 } }
@keyframes tpm-jolt { 0%, 100% { translate: 0 0 } 3% { translate: 0 -.1em } 6% { translate: .04em .03em } 9% { translate: 0 0 } }
@keyframes tpm-flick { 50% { opacity: 0 } }
@keyframes tpm-float { 0%, 100% { translate: 0 0 } 50% { translate: var(--fx) var(--fy) } }
.tpm-frozen .tpm-anim { animation-play-state: paused !important }
.tpm-jolt { animation: tpm-jolt 2.2s steps(1, end) infinite; animation-delay: calc(var(--j) * 70ms + 600ms) }
.tpm-flick { animation: tpm-flick .12s steps(1, end) infinite }
.tpm-par1 { transform: translate(calc(var(--px, 0) * -10px), calc(var(--py, 0) * -8px)); transition: transform .5s cubic-bezier(.2,.8,.2,1) }
.tpm-par2 { transform: translate(calc(var(--px, 0) * -28px), calc(var(--py, 0) * -20px)); transition: transform .5s cubic-bezier(.2,.8,.2,1) }
.tpm-tilt { transform: rotateY(calc(14deg + var(--px, 0) * 7deg)) rotateX(calc(-2deg - var(--py, 0) * 5deg)); transition: transform .35s cubic-bezier(.2,.8,.2,1) }
.tpm-menu { scale: .78 }
@container (min-width: 34rem) { .tpm-menu { scale: .9 } }
@container (min-width: 40rem) { .tpm-menu { scale: 1 } }
@container (min-width: 56rem) and (min-height: 620px) { .tpm-menu { scale: 1.3 } }
@container (min-width: 40rem) and (max-height: 520px) { .tpm-menu { scale: .92; top: 47.5% } }
@container (min-width: 70rem) and (min-height: 680px) { .tpm-sub { zoom: 1.3 } }
@container (min-width: 70rem) and (min-height: 680px) { .tpm-big { zoom: 1.2 } }
@container (min-width: 100rem) and (min-height: 900px) { .tpm-menu { scale: 1.6 } .tpm-sub { zoom: 1.55 } .tpm-big { zoom: 1.45 } }
`

type View = 'menu' | 'sub'

const HIDE_L = 'polygon(0% 0%, 0% 0%, -40% 100%, -40% 100%)'
const SHOW = 'polygon(0% 0%, 140% 0%, 100% 100%, -40% 100%)'
const HIDE_R = 'polygon(140% 0%, 140% 0%, 100% 100%, 100% 100%)'

const itemV: Variants = {
  out: (i: number) => ({ x: -1100, rotate: -16, scaleX: 1.5, transition: { delay: (MENU.length - 1 - i) * 0.022, duration: 0.2, ease: [0.7, 0, 1, 0.5] } }),
  in: (i: number) => ({ x: 0, rotate: 0, scaleX: 1, transition: { delay: 0.34 + i * 0.055, type: 'spring', stiffness: 620, damping: 22, mass: 0.8 } }),
}
const itemVReduced: Variants = {
  out: { opacity: 0, transition: { duration: 0.15 } },
  in: { opacity: 1, transition: { duration: 0.15 } },
}
const tabV: Variants = {
  enter: (d: number) => ({ x: 50 * d, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 500, damping: 34 } },
  exit: (d: number) => ({ x: -50 * d, skewX: 10 * d, opacity: 0, transition: { duration: 0.11, ease: 'circIn' } }),
}

export function TiltedPauseMenu() {
  const reduced = !!useReducedMotion()
  const [paused, setPaused] = useState(reduced)
  const [entering, setEntering] = useState(false)
  const [cursor, setCursor] = useState(0)
  const [view, setView] = useState<View>('menu')
  const [active, setActive] = useState(0)
  const [tabDir, setTabDir] = useState(1)
  const [cutin, setCutin] = useState<number | null>(null)
  const [pose, setPose] = useState(0)
  const [sweep, setSweep] = useState<{ k: number; dir: 'in' | 'out' } | null>(null)
  const [slash, setSlash] = useState(0)
  const [smear, setSmear] = useState<{ k: number; from: number; to: number } | null>(null)
  const [openN, setOpenN] = useState(0)
  const [stampFrom, setStampFrom] = useState({ x: 300, y: 160 })
  const [live, setLive] = useState('')

  const rootRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const btns = useRef<(HTMLButtonElement | null)[]>([])
  const backRef = useRef<HTMLButtonElement>(null)
  const timers = useRef<number[]>([])
  const busy = useRef(false)
  const cursorRef = useRef(0)
  const pendingFocus = useRef<'cursor' | 'back' | 'root' | null>(null)
  const polys = useRef(new Set<SVGPolygonElement>())
  const fx = useRef<Fx>({ open: reduced ? 1 : 0, target: reduced ? 1 : 0, pulse: 0, mx: 0, my: 0, dirty: true })

  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms))
  const inside = () => !!rootRef.current?.contains(document.activeElement)

  useEffect(() => {
    const list = timers.current
    return () => list.forEach(clearTimeout)
  }, [])

  // フォーカス移動は描画後に(inert が外れてから)行う
  useEffect(() => {
    const p = pendingFocus.current
    if (!p) return
    pendingFocus.current = null
    const el = p === 'cursor' ? btns.current[cursorRef.current] : p === 'back' ? backRef.current : rootRef.current
    el?.focus({ preventScroll: true })
  })

  // ハイライトのギザギザを 12fps で震わせ、ゆっくり呼吸させる(DOM 属性へ直接書くので再描画なし)
  useEffect(() => {
    if (reduced) return
    let raf = 0
    let lastStep = 0
    let seed = 0
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      if (now - lastStep < 83) return
      lastStep = now
      seed++
      const breathe = 1 + Math.sin(now / 420) * 0.03
      let n = 0
      for (const el of polys.current) {
        if (!el.isConnected) {
          polys.current.delete(el)
          continue
        }
        const base = JAG_PTS[Number(el.dataset.jag) || 0]
        n++
        let s = ''
        for (let k = 0; k < base.length; k += 2) {
          const jx = (rnd(seed * 3.1 + k * 1.7 + n * 9.3) - 0.5) * 4
          const jy = (rnd(seed * 5.3 + k * 2.9 + n * 4.1) - 0.5) * 6
          s += `${(50 + (base[k] - 50) * breathe + jx).toFixed(1)},${(50 + (base[k + 1] - 50) * breathe + jy).toFixed(1)} `
        }
        el.setAttribute('points', s)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [reduced])

  const regPoly = (el: SVGPolygonElement | null) => {
    if (el) polys.current.add(el)
  }

  const nudge = (d: number) => {
    if (reduced || !stageRef.current) return
    animate(stageRef.current, { y: [d * 7, 0], rotate: [d * 0.35, 0] }, { duration: 0.24, ease: [0.2, 0.8, 0.2, 1] })
  }
  const shake = () => {
    if (reduced || !stageRef.current) return
    animate(stageRef.current, { x: [-16, 13, -8, 4, 0], y: [8, -6, 3, -1, 0] }, { duration: 0.34, ease: 'linear' })
  }

  const open = () => {
    if (paused || busy.current) return
    const b = rootRef.current?.getBoundingClientRect()
    if (b) setStampFrom({ x: b.width * 0.5 - 120, y: b.height * 0.42 - 40 })
    if (inside()) pendingFocus.current = 'cursor'
    setPaused(true)
    setView('menu')
    setOpenN((n) => n + 1)
    setLive('ポーズメニューを開きました')
    fx.current.target = 1
    fx.current.dirty = true
    if (reduced) return
    fx.current.open = 0
    fx.current.pulse = 1
    busy.current = true
    setEntering(true)
    const k = Date.now()
    setSweep({ k, dir: 'in' })
    later(() => setSweep((v) => (v?.k === k ? null : v)), 1000)
    shake()
    later(() => {
      busy.current = false
    }, 700)
    later(() => setEntering(false), 1100)
  }

  const close = () => {
    if (!paused || view !== 'menu' || busy.current) return
    if (inside()) rootRef.current?.focus({ preventScroll: true })
    setPaused(false)
    setLive('ゲームに戻りました')
    fx.current.target = 0
    fx.current.dirty = true
    if (reduced) return
    busy.current = true
    const k = Date.now()
    setSweep({ k, dir: 'out' })
    later(() => setSweep((v) => (v?.k === k ? null : v)), 800)
    later(() => {
      busy.current = false
    }, 480)
  }
  const openRef = useRef(open)
  openRef.current = open

  // 最初は通常画面 → 少し待ってポーズ演出を自動で再生する
  useEffect(() => {
    if (reduced) return
    const id = window.setTimeout(() => openRef.current(), 650)
    return () => window.clearTimeout(id)
  }, [reduced])

  const select = (i: number) => {
    if (i === cursorRef.current) return
    const from = cursorRef.current
    cursorRef.current = i
    setCursor(i)
    if (reduced) return
    setSmear({ k: Date.now(), from, to: i })
    nudge(i > from ? 1 : -1)
    fx.current.pulse = Math.max(fx.current.pulse, 0.5)
  }

  const confirm = (i: number) => {
    if (!paused || view !== 'menu' || busy.current) return
    select(i)
    setActive(i)
    setPose((p) => p + 1)
    setLive(`${MENU[i].label}を開きました`)
    if (reduced) {
      if (inside()) pendingFocus.current = 'back'
      setView('sub')
      return
    }
    busy.current = true
    fx.current.pulse = 1
    shake()
    setCutin(Date.now())
    const focus = inside()
    later(() => {
      if (focus) pendingFocus.current = 'back'
      setView('sub')
    }, 700)
    later(() => {
      setCutin(null)
      busy.current = false
    }, 1060)
  }

  const back = () => {
    if (view !== 'sub' || busy.current) return
    if (inside()) pendingFocus.current = 'cursor'
    setView('menu')
    setLive('メニューに戻りました')
    if (reduced) return
    setSlash(Date.now())
    nudge(-1)
    fx.current.pulse = Math.max(fx.current.pulse, 0.6)
  }

  const pickTab = (i: number) => {
    if (i === active) return
    setTabDir(i > active ? 1 : -1)
    setActive(i)
    cursorRef.current = i
    setCursor(i)
    fx.current.pulse = Math.max(fx.current.pulse, 0.4)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const k = e.key
    const onRoot = e.target === e.currentTarget
    if (!paused) {
      if (k === 'Escape' || ((k === 'Enter' || k === ' ' || k === 'p' || k === 'P') && onRoot)) open()
      else return
    } else if (view === 'menu') {
      if (k === 'ArrowDown') {
        const n = (cursorRef.current + 1) % MENU.length
        select(n)
        btns.current[n]?.focus({ preventScroll: true })
      } else if (k === 'ArrowUp') {
        const n = (cursorRef.current - 1 + MENU.length) % MENU.length
        select(n)
        btns.current[n]?.focus({ preventScroll: true })
      } else if ((k === 'Enter' || k === ' ') && onRoot) confirm(cursorRef.current)
      else if (k === 'Escape') close()
      else return
    } else {
      if (k === 'Escape' || k === 'Backspace') back()
      else if (k === 'ArrowRight') pickTab((active + 1) % MENU.length)
      else if (k === 'ArrowLeft') pickTab((active - 1 + MENU.length) % MENU.length)
      else return
    }
    e.preventDefault()
    e.stopPropagation()
  }

  const onPointer = (e: PointerEvent<HTMLDivElement>) => {
    if (reduced) return
    const b = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - b.left) / b.width) * 2 - 1
    const py = ((e.clientY - b.top) / b.height) * 2 - 1
    e.currentTarget.style.setProperty('--px', px.toFixed(3))
    e.currentTarget.style.setProperty('--py', py.toFixed(3))
    fx.current.mx = px
    fx.current.my = py
  }

  const cur = MENU[cursor]
  const hlTarget = { x: cur.x, y: cur.y + cur.size / 2, rotate: cur.rot }
  const hlBox = { top: -(cur.size / 2 + 11), width: itemWidth(cursor) + 34, height: cur.size + 22 }
  const spring = reduced ? { duration: 0 } : { type: 'spring' as const, stiffness: 560, damping: 26, mass: 0.7 }
  const inSub = paused && view === 'sub'
  const menuLive = paused && view === 'menu'
  const heroShown = paused && view === 'menu'
  const enterDelay = (d: number) => (entering ? d : 0)

  /** 白い本体の後ろに、柔らかさの違う赤い影を 3 枚(残像) */
  const ghosts = [
    { z: -18, t: { type: 'spring' as const, stiffness: 110, damping: 15 }, op: 0.3, dy: 14, jag: cursor + 2 },
    { z: -14, t: { type: 'spring' as const, stiffness: 170, damping: 17 }, op: 0.55, dy: 11, jag: cursor + 1 },
    { z: -10, t: { type: 'spring' as const, stiffness: 260, damping: 20 }, op: 1, dy: 8, jag: cursor + 1 },
  ]

  return (
    <RM.Provider value={reduced}>
      <div
        ref={rootRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerMove={onPointer}
        aria-label={paused ? 'ポーズメニュー。上下キーで選択、Enterで決定、Escでもどる' : 'ゲーム画面。Escでポーズメニューを開く'}
        className="relative h-full w-full overflow-hidden bg-[#0c0b0d] [container-type:size] font-['Noto_Sans_JP',sans-serif] text-[#f6f1e7] outline-none select-none focus-visible:ring-2 focus-visible:ring-[#e3141e] focus-visible:ring-inset"
      >
        <style>{CSS}</style>
        <span className="sr-only" aria-live="polite">
          {live}
        </span>

        {/* 通常画面: ポーズで静止画化(アニメ停止 + グレースケール + 赤の乗算) */}
        <motion.div
          className={`absolute inset-0 ${paused ? 'tpm-frozen' : ''}`}
          initial={false}
          animate={paused ? { filter: 'grayscale(1) contrast(1.6) brightness(0.55)', scale: 1.05 } : { filter: 'grayscale(0) contrast(1) brightness(1)', scale: 1 }}
          transition={reduced ? { duration: 0.15 } : { duration: paused ? 0.12 : 0.35, ease: 'easeOut' }}
        >
          <div className={reduced ? 'tpm-frozen absolute inset-0' : 'absolute inset-0'}>
            <World />
          </div>
          <motion.div className="absolute inset-0 bg-[#e3141e] mix-blend-multiply" initial={false} animate={{ opacity: paused ? 0.7 : 0 }} transition={{ duration: 0.15 }} />
        </motion.div>

        {/* ポーズ背景(WebGL)。斜めのクリップで差し込む */}
        <motion.div
          aria-hidden
          className="absolute inset-0"
          initial={false}
          animate={reduced ? { opacity: paused ? 1 : 0 } : { clipPath: paused ? [HIDE_L, SHOW] : [SHOW, HIDE_R] }}
          transition={reduced ? { duration: 0.15 } : paused ? { duration: 0.36, delay: 0.1, ease: [0.8, 0, 0.2, 1] } : { duration: 0.3, delay: 0.1, ease: [0.8, 0, 0.2, 1] }}
        >
          <Backdrop fx={fx} reduced={reduced} />
        </motion.div>

        <div ref={stageRef} className="absolute inset-0">
          {/* 漂う破片(二層の視差) */}
          <motion.div
            className="absolute inset-0"
            initial={false}
            animate={paused ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.4 }}
            transition={reduced ? { duration: 0.15 } : paused ? { delay: enterDelay(0.4), type: 'spring', stiffness: 200, damping: 20 } : { duration: 0.15 }}
          >
            <Shards animated={paused && !reduced} />
          </motion.div>

          {/* キャラクター */}
          <div aria-hidden className="pointer-events-none absolute right-[-14%] bottom-0 h-full w-[86%] opacity-40 @min-[40rem]:right-[-2%] @min-[40rem]:w-[50%] @min-[40rem]:opacity-100">
            <motion.div
              className="relative h-full"
              initial={false}
              animate={heroShown ? { x: 0, skewX: 0, opacity: 1 } : { x: paused ? 160 : '70%', skewX: paused ? 0 : -16, opacity: 0 }}
              transition={
                reduced
                  ? { duration: 0.15 }
                  : heroShown
                    ? { type: 'spring', stiffness: 320, damping: 22, delay: enterDelay(0.3) }
                    : { duration: 0.2, ease: [0.7, 0, 1, 0.5] }
              }
            >
              <motion.svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="absolute top-[10%] left-[8%] h-[78%] w-[84%]"
                aria-hidden
                initial={false}
                animate={heroShown ? { scale: 1, rotate: 0 } : { scale: 0.3, rotate: -50 }}
                transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 16, delay: heroShown ? enterDelay(0.42) : 0 }}
              >
                <polygon points="50,0 58,26 86,8 70,36 100,40 72,54 94,80 62,66 56,100 44,70 18,92 30,60 0,52 28,40 10,14 40,28" fill={WHITE} />
              </motion.svg>
              <div className="absolute inset-x-0 top-[3%] bottom-0 flex justify-center">
                <Hero cursor={cursor} pose={pose} reduced={reduced} />
              </div>
            </motion.div>
          </div>

          {/* メニュー */}
          <motion.div
            inert={!menuLive}
            className="tpm-menu absolute top-[51%] left-[3%] z-10 h-[320px] w-[340px] origin-left -translate-y-1/2 @min-[40rem]:left-[6%]"
            style={{ perspective: 900 }}
            animate={inSub ? { x: -60, opacity: 0.25 } : { x: 0, opacity: 1 }}
            transition={reduced ? { duration: 0.15 } : { type: 'spring', stiffness: 260, damping: 28 }}
          >
            {/* 奥行き: 全体を斜めに倒し、影 → ハイライト → 文字の順に手前へ浮かせる。ポインタで少しだけ傾きが変わる */}
            <div className="tpm-tilt absolute inset-0 [transform-style:preserve-3d]">
              <motion.div
                className="absolute inset-0 [transform-style:preserve-3d]"
                initial={false}
                animate={paused ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }}
                transition={reduced ? { duration: 0.15 } : paused ? { delay: enterDelay(0.62), type: 'spring', stiffness: 500, damping: 20 } : { duration: 0.12 }}
                style={{ originX: 0.2, originY: 0.5 }}
              >
                {/* 赤い影(残像として遅れて追従) */}
                {ghosts.map((g) => (
                  <div key={g.z} className="absolute inset-0 [transform-style:preserve-3d]" style={{ transform: `translateZ(${g.z}px)`, opacity: g.op }}>
                    <motion.div aria-hidden className="absolute top-0 left-0" initial={false} animate={hlTarget} transition={reduced ? { duration: 0 } : g.t} style={{ originX: 0, originY: 0 }}>
                      <motion.div className="absolute left-[-10px]" initial={false} animate={{ ...hlBox, top: hlBox.top + g.dy }} transition={reduced ? { duration: 0 } : g.t}>
                        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="size-full overflow-visible">
                          <polygon ref={regPoly} data-jag={g.jag % JAGS.length} points={JAGS[g.jag % JAGS.length]} fill={RED} />
                        </svg>
                      </motion.div>
                    </motion.div>
                  </div>
                ))}
                {/* モーションスミア */}
                <div className="absolute inset-0" style={{ transform: 'translateZ(2px)' }}>
                  {smear && <Smear key={smear.k} from={smear.from} to={smear.to} />}
                </div>
                {/* 白いハイライト本体 */}
                <div className="absolute inset-0 [transform-style:preserve-3d] [transform:translateZ(14px)]">
                  <motion.div aria-hidden className="absolute top-0 left-0" initial={false} animate={hlTarget} transition={spring} style={{ originX: 0, originY: 0 }}>
                    <motion.div className="absolute left-[-18px]" initial={false} animate={hlBox} transition={spring}>
                      <motion.svg
                        key={cursor}
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        className="size-full overflow-visible"
                        initial={reduced ? false : { scaleX: 1.25, scaleY: 0.5, skewX: -14 }}
                        animate={{ scaleX: 1, scaleY: 1, skewX: 0 }}
                        transition={{ type: 'spring', stiffness: 700, damping: 14 }}
                      >
                        <polygon
                          ref={regPoly}
                          data-jag={cursor % JAGS.length}
                          points={JAGS[cursor % JAGS.length]}
                          fill={WHITE}
                          stroke={BLACK}
                          strokeWidth="1.5"
                          vectorEffect="non-scaling-stroke"
                        />
                      </motion.svg>
                    </motion.div>
                    <motion.svg
                      viewBox="0 0 20 20"
                      className="absolute top-[-11px] left-[-46px] size-[22px]"
                      animate={reduced ? undefined : { x: [0, 7, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity, ease: [0.7, 0, 0.3, 1] }}
                    >
                      <polygon points="0,0 20,10 0,20 5,10" fill={RED} stroke={BLACK} strokeWidth="2" />
                    </motion.svg>
                  </motion.div>
                </div>
              </motion.div>

              {MENU.map((m, i) => {
                const on = i === cursor
                return (
                  <button
                    key={m.label}
                    ref={(el) => {
                      btns.current[i] = el
                    }}
                    type="button"
                    aria-label={m.label}
                    aria-current={on ? 'true' : undefined}
                    tabIndex={menuLive ? 0 : -1}
                    onMouseEnter={() => menuLive && !busy.current && select(i)}
                    onFocus={() => select(i)}
                    onClick={() => confirm(i)}
                    className="absolute flex items-end leading-none whitespace-nowrap outline-none"
                    style={{ left: m.x, top: m.y, rotate: `${m.rot}deg`, translate: '0 0 26px', transformOrigin: '0% 50%', height: m.size }}
                  >
                    <motion.span
                      className="flex items-end gap-1.5"
                      custom={i}
                      variants={reduced ? itemVReduced : itemV}
                      initial={false}
                      animate={paused ? 'in' : 'out'}
                      style={{ originX: 0 }}
                    >
                      <motion.span
                        className="flex items-end font-black tracking-tight"
                        style={{ fontSize: m.size, lineHeight: 1, textShadow: on ? 'none' : `3px 3px 0 ${BLACK}` }}
                        animate={{ x: on ? 4 : 0, scale: on ? 1.06 : 1 }}
                        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 600, damping: 24 }}
                      >
                        {on ? <Letters key="on" text={m.label} item={i} reduced={reduced} /> : <span key="off">{m.label}</span>}
                      </motion.span>
                      <span className={`mb-[0.15em] -skew-x-12 px-1 font-mono text-[10px] font-bold tracking-wider ${on ? 'bg-[#e3141e] text-[#f6f1e7]' : 'bg-[#f6f1e7] text-[#0c0b0d]'}`}>{m.en}</span>
                    </motion.span>
                  </button>
                )
              })}
            </div>
          </motion.div>
        </div>

        {/* 右上: 日付と所持金 */}
        <motion.div
          className="tpm-big absolute top-3 right-3 z-10 flex flex-col items-end gap-1 @min-[40rem]:top-4 @min-[40rem]:right-5"
          initial={false}
          animate={paused ? { y: 0, rotate: 0, opacity: 1 } : { y: -90, rotate: 12, opacity: 0 }}
          transition={reduced ? { duration: 0.15 } : paused ? { type: 'spring', stiffness: 520, damping: 18, delay: enterDelay(0.55) } : { duration: 0.15 }}
        >
          <div className="flex rotate-[-4deg] items-baseline gap-1.5 bg-[#f6f1e7] px-2.5 py-0.5 text-[#0c0b0d] shadow-[4px_4px_0_#e3141e]">
            <span className="font-['Space_Grotesk'] text-xl font-bold tracking-tighter @min-[40rem]:text-2xl">11/07</span>
            <span className="bg-[#0c0b0d] px-1 text-xs font-black text-[#f6f1e7]">土</span>
            <span className="text-[10px] font-bold">放課後</span>
          </div>
          <div className="rotate-[3deg] bg-[#0c0b0d] px-2 py-0.5 font-mono text-xs font-bold ring-2 ring-[#f6f1e7]">
            所持金 <span className="text-[#e3141e]">¥</span> 48,200
          </div>
        </motion.div>

        {/* 左上: 切り抜き文字の PAUSE。開くと中央に押されてから角へ飛ぶ */}
        <div className={`transition-opacity duration-150 ${inSub ? 'opacity-0' : ''}`}>
        <AnimatePresence>
          {paused && (
            <motion.div
              key={openN}
              aria-hidden
              className="pointer-events-none absolute top-3 left-3 z-[60] origin-top-left @min-[40rem]:top-4 @min-[40rem]:left-5"
              initial={reduced ? { opacity: 0 } : { x: stampFrom.x, y: stampFrom.y, scale: 4.6, rotate: -22, opacity: 0 }}
              animate={
                reduced
                  ? { opacity: 1 }
                  : {
                      x: [stampFrom.x, stampFrom.x, stampFrom.x, 0],
                      y: [stampFrom.y, stampFrom.y, stampFrom.y, 0],
                      scale: [4.6, 2.5, 2.7, 1],
                      rotate: [-22, -8, -8, -6],
                      opacity: [0, 1, 1, 1],
                    }
              }
              exit={{ opacity: 0, x: -60, transition: { duration: 0.14 } }}
              transition={reduced ? { duration: 0.15 } : { duration: 0.82, times: [0, 0.16, 0.48, 1], ease: ['circOut', 'linear', [0.7, 0, 0.2, 1]], delay: 0.08 }}
            >
              <Ransom text="PAUSE" seed={3} className="text-[15px] @min-[40rem]:text-[19px] @min-[100rem]:text-[28px]" />
            </motion.div>
          )}
        </AnimatePresence>
        </div>

        {/* 操作ヒントとポーズ切替 */}
        <div className="absolute bottom-[calc(var(--solo-footer-clearance,0px)_+_0.6rem)] left-3 z-30 @min-[40rem]:left-5">
          <div className="tpm-big flex flex-wrap items-center gap-2 font-mono text-[10px] font-bold">
          <button
            type="button"
            onClick={() => (paused ? (view === 'sub' ? back() : close()) : open())}
            aria-label={paused ? (view === 'sub' ? 'メニューにもどる' : 'ポーズを解除してゲームに戻る') : 'ポーズメニューを開く'}
            className="-skew-x-12 bg-[#e3141e] px-2.5 py-1 text-[11px] font-black text-[#f6f1e7] shadow-[3px_3px_0_#0c0b0d] ring-1 ring-[#0c0b0d] outline-none hover:bg-[#f6f1e7] hover:text-[#0c0b0d] focus-visible:ring-2 focus-visible:ring-[#f6f1e7] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0b0d]"
          >
            {paused ? (view === 'sub' ? '◀ もどる' : '▶ 再開') : '❚❚ ポーズ'}
          </button>
          {(paused
            ? view === 'menu'
              ? [
                  ['↑↓', '選択'],
                  ['Enter', '決定'],
                  ['Esc', '再開'],
                ]
              : [
                  ['←→', '切替'],
                  ['Esc', 'もどる'],
                ]
            : [['Esc', 'ポーズ']]
          ).map(([k, l]) => (
            <span key={k} className="flex items-center gap-1">
              <kbd className="-skew-x-12 bg-[#f6f1e7] px-1.5 text-[#0c0b0d]">{k}</kbd>
              <span className="[text-shadow:1px_1px_0_#0c0b0d]">{l}</span>
            </span>
          ))}
          </div>
        </div>

        {/* サブ画面 */}
        <AnimatePresence>
          {inSub && (
            <motion.section
              key="sub"
              aria-label={MENU[active].label}
              className="absolute inset-y-0 right-0 z-20 w-full overflow-hidden bg-[#f6f1e7] text-[#0c0b0d] @min-[40rem]:w-[66%]"
              style={{ clipPath: 'polygon(7% 0, 100% 0, 100% 100%, 0 100%, 4% 74%, 1.5% 52%, 5% 30%, 2% 14%)' }}
              initial={reduced ? { opacity: 0 } : { x: '105%', skewX: -14 }}
              animate={reduced ? { opacity: 1 } : { x: '0%', skewX: 0 }}
              exit={reduced ? { opacity: 0, transition: { duration: 0.15 } } : { x: '112%', skewX: 18, transition: { duration: 0.22, ease: [0.7, 0, 1, 0.5] } }}
              transition={reduced ? { duration: 0.15 } : { type: 'spring', stiffness: 380, damping: 32 }}
            >
              <div aria-hidden className="absolute inset-0 opacity-60" style={{ background: 'repeating-linear-gradient(-60deg, transparent 0 18px, rgba(12,11,13,.05) 18px 20px)' }} />
              <div
                aria-hidden
                className="absolute -right-6 -bottom-6 size-[42%]"
                style={{
                  backgroundImage: `radial-gradient(${RED} 30%, transparent 33%)`,
                  backgroundSize: '9px 9px',
                  maskImage: 'radial-gradient(circle at 100% 100%, #000, transparent 68%)',
                  WebkitMaskImage: 'radial-gradient(circle at 100% 100%, #000, transparent 68%)',
                  opacity: 0.55,
                }}
              />
              <AnimatePresence initial={false}>
                <motion.span
                  key={active}
                  aria-hidden
                  className="absolute right-[-2%] bottom-[8%] -rotate-6 font-['Space_Grotesk'] text-[22cqmin] leading-none font-bold tracking-tighter text-transparent italic [-webkit-text-stroke:2px_rgba(12,11,13,.09)]"
                  initial={reduced ? { opacity: 0 } : { x: 120, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  transition={{ type: 'spring', stiffness: 200, damping: 26 }}
                >
                  {MENU[active].en}
                </motion.span>
              </AnimatePresence>
              <motion.div
                aria-hidden
                className="absolute bottom-[-6%] left-[-10%] h-[16%] w-[70%] -rotate-[8deg] bg-[#e3141e]"
                style={{ clipPath: CHEVRON }}
                initial={reduced ? false : { x: '-100%' }}
                animate={{ x: '0%' }}
                transition={{ delay: 0.15, duration: 0.3, ease: 'circOut' }}
              />

              <div className="tpm-sub relative flex h-full flex-col gap-2 px-[8%] pt-3 pb-[calc(var(--solo-footer-clearance,0px)_+_0.9rem)] @min-[40rem]:pt-4">
                <header className="flex items-start justify-between gap-2">
                  <div className="relative -rotate-6">
                    <h2 className="relative text-[clamp(24px,4.2cqw,40px)] leading-none">
                      <Ransom key={active} text={MENU[active].label} seed={active * 7 + 2} deal delay={0.08} />
                    </h2>
                    <span className="relative mt-1 ml-2 inline-block bg-[#0c0b0d] px-1.5 font-mono text-[10px] font-bold tracking-[.3em] text-[#f6f1e7]">{MENU[active].en}</span>
                  </div>
                  <button
                    ref={backRef}
                    type="button"
                    onClick={back}
                    className="shrink-0 rotate-3 bg-[#0c0b0d] px-3 py-1 text-xs font-black text-[#f6f1e7] shadow-[3px_3px_0_#e3141e] outline-none hover:bg-[#e3141e] focus-visible:ring-2 focus-visible:ring-[#e3141e] focus-visible:ring-offset-2"
                  >
                    ◀ もどる <span className="font-mono text-[9px] opacity-70">Esc</span>
                  </button>
                </header>
                {/* ギザギザのタブ */}
                <div role="tablist" aria-label="メニュー切替" className="flex flex-wrap items-center gap-x-1 gap-y-1.5">
                  {MENU.map((m, i) => {
                    const on = i === active
                    return (
                      <motion.button
                        key={m.en}
                        type="button"
                        role="tab"
                        aria-selected={on}
                        tabIndex={on ? 0 : -1}
                        onClick={() => pickTab(i)}
                        className="relative px-2 py-0.5 text-[11px] font-black outline-none focus-visible:ring-2 focus-visible:ring-[#e3141e] focus-visible:ring-offset-1"
                        style={{ rotate: `${on ? -5 : i % 2 ? 2 : -2}deg` }}
                        initial={reduced ? false : { y: -30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1, scale: on ? 1.14 : 1, transition: { delay: reduced ? 0 : 0.12 + i * 0.03, type: 'spring', stiffness: 600, damping: 20 } }}
                      >
                        <span aria-hidden className="absolute inset-0 bg-[#0c0b0d]" style={{ clipPath: clipRow(i) }} />
                        {on && (
                          <motion.span
                            layoutId="tpm-tab-plate"
                            aria-hidden
                            className="absolute inset-[-3px_-5px] bg-[#e3141e]"
                            style={{ clipPath: 'polygon(5% 0, 100% 10%, 95% 100%, 0 86%)' }}
                            transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 600, damping: 32 }}
                          />
                        )}
                        <span className="relative text-[#f6f1e7]">{m.label}</span>
                      </motion.button>
                    )
                  })}
                </div>
                <div className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto pt-1 pr-1">
                  <AnimatePresence mode="wait" initial={false} custom={tabDir}>
                    <motion.div key={active} role="tabpanel" aria-label={MENU[active].label} custom={tabDir} variants={tabV} initial="enter" animate="center" exit="exit">
                      {SUBS[active]}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* 開いた瞬間の白フラッシュ */}
        {openN > 0 && !reduced && (
          <motion.div key={openN} aria-hidden className="pointer-events-none absolute inset-0 z-[55] bg-[#f6f1e7]" initial={{ opacity: 0.95 }} animate={{ opacity: 0 }} transition={{ duration: 0.16, ease: 'easeOut' }} />
        )}

        {/* 開閉の帯・戻るときの斬撃 */}
        <AnimatePresence>{sweep && <Sweep key={sweep.k} dir={sweep.dir} />}</AnimatePresence>
        {slash > 0 && <Slash key={slash} />}

        {/* カットイン */}
        <AnimatePresence>{cutin !== null && <CutIn key={cutin} label={MENU[active].label} en={MENU[active].en} />}</AnimatePresence>
      </div>
    </RM.Provider>
  )
}
