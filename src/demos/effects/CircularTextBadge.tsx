import { useEffect, useId, useRef } from 'react'
import { ArrowUpRight } from 'lucide-react'

const WAVE = 'Text on a path ✦ テキストが波に乗る ✦ '

/** 回転する円形テキストバッジ2種 + 波打つパスに沿って流れるテキスト(SVG textPath)。ホバーで加速 */
export function CircularTextBadge() {
  const id = useId().replace(/:/g, '')
  const rootRef = useRef<HTMLDivElement>(null)
  const b1 = useRef<SVGGElement>(null)
  const b2 = useRef<SVGGElement>(null)
  const wavePath = useRef<SVGPathElement>(null)
  const waveText = useRef<SVGTextPathElement>(null)
  const measure = useRef<SVGTextElement>(null)
  const hover = useRef({ a: false, b: false, w: false })

  useEffect(() => {
    let raf = 0
    let r1 = 0
    let r2 = 0
    let off = 0
    let t = 0
    const v = { a: 1, b: 1, w: 1 }
    const loop = () => {
      raf = requestAnimationFrame(loop)
      t += 0.016
      v.a += ((hover.current.a ? 6 : 1) - v.a) * 0.06
      v.b += ((hover.current.b ? -6 : -1) - v.b) * 0.06
      v.w += ((hover.current.w ? 4 : 1) - v.w) * 0.06
      r1 += 0.25 * v.a
      r2 += 0.3 * v.b
      const period = measure.current?.getComputedTextLength() || 400
      off -= 1.1 * v.w
      if (off < -period) off += period
      b1.current?.setAttribute('transform', `rotate(${r1} 100 100)`)
      b2.current?.setAttribute('transform', `rotate(${r2} 100 100)`)
      // 波の形自体も揺らす
      let d = 'M -20 60'
      for (let x = -20; x <= 820; x += 20) d += ` L ${x} ${(60 + Math.sin(x * 0.012 + t * 1.6) * 26 + Math.sin(x * 0.03 - t) * 6).toFixed(1)}`
      wavePath.current?.setAttribute('d', d)
      waveText.current?.setAttribute('startOffset', String(off))
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [])

  const circle = 'M 100,100 m -72,0 a 72,72 0 1,1 144,0 a 72,72 0 1,1 -144,0'

  return (
    <div ref={rootRef} className="relative flex h-full w-full flex-col overflow-hidden bg-[#f3efe6]">
      <div className="flex flex-1 items-center justify-center gap-[8%] pt-3">
        {/* モダンなバッジ */}
        <div
          className="relative aspect-square h-[min(62%,180px)] cursor-pointer"
          onPointerEnter={() => (hover.current.a = true)}
          onPointerLeave={() => (hover.current.a = false)}
        >
          <svg viewBox="0 0 200 200" className="h-full w-full">
            <defs>
              <path id={`c1-${id}`} d={circle} />
            </defs>
            <circle cx="100" cy="100" r="96" fill="#111" />
            <g ref={b1}>
              <text fill="#f3efe6" fontSize="15.5" fontFamily="Space Grotesk" fontWeight="700" letterSpacing="3.2">
                <textPath href={`#c1-${id}`}>AVAILABLE FOR WORK • 2026 • SAY HELLO • </textPath>
              </text>
            </g>
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-[#d4ff3f] text-black transition-transform duration-300 hover:rotate-45">
              <ArrowUpRight size={26} strokeWidth={2.5} />
            </span>
          </div>
        </div>
        {/* 和風の落款風バッジ */}
        <div
          className="relative aspect-square h-[min(62%,180px)] cursor-pointer"
          onPointerEnter={() => (hover.current.b = true)}
          onPointerLeave={() => (hover.current.b = false)}
        >
          <svg viewBox="0 0 200 200" className="h-full w-full">
            <defs>
              <path id={`c2-${id}`} d={circle} />
            </defs>
            <circle cx="100" cy="100" r="96" fill="none" stroke="#b91c1c" strokeWidth="3" />
            <circle cx="100" cy="100" r="54" fill="none" stroke="#b91c1c" strokeWidth="1.5" strokeDasharray="3 4" />
            <g ref={b2}>
              <text fill="#b91c1c" fontSize="17" fontFamily="Noto Sans JP" fontWeight="700" letterSpacing="6">
                <textPath href={`#c2-${id}`}>丁寧な手仕事 ・ 創業百年 ・ 職人の技 ・ </textPath>
              </text>
            </g>
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <span className="grid h-16 w-16 place-items-center rounded-md bg-[#b91c1c] font-['Noto_Sans_JP'] text-2xl font-black text-[#f3efe6] [writing-mode:vertical-rl]">
              本物
            </span>
          </div>
        </div>
      </div>
      {/* 波に沿って流れるテキスト */}
      <div className="h-[34%] min-h-[90px] cursor-pointer" onPointerEnter={() => (hover.current.w = true)} onPointerLeave={() => (hover.current.w = false)}>
        <svg viewBox="0 0 800 120" preserveAspectRatio="none" className="h-full w-full overflow-visible">
          <path ref={wavePath} id={`w-${id}`} d="M -20 60 L 820 60" fill="none" stroke="#111" strokeOpacity=".12" strokeWidth="34" strokeLinecap="round" />
          <text ref={measure} fontSize="22" fontFamily="Playfair Display" fontStyle="italic" fontWeight="700" opacity="0" x="-9999">
            {WAVE}
          </text>
          <text fontSize="22" fontFamily="Playfair Display" fontStyle="italic" fontWeight="700" fill="#111">
            <textPath ref={waveText} href={`#w-${id}`}>
              {WAVE.repeat(6)}
            </textPath>
          </text>
        </svg>
      </div>
      <div className="pointer-events-none absolute top-2 left-3 font-mono text-[10px] text-stone-500">hover で加速 · SVG textPath</div>
    </div>
  )
}
