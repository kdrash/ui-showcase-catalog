import { useEffect, useState } from 'react'
import { motion } from 'motion/react'

/**
 * SF HUD / FUI(Fictional User Interface)
 * ほぼ黒の紺 #020b12 に、シアン #22d3ee の細線だけで描くパネル。
 * コーナーブラケット・斜めカットの角(clip-path)・回転するレーダー(conic-gradient)・
 * 刻み目のメーター・常に変化する数値・スキャンライン。フォントは Orbitron + 等幅。
 */
const CYAN = '#22d3ee'
const AMBER = '#fbbf24'
const KF = `
@keyframes hud-sweep { to { transform: rotate(360deg); } }
@keyframes hud-scan { from { transform: translateY(-100%); } to { transform: translateY(400%); } }
@keyframes hud-blink { 50% { opacity: .2; } }`

function Corners() {
  const c = 'absolute h-3 w-3 border-[#22d3ee]'
  return (
    <>
      <span className={`${c} -left-px -top-px border-l-2 border-t-2`} />
      <span className={`${c} -right-px -top-px border-r-2 border-t-2`} />
      <span className={`${c} -bottom-px -left-px border-b-2 border-l-2`} />
      <span className={`${c} -bottom-px -right-px border-b-2 border-r-2`} />
    </>
  )
}

