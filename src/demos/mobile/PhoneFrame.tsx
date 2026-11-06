import type { ReactNode } from 'react'
import { BatteryFull, SignalHigh, Wifi } from 'lucide-react'

/** モバイルデモ共通: カードの高さに合わせて縮む、オリジナルのスマホ枠 */
export function PhoneFrame({
  children,
  screenClass = 'bg-white',
  dark = false,
  island = true,
  bg = 'bg-[radial-gradient(circle_at_30%_20%,#e0e7ff,#f5f5f4_60%)]',
  side,
}: {
  children: ReactNode
  /** 画面の背景クラス */
  screenClass?: string
  /** ステータスバーの文字を白にする */
  dark?: boolean
  /** パンチホールのピルを描画するか(独自に描くデモは false) */
  island?: boolean
  /** 外側の背景 */
  bg?: string
  /** 端末の横に置く説明パネル(幅がある時だけ表示) */
  side?: ReactNode
}) {
  return (
    <div className={`relative flex h-full w-full items-center justify-center gap-8 overflow-hidden p-3 font-sans ${bg}`}>
      <div className="relative aspect-[9/19.5] h-full max-h-[660px] shrink-0 rounded-[44px] bg-zinc-900 p-[9px] shadow-[0_30px_60px_-20px_rgba(0,0,0,.45),inset_0_0_0_1.5px_#52525b]">
        <div className={`relative h-full w-full overflow-hidden rounded-[36px] ${screenClass}`}>
          <div className={`absolute inset-x-0 top-0 z-40 flex h-11 items-center justify-between px-[9%] pt-1 text-[11px] font-semibold ${dark ? 'text-white' : 'text-zinc-900'}`}>
            <span className="tabular-nums">9:41</span>
            <span className="flex items-center gap-0.5">
              <SignalHigh size={12} strokeWidth={2.6} />
              <Wifi size={12} strokeWidth={2.6} />
              <BatteryFull size={16} strokeWidth={2} />
            </span>
          </div>
          {island && <div className="absolute top-2.5 left-1/2 z-50 h-[24px] w-[31%] -translate-x-1/2 rounded-full bg-black" />}
          {children}
          <div className={`pointer-events-none absolute bottom-1.5 left-1/2 z-50 h-1 w-[34%] -translate-x-1/2 rounded-full ${dark ? 'bg-white/80' : 'bg-zinc-900/80'}`} />
        </div>
      </div>
      {side && <div className="hidden max-w-[260px] text-sm text-zinc-600 [@media(min-width:760px)]:block">{side}</div>}
    </div>
  )
}
