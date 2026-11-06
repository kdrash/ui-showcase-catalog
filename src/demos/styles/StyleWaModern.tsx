import { useState } from 'react'
import { motion } from 'motion/react'

/**
 * 和モダン
 * 生成り(#f3eee3)の和紙(SVG feTurbulence の繊維ノイズ)・墨(#2b2b2b)・朱(#c8401f)の3色。
 * 明朝体(游明朝 / ヒラギノ明朝)の縦書きの名前、朱の落款(判子)、青海波の地紋、細い罫線と広い余白。
 * スイッチは「入 / 切」、スライダーは墨の細線に朱の菱形。
 */
const MINCHO = '"Yu Mincho", "YuMincho", "Hiragino Mincho ProN", "Noto Serif JP", "Playfair Display", serif'
const SUMI = '#2b2b2b'
const SHU = '#c8401f'
const KINARI = '#f3eee3'

const washi = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='w'><feTurbulence type='fractalNoise' baseFrequency='0.012 0.09' numOctaves='4' seed='3'/><feColorMatrix values='0 0 0 0 0.42  0 0 0 0 0.36  0 0 0 0 0.26  0 0 0 0.16 0'/></filter><rect width='100%' height='100%' filter='url(#w)'/></svg>`,
)}")`

const seigaiha = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='20' viewBox='0 0 40 20'><g fill='none' stroke='#c8401f' stroke-opacity='0.2' stroke-width='1'>${[18, 13, 8, 3]
    .map((r) => `<circle cx='20' cy='20' r='${r}'/><circle cx='0' cy='10' r='${r}'/><circle cx='40' cy='10' r='${r}'/>`)
    .join('')}</g></svg>`,
)}")`

export function StyleWaModern() {
  const [notify, setNotify] = useState(true)
  const [volume, setVolume] = useState(40)
  const [following, setFollowing] = useState(false)

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: KINARI, backgroundImage: washi, fontFamily: MINCHO, color: SUMI }}>
      {/* 地紋(青海波)を右側だけに */}
      <div className="absolute inset-y-0 right-0 w-[30%]" style={{ backgroundImage: seigaiha, maskImage: 'linear-gradient(90deg, transparent, #000 60%)' }} />
      {/* 墨のにじみ円(円相) */}
      <svg className="absolute -left-10 top-6 h-48 w-48 opacity-[0.12]" viewBox="0 0 100 100" aria-hidden>
        <path d="M78 22 A 38 38 0 1 0 84 60" stroke={SUMI} strokeWidth="9" fill="none" strokeLinecap="round" />
      </svg>

      <div className="absolute left-1/2 top-1/2 flex h-[330px] w-[300px] -translate-x-1/2 -translate-y-1/2 gap-5 border-y border-[#2b2b2b]/60 py-5">
        {/* 縦書きの名前 + 落款 */}
        <div className="flex flex-col items-center justify-between border-r border-[#2b2b2b]/25 pr-5">
          <p className="text-[30px] font-semibold tracking-[0.35em]" style={{ writingMode: 'vertical-rl' }}>
            佐藤 美香
          </p>
          <div
            className="grid h-11 w-11 rotate-[-4deg] place-items-center rounded-[3px] text-[13px] font-bold leading-[1.05] text-[#f3eee3]"
            style={{ background: SHU, boxShadow: 'inset 0 0 0 2px #f3eee3, inset 0 0 0 3px #c8401f', writingMode: 'vertical-rl' }}
          >
            美香
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <p className="text-[11px] tracking-[0.4em] text-[#2b2b2b]/60">意匠設計 ・ 東京</p>
          <p className="mt-1 text-[17px] leading-relaxed">
            静けさの中に、
            <br />
            <span style={{ color: SHU }}>用の美</span>をかたちに。
          </p>

          <div className="mt-3 grid grid-cols-3 border-y border-[#2b2b2b]/30 text-center">
            {[
              ['百二十八', '投稿'],
              ['二千四百', '支持'],
              ['三百十二', '注目'],
            ].map(([v, l], i) => (
              <div key={l} className={`py-1.5 ${i < 2 ? 'border-r border-[#2b2b2b]/20' : ''}`}>
                <p className="text-[12px] tracking-wider">{v}</p>
                <p className="text-[10px] tracking-[0.3em] text-[#2b2b2b]/55">{l}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between text-[13px] tracking-[0.2em]">
            <span>通知</span>
            <button
              role="switch"
              aria-checked={notify}
              aria-label="通知"
              onClick={() => setNotify((v) => !v)}
              className="relative flex h-7 w-16 border border-[#2b2b2b] text-[12px]"
            >
              <motion.span className="absolute inset-y-0 w-1/2" style={{ background: SUMI }} animate={{ left: notify ? '0%' : '50%' }} transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
              <span className={`relative z-10 flex-1 leading-[26px] transition-colors ${notify ? 'text-[#f3eee3]' : ''}`}>入</span>
              <span className={`relative z-10 flex-1 leading-[26px] transition-colors ${notify ? '' : 'text-[#f3eee3]'}`}>切</span>
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2 text-[13px] tracking-[0.2em]">
            <span>音量</span>
            <div className="relative h-5 flex-1">
              <input type="range" value={volume} onChange={(e) => setVolume(+e.target.value)} aria-label="音量" className="absolute inset-0 z-10 w-full cursor-pointer opacity-0" />
              <div className="absolute inset-x-0 top-1/2 h-px bg-[#2b2b2b]" />
              <div className="absolute left-0 top-1/2 h-[3px] -translate-y-px" style={{ width: `${volume}%`, background: SUMI }} />
              <div className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45" style={{ left: `calc(${volume}% - ${volume * 0.1}px)`, background: SHU }} />
            </div>
          </div>

          <div className="mt-auto grid grid-cols-2 gap-2">
            <button
              onClick={() => setFollowing((f) => !f)}
              className="h-9 text-[13px] tracking-[0.3em] text-[#f3eee3] transition-opacity hover:opacity-85"
              style={{ background: SHU }}
            >
              {following ? '登録済' : '登録'}
            </button>
            <button className="h-9 border border-[#2b2b2b] text-[13px] tracking-[0.3em] transition-colors hover:bg-[#2b2b2b] hover:text-[#f3eee3]">便り</button>
          </div>
        </div>
      </div>
    </div>
  )
}
