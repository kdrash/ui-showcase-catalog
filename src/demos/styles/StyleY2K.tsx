import { useState } from 'react'
import { motion } from 'motion/react'

/**
 * Y2K (2000 年前後の未来感)
 * 虹色に流れるパステルのイリデッセント背景 + きらめく ✦、
 * クローム (銀) のグラデ枠、クローム文字 (background-clip:text + text-stroke)、
 * Aqua 風ジェルボタン (上半分に白い光沢 ::before) とクロームボール。
 */
const css = `
.y2k-stage { background: linear-gradient(120deg,#ffd6ff,#c8b6ff,#b8e0ff,#bbf7d0,#fff1b8,#ffd6ff); background-size: 300% 300%; animation: y2k-shift 12s ease infinite; }
@keyframes y2k-shift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
.y2k-chrome-frame { padding:3px; border-radius:26px;
  background: linear-gradient(135deg,#ffffff 0%,#9a9a9a 18%,#f7f7f7 32%,#5f5f5f 50%,#efefef 66%,#8d8d8d 82%,#ffffff 100%);
  box-shadow: 0 14px 34px rgba(110,70,200,.35); }
.y2k-inner { border-radius:23px; overflow:hidden; background: linear-gradient(180deg, rgba(255,255,255,.93), rgba(238,232,255,.9)); }
.y2k-chrome-text { background: linear-gradient(180deg,#ffffff 0%,#d8d8e8 30%,#6b6b85 50%,#2c2c44 52%,#b9b9d6 75%,#ffffff 100%);
  -webkit-background-clip:text; background-clip:text; color:transparent; -webkit-text-stroke:.6px #3d3a66;
  filter: drop-shadow(0 2px 0 rgba(124,108,255,.55)); }
.y2k-gel { position:relative; overflow:hidden; border-radius:999px; color:#fff; font-weight:700; text-shadow:0 1px 1px rgba(0,40,120,.5);
  border:1px solid #0b5bd3; background: linear-gradient(180deg,#a8e1ff 0%,#3aa0ff 50%,#1477ff 51%,#6cc4ff 100%);
  box-shadow: 0 4px 10px rgba(20,119,255,.45), inset 0 -2px 6px rgba(255,255,255,.45); transition: filter .15s, transform .1s; }
.y2k-gel::before { content:''; position:absolute; left:8%; right:8%; top:2px; height:45%; border-radius:999px; pointer-events:none;
  background: linear-gradient(180deg, rgba(255,255,255,.95), rgba(255,255,255,.15)); }
.y2k-gel:hover { filter: brightness(1.08) saturate(1.1); }
.y2k-gel:active { transform: translateY(1px); filter: brightness(.95); }
.y2k-pink { border-color:#d63fa0; text-shadow:0 1px 1px rgba(120,0,80,.45);
  background: linear-gradient(180deg,#ffd0f0 0%,#ff6fcf 50%,#f03cb4 51%,#ff9be0 100%);
  box-shadow: 0 4px 10px rgba(240,60,180,.4), inset 0 -2px 6px rgba(255,255,255,.45); }
.y2k-lime { border-color:#4fa30f; text-shadow:0 1px 1px rgba(30,80,0,.45);
  background: linear-gradient(180deg,#e6ffc2 0%,#8ee03a 50%,#6cc81e 51%,#b2f070 100%);
  box-shadow: 0 4px 10px rgba(110,200,30,.4), inset 0 -2px 6px rgba(255,255,255,.45); }
.y2k-ball { background: radial-gradient(circle at 35% 30%, #ffffff 0%, #e2e2ee 30%, #9a9ab4 75%, #6c6c88 100%);
  box-shadow: 0 2px 4px rgba(60,40,120,.45); }
.y2k-orb { position:relative; background: radial-gradient(circle at 30% 25%, #ffffff 0%, #ffd1f7 15%, #c77dff 55%, #6a3df0 100%);
  box-shadow: 0 6px 16px rgba(106,61,240,.45), inset 0 -4px 8px rgba(40,0,120,.35); }
.y2k-orb::after { content:''; position:absolute; left:18%; top:8%; width:50%; height:32%; border-radius:50%;
  background: linear-gradient(180deg, rgba(255,255,255,.9), rgba(255,255,255,0)); }
.y2k-well { background:#fff; border:1px solid #8b7bd8; box-shadow: inset 0 2px 4px rgba(80,60,160,.3); }
.y2k-input::placeholder { color:#a99be6; }
.y2k-input:focus { border-color:#ff6fcf; box-shadow: inset 0 2px 4px rgba(80,60,160,.3), 0 0 0 3px rgba(255,111,207,.3); }
.y2k-sparkle { animation: y2k-twinkle 2.4s ease-in-out infinite; color:#fff; text-shadow: 0 0 6px #fff, 0 0 12px #c8b6ff; }
@keyframes y2k-twinkle { 0%,100%{opacity:.25; transform:scale(.6) rotate(0deg)} 50%{opacity:1; transform:scale(1) rotate(45deg)} }
`

