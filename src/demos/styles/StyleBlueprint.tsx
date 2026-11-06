import { useState } from 'react'
import { motion } from 'motion/react'

/**
 * Blueprint(青焼き・製図)
 * 濃い青地に 10px / 50px の二重方眼、白い細線だけで描く。
 * 寸法線(矢印 + 数値)、中心線(一点鎖線)、引き出し線の注記、右下の表題欄(図番・縮尺)。
 * フォントは等幅。ボタン等も「図面上の部品」として輪郭線のみで描く。
 */
const BLUE = '#0d3b7a'
const LINE = 'rgba(255,255,255,0.92)'
const MONO = '"JetBrains Mono", ui-monospace, monospace'

function Dim({ className, label, vertical }: { className: string; label: string; vertical?: boolean }) {
  return (
    <div className={`pointer-events-none absolute flex items-center ${vertical ? 'flex-col' : ''} ${className}`} style={{ color: LINE }}>
      <span className={vertical ? 'h-1.5 w-2 border-t border-white' : 'h-2 w-1.5 border-l border-white'} />
      <span className={`relative ${vertical ? 'w-px flex-1 bg-white/80' : 'h-px flex-1 bg-white/80'}`}>
        <span
          className={`absolute whitespace-nowrap bg-[#0d3b7a] px-1 text-[9px] ${vertical ? 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90' : 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'}`}
        >
          {label}
        </span>
      </span>
      <span className={vertical ? 'h-1.5 w-2 border-b border-white' : 'h-2 w-1.5 border-r border-white'} />
    </div>
  )
}

export function StyleBlueprint() {
  const [notify, setNotify] = useState(true)
  const [volume, setVolume] = useState(45)
  const [following, setFollowing] = useState(false)

  return (
    <div
      className="relative h-full w-full overflow-hidden text-white"
      style={{
        fontFamily: MONO,
        backgroundColor: BLUE,
        backgroundImage:
          'linear-gradient(rgba(255,255,255,.22) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.22) 1px, transparent 1px), linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)',
        backgroundSize: '50px 50px, 50px 50px, 10px 10px, 10px 10px',
        backgroundPosition: '-1px -1px',
      }}
    >
      {/* vignette like a blueprint print */}
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,10,40,.55) 100%)' }} />
      {/* center lines */}
      <div className="absolute inset-x-0 top-1/2 h-px" style={{ backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,.45) 0 18px, transparent 18px 22px, rgba(255,255,255,.45) 22px 25px, transparent 25px 29px)', backgroundSize: '29px 1px' }} />
      <div className="absolute inset-y-0 left-1/2 w-px" style={{ backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,.45) 0 18px, transparent 18px 22px, rgba(255,255,255,.45) 22px 25px, transparent 25px 29px)', backgroundSize: '1px 29px' }} />

      <div className="absolute left-1/2 top-1/2 w-[270px] -translate-x-1/2 -translate-y-1/2">
        <Dim className="-top-6 left-0 right-0" label="270.00" />
        <Dim className="-left-7 bottom-0 top-0 w-2" label="R 8 · 300.00" vertical />

        <div className="relative rounded-[8px] border-[1.5px] border-white p-4" style={{ background: 'rgba(13,59,122,.85)' }}>
          {/* corner crosshairs */}
          {['-left-2 -top-2', '-right-2 -top-2', '-bottom-2 -left-2', '-bottom-2 -right-2'].map((p) => (
            <span key={p} className={`absolute ${p} h-4 w-4`}>
              <span className="absolute left-1/2 top-0 h-full w-px bg-white/70" />
              <span className="absolute left-0 top-1/2 h-px w-full bg-white/70" />
            </span>
          ))}
          <div className="flex items-center gap-3">
            <div className="relative grid h-12 w-12 place-items-center rounded-full border-[1.5px] border-white text-[13px]">
              MS
              <span className="absolute -right-1 top-1/2 h-px w-3 bg-white/60" />
            </div>
            <div className="min-w-0">
              <p className="text-[16px] font-bold uppercase tracking-[0.12em]">Mika Sato</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/70">Part No. PD-0042</p>
            </div>
          </div>
          {/* leader note */}
          <div className="pointer-events-none absolute -right-[96px] top-5 hidden items-center gap-1 text-[9px] uppercase text-white/85 min-[520px]:flex">
            <span className="h-px w-10 bg-white/70" />
            <span>
              ① avatar
              <br />Ø48 circle
            </span>
          </div>

          <div className="mt-3 grid grid-cols-3 border border-dashed border-white/60 text-center text-[10px] uppercase">
            {[
              ['128', 'posts'],
              ['2.4k', 'fans'],
              ['312', 'follow'],
            ].map(([v, l], i) => (
              <div key={l} className={`py-1 ${i < 2 ? 'border-r border-dashed border-white/60' : ''}`}>
                <p className="text-[14px] font-bold">{v}</p>
                <p className="text-white/70">{l}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-wider">
            <span>② notify</span>
            <button role="switch" aria-checked={notify} aria-label="Notifications" onClick={() => setNotify((v) => !v)} className="relative h-6 w-12 rounded-full border-[1.5px] border-white">
              <motion.span
                className="absolute top-[2px] h-[16px] w-[16px] rounded-full border-[1.5px] border-white"
                style={{ backgroundImage: notify ? 'repeating-linear-gradient(45deg, #fff 0 1px, transparent 1px 4px)' : 'none' }}
                animate={{ left: notify ? 26 : 2 }}
              />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2 text-[11px] uppercase">
            <span>③ vol</span>
            <div className="relative h-5 flex-1">
              <input type="range" value={volume} onChange={(e) => setVolume(+e.target.value)} aria-label="Volume" className="absolute inset-0 z-10 w-full cursor-pointer opacity-0" />
              <div className="absolute inset-x-0 top-1/2 h-px bg-white" />
              {Array.from({ length: 11 }, (_, i) => (
                <span key={i} className="absolute top-[6px] h-2 w-px bg-white/70" style={{ left: `${i * 10}%` }} />
              ))}
              <span className="absolute top-0 h-0 w-0" style={{ left: `calc(${volume}% - 6px)`, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '9px solid #fff' }} />
            </div>
            <span className="w-8 text-right">{volume}</span>
          </div>

          <input
            placeholder="④ NOTE: ________"
            className="mt-3 h-8 w-full border-b border-dashed border-white bg-transparent text-[11px] uppercase tracking-wider text-white outline-none placeholder:text-white/50 focus:border-solid"
          />

          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] uppercase tracking-[0.15em]">
            <button
              onClick={() => setFollowing((f) => !f)}
              className="h-8 rounded border-[1.5px] border-white transition-colors hover:bg-white hover:text-[#0d3b7a]"
              style={following ? { background: '#fff', color: BLUE } : undefined}
            >
              {following ? '✓ following' : 'follow'}
            </button>
            <button className="h-8 rounded border-[1.5px] border-dashed border-white transition-colors hover:border-solid">message</button>
          </div>
        </div>
      </div>

      {/* title block */}
      <div className="absolute bottom-3 right-3 grid grid-cols-2 border border-white text-[8px] uppercase leading-tight text-white/90">
        <span className="border-b border-r border-white px-1.5 py-0.5">dwg no.</span>
        <span className="border-b border-white px-1.5 py-0.5">UI-PROFILE-07</span>
        <span className="border-r border-white px-1.5 py-0.5">scale</span>
        <span className="px-1.5 py-0.5">1 : 1</span>
      </div>
    </div>
  )
}
