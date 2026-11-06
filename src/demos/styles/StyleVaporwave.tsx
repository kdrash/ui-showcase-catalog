import { useState } from 'react'

/**
 * Vaporwave
 * ピンク→紫の夕焼け、横縞で切れた太陽、遠近法でスクロールするネオングリッドの地面、
 * 90年代 PC 風のウィンドウ(ピンク→シアンのタイトルバー + ベベル)、VT323 フォント、
 * 全角カタカナ・ワイド文字(ｖａｐｏｒ)、ヤシの木のシルエット。
 */
const KEYFRAMES = `
@keyframes vw-grid { from { background-position: 0 0, 0 0; } to { background-position: 0 40px, 0 0; } }
@keyframes vw-blink { 50% { opacity: 0; } }
`

function Palm({ className, flip }: { className: string; flip?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 100 160" style={{ transform: flip ? 'scaleX(-1)' : undefined }} aria-hidden>
      <path d="M52 160 C 50 120 48 80 56 40" stroke="#1a0b2e" strokeWidth="6" fill="none" />
      {[
        'M56 40 C 30 20 10 30 0 50 C 20 36 38 36 56 42',
        'M56 40 C 70 14 92 14 100 30 C 84 24 70 28 57 42',
        'M56 40 C 40 10 50 0 64 0 C 58 12 58 26 57 40',
        'M56 40 C 76 34 96 46 98 64 C 84 50 70 46 56 43',
        'M56 40 C 34 40 18 56 16 74 C 30 56 42 48 56 43',
      ].map((d) => (
        <path key={d} d={d} fill="#1a0b2e" />
      ))}
    </svg>
  )
}

