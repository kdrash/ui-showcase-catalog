import { useState } from 'react'
import NumberFlow from '@number-flow/react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { Check, Minus, Plus, Tag, Trash, Truck, X } from 'lucide-react'
import { art } from '../_shared/art'

type Line = { id: number; name: string; variant: string; price: number; qty: number; img: string }
const INITIAL: Line[] = [
  { id: 1, name: 'リネンシャツ', variant: 'オフホワイト / M', price: 7900, qty: 1, img: art('gradient', 4, 200, 200) },
  { id: 2, name: '帆布トートバッグ', variant: 'インディゴ', price: 5400, qty: 2, img: art('geometric', 1, 200, 200) },
  { id: 3, name: '手織りストール', variant: 'テラコッタ', price: 6200, qty: 1, img: art('landscape', 3, 200, 200) },
  { id: 4, name: 'ソイキャンドル', variant: 'ヒノキ', price: 2800, qty: 1, img: art('gradient', 7, 200, 200) },
]
const COUPONS: Record<string, { label: string; rate?: number; freeShip?: boolean }> = {
  WELCOME10: { label: '初回10%OFF', rate: 0.1 },
  FREESHIP: { label: '送料無料', freeShip: true },
}
const SHIPPING = [
  { id: 'std', name: '通常配送', note: '3〜5日 / ¥10,000以上で無料', fee: 600 },
  { id: 'exp', name: 'お急ぎ便', note: '翌日お届け', fee: 1200 },
]
const JPY = { style: 'currency', currency: 'JPY' } as const

