import { useId } from 'react'

const BLOBS = [
  { c: '#ff6b3d', x: '8%', y: '10%', s: '55%', d: '17s', a: 'gg-a' },
  { c: '#ffb3c7', x: '55%', y: '-10%', s: '60%', d: '21s', a: 'gg-b' },
  { c: '#6c5ce7', x: '40%', y: '45%', s: '65%', d: '19s', a: 'gg-c' },
  { c: '#ffd166', x: '-10%', y: '55%', s: '50%', d: '23s', a: 'gg-b' },
]

/** ゆっくり動くぼかしグラデ + feTurbulence のフィルム粒子を重ねたヒーロー */
export function GrainGradientHero() {
  const id = useId().replace(/:/g, '')
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#f4ece2] [container-type:inline-size]">
      <style>{`
        @keyframes gg-a { 0%,100% { transform: translate(0,0) scale(1) } 50% { transform: translate(18%, 22%) scale(1.15) } }
        @keyframes gg-b { 0%,100% { transform: translate(0,0) scale(1.05) } 50% { transform: translate(-20%, 15%) scale(.9) } }
        @keyframes gg-c { 0%,100% { transform: translate(0,0) rotate(0) } 50% { transform: translate(10%, -25%) rotate(40deg) } }
      `}</style>
      <div className="absolute inset-0" style={{ filter: 'blur(48px) saturate(1.2)' }}>
        {BLOBS.map((b, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: b.x,
              top: b.y,
              width: b.s,
              aspectRatio: '1',
              background: `radial-gradient(circle at 40% 40%, ${b.c}, transparent 68%)`,
              animation: `${b.a} ${b.d} ease-in-out infinite`,
            }}
          />
        ))}
      </div>
      {/* 粒子(グレイン)オーバーレイ */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.55] mix-blend-overlay">
        <filter id={`grain-${id}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain-${id})`} />
      </svg>
      <div className="relative flex h-full flex-col justify-between p-[6%] text-[#1d1a17]">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold tracking-tight">◐ grainy.studio</span>
          <span className="hidden gap-5 opacity-70 sm:flex">
            <span>Work</span>
            <span>About</span>
            <span>Contact</span>
          </span>
        </div>
        <div>
          <h2 className="max-w-[12ch] font-['Space_Grotesk'] text-[clamp(34px,9cqw,92px)] leading-[0.95] font-bold tracking-tight">
            Feel the texture.
          </h2>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[#1d1a17] px-4 py-2 text-xs font-semibold text-[#f4ece2]">Start a project</span>
            <span className="text-xs opacity-70">ざらっとした質感のグラデーション背景</span>
          </div>
        </div>
      </div>
    </div>
  )
}
