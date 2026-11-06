import { useCallback, useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'

const SLIDES = [
  { title: 'Morning Light', sub: '静けさのある朝の光', emoji: '🌤️', from: '#fde68a', to: '#fca5a5' },
  { title: 'Deep Forest', sub: '深い森と湿った空気', emoji: '🌲', from: '#bbf7d0', to: '#5eead4' },
  { title: 'Night City', sub: '眠らない街のネオン', emoji: '🌃', from: '#c7d2fe', to: '#f0abfc' },
  { title: 'Sea Breeze', sub: '潮風と白い砂浜', emoji: '🌊', from: '#a5f3fc', to: '#93c5fd' },
  { title: 'Desert Dune', sub: '風が描く砂の模様', emoji: '🏜️', from: '#fed7aa', to: '#fcd34d' },
]

/**
 * Embla Carousel + Autoplay プラグイン。
 * 見た目は全て自作(Embla はヘッドレス)。矢印・ドット・再生/停止を API で制御。
 */
export function EmblaAutoplay() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'center' }, [
    Autoplay({ delay: 3000, stopOnInteraction: false, stopOnMouseEnter: true }),
  ])
  const [selected, setSelected] = useState(0)
  const [playing, setPlaying] = useState(true)

  useEffect(() => {
    if (!emblaApi) return
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap())
    const onPlay = () => setPlaying(true)
    const onStop = () => setPlaying(false)
    onSelect()
    emblaApi.on('select', onSelect).on('reInit', onSelect)
    emblaApi.on('autoplay:play', onPlay).on('autoplay:stop', onStop)
    return () => {
      emblaApi.off('select', onSelect).off('reInit', onSelect)
      emblaApi.off('autoplay:play', onPlay).off('autoplay:stop', onStop)
    }
  }, [emblaApi])

  const togglePlay = useCallback(() => {
    const autoplay = emblaApi?.plugins().autoplay
    if (!autoplay) return
    if (autoplay.isPlaying()) autoplay.stop()
    else autoplay.play()
  }, [emblaApi])

  const btn =
    'grid h-8 w-8 place-items-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900 active:scale-95'

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-zinc-50 px-5 py-4 text-zinc-900">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-400">Featured</p>
          <h3 className="text-lg font-medium tracking-tight">Collections</h3>
        </div>
        <div className="flex gap-1.5">
          <button className={btn} onClick={() => emblaApi?.scrollPrev()} aria-label="前へ">
            <ChevronLeft size={16} />
          </button>
          <button className={btn} onClick={togglePlay} aria-label={playing ? '一時停止' : '再生'}>
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button className={btn} onClick={() => emblaApi?.scrollNext()} aria-label="次へ">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden" ref={emblaRef}>
        <div className="-ml-3 flex h-full touch-pan-y">
          {SLIDES.map((s, i) => (
            <div key={s.title} className="h-full min-w-0 shrink-0 grow-0 basis-[78%] pl-3">
              <div
                className="relative flex h-full flex-col justify-end overflow-hidden rounded-2xl p-4"
                style={{ background: `linear-gradient(135deg, ${s.from}, ${s.to})` }}
              >
                <span className="absolute right-4 top-3 text-5xl drop-shadow-sm">{s.emoji}</span>
                <span className="absolute left-4 top-4 font-mono text-[10px] text-zinc-700/60">
                  {String(i + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}
                </span>
                <h4 className="text-xl font-semibold tracking-tight text-zinc-900">{s.title}</h4>
                <p className="text-xs text-zinc-700">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex justify-center gap-1.5">
        {SLIDES.map((s, i) => (
          <button
            key={s.title}
            aria-label={`スライド ${i + 1}`}
            onClick={() => emblaApi?.scrollTo(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === selected ? 'w-6 bg-zinc-900' : 'w-1.5 bg-zinc-300 hover:bg-zinc-400'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
