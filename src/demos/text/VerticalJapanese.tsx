import { useState } from 'react'
import { motion } from 'motion/react'
import { RotateCcw } from 'lucide-react'

const TITLE = '春はあけぼの'
const BODY = ['やうやう白くなりゆく山ぎは、', '少しあかりて、', '紫だちたる雲の', 'ほそくたなびきたる。']
const MINCHO = '"Yu Mincho", "YuMincho", "Hiragino Mincho ProN", "Noto Serif JP", serif'
const STEP = 0.06
const TOTAL = Array.from(TITLE + BODY.join('')).length

// 和紙っぽいノイズ(SVG feTurbulence を data URI で)
const PAPER =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.09'/%3E%3C/svg%3E\")"

function Char({ c, i }: { c: string; i: number }) {
  return (
    <motion.span
      className="inline-block"
      initial={{ opacity: 0, y: -14, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ delay: 0.2 + i * STEP, duration: 0.7, ease: 'easeOut' }}
    >
      {c}
    </motion.span>
  )
}

/**
 * writing-mode: vertical-rl の縦書き + 1文字ずつのフェードイン + 落款スタンプ。
 * 縦書きでは flex-col が「右→左」に段を並べる軸になる点に注意。
 */
export function VerticalJapanese() {
  const [run, setRun] = useState(0)
  let n = 0

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#f3ecdf]" style={{ backgroundImage: PAPER }}>
      <div
        key={run}
        className="flex h-full flex-col items-start justify-center gap-6 px-6 py-6 text-[#2b2118]"
        style={{ writingMode: 'vertical-rl', fontFamily: MINCHO }}
      >
        <h3 className="text-[28px] font-semibold tracking-[0.3em]">
          {Array.from(TITLE).map((c) => (
            <Char key={n} c={c} i={n++} />
          ))}
        </h3>
        <div className="flex flex-col gap-2 pt-10 text-[15px] leading-[2] tracking-[0.2em]">
          {BODY.map((line) => (
            <p key={line}>
              {Array.from(line).map((c) => (
                <Char key={n} c={c} i={n++} />
              ))}
            </p>
          ))}
        </div>
        <motion.div
          className="self-end rounded-[3px] border-2 border-[#c0392b] px-1 py-1.5 text-[13px] font-bold leading-tight tracking-[0.1em] text-[#c0392b] mix-blend-multiply"
          initial={{ opacity: 0, scale: 2.4, rotate: -25 }}
          animate={{ opacity: 0.9, scale: 1, rotate: -6 }}
          transition={{ delay: 0.4 + TOTAL * STEP, type: 'spring', stiffness: 420, damping: 16 }}
        >
          枕草子
        </motion.div>
      </div>
      <button
        onClick={() => setRun((r) => r + 1)}
        className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full border border-[#c9bba1] bg-[#f8f3ea] px-2.5 py-1 text-[11px] text-[#6b5a45] hover:bg-white"
      >
        <RotateCcw size={11} /> もう一度
      </button>
    </div>
  )
}
