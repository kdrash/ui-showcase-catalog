import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const editions = ['magazine', 'advertisement', 'guide'] as const

export function JapaneseComposition() {
  const { t } = useTranslation('demoControls', { keyPrefix: 'composition' })
  const [edition, setEdition] = useState(0)

  return (
    <div className="@container flex h-full w-full flex-col overflow-hidden bg-[#222322]">
      <div role="group" aria-label={t('group')} className="flex shrink-0 flex-wrap gap-1 border-b border-white/10 p-2">
        {editions.map((label, index) => (
          <button key={label} type="button" aria-pressed={edition === index} onClick={() => setEdition(index)}
            className="rounded-full px-3 py-1.5 text-[11px] text-stone-300 hover:bg-white/10 aria-pressed:bg-[#eee9d8] aria-pressed:text-stone-900">{t(label)}</button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3 @md:p-6">
        {edition === 0 && (
          <article lang="ja" className="mx-auto grid min-h-full max-w-5xl grid-cols-2 overflow-hidden rounded-[2px] bg-[#ece3d2] text-[#2a2722] shadow-lg">
            <section className="relative flex min-h-80 flex-col justify-between overflow-hidden border-r border-[#766651]/40 bg-[linear-gradient(90deg,transparent_90%,#80705830)] p-[11%]">
              <p className="border-b border-[#766651]/55 pb-2 font-mono text-[9px] tracking-[.18em]">01 / ESSAY</p>
              <div className="flex flex-1 flex-row-reverse items-start justify-center gap-4 py-5 font-serif [writing-mode:horizontal-tb]">
                <p className="text-[clamp(.68rem,1.8cqw,.95rem)] leading-loose tracking-[.12em] [writing-mode:vertical-rl]">午後の窓から、春の風が入る。誰もいない部屋で、一枚の紙がゆっくりとめくれた。</p>
                <p className="text-[clamp(.68rem,1.8cqw,.95rem)] leading-loose tracking-[.12em] [writing-mode:vertical-rl]">短い季節のことを、何度でも思い出すために。</p>
              </div>
              <p className="font-serif text-[10px]">春号　第三十二巻</p>
            </section>
            <section className="flex min-h-80 items-center justify-center gap-4 border-l border-white/40 bg-[linear-gradient(90deg,#6a584f20,transparent_12%)] px-[10%] py-5 font-serif">
              <p className="text-[10px] tracking-[.25em] text-[#a64432] [writing-mode:vertical-rl]">短い季節について</p>
              <h2 className="text-[clamp(2rem,6cqw,3.9rem)] leading-none tracking-[.1em] [writing-mode:vertical-rl]">
                <ruby>春<rt className="text-[.26em]">はる</rt></ruby>の余白
              </h2>
            </section>
          </article>
        )}
        {edition === 1 && (
          <article lang="ja" className="relative mx-auto flex min-h-full max-w-5xl flex-col items-center justify-center overflow-hidden border-4 border-double border-[#f9e8bd] bg-[#ae2b23] p-6 text-center text-[#fff0c8]">
            <div aria-hidden="true" className="absolute inset-0 opacity-15 [background:repeating-conic-gradient(from_20deg_at_50%_58%,#ffe3a5_0deg_8deg,transparent_8deg_22deg)]" />
            <div className="relative flex flex-col items-center">
              <p className="border-y border-[#f9e8bd]/65 px-4 py-2 text-[10px] font-bold tracking-[.3em]">東雲百貨店 / 春の特別催事</p>
              <h2 className="mt-4 font-serif text-[clamp(2.7rem,11cqw,7rem)] leading-none font-black tracking-[-.07em]">春の市</h2>
              <p className="mt-4 font-serif text-xl font-bold tracking-[.1em]">四月八日 — 十四日</p>
              <p className="mt-2 text-xs tracking-[.25em]">本館七階　催事場</p>
              <span className="mt-4 rounded-full border border-[#f9e8bd]/70 px-3 py-1 text-[10px]">菓子・器・花</span>
            </div>
          </article>
        )}
        {edition === 2 && (
          <article lang="ja" className="mx-auto grid min-h-full max-w-5xl overflow-hidden bg-[#ecf0dc] text-[#1d3c31] @lg:grid-cols-[1.08fr_1fr]">
            <section className="relative flex min-h-52 flex-col justify-between overflow-hidden bg-[#1d4940] p-[9%] text-[#eff3d2]">
              <svg aria-hidden="true" className="absolute right-0 bottom-0 h-3/4 w-full opacity-45" viewBox="0 0 360 180" preserveAspectRatio="none">
                <circle cx="258" cy="55" r="32" fill="#dfd795" />
                <path d="M0 161 96 52l72 61 61-34 131 86v15H0Z" fill="#8eb29b" />
                <path d="M0 168 105 109l52 32 57-23 146 52v10H0Z" fill="#e2ecd0" />
              </svg>
              <p className="relative font-mono text-[10px] tracking-[.2em]">TRAVEL NOTES / 04</p>
              <h2 className="relative font-serif text-[clamp(2.1rem,7cqw,5rem)] leading-[.95] font-bold">水辺を<br />歩く。</h2>
            </section>
            <section className="grid content-center gap-4 p-[9%]">
              <p className="text-[10px] font-bold tracking-[.25em] text-[#477264]">小さな旅の案内</p>
              <h3 className="font-serif text-2xl font-bold"><ruby>朝凪<rt>あさなぎ</rt></ruby>の町へ</h3>
              <div className="grid grid-cols-2 gap-3 border-y border-[#1d3c31]/35 py-3 text-xs leading-loose">
                <p><b>01　港の朝市</b><br />駅から徒歩七分。八時ごろから店が並ぶ。</p>
                <p><b>02　岬の遊歩道</b><br />潮風を感じながら歩く、片道三十分の道。</p>
              </div>
              <p className="font-mono text-[10px] tracking-widest">WALKING MAP · 2.4 KM</p>
            </section>
          </article>
        )}
      </div>
    </div>
  )
}
