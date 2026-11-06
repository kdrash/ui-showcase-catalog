import { useState } from 'react'
import { motion } from 'motion/react'

/**
 * Cyberpunk / Neon
 * 黒紫 #07070d + シアン #00f0ff / マゼンタ #ff2a6d / イエロー #fcee0a のネオン 3 色。
 * clip-path で角を斜めにカットしたフレーム (外側=グラデ枠, 内側=暗い面 の二重構造で枠線を表現)、
 * filter: drop-shadow でネオン発光、走査線オーバーレイ、名前は時々走るグリッチ。
 */
const cut = (n: number) =>
  `polygon(0 0, calc(100% - ${n}px) 0, 100% ${n}px, 100% 100%, ${n}px 100%, 0 calc(100% - ${n}px))`

const css = `
.cp-grid { background-image: linear-gradient(rgba(0,240,255,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,42,109,.07) 1px, transparent 1px); background-size: 24px 24px; }
.cp-scan { background: repeating-linear-gradient(0deg, rgba(0,0,0,.28) 0 1px, transparent 1px 3px); }
.cp-glitch { position: relative; display: inline-block; }
.cp-glitch::before, .cp-glitch::after { content: attr(data-text); position: absolute; inset: 0; }
.cp-glitch::before { color: #ff2a6d; animation: cp-g1 3.2s infinite steps(1); }
.cp-glitch::after  { color: #00f0ff; animation: cp-g2 3.2s infinite steps(1); }
@keyframes cp-g1 {
  0%, 84%, 100% { clip-path: inset(100% 0 0 0); transform: none; }
  86% { clip-path: inset(10% 0 60% 0); transform: translate(-3px,-1px); }
  89% { clip-path: inset(55% 0 20% 0); transform: translate(3px,1px); }
  92% { clip-path: inset(80% 0 4% 0);  transform: translate(-2px,0); }
  95% { clip-path: inset(30% 0 45% 0); transform: translate(2px,-1px); }
}
@keyframes cp-g2 {
  0%, 85%, 100% { clip-path: inset(100% 0 0 0); transform: none; }
  87% { clip-path: inset(60% 0 15% 0); transform: translate(3px,1px); }
  90% { clip-path: inset(5% 0 75% 0);  transform: translate(-3px,0); }
  93% { clip-path: inset(40% 0 35% 0); transform: translate(2px,1px); }
  96% { clip-path: inset(70% 0 10% 0); transform: translate(-1px,-1px); }
}
.cp-btn-primary { background:#fcee0a; color:#0a0a0a; clip-path:${cut(10)}; transition: background .15s; }
.cp-btn-primary:hover { background:#00f0ff; animation: cp-jitter .25s steps(2) 1; }
.cp-btn-primary:active { transform: translate(1px,1px); }
.cp-btn-ghost { background:#ff2a6d; clip-path:${cut(10)}; padding:1px; }
.cp-btn-ghost > span { display:grid; place-items:center; height:100%; background:#0b0b16; color:#ff2a6d; clip-path:${cut(9.5)}; transition: background .15s, color .15s; }
.cp-btn-ghost:hover > span { background: rgba(255,42,109,.18); color:#fff; }
@keyframes cp-jitter { 0%{transform:translate(0)} 25%{transform:translate(-2px,1px)} 50%{transform:translate(2px,-1px)} 75%{transform:translate(-1px,0)} 100%{transform:translate(0)} }
.cp-input::placeholder { color: rgba(0,240,255,.3); }
`

