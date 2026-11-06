import { useState } from 'react'
import { motion } from 'motion/react'

/**
 * Skeuomorphism
 * 実物の素材を CSS グラデーションで模倣する:
 *   ・革の背景 (SVG feTurbulence ノイズ + ステッチ)
 *   ・ヘアライン加工のアルミパネル (repeating-linear-gradient) + ネジ
 *   ・液晶 (LCD) 表示、LED、金属レバーのトグル、オーディオフェーダー
 *   ・iOS6 時代のジェルボタン (上半分ハイライト + 下半分で色が切り替わるグラデ)
 */
const noise =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

const css = `
.sk-leather { background-color:#4a3426;
  background-image: radial-gradient(ellipse at center, rgba(255,255,255,.07) 0%, rgba(0,0,0,.5) 100%), ${noise}; }
.sk-metal {
  background:
    repeating-linear-gradient(0deg, rgba(255,255,255,0) 0 1px, rgba(255,255,255,.35) 1px 2px, rgba(0,0,0,.035) 2px 3px),
    repeating-linear-gradient(0deg, rgba(0,0,0,0) 0 5px, rgba(0,0,0,.04) 5px 7px),
    linear-gradient(180deg,#f2f2f2 0%,#d9d9d9 48%,#c9c9c9 52%,#e6e6e6 100%);
  border:1px solid #7f7f7f;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.95), inset 0 -1px 0 rgba(0,0,0,.2), 0 14px 28px rgba(0,0,0,.6), 0 3px 6px rgba(0,0,0,.45);
}
.sk-screw { position:absolute; width:10px; height:10px; border-radius:50%;
  background: radial-gradient(circle at 35% 30%, #ffffff 0%, #bdbdbd 45%, #6f6f6f 100%);
  box-shadow: inset 0 0 1px rgba(0,0,0,.6), 0 1px 0 rgba(255,255,255,.8); }
.sk-screw::after { content:''; position:absolute; left:1.5px; right:1.5px; top:50%; height:1.5px; margin-top:-.75px;
  background:#555; box-shadow:0 1px 0 rgba(255,255,255,.6); }
.sk-engraved { color:#4d4d4d; text-shadow: 0 1px 0 rgba(255,255,255,.85), 0 -1px 0 rgba(0,0,0,.12); }
.sk-bezel { padding:4px; border-radius:50%;
  background: conic-gradient(from 45deg,#f5f5f5,#8d8d8d,#f0f0f0,#7a7a7a,#f5f5f5);
  box-shadow: 0 2px 4px rgba(0,0,0,.5), inset 0 0 0 1px rgba(0,0,0,.25); }
.sk-lens { position:relative; border-radius:50%; overflow:hidden;
  background: radial-gradient(circle at 50% 45%, #41608f 0%, #14233f 65%, #050b17 100%);
  box-shadow: inset 0 2px 6px rgba(0,0,0,.8); }
.sk-lens::after { content:''; position:absolute; left:18%; top:6%; width:64%; height:42%; border-radius:50%;
  background: linear-gradient(180deg, rgba(255,255,255,.55), rgba(255,255,255,0)); }
.sk-lcd { background: linear-gradient(180deg,#a9b897 0%,#c4d1b0 50%,#a3b28f 100%); border:1px solid #4f5b43; border-radius:6px;
  box-shadow: inset 0 2px 6px rgba(0,0,0,.45), 0 1px 0 rgba(255,255,255,.8); color:#1f2a18;
  font-family: VT323, 'JetBrains Mono', monospace; text-shadow: 1px 1px 0 rgba(0,0,0,.12); }
.sk-slot { background: linear-gradient(180deg,#1b1b1b,#3d3d3d); box-shadow: inset 0 2px 5px rgba(0,0,0,.85), 0 1px 0 rgba(255,255,255,.9); }
.sk-ball { background: radial-gradient(circle at 35% 30%, #ffffff 0%, #e6e6e6 25%, #9d9d9d 70%, #6b6b6b 100%);
  box-shadow: 0 2px 4px rgba(0,0,0,.6), inset 0 -1px 2px rgba(0,0,0,.3); }
.sk-led-on  { background: radial-gradient(circle at 35% 35%, #d6ffc9 0%, #5cff3a 40%, #1d8a12 100%); box-shadow: 0 0 10px 2px rgba(92,255,58,.7), inset 0 0 1px rgba(0,0,0,.5); }
.sk-led-off { background: radial-gradient(circle at 35% 35%, #9a9a9a 0%, #4a4a4a 60%, #2a2a2a 100%); box-shadow: inset 0 1px 2px rgba(0,0,0,.6), 0 1px 0 rgba(255,255,255,.7); }
.sk-groove { background:#151515; box-shadow: inset 0 1px 3px rgba(0,0,0,.9), 0 1px 0 rgba(255,255,255,.9); }
.sk-cap { border:1px solid #6a6a6a; border-radius:4px;
  background: linear-gradient(180deg,#fafafa 0%,#cfcfcf 45%,#9e9e9e 50%,#d8d8d8 55%,#f0f0f0 100%);
  box-shadow: 0 3px 5px rgba(0,0,0,.5), inset 0 1px 0 #fff; }
.sk-paper { background:#fbf6e9; border:1px solid #a69c84; border-radius:6px; box-shadow: inset 0 2px 4px rgba(0,0,0,.25);
  font-family:'Courier New', Courier, monospace; color:#3b3326; }
.sk-paper::placeholder { color:#9b927c; }
.sk-paper:focus { outline:none; border-color:#2b6fd6; box-shadow: inset 0 2px 4px rgba(0,0,0,.25), 0 0 0 3px rgba(43,111,214,.25); }
.sk-gel { color:#fff; font-weight:700; text-shadow:0 -1px 0 rgba(0,0,0,.45); border:1px solid #13509a; border-radius:9px;
  background: linear-gradient(180deg,#8cc8ff 0%,#3d8fe0 50%,#1f6fcc 51%,#3a8ee6 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.7), 0 2px 3px rgba(0,0,0,.45); }
.sk-gel:hover { filter:brightness(1.06); }
.sk-gel:active { background: linear-gradient(180deg,#2a72c4 0%,#1f63b3 50%,#1a5aa5 51%,#2c78cf 100%); box-shadow: inset 0 2px 6px rgba(0,0,0,.5); }
.sk-metal-btn { color:#333; font-weight:700; text-shadow:0 1px 0 rgba(255,255,255,.9); border:1px solid #8a8a8a; border-radius:9px;
  background: linear-gradient(180deg,#ffffff 0%,#e3e3e3 50%,#d0d0d0 51%,#ececec 100%);
  box-shadow: inset 0 1px 0 #fff, 0 2px 3px rgba(0,0,0,.35); }
.sk-metal-btn:active { background: linear-gradient(180deg,#cfcfcf,#e6e6e6); box-shadow: inset 0 2px 5px rgba(0,0,0,.35); }
`

