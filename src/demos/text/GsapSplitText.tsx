import { useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { RotateCcw } from 'lucide-react'

gsap.registerPlugin(SplitText)

type Mode = 'chars' | 'words' | 'lines'

/**
 * GSAP SplitText(3.13+ で無料化)で見出しを lines / words / chars に分割し、
 * mask: 'lines' で行ごとにクリップしながら下からせり上げる。
 * autoSplit + onSplit で返したアニメーションは、フォント読込やリサイズで再分割されても引き継がれる。
 */
export function GsapSplitText() {
  const rootRef = useRef<HTMLDivElement>(null)
  const headRef = useRef<HTMLHeadingElement>(null)
  const [mode, setMode] = useState<Mode>('chars')
  const [run, setRun] = useState(0)

  useLayoutEffect(() => {
    let split: SplitText | undefined
    const ctx = gsap.context(() => {
      split = SplitText.create(headRef.current!, {
        type: 'lines,words,chars',
        mask: 'lines',
        autoSplit: true,
        onSplit(self) {
          const targets = mode === 'chars' ? self.chars : mode === 'words' ? self.words : self.lines
          return gsap.from(targets, {
            yPercent: 120,
            rotate: mode === 'chars' ? 12 : 0,
            opacity: 0,
            duration: mode === 'lines' ? 1.1 : 0.85,
            ease: 'expo.out',
            stagger: mode === 'chars' ? 0.022 : mode === 'words' ? 0.07 : 0.14,
          })
        },
      })
      gsap.from('.st-sub', { opacity: 0, y: 12, duration: 0.6, delay: 0.55, ease: 'power2.out' })
    }, rootRef)
    return () => {
      ctx.revert()
      split?.revert()
    }
  }, [mode, run])

  return (
    <div
      ref={rootRef}
      className="@container relative flex h-full w-full flex-col justify-between overflow-hidden bg-[#f4efe6] p-6 text-[#1c1917]"
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-stone-500">GSAP · SplitText · mask</p>

      <div>
        <h3
          ref={headRef}
          className="text-[clamp(30px,8.5cqw,58px)] leading-[1.02]"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Design is not just
          <br />
          <em className="text-[#b45309]">what it looks like.</em>
        </h3>
        <p className="st-sub mt-3 max-w-xs text-xs leading-relaxed text-stone-600">
          デザインとは、見た目ではなく「どう機能するか」である。
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex rounded-full border border-stone-300 p-0.5 text-[11px]">
          {(['chars', 'words', 'lines'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-full px-3 py-1 transition ${mode === m ? 'bg-stone-900 text-white' : 'text-stone-600 hover:text-stone-900'}`}
            >
              {m}
            </button>
          ))}
        </div>
        <button
          onClick={() => setRun((r) => r + 1)}
          className="grid size-7 place-items-center rounded-full border border-stone-300 text-stone-700 transition hover:rotate-[-90deg] hover:bg-white"
          aria-label="replay"
        >
          <RotateCcw size={13} />
        </button>
      </div>
    </div>
  )
}