export function StyleHud() {
  const [notify, setNotify] = useState(true)
  const [volume, setVolume] = useState(62)
  const [locked, setLocked] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 120)
    return () => clearInterval(id)
  }, [])
  const hex = ((tick * 2654435761) >>> 0).toString(16).toUpperCase().padStart(8, '0')

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: 'radial-gradient(ellipse at center, #06202e 0%, #020b12 70%)', color: CYAN, fontFamily: '"JetBrains Mono", monospace' }}>
      <style>{KF}</style>
      {/* hex grid */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: `linear-gradient(30deg, ${CYAN} 1px, transparent 1px), linear-gradient(150deg, ${CYAN} 1px, transparent 1px)`, backgroundSize: '28px 16px' }}
      />
      {/* scanlines + sweep */}
      <div className="pointer-events-none absolute inset-0 z-20" style={{ background: 'repeating-linear-gradient(0deg, rgba(0,0,0,.25) 0 1px, transparent 1px 3px)' }} />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-1/4" style={{ background: 'linear-gradient(transparent, rgba(34,211,238,.08), transparent)', animation: 'hud-scan 4s linear infinite' }} />

      {/* top readout */}
      <div className="absolute inset-x-3 top-2 flex justify-between text-[9px] tracking-[0.2em] opacity-80">
        <span>SYS://PROFILE.NODE</span>
        <span style={{ animation: 'hud-blink 1s steps(1) infinite', color: AMBER }}>● LIVE</span>
        <span>0x{hex}</span>
      </div>

      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-4">
        {/* radar */}
        <div className="relative hidden h-36 w-36 shrink-0 rounded-full border border-[#22d3ee]/60 min-[480px]:block" style={{ boxShadow: `0 0 20px ${CYAN}33 inset` }}>
          {[0.66, 0.33].map((s) => (
            <span key={s} className="absolute rounded-full border border-[#22d3ee]/30" style={{ inset: `${(1 - s) * 50}%` }} />
          ))}
          <span className="absolute inset-x-0 top-1/2 h-px bg-[#22d3ee]/30" />
          <span className="absolute inset-y-0 left-1/2 w-px bg-[#22d3ee]/30" />
          <div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(from 0deg, ${CYAN}aa, transparent 25%)`, animation: 'hud-sweep 2.6s linear infinite', maskImage: 'radial-gradient(circle, #000 69%, transparent 70%)' }} />
          {[
            [30, 40],
            [70, 62],
            [55, 25],
          ].map(([x, y], i) => (
            <span key={i} className="absolute h-1.5 w-1.5 rounded-full" style={{ left: `${x}%`, top: `${y}%`, background: i === 1 ? AMBER : CYAN, boxShadow: `0 0 8px ${i === 1 ? AMBER : CYAN}`, animation: `hud-blink ${1 + i * 0.4}s steps(1) infinite` }} />
          ))}
          <p className="absolute -bottom-5 w-full text-center text-[8px] tracking-[0.3em]">SCAN · 360°</p>
        </div>

        {/* panel */}
        <div
          className="relative w-[260px] p-4"
          style={{ background: 'rgba(8,47,73,0.35)', border: `1px solid ${CYAN}66`, clipPath: 'polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 18px 100%, 0 calc(100% - 18px))', boxShadow: `0 0 30px ${CYAN}22 inset` }}
        >
          <Corners />
          <div className="flex items-center gap-3">
            <div className="relative grid h-14 w-14 place-items-center">
              <svg className="absolute inset-0 animate-[hud-sweep_8s_linear_infinite]" viewBox="0 0 56 56" aria-hidden>
                <circle cx="28" cy="28" r="26" fill="none" stroke={CYAN} strokeWidth="1.5" strokeDasharray="20 8 4 8" />
              </svg>
              <span className="text-[15px] font-bold" style={{ fontFamily: 'Orbitron, sans-serif', textShadow: `0 0 8px ${CYAN}` }}>
                MS
              </span>
            </div>
            <div>
              <p className="text-[15px] font-bold tracking-[0.18em]" style={{ fontFamily: 'Orbitron, sans-serif', textShadow: `0 0 10px ${CYAN}` }}>
                M.SATO
              </p>
              <p className="text-[9px] tracking-[0.25em] text-[#22d3ee]/70">PILOT ID · PD-7741</p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1 text-center text-[8px] tracking-[0.2em]">
            {[
              ['128', 'LOGS'],
              ['2.4K', 'LINKS'],
              ['312', 'TRACK'],
            ].map(([v, l]) => (
              <div key={l} className="border border-[#22d3ee]/40 py-1">
                <p className="text-[14px] font-bold tracking-normal" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  {v}
                </p>
                <p className="opacity-70">{l}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between text-[10px] tracking-[0.2em]">
            <span>ALERTS</span>
            <button role="switch" aria-checked={notify} aria-label="Notifications" onClick={() => setNotify((v) => !v)} className="flex gap-[3px]">
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} className="h-3 w-2.5 -skew-x-12 border border-[#22d3ee]/60 transition-colors" style={{ background: notify ? CYAN : 'transparent', boxShadow: notify ? `0 0 6px ${CYAN}` : 'none', transitionDelay: `${i * 30}ms` }} />
              ))}
              <span className="ml-1 w-7 text-left">{notify ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          <div className="mt-2 text-[10px] tracking-[0.2em]">
            <div className="flex justify-between">
              <span>GAIN</span>
              <span style={{ color: AMBER }}>{String(volume).padStart(3, '0')}%</span>
            </div>
            <div className="relative mt-1 h-4">
              <input type="range" value={volume} onChange={(e) => setVolume(+e.target.value)} aria-label="Volume" className="absolute inset-0 z-10 w-full cursor-pointer opacity-0" />
              <div className="flex h-full items-end gap-[2px]">
                {Array.from({ length: 24 }, (_, i) => (
                  <span key={i} className="flex-1" style={{ height: `${30 + (i % 4 === 0 ? 70 : 30)}%`, background: i / 24 < volume / 100 ? CYAN : `${CYAN}26`, boxShadow: i / 24 < volume / 100 ? `0 0 4px ${CYAN}` : 'none' }} />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-bold tracking-[0.25em]">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setLocked((l) => !l)}
              className="h-8 border transition-colors"
              style={{ borderColor: locked ? AMBER : CYAN, color: locked ? '#020b12' : CYAN, background: locked ? AMBER : 'transparent', clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
            >
              {locked ? '◉ LOCKED' : 'LOCK ON'}
            </motion.button>
            <button className="h-8 border border-[#22d3ee]/60 transition-colors hover:bg-[#22d3ee]/15" style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}>
              COMMS
            </button>
          </div>
        </div>
      </div>

      <div className="absolute bottom-2 left-3 text-[8px] tracking-[0.3em] opacity-60">LAT 35.6812 · LON 139.7671 · ALT {(1200 + (tick % 50)).toString()}M</div>
    </div>
  )
}