export function StyleSkeuo() {
  const [notify, setNotify] = useState(true)
  const [volume, setVolume] = useState(68)
  const [following, setFollowing] = useState(false)

  return (
    <div className="sk-leather relative grid h-full w-full place-items-center overflow-hidden font-sans">
      <style>{css}</style>
      {/* stitching */}
      <div className="pointer-events-none absolute inset-3 rounded-2xl border-2 border-dashed border-[#d9b38c]/40" />

      <div className="sk-metal relative w-[300px] rounded-2xl px-5 py-5">
        {[
          'left-2 top-2 rotate-[35deg]',
          'right-2 top-2 rotate-[110deg]',
          'bottom-2 left-2 rotate-[70deg]',
          'bottom-2 right-2 rotate-[15deg]',
        ].map((pos) => (
          <span key={pos} className={`sk-screw ${pos}`} />
        ))}

        {/* header */}
        <div className="flex items-center gap-3">
          <div className="sk-bezel h-[54px] w-[54px] shrink-0">
            <div className="sk-lens grid h-full w-full place-items-center text-xl">🎧</div>
          </div>
          <div className="min-w-0">
            <p className="sk-engraved text-[17px] font-extrabold uppercase tracking-[0.08em]">Mika Sato</p>
            <p className="sk-engraved text-[10px] font-semibold uppercase tracking-[0.2em]">Model PD-2026 · Tokyo</p>
          </div>
        </div>

        {/* LCD stats */}
        <div className="sk-lcd mt-3 grid grid-cols-3 px-2 py-1 text-center">
          {[
            ['128', 'POSTS'],
            ['2.4K', 'FANS'],
            ['312', 'FOLLOW'],
          ].map(([value, label]) => (
            <div key={label}>
              <p className="text-[24px] leading-none">{value}</p>
              <p className="text-[13px] leading-none opacity-70">{label}</p>
            </div>
          ))}
        </div>

        {/* physical toggle + LED */}
        <div className="mt-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${notify ? 'sk-led-on' : 'sk-led-off'}`} />
            <span className="sk-engraved text-[11px] font-bold uppercase tracking-[0.18em]">Notify</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="sk-engraved text-[9px] font-bold">OFF</span>
            <button
              role="switch"
              aria-checked={notify}
              aria-label="Notifications"
              onClick={() => setNotify((v) => !v)}
              className="sk-slot relative h-7 w-[58px] rounded-full"
            >
              <motion.span
                className="sk-ball absolute left-[2px] top-[2px] h-6 w-6 rounded-full"
                animate={{ x: notify ? 30 : 0 }}
                transition={{ type: 'spring', stiffness: 700, damping: 28 }}
              />
            </button>
            <span className="sk-engraved text-[9px] font-bold">ON</span>
          </div>
        </div>

        {/* fader */}
        <div className="mt-3">
          <div className="flex justify-between">
            <span className="sk-engraved text-[11px] font-bold uppercase tracking-[0.18em]">Volume</span>
            <span className="sk-engraved font-mono text-[11px] font-bold">{volume} dB</span>
          </div>
          <div className="relative mt-1 h-8">
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label="Volume"
              className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
            />
            <div className="sk-groove absolute inset-x-1 top-[11px] h-2 overflow-hidden rounded-full">
              <div
                className="h-full"
                style={{ width: `${volume}%`, background: 'linear-gradient(90deg,#ff9d00,#ffd27a)', boxShadow: '0 0 8px #ffb000' }}
              />
            </div>
            <div
              className="absolute bottom-0 left-1 right-1 h-1.5"
              style={{ background: 'repeating-linear-gradient(90deg,#6b6b6b 0 1px,transparent 1px 10%)' }}
            />
            <div
              className="sk-cap absolute top-0 grid h-[30px] w-4 place-items-center"
              style={{ left: `calc(${volume}% - ${volume * 0.16}px)` }}
            >
              <span className="h-[2px] w-full bg-[#333]" />
            </div>
          </div>
        </div>

        {/* paper input */}
        <input placeholder="type status here_" className="sk-paper mt-3 h-9 w-full px-3 text-[13px]" />

        {/* gel buttons */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button onClick={() => setFollowing((f) => !f)} className="sk-gel h-9 text-[13px]">
            {following ? 'Following' : 'Follow'}
          </button>
          <button className="sk-metal-btn h-9 text-[13px]">Message</button>
        </div>
      </div>
    </div>
  )
}
