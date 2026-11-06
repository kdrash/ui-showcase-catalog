import { useState, type CSSProperties } from 'react'
import { motion } from 'motion/react'

/**
 * Editorial (雑誌風)
 * 生成り紙 #faf7f0 + 墨 #1a1a1a + 差し色オックスブラッド #9b2c2c。
 * 見出し・数字は Playfair Display、本文は Georgia、ラベルは極小の大文字サンセリフ (字間 0.25em)。
 * 二重罫線のマストヘッド、ドロップキャップ、ヘアライン、下線が伸びるテキストリンク。
 */
const display: CSSProperties = { fontFamily: "'Playfair Display', Georgia, serif" }
const grain =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 0.3 0 0 0 0 0.25 0 0 0 0 0.15 0 0 0 0.35 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E\")"

export function StyleEditorial() {
  const [letter, setLetter] = useState(true)
  const [size, setSize] = useState(50)
  const [following, setFollowing] = useState(false)
  const sampleSize = 12 + (size / 100) * 10

  return (
    <div
      className="relative grid h-full w-full place-items-center overflow-hidden text-[#1a1a1a]"
      style={{ backgroundColor: '#ece6d9', backgroundImage: grain, fontFamily: 'Georgia, "Times New Roman", serif' }}
    >
      <article className="relative w-[300px] bg-[#faf7f0] px-6 py-5 shadow-[0_1px_0_rgba(0,0,0,0.05),0_14px_32px_-14px_rgba(60,40,10,0.4)]">
        {/* masthead */}
        <div className="flex items-baseline justify-between font-sans text-[9px] font-semibold uppercase tracking-[0.25em]">
          <span>The Profile</span>
          <span>Nº 12 · Autumn</span>
        </div>
        <div className="mt-1.5 border-t-[3px] border-double border-[#1a1a1a]" />

        {/* header */}
        <div className="mt-3 flex items-center gap-3">
          <div className="rounded-full p-[2px] ring-1 ring-[#1a1a1a]">
            <div
              className="grid h-12 w-12 place-items-center rounded-full text-lg italic text-white/90"
              style={{ ...display, background: 'radial-gradient(circle at 40% 35%, #d9d4cc, #8c857a 60%, #4a4640)' }}
            >
              MS
            </div>
          </div>
          <div>
            <p className="font-sans text-[8.5px] font-semibold uppercase tracking-[0.25em] text-[#9b2c2c]">Portrait</p>
            <p className="text-[26px] font-semibold leading-none" style={display}>
              Mika Sato
            </p>
            <p className="mt-0.5 text-xs italic text-[#555]">Product designer, Tokyo</p>
          </div>
        </div>

        {/* bio with drop cap */}
        <p className="mt-2.5 text-[11.5px] leading-[1.55] text-[#3a3a3a]">
          <span className="float-left mr-1.5 mt-[2px] text-[34px] leading-[0.8] text-[#9b2c2c]" style={display}>
            D
          </span>
          esigns quiet interfaces for loud products, and writes about type, tools and the space between.
        </p>

        {/* stats */}
        <div className="mt-2.5 grid grid-cols-3 divide-x divide-[#1a1a1a]/30 border-y border-[#1a1a1a] py-1.5 text-center">
          {[
            ['128', 'Essays'],
            ['2.4k', 'Readers'],
            ['312', 'Following'],
          ].map(([value, label]) => (
            <div key={label}>
              <p className="text-[19px] leading-tight" style={display}>
                {value}
              </p>
              <p className="font-sans text-[8px] font-semibold uppercase tracking-[0.2em] text-[#666]">{label}</p>
            </div>
          ))}
        </div>

        {/* toggle */}
        <div className="mt-2.5 flex items-center justify-between">
          <span className="text-[13px] italic">Weekly letter</span>
          <button
            role="switch"
            aria-checked={letter}
            aria-label="Weekly letter"
            onClick={() => setLetter((v) => !v)}
            className="relative h-[18px] w-[34px] rounded-full border border-[#1a1a1a] transition-colors duration-300"
            style={{ background: letter ? '#1a1a1a' : 'transparent' }}
          >
            <motion.span
              className="absolute left-[2px] top-[2px] h-3 w-3 rounded-full"
              animate={{ x: letter ? 16 : 0, backgroundColor: letter ? '#faf7f0' : '#1a1a1a' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            />
          </button>
        </div>

        {/* slider (reading size) */}
        <div className="mt-2.5 flex items-center gap-3">
          <span className="text-[13px] italic">Reading size</span>
          <div className="relative h-4 flex-1">
            <input
              type="range"
              min={0}
              max={100}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              aria-label="Reading size"
              className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
            />
            <div className="absolute inset-x-0 top-1/2 h-px bg-[#1a1a1a]/40" />
            <div className="absolute left-0 top-1/2 h-[2px] -translate-y-1/2 bg-[#1a1a1a]" style={{ width: `${size}%` }} />
            <div
              className="absolute top-[4px] h-2 w-2 rotate-45 bg-[#9b2c2c]"
              style={{ left: `calc(${size}% - ${size * 0.08}px)` }}
            />
          </div>
          <span className="w-7 text-right leading-none" style={{ ...display, fontSize: sampleSize }}>
            Aa
          </span>
        </div>

        {/* input */}
        <input
          placeholder="Leave a note for the editor…"
          className="mt-2.5 h-7 w-full border-b border-[#1a1a1a] bg-transparent text-[13px] italic text-[#1a1a1a] outline-none placeholder:text-[#9a9388] focus:border-[#9b2c2c]"
        />

        {/* buttons */}
        <div className="mt-3.5 flex items-center justify-between">
          <button
            onClick={() => setFollowing((f) => !f)}
            className="h-9 bg-[#1a1a1a] px-5 font-sans text-[10px] font-semibold uppercase tracking-[0.24em] text-[#faf7f0] transition-colors hover:bg-[#9b2c2c]"
          >
            {following ? 'Subscribed' : 'Subscribe'}
          </button>
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="bg-[linear-gradient(#9b2c2c,#9b2c2c)] bg-[length:0%_1px] bg-[position:0_100%] bg-no-repeat pb-0.5 text-[13px] italic transition-[background-size] duration-300 hover:bg-[length:100%_1px]"
          >
            Read the profile →
          </a>
        </div>
      </article>
    </div>
  )
}