export function CheckoutSummary() {
  const [lines, setLines] = useState(INITIAL)
  const [ship, setShip] = useState('std')
  const [code, setCode] = useState('')
  const [coupon, setCoupon] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const [listRef] = useAutoAnimate<HTMLUListElement>()

  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0)
  const c = coupon ? COUPONS[coupon] : null
  const discount = Math.round(subtotal * (c?.rate ?? 0))
  const shipOpt = SHIPPING.find((s) => s.id === ship)!
  const shipping = lines.length === 0 || c?.freeShip || (ship === 'std' && subtotal >= 10000) ? 0 : shipOpt.fee
  const total = subtotal - discount + shipping
  const tax = Math.floor((total * 10) / 110)

  const setQty = (id: number, d: number) => setLines((ls) => ls.map((l) => (l.id === id ? { ...l, qty: Math.max(1, l.qty + d) } : l)))
  const apply = () => {
    const k = code.trim().toUpperCase()
    if (COUPONS[k]) {
      setCoupon(k)
      setErr('')
      setCode('')
    } else setErr('このクーポンは使えません(WELCOME10 / FREESHIP を試してください)')
  }

  return (
    <div className="@container relative h-full w-full overflow-y-auto bg-zinc-50 font-['Noto_Sans_JP',Inter,sans-serif] text-zinc-800">
      <div className="grid gap-4 p-4 @3xl:grid-cols-[1.4fr_1fr] @3xl:p-5">
        {/* 商品リスト: 追加・削除は AutoAnimate が自動でアニメーション */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h3 className="mb-3 flex items-baseline justify-between text-sm font-bold">
            ショッピングカート <span className="text-xs font-normal text-zinc-500">{lines.length} 点</span>
          </h3>
          <ul ref={listRef} className="divide-y divide-zinc-100">
            {lines.map((l) => (
              <li key={l.id} className="flex items-center gap-3 py-3">
                <img src={l.img} alt="" className="h-14 w-14 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{l.name}</div>
                  <div className="text-[11px] text-zinc-500">{l.variant}</div>
                  <div className="mt-1 inline-flex items-center rounded-full border border-zinc-200">
                    <button onClick={() => setQty(l.id, -1)} disabled={l.qty <= 1} className="p-1.5 disabled:opacity-30" aria-label="減らす">
                      <Minus size={11} />
                    </button>
                    <span className="w-5 text-center text-xs tabular-nums">{l.qty}</span>
                    <button onClick={() => setQty(l.id, 1)} className="p-1.5" aria-label="増やす">
                      <Plus size={11} />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <NumberFlow value={l.price * l.qty} format={JPY} locales="ja-JP" className="text-sm font-semibold tabular-nums" />
                  <button onClick={() => setLines((ls) => ls.filter((x) => x.id !== l.id))} className="rounded p-1 text-zinc-400 hover:bg-rose-50 hover:text-rose-500" aria-label="削除">
                    <Trash size={14} />
                  </button>
                </div>
              </li>
            ))}
            {lines.length === 0 && (
              <li className="py-8 text-center text-xs text-zinc-500">
                カートは空です。
                <button onClick={() => setLines(INITIAL)} className="ml-1 text-indigo-600 underline">
                  商品を戻す
                </button>
              </li>
            )}
          </ul>
        </section>

        {/* 注文サマリー */}
        <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
          <h3 className="text-sm font-bold">注文内容</h3>
          <div className="space-y-1.5">
            {SHIPPING.map((s) => (
              <label key={s.id} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 text-xs transition ${ship === s.id ? 'border-indigo-500 bg-indigo-50/60' : 'border-zinc-200'}`}>
                <input type="radio" name="ship" checked={ship === s.id} onChange={() => setShip(s.id)} className="accent-indigo-600" />
                <Truck size={14} className="text-zinc-500" />
                <span className="flex-1">
                  <span className="block font-medium">{s.name}</span>
                  <span className="text-[10px] text-zinc-500">{s.note}</span>
                </span>
                <span>¥{s.fee.toLocaleString()}</span>
              </label>
            ))}
          </div>
          {coupon ? (
            <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              <span className="flex items-center gap-1.5">
                <Check size={13} /> {coupon} — {COUPONS[coupon].label}
              </span>
              <button onClick={() => setCoupon(null)} aria-label="クーポンを外す">
                <X size={13} />
              </button>
            </div>
          ) : (
            <div>
              <div className="flex gap-2">
                <div className="flex flex-1 items-center gap-2 rounded-xl border border-zinc-200 px-3 focus-within:border-indigo-400">
                  <Tag size={13} className="text-zinc-400" />
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && apply()}
                    placeholder="クーポンコード"
                    className="min-w-0 flex-1 bg-transparent py-2 text-xs uppercase outline-none placeholder:normal-case"
                  />
                </div>
                <button onClick={apply} className="rounded-xl bg-zinc-900 px-3 text-xs font-semibold text-white hover:bg-zinc-700">
                  適用
                </button>
              </div>
              {err && <p className="mt-1 text-[10px] text-rose-500">{err}</p>}
            </div>
          )}
          <dl className="space-y-1.5 border-t border-zinc-100 pt-3 text-xs">
            <div className="flex justify-between">
              <dt className="text-zinc-500">小計</dt>
              <NumberFlow value={subtotal} format={JPY} locales="ja-JP" className="tabular-nums" />
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">割引</dt>
              <span className="text-emerald-600">
                -<NumberFlow value={discount} format={JPY} locales="ja-JP" className="tabular-nums" />
              </span>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">送料</dt>
              {shipping === 0 ? <span className="font-semibold text-emerald-600">無料</span> : <NumberFlow value={shipping} format={JPY} locales="ja-JP" className="tabular-nums" />}
            </div>
            <div className="flex items-baseline justify-between border-t border-zinc-100 pt-2">
              <dt className="font-semibold">合計</dt>
              <NumberFlow value={total} format={JPY} locales="ja-JP" className="text-xl font-bold tabular-nums" />
            </div>
            <p className="text-right text-[10px] text-zinc-400">うち消費税 ¥{tax.toLocaleString()}</p>
          </dl>
          <button disabled={!lines.length} className="rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-700 disabled:opacity-40">
            注文を確定する
          </button>
        </section>
      </div>
    </div>
  )
}
