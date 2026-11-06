import type { CSSProperties, ReactNode } from 'react'

const CSS = `
.ld{--c:#a78bfa;--c2:#22d3ee;position:relative;width:44px;height:44px;display:grid;place-items:center}
.ld *{box-sizing:border-box}.ld>*{position:relative}
/* 1 dots */
.ld-dots{display:flex;gap:6px}.ld-dots i{width:9px;height:9px;border-radius:50%;background:var(--c);animation:ld-bounce .9s ease-in-out infinite;animation-delay:calc(var(--i)*.12s)}
@keyframes ld-bounce{0%,100%{transform:translateY(0);opacity:.5}50%{transform:translateY(-12px);opacity:1}}
/* 2 orbit */
.ld-orbit{width:40px;height:40px;border:2px solid #ffffff1f;border-radius:50%;animation:ld-spin 1.1s linear infinite}
.ld-orbit::before{content:'';position:absolute;top:-5px;left:50%;width:9px;height:9px;margin-left:-4.5px;border-radius:50%;background:var(--c2);box-shadow:0 0 12px var(--c2)}
@keyframes ld-spin{to{transform:rotate(360deg)}}
/* 3 bars */
.ld-bars{display:flex;gap:4px;align-items:center;height:34px}.ld-bars i{width:5px;height:100%;border-radius:3px;background:linear-gradient(var(--c),var(--c2));animation:ld-eq 1s ease-in-out infinite;animation-delay:calc(var(--i)*-.18s)}
@keyframes ld-eq{0%,100%{transform:scaleY(.25)}50%{transform:scaleY(1)}}
/* 4 morph */
.ld-morph{width:30px;height:30px;background:var(--c);animation:ld-morph 2s ease-in-out infinite}
@keyframes ld-morph{0%{border-radius:4px;transform:rotate(0)}50%{border-radius:50%;transform:rotate(180deg) scale(.7);background:var(--c2)}100%{border-radius:4px;transform:rotate(360deg)}}
/* 5 gradient ring */
.ld-ring{width:40px;height:40px;border-radius:50%;background:conic-gradient(from 0deg,transparent,var(--c),var(--c2));-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 5px),#000 calc(100% - 4px));mask:radial-gradient(farthest-side,transparent calc(100% - 5px),#000 calc(100% - 4px));animation:ld-spin .9s linear infinite}
/* 6 typing */
.ld-typing{display:flex;gap:4px;padding:10px 12px;background:#27272a;border-radius:16px 16px 16px 4px}.ld-typing i{width:7px;height:7px;border-radius:50%;background:#d4d4d8;animation:ld-type 1.2s infinite;animation-delay:calc(var(--i)*.2s)}
@keyframes ld-type{0%,60%,100%{opacity:.25;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}
/* 7 dna */
.ld-dna{display:flex;gap:3px;height:34px}.ld-dna span{position:relative;width:5px;height:100%}
.ld-dna span::before,.ld-dna span::after{content:'';position:absolute;left:0;width:5px;height:5px;border-radius:50%;animation:ld-dna 1.4s ease-in-out infinite;animation-delay:calc(var(--i)*-.14s)}
.ld-dna span::before{background:var(--c);top:0}.ld-dna span::after{background:var(--c2);bottom:0;animation-direction:reverse}
@keyframes ld-dna{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(29px) scale(.6)}}
.ld-dna span::after{animation-name:ld-dna2}@keyframes ld-dna2{0%,100%{transform:translateY(0) scale(.6)}50%{transform:translateY(-29px) scale(1)}}
/* 8 ripple */
.ld-ripple i{position:absolute;inset:0;border:2px solid var(--c2);border-radius:50%;animation:ld-ripple 1.6s cubic-bezier(.2,.6,.4,1) infinite;animation-delay:calc(var(--i)*-.8s)}
@keyframes ld-ripple{0%{transform:scale(.1);opacity:1}100%{transform:scale(1);opacity:0}}
/* 9 arc */
.ld-arc{animation:ld-spin 1.4s linear infinite}.ld-arc circle{stroke:var(--c);stroke-linecap:round;animation:ld-dash 1.4s ease-in-out infinite}
@keyframes ld-dash{0%{stroke-dasharray:1 150;stroke-dashoffset:0}50%{stroke-dasharray:90 150;stroke-dashoffset:-35}100%{stroke-dasharray:90 150;stroke-dashoffset:-124}}
/* 10 grid */
.ld-grid{display:grid;grid-template-columns:repeat(3,10px);gap:3px}.ld-grid i{width:10px;height:10px;border-radius:2px;background:var(--c);animation:ld-grid 1.2s ease-in-out infinite;animation-delay:calc(var(--i)*.1s)}
@keyframes ld-grid{0%,70%,100%{transform:scale(1);opacity:1}35%{transform:scale(.2);opacity:.3}}
/* 11 flip */
.ld-flip{width:28px;height:28px;background:linear-gradient(135deg,var(--c),var(--c2));animation:ld-flip 1.6s ease-in-out infinite}
@keyframes ld-flip{0%{transform:perspective(120px) rotateX(0) rotateY(0)}50%{transform:perspective(120px) rotateX(-180deg) rotateY(0)}100%{transform:perspective(120px) rotateX(-180deg) rotateY(-180deg)}}
/* 12 clock */
.ld-clock{width:38px;height:38px;border:2px solid #e4e4e7;border-radius:50%}
.ld-clock::before,.ld-clock::after{content:'';position:absolute;left:50%;bottom:50%;width:2px;margin-left:-1px;background:#e4e4e7;border-radius:2px;transform-origin:bottom}
.ld-clock::before{height:13px;animation:ld-spin 1s linear infinite}.ld-clock::after{height:9px;animation:ld-spin 12s linear infinite}
/* 13 ball */
.ld-ball{width:40px;height:44px}.ld-ball::before{content:'';position:absolute;left:12px;top:0;width:16px;height:16px;border-radius:50%;background:var(--c2);animation:ld-ball .6s cubic-bezier(.5,0,.5,1) infinite alternate}
.ld-ball::after{content:'';position:absolute;left:10px;bottom:0;width:20px;height:4px;border-radius:50%;background:#ffffff30;animation:ld-shadow .6s cubic-bezier(.5,0,.5,1) infinite alternate}
@keyframes ld-ball{0%{transform:translateY(0)}85%{transform:translateY(24px) scale(1)}100%{transform:translateY(26px) scale(1.25,.75)}}
@keyframes ld-shadow{0%{transform:scaleX(.5);opacity:.4}100%{transform:scaleX(1.1);opacity:1}}
/* 14 line */
.ld-line{width:60px;height:4px;border-radius:4px;background:#ffffff1a;overflow:hidden}.ld-line::before{content:'';position:absolute;top:0;height:100%;width:40%;border-radius:4px;background:linear-gradient(90deg,var(--c),var(--c2));animation:ld-line 1.1s ease-in-out infinite}
@keyframes ld-line{0%{left:-40%}100%{left:100%}}
/* 15 infinity */
.ld-inf path.track{stroke:#ffffff1a}.ld-inf path.run{stroke:url(#ldg);stroke-linecap:round;stroke-dasharray:30 120;animation:ld-inf 1.6s linear infinite}
@keyframes ld-inf{to{stroke-dashoffset:-150}}
/* 16 segments */
.ld-seg{width:36px;height:36px}.ld-seg i{position:absolute;left:50%;top:0;width:3px;height:10px;margin-left:-1.5px;border-radius:2px;background:#e4e4e7;transform-origin:50% 18px;transform:rotate(calc(var(--i)*30deg));animation:ld-seg 1s linear infinite;animation-delay:calc(var(--i)*1s/12 - 1s)}
@keyframes ld-seg{0%{opacity:1}100%{opacity:.12}}
`

