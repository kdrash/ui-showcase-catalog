import { useEffect, useState } from 'react'
import { OTPInput, REGEXP_ONLY_DIGITS, type SlotProps } from 'input-otp'
import { motion, useAnimationControls } from 'motion/react'
import { ShieldCheck } from 'lucide-react'

const CORRECT = '424242'

function Slot({ char, hasFakeCaret, isActive, state }: SlotProps & { state: 'idle' | 'ok' | 'ng' }) {
  const color =
    state === 'ok'
      ? 'border-emerald-400 bg-emerald-400/10 text-emerald-200'
      : state === 'ng'
        ? 'border-rose-400 bg-rose-400/10 text-rose-200'
        : isActive
          ? 'border-indigo-400 ring-4 ring-indigo-500/25 text-white'
          : 'border-white/15 text-white'
  return (
    <div
      className={`relative grid h-14 w-11 place-items-center rounded-xl border bg-white/5 font-mono text-2xl font-semibold transition-all duration-200 ${color}`}
    >
      {char !== null && (
        <motion.span initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          {char}
        </motion.span>
      )}
      {hasFakeCaret && <div className="absolute h-6 w-px animate-pulse bg-white" />}
    </div>
  )
}

export function OtpInput() {
  const [value, setValue] = useState('')
  const [state, setState] = useState<'idle' | 'checking' | 'ok' | 'ng'>('idle')
  const [left, setLeft] = useState(30)
  const shake = useAnimationControls()

  useEffect(() => {
    if (left <= 0) return
    const t = setTimeout(() => setLeft((l) => l - 1), 1000)
    return () => clearTimeout(t)
  }, [left])

  const verify = (code: string) => {
    setState('checking')
    setTimeout(() => {
      if (code === CORRECT) setState('ok')
      else {
        setState('ng')
        shake.start({ x: [0, -10, 10, -7, 7, -3, 0], transition: { duration: 0.45 } })
      }
    }, 700)
  }

  const slotState = state === 'ok' ? 'ok' : state === 'ng' ? 'ng' : 'idle'

  return (
    <div className="relative grid h-full w-full place-items-center overflow-hidden bg-[radial-gradient(ellipse_at_top,#312e81,#09090b_65%)] p-4 font-sans text-white">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-400/30">
          <ShieldCheck size={22} />
        </div>
        <div>
          <div className="text-lg font-semibold">確認コードを入力</div>
          <p className="mt-1 text-xs text-zinc-400">
            SMS で届いた6桁のコード(デモでは <span className="font-mono text-indigo-300">424242</span>)
          </p>
        </div>
        <motion.div animate={shake}>
          <OTPInput
            maxLength={6}
            value={value}
            pattern={REGEXP_ONLY_DIGITS}
            disabled={state === 'checking' || state === 'ok'}
            onChange={(v) => {
              setValue(v)
              if (state === 'ng') setState('idle')
            }}
            onComplete={verify}
            containerClassName="flex items-center gap-2 has-[:disabled]:opacity-90"
            render={({ slots }) => (
              <>
                <div className="flex gap-2">
                  {slots.slice(0, 3).map((s, i) => (
                    <Slot key={i} {...s} state={slotState} />
                  ))}
                </div>
                <div className="h-0.5 w-3 rounded bg-white/30" />
                <div className="flex gap-2">
                  {slots.slice(3).map((s, i) => (
                    <Slot key={i} {...s} state={slotState} />
                  ))}
                </div>
              </>
            )}
          />
        </motion.div>
        <div className="h-5 text-xs">
          {state === 'checking' && <span className="text-zinc-300">確認しています…</span>}
          {state === 'ok' && <span className="text-emerald-300">✓ 認証に成功しました</span>}
          {state === 'ng' && <span className="text-rose-300">コードが正しくありません</span>}
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-400">
          {left > 0 ? (
            <span>
              コードを再送信できるまで <span className="font-mono text-white">0:{String(left).padStart(2, '0')}</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                setLeft(30)
                setValue('')
                setState('idle')
              }}
              className="text-indigo-300 underline-offset-2 hover:underline"
            >
              コードを再送信
            </button>
          )}
          {(state === 'ok' || value) && (
            <button
              type="button"
              onClick={() => {
                setValue('')
                setState('idle')
              }}
              className="text-zinc-500 hover:text-zinc-300"
            >
              リセット
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
