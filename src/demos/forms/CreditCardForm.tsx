import { useState } from 'react'
import { motion } from 'motion/react'
import { Lock } from 'lucide-react'

type Brand = 'visa' | 'mastercard' | 'amex' | 'jcb' | 'unknown'

function detect(n: string): Brand {
  if (/^4/.test(n)) return 'visa'
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'mastercard'
  if (/^3[47]/.test(n)) return 'amex'
  if (/^35/.test(n)) return 'jcb'
  return 'unknown'
}
const BRAND_STYLE: Record<Brand, { bg: string; label: string }> = {
  visa: { bg: 'linear-gradient(135deg,#1e3a8a,#2563eb 55%,#60a5fa)', label: 'VISA' },
  mastercard: { bg: 'linear-gradient(135deg,#1c1917,#44403c 50%,#ea580c)', label: 'mastercard' },
  amex: { bg: 'linear-gradient(135deg,#0f766e,#14b8a6 60%,#99f6e4)', label: 'AMEX' },
  jcb: { bg: 'linear-gradient(135deg,#14532d,#16a34a 50%,#dc2626)', label: 'JCB' },
  unknown: { bg: 'linear-gradient(135deg,#27272a,#52525b 60%,#a1a1aa)', label: 'CARD' },
}

const formatNumber = (digits: string, brand: Brand) => {
  const groups = brand === 'amex' ? [4, 6, 5] : [4, 4, 4, 4]
  const out: string[] = []
  let i = 0
  for (const g of groups) {
    if (i >= digits.length) break
    out.push(digits.slice(i, i + g))
    i += g
  }
  return out.join(' ')
}
const masked = (digits: string, brand: Brand) => {
  const len = brand === 'amex' ? 15 : 16
  return formatNumber(digits.padEnd(len, '•'), brand)
}

function luhn(d: string) {
  let sum = 0
  for (let i = 0; i < d.length; i++) {
    let x = +d[d.length - 1 - i]
    if (i % 2) x = x * 2 > 9 ? x * 2 - 9 : x * 2
    sum += x
  }
  return sum % 10 === 0
}

