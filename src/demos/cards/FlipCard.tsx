import { useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { RefreshCw } from 'lucide-react'

function Face({ back, children, className = '' }: { back?: boolean; children: ReactNode; className?: string }) {
  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center rounded-2xl p-4 text-center [backface-visibility:hidden] ${className}`}
      style={back ? { transform: 'rotateY(180deg)' } : undefined}
    >
      {children}
    </div>
  )
}

/**
 * 左: CSS のみ(group-hover で rotateY(180deg) + transition)
 * 右: Motion(クリックで animate={{ rotateY }} をスプリング)
 * どちらも親に perspective、本体に transform-style: preserve-3d、各面に backface-visibility: hidden。
 */
export function FlipCard() {
  const [flipped, setFlipped] = useState(false)

  return (
    <div className="relative flex h-full w-full items-center justify-center gap-6 overflow-hidden bg-gradient-to-br from-sky-50 to-indigo-100 text-zinc-800">
      {/* CSS hover flip */}
      <div className="flex flex-col items-center gap-2">
        <div className="group h-[200px] w-[150px] [perspective:800px]">
          <div className="relative h-full w-full transition-transform duration-700 ease-[cubic-bezier(.2,.8,.2,1)] [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
            <Face className="bg-white shadow-xl shadow-indigo-200">
              <span className="text-[10px] uppercase tracking-[0.25em] text-indigo-400">漢字</span>
              <span className="my-2 text-7xl font-black">桜</span>
              <span className="text-xs text-zinc-400">hover で答え</span>
            </Face>
            <Face back className="bg-indigo-600 text-white shadow-xl shadow-indigo-300">
              <span className="text-xs text-indigo-200">さくら / sakura</span>
              <span className="my-2 text-2xl font-bold">cherry blossom</span>
              <span className="text-[11px] text-indigo-200">桜が満開です。</span>
            </Face>
          </div>
        </div>
        <span className="font-mono text-[10px] text-zinc-500">hover · CSS</span>
      </div>

      {/* Motion click flip */}
      <div className="flex flex-col items-center gap-2">
        <div className="h-[200px] w-[150px]" style={{ perspective: 800 }}>
          <motion.div
            role="button"
            tabIndex={0}
            aria-pressed={flipped}
            onClick={() => setFlipped((f) => !f)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setFlipped((f) => !f)
              }
            }}
            className="relative h-full w-full cursor-pointer outline-none"
            style={{ transformStyle: 'preserve-3d' }}
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18 }}
          >
            <Face className="bg-white shadow-xl shadow-rose-200">
              <span className="text-[10px] uppercase tracking-[0.25em] text-rose-400">漢字</span>
              <span className="my-2 text-7xl font-black">夢</span>
              <span className="flex items-center gap-1 text-xs text-zinc-400">
                <RefreshCw size={11} /> click
              </span>
            </Face>
            <Face back className="bg-rose-500 text-white shadow-xl shadow-rose-300">
              <span className="text-xs text-rose-100">ゆめ / yume</span>
              <span className="my-2 text-2xl font-bold">dream</span>
              <span className="text-[11px] text-rose-100">夢を見ました。</span>
            </Face>
          </motion.div>
        </div>
        <span className="font-mono text-[10px] text-zinc-500">click · Motion spring</span>
      </div>
    </div>
  )
}
