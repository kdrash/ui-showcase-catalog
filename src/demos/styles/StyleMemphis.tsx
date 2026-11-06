import { useState } from 'react'
import { motion } from 'motion/react'

/**
 * Memphis(80年代 メンフィス・デザイン)
 * 生成り背景に、原色・パステルの幾何学(三角・円・半円)、スクイグル(波線)、ドット、ジグザグ、
 * 斜めストライプを散らす。カードは黒の太線 + ストライプ柄のずらし影。フォントは太いジオメトリック。
 */
const C = { pink: '#ff6b9d', yellow: '#ffd23f', teal: '#00c2d1', purple: '#7b5ea7', blue: '#3a86ff', ink: '#111111', bg: '#fff8ec' }

function Deco() {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 560 420" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <pattern id="mp-dots" width="12" height="12" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="2.2" fill={C.ink} />
        </pattern>
        <pattern id="mp-stripe" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="5" height="10" fill={C.purple} />
        </pattern>
      </defs>
      <path d="M20 60 q 15 -20 30 0 t 30 0 t 30 0 t 30 0" stroke={C.teal} strokeWidth="7" fill="none" strokeLinecap="round" />
      <path d="M420 380 q 15 -20 30 0 t 30 0 t 30 0 t 30 0" stroke={C.pink} strokeWidth="7" fill="none" strokeLinecap="round" />
      <polygon points="470,40 530,120 410,120" fill={C.yellow} stroke={C.ink} strokeWidth="4" />
      <circle cx="70" cy="340" r="44" fill="url(#mp-dots)" />
      <circle cx="90" cy="320" r="30" fill={C.pink} stroke={C.ink} strokeWidth="4" />
      <path d="M470 220 a 50 50 0 0 1 100 0 z" fill={C.blue} stroke={C.ink} strokeWidth="4" />
      <rect x="20" y="150" width="60" height="60" fill="url(#mp-stripe)" stroke={C.ink} strokeWidth="4" transform="rotate(-12 50 180)" />
      <polyline points="380,20 395,40 410,20 425,40 440,20 455,40" stroke={C.ink} strokeWidth="5" fill="none" />
      <polyline points="20,260 35,280 50,260 65,280 80,260" stroke={C.purple} strokeWidth="5" fill="none" />
      <circle cx="500" cy="300" r="10" fill={C.teal} stroke={C.ink} strokeWidth="3" />
      <rect x="150" y="20" width="14" height="14" fill={C.pink} transform="rotate(30 157 27)" />
      <rect x="400" y="320" width="18" height="18" fill={C.yellow} stroke={C.ink} strokeWidth="3" transform="rotate(20 409 329)" />
    </svg>
  )
}

