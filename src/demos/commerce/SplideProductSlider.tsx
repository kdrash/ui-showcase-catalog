import { useEffect, useRef, useState } from 'react'
import { Splide } from '@splidejs/splide'
import '@splidejs/splide/dist/css/splide-core.min.css'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { art } from '../_shared/art'

const SLIDES = [
  { name: '朝焼けのランプ', tag: 'NEW', price: 18700, img: art('landscape', 0, 1200, 800) },
  { name: '海辺のラグ', tag: '人気', price: 32000, img: art('landscape', 1, 1200, 800) },
  { name: '森のクッション', tag: '', price: 6600, img: art('landscape', 2, 1200, 800) },
  { name: '砂丘のブランケット', tag: '限定', price: 14300, img: art('landscape', 3, 1200, 800) },
  { name: '霧のテーブルライト', tag: '', price: 22000, img: art('landscape', 4, 1200, 800) },
  { name: '夕暮れのアートパネル', tag: 'NEW', price: 9900, img: art('landscape', 5, 1200, 800) },
]

export function SplideProductSlider() {
  const mainRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)
  const main = useRef<Splide | null>(null)
  const [active, setActive] = useState(0)

  useEffect(() => {
    // メイン(フェード)とサムネイル(isNavigation)を作って sync() で連動させる
    const m = new Splide(mainRef.current!, { type: 'fade', rewind: true, pagination: false, arrows: false, height: '100%', speed: 600 })
    const t = new Splide(thumbRef.current!, {
      fixedWidth: 84,
      fixedHeight: 56,
      gap: 8,
      rewind: true,
      pagination: false,
      arrows: false,
      isNavigation: true,
    })
    m.on('move', (i: number) => setActive(i))
    m.sync(t)
    m.mount()
    t.mount()
    main.current = m
    return () => {
      m.destroy(true)
      t.destroy(true)
      main.current = null
    }
  }, [])

  const s = SLIDES[active]
  return (
    <div className="@container relative flex h-full w-full flex-col gap-3 overflow-hidden bg-[#141210] p-3 font-['Noto_Sans_JP',Inter,sans-serif] text-white">
      <style>{`
        .sps-thumbs .splide__slide{border-radius:10px;overflow:hidden;opacity:.45;border:2px solid transparent;transition:opacity .3s,border-color .3s;cursor:pointer}
        .sps-thumbs .splide__slide.is-active{opacity:1;border-color:#f5b43a}
        .sps-main .splide__track,.sps-main .splide__list{height:100%}
        @keyframes sps-in{from{opacity:0;transform:translateY(10px)}}
      `}</style>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl">
        <div ref={mainRef} className="splide sps-main h-full" aria-label="商品スライダー">
          <div className="splide__track h-full">
            <ul className="splide__list">
              {SLIDES.map((sl) => (
                <li key={sl.name} className="splide__slide">
                  <img src={sl.img} alt={sl.name} className="h-full w-full object-cover" />
                </li>
              ))}
            </ul>
          </div>
        </div>
        {/* 商品情報オーバーレイ */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 pt-16">
          <div key={active} className="animate-[sps-in_.5s_ease-out]">
            {s.tag && <span className="mb-1.5 inline-block rounded-full bg-[#f5b43a] px-2 py-0.5 text-[10px] font-bold text-black">{s.tag}</span>}
            <div className="text-lg font-bold">{s.name}</div>
            <div className="text-sm text-white/80">¥{s.price.toLocaleString('ja-JP')} (税込)</div>
          </div>
        </div>
        <div className="absolute top-3 right-3 flex gap-1.5">
          <button onClick={() => main.current?.go('<')} className="grid h-8 w-8 place-items-center rounded-full bg-white/85 text-black backdrop-blur hover:bg-white" aria-label="前へ">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => main.current?.go('>')} className="grid h-8 w-8 place-items-center rounded-full bg-white/85 text-black backdrop-blur hover:bg-white" aria-label="次へ">
            <ChevronRight size={16} />
          </button>
        </div>
        <span className="absolute top-3 left-3 rounded-full bg-black/50 px-2.5 py-1 text-[11px] tabular-nums backdrop-blur">
          {active + 1} / {SLIDES.length}
        </span>
      </div>
      <div ref={thumbRef} className="splide sps-thumbs shrink-0" aria-label="サムネイル">
        <div className="splide__track">
          <ul className="splide__list">
            {SLIDES.map((sl) => (
              <li key={sl.name} className="splide__slide">
                <img src={sl.img} alt="" className="h-full w-full object-cover" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
