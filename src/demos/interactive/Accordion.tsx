import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Plus } from 'lucide-react'

const faqs = [
  {
    q: 'このカタログのUIは商用プロジェクトで使えますか？',
    a: 'はい。使用しているライブラリはすべて MIT などの寛容なライセンスです。各ライブラリのライセンス表記は残してください。',
  },
  {
    q: 'アニメーションのライブラリはどれを選ぶべき？',
    a: 'React のコンポーネント単位の動きは Motion、スクロール連動や長いタイムラインは GSAP が得意です。',
  },
  {
    q: '3D 背景はパフォーマンスに影響しますか？',
    a: 'WebGL はGPUを使うため、画面外では描画を止める・dpr を制限するなどの工夫をするとモバイルでも快適です。',
  },
  {
    q: 'アクセシビリティへの配慮は？',
    a: 'prefers-reduced-motion を尊重し、ボタンには aria 属性、キーボード操作でも開閉できるようにします。',
  },
]

/** height: 'auto' へのアニメーションは Motion の AnimatePresence + motion.div で簡単に書ける */
export function Accordion() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#fafaf9] text-zinc-900">
      <div className="h-full overflow-y-auto px-6 py-5">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.25em] text-zinc-400">FAQ</p>
        <h3 className="mb-3 text-2xl" style={{ fontFamily: "'Playfair Display', serif" }}>よくある質問</h3>
        <div className="divide-y divide-zinc-200 border-y border-zinc-200">
          {faqs.map((f, i) => {
            const isOpen = open === i
            return (
              <div key={f.q}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-4 py-3 text-left"
                >
                  <span className="font-mono text-[11px] text-zinc-400">{String(i + 1).padStart(2, '0')}</span>
                  <span className="flex-1 text-sm font-medium">{f.q}</span>
                  <motion.span
                    animate={{ rotate: isOpen ? 45 : 0, backgroundColor: isOpen ? '#18181b' : '#ffffff' }}
                    className={`grid size-7 shrink-0 place-items-center rounded-full border border-zinc-300 ${
                      isOpen ? 'text-white' : 'text-zinc-700'
                    }`}
                  >
                    <Plus size={14} />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.04, 0.62, 0.23, 0.98] }}
                      className="overflow-hidden"
                    >
                      <p className="pb-4 pl-9 pr-10 text-xs leading-relaxed text-zinc-600">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
