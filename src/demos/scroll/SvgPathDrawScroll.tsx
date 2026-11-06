import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, MotionPathPlugin, useGSAP)

/**
 * スクロールで道(SVGパス)が描かれ、アイコンがその上を進むロードマップ。
 *  - DrawSVGPlugin: drawSVG "0%" → "100%" でパスを描画
 *  - MotionPathPlugin: motionPath { path, align, autoRotate } でロケットをパスに沿わせる
 *  - path.getPointAtLength でマイルストーン位置を求め、通過タイミングでポップイン
 * すべて ScrollTrigger(scroller = カード内のスクロール要素, scrub)で同期。
 */

const D = 'M 40 250 C 130 250, 120 70, 230 80 S 330 260, 420 230 S 520 60, 600 80 S 690 210, 720 150'
const MILESTONES = [
  { f: 0.0, label: 'Kickoff', jp: '4月' },
  { f: 0.3, label: 'Prototype', jp: '6月' },
  { f: 0.58, label: 'Beta', jp: '9月' },
  { f: 0.82, label: 'Launch', jp: '12月' },
  { f: 1, label: 'v2', jp: '翌春' },
]

export function SvgPathDrawScroll() {
  const root = useRef<HTMLDivElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const path = useRef<SVGPathElement>(null)

  useGSAP(
    () => {
      const p = path.current!
      const len = p.getTotalLength()
      const ms = gsap.utils.toArray<SVGGElement>('.ms', root.current)
      ms.forEach((g, i) => {
        const pt = p.getPointAtLength(len * MILESTONES[i].f)
        gsap.set(g, { x: pt.x, y: pt.y })
      })
      gsap.set('.ms-inner', { scale: (i) => (i === 0 ? 1 : 0), transformOrigin: '50% 50%' })
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: track.current!, scroller: scroller.current!, start: 'top top', end: 'bottom bottom', scrub: 0.6 },
      })
      tl.fromTo('.road-draw', { drawSVG: '0%' }, { drawSVG: '100%', duration: 1 }, 0)
      tl.to('.rocket', { duration: 1, immediateRender: true, motionPath: { path: p, align: p, alignOrigin: [0.5, 0.5], autoRotate: true } }, 0)
      ms.slice(1).forEach((g, j) => {
        const i = j + 1
        tl.to(g.querySelector('.ms-inner'), { scale: 1, duration: 0.06, ease: 'back.out(3)' }, Math.max(0, MILESTONES[i].f - 0.03))
      })
    },
    { scope: root },
  )

  return (
    <div ref={root} className="relative h-full w-full overflow-hidden bg-[#0b1020] text-white">
      <div ref={scroller} className="thin-scroll absolute inset-0 overflow-y-auto [container-type:size]">
        <div ref={track} className="relative h-[400cqh]">
          <div className="sticky top-0 flex h-[100cqh] flex-col justify-center px-4">
            <div className="mb-1 flex items-baseline justify-between px-2">
              <h3 className="font-['Space_Grotesk'] text-xl font-bold">Roadmap 2026</h3>
              <span className="text-xs text-slate-400">↓ スクロール</span>
            </div>
            <svg viewBox="0 0 760 320" className="w-full overflow-visible">
              <defs>
                <linearGradient id="road-g" x1="0" x2="1">
                  <stop offset="0" stopColor="#22d3ee" />
                  <stop offset=".5" stopColor="#a78bfa" />
                  <stop offset="1" stopColor="#f472b6" />
                </linearGradient>
              </defs>
              {/* グリッド */}
              {Array.from({ length: 9 }, (_, i) => (
                <line key={i} x1={i * 95} y1="0" x2={i * 95} y2="320" stroke="#1e293b" strokeDasharray="2 6" />
              ))}
              <path d={D} fill="none" stroke="#1e293b" strokeWidth="14" strokeLinecap="round" />
              <path d={D} fill="none" stroke="#334155" strokeWidth="2" strokeDasharray="6 10" />
              <path ref={path} className="road-draw" d={D} fill="none" stroke="url(#road-g)" strokeWidth="6" strokeLinecap="round" />
              {MILESTONES.map((m, i) => (
                <g key={m.label} className="ms">
                  <g className="ms-inner">
                    <circle r="11" fill="#0b1020" stroke="#e2e8f0" strokeWidth="3" />
                    <circle r="4" fill="#f472b6" />
                    <text y={i % 2 ? 34 : -22} textAnchor="middle" fill="#f1f5f9" fontSize="15" fontWeight="700" fontFamily="Space Grotesk">
                      {m.label}
                    </text>
                    <text y={i % 2 ? 50 : -38} textAnchor="middle" fill="#94a3b8" fontSize="11">
                      {m.jp}
                    </text>
                  </g>
                </g>
              ))}
              <g className="rocket">
                <path d="M -14 -8 L 14 0 L -14 8 L -8 0 Z" fill="#fde047" stroke="#0b1020" strokeWidth="1.5" />
              </g>
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