export function StyleMemphis() {
  const [notify, setNotify] = useState(true)
  const [volume, setVolume] = useState(50)
  const [following, setFollowing] = useState(false)

  return (
    <div className="relative grid h-full w-full place-items-center overflow-hidden" style={{ background: C.bg, fontFamily: '"Space Grotesk", Inter, sans-serif', color: C.ink }}>
      <Deco />
      <div className="relative">
        {/* striped offset shadow */}
        <div
          className="absolute inset-0 translate-x-3 translate-y-3 rounded-[4px] border-[3px] border-black"
          style={{ background: `repeating-linear-gradient(-45deg, ${C.ink} 0 3px, ${C.yellow} 3px 9px)` }}
        />
        <motion.div whileHover={{ rotate: -1.5 }} className="relative w-[290px] rounded-[4px] border-[3px] border-black bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="relative h-14 w-14">
              <div className="absolute inset-0 rounded-full border-[3px] border-black" style={{ background: C.teal }} />
              <div className="absolute -right-1 -top-1 h-5 w-5 rotate-12 border-[3px] border-black" style={{ background: C.pink }} />
              <span className="absolute inset-0 grid place-items-center text-lg font-bold">MS</span>
            </div>
            <div>
              <p className="text-[22px] font-bold leading-none tracking-tight">Mika Sato</p>
              <p className="mt-1 inline-block -rotate-2 px-1.5 text-[12px] font-bold" style={{ background: C.yellow, border: `2px solid ${C.ink}` }}>
                ✶ Product Designer
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              ['128', 'posts', C.pink, '50%'],
              ['2.4k', 'fans', C.yellow, '4px'],
              ['312', 'follow', C.teal, '50% 50% 4px 4px'],
            ].map(([v, l, bg, r]) => (
              <div key={l} className="border-[3px] border-black py-1.5" style={{ background: bg, borderRadius: r }}>
                <p className="text-[16px] font-bold leading-none">{v}</p>
                <p className="text-[10px] font-bold uppercase">{l}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-[13px] font-bold uppercase">Notifications</span>
            <button
              role="switch"
              aria-checked={notify}
              aria-label="Notifications"
              onClick={() => setNotify((v) => !v)}
              className="relative h-7 w-14 rounded-full border-[3px] border-black"
              style={{ background: notify ? `repeating-linear-gradient(90deg, ${C.purple} 0 4px, #fff 4px 8px)` : '#fff' }}
            >
              <motion.span
                className="absolute top-[2px] h-4 w-4 border-[3px] border-black"
                style={{ background: C.yellow }}
                animate={{ left: notify ? 30 : 3, rotate: notify ? 45 : 0, borderRadius: notify ? '2px' : '50%' }}
              />
            </button>
          </div>

          <div className="mt-3">
            <div className="relative h-6">
              <input type="range" value={volume} onChange={(e) => setVolume(+e.target.value)} aria-label="Volume" className="absolute inset-0 z-10 w-full cursor-pointer opacity-0" />
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden>
                <path d="M0 12 q 5 -8 10 0 t 10 0 t 10 0 t 10 0 t 10 0 t 10 0 t 10 0 t 10 0 t 10 0 t 10 0" stroke="#ddd" strokeWidth="3" fill="none" vectorEffect="non-scaling-stroke" />
              </svg>
              <svg className="absolute inset-y-0 left-0 h-full overflow-hidden" style={{ width: `${volume}%` }} viewBox={`0 0 ${volume} 24`} preserveAspectRatio="none" aria-hidden>
                <path d="M0 12 q 5 -8 10 0 t 10 0 t 10 0 t 10 0 t 10 0 t 10 0 t 10 0 t 10 0 t 10 0 t 10 0" stroke={C.pink} strokeWidth="3" fill="none" vectorEffect="non-scaling-stroke" />
              </svg>
              <div
                className="absolute top-0 h-0 w-0"
                style={{ left: `calc(${volume}% - ${volume * 0.22}px)`, borderLeft: '11px solid transparent', borderRight: '11px solid transparent', borderBottom: `22px solid ${C.blue}`, filter: 'drop-shadow(0 0 0 #000) drop-shadow(2px 2px 0 #111)' }}
              />
            </div>
          </div>

          <input
            placeholder="say something rad…"
            className="mt-3 h-10 w-full border-[3px] border-black bg-white px-3 text-[13px] font-semibold outline-none placeholder:text-black/40 focus:bg-[#fff3c4]"
          />

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => setFollowing((f) => !f)}
              className="h-10 rounded-full border-[3px] border-black text-[14px] font-bold uppercase shadow-[3px_3px_0_#111] transition active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
              style={{ background: C.pink }}
            >
              {following ? 'Following ✶' : 'Follow'}
            </button>
            <button
              className="h-10 border-[3px] border-black text-[14px] font-bold uppercase shadow-[3px_3px_0_#111] transition active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
              style={{ background: `radial-gradient(${C.ink} 1.5px, ${C.teal} 1.6px) 0 0/9px 9px` }}
            >
              <span className="bg-white px-1">Message</span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
