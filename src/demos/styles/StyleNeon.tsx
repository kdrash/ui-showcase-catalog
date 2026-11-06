import { useState, type CSSProperties } from 'react'

/**
 * ネオンサイン
 * 暗いレンガ壁(repeating-linear-gradient で目地)に、発光するネオン管の文字。
 * 発光は text-shadow / box-shadow を「白い芯 → 色 → 広いにじみ」の多層で重ねる。
 * ときどきチラつく(flicker の keyframes)。スイッチで点灯/消灯、スライダーで発光の強さ。
 */
const PINK = '#ff3ea5'
const CYAN = '#3ef0ff'
const KF = `
@keyframes neon-flicker { 0%,19%,21%,23%,25%,54%,56%,100% { opacity: 1 } 20%,24%,55% { opacity: .35 } }
@keyframes neon-buzz { 0%,100% { opacity: 1 } 50% { opacity: .92 } }`

const glowText = (c: string, k: number): CSSProperties => ({
  color: '#fff5fb',
  textShadow: `0 0 ${2 * k}px #fff, 0 0 ${6 * k}px ${c}, 0 0 ${14 * k}px ${c}, 0 0 ${28 * k}px ${c}, 0 0 ${48 * k}px ${c}`,
})
const glowBox = (c: string, k: number): CSSProperties => ({
  border: `2px solid #fff`,
  boxShadow: `0 0 ${3 * k}px #fff, 0 0 ${8 * k}px ${c}, 0 0 ${18 * k}px ${c}, inset 0 0 ${8 * k}px ${c}`,
})

export function StyleNeon() {
  const [on, setOn] = useState(true)
  const [glow, setGlow] = useState(70)
  const [following, setFollowing] = useState(false)
  const k = on ? 0.4 + (glow / 100) * 1.2 : 0
  const off: CSSProperties = { color: '#4a3540', textShadow: 'none', border: '2px solid #4a3540', boxShadow: 'none' }

  return (
    <div
      className="relative grid h-full w-full place-items-center overflow-hidden"
      style={{
        fontFamily: '"Space Grotesk", Inter, sans-serif',
        backgroundColor: '#2a1612',
        backgroundImage:
          'linear-gradient(rgba(0,0,0,.55) 2px, transparent 2px), linear-gradient(90deg, rgba(0,0,0,.55) 2px, transparent 2px), linear-gradient(90deg, rgba(0,0,0,.55) 2px, transparent 2px)',
        backgroundSize: '100% 26px, 56px 52px, 56px 52px',
        backgroundPosition: '0 0, 0 0, 28px 26px',
      }}
    >
      <style>{KF}</style>
      {/* light spill on the wall */}
      <div className="pointer-events-none absolute inset-0 transition-opacity duration-500" style={{ opacity: on ? 0.55 : 0, background: `radial-gradient(ellipse at 50% 35%, ${PINK}55, transparent 60%), radial-gradient(ellipse at 50% 80%, ${CYAN}33, transparent 60%)` }} />
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,.7))' }} />

      <div className="relative flex flex-col items-center">
        <p
          className="text-[64px] leading-none"
          style={{ fontFamily: '"Segoe Script", "Brush Script MT", "Playfair Display", cursive', fontStyle: 'italic', ...(on ? glowText(PINK, k) : off), animation: on ? 'neon-flicker 4s infinite' : undefined }}
        >
          Mika
        </p>
        <p className="mt-1 text-[14px] font-bold uppercase tracking-[0.6em]" style={on ? { ...glowText(CYAN, k * 0.8), animation: 'neon-buzz .12s infinite' } : off}>
          designer
        </p>

        <div className="mt-4 flex gap-6 text-center">
          {[
            ['128', 'posts'],
            ['2.4k', 'fans'],
            ['312', 'follow'],
          ].map(([v, l]) => (
            <div key={l}>
              <p className="text-[20px] font-bold" style={on ? glowText(CYAN, k * 0.6) : off}>
                {v}
              </p>
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/50">{l}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-4">
          <button
            role="switch"
            aria-checked={on}
            aria-label="Power"
            onClick={() => setOn((v) => !v)}
            className="h-9 rounded-full px-4 text-[12px] font-bold uppercase tracking-[0.3em] transition-all"
            style={on ? { ...glowBox(CYAN, k * 0.7), ...glowText(CYAN, k * 0.5) } : off}
          >
            {on ? 'open' : 'closed'}
          </button>
          <label className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/60">
            glow
            <input type="range" value={glow} onChange={(e) => setGlow(+e.target.value)} aria-label="Glow" className="w-24 accent-[#ff3ea5]" />
          </label>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={() => setFollowing((f) => !f)}
            className="h-10 w-32 rounded-lg text-[13px] font-bold uppercase tracking-[0.25em] transition-transform active:scale-95"
            style={on ? { ...glowBox(PINK, k * 0.8), ...glowText(PINK, k * 0.5), background: following ? `${PINK}33` : 'transparent' } : off}
          >
            {following ? '♥ fan' : 'follow'}
          </button>
          <button className="h-10 w-32 rounded-lg text-[13px] font-bold uppercase tracking-[0.25em] transition-transform active:scale-95" style={on ? { ...glowBox(CYAN, k * 0.8), ...glowText(CYAN, k * 0.5) } : off}>
            message
          </button>
        </div>
      </div>
    </div>
  )
}