export function CreditCardForm() {
  const [num, setNum] = useState('4242424242424242')
  const [name, setName] = useState('TARO YAMADA')
  const [exp, setExp] = useState('08/29')
  const [cvc, setCvc] = useState('')
  const [focus, setFocus] = useState<string | null>(null)
  const [paid, setPaid] = useState(false)

  const brand = detect(num)
  const maxLen = brand === 'amex' ? 15 : 16
  const now = new Date()
  const [mm, yy] = exp.split('/').map(Number)
  const expOk = !!mm && !!yy && mm >= 1 && mm <= 12 && new Date(2000 + yy, mm) > now
  const numOk = num.length === maxLen && luhn(num)
  const cvcOk = cvc.length === (brand === 'amex' ? 4 : 3)
  const valid = numOk && expOk && cvcOk && name.trim().length > 1

  const field = (ok: boolean, touched: boolean) =>
    `h-9 w-full rounded-lg border bg-white/5 px-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:ring-4 ${
      touched && !ok ? 'border-rose-400/70 focus:ring-rose-500/20' : 'border-white/10 focus:border-white/30 focus:ring-white/10'
    }`

  const ring = (k: string) => (focus === k ? 'outline outline-2 outline-offset-2 outline-white/70 rounded' : '')

  return (
    <div className="relative flex h-full w-full items-center justify-center gap-6 overflow-hidden bg-[#0b0b10] p-5 font-sans text-white">
      {/* カードプレビュー */}
      <div className="shrink-0 [perspective:1000px]">
        <motion.div
          animate={{ rotateY: focus === 'cvc' ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 120, damping: 16 }}
          className="relative h-[150px] w-[240px] [transform-style:preserve-3d]"
        >
          <motion.div
            className="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-2xl p-4 shadow-2xl shadow-black/60 [backface-visibility:hidden]"
            animate={{ background: BRAND_STYLE[brand].bg }}
          >
            <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/10" />
            <div className="flex items-start justify-between">
              <div className="h-6 w-8 rounded-md bg-gradient-to-br from-yellow-200 to-amber-500 opacity-90" />
              <motion.span key={brand} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="text-sm font-black tracking-wider italic">
                {BRAND_STYLE[brand].label}
              </motion.span>
            </div>
            <div className={`font-mono text-[15px] tracking-[0.12em] ${ring('num')}`}>{masked(num, brand)}</div>
            <div className="flex items-end justify-between text-[10px]">
              <div className={ring('name')}>
                <div className="text-white/50">CARD HOLDER</div>
                <div className="max-w-[140px] truncate text-xs font-semibold tracking-wide uppercase">{name || 'YOUR NAME'}</div>
              </div>
              <div className={ring('exp')}>
                <div className="text-white/50">EXPIRES</div>
                <div className="font-mono text-xs">{exp || 'MM/YY'}</div>
              </div>
            </div>
          </motion.div>
          <div
            className="absolute inset-0 overflow-hidden rounded-2xl shadow-2xl shadow-black/60 [backface-visibility:hidden] [transform:rotateY(180deg)]"
            style={{ background: BRAND_STYLE[brand].bg }}
          >
            <div className="mt-5 h-8 bg-black/80" />
            <div className="mx-4 mt-4 flex items-center justify-end rounded bg-white/90 px-2 py-1.5 font-mono text-sm text-zinc-900 italic">
              {cvc.padEnd(brand === 'amex' ? 4 : 3, '•')}
            </div>
            <div className="mt-3 px-4 text-[9px] text-white/60">裏面の3桁(AMEXは4桁)のセキュリティコード</div>
          </div>
        </motion.div>
      </div>

      {/* フォーム */}
      <form
        className="w-[240px] space-y-2.5"
        onSubmit={(e) => {
          e.preventDefault()
          if (valid) setPaid(true)
        }}
      >
        <label className="block">
          <span className="mb-1 block text-[11px] text-zinc-400">カード番号</span>
          <input
            inputMode="numeric"
            autoComplete="cc-number"
            value={formatNumber(num, brand)}
            onChange={(e) => setNum(e.target.value.replace(/\D/g, '').slice(0, 16))}
            onFocus={() => setFocus('num')}
            onBlur={() => setFocus(null)}
            placeholder="1234 5678 9012 3456"
            className={field(numOk, num.length >= maxLen) + ' font-mono'}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] text-zinc-400">名義人</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.toUpperCase().replace(/[^A-Z ]/g, ''))}
            onFocus={() => setFocus('name')}
            onBlur={() => setFocus(null)}
            className={field(true, false)}
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-[11px] text-zinc-400">有効期限</span>
            <input
              inputMode="numeric"
              value={exp}
              onChange={(e) => {
                const d = e.target.value.replace(/\D/g, '').slice(0, 4)
                setExp(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d)
              }}
              onFocus={() => setFocus('exp')}
              onBlur={() => setFocus(null)}
              placeholder="MM/YY"
              className={field(expOk, exp.length === 5) + ' font-mono'}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-zinc-400">CVC</span>
            <input
              inputMode="numeric"
              value={cvc}
              onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, brand === 'amex' ? 4 : 3))}
              onFocus={() => setFocus('cvc')}
              onBlur={() => setFocus(null)}
              placeholder={brand === 'amex' ? '1234' : '123'}
              className={field(cvcOk, cvc.length > 0 && focus !== 'cvc') + ' font-mono'}
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={!valid}
          className="mt-1 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-white text-sm font-semibold text-zinc-900 transition enabled:hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Lock size={13} /> {paid ? '✓ 支払いが完了しました' : '¥12,800 を支払う'}
        </button>
        <p className="text-center text-[10px] text-zinc-500">テスト番号: 4242… / 5555 5555 5555 4444 / 3782 822463 10005</p>
      </form>
    </div>
  )
}
