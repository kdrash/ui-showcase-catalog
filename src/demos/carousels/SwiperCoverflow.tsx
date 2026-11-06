import { useState, type CSSProperties } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { EffectCoverflow, Keyboard, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/effect-coverflow'
import 'swiper/css/pagination'

const ALBUMS = [
  { title: 'Midnight Drive', artist: 'Lumen', emoji: '🌙', bg: 'linear-gradient(135deg,#1e1b4b,#7c3aed 60%,#f472b6)' },
  { title: 'Paper Planes', artist: 'Kite Club', emoji: '✈️', bg: 'linear-gradient(135deg,#0ea5e9,#a5f3fc)' },
  { title: 'Citrus', artist: 'Mono Bloom', emoji: '🍋', bg: 'linear-gradient(135deg,#facc15,#fb923c)' },
  { title: 'Analog Heart', artist: 'Tape Deck', emoji: '📼', bg: 'linear-gradient(135deg,#ef4444,#7f1d1d)' },
  { title: 'Greenhouse', artist: 'Fern', emoji: '🌿', bg: 'linear-gradient(135deg,#065f46,#34d399)' },
  { title: 'Static Bloom', artist: 'Noise Garden', emoji: '🌸', bg: 'linear-gradient(135deg,#fbcfe8,#c084fc)' },
  { title: 'Low Tide', artist: 'Harbor', emoji: '🐚', bg: 'linear-gradient(135deg,#164e63,#67e8f9)' },
]

/** Swiper の EffectCoverflow。iTunes の Cover Flow 風に左右のスライドが奥へ傾く。 */
export function SwiperCoverflow() {
  const [active, setActive] = useState(3)
  const current = ALBUMS[active]

  return (
    <div className="relative flex h-full w-full flex-col justify-center overflow-hidden bg-gradient-to-b from-zinc-900 to-black text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-40 blur-3xl transition-all duration-700"
        style={{ background: current.bg }}
      />
      <Swiper
        modules={[EffectCoverflow, Pagination, Keyboard]}
        effect="coverflow"
        grabCursor
        centeredSlides
        keyboard
        slidesPerView="auto"
        initialSlide={3}
        coverflowEffect={{ rotate: 42, stretch: 0, depth: 140, modifier: 1, slideShadows: true }}
        pagination={{ clickable: true }}
        onSlideChange={(s) => setActive(s.activeIndex)}
        className="relative w-full !pb-9"
        style={
          {
            '--swiper-pagination-color': '#ffffff',
            '--swiper-pagination-bullet-inactive-color': '#a1a1aa',
            '--swiper-pagination-bottom': '6px',
          } as CSSProperties
        }
      >
        {ALBUMS.map((a) => (
          <SwiperSlide key={a.title} className="!h-[170px] !w-[170px] overflow-hidden rounded-xl">
            <div className="relative flex h-full w-full items-center justify-center" style={{ background: a.bg }}>
              <span className="text-6xl drop-shadow-lg">{a.emoji}</span>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2.5">
                <div className="truncate text-sm font-semibold">{a.title}</div>
                <div className="truncate text-[11px] text-white/70">{a.artist}</div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
      <div className="relative mt-1 text-center">
        <div className="text-[10px] uppercase tracking-[0.25em] text-white/50">Now Playing</div>
        <div className="text-sm font-medium">
          {current.title} <span className="text-white/50">— {current.artist}</span>
        </div>
      </div>
    </div>
  )
}
