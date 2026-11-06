import { useState } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { EffectCreative } from 'swiper/modules'
import type { Swiper as SwiperClass, SwiperOptions } from 'swiper/types'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import 'swiper/css'
import 'swiper/css/effect-creative'

type Preset = { label: string; effect: NonNullable<SwiperOptions['creativeEffect']> }

/** creativeEffect の prev / next に translate・rotate・origin を指定するだけで多彩な遷移になる */
const PRESETS: Preset[] = [
  {
    label: 'Depth',
    effect: { prev: { shadow: true, translate: [0, 0, -400] }, next: { translate: ['100%', 0, 0] } },
  },
  {
    label: 'Spin',
    effect: {
      prev: { shadow: true, translate: ['-125%', 0, -800], rotate: [0, 0, -90] },
      next: { shadow: true, translate: ['125%', 0, -800], rotate: [0, 0, 90] },
    },
  },
  {
    label: 'Book',
    effect: {
      prev: { shadow: true, origin: 'left center', translate: ['-5%', 0, -200], rotate: [0, 100, 0] },
      next: { origin: 'right center', translate: ['5%', 0, -200], rotate: [0, -100, 0] },
    },
  },
  {
    label: 'Stack',
    effect: { prev: { shadow: true, translate: ['-20%', 0, -1] }, next: { translate: ['100%', 0, 0] } },
  },
]

const CHAPTERS = [
  { no: '01', title: 'はじまり', en: 'Origin', bg: 'linear-gradient(135deg,#0f172a,#1d4ed8)' },
  { no: '02', title: '出会い', en: 'Encounter', bg: 'linear-gradient(135deg,#4a044e,#db2777)' },
  { no: '03', title: '試練', en: 'Trial', bg: 'linear-gradient(135deg,#431407,#ea580c)' },
  { no: '04', title: '旅立ち', en: 'Departure', bg: 'linear-gradient(135deg,#052e16,#16a34a)' },
  { no: '05', title: 'おわり', en: 'Epilogue', bg: 'linear-gradient(135deg,#18181b,#71717a)' },
]

export function SwiperCreative() {
  const [preset, setPreset] = useState(0)
  const [swiper, setSwiper] = useState<SwiperClass | null>(null)
  const [index, setIndex] = useState(0)

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-zinc-950 p-4 text-white">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex gap-1 rounded-full bg-white/5 p-1">
          {PRESETS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => {
                setPreset(i)
                setIndex(0)
              }}
              className={`rounded-full px-3 py-1 text-xs transition ${
                preset === i ? 'bg-white text-zinc-900' : 'text-white/60 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => swiper?.slidePrev()}
            className="grid h-7 w-7 place-items-center rounded-full border border-white/15 hover:bg-white/10"
            aria-label="前へ"
          >
            <ArrowLeft size={14} />
          </button>
          <button
            onClick={() => swiper?.slideNext()}
            className="grid h-7 w-7 place-items-center rounded-full border border-white/15 hover:bg-white/10"
            aria-label="次へ"
          >
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      <Swiper
        key={preset}
        modules={[EffectCreative]}
        effect="creative"
        grabCursor
        creativeEffect={PRESETS[preset].effect}
        onSwiper={setSwiper}
        onSlideChange={(s) => setIndex(s.activeIndex)}
        className="min-h-0 w-full flex-1 rounded-2xl"
      >
        {CHAPTERS.map((c) => (
          <SwiperSlide key={c.no} className="overflow-hidden rounded-2xl" style={{ background: c.bg }}>
            <div className="flex h-full flex-col justify-between p-5">
              <span className="font-mono text-xs text-white/60">CHAPTER {c.no}</span>
              <div>
                <div className="text-4xl font-black tracking-tight">{c.title}</div>
                <div className="text-sm italic text-white/70" style={{ fontFamily: 'Playfair Display' }}>
                  {c.en}
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      <div className="mt-3 h-0.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-white transition-all duration-500"
          style={{ width: `${((index + 1) / CHAPTERS.length) * 100}%` }}
        />
      </div>
    </div>
  )
}
