import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Eye, EyeOff, Loader, RotateCcw } from 'lucide-react'

const schema = z
  .object({
    name: z.string().trim().min(1, 'お名前を入力してください'),
    email: z.email('メールアドレスの形式が正しくありません'),
    password: z
      .string()
      .min(8, '8文字以上で入力してください')
      .regex(/[A-Z]/, '大文字を1文字以上含めてください')
      .regex(/\d/, '数字を1文字以上含めてください'),
    confirm: z.string().min(1, '確認用パスワードを入力してください'),
    terms: z.boolean().refine((v) => v, '利用規約への同意が必要です'),
  })
  .refine((d) => d.password === d.confirm, { message: 'パスワードが一致しません', path: ['confirm'] })

type Input = z.input<typeof schema>
type Output = z.output<typeof schema>

function strength(pw: string) {
  let s = 0
  if (pw.length >= 8) s++
  if (pw.length >= 12) s++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++
  if (/\d/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return Math.min(4, s)
}
const LEVELS = [
  { label: 'とても弱い', color: 'bg-red-500' },
  { label: '弱い', color: 'bg-orange-500' },
  { label: 'ふつう', color: 'bg-amber-400' },
  { label: '強い', color: 'bg-lime-500' },
  { label: 'とても強い', color: 'bg-emerald-500' },
]

function FieldError({ msg }: { msg?: string }) {
  return (
    <AnimatePresence initial={false}>
      {msg && (
        <motion.p
          initial={{ opacity: 0, height: 0, y: -4 }}
          animate={{ opacity: 1, height: 'auto', y: 0 }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden pt-1 text-[11px] text-red-500"
        >
          {msg}
        </motion.p>
      )}
    </AnimatePresence>
  )
}

const inputCls = (bad: boolean) =>
  `h-9 w-full rounded-md border bg-white px-3 text-sm text-zinc-900 shadow-xs outline-none transition placeholder:text-zinc-400 focus:ring-[3px] ${
    bad ? 'border-red-400 focus:ring-red-500/20' : 'border-zinc-200 focus:border-zinc-400 focus:ring-zinc-900/10'
  }`

export function ValidatedSignup() {
  const [show, setShow] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Input, unknown, Output>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { name: '', email: '', password: '', confirm: '', terms: false },
  })
  const pw = useWatch({ control, name: 'password' }) ?? ''
  const lv = strength(pw)

  const onSubmit = async (v: Output) => {
    await new Promise((r) => setTimeout(r, 1200))
    setDone(v.name)
  }

  return (
    <div className="relative grid h-full w-full place-items-center overflow-hidden bg-zinc-100 p-4 font-sans">
      <div className="w-full max-w-[420px] rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <AnimatePresence mode="wait">
          {done ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3 py-10 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 14 }}
                className="grid h-12 w-12 place-items-center rounded-full bg-emerald-500 text-white"
              >
                <Check size={24} strokeWidth={3} />
              </motion.div>
              <div className="text-base font-semibold text-zinc-900">登録が完了しました</div>
              <p className="text-sm text-zinc-500">{done} さん、確認メールを送信しました。</p>
              <button
                type="button"
                onClick={() => {
                  reset()
                  setDone(null)
                }}
                className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50"
              >
                <RotateCcw size={12} /> もう一度試す
              </button>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              noValidate
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-3"
            >
              <div>
                <h3 className="text-base font-semibold tracking-tight text-zinc-900">アカウント作成</h3>
                <p className="text-xs text-zinc-500">入力内容はその場で検証されます。</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-zinc-700">お名前</span>
                  <input {...register('name')} placeholder="山田 太郎" className={inputCls(!!errors.name)} />
                  <FieldError msg={errors.name?.message} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-zinc-700">メール</span>
                  <input {...register('email')} placeholder="you@example.com" className={inputCls(!!errors.email)} />
                  <FieldError msg={errors.email?.message} />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-zinc-700">パスワード</span>
                  <div className="relative">
                    <input
                      {...register('password')}
                      type={show ? 'text' : 'password'}
                      placeholder="8文字以上"
                      className={inputCls(!!errors.password) + ' pr-9'}
                    />
                    <button
                      type="button"
                      onClick={() => setShow((s) => !s)}
                      aria-label={show ? '隠す' : '表示'}
                      className="absolute top-1/2 right-2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                    >
                      {show ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <FieldError msg={errors.password?.message} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-zinc-700">確認</span>
                  <input
                    {...register('confirm')}
                    type={show ? 'text' : 'password'}
                    placeholder="もう一度"
                    className={inputCls(!!errors.confirm)}
                  />
                  <FieldError msg={errors.confirm?.message} />
                </label>
              </div>
              <div>
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
                      <motion.div
                        className={`h-full ${LEVELS[lv].color}`}
                        initial={false}
                        animate={{ width: pw && i < Math.max(1, lv) ? '100%' : '0%' }}
                        transition={{ duration: 0.25, delay: i * 0.04 }}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-1 flex justify-between text-[11px] text-zinc-500">
                  <span>強度: {pw ? LEVELS[lv].label : '—'}</span>
                  <span>大文字・数字・記号を組み合わせると強くなります</span>
                </div>
              </div>
              <label className="flex items-start gap-2 text-xs text-zinc-600">
                <input type="checkbox" {...register('terms')} className="mt-0.5 h-4 w-4 accent-zinc-900" />
                <span>
                  <a className="underline underline-offset-2">利用規約</a> と <a className="underline underline-offset-2">プライバシーポリシー</a>{' '}
                  に同意します
                  <FieldError msg={errors.terms?.message} />
                </span>
              </label>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-zinc-900 text-sm font-medium text-white transition hover:bg-zinc-800 active:scale-[0.99] disabled:opacity-70"
              >
                {isSubmitting && <Loader size={15} className="animate-spin" />}
                {isSubmitting ? '送信中…' : '登録する'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
