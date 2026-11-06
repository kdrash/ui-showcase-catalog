import { useEffect, useRef, useState, type ReactNode } from 'react'
import rough from 'roughjs'
import { annotate } from 'rough-notation'
import type { Options } from 'roughjs/bin/core'

/**
 * 手描き・スケッチ風
 * Rough.js で枠・ボタン・スイッチを“ゆらいだ線”で描き、Rough Notation で名前に下線・数字に丸囲みを
 * アニメーションで描き込む。背景はノートの罫線紙、付箋、手書き系フォント。
 * ResizeObserver で要素サイズが変わるたびに枠を描き直す。
 */
const HAND = '"Segoe Print", "Bradley Hand", "Comic Sans MS", "Noto Sans JP", cursive'
const INK = '#2b2b38'

function RoughBox({
  children,
  className = '',
  options,
  shape = 'rect',
  seed = 1,
  onClick,
  as = 'div',
}: {
  children?: ReactNode
  className?: string
  options?: Options
  shape?: 'rect' | 'ellipse'
  seed?: number
  onClick?: () => void
  as?: 'div' | 'button'
}) {
  const host = useRef<HTMLElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const optKey = JSON.stringify(options ?? {})
  useEffect(() => {
    const el = host.current
    const svg = svgRef.current
    if (!el || !svg) return
    const draw = () => {
      const { width: w, height: h } = el.getBoundingClientRect()
      svg.setAttribute('width', String(w))
      svg.setAttribute('height', String(h))
      while (svg.firstChild) svg.removeChild(svg.firstChild)
      const rc = rough.svg(svg)
      const opts: Options = { stroke: INK, strokeWidth: 1.6, roughness: 1.6, bowing: 1.2, seed, ...JSON.parse(optKey) }
      svg.appendChild(shape === 'ellipse' ? rc.ellipse(w / 2, h / 2, w - 4, h - 4, opts) : rc.rectangle(3, 3, w - 6, h - 6, opts))
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(el)
    return () => ro.disconnect()
  }, [optKey, shape, seed])
  const Tag = as
  return (
    <Tag ref={host as never} onClick={onClick} className={`relative ${className}`}>
      <svg ref={svgRef} className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden />
      <span className="relative block">{children}</span>
    </Tag>
  )
}

export function StyleHandDrawn() {
  const nameRef = useRef<HTMLSpanElement>(null)
  const statRef = useRef<HTMLSpanElement>(null)
  const markRef = useRef<HTMLSpanElement>(null)
  const [notify, setNotify] = useState(true)
  const [volume, setVolume] = useState(60)
  const [following, setFollowing] = useState(false)

  useEffect(() => {
    const items = [
      nameRef.current && annotate(nameRef.current, { type: 'underline', color: '#e4572e', strokeWidth: 2.5, padding: 1, animationDuration: 900 }),
      statRef.current && annotate(statRef.current, { type: 'circle', color: '#2e86de', strokeWidth: 2, padding: 6, animationDuration: 900 }),
      markRef.current && annotate(markRef.current, { type: 'highlight', color: '#fff176', animationDuration: 700, multiline: true }),
    ].filter((a): a is NonNullable<typeof a> => !!a)
    // 手書きフォントの読み込みでレイアウトがずれるので、フォント確定後に描く
    let alive = true
    let t = 0
    document.fonts.ready.then(() => {
      if (alive) t = window.setTimeout(() => items.forEach((a) => a.show()), 250)
    })
    return () => {
      alive = false
      clearTimeout(t)
      items.forEach((a) => a.remove())
    }
  }, [])

  return (
    <div
      className="relative grid h-full w-full place-items-center overflow-hidden"
      style={{
        fontFamily: HAND,
        color: INK,
        backgroundColor: '#fdfbf4',
        backgroundImage: 'linear-gradient(90deg, transparent 46px, #f4a6a6 46px, #f4a6a6 48px, transparent 48px), repeating-linear-gradient(180deg, transparent 0 25px, #c9dcf0 25px 26px)',
      }}
    >
      {/* sticky note */}
      <div className="absolute right-5 top-5 w-28 rotate-6 p-2 text-[12px] leading-snug shadow-[2px_4px_8px_rgba(0,0,0,.15)]" style={{ background: '#fff59d' }}>
        TODO:
        <br />☐ new avatar
        <br />☑ coffee ☕
      </div>
      <svg className="absolute bottom-6 left-14 h-16 w-28 -rotate-6" viewBox="0 0 120 60" aria-hidden>
        <path d="M5 40 C 30 10, 60 60, 100 20" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M100 20 l -12 2 M100 20 l -3 11" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      </svg>

      <RoughBox className="w-[290px] -rotate-1 bg-white/70 p-5" seed={3} options={{ roughness: 2, strokeWidth: 2 }}>
        <div className="flex items-center gap-3">
          <RoughBox shape="ellipse" className="grid h-14 w-14 place-items-center text-[18px]" seed={5} options={{ fill: '#ffd6a5', fillStyle: 'hachure', hachureGap: 4 }}>
            <span className="block pt-3 text-center">MS</span>
          </RoughBox>
          <div className="relative">
            <p className="text-[22px] font-bold leading-tight">
              <span ref={nameRef}>Mika Sato</span>
            </p>
            <p className="mt-1.5 text-[13px] text-[#55556a]">product designer ✎</p>
          </div>
        </div>

        <div className="mt-4 flex justify-around text-center text-[13px]">
          <div className="relative">
            <span ref={statRef} className="text-[20px] font-bold">
              128
            </span>
            <p>posts</p>
          </div>
          <div>
            <span className="text-[20px] font-bold">2.4k</span>
            <p>fans</p>
          </div>
          <div>
            <span className="text-[20px] font-bold">312</span>
            <p>following</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-[14px]">
          <span className="relative">
            <span ref={markRef}>notifications</span>
          </span>
          <RoughBox
            as="button"
            onClick={() => setNotify((v) => !v)}
            className="h-7 w-14"
            seed={notify ? 11 : 12}
            options={{ fill: notify ? '#a5d6a7' : 'transparent', fillStyle: 'zigzag', hachureGap: 5 }}
          >
            <span className="block text-[13px] leading-7">{notify ? 'ON ✓' : 'off'}</span>
          </RoughBox>
        </div>

        <div className="mt-3 flex items-center gap-2 text-[13px]">
          <span>vol</span>
          <div className="relative h-6 flex-1">
            <input type="range" value={volume} onChange={(e) => setVolume(+e.target.value)} aria-label="Volume" className="absolute inset-0 z-10 w-full cursor-pointer opacity-0" />
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden>
              <path d="M1 13 C 20 11, 40 15, 60 12 S 90 13, 99 12" stroke={INK} strokeWidth="1.5" fill="none" vectorEffect="non-scaling-stroke" />
              <path d={`M1 13 C 20 11, 40 15, ${volume} 12`} stroke="#e4572e" strokeWidth="4" fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </svg>
            <span className="absolute top-0 text-[18px] leading-6" style={{ left: `calc(${volume}% - ${volume * 0.14}px)` }}>
              ●
            </span>
          </div>
          <span className="w-6 text-right">{volume}</span>
        </div>

        <RoughBox className="mt-3 h-9" seed={21} options={{ roughness: 1.2 }}>
          <input placeholder="write something…" className="h-9 w-full bg-transparent px-3 text-[14px] outline-none placeholder:text-[#9a9aaa]" style={{ fontFamily: HAND }} />
        </RoughBox>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <RoughBox
            as="button"
            onClick={() => setFollowing((f) => !f)}
            className="h-10 transition-transform active:scale-95"
            seed={31}
            options={{ fill: '#ffab91', fillStyle: 'cross-hatch', hachureGap: 6, fillWeight: 1 }}
          >
            <span className="block text-[15px] font-bold leading-10">{following ? 'following ♥' : 'follow!'}</span>
          </RoughBox>
          <RoughBox as="button" className="h-10 transition-transform active:scale-95" seed={41}>
            <span className="block text-[15px] leading-10">message</span>
          </RoughBox>
        </div>
      </RoughBox>
    </div>
  )
}
