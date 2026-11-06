import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChartLine, Plug, UserPlus, WandSparkles } from 'lucide-react'

const STEPS: { icon: ReactNode; title: string; text: string; color: string }[] = [
  { icon: <UserPlus size={20} />, title: 'アカウント作成', text: 'メールアドレスだけで30秒。', color: '#6366f1' },
  { icon: <Plug size={20} />, title: 'データを連携', text: '会計・在庫・CRMをワンクリック接続。', color: '#0ea5e9' },
  { icon: <WandSparkles size={20} />, title: '自動化を設定', text: 'テンプレートから選ぶだけ。', color: '#d946ef' },
  { icon: <ChartLine size={20} />, title: '成果を確認', text: '毎朝レポートが届きます。', color: '#10b981' },
]

/** 選択中ステップの小さなイラスト */
function Illust({ i }: { i: number }) {
  const common = 'rounded-xl border border-slate-200 bg-white p-4 shadow-sm'
  if (i === 0)
    return (
      <div className={common}>
        <div className="mb-2 text-[11px] font-semibold text-slate-500">新規登録</div>
        <div className="space-y-2">
          <div className="h-8 rounded-md border border-slate-200 px-2 text-xs leading-8 text-slate-400">you@company.jp</div>
          <motion.div initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 1 }} className="h-8 rounded-md bg-indigo-500" />
        </div>
      </div>
    )
  if (i === 1)
    return (
      <div className={`${common} flex items-center justify-around`}>
        {['会計', '在庫', 'CRM'].map((t, k) => (
          <motion.div key={t} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: k * 0.15 }} className="flex flex-col items-center gap-1">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-sky-100 text-xs font-bold text-sky-700">{t}</span>
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 + k * 0.15 }} className="text-[10px] text-emerald-600">
              ✓ 接続済
            </motion.span>
          </motion.div>
        ))}
      </div>
    )
  if (i === 2)
    return (
      <div className={`${common} space-y-1.5 text-[11px]`}>
        {['請求書を受け取ったら', '→ 金額を読み取り', '→ 承認者へ通知'].map((t, k) => (
          <motion.div key={t} initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: k * 0.2 }} className="rounded-md bg-fuchsia-50 px-2 py-1.5 text-fuchsia-800">
            {t}
          </motion.div>
        ))}
      </div>
    )
  return (
    <div className={`${common} flex h-[118px] items-end gap-1.5`}>
      {[30, 45, 40, 62, 58, 80, 96].map((h, k) => (
        <motion.span key={k} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: k * 0.07 }} className="flex-1 rounded-t bg-emerald-400" />
      ))}
    </div>
  )
}

export function HowItWorks() {
  const [step, setStep] = useState(0)
  const [auto, setAuto] = useState(true)
  useEffect(() => {
    if (!auto) return
    const id = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 2200)
    return () => clearInterval(id)
  }, [auto])
  const progress = step / (STEPS.length - 1)

  return (
    <div className="@container relative h-full w-full overflow-y-auto bg-gradient-to-b from-slate-50 to-sky-50 font-['Noto_Sans_JP',Inter,sans-serif] text-slate-800">
      <div className="mx-auto max-w-5xl px-5 py-7">
        <div className="text-center">
          <p className="text-[11px] font-semibold tracking-[0.25em] text-sky-600 uppercase">How it works</p>
          <h2 className="mt-1 text-[clamp(20px,4cqw,32px)] font-bold tracking-tight">4ステップで、明日から自動化。</h2>
        </div>

        {/* ステップ列: 広いと横並び、狭いと縦並び。線がステップごとに伸びていく */}
        <div className="relative mt-7 grid gap-5 @2xl:grid-cols-4 @2xl:gap-3">
          <div className="absolute top-6 bottom-6 left-6 w-0.5 rounded bg-slate-200 @2xl:top-6 @2xl:right-[12.5%] @2xl:bottom-auto @2xl:left-[12.5%] @2xl:h-0.5 @2xl:w-auto" />
          <motion.div
            className="absolute top-6 left-6 w-0.5 origin-top rounded bg-gradient-to-b from-indigo-500 via-fuchsia-500 to-emerald-500 @2xl:hidden"
            style={{ height: 'calc(100% - 48px)' }}
            animate={{ scaleY: progress }}
            transition={{ duration: 0.7, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute top-6 left-[12.5%] hidden h-0.5 origin-left rounded bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-emerald-500 @2xl:block"
            style={{ width: '75%' }}
            animate={{ scaleX: progress }}
            transition={{ duration: 0.7, ease: 'easeInOut' }}
          />
          {STEPS.map((s, i) => {
            const done = i <= step
            return (
              <button
                key={s.title}
                onClick={() => {
                  setAuto(false)
                  setStep(i)
                }}
                className="group relative flex items-start gap-4 text-left @2xl:flex-col @2xl:items-center @2xl:text-center"
              >
                <motion.span
                  animate={{ backgroundColor: done ? s.color : '#ffffff', color: done ? '#ffffff' : '#94a3b8', scale: i === step ? 1.12 : 1 }}
                  transition={{ duration: 0.35 }}
                  className="relative z-10 grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-white shadow-md"
                >
                  {i === step && (
                    <motion.span
                      layoutId="hiw-ring"
                      className="absolute -inset-1.5 rounded-full border-2"
                      style={{ borderColor: s.color }}
                    />
                  )}
                  {s.icon}
                </motion.span>
                <span>
                  <span className="block text-[10px] font-bold tracking-wider" style={{ color: done ? s.color : '#94a3b8' }}>
                    STEP {i + 1}
                  </span>
                  <span className="block text-sm font-semibold">{s.title}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{s.text}</span>
                </span>
              </button>
            )
          })}
        </div>

        <div className="mx-auto mt-7 max-w-sm">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
              <Illust i={step} />
            </motion.div>
          </AnimatePresence>
          <p className="mt-3 text-center text-[11px] text-slate-400">{auto ? '自動再生中 — ステップをクリックで選択' : 'ステップをクリックして切り替え'}</p>
        </div>
      </div>
    </div>
  )
}