const n = (count: number, tag: 'i' | 'span' = 'i') =>
  Array.from({ length: count }, (_, i) => {
    const El = tag
    return <El key={i} style={{ '--i': i } as CSSProperties} />
  })

const LOADERS: [string, ReactNode][] = [
  ['バウンスドット', <div className="ld-dots">{n(3)}</div>],
  ['オービット', <div className="ld-orbit" />],
  ['イコライザー', <div className="ld-bars">{n(5)}</div>],
  ['モーフ', <div className="ld-morph" />],
  ['グラデリング', <div className="ld-ring" />],
  ['入力中…', <div className="ld-typing">{n(3)}</div>],
  ['DNA', <div className="ld-dna">{n(7, 'span')}</div>],
  ['リップル', <div className="ld-ripple h-full w-full">{n(2)}</div>],
  ['アーク', (
    <svg className="ld-arc" width="40" height="40" viewBox="0 0 50 50">
      <circle cx="25" cy="25" r="20" fill="none" strokeWidth="4" />
    </svg>
  )],
  ['グリッド', <div className="ld-grid">{n(9)}</div>],
  ['フリップ', <div className="ld-flip" />],
  ['時計', <div className="ld-clock" />],
  ['ボール', <div className="ld-ball" />],
  ['ライン', <div className="ld-line" />],
  ['インフィニティ', (
    <svg className="ld-inf" width="56" height="28" viewBox="0 0 56 28" fill="none" strokeWidth="3.5">
      <defs>
        <linearGradient id="ldg" x1="0" x2="1">
          <stop offset="0" stopColor="#a78bfa" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <path className="track" d="M28 14c-6-8-11-11-16-11a11 11 0 0 0 0 22c5 0 10-3 16-11s11-11 16-11a11 11 0 0 1 0 22c-5 0-10-3-16-11z" pathLength="150" />
      <path className="run" d="M28 14c-6-8-11-11-16-11a11 11 0 0 0 0 22c5 0 10-3 16-11s11-11 16-11a11 11 0 0 1 0 22c-5 0-10-3-16-11z" pathLength="150" />
    </svg>
  )],
  ['セグメント', <div className="ld-seg">{n(12)}</div>],
]

export function SpinnerCollection() {
  return (
    <div className="relative h-full w-full overflow-auto bg-[radial-gradient(circle_at_30%_0%,#1e1b4b,#09090b_60%)] p-4 text-zinc-300">
      <style>{CSS}</style>
      <div className="grid grid-cols-4 gap-2">
        {LOADERS.map(([label, el]) => (
          <div
            key={label}
            className="group flex h-[84px] flex-col items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] transition hover:border-violet-400/30 hover:bg-white/[0.06]"
          >
            <div className="ld">{el}</div>
            <div className="text-[10px] tracking-wide text-zinc-500 group-hover:text-zinc-300">{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