export function StyleCyberpunk() {
  const [stealth, setStealth] = useState(true)
  const [signal, setSignal] = useState(74)
  const [following, setFollowing] = useState(false)
  const segments = 16
  const lit = Math.round((signal / 100) * segments)

  return (
    <div className="cp-grid relative grid h-full w-full place-items-center overflow-hidden text-[#d1f7ff]" style={{ backgroundColor: '#07070d', fontFamily: "'JetBrains Mono', monospace" }}>
      <style>{css}</style>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,.75) 100%)' }} />

      {/* drop-shadow は clip-path の外側 (親) に付けるのがコツ */}
      <div className="relative" style={{ filter: 'drop-shadow(0 0 10px rgba(0,240,255,.45)) drop-shadow(0 0 22px rgba(255,42,109,.25))' }}>
        <div className="w-[300px] p-[1.5px]" style={{ clipPath: cut(22), background: 'linear-gradient(135deg,#00f0ff,#ff2a6d)' }}>
          <div className="relative p-5" style={{ clipPath: cut(21.5), background: 'linear-gradient(160deg,#10112a 0%,#0a0a14 100%)' }}>
            <p className="text-[9px] tracking-[0.2em] text-[#00f0ff]/60">// ID 0x3F2A · LVL 27 · ONLINE</p>

            {/* header */}
            <div className="mt-2 flex items-center gap-3">
              <div
                className="grid h-[52px] w-[52px] place-items-center p-[2px]"
                style={{ clipPath: 'polygon(25% 3%, 75% 3%, 100% 50%, 75% 97%, 25% 97%, 0 50%)', background: 'linear-gradient(135deg,#ff2a6d,#00f0ff)' }}
              >
                <div
                  className="grid h-full w-full place-items-center bg-[#0d0d1a] text-sm font-bold text-[#fcee0a]"
                  style={{ clipPath: 'polygon(25% 3%, 75% 3%, 100% 50%, 75% 97%, 25% 97%, 0 50%)', fontFamily: 'Orbitron, sans-serif' }}
                >
                  MS
                </div>
              </div>
              <div>
                <p
                  data-text="MIKA_SATO"
                  className="cp-glitch text-[21px] font-black tracking-[0.06em] text-white"
                  style={{ fontFamily: 'Orbitron, sans-serif', textShadow: '0 0 8px rgba(0,240,255,.8)' }}
                >
                  MIKA_SATO
                </p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#ff2a6d]">Data Runner · Sector 07</p>
              </div>
            </div>

            {/* stats */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                ['REP', '128'],
                ['LINKS', '2.4K'],
                ['NODES', '312'],
              ].map(([label, value]) => (
                <div key={label} className="border-l-2 border-[#00f0ff]/70 bg-[#00f0ff]/5 px-2 py-1">
                  <p className="text-[8px] tracking-[0.2em] text-[#ff2a6d]">{label}</p>
                  <p className="text-[15px] font-bold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {/* angular toggle */}
            <div className="mt-3.5 flex items-center justify-between">
              <span className="text-[10px] tracking-[0.2em]">STEALTH_MODE</span>
              <button
                role="switch"
                aria-checked={stealth}
                aria-label="Stealth mode"
                onClick={() => setStealth((v) => !v)}
                className="relative h-6 w-14 -skew-x-12 border border-[#00f0ff]/60 p-[2px] transition-colors"
                style={{ background: stealth ? 'rgba(252,238,10,.12)' : 'transparent' }}
              >
                <motion.span
                  className="block h-full w-6"
                  animate={{
                    x: stealth ? 26 : 0,
                    backgroundColor: stealth ? '#fcee0a' : '#2a2d45',
                    boxShadow: stealth ? '0 0 12px rgba(252,238,10,.9)' : '0 0 0px rgba(252,238,10,0)',
                  }}
                  transition={{ type: 'spring', stiffness: 700, damping: 30 }}
                />
              </button>
            </div>

            {/* segmented signal slider */}
            <div className="mt-3">
              <div className="mb-1.5 flex justify-between text-[10px] tracking-[0.2em]">
                <span>SIGNAL</span>
                <span className="text-[#fcee0a]">{String(signal).padStart(3, '0')}%</span>
              </div>
              <div className="relative h-3.5">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={signal}
                  onChange={(e) => setSignal(Number(e.target.value))}
                  aria-label="Signal"
                  className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                />
                <div className="flex h-full gap-[3px]">
                  {Array.from({ length: segments }, (_, i) => {
                    const color = i < 8 ? '#00f0ff' : i < 13 ? '#fcee0a' : '#ff2a6d'
                    const on = i < lit
                    return (
                      <span
                        key={i}
                        className="flex-1 -skew-x-[20deg] transition-colors duration-75"
                        style={{ background: on ? color : '#1f2233', boxShadow: on ? `0 0 6px ${color}` : 'none' }}
                      />
                    )
                  })}
                </div>
              </div>
            </div>

            {/* terminal input */}
            <label className="mt-3.5 flex h-8 items-center gap-2 border-b border-[#00f0ff]/50 bg-[#00f0ff]/5 px-2 focus-within:border-[#fcee0a]">
              <span className="text-[#ff2a6d]">&gt;</span>
              <input
                placeholder="enter_status_"
                className="cp-input h-full flex-1 bg-transparent text-xs text-[#d1f7ff] outline-none"
                style={{ caretColor: '#fcee0a' }}
              />
            </label>

            {/* buttons */}
            <div className="mt-4 grid grid-cols-2 gap-3 text-[11px] font-bold tracking-[0.18em]" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              <button onClick={() => setFollowing((f) => !f)} className="cp-btn-primary h-9">
                {following ? 'LINKED' : 'FOLLOW'}
              </button>
              <button className="cp-btn-ghost h-9">
                <span>MESSAGE</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="cp-scan pointer-events-none absolute inset-0" />
    </div>
  )
}
