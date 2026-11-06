import { useCallback, useEffect, useRef, useState } from 'react'
import useEmblaCarousel, { type UseEmblaCarouselType } from 'embla-carousel-react'

type EmblaApi = NonNullable<UseEmblaCarouselType[1]>

const TWEEN_FACTOR_BASE = 0.52
const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max)

const POSTERS = [
  { title: 'NEON', jp: 'ネオン', from: '#f43f5e', to: '#7c3aed' },
  { title: 'TIDE', jp: '潮流', from: '#06b6d4', to: '#1e3a8a' },
  { title: 'EMBER', jp: '残り火', from: '#f97316', to: '#7f1d1d' },
  { title: 'MOSS', jp: '苔', from: '#84cc16', to: '#064e3b' },
  { title: 'HAZE', jp: '霞', from: '#e879f9', to: '#312e81' },
  { title: 'GOLD', jp: '金', from: '#facc15', to: '#78350f' },
]

/**
 * Embla の scroll イベントで各スライドの「中央からの距離」を計算し、
 * scale / opacity を直接 style に書き込む(公式 Tween サンプルの応用)。
 */
export function EmblaScaleParallax() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true })
  const tweenFactor = useRef(0)
  const tweenNodes = useRef<HTMLElement[]>([])
  const [selected, setSelected] = useState(0)

  const setTweenNodes = useCallback((api: EmblaApi) => {
    tweenNodes.current = api
      .slideNodes()
      .map((node) => node.querySelector('[data-tween]') as HTMLElement)
  }, [])

  const setTweenFactor = useCallback((api: EmblaApi) => {
    tweenFactor.current = TWEEN_FACTOR_BASE * api.scrollSnapList().length
  }, [])

  const tween = useCallback((api: EmblaApi, eventName?: string) => {
    const engine = api.internalEngine()
    const scrollProgress = api.scrollProgress()
    const slidesInView = api.slidesInView()
    const isScrollEvent = eventName === 'scroll'

    api.scrollSnapList().forEach((scrollSnap, snapIndex) => {
      let diffToTarget = scrollSnap - scrollProgress
      const slidesInSnap = engine.slideRegistry[snapIndex]

      slidesInSnap.forEach((slideIndex) => {
        if (isScrollEvent && !slidesInView.includes(slideIndex)) return

        // ループ時、反対側に回り込んだスライドの距離を補正
        if (engine.options.loop) {
          engine.slideLooper.loopPoints.forEach((loopItem) => {
            const target = loopItem.target()
            if (slideIndex === loopItem.index && target !== 0) {
              const sign = Math.sign(target)
              if (sign === -1) diffToTarget = scrollSnap - (1 + scrollProgress)
              if (sign === 1) diffToTarget = scrollSnap + (1 - scrollProgress)
            }
          })
        }

        const tweenValue = 1 - Math.abs(diffToTarget * tweenFactor.current)
        const node = tweenNodes.current[slideIndex]
        if (!node) return
        node.style.transform = `scale(${clamp(tweenValue, 0.72, 1)})`
        node.style.opacity = String(clamp(tweenValue, 0.3, 1))
      })
    })
  }, [])

  useEffect(() => {
    if (!emblaApi) return
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap())
    setTweenNodes(emblaApi)
    setTweenFactor(emblaApi)
    tween(emblaApi)
    onSelect()

    emblaApi
      .on('reInit', setTweenNodes)
      .on('reInit', setTweenFactor)
      .on('reInit', tween)
      .on('scroll', tween)
      .on('slideFocus', tween)
      .on('select', onSelect)
    return () => {
      emblaApi
        .off('reInit', setTweenNodes)
        .off('reInit', setTweenFactor)
        .off('reInit', tween)
        .off('scroll', tween)
        .off('slideFocus', tween)
        .off('select', onSelect)
    }
  }, [emblaApi, setTweenNodes, setTweenFactor, tween])

  return (
    <div className="relative flex h-full w-full flex-col justify-center overflow-hidden bg-[#0b0b10] py-4 text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-60 transition-colors duration-700"
        style={{
          background: `radial-gradient(60% 50% at 50% 60%, ${POSTERS[selected].from}55, transparent 70%)`,
        }}
      />
      <div className="relative overflow-hidden" ref={emblaRef}>
        <div className="flex touch-pan-y">
          {POSTERS.map((p, i) => (
            <div key={p.title} className="min-w-0 shrink-0 grow-0 basis-[55%]">
              <div
                data-tween
                className="relative mx-auto flex aspect-[3/4] h-[210px] cursor-grab flex-col justify-between overflow-hidden rounded-2xl p-4 shadow-2xl will-change-transform active:cursor-grabbing"
                style={{ background: `linear-gradient(160deg, ${p.from}, ${p.to})` }}
              >
                <span className="font-mono text-[10px] text-white/70">No.{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <div className="text-3xl font-black tracking-tighter" style={{ fontFamily: 'Space Grotesk' }}>
                    {p.title}
                  </div>
                  <div className="text-xs text-white/80">{p.jp}</div>
                </div>
                <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/15 blur-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="relative mt-3 text-center font-mono text-xs tracking-widest text-white/60">
        {String(selected + 1).padStart(2, '0')} — {String(POSTERS.length).padStart(2, '0')}
      </div>
    </div>
  )
}