const SPARKLES = [
  ['8%', '12%', '22px', '0s'],
  ['86%', '10%', '16px', '.6s'],
  ['12%', '78%', '14px', '1.2s'],
  ['90%', '70%', '24px', '.3s'],
  ['50%', '4%', '12px', '1.6s'],
  ['74%', '92%', '14px', '.9s'],
] as const

export function StyleY2K() {
  const [notify, setNotify] = useState(true)
  const [volume, setVolume] = useState(80)
  const [following, setFollowing] = useState(false)

  return (
    <div className="y2k-stage relative grid h-full w-full place-items-center overflow-hidden font-sans text-[#3d3a66]">
      <style>{css}</style>
      {SPARKLES.map(([left, top, size, delay]) => (
        <span key={left + top} className="y2k-sparkle absolute" style={{ left, top, fontSize: size, animationDelay: delay }}>
          ✦
        </span>
      ))}

      <div className="y2k-chrome-frame relative w-[300px]">
        <div className="y2k-inner">
          {/* title bar */}
          <div
            className="flex items-center justify-between px-3 py-1"
            style={{ background: 'linear-gradient(180deg,#efeaff,#cfc4ff)', borderBottom: '1px solid #a79bff' }}
          >
            <span className="text-[17px] leading-none text-[#5b4bb7]" style={{ fontFamily: 'VT323, monospace' }}>
              ✦ my_profile.exe
            </span>
            <div className="flex gap-1.5">
              <span className="y2k-gel y2k-pink h-3 w-3" />
              <span className="y2k-gel y2k-lime h-3 w-3" />
              <span className="y2k-gel h-3 w-3" />
            </div>
          </div>

          <div className="px-4 pb-4 pt-3">
            {/* header */}
            <div className="flex items-center gap-3">
              <motion.div
                className="y2k-orb grid h-[52px] w-[52px] place-items-center rounded-full text-2xl"
                animate={{ rotate: [0, 8, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                💿
              </motion.div>
              <div>
                <p className="y2k-chrome-text inline-block -skew-x-6 text-[22px] font-black tracking-wide" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  MIKA SATO
                </p>
                <p className="text-[15px] leading-none text-[#7b6bd0]" style={{ fontFamily: 'VT323, monospace' }}>
                  ~*product designer*~
                </p>
              </div>
            </div>

            {/* gel stat pills */}
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                ['128 posts', 'y2k-pink'],
                ['2.4k fans', ''],
                ['312 pals', 'y2k-lime'],
              ].map(([label, cls]) => (
                <span key={label} className={`y2k-gel ${cls} py-1 text-[11px]`}>
                  <span className="relative">{label}</span>
                </span>
              ))}
            </div>

            {/* aqua toggle */}
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[13px] font-bold">Notifications ✧</span>
              <button
                role="switch"
                aria-checked={notify}
                aria-label="Notifications"
                onClick={() => setNotify((v) => !v)}
                className={`relative h-[26px] w-[50px] rounded-full ${notify ? 'y2k-gel' : 'y2k-well'}`}
              >
                <motion.span
                  className="y2k-ball absolute left-[2px] top-[1px] h-[22px] w-[22px] rounded-full"
                  animate={{ x: notify ? 23 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                />
              </button>
            </div>

            {/* aqua slider */}
            <div className="mt-3">
              <div className="mb-1.5 flex justify-between text-[13px] font-bold">
                <span>Volume</span>
                <span style={{ fontFamily: 'VT323, monospace', fontSize: 17 }}>{volume}%</span>
              </div>
              <div className="relative h-[22px]">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  aria-label="Volume"
                  className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                />
                <div className="y2k-well absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 overflow-hidden rounded-full">
                  <div className="y2k-gel y2k-pink h-full rounded-full" style={{ width: `${volume}%`, border: 'none' }} />
                </div>
                <div className="y2k-ball absolute top-0 h-[22px] w-[22px] rounded-full" style={{ left: `calc(${volume}% - ${volume * 0.22}px)` }} />
              </div>
            </div>

            {/* input */}
            <input
              placeholder="✧ set ur status ✧"
              className="y2k-well y2k-input mt-3 h-9 w-full rounded-full px-4 text-[18px] text-[#5b4bb7] outline-none"
              style={{ fontFamily: 'VT323, monospace' }}
            />

            {/* gel buttons */}
            <div className="mt-3.5 grid grid-cols-2 gap-3">
              <button onClick={() => setFollowing((f) => !f)} className="y2k-gel h-9 text-[13px]">
                <span className="relative">{following ? '★ Following' : 'Follow'}</span>
              </button>
              <button className="y2k-gel y2k-pink h-9 text-[13px]">
                <span className="relative">Message</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
