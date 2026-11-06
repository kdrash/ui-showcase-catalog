/* background-clip: text を使った4種の文字エフェクト(CSSのみ) */
const css = `
.sg-root{container-type:inline-size}
.sg-line{font-size:clamp(26px,8cqw,52px);line-height:1.08;font-weight:800;letter-spacing:-.02em}
.sg-shiny{background:linear-gradient(110deg,#71717a 35%,#fafafa 50%,#71717a 65%);background-size:250% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:sg-shine 3.2s ease-in-out infinite}
@keyframes sg-shine{0%{background-position:100% 0}60%,100%{background-position:0% 0}}
.sg-flow{background:linear-gradient(90deg,#ff6ec4,#7873f5,#4ade80,#facc15,#ff6ec4);background-size:200% auto;-webkit-background-clip:text;background-clip:text;color:transparent;animation:sg-flow 5s linear infinite}
@keyframes sg-flow{from{background-position:0% center}to{background-position:200% center}}
.sg-chrome{font-style:italic;font-weight:900;background:linear-gradient(180deg,#f8fafc 0%,#cbd5e1 42%,#334155 50%,#94a3b8 53%,#e2e8f0 76%,#fff 100%);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-stroke:1px rgba(255,255,255,.35);filter:drop-shadow(0 2px 0 #1e1b4b) drop-shadow(0 0 14px rgba(167,139,250,.55))}
.sg-outline{cursor:default;color:transparent;-webkit-text-stroke:1.5px #a1a1aa;background:linear-gradient(90deg,#f472b6,#a78bfa,#38bdf8) no-repeat;background-size:0% 100%;-webkit-background-clip:text;background-clip:text;transition:background-size .7s cubic-bezier(.2,.8,.2,1),-webkit-text-stroke-color .4s}
.sg-outline:hover{background-size:100% 100%;-webkit-text-stroke-color:transparent}
`

const rows = [
  { cls: 'sg-shiny', text: 'Shiny Text', label: 'shine sweep' },
  { cls: 'sg-flow', text: 'Gradient Flow', label: 'gradient loop' },
  { cls: 'sg-chrome', text: 'CHROME 2000', label: 'y2k chrome' },
  { cls: 'sg-outline', text: 'Hover to Fill', label: 'outline → fill (hover)' },
]

export function ShinyGradientText() {
  return (
    <div className="sg-root relative flex h-full w-full flex-col justify-center gap-1.5 overflow-hidden bg-zinc-950 px-6">
      <style>{css}</style>
      <div className="pointer-events-none absolute -left-20 -top-24 size-72 rounded-full bg-violet-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 size-72 rounded-full bg-sky-500/15 blur-3xl" />
      {rows.map((r) => (
        <div key={r.cls} className="relative flex items-baseline justify-between gap-4">
          <span className={`sg-line ${r.cls}`} style={{ fontFamily: 'Inter, sans-serif' }}>
            {r.text}
          </span>
          <span className="hidden shrink-0 font-mono text-[9px] uppercase tracking-wider text-zinc-600 sm:block">{r.label}</span>
        </div>
      ))}
    </div>
  )
}
