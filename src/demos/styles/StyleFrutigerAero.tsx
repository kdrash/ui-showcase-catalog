import { useMemo, useState } from 'react'
import { motion } from 'motion/react'

/**
 * Frutiger Aero
 * 2006〜2012頃(Vista / 7 / 初期スマホ)の「明るい未来」感。青空のグラデーション + 若草色の丘 +
 * 立ち上る泡 + レンズフレア。パネルは白い半透明 + 上半分の強い光沢(白→透明のグラデ)、
 * ボタンは水色/若草色のジェルピルで、上に楕円のハイライトを重ねる。
 */
const FONT = '"Segoe UI", "Frutiger", "Myriad Pro", "Noto Sans JP", sans-serif'

const gloss = 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.35) 48%, rgba(255,255,255,0) 50%)'

function GelButton({ children, hue, onClick }: { children: React.ReactNode; hue: 'blue' | 'green'; onClick?: () => void }) {
  const base =
    hue === 'blue'
      ? 'linear-gradient(180deg,#7fd6ff 0%,#1fa2f0 50%,#0077d6 51%,#3cc0ff 100%)'
      : 'linear-gradient(180deg,#c6f27a 0%,#6cc72b 50%,#3f9e14 51%,#86de3c 100%)'
  return (
    <button
      onClick={onClick}
      className="relative h-10 overflow-hidden rounded-full text-[14px] font-semibold text-white transition hover:brightness-110 active:brightness-95"
      style={{
        background: base,
        border: '1px solid rgba(0,60,120,0.35)',
        boxShadow: '0 4px 10px rgba(0,90,160,0.35), inset 0 -2px 6px rgba(255,255,255,0.5)',
        textShadow: '0 1px 2px rgba(0,50,100,0.6)',
      }}
    >
      <span className="absolute inset-x-2 top-[2px] h-[45%] rounded-full" style={{ background: 'linear-gradient(180deg,rgba(255,255,255,.9),rgba(255,255,255,.15))' }} />
      <span className="relative">{children}</span>
    </button>
  )
}

