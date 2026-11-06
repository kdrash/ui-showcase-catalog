import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'motion/react'
import { useEffect, useId, useState } from 'react'
import { Check, Sparkles } from 'lucide-react'

/**
 * 月払い/年払い切替つき料金表。
 * - セグメントトグルの背景ピルは Motion の layoutId でスライド
 * - 価格は animate(motionValue, to) でカウントアップ/ダウン
 * - 補足テキストは AnimatePresence mode="wait" で入れ替え
 * - おすすめプランはダーク + グラデーションボーダーで強調
 */

type Billing = 'monthly' | 'yearly'

const PLANS = [
  {
    name: 'Starter',
    desc: '個人の小さなプロジェクトに',
    monthly: 0,
    yearly: 0,
    features: ['プロジェクト 3件', 'コミュニティサポート', '基本アナリティクス'],
    cta: '無料ではじめる',
  },
  {
    name: 'Pro',
    desc: '成長中のチームに最適',
    monthly: 1500,
    yearly: 1200,
    features: ['プロジェクト無制限', '優先サポート', '高度なアナリティクス', 'カスタムドメイン'],
    cta: 'Pro を試す',
    popular: true,
  },
  {
    name: 'Team',
    desc: '組織全体でのコラボに',
    monthly: 4800,
    yearly: 3840,
    features: ['Pro の全機能', 'SSO / 監査ログ', '専任サポート'],
    cta: '営業に問い合わせ',
  },
]

function Price({ value }: { value: number }) {
  const mv = useMotionValue(value)
  const text = useTransform(mv, (v) => `¥${Math.round(v).toLocaleString('ja-JP')}`)
  useEffect(() => {
    const c = animate(mv, value, { duration: 0.6, ease: [0.22, 1, 0.36, 1] })
    return () => c.stop()
  }, [mv, value])
  return <motion.span>{text}</motion.span>
}

export function PricingToggle() {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [billing, setBilling] = useState<Billing>('monthly')

  return (
    <div
      className="relative flex h-full w-full flex-col items-center overflow-hidden bg-zinc-50 px-4 py-4 text-zinc-900"
      style={{
        fontFamily: "Inter, 'Noto Sans JP', sans-serif",
        backgroundImage: 'radial-gradient(rgba(0,0,0,0.06) 1px, transparent 1px)',
        backgroundSize: '16px 16px',
      }}
    >
      {/* toggle */}
      <div className="relative mb-4 flex items-center gap-2">
        <div className="flex rounded-full border border-zinc-200 bg-white p-1 shadow-sm">
          {(['monthly', 'yearly'] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              className={`relative rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${billing === b ? 'text-white' : 'text-zinc-500 hover:text-zinc-800'}`}
            >
              {billing === b && (
                <motion.span
                  layoutId={`billing-${uid}`}
                  className="absolute inset-0 rounded-full bg-zinc-900"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <span className="relative">{b === 'monthly' ? '月払い' : '年払い'}</span>
            </button>
          ))}
        </div>
        <AnimatePresence>
          {billing === 'yearly' && (
            <motion.span
              initial={{ opacity: 0, scale: 0.6, x: -8 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.6, x: -8 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className="absolute left-full ml-2 whitespace-nowrap rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700"
            >
              20% OFF
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* cards */}
      <div className="grid min-h-0 w-full max-w-3xl flex-1 grid-cols-3 grid-rows-1 items-center gap-3">
        {PLANS.map((p) => {
          const price = billing === 'monthly' ? p.monthly : p.yearly
          const card = (
            <div
              className={`relative flex h-full flex-col rounded-[18px] p-4 ${p.popular ? 'bg-zinc-950 text-white' : 'border border-zinc-200 bg-white'}`}
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">{p.name}</h4>
                {p.popular && (
                  <span className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-violet-200">
                    <Sparkles size={10} /> 人気
                  </span>
                )}
              </div>
              <p className={`mt-0.5 text-[11px] ${p.popular ? 'text-zinc-400' : 'text-zinc-500'}`}>{p.desc}</p>
              <p className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-bold tracking-tight tabular-nums">
                  <Price value={price} />
                </span>
                <span className={`text-[11px] ${p.popular ? 'text-zinc-400' : 'text-zinc-500'}`}>/月</span>
              </p>
              <div className="h-4 overflow-hidden">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={billing}
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -12, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`text-[10px] ${p.popular ? 'text-zinc-500' : 'text-zinc-400'}`}
                  >
                    {price === 0
                      ? 'ずっと無料'
                      : billing === 'yearly'
                        ? `年額 ¥${(price * 12).toLocaleString('ja-JP')} を一括請求`
                        : 'いつでも解約できます'}
                  </motion.p>
                </AnimatePresence>
              </div>
              <ul className="mt-3 flex-1 space-y-1.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-1.5 text-[11px]">
                    <Check size={12} className={p.popular ? 'text-violet-300' : 'text-emerald-500'} />
                    <span className={p.popular ? 'text-zinc-300' : 'text-zinc-600'}>{f}</span>
                  </li>
                ))}
              </ul>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={`mt-3 w-full rounded-xl py-2 text-xs font-semibold ${p.popular ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30' : 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'}`}
              >
                {p.cta}
              </motion.button>
            </div>
          )
          return p.popular ? (
            <motion.div
              key={p.name}
              whileHover={{ y: -6 }}
              className="relative h-[94%] rounded-[20px] bg-gradient-to-b from-violet-500 via-fuchsia-500 to-amber-300 p-[2px] shadow-2xl shadow-violet-500/20"
            >
              {card}
            </motion.div>
          ) : (
            <motion.div key={p.name} whileHover={{ y: -6 }} className="h-[86%]">
              {card}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
