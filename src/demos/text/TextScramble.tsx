import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'

gsap.registerPlugin(ScrambleTextPlugin)

const phrases = [
  { en: 'ACCESS GRANTED', ja: 'アクセスを許可しました' },
  { en: 'SYSTEM ONLINE', ja: 'システム起動完了' },
  { en: 'WELCOME, OPERATOR', ja: 'ようこそ、オペレーター' },
  { en: 'DECRYPTING DATA', ja: 'データを復号しています' },
]
const KATAKANA = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'
const nav = ['HOME', 'WORK', 'ABOUT', 'CONTACT']

/** GSAP ScrambleTextPlugin で文字をランダムに乱してから確定させる */
export function TextScramble() {
  const enRef = useRef<HTMLHeadingElement>(null)
  const jaRef = useRef<HTMLParagraphElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const [i, setI] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % phrases.length), 3400)
    return () => clearInterval(id)
  }, [])

  useLayoutEffect(() => {
    const t1 = gsap.to(enRef.current, {
      duration: 1.4,
      scrambleText: { text: phrases[i].en, chars: 'XO01<>/[]{}#*+=', revealDelay: 0.3, speed: 0.5 },
    })
    const t2 = gsap.to(jaRef.current, {
      duration: 1.6,
      delay: 0.15,
      scrambleText: { text: phrases[i].ja, chars: KATAKANA, revealDelay: 0.4, speed: 0.4 },
    })
    return () => {
      t1.kill()
      t2.kill()
    }
  }, [i])

  // ホバー中のスクランブルをアンマウント時に止める
  useEffect(() => {
    const links = navRef.current?.querySelectorAll('[data-text]')
    return () => {
      if (links) gsap.killTweensOf(links)
    }
  }, [])

  const scramble = (el: HTMLElement) =>
    gsap.to(el, {
      duration: 0.6,
      overwrite: true,
      scrambleText: { text: el.dataset.text ?? '', chars: 'upperCase', speed: 0.8 },
    })

  return (
    <div
      className="@container relative flex h-full w-full flex-col overflow-hidden bg-[#050805] p-5 text-[#4ade80]"
      style={{ fontFamily: '"JetBrains Mono", monospace' }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(to_bottom,rgba(74,222,128,.05)_0_1px,transparent_1px_3px)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,.7))]" />

      <div className="relative flex items-center justify-between border-b border-green-500/20 pb-2 text-[10px] text-green-500/60">
        <span>secure_shell — 80×24</span>
        <nav ref={navRef} className="flex gap-3">
          {nav.map((n) => (
            <a
              key={n}
              data-text={n}
              onMouseEnter={(e) => scramble(e.currentTarget)}
              className="cursor-pointer text-green-400/80 hover:text-green-300"
            >
              {n}
            </a>
          ))}
        </nav>
      </div>

      <div className="relative flex flex-1 flex-col justify-center">
        <p className="mb-2 text-[11px] text-green-500/60">&gt; ./decrypt --target=mainframe</p>
        <h3
          ref={enRef}
          className="min-h-[1.2em] text-[clamp(22px,7cqw,38px)] font-semibold tracking-wider text-green-300 [text-shadow:0_0_12px_rgba(74,222,128,.6)]"
        />
        <p ref={jaRef} className="mt-2 min-h-[1.5em] text-sm text-green-400/80" />
      </div>

      <div className="relative flex items-center gap-3 text-[10px] text-green-500/60">
        <div className="h-1 flex-1 overflow-hidden rounded bg-green-500/10">
          <div key={i} className="h-full animate-[ts-bar_3.4s_linear] bg-green-400/70" />
        </div>
        <button
          onClick={() => setI((n) => (n + 1) % phrases.length)}
          className="rounded border border-green-500/40 px-2 py-0.5 text-green-300 hover:bg-green-500/10"
        >
          NEXT ▸
        </button>
      </div>
      <style>{'@keyframes ts-bar{from{width:0}to{width:100%}}'}</style>
    </div>
  )
}