export function StyleVaporwave() {
  const [notify, setNotify] = useState(true)
  const [volume, setVolume] = useState(80)
  const [following, setFollowing] = useState(false)

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ fontFamily: '"VT323", monospace', background: 'linear-gradient(180deg,#2b0a4d 0%,#7b1fa2 35%,#ff6ec7 62%,#ffb3e6 64%)' }}>
      <style>{KEYFRAMES}</style>
      {/* stars */}
      <div
        className="absolute inset-0 opacity-70"
        style={{ backgroundImage: 'radial-gradient(1px 1px at 20% 15%,#fff,transparent),radial-gradient(1px 1px at 70% 8%,#fff,transparent),radial-gradient(1.5px 1.5px at 85% 25%,#fff,transparent),radial-gradient(1px 1px at 40% 30%,#fff,transparent)' }}
      />
      {/* striped sun: SVG の clipPath で「上半分 + 下半分は横縞(下へ行くほど隙間が太く)」に切り抜く */}
      <svg className="absolute left-[28%] top-[64%] h-56 w-56 -translate-x-1/2 -translate-y-[78%]" viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 0 18px rgba(255,46,151,.85))' }} aria-hidden>
        <defs>
          <linearGradient id="vw-sun" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff200" />
            <stop offset=".5" stopColor="#ff9a3c" />
            <stop offset="1" stopColor="#ff2e97" />
          </linearGradient>
          <clipPath id="vw-sun-clip">
            <rect x="0" y="0" width="100" height="52" />
            {[56, 63, 70, 77, 84, 91].map((y, i) => (
              <rect key={y} x="0" y={y} width="100" height={5 - i * 0.6} />
            ))}
          </clipPath>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#vw-sun)" clipPath="url(#vw-sun-clip)" />
      </svg>
      {/* grid floor */}
      <div className="absolute inset-x-0 bottom-0 h-[36%] overflow-hidden" style={{ perspective: '220px', background: 'linear-gradient(#1a0033,#05000d)' }}>
        <div
          className="absolute inset-x-[-50%] top-0 h-[200%] origin-top"
          style={{
            transform: 'rotateX(62deg)',
            backgroundImage: 'linear-gradient(#00f0ff 2px, transparent 2px), linear-gradient(90deg, #ff2ec4 2px, transparent 2px)',
            backgroundSize: '40px 40px, 40px 40px',
            animation: 'vw-grid 1.2s linear infinite',
            boxShadow: '0 0 40px #ff2ec4 inset',
          }}
        />
      </div>
      <Palm className="absolute bottom-[20%] left-2 h-40 w-24" />
      <Palm className="absolute bottom-[18%] right-0 h-32 w-20" flip />

      <p className="absolute left-4 top-3 text-[28px] leading-none tracking-[0.35em] text-[#00f0ff]" style={{ textShadow: '3px 3px 0 #ff2ec4' }}>
        ｖａｐｏｒ
      </p>
      <p className="absolute right-4 top-3 text-right text-[22px] leading-tight text-white/90" style={{ textShadow: '2px 2px 0 #7b1fa2' }}>
        ヴェイパー
        <br />
        ウェイヴ
      </p>

      {/* 90s window */}
      <div className="absolute left-[64%] top-[54%] w-[290px] -translate-x-1/2 -translate-y-1/2 border-2 border-white max-[520px]:left-1/2 bg-[#c0c0c0] shadow-[inset_-2px_-2px_0_#404040,inset_2px_2px_0_#fff,6px_6px_0_rgba(43,10,77,.6)]">
        <div className="flex h-7 items-center justify-between px-2 text-[18px] text-white" style={{ background: 'linear-gradient(90deg,#ff2ec4,#7b5cff 55%,#00f0ff)' }}>
          <span>MIKA_SATO.EXE</span>
          <span className="flex gap-1">
            {['_', '□', '×'].map((c) => (
              <span key={c} className="grid h-5 w-5 place-items-center bg-[#c0c0c0] text-[14px] leading-none text-black shadow-[inset_-1px_-1px_0_#404040,inset_1px_1px_0_#fff]">
                {c}
              </span>
            ))}
          </span>
        </div>
        <div className="p-3 text-[18px] leading-tight text-[#2b0a4d]">
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center text-[26px] text-white" style={{ background: 'linear-gradient(135deg,#00f0ff,#ff2ec4)', boxShadow: 'inset -2px -2px 0 #404040, inset 2px 2px 0 #fff' }}>
              MS
            </div>
            <div>
              <p className="text-[26px] leading-none">Mika Sato</p>
              <p className="text-[16px] text-[#7b1fa2]">ａｅｓｔｈｅｔｉｃ designer</p>
            </div>
          </div>
          <div className="mt-2 flex justify-between border-y border-dashed border-[#7b1fa2] py-1 text-[17px]">
            <span>128 POSTS</span>
            <span>2.4K FANS</span>
            <span>312 ♥</span>
          </div>
          <label className="mt-2 flex cursor-pointer items-center gap-2 text-[18px]">
            <span
              className="grid h-4 w-4 place-items-center bg-white text-[14px] leading-none shadow-[inset_1px_1px_0_#404040,inset_-1px_-1px_0_#fff]"
              onClick={() => setNotify((v) => !v)}
            >
              {notify ? '✓' : ''}
            </span>
            <span onClick={() => setNotify((v) => !v)}>Notifications {notify ? 'ON' : 'OFF'}</span>
          </label>
          <div className="mt-1 flex items-center gap-2">
            <span>VOL</span>
            <input type="range" value={volume} onChange={(e) => setVolume(+e.target.value)} aria-label="Volume" className="h-3 flex-1 accent-[#ff2ec4]" />
            <span className="w-8 text-right">{volume}</span>
          </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => setFollowing((f) => !f)}
              className="h-8 flex-1 bg-[#c0c0c0] text-[18px] shadow-[inset_-2px_-2px_0_#404040,inset_2px_2px_0_#fff] active:shadow-[inset_2px_2px_0_#404040,inset_-2px_-2px_0_#fff]"
            >
              {following ? '★ FOLLOWING' : 'FOLLOW'}
            </button>
            <button className="h-8 flex-1 bg-[#c0c0c0] text-[18px] shadow-[inset_-2px_-2px_0_#404040,inset_2px_2px_0_#fff] active:shadow-[inset_2px_2px_0_#404040,inset_-2px_-2px_0_#fff]">
              MESSAGE<span style={{ animation: 'vw-blink 1s steps(1) infinite' }}>_</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
