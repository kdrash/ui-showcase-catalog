import { useEffect, useRef, useState, type FormEvent } from 'react'
import confetti from 'canvas-confetti'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Check, LoaderCircle, Mail } from 'lucide-react'

type Status = 'idle' | 'error' | 'loading' | 'done'

export function NewsletterCta() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fire = useRef<confetti.CreateTypes | null>(null)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [shake, setShake] = useState(0)

  // 紙吹雪はデモ内の canvas に限定して描画(ページ全体に出さない)
  useEffect(() => {
    if (!canvasRef.current) return
    fire.current = confetti.create(canvasRef.current, { resize: true })
    return () => fire.current?.reset()
  }, [])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setStatus('error')
      setShake((s) => s + 1)
      return
    }
    setStatus('loading')
    setTimeout(() => {
      setStatus('done')
      const opts = { particleCount: 70, spread: 70, startVelocity: 38, ticks: 160, colors: ['#ffffff', '#fde68a', '#f0abfc', '#a5b4fc'] }
      fire.current?.({ ...opts, origin: { x: 0.3, y: 0.7 }, angle: 60 })
      fire.current?.({ ...opts, origin: { x: 0.7, y: 0.7 }, angle: 120 })
    }, 1200)
  }

  return (
    <div className="@container relative grid h-full w-full place-items-center overflow-hidden bg-[#0b0718] p-4 font-['Noto_Sans_JP',Inter,sans-serif]">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-orange-400 p-[1px] shadow-2xl shadow-fuchsia-900/40">
        <div className="relative overflow-hidden rounded-[23px] bg-gradient-to-br from-violet-600/95 via-fuchsia-600/90 to-orange-500/90 px-6 py-9 text-center text-white @2xl:px-12">
          {/* 粒子ノイズと光の玉 */}
          <div
            className="pointer-events-none absolute inset-0 opacity-25 mix-blend-overlay"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }}
          />
          <div className="pointer-events-none absolute -top-16 -left-10 h-48 w-48 rounded-full bg-white/25 blur-3xl" />
          <div className="pointer-events-none absolute -right-10 -bottom-20 h-56 w-56 rounded-full bg-amber-300/40 blur-3xl" />

          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-medium backdrop-blur">
              <Mail size={12} /> 毎週金曜日にお届け
            </span>
            <h2 className="mt-4 text-[clamp(22px,5cqw,40px)] leading-tight font-bold tracking-tight">週に一度、デザインの種を。</h2>
            <p className="mx-auto mt-2 max-w-md text-[13px] text-white/80">
              最新のUIトレンド、使えるテンプレート、現場のノウハウを 5 分で読めるニュースレターに。
            </p>

            <AnimatePresence mode="wait">
              {status === 'done' ? (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mx-auto mt-6 flex max-w-md flex-col items-center gap-2"
                >
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.1 }}
                    className="grid h-12 w-12 place-items-center rounded-full bg-white text-fuchsia-600"
                  >
                    <Check size={24} strokeWidth={3} />
                  </motion.span>
                  <p className="font-semibold">登録ありがとうございます!</p>
                  <p className="text-xs text-white/80">{email} に確認メールを送信しました。</p>
                  <button
                    onClick={() => {
                      setStatus('idle')
                      setEmail('')
                    }}
                    className="mt-1 text-xs underline underline-offset-4 opacity-80 hover:opacity-100"
                  >
                    別のアドレスで登録
                  </button>
                </motion.div>
              ) : (
                <motion.form
                  key={`form-${shake}`}
                  onSubmit={submit}
                  initial={{ x: 0 }}
                  animate={shake ? { x: [0, -10, 9, -6, 4, 0] } : { x: 0 }}
                  transition={{ duration: 0.4 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mx-auto mt-6 max-w-md"
                  noValidate
                >
                  <div
                    className={`flex items-center gap-2 rounded-full bg-white/95 p-1.5 pl-4 shadow-lg ring-2 transition ${
                      status === 'error' ? 'ring-red-300' : 'ring-transparent focus-within:ring-white/60'
                    }`}
                  >
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        if (status === 'error') setStatus('idle')
                      }}
                      placeholder="you@example.com"
                      className="min-w-0 flex-1 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
                    />
                    <button
                      type="submit"
                      disabled={status === 'loading'}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:opacity-80"
                    >
                      {status === 'loading' ? (
                        <LoaderCircle size={15} className="animate-spin" />
                      ) : (
                        <>
                          登録 <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                  </div>
                  <p className={`mt-2 h-4 text-xs ${status === 'error' ? 'text-white' : 'text-white/60'}`}>
                    {status === 'error' ? '⚠ メールアドレスの形式が正しくありません' : '配信はいつでも停止できます。スパムは送りません。'}
                  </p>
                </motion.form>
              )}
            </AnimatePresence>
            <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-white/80">
              <span className="flex -space-x-2">
                {[280, 200, 30, 150].map((h) => (
                  <span key={h} className="h-6 w-6 rounded-full border-2 border-fuchsia-500" style={{ background: `hsl(${h} 70% 70%)` }} />
                ))}
              </span>
              24,000人以上のデザイナーが購読中
            </div>
          </div>
        </div>
      </div>
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
    </div>
  )
}
