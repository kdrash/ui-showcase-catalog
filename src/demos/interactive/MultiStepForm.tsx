import { useId, useState } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { Check } from 'lucide-react'

const steps = ['アカウント', 'プロフィール', 'プラン', '完了']
const roles = ['デザイナー', 'エンジニア', 'PM', 'その他']
const plans = [
  { id: 'free', name: 'Free', price: '¥0', note: '個人の趣味に' },
  { id: 'pro', name: 'Pro', price: '¥980', note: 'フリーランスに' },
  { id: 'team', name: 'Team', price: '¥2,980', note: 'チーム開発に' },
]

const field =
  'w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100'

function StepBody({ step, role, setRole, plan, setPlan }: {
  step: number
  role: string
  setRole: (r: string) => void
  plan: string
  setPlan: (p: string) => void
}) {
  if (step === 0)
    return (
      <div className="space-y-2.5">
        <input className={field} placeholder="メールアドレス" type="email" />
        <input className={field} placeholder="パスワード" type="password" />
      </div>
    )
  if (step === 1)
    return (
      <div className="space-y-2.5">
        <input className={field} placeholder="表示名" />
        <div className="flex flex-wrap gap-1.5">
          {roles.map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                role === r ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-zinc-200 text-zinc-600 hover:border-zinc-400'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
    )
  if (step === 2)
    return (
      <div className="grid grid-cols-3 gap-2">
        {plans.map((p) => (
          <button key={p.id} onClick={() => setPlan(p.id)} className="relative rounded-xl border border-zinc-200 p-2.5 text-left">
            {plan === p.id && (
              <motion.span
                layoutId="plan-ring"
                className="absolute -inset-px rounded-xl border-2 border-indigo-500 bg-indigo-50/50"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative block text-xs font-semibold">{p.name}</span>
            <span className="relative block text-base font-bold">{p.price}</span>
            <span className="relative block text-[10px] text-zinc-500">{p.note}</span>
          </button>
        ))}
      </div>
    )
  return (
    <div className="flex flex-col items-center gap-2 py-1">
      <svg viewBox="0 0 52 52" className="size-14">
        <motion.circle
          cx="26"
          cy="26"
          r="24"
          fill="none"
          stroke="#22c55e"
          strokeWidth="3"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5 }}
        />
        <motion.path
          d="M15 27l7 7 15-15"
          fill="none"
          stroke="#22c55e"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.35, delay: 0.45 }}
        />
      </svg>
      <p className="text-sm font-semibold">登録が完了しました</p>
      <p className="text-xs text-zinc-500">確認メールを送信しました。</p>
    </div>
  )
}

/** ステッパー(進捗線が伸びる)+ 方向に応じてスライドするステップ切替 */
export function MultiStepForm() {
  const gid = useId()
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [role, setRole] = useState('デザイナー')
  const [plan, setPlan] = useState('pro')
  const last = steps.length - 1

  const go = (n: number) => {
    setDir(n > step ? 1 : -1)
    setStep(n)
  }

  return (
    <LayoutGroup id={gid}>
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-white p-5 text-zinc-900">
        <div className="relative mx-auto mb-5 flex w-full max-w-sm justify-between">
          <div className="absolute inset-x-4 top-4 h-0.5 bg-zinc-200">
            <motion.div
              className="h-full origin-left bg-indigo-500"
              animate={{ scaleX: step / last }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            />
          </div>
          {steps.map((s, i) => (
            <div key={s} className="relative z-10 flex w-8 flex-col items-center gap-1">
              <motion.div
                animate={{
                  backgroundColor: i <= step ? '#6366f1' : '#ffffff',
                  borderColor: i <= step ? '#6366f1' : '#e4e4e7',
                  scale: i === step ? 1.12 : 1,
                }}
                className="grid size-8 place-items-center rounded-full border-2 text-xs font-semibold"
              >
                {i < step ? (
                  <Check size={14} strokeWidth={3} className="text-white" />
                ) : (
                  <span className={i <= step ? 'text-white' : 'text-zinc-400'}>{i + 1}</span>
                )}
              </motion.div>
              <span className={`whitespace-nowrap text-[10px] ${i <= step ? 'text-zinc-900' : 'text-zinc-400'}`}>{s}</span>
            </div>
          ))}
        </div>

        <div className="relative mx-auto w-full max-w-sm flex-1">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={step}
              custom={dir}
              variants={{
                enter: (d: number) => ({ x: d * 60, opacity: 0 }),
                center: { x: 0, opacity: 1 },
                exit: (d: number) => ({ x: d * -60, opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <h4 className="mb-2.5 text-sm font-semibold">{steps[step]}</h4>
              <StepBody step={step} role={role} setRole={setRole} plan={plan} setPlan={setPlan} />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mx-auto flex w-full max-w-sm justify-between pt-3">
          <button
            onClick={() => go(step - 1)}
            disabled={step === 0 || step === last}
            className="rounded-lg px-3 py-2 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 disabled:opacity-0"
          >
            ← 戻る
          </button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => go(step === last ? 0 : step + 1)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-[0_4px_14px_rgba(79,70,229,.35)]"
          >
            {step === last ? '最初から' : step === last - 1 ? '登録する' : '次へ →'}
          </motion.button>
        </div>
      </div>
    </LayoutGroup>
  )
}
