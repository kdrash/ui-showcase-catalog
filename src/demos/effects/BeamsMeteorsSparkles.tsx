import { useMemo, useState } from 'react'
import { motion } from 'motion/react'

type Mode = 'meteors' | 'beams' | 'sparkles' | 'ripple'
const MODES: { id: Mode; label: string }[] = [
  { id: 'meteors', label: 'Meteors' },
  { id: 'beams', label: 'Beams' },
  { id: 'sparkles', label: 'Sparkles' },
  { id: 'ripple', label: 'Ripple' },
]

function rand(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

function Meteors() {
  const items = useMemo(
    () => Array.from({ length: 22 }, (_, i) => ({ left: rand(i) * 130 - 10, delay: rand(i + 50) * 6, dur: 2.5 + rand(i + 99) * 4 })),
    [],
  )
  return (
    <div className="absolute inset-0">
      {items.map((m, i) => (
        <span
          key={i}
          className="bms-meteor absolute top-[-10%] h-0.5 w-0.5 rounded-full bg-slate-200 shadow-[0_0_0_1px_#ffffff10]"
          style={{ left: `${m.left}%`, animationDelay: `${m.delay}s`, animationDuration: `${m.dur}s` }}
        />
      ))}
    </div>
  )
}

const BEAM_PATHS = Array.from({ length: 9 }, (_, i) => {
  const o = i * 34
  return `M${-380 + o} ${-189 - i * 6}C${-380 + o} ${-189 - i * 6} ${-312 + o} ${216 - i * 6} ${152 + o} ${343 - i * 6}C${616 + o} ${470 - i * 6} ${684 + o} ${875 - i * 6} ${684 + o} ${875 - i * 6}`
})

function Beams() {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 696 316" preserveAspectRatio="xMidYMid slice" fill="none">
      <defs>
        <linearGradient id="bms-g" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#18CCFC" stopOpacity="0" />
          <stop offset=".3" stopColor="#18CCFC" />
          <stop offset=".7" stopColor="#6344F5" />
          <stop offset="1" stopColor="#AE48FF" stopOpacity="0" />
        </linearGradient>
      </defs>
      {BEAM_PATHS.map((d, i) => (
        <path key={`b${i}`} d={d} stroke="#ffffff" strokeOpacity=".06" strokeWidth=".6" />
      ))}
      {BEAM_PATHS.map((d, i) => (
        <path
          key={`a${i}`}
          d={d}
          stroke="url(#bms-g)"
          strokeWidth="1.2"
          strokeLinecap="round"
          className="bms-beam"
          pathLength={1000}
          style={{ animationDelay: `${rand(i + 7) * 4}s`, animationDuration: `${3 + rand(i + 17) * 3}s` }}
        />
      ))}
    </svg>
  )
}

function Sparkles() {
  const stars = useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => ({
        x: rand(i + 1) * 100,
        y: 52 + rand(i + 300) * 48,
        s: 1 + rand(i + 600) * 2.2,
        d: rand(i + 900) * 3,
        t: 1.5 + rand(i + 1200) * 2.5,
      })),
    [],
  )
  return (
    <div className="absolute inset-0">
      <div className="absolute top-[50%] left-1/2 h-px w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-indigo-500 to-transparent blur-[1px]" />
      <div className="absolute top-[50%] left-1/2 h-[3px] w-1/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-sky-400 to-transparent blur-sm" />
      <div className="absolute inset-0 [mask-image:radial-gradient(60%_50%_at_50%_50%,#000,transparent)]">
        {stars.map((s, i) => (
          <span
            key={i}
            className="bms-twinkle absolute rounded-full bg-white"
            style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animationDelay: `${s.d}s`, animationDuration: `${s.t}s` }}
          />
        ))}
      </div>
    </div>
  )
}

function Ripple() {
  return (
    <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,#fff,transparent)]">
      {Array.from({ length: 8 }, (_, i) => (
        <span
          key={i}
          className="bms-ripple absolute top-1/2 left-1/2 rounded-full border border-white/20 bg-white/[0.04] shadow-xl"
          style={{
            width: 140 + i * 70,
            height: 140 + i * 70,
            opacity: 0.6 - i * 0.07,
            animationDelay: `${i * 0.06}s`,
            borderStyle: i === 7 ? 'dashed' : 'solid',
          }}
        />
      ))}
    </div>
  )
}

/** Aceternity / Magic UI 風のダーク背景エフェクト 4種(Meteors / Beams / Sparkles / Ripple) */
export function BeamsMeteorsSparkles() {
  const [mode, setMode] = useState<Mode>('meteors')
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#05060a] text-white [container-type:inline-size]">
      <style>{`
        .bms-meteor { animation: bms-meteor linear infinite; transform: rotate(215deg); }
        .bms-meteor::before { content:''; position:absolute; top:50%; transform:translateY(-50%); width:70px; height:1px; background:linear-gradient(90deg,#94a3b8,transparent); }
        @keyframes bms-meteor { 0% { transform: rotate(215deg) translateX(0); opacity:1 } 70% { opacity:1 } 100% { transform: rotate(215deg) translateX(-700px); opacity:0 } }
        .bms-beam { stroke-dasharray: 90 1000; animation: bms-beam linear infinite; }
        @keyframes bms-beam { from { stroke-dashoffset: 1090 } to { stroke-dashoffset: 0 } }
        .bms-twinkle { animation: bms-tw ease-in-out infinite; }
        @keyframes bms-tw { 0%,100% { opacity:.1; transform:scale(.6) } 50% { opacity:1; transform:scale(1.2) } }
        .bms-ripple { transform: translate(-50%,-50%); animation: bms-rp 3.4s ease infinite; }
        @keyframes fadein { from { opacity:0 } to { opacity:1 } }
        @keyframes bms-rp { 0%,100% { transform: translate(-50%,-50%) scale(1) } 50% { transform: translate(-50%,-50%) scale(.9) } }
      `}</style>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,#000_30%,transparent_75%)]" />
      <div key={mode} className="absolute inset-0 animate-[fadein_.5s_ease]">
        {mode === 'meteors' && <Meteors />}
        {mode === 'beams' && <Beams />}
        {mode === 'sparkles' && <Sparkles />}
        {mode === 'ripple' && <Ripple />}
      </div>
      <div className="pointer-events-none relative flex h-full flex-col items-center justify-center px-6 text-center">
        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] text-zinc-300">✦ Introducing v2.0</span>
        <h2 className="mt-3 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-[clamp(26px,7cqw,58px)] leading-tight font-bold tracking-tight text-transparent">
          Ship beautiful products
        </h2>
        <p className="mt-2 max-w-md text-xs text-zinc-400 sm:text-sm">暗い背景に、流星・ビーム・きらめき・波紋をひと手間で。</p>
      </div>
      <div className="absolute top-3 left-1/2 flex -translate-x-1/2 gap-1 rounded-full border border-white/10 bg-black/50 p-1 backdrop-blur">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={`relative rounded-full px-3 py-1 text-[11px] font-medium transition ${mode === m.id ? 'text-black' : 'text-zinc-400 hover:text-white'}`}
          >
            {mode === m.id && <motion.span layoutId="bms-pill" className="absolute inset-0 rounded-full bg-white" transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }} />}
            <span className="relative">{m.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
