import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * GSAP ScrollTrigger による「縦スクロール → 横スクロール」のピン留めセクション。
 * - プレビュー内の div をスクローラーにするため scrollTrigger.scroller を指定
 * - pin: true + scrub + snap で横パネルをスナップ
 * - containerAnimation で、横移動中の各パネル内テキストを個別にアニメーション
 */

const PANELS = [
  { no: '01', en: 'Discover', jp: '発見する', accent: '#ff5a36', bg: '#140b09' },
  { no: '02', en: 'Design', jp: 'デザインする', accent: '#ffc53d', bg: '#141008' },
  { no: '03', en: 'Animate', jp: '動かす', accent: '#3ddc97', bg: '#08140f' },
  { no: '04', en: 'Build', jp: '組み立てる', accent: '#3db8ff', bg: '#08101a' },
  { no: '05', en: 'Ship it', jp: '届ける', accent: '#c084fc', bg: '#110a18' },
]

export function GsapHorizontalScroll() {
  const rootRef = useRef<HTMLDivElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const pinRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    const pin = pinRef.current
    if (!scroller || !pin) return

    const ctx = gsap.context(() => {
      const panels = gsap.utils.toArray<HTMLElement>('.hs-panel')

      // 横スクロール本体: 各パネルを自身の幅 × (枚数-1) だけ左へ
      const tween = gsap.to(panels, {
        xPercent: -100 * (panels.length - 1),
        ease: 'none',
        scrollTrigger: {
          trigger: pin,
          scroller,
          pin: true,
          scrub: 0.8,
          snap: { snapTo: 1 / (panels.length - 1), duration: { min: 0.15, max: 0.45 }, ease: 'power1.inOut' },
          end: () => '+=' + pin.offsetWidth * (panels.length - 1),
          invalidateOnRefresh: true,
          onUpdate: (self) => gsap.set(progressRef.current, { scaleX: self.progress }),
        },
      })

      // 横移動に連動したパネル内アニメーション (containerAnimation)
      panels.forEach((panel) => {
        const q = gsap.utils.selector(panel)
        gsap.from(q('.hs-reveal'), {
          yPercent: 120,
          opacity: 0,
          stagger: 0.08,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: panel,
            scroller,
            containerAnimation: tween,
            start: 'left 65%',
            toggleActions: 'play none none reverse',
          },
        })
        gsap.fromTo(
          q('.hs-big'),
          { xPercent: 25 },
          {
            xPercent: -25,
            ease: 'none',
            scrollTrigger: { trigger: panel, scroller, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true },
          },
        )
      })

      // イントロ
      gsap.from('.hs-intro > *', { y: 40, opacity: 0, stagger: 0.12, duration: 0.9, ease: 'power3.out' })
      gsap.to('.hs-arrow', { y: 8, repeat: -1, yoyo: true, duration: 0.7, ease: 'sine.inOut' })
    }, rootRef)

    return () => ctx.revert()
  }, [])

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full overflow-hidden bg-[#0b0b0d] text-white"
      style={{ fontFamily: "'Space Grotesk', 'Noto Sans JP', sans-serif" }}
    >
      <div
        ref={progressRef}
        className="absolute inset-x-0 top-0 z-20 h-1 origin-left scale-x-0 bg-gradient-to-r from-[#ff5a36] via-[#3ddc97] to-[#c084fc]"
      />
      <div ref={scrollerRef} className="relative h-full w-full overflow-y-auto overflow-x-hidden overscroll-contain">
        <section className="hs-intro flex h-full flex-col items-center justify-center gap-3 text-center">
          <p className="text-[11px] uppercase tracking-[0.4em] text-zinc-500">GSAP · ScrollTrigger</p>
          <h3 className="text-4xl font-bold leading-none tracking-tight">
            Scroll <span className="text-zinc-500">→</span> Sideways
          </h3>
          <p className="text-sm text-zinc-400">このエリア内を下にスクロール</p>
          <span className="hs-arrow mt-2 text-2xl text-zinc-500">↓</span>
        </section>

        <div ref={pinRef} className="h-full w-full overflow-hidden">
          <div className="flex h-full w-full flex-nowrap">
            {PANELS.map((p) => (
              <section
                key={p.no}
                className="hs-panel relative flex h-full w-full shrink-0 flex-col justify-end overflow-hidden p-8"
                style={{ background: p.bg }}
              >
                <span
                  className="hs-big pointer-events-none absolute -right-6 top-1/2 -translate-y-1/2 select-none text-[11rem] font-bold leading-none opacity-[0.07]"
                  style={{ color: p.accent }}
                >
                  {p.no}
                </span>
                <div className="absolute left-8 top-8 h-2 w-2 rounded-full" style={{ background: p.accent, boxShadow: `0 0 24px ${p.accent}` }} />
                <div className="overflow-hidden">
                  <p className="hs-reveal text-xs font-semibold tracking-[0.3em]" style={{ color: p.accent }}>
                    {p.no} / {String(PANELS.length).padStart(2, '0')}
                  </p>
                </div>
                <div className="overflow-hidden">
                  <h4 className="hs-reveal text-5xl font-bold tracking-tight">{p.en}</h4>
                </div>
                <div className="overflow-hidden">
                  <p className="hs-reveal mt-1 text-lg text-zinc-400">{p.jp}</p>
                </div>
              </section>
            ))}
          </div>
        </div>

        <section className="flex h-full flex-col items-center justify-center gap-2">
          <p className="text-3xl font-bold">Fin.</p>
          <p className="text-sm text-zinc-500">上にスクロールして戻る ↑</p>
        </section>
      </div>
    </div>
  )
}
