import { useState } from 'react'
import { motion } from 'motion/react'

/**
 * Risograph(リソグラフ印刷)
 * 版ごとの単色インク(蛍光ピンク #ff48b0 / ブルー #0078bf / イエロー #ffe800)を
 * mix-blend-mode: multiply で重ね刷り。版を数px ずらして“版ズレ”を表現し、
 * 網点(ハーフトーン)と紙の粒子ノイズ(SVG feTurbulence)で印刷物の質感を出す。
 * hover するとズレが大きくなり、クリックで版が揃う。
 */
const PINK = '#ff48b0'
const BLUE = '#0078bf'
const YELLOW = '#ffe800'
const PAPER = '#f4efe4'

const grain = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.1  0 0 0 0 0.1  0 0 0 0 0.1  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(#g)'/></svg>",
)}")`

const dots = (c: string, s = 6, r = 1.6) => ({ backgroundImage: `radial-gradient(${c} ${r}px, transparent ${r + 0.3}px)`, backgroundSize: `${s}px ${s}px` })

export function StyleRisograph() {
  const [aligned, setAligned] = useState(false)
  const [hover, setHover] = useState(false)
  const [notify, setNotify] = useState(true)
  const [volume, setVolume] = useState(55)
  const off = aligned ? 0 : hover ? 7 : 3

  const layer = { mixBlendMode: 'multiply' as const }

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: PAPER, fontFamily: '"Space Grotesk", Inter, sans-serif' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* big background type: blue + pink plates */}
      <motion.p className="absolute -left-2 top-1 select-none text-[86px] font-bold leading-[0.8] tracking-[-0.05em]" style={{ ...layer, color: BLUE, opacity: 0.85 }} animate={{ x: 0, y: 0 }}>
        RISO
        <br />
        PRINT
      </motion.p>
      <motion.p
        className="absolute -left-2 top-1 select-none text-[86px] font-bold leading-[0.8] tracking-[-0.05em]"
        style={{ ...layer, color: PINK, opacity: 0.85 }}
        animate={{ x: off * 1.6, y: -off }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
      >
        RISO
        <br />
        PRINT
      </motion.p>
      {/* shapes */}
      <div className="absolute bottom-[-40px] right-[-30px] h-48 w-48 rounded-full" style={{ ...layer, background: YELLOW }} />
      <motion.div className="absolute bottom-[-20px] right-[10px] h-44 w-44 rounded-full" style={{ ...layer, ...dots(PINK, 7, 2.4) }} animate={{ x: -off, y: off }} />

      {/* card */}
      <div className="absolute right-[6%] top-1/2 w-[250px] -translate-y-1/2 max-[480px]:right-1/2 max-[480px]:translate-x-1/2">
        <motion.div className="absolute inset-0" style={{ ...layer, background: PINK, opacity: 0.9 }} animate={{ x: off, y: off }} transition={{ type: 'spring', stiffness: 200, damping: 18 }} />
        <div className="relative border-2 p-4" style={{ ...layer, borderColor: BLUE, background: 'rgba(255,255,255,.35)', color: BLUE }}>
          <div className="flex items-center gap-3">
            <div className="relative h-14 w-14">
              <span className="absolute inset-0 rounded-full" style={{ ...layer, ...dots(BLUE, 5, 1.7), border: `2px solid ${BLUE}` }} />
              <motion.span className="absolute inset-0 rounded-full" style={{ ...layer, background: YELLOW }} animate={{ x: -off, y: off / 2 }} />
              <span className="absolute inset-0 grid place-items-center text-[18px] font-bold">MS</span>
            </div>
            <div>
              <p className="text-[22px] font-bold uppercase leading-none tracking-tight">Mika Sato</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.25em]">print designer</p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1 text-center">
            {[
              ['128', 'zines'],
              ['2.4k', 'fans'],
              ['312', 'pals'],
            ].map(([v, l]) => (
              <div key={l} className="border-2 py-1" style={{ borderColor: BLUE }}>
                <p className="text-[16px] font-bold leading-none">{v}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest">{l}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] font-bold uppercase tracking-widest">
            <span>notify</span>
            <button role="switch" aria-checked={notify} aria-label="Notifications" onClick={() => setNotify((v) => !v)} className="relative h-6 w-12 border-2" style={{ borderColor: BLUE }}>
              <motion.span className="absolute top-[2px] h-4 w-4" style={{ background: notify ? PINK : BLUE, mixBlendMode: 'multiply' }} animate={{ left: notify ? 26 : 2 }} />
            </button>
          </div>

          <div className="relative mt-3 h-4">
            <input type="range" value={volume} onChange={(e) => setVolume(+e.target.value)} aria-label="Volume" className="absolute inset-0 z-10 w-full cursor-pointer opacity-0" />
            <div className="absolute inset-0 border-2" style={{ borderColor: BLUE, ...dots(BLUE, 4, 1) }} />
            <div className="absolute inset-y-0 left-0" style={{ width: `${volume}%`, background: PINK, mixBlendMode: 'multiply' }} />
          </div>

          <button
            onClick={() => setAligned((a) => !a)}
            className="mt-3 h-9 w-full border-2 text-[12px] font-bold uppercase tracking-[0.2em] transition-colors"
            style={{ borderColor: BLUE, background: aligned ? BLUE : 'transparent', color: aligned ? PAPER : BLUE }}
          >
            {aligned ? '✓ plates aligned' : 'align plates'}
          </button>
        </div>
      </div>

      {/* paper grain on top */}
      <div className="pointer-events-none absolute inset-0 mix-blend-multiply" style={{ backgroundImage: grain, opacity: 0.5 }} />
      <p className="absolute bottom-2 left-3 text-[9px] font-bold uppercase tracking-[0.3em]" style={{ color: BLUE }}>
        2-color riso · fluo pink / blue · 2026
      </p>
    </div>
  )
}
