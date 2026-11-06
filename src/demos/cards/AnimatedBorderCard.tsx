import { useId } from 'react'
import { motion } from 'motion/react'
import { Crown, Sparkles, UploadCloud } from 'lucide-react'

/**
 * 回転するグラデーションボーダー 3種。
 * 1. CSS @property で角度(--ab-angle)をアニメーション可能にし conic-gradient(from var(--ab-angle)) を回す
 * 2. Motion で巨大な conic-gradient の正方形を rotate し、内側を塗りつぶして「光の筋」だけ見せる
 * 3. SVG rect の stroke-dasharray + stroke-dashoffset アニメーション(マーチングアンツ)
 */
const CSS = `
@property --ab-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
@keyframes ab-rotate { to { --ab-angle: 360deg; } }
@keyframes ab-dash { to { stroke-dashoffset: -28; } }
.ab-rainbow {
  background: conic-gradient(from var(--ab-angle), #ff4d4d, #f9cb28, #4dff88, #4dd2ff, #a64dff, #ff4d4d);
  animation: ab-rotate 4s linear infinite;
}
`

export function AnimatedBorderCard() {
  const gradId = useId()
  return (
    <div className="relative flex h-full w-full items-center justify-center gap-5 overflow-hidden bg-[#07070a] p-5 text-white">
      <style>{CSS}</style>

      {/* 1. CSS @property rainbow */}
      <div className="relative w-[190px]">
        <div className="ab-rainbow absolute inset-0 rounded-2xl opacity-60 blur-xl" />
        <div className="ab-rainbow relative rounded-2xl p-[2px]">
          <div className="flex h-[170px] flex-col rounded-[14px] bg-zinc-950 p-4">
            <Crown size={20} className="text-amber-300" />
            <div className="mt-3 text-sm font-semibold">Pro Plan</div>
            <div className="mt-1 text-xs text-zinc-400">すべての機能が使い放題</div>
            <div className="mt-auto text-2xl font-bold">
              ¥980<span className="text-xs font-normal text-zinc-500">/月</span>
            </div>
          </div>
        </div>
        <p className="mt-2 text-center font-mono text-[10px] text-zinc-500">CSS @property</p>
      </div>

      {/* 2. Motion beam */}
      <div className="w-[190px]">
        <div className="relative overflow-hidden rounded-2xl p-[1.5px]">
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className="aspect-square w-[220%] shrink-0"
              style={{
                background:
                  'conic-gradient(from 0deg, transparent 0deg 290deg, #22d3ee 330deg, #a78bfa 350deg, transparent 360deg)',
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            />
          </div>
          <div className="relative flex h-[170px] flex-col rounded-[14.5px] bg-zinc-950 p-4">
            <Sparkles size={20} className="text-cyan-300" />
            <div className="mt-3 text-sm font-semibold">AI Assistant</div>
            <div className="mt-1 text-xs text-zinc-400">文章も画像もおまかせ</div>
            <button className="mt-auto rounded-lg bg-white/10 py-1.5 text-xs font-medium hover:bg-white/20">
              試してみる →
            </button>
          </div>
        </div>
        <p className="mt-2 text-center font-mono text-[10px] text-zinc-500">Motion rotate</p>
      </div>

      {/* 3. SVG marching ants */}
      <div className="w-[190px]">
        <div className="group relative h-[173px] cursor-pointer rounded-2xl">
          <svg className="absolute inset-0" width="190" height="173" viewBox="0 0 190 173" aria-hidden>
            <rect
              x="1"
              y="1"
              width="188"
              height="171"
              rx="15"
              fill="none"
              stroke={`url(#${gradId})`}
              strokeWidth="2"
              strokeDasharray="10 4"
              style={{ animation: 'ab-dash 1s linear infinite' }}
            />
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#f472b6" />
                <stop offset="1" stopColor="#818cf8" />
              </linearGradient>
            </defs>
          </svg>
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center transition group-hover:scale-[1.03]">
            <UploadCloud size={28} className="text-pink-300" />
            <div className="text-sm font-semibold">ドロップして追加</div>
            <div className="text-[11px] text-zinc-500">PNG, JPG, MP4 · 最大 50MB</div>
          </div>
        </div>
        <p className="mt-2 text-center font-mono text-[10px] text-zinc-500">SVG stroke-dashoffset</p>
      </div>
    </div>
  )
}
