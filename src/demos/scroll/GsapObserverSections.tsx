import { useRef, useState } from 'react'
import gsap from 'gsap'
import { Observer } from 'gsap/Observer'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'
import { art } from '../_shared/art'

gsap.registerPlugin(Observer, SplitText, useGSAP)

/**
 * GSAP Observer による「フルページ・セクションスライダー」をカード内に閉じ込めたもの。
 * ホイール / ドラッグ / スワイプ / 矢印キー(フォーカス時)で1セクションずつ切り替え、
 * 外枠と内枠を逆方向に yPercent で動かすマスク遷移 + 背景のパララックス + SplitText の文字ランダム出現。
 * 最初/最後のセクションではホイールをページに逃がすので、カタログのスクロールを邪魔しない。
 */

const SECTIONS = [
  { title: 'Scroll Down', jp: '一枚ずつ、物語を進める', kind: 'landscape' as const, seed: 0 },
  { title: 'Animated Sections', jp: 'マスクで切り替わる', kind: 'landscape' as const, seed: 5 },
  { title: 'Observer Plugin', jp: 'wheel · touch · pointer', kind: 'gradient' as const, seed: 1 },
  { title: 'Keep Going', jp: 'まだまだ続く', kind: 'landscape' as const, seed: 6 },
  { title: 'The End', jp: 'ありがとうございました', kind: 'geometric' as const, seed: 3 },
]

export function GsapObserverSections() {
  const root = useRef<HTMLDivElement>(null)
  const [idx, setIdx] = useState(0)
  const goRef = useRef<(i: number) => void>(() => {})

  useGSAP(
    (_ctx, contextSafe) => {
      const el = root.current!
      const sections = gsap.utils.toArray<HTMLElement>('.obs-section', el)
      const outers = gsap.utils.toArray<HTMLElement>('.obs-outer', el)
      const inners = gsap.utils.toArray<HTMLElement>('.obs-inner', el)
      const images = gsap.utils.toArray<HTMLElement>('.obs-bg', el)
      const splits = gsap.utils.toArray<HTMLElement>('.obs-heading', el).map((h) => SplitText.create(h, { type: 'chars,words' }))
      let current = -1
      let animating = false
      gsap.set(outers, { yPercent: 100 })
      gsap.set(inners, { yPercent: -100 })

      const go = (index: number, dir = index > current ? 1 : -1, intro = false) => {
        if (animating || index === current || index < 0 || index >= sections.length) return
        animating = !intro
        const tl = gsap.timeline({ defaults: { duration: intro ? 0 : 1.1, ease: 'power2.inOut' }, onComplete: () => void (animating = false) })
        if (current >= 0) {
          gsap.set(sections[current], { zIndex: 0 })
          tl.to(images[current], { yPercent: -15 * dir }).set(sections[current], { autoAlpha: 0 })
        }
        gsap.set(sections[index], { autoAlpha: 1, zIndex: 1 })
        tl.fromTo([outers[index], inners[index]], { yPercent: (i) => (i ? -100 * dir : 100 * dir) }, { yPercent: 0 }, 0)
          .fromTo(images[index], { yPercent: 15 * dir }, { yPercent: 0 }, 0)
          .fromTo(
            splits[index].chars,
            { autoAlpha: 0, yPercent: 150 * dir },
            { autoAlpha: 1, yPercent: 0, duration: 1, ease: 'power2', stagger: { each: 0.02, from: 'random' } },
            0.2,
          )
        current = index
        setIdx(index)
      }
      goRef.current = contextSafe!((i: number) => go(i))

      Observer.create({
        target: el,
        type: 'wheel,touch,pointer',
        wheelSpeed: -1,
        tolerance: 10,
        dragMinimum: 6,
        onDown: () => go(current - 1, -1),
        onUp: () => go(current + 1, 1),
      })
      // 端以外ではページのスクロールを止める(端では外へ逃がす)
      const onWheel = (e: WheelEvent) => {
        const atStart = current <= 0 && e.deltaY < 0
        const atEnd = current >= sections.length - 1 && e.deltaY > 0
        if (!atStart && !atEnd) e.preventDefault()
      }
      el.addEventListener('wheel', onWheel, { passive: false })
      go(0, 1, true)
      return () => {
        el.removeEventListener('wheel', onWheel)
        splits.forEach((s) => s.revert())
      }
    },
    { scope: root },
  )

  return (
    <div
      ref={root}
      tabIndex={0}
      onMouseEnter={() => root.current?.focus({ preventScroll: true })}
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown' || e.key === 'PageDown') goRef.current(idx + 1)
        else if (e.key === 'ArrowUp' || e.key === 'PageUp') goRef.current(idx - 1)
        else return
        e.preventDefault()
      }}
      className="relative h-full w-full cursor-grab touch-none overflow-hidden bg-black text-white outline-none select-none active:cursor-grabbing"
    >
      {SECTIONS.map((s, i) => (
        <section key={i} className="obs-section invisible absolute inset-0">
          <div className="obs-outer h-full w-full overflow-hidden">
            <div className="obs-inner h-full w-full overflow-hidden">
              <div
                className="obs-bg absolute inset-0 flex flex-col items-center justify-center bg-cover bg-center"
                style={{ backgroundImage: `linear-gradient(rgba(0,0,0,.15), rgba(0,0,0,.55)), url("${art(s.kind, s.seed, 1200, 800)}")` }}
              >
                <h2 className="obs-heading px-4 text-center font-['Space_Grotesk'] text-[clamp(30px,7vw,72px)] leading-none font-bold tracking-tight">
                  {s.title}
                </h2>
                <p className="mt-3 text-sm text-white/80">{s.jp}</p>
              </div>
            </div>
          </div>
        </section>
      ))}
      <div className="absolute top-1/2 right-3 z-10 flex -translate-y-1/2 flex-col gap-2">
        {SECTIONS.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`section ${i + 1}`}
            onClick={() => goRef.current(i)}
            className={`h-2.5 w-2.5 rounded-full border border-white transition ${idx === i ? 'scale-125 bg-white' : 'bg-transparent'}`}
          />
        ))}
      </div>
      <div className="pointer-events-none absolute bottom-3 left-4 z-10 font-mono text-[11px] text-white/70">
        0{idx + 1} / 0{SECTIONS.length} · ホイール / ドラッグ / ↑↓
      </div>
    </div>
  )
}
