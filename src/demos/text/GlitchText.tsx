/* CSS のみのグリッチ。data-text を ::before/::after で複製し、clip-path をコマ送りでずらす */
const css = `
.gl-root{container-type:inline-size;background:#06060b}
.gl-scan{pointer-events:none;background:repeating-linear-gradient(to bottom,rgba(255,255,255,.035) 0 1px,transparent 1px 3px)}
.gl-text{position:relative;display:inline-block;font-family:Orbitron,sans-serif;font-weight:900;font-size:clamp(40px,16cqw,104px);letter-spacing:.06em;line-height:1;color:#fff;
  text-shadow:.04em 0 0 rgba(255,0,80,.75),-.03em -.02em 0 rgba(0,255,255,.75),.02em .03em 0 rgba(120,0,255,.6);animation:gl-shadow 2s steps(1) infinite}
.gl-text::before,.gl-text::after{content:attr(data-text);position:absolute;inset:0;background:#06060b;overflow:hidden}
.gl-text::before{left:3px;text-shadow:-3px 0 #ff00c8;animation:gl-clip1 2.8s infinite linear alternate-reverse}
.gl-text::after{left:-3px;text-shadow:-3px 0 #00fff9,3px 3px #ff00c8;animation:gl-clip2 2.1s infinite linear alternate-reverse}
.gl-root:hover .gl-text{animation-duration:.35s}
.gl-root:hover .gl-text::before{animation-duration:.6s}
.gl-root:hover .gl-text::after{animation-duration:.45s}
@keyframes gl-clip1{0%{clip-path:inset(20% 0 72% 0)}10%{clip-path:inset(60% 0 12% 0)}20%{clip-path:inset(40% 0 43% 0)}30%{clip-path:inset(80% 0 5% 0)}40%{clip-path:inset(10% 0 85% 0)}50%{clip-path:inset(50% 0 30% 0)}60%{clip-path:inset(70% 0 20% 0)}70%{clip-path:inset(5% 0 75% 0)}80%{clip-path:inset(35% 0 50% 0)}90%{clip-path:inset(90% 0 2% 0)}100%{clip-path:inset(25% 0 60% 0)}}
@keyframes gl-clip2{0%{clip-path:inset(65% 0 15% 0)}15%{clip-path:inset(5% 0 80% 0)}30%{clip-path:inset(45% 0 40% 0)}45%{clip-path:inset(85% 0 3% 0)}60%{clip-path:inset(15% 0 70% 0)}75%{clip-path:inset(55% 0 25% 0)}90%{clip-path:inset(30% 0 55% 0)}100%{clip-path:inset(75% 0 10% 0)}}
@keyframes gl-shadow{0%{text-shadow:.04em 0 0 rgba(255,0,80,.75),-.03em -.02em 0 rgba(0,255,255,.75),.02em .03em 0 rgba(120,0,255,.6)}
  14%{text-shadow:-.05em -.025em 0 rgba(255,0,80,.75),.025em .025em 0 rgba(0,255,255,.75),-.05em -.05em 0 rgba(120,0,255,.6)}
  49%{text-shadow:.025em .05em 0 rgba(255,0,80,.75),.05em 0 0 rgba(0,255,255,.75),0 -.05em 0 rgba(120,0,255,.6)}
  73%{text-shadow:-.025em 0 0 rgba(255,0,80,.75),-.025em -.025em 0 rgba(0,255,255,.75),-.025em -.05em 0 rgba(120,0,255,.6)}}
.gl-neon{font-family:'Noto Sans JP',sans-serif;font-weight:900;color:#ffe4f7;text-shadow:0 0 4px #fff,0 0 10px #ff2bd6,0 0 22px #ff2bd6,0 0 44px #ff2bd6;animation:gl-flicker 4s infinite}
@keyframes gl-flicker{0%,18%,22%,25%,53%,57%,100%{opacity:1}20%,24%,55%{opacity:.35;text-shadow:none}}
.gl-cut{clip-path:polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)}
`

export function GlitchText() {
  return (
    <div className="gl-root relative flex h-full w-full flex-col items-center justify-center gap-4 overflow-hidden text-center">
      <style>{css}</style>
      <div className="gl-scan absolute inset-0" />
      <p className="relative font-mono text-[10px] tracking-[0.35em] text-cyan-300/70">// SYSTEM_BREACH_DETECTED</p>
      <h3 className="gl-text" data-text="GLITCH">
        GLITCH
      </h3>
      <p className="gl-neon relative text-2xl tracking-[0.3em]">ネオン東京</p>
      <button className="gl-cut relative bg-[#fcee0a] px-6 py-2 text-xs font-black tracking-[0.25em] text-black transition hover:bg-cyan-300" style={{ fontFamily: 'Orbitron, sans-serif' }}>
        JACK IN ▸
      </button>
      <p className="absolute bottom-2 right-3 font-mono text-[9px] text-zinc-600">hover → intensify</p>
    </div>
  )
}
