import { useEffect, useState } from 'react'
import { RotateCcw } from 'lucide-react'

/** 入力 → 停止 → 削除 → 次のフレーズ をループするタイプライター(ライブラリ不要) */
function useTypewriter(words: string[], typeMs = 95, deleteMs = 45, holdMs = 1400) {
  const [text, setText] = useState('')
  useEffect(() => {
    let w = 0
    let n = 0
    let deleting = false
    let timer: number
    const tick = () => {
      const chars = Array.from(words[w % words.length])
      if (!deleting) {
        n++
        setText(chars.slice(0, n).join(''))
        if (n >= chars.length) {
          deleting = true
          timer = window.setTimeout(tick, holdMs)
          return
        }
        timer = window.setTimeout(tick, typeMs + Math.random() * 60)
      } else {
        n--
        setText(chars.slice(0, n).join(''))
        if (n <= 0) {
          deleting = false
          w++
          timer = window.setTimeout(tick, 350)
          return
        }
        timer = window.setTimeout(tick, deleteMs)
      }
    }
    timer = window.setTimeout(tick, 400)
    return () => clearTimeout(timer)
  }, [words, typeMs, deleteMs, holdMs])
  return text
}

/** AI チャット風: 「考え中」の後、不規則なチャンクで文字が流れ込む */
function useStream(text: string, run: number) {
  const [out, setOut] = useState('')
  const [thinking, setThinking] = useState(true)
  useEffect(() => {
    const chars = Array.from(text)
    let i = 0
    let timer: number
    setOut('')
    setThinking(true)
    const step = () => {
      i = Math.min(chars.length, i + 1 + Math.floor(Math.random() * 3))
      setOut(chars.slice(0, i).join(''))
      if (i < chars.length) timer = window.setTimeout(step, 25 + Math.random() * 70)
    }
    timer = window.setTimeout(() => {
      setThinking(false)
      step()
    }, 900)
    return () => clearTimeout(timer)
  }, [text, run])
  return { out, thinking, done: out === text }
}

const PHRASES = ['開発者のために。', 'デザイナーのために。', 'すべての人のために。']
const ANSWER =
  'このカタログでは Three.js・Motion・GSAP などのライブラリで作ったカルーセル、カード、3D背景などを紹介しています。気になるUIの「プロンプト例」をコピーして、次のプロジェクトでそのまま依頼できます。'

const css = `
@keyframes tw-blink{0%,49%{opacity:1}50%,100%{opacity:0}}
.tw-caret{display:inline-block;width:3px;height:1em;margin-left:3px;vertical-align:-0.12em;background:currentColor;animation:tw-blink 1s steps(1) infinite}
.tw-block{display:inline-block;width:.55em;height:1.05em;margin-left:2px;vertical-align:-0.18em;background:#a1a1aa;animation:tw-blink .9s steps(1) infinite}
@keyframes tw-dot{0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-4px);opacity:1}}
.tw-dot{display:inline-block;width:5px;height:5px;border-radius:999px;background:#a1a1aa;animation:tw-dot 1s infinite}
`

export function Typewriter() {
  const typed = useTypewriter(PHRASES)
  const [run, setRun] = useState(0)
  const { out, thinking, done } = useStream(ANSWER, run)

  return (
    <div className="relative flex h-full w-full flex-col gap-4 overflow-hidden bg-zinc-950 p-5 text-zinc-100">
      <style>{css}</style>
      <h3 className="text-[clamp(20px,4.2vw,30px)] font-bold leading-tight tracking-tight">
        UIをつくる、
        <br />
        <span className="bg-gradient-to-r from-sky-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
          {typed}
        </span>
        <span className="tw-caret text-violet-300" />
      </h3>

      <div className="flex flex-1 flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-[13px]">
        <div className="self-end rounded-2xl rounded-br-sm bg-violet-600 px-3 py-1.5 text-white">このカタログは何？</div>
        <div className="flex gap-2">
          <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-orange-500 text-[10px] font-bold text-zinc-900">
            AI
          </span>
          <p className="leading-relaxed text-zinc-300">
            {thinking ? (
              <span className="flex h-5 items-center gap-1">
                {[0, 1, 2].map((d) => (
                  <span key={d} className="tw-dot" style={{ animationDelay: `${d * 0.15}s` }} />
                ))}
              </span>
            ) : (
              <>
                {out}
                {!done && <span className="tw-block" />}
              </>
            )}
          </p>
        </div>
        <button
          onClick={() => setRun((r) => r + 1)}
          className="mt-auto flex items-center gap-1 self-start rounded-md border border-white/10 px-2 py-1 text-[11px] text-zinc-400 hover:text-white"
        >
          <RotateCcw size={11} /> 再生成
        </button>
      </div>
    </div>
  )
}
