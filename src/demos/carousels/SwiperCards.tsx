import { useState } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { EffectCards } from 'swiper/modules'
import { Plane } from 'lucide-react'
import 'swiper/css'
import 'swiper/css/effect-cards'

const TRIPS = [
  { city: 'Kyoto', code: 'KIX', emoji: '⛩️', date: '04.12', bg: 'linear-gradient(160deg,#fda4af,#e11d48)' },
  { city: 'Reykjavík', code: 'KEF', emoji: '🧊', date: '05.03', bg: 'linear-gradient(160deg,#a5f3fc,#0e7490)' },
  { city: 'Marrakesh', code: 'RAK', emoji: '🕌', date: '06.21', bg: 'linear-gradient(160deg,#fdba74,#c2410c)' },
  { city: 'Lisbon', code: 'LIS', emoji: '🚋', date: '07.09', bg: 'linear-gradient(160deg,#fde68a,#ca8a04)' },
  { city: 'Banff', code: 'YYC', emoji: '🏔️', date: '08.15', bg: 'linear-gradient(160deg,#bbf7d0,#15803d)' },
  { city: 'Havana', code: 'HAV', emoji: '🚗', date: '09.30', bg: 'linear-gradient(160deg,#c4b5fd,#6d28d9)' },
]

/** Swiper の EffectCards。カードの山をスワイプでめくるトランプ風カルーセル。 */
export function SwiperCards() {
  const [index, setIndex] = useState(0)
  return (
    <div className="relative flex h-full w-full items-center justify-center gap-8 overflow-hidden bg-[#fff4ec] text-zinc-900">
      <div className="hidden w-32 sm:block">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-orange-500">Boarding</p>
        <h3 className="text-2xl font-black leading-tight tracking-tight">My Trips</h3>
        <p className="mt-2 text-xs text-zinc-500">スワイプしてめくる</p>
        <div className="mt-3 font-mono text-sm text-zinc-700">
          {String(index + 1).padStart(2, '0')} / {String(TRIPS.length).padStart(2, '0')}
        </div>
      </div>
      <Swiper
        modules={[EffectCards]}
        effect="cards"
        grabCursor
        cardsEffect={{ perSlideOffset: 9, perSlideRotate: 3, slideShadows: false }}
        onSlideChange={(s) => setIndex(s.activeIndex)}
        className="!h-[240px] !w-[180px]"
      >
        {TRIPS.map((t) => (
          <SwiperSlide
            key={t.city}
            className="overflow-hidden rounded-2xl shadow-[0_12px_30px_-10px_rgba(0,0,0,0.35)]"
            style={{ background: t.bg }}
          >
            <div className="flex h-full flex-col p-4 text-white">
              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-white/80">
                <span>HND</span>
                <Plane size={14} />
                <span>{t.code}</span>
              </div>
              <div className="flex flex-1 items-center justify-center text-6xl drop-shadow-md">{t.emoji}</div>
              <div className="border-t border-dashed border-white/50 pt-2">
                <div className="text-lg font-bold leading-none">{t.city}</div>
                <div className="mt-1 flex justify-between font-mono text-[10px] text-white/80">
                  <span>DEP {t.date}</span>
                  <span>SEAT 12A</span>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  )
}
