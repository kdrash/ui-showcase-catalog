import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

const EN = ['beautiful', 'blazing fast', 'accessible', 'delightful']
const JA = ['たのしく', 'シンプルに', '美しく', 'やさしく']

/**
 * 1) 単語が下からぼかし付きで入れ替わり、黒いピルの幅は計測用 span で測って animate={{ width }}
 * 2) 日本語は1文字ずつ rotateX でめくれる
 */
export function RotatingWords() {
  const [i, setI] = useState(0)
  const sizerRef = useRef<HTMLSpanElement>(null)
  const [width, setWidth] = useState<number | 'auto'>('auto')
  const en = EN[i % EN.length]
  const ja = JA[i % JA.length]

  useEffect(() => {
    const id = setInterval(() => setI((n) => n + 1), 2400)
    return () => clearInterval(id)
  }, [])

  useLayoutEffect(() => {
    const measure = () => sizerRef.current && setWidth(sizerRef.current.offsetWidth)
    measure()
    document.fonts?.ready.then(measure)
  }, [en])

  return (
    <div className="@container relative grid h-full w-full place-items-center overflow-hidden bg-[#fafaf9] p-6 text-zinc-900">
      <div className="w-full max-w-xl">
        <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.3em] text-zinc-400">Rotating words</p>

        <h3 className="text-[clamp(24px,6.5cqw,44px)] font-semibold leading-[1.15] tracking-tight">
          Make your product{' '}
          <motion.span
            animate={{ width }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            className="relative inline-block h-[1.25em] overflow-hidden rounded-xl bg-zinc-900 align-bottom text-white"
          >
            <span ref={sizerRef} aria-hidden className="invisible absolute whitespace-nowrap px-3">
              {en}
            </span>
            <AnimatePresence initial={false}>
              <motion.span
                key={en}
                initial={{ y: '100%', opacity: 0, filter: 'blur(6px)' }}
                animate={{ y: '0%', opacity: 1, filter: 'blur(0px)' }}
                exit={{ y: '-100%', opacity: 0, filter: 'blur(6px)' }}
                transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                className="absolute left-0 top-0 whitespace-nowrap px-3"
              >
                {en}
              </motion.span>
            </AnimatePresence>
          </motion.span>
        </h3>

        <h3 className="mt-4 text-[clamp(20px,5cqw,34px)] font-black tracking-tight" style={{ perspective: 600 }}>
          毎日を、もっと
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={ja} className="inline-block text-indigo-600">
              {Array.from(ja).map((c, k) => (
                <motion.span
                  key={k}
                  className="inline-block origin-bottom"
                  initial={{ rotateX: 90, opacity: 0, y: 8 }}
                  animate={{ rotateX: 0, opacity: 1, y: 0 }}
                  exit={{ rotateX: -90, opacity: 0, y: -8 }}
                  transition={{ delay: k * 0.05, duration: 0.3 }}
                >
                  {c}
                </motion.span>
              ))}
            </motion.span>
          </AnimatePresence>
          。
        </h3>
      </div>
    </div>
  )
}
