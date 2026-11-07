/**
 * オーロラ・グラデーション背景 (Pure CSS)
 * - 大きな円を filter: blur() でぼかし、mix-blend-mode: screen で重ねて光のにじみを作る
 * - @keyframes で各ブロブを別周期で移動・回転・拡縮 → 有機的に動く
 * - SVG feTurbulence のノイズを data URI で重ねてフィルム感(バンディング防止)
 * - JS なし。prefers-reduced-motion でアニメ停止
 */

const css = `
.aurora-root { background: #050816; }
.aurora-blob {
  position: absolute; border-radius: 9999px; filter: blur(60px); opacity: .75;
  mix-blend-mode: screen; will-change: transform;
}
.aurora-b1 { width: 55%; aspect-ratio: 1; left: -10%; top: -25%;
  background: radial-gradient(circle at 30% 30%, #22d3ee, transparent 65%);
  animation: aurora-a 16s ease-in-out infinite alternate; }
.aurora-b2 { width: 50%; aspect-ratio: 1; right: -12%; top: -10%;
  background: radial-gradient(circle at 60% 40%, #a855f7, transparent 65%);
  animation: aurora-b 19s ease-in-out infinite alternate; }
.aurora-b3 { width: 60%; aspect-ratio: 1; left: 20%; bottom: -45%;
  background: radial-gradient(circle at 50% 50%, #34d399, transparent 65%);
  animation: aurora-c 22s ease-in-out infinite alternate; }
.aurora-b4 { width: 35%; aspect-ratio: 1; left: 40%; top: 10%;
  background: radial-gradient(circle at 50% 50%, #f472b6, transparent 65%);
  animation: aurora-d 13s ease-in-out infinite alternate; opacity: .55; }
.aurora-noise {
  position: absolute; inset: 0; opacity: .18; mix-blend-mode: overlay; pointer-events: none;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
}
@keyframes aurora-a { to { transform: translate(35%, 25%) rotate(40deg) scale(1.2); } }
@keyframes aurora-b { to { transform: translate(-30%, 35%) rotate(-30deg) scale(.85); } }
@keyframes aurora-c { to { transform: translate(-20%, -30%) rotate(60deg) scale(1.15); } }
@keyframes aurora-d { to { transform: translate(-40%, 30%) scale(1.4); } }
@media (prefers-reduced-motion: reduce) { :root:not([data-motion=full]) .aurora-blob { animation: none; } } :root[data-motion=reduce] .aurora-blob { animation: none; }
`

export function AuroraGradient() {
  return (
    <div className="aurora-root relative h-full w-full overflow-hidden">
      <style>{css}</style>
      <div className="aurora-blob aurora-b1" />
      <div className="aurora-blob aurora-b2" />
      <div className="aurora-blob aurora-b3" />
      <div className="aurora-blob aurora-b4" />
      <div className="aurora-noise" />

      <div className="relative z-10 flex h-full flex-col items-center justify-center p-6 text-center">
        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] text-white/80 backdrop-blur">
          ✦ Pure CSS — no JavaScript
        </span>
        <h3 className="mt-4 bg-gradient-to-br from-white via-white to-white/40 bg-clip-text text-4xl font-bold tracking-tight text-transparent md:text-5xl">
          Aurora UI
        </h3>
        <p className="mt-3 max-w-sm text-sm text-white/60">
          ぼかした光のグラデーションが、ゆっくりと呼吸するように動き続けます。
        </p>
        <div className="mt-5 flex gap-3">
          <button className="rounded-full bg-white px-5 py-2 text-sm font-medium text-slate-900 shadow-lg shadow-cyan-500/20 transition hover:scale-105">
            Start free
          </button>
          <button className="rounded-full border border-white/20 bg-white/5 px-5 py-2 text-sm text-white backdrop-blur transition hover:bg-white/10">
            Learn more
          </button>
        </div>
      </div>
    </div>
  )
}