export function StyleFrutigerAero() {
  const [notify, setNotify] = useState(true)
  const [volume, setVolume] = useState(68)
  const [following, setFollowing] = useState(false)
  const bubbles = useMemo(
    () => Array.from({ length: 14 }, (_, i) => ({ left: (i * 37) % 100, size: 10 + ((i * 13) % 34), dur: 7 + (i % 5) * 2, delay: (i * 0.9) % 7 })),
    [],
  )

  return (
    <div
      className="relative grid h-full w-full place-items-center overflow-hidden"
      style={{ fontFamily: FONT, background: 'linear-gradient(180deg,#0a7fd8 0%,#47b4f5 35%,#bfe9ff 70%,#e9fbff 100%)' }}
    >
      {/* lens flare */}
      <div className="absolute -left-16 -top-16 h-64 w-64 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,.95) 0%, rgba(255,255,255,.3) 25%, transparent 65%)' }} />
      <div className="absolute left-[30%] top-[22%] h-10 w-10 rounded-full bg-white/25 blur-[1px]" />
      <div className="absolute left-[42%] top-[32%] h-5 w-5 rounded-full bg-cyan-100/40" />
      {/* green hills */}
      <svg className="absolute bottom-0 left-0 h-[42%] w-full" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="fa-hill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#b4ef5a" />
            <stop offset="1" stopColor="#3f9e14" />
          </linearGradient>
          <linearGradient id="fa-hill2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8ad63a" />
            <stop offset="1" stopColor="#2e7d0c" />
          </linearGradient>
        </defs>
        <path d="M0 70 Q 90 20 200 60 T 400 50 V120 H0Z" fill="url(#fa-hill)" />
        <path d="M0 95 Q 120 60 250 90 T 400 85 V120 H0Z" fill="url(#fa-hill2)" />
      </svg>
      {/* bubbles */}
      {bubbles.map((b, i) => (
        <motion.span
          key={i}
          className="absolute bottom-[-40px] rounded-full"
          style={{
            left: `${b.left}%`,
            width: b.size,
            height: b.size,
            background: 'radial-gradient(circle at 30% 28%, rgba(255,255,255,.95) 0 12%, rgba(255,255,255,.15) 30%, rgba(160,230,255,.25) 70%, rgba(255,255,255,.7) 100%)',
            boxShadow: 'inset 0 0 6px rgba(255,255,255,.6)',
          }}
          animate={{ y: [0, -520], x: [0, 12, -8, 6] }}
          transition={{ duration: b.dur, delay: b.delay, repeat: Infinity, ease: 'linear' }}
        />
      ))}

      {/* glossy panel */}
      <div
        className="relative w-[300px] overflow-hidden rounded-[18px] p-4"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.75), rgba(220,245,255,0.55))',
          border: '1px solid rgba(255,255,255,0.95)',
          boxShadow: '0 12px 30px rgba(0,70,140,0.35), inset 0 0 0 1px rgba(120,190,240,0.5)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[38%] rounded-t-[18px]" style={{ background: gloss, opacity: 0.55 }} />
        <div className="relative flex items-center gap-3">
          <div
            className="grid h-14 w-14 place-items-center rounded-full text-lg font-bold text-white"
            style={{
              background: 'radial-gradient(circle at 35% 30%, #c7f3ff, #27a8f5 55%, #0b67c2)',
              border: '2px solid #fff',
              boxShadow: '0 3px 8px rgba(0,80,160,.4)',
              textShadow: '0 1px 2px rgba(0,40,90,.5)',
            }}
          >
            MS
          </div>
          <div>
            <p className="text-[19px] font-semibold text-[#0b4f8a]" style={{ textShadow: '0 1px 0 #fff' }}>
              Mika Sato
            </p>
            <p className="text-[12px] text-[#3a7bb0]">Product Designer · Tokyo</p>
          </div>
        </div>

        <div className="relative mt-3 grid grid-cols-3 gap-1.5">
          {[
            ['128', 'Posts'],
            ['2.4k', 'Followers'],
            ['312', 'Following'],
          ].map(([v, l]) => (
            <div
              key={l}
              className="relative overflow-hidden rounded-lg py-1.5 text-center"
              style={{ background: 'linear-gradient(180deg,#ffffff,#d8f1ff)', border: '1px solid #9fd3f5' }}
            >
              <p className="text-[15px] font-bold text-[#0b4f8a]">{v}</p>
              <p className="text-[10px] text-[#3a7bb0]">{l}</p>
            </div>
          ))}
        </div>

        <div className="relative mt-3 flex items-center justify-between text-[13px] text-[#0b4f8a]">
          <span>Notifications</span>
          <button
            role="switch"
            aria-checked={notify}
            aria-label="Notifications"
            onClick={() => setNotify((v) => !v)}
            className="relative h-6 w-12 overflow-hidden rounded-full"
            style={{
              background: notify ? 'linear-gradient(180deg,#a8e85d,#4caf1a)' : 'linear-gradient(180deg,#e6eef3,#b9c9d4)',
              border: '1px solid rgba(0,70,120,.35)',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,.2)',
            }}
          >
            <motion.span
              className="absolute top-[1px] h-5 w-5 rounded-full"
              style={{ background: 'radial-gradient(circle at 35% 30%,#fff,#d6ecfa 60%,#9cc8e8)', border: '1px solid #7fb3d9' }}
              animate={{ left: notify ? 26 : 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
        </div>

        <div className="relative mt-3 h-5">
          <input
            type="range"
            value={volume}
            onChange={(e) => setVolume(+e.target.value)}
            aria-label="Volume"
            className="absolute inset-0 z-10 w-full cursor-pointer opacity-0"
          />
          <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-[#cfe6f5] shadow-[inset_0_1px_3px_rgba(0,0,0,.25)]" />
          <div
            className="absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-full"
            style={{ width: `${volume}%`, background: 'linear-gradient(180deg,#8be0ff,#1592e6)' }}
          />
          <div
            className="absolute top-0 h-5 w-5 rounded-full"
            style={{
              left: `calc(${volume}% - ${volume * 0.2}px)`,
              background: 'radial-gradient(circle at 35% 30%,#fff,#bfe8ff 55%,#3aa6ea)',
              border: '1px solid #2a86c9',
              boxShadow: '0 2px 4px rgba(0,60,120,.4)',
            }}
          />
        </div>

        <input
          placeholder="What's on your mind?"
          className="relative mt-3 h-9 w-full rounded-md bg-white px-3 text-[13px] text-[#0b4f8a] outline-none placeholder:text-[#7fa9c8] focus:shadow-[0_0_0_3px_rgba(80,180,255,.45)]"
          style={{ border: '1px solid #8ec4e8', boxShadow: 'inset 0 1px 3px rgba(0,60,120,.15)' }}
        />

        <div className="relative mt-3 grid grid-cols-2 gap-2">
          <GelButton hue="green" onClick={() => setFollowing((f) => !f)}>
            {following ? '✓ Following' : 'Follow'}
          </GelButton>
          <GelButton hue="blue">Message</GelButton>
        </div>
      </div>
    </div>
  )
}
