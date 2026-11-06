import { useEffect, useRef, useState } from 'react'
import Lenis from 'lenis'
import { art } from '../_shared/art'

/**
 * Lenis をカード内のスクロールコンテナ(wrapper/content)に適用した慣性スクロール。
 * lenis.on('scroll') で取得した値から、速度の違う複数レイヤーのパララックスと進捗バーを更新する。
 * 右上のスイッチで Lenis の ON/OFF(=ネイティブスクロール)を比較できる。
 */

const LAYERS = [
  { speed: 0.15, size: 220, x: '8%', y: 40, color: 'from-fuchsia-500/50 to-violet-500/10' },
  { speed: 0.35, size: 140, x: '70%', y: 160, color: 'from-cyan-400/50 to-sky-500/10' },
  { speed: 0.6, size: 90, x: '40%', y: 420, color: 'from-amber-300/60 to-orange-500/10' },
  { speed: 0.25, size: 180, x: '78%', y: 640, color: 'from-emerald-400/40 to-teal-500/10' },
  { speed: 0.5, size: 110, x: '12%', y: 860, color: 'from-rose-400/50 to-pink-500/10' },
]

const SECTIONS = [
  { k: '01', t: 'Smooth', d: 'ホイールの入力を lerp で補間し、慣性のある“ぬるっと”した動きに。' },
  { k: '02', t: 'Parallax', d: 'scroll イベントの値をそのまま transform に流し、レイヤーごとに速度を変える。' },
  { k: '03', t: 'Native', d: 'スクロール位置は本物の scrollTop。sticky やアンカーもそのまま動く。' },
  { k: '04', t: 'Compare', d: '右上のスイッチで OFF にすると、ブラウザ標準のカクっとした動きに戻る。' },
]

export function LenisSmoothScroll() {
  const wrapper = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLDivElement>(null)
  const layerRefs = useRef<(HTMLDivElement | null)[]>([])
  const imgRefs = useRef<(HTMLDivElement | null)[]>([])
  const [enabled, setEnabled] = useState(true)
  const [velocity, setVelocity] = useState(0)

  // スクロール値 → パララックス(Lenis OFF でも動くようネイティブ scroll でも更新)
  const apply = (y: number, max: number) => {
    layerRefs.current.forEach((el, i) => {
      if (el) el.style.transform = `translate3d(0, ${-y * LAYERS[i].speed}px, 0)`
    })
    imgRefs.current.forEach((el, i) => {
      if (el) el.style.transform = `translate3d(0, ${(y * (i % 2 ? 0.12 : -0.08)).toFixed(1)}px, 0) scale(1.15)`
    })
    if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? y / max : 0})`
  }

  useEffect(() => {
    const w = wrapper.current!
    const onNative = () => apply(w.scrollTop, w.scrollHeight - w.clientHeight)
    if (!enabled) {
      w.addEventListener('scroll', onNative, { passive: true })
      onNative()
      return () => w.removeEventListener('scroll', onNative)
    }
    const lenis = new Lenis({
      wrapper: w,
      content: content.current!,
      eventsTarget: w,
      lerp: 0.08,
      wheelMultiplier: 0.9,
      autoRaf: true,
    })
    const off = lenis.on('scroll', (l) => {
      apply(l.animatedScroll, l.limit)
      setVelocity(Math.round(l.velocity * 10) / 10)
    })
    apply(w.scrollTop, w.scrollHeight - w.clientHeight)
    return () => {
      off()
      lenis.destroy()
      setVelocity(0)
    }
  }, [enabled])

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0b0a14] text-white">
      <div ref={wrapper} className="thin-scroll absolute inset-0 overflow-y-auto overscroll-contain">
        <div ref={content} className="relative">
          {/* パララックスの光 */}
          <div className="pointer-events-none absolute inset-0">
            {LAYERS.map((l, i) => (
              <div
                key={i}
                ref={(el) => {
                  layerRefs.current[i] = el
                }}
                className={`absolute rounded-full bg-gradient-to-br ${l.color} blur-2xl will-change-transform`}
                style={{ width: l.size, height: l.size, left: l.x, top: l.y }}
              />
            ))}
          </div>

          <header className="relative flex h-[280px] flex-col justify-center px-8">
            <p className="font-mono text-[11px] tracking-[0.3em] text-fuchsia-300/80">LENIS · SMOOTH SCROLL</p>
            <h2 className="mt-3 font-['Space_Grotesk'] text-[clamp(34px,8cqw,64px)] leading-[0.95] font-bold">
              Scroll that
              <br />
              <span className="bg-gradient-to-r from-fuchsia-300 via-violet-300 to-cyan-300 bg-clip-text text-transparent">feels like silk.</span>
            </h2>
            <p className="mt-4 animate-pulse text-xs text-zinc-400">↓ スクロール</p>
          </header>

          {SECTIONS.map((s, i) => (
            <section key={s.k} className={`relative flex items-center gap-6 px-8 py-10 ${i % 2 ? 'flex-row-reverse' : ''}`}>
              <div className="relative h-40 w-[45%] shrink-0 overflow-hidden rounded-2xl border border-white/10">
                <div
                  ref={(el) => {
                    imgRefs.current[i] = el
                  }}
                  className="absolute inset-0 bg-cover bg-center will-change-transform"
                  style={{ backgroundImage: `url("${art(i % 2 ? 'gradient' : 'landscape', i + 2, 600, 450)}")` }}
                />
              </div>
              <div>
                <div className="font-mono text-xs text-zinc-500">{s.k}</div>
                <h3 className="mt-1 font-['Space_Grotesk'] text-2xl font-bold">{s.t}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">{s.d}</p>
              </div>
            </section>
          ))}
          <footer className="relative px-8 pt-6 pb-20 text-center font-['Space_Grotesk'] text-4xl font-bold text-white/20">END</footer>
        </div>
      </div>

      {/* 進捗バー */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-white/5">
        <div ref={bar} className="h-full origin-left bg-gradient-to-r from-fuchsia-400 to-cyan-300" style={{ transform: 'scaleX(0)' }} />
      </div>

      {/* ON/OFF */}
      <div className="absolute top-3 right-3 flex items-center gap-2 rounded-full border border-white/10 bg-black/50 py-1 pr-1 pl-3 text-[11px] backdrop-blur">
        <span className="font-mono text-zinc-400">v {velocity.toFixed(1)}</span>
        <button
          type="button"
          onClick={() => setEnabled((e) => !e)}
          className={`rounded-full px-3 py-1 font-semibold transition ${enabled ? 'bg-fuchsia-500 text-white' : 'bg-zinc-700 text-zinc-300'}`}
        >
          Lenis {enabled ? 'ON' : 'OFF'}
        </button>
      </div>
    </div>
  )
}
