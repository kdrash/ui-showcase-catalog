import { useState } from 'react'
import { motion } from 'motion/react'

/**
 * Art Deco・ラグジュアリー
 * 黒 #0b0b0b × ゴールド(#f6e27a→#d4af37→#9c7a1c の金属グラデ)。左右対称、
 * 扇形のサンバースト(repeating-conic-gradient)、段々になった角の二重枠、菱形のオーナメント、
 * Playfair Display の大文字 + 広い字間。動きは光沢がすっと走る程度に上品に。
 */
const GOLD = 'linear-gradient(135deg,#f6e27a 0%,#d4af37 40%,#9c7a1c 60%,#f6e27a 100%)'
const GOLD_SOLID = '#d4af37'
const SERIF = '"Playfair Display", "Didot", serif'

const KF = `@keyframes deco-shine { from { transform: translateX(-120%) skewX(-20deg); } to { transform: translateX(260%) skewX(-20deg); } }`

function Diamond({ className = '' }: { className?: string }) {
  return <span className={`inline-block h-2 w-2 rotate-45 ${className}`} style={{ background: GOLD }} />
}

export function StyleArtDeco() {
  const [notify, setNotify] = useState(true)
  const [volume, setVolume] = useState(66)
  const [following, setFollowing] = useState(false)

  return (
    <div className="relative grid h-full w-full place-items-center overflow-hidden" style={{ background: '#0b0b0b', fontFamily: SERIF, color: '#f3e7c4' }}>
      <style>{KF}</style>
      {/* background pattern: fans */}
      <div
        className="absolute inset-0 opacity-[0.13]"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 100%, transparent 18px, ${GOLD_SOLID} 19px, ${GOLD_SOLID} 20px, transparent 21px, transparent 30px, ${GOLD_SOLID} 31px, ${GOLD_SOLID} 32px, transparent 33px)`,
          backgroundSize: '64px 32px',
        }}
      />
      {/* sunburst behind card */}
      <div
        className="absolute left-1/2 top-[8%] h-[300px] w-[300px] -translate-x-1/2 rounded-full opacity-50"
        style={{ background: `repeating-conic-gradient(from 270deg at 50% 50%, ${GOLD_SOLID} 0deg 2deg, transparent 2deg 10deg)`, maskImage: 'radial-gradient(circle, #000 20%, transparent 70%)' }}
      />

      <div className="relative w-[290px] p-[6px]" style={{ background: GOLD, clipPath: 'polygon(14px 0, calc(100% - 14px) 0, 100% 14px, 100% calc(100% - 14px), calc(100% - 14px) 100%, 14px 100%, 0 calc(100% - 14px), 0 14px)' }}>
        <div className="relative p-[2px]" style={{ background: '#0b0b0b', clipPath: 'polygon(11px 0, calc(100% - 11px) 0, 100% 11px, 100% calc(100% - 11px), calc(100% - 11px) 100%, 11px 100%, 0 calc(100% - 11px), 0 11px)' }}>
          <div className="relative overflow-hidden px-5 pb-4 pt-4" style={{ outline: `1px solid ${GOLD_SOLID}`, outlineOffset: -6 }}>
            {/* stepped top ornament */}
            <div className="flex flex-col items-center">
              <div className="flex items-end gap-[3px]">
                {[10, 18, 26, 18, 10].map((h, i) => (
                  <span key={i} className="w-[6px]" style={{ height: h, background: GOLD }} />
                ))}
              </div>
              <div className="relative mt-2 grid h-16 w-16 place-items-center rounded-full p-[2px]" style={{ background: GOLD }}>
                <div className="grid h-full w-full place-items-center rounded-full bg-[#0b0b0b] text-[22px] italic" style={{ color: GOLD_SOLID }}>
                  MS
                </div>
              </div>
              <p
                className="mt-2 bg-clip-text text-[22px] font-bold uppercase tracking-[0.28em] text-transparent"
                style={{ backgroundImage: GOLD }}
              >
                Mika Sato
              </p>
              <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.45em] text-[#cbb67a]">
                <Diamond /> Designer <Diamond />
              </p>
            </div>

            <div className="mt-3 grid grid-cols-3 border-y text-center" style={{ borderColor: GOLD_SOLID }}>
              {[
                ['128', 'Posts'],
                ['2.4K', 'Patrons'],
                ['312', 'Follows'],
              ].map(([v, l], i) => (
                <div key={l} className="py-1.5" style={{ borderRight: i < 2 ? `1px solid ${GOLD_SOLID}55` : undefined }}>
                  <p className="text-[17px] font-bold" style={{ color: '#f6e27a' }}>
                    {v}
                  </p>
                  <p className="text-[8px] uppercase tracking-[0.3em] text-[#b39a5a]">{l}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-[0.3em]">
              <span>Notices</span>
              <button role="switch" aria-checked={notify} aria-label="Notifications" onClick={() => setNotify((v) => !v)} className="relative h-6 w-12" style={{ border: `1px solid ${GOLD_SOLID}` }}>
                <motion.span className="absolute top-[3px] h-4 w-4 rotate-45" style={{ background: notify ? GOLD : '#3a3320' }} animate={{ left: notify ? 26 : 4 }} />
              </button>
            </div>

            <div className="relative mt-3 h-4">
              <input type="range" value={volume} onChange={(e) => setVolume(+e.target.value)} aria-label="Volume" className="absolute inset-0 z-10 w-full cursor-pointer opacity-0" />
              <div className="absolute inset-x-0 top-1/2 h-px" style={{ background: `${GOLD_SOLID}66` }} />
              <div className="absolute left-0 top-1/2 h-[3px] -translate-y-px" style={{ width: `${volume}%`, background: GOLD }} />
              <span className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rotate-45" style={{ left: `calc(${volume}% - ${volume * 0.12}px)`, background: GOLD, boxShadow: '0 0 10px rgba(246,226,122,.6)' }} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => setFollowing((f) => !f)} className="relative h-9 overflow-hidden text-[11px] font-bold uppercase tracking-[0.3em] text-[#0b0b0b]" style={{ background: GOLD }}>
                <span className="absolute inset-y-0 left-0 w-8 bg-white/50" style={{ animation: 'deco-shine 3.2s ease-in-out infinite' }} />
                <span className="relative">{following ? 'Member' : 'Follow'}</span>
              </button>
              <button className="h-9 text-[11px] uppercase tracking-[0.3em] text-[#f6e27a] transition-colors hover:bg-[#d4af37]/10" style={{ border: `1px solid ${GOLD_SOLID}` }}>
                Invite
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
