import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { RotateCw, Heart, MessageCircle, Star } from 'lucide-react'
import { art } from '../_shared/art'

const CSS = `
.sk{position:relative;overflow:hidden;background:#e4e4e7;border-radius:8px}
.sk::after{content:'';position:absolute;inset:0;transform:translateX(-100%);
background:linear-gradient(90deg,transparent,rgba(255,255,255,.75),transparent);animation:sk-shimmer 1.3s infinite}
@keyframes sk-shimmer{100%{transform:translateX(100%)}}
`

function Sk({ className = '' }: { className?: string }) {
  return <div className={`sk ${className}`} />
}

function Swap({ loading, skeleton, children }: { loading: boolean; skeleton: ReactNode; children: ReactNode }) {
  return (
    <div className="relative">
      <AnimatePresence mode="popLayout" initial={false}>
        {loading ? (
          <motion.div key="s" exit={{ opacity: 0, filter: 'blur(4px)' }} transition={{ duration: 0.35 }}>
            {skeleton}
          </motion.div>
        ) : (
          <motion.div key="c" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const panel = 'rounded-2xl bg-white p-3 shadow-sm ring-1 ring-zinc-200/80'

export function SkeletonLoaders() {
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    setLoading(true)
    const t = setTimeout(() => setLoading(false), 1800)
    return () => clearTimeout(t)
  }, [tick])

  return (
    <div className="relative h-full w-full overflow-auto bg-zinc-100 p-4 font-sans text-zinc-800">
      <style>{CSS}</style>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold">スケルトンローディング</div>
        <button
          onClick={() => setTick((t) => t + 1)}
          className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-3 py-1.5 text-xs text-white transition active:scale-95"
        >
          <RotateCw size={12} className={loading ? 'animate-spin' : ''} /> 再読み込み
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {/* card */}
        <div className={panel}>
          <Swap
            loading={loading}
            skeleton={
              <div className="space-y-2">
                <Sk className="h-24 w-full" />
                <Sk className="h-3 w-3/4" />
                <Sk className="h-3 w-1/2" />
              </div>
            }
          >
            <div className="space-y-1.5">
              <img src={art('landscape', 2, 400, 200)} className="h-24 w-full rounded-lg object-cover" alt="" />
              <div className="text-[13px] font-semibold">夕暮れの山並み</div>
              <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                <span className="inline-flex items-center gap-1"><Heart size={11} /> 128</span>
                <span className="inline-flex items-center gap-1"><MessageCircle size={11} /> 24</span>
              </div>
            </div>
          </Swap>
        </div>
        {/* profile */}
        <div className={panel}>
          <Swap
            loading={loading}
            skeleton={
              <div className="flex flex-col items-center gap-2 pt-1">
                <Sk className="h-14 w-14 !rounded-full" />
                <Sk className="h-3 w-24" />
                <Sk className="h-2.5 w-32" />
                <Sk className="mt-1 h-7 w-full !rounded-full" />
              </div>
            }
          >
            <div className="flex flex-col items-center gap-1 pt-1 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-pink-400 text-lg font-bold text-white">
                SA
              </div>
              <div className="text-[13px] font-semibold">佐藤 あおい</div>
              <div className="text-[11px] text-zinc-500">プロダクトデザイナー・東京</div>
              <button className="mt-1.5 w-full rounded-full bg-violet-600 py-1.5 text-xs font-medium text-white">フォローする</button>
            </div>
          </Swap>
        </div>
        {/* list */}
        <div className={panel}>
          <Swap
            loading={loading}
            skeleton={
              <div className="space-y-2.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Sk className="h-8 w-8 !rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Sk className="h-2.5 w-2/3" />
                      <Sk className="h-2 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            }
          >
            <div className="space-y-2.5">
              {[
                ['🍜', 'ラーメン山田', '★4.6 · 徒歩3分'],
                ['☕', '喫茶こもれび', '★4.8 · 徒歩5分'],
                ['🍣', '鮨 しおさい', '★4.9 · 徒歩8分'],
              ].map(([e, n, s]) => (
                <div key={n} className="flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-amber-100">{e}</div>
                  <div>
                    <div className="text-[12px] font-medium">{n}</div>
                    <div className="text-[10px] text-zinc-500">{s}</div>
                  </div>
                </div>
              ))}
            </div>
          </Swap>
        </div>
        {/* table */}
        <div className={panel}>
          <Swap
            loading={loading}
            skeleton={
              <div className="space-y-2">
                <Sk className="h-3 w-full" />
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-2">
                    <Sk className="h-2.5 flex-[2]" />
                    <Sk className="h-2.5 flex-1" />
                    <Sk className="h-2.5 flex-1" />
                  </div>
                ))}
              </div>
            }
          >
            <table className="w-full text-[11px]">
              <thead className="text-left text-zinc-400">
                <tr>
                  <th className="pb-1 font-medium">商品</th>
                  <th className="pb-1 font-medium">在庫</th>
                  <th className="pb-1 text-right font-medium">評価</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['マグカップ', 32, 4.5],
                  ['トート', 8, 4.2],
                  ['ノート', 120, 4.8],
                  ['ペン', 0, 3.9],
                ].map(([n, s, r]) => (
                  <tr key={n as string} className="border-t border-zinc-100">
                    <td className="py-1">{n}</td>
                    <td className={`py-1 ${s === 0 ? 'text-rose-500' : ''}`}>{s === 0 ? '欠品' : s}</td>
                    <td className="py-1 text-right">
                      <Star size={9} className="mr-0.5 inline fill-amber-400 text-amber-400" />
                      {r}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Swap>
        </div>
      </div>
    </div>
  )
}
