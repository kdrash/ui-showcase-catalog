import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check } from 'lucide-react'

const PLANS = [
  {
    name: 'Starter',
    monthly: 0,
    color: '#ffffff',
    features: ['プロジェクト 3件', '基本テンプレート', 'コミュニティサポート'],
    cta: 'はじめる',
  },
  {
    name: 'Pro',
    monthly: 1200,
    color: '#ff90e8',
    features: ['プロジェクト無制限', '全テンプレート', 'カスタムドメイン', '優先サポート'],
    cta: 'Pro にする',
    popular: true,
  },
  {
    name: 'Team',
    monthly: 4800,
    color: '#90e0ff',
    features: ['Pro の全機能', 'メンバー10人', '権限管理', 'SSO'],
    cta: '相談する',
  },
]

/** Neo-Brutalism のボタン: 太い黒枠 + ずらした黒ベタ影。押すと影の分だけ沈む */
const brutalBtn =
  'border-[3px] border-black shadow-[4px_4px_0_#000] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-none'

export function BrutalistPricing() {
  const [yearly, setYearly] = useState(false)

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden bg-[#ffe66d] p-5 text-black"
      style={{
        fontFamily: '"Space Grotesk", "Noto Sans JP", sans-serif',
        backgroundImage: 'radial-gradient(#00000022 1px, transparent 1px)',
        backgroundSize: '16px 16px',
      }}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="border-[3px] border-black bg-white px-3 py-1 text-2xl font-bold uppercase shadow-[4px_4px_0_#000]">
          Pricing
        </h3>
        <button
          onClick={() => setYearly((y) => !y)}
          className="flex items-center gap-2 text-sm font-bold"
          aria-pressed={yearly}
        >
          <span className={yearly ? 'opacity-40' : ''}>月払い</span>
          <span className="relative h-7 w-14 border-[3px] border-black bg-white shadow-[3px_3px_0_#000]">
            <motion.span
              className="absolute top-0.5 h-[18px] w-[18px] border-2 border-black bg-[#ff6b6b]"
              animate={{ left: yearly ? 30 : 2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </span>
          <span className={yearly ? '' : 'opacity-40'}>
            年払い <span className="bg-black px-1 text-[10px] text-[#ffe66d]">-17%</span>
          </span>
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-3 gap-4">
        {PLANS.map((p) => {
          const price = yearly ? p.monthly * 10 : p.monthly
          return (
            <div
              key={p.name}
              className="relative flex flex-col border-[3px] border-black p-4 shadow-[6px_6px_0_#000]"
              style={{ background: p.color }}
            >
              {p.popular && (
                <span className="absolute -right-3 -top-4 rotate-6 border-[3px] border-black bg-[#ff6b6b] px-2 py-0.5 text-xs font-bold text-white shadow-[3px_3px_0_#000]">
                  人気No.1
                </span>
              )}
              <div className="text-sm font-bold uppercase">{p.name}</div>
              <div className="relative my-2 flex h-10 items-baseline gap-1 overflow-hidden">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={price}
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -30, opacity: 0 }}
                    className="text-3xl font-bold"
                  >
                    ¥{price.toLocaleString()}
                  </motion.span>
                </AnimatePresence>
                <span className="text-xs font-bold">/{yearly ? '年' : '月'}</span>
              </div>
              <ul className="mb-3 space-y-1.5 text-xs font-medium">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-1.5">
                    <span className="grid h-4 w-4 shrink-0 place-items-center border-2 border-black bg-white">
                      <Check size={10} strokeWidth={4} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <button className={`mt-auto py-2 text-sm font-bold ${p.popular ? "bg-black text-white" : "bg-white text-black"} ${brutalBtn}`}>
                {p.cta}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
