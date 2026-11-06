import { useEffect, useRef, useState } from 'react'
import { driver, type Driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { ChartColumn, Bell, Home, Plus, Search, Settings, Sparkles, Users } from 'lucide-react'

// driver.js のポップオーバーは body 直下に描画されるので、専用クラスで見た目を上書き
const CSS = `
.tour-pop.driver-popover{background:#18181b;color:#e4e4e7;border:1px solid #3f3f46;border-radius:14px;padding:14px 16px;box-shadow:0 20px 50px -10px rgba(0,0,0,.6);max-width:260px;font-family:Inter,'Noto Sans JP',sans-serif}
.tour-pop .driver-popover-title{font-size:14px;font-weight:700;color:#fff}
.tour-pop .driver-popover-description{font-size:12px;line-height:1.6;color:#a1a1aa;margin-top:4px}
.tour-pop .driver-popover-progress-text{font-size:11px;color:#71717a}
.tour-pop .driver-popover-footer button{background:#27272a;color:#e4e4e7;border:1px solid #3f3f46;text-shadow:none;border-radius:8px;padding:5px 10px;font-size:12px}
.tour-pop .driver-popover-footer .driver-popover-next-btn{background:linear-gradient(135deg,#8b5cf6,#ec4899);border:0;color:#fff;font-weight:600}
.tour-pop .driver-popover-close-btn{color:#71717a}
.tour-pop .driver-popover-arrow-side-left.driver-popover-arrow{border-left-color:#18181b}
.tour-pop .driver-popover-arrow-side-right.driver-popover-arrow{border-right-color:#18181b}
.tour-pop .driver-popover-arrow-side-top.driver-popover-arrow{border-top-color:#18181b}
.tour-pop .driver-popover-arrow-side-bottom.driver-popover-arrow{border-bottom-color:#18181b}
`

export function ProductTour() {
  const root = useRef<HTMLDivElement>(null)
  const drv = useRef<Driver | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => () => drv.current?.destroy(), [])

  const q = (sel: string) => () => root.current!.querySelector(`[data-tour="${sel}"]`) as Element

  const start = () => {
    drv.current?.destroy()
    drv.current = driver({
      showProgress: true,
      progressText: '{{current}} / {{total}}',
      nextBtnText: '次へ →',
      prevBtnText: '← 戻る',
      doneBtnText: '完了 🎉',
      popoverClass: 'tour-pop',
      overlayColor: '#09090b',
      overlayOpacity: 0.65,
      stagePadding: 6,
      stageRadius: 10,
      smoothScroll: true,
      onDestroyed: () => setDone(true),
      steps: [
        { element: q('search'), popover: { title: 'どこでも検索', description: 'プロジェクト・メンバー・ファイルを横断検索できます。⌘K でも開けます。', side: 'bottom' } },
        { element: q('create'), popover: { title: 'ワンクリックで作成', description: '新しいプロジェクトやタスクはここから。テンプレートも選べます。', side: 'bottom', align: 'end' } },
        { element: q('kpi'), popover: { title: '今週のサマリー', description: '主要な指標がリアルタイムで更新されます。カードをクリックで詳細へ。', side: 'top' } },
        { element: q('nav'), popover: { title: 'ナビゲーション', description: 'よく使う画面へはサイドバーから素早く移動できます。', side: 'right' } },
        { element: q('ai'), popover: { title: 'AIアシスタント ✨', description: '迷ったらAIに質問。レポート作成も任せられます。', side: 'left' } },
      ],
    })
    drv.current.drive()
  }

  return (
    <div ref={root} className="relative flex h-full w-full overflow-hidden bg-zinc-950 font-sans text-zinc-200">
      <style>{CSS}</style>
      <aside data-tour="nav" className="flex w-14 shrink-0 flex-col items-center gap-2 border-r border-white/5 bg-zinc-900/70 py-3">
        <div className="mb-2 grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 text-sm font-black text-white">N</div>
        {[Home, ChartColumn, Users, Settings].map((I, i) => (
          <button key={i} className={`grid h-9 w-9 place-items-center rounded-lg ${i === 0 ? 'bg-white/10 text-white' : 'text-zinc-500 hover:bg-white/5'}`}>
            <I size={17} />
          </button>
        ))}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-white/5 px-3 py-2.5">
          <div data-tour="search" className="flex flex-1 items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-zinc-500">
            <Search size={13} /> 検索…<kbd className="ml-auto rounded bg-white/10 px-1.5 text-[10px]">⌘K</kbd>
          </div>
          <button className="grid h-8 w-8 place-items-center rounded-lg text-zinc-400 hover:bg-white/5">
            <Bell size={15} />
          </button>
          <button data-tour="create" className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-900">
            <Plus size={13} /> 新規
          </button>
        </header>
        <main className="relative flex-1 space-y-3 overflow-hidden p-3">
          <div className="flex items-center justify-between rounded-xl border border-violet-500/30 bg-gradient-to-r from-violet-500/15 to-pink-500/10 p-3">
            <div>
              <div className="text-sm font-semibold text-white">{done ? 'ツアー完了!お疲れさまでした' : 'ようこそ、Nimbus へ 👋'}</div>
              <div className="text-[11px] text-zinc-400">1分で主な機能をご案内します</div>
            </div>
            <button
              onClick={start}
              className="rounded-lg bg-gradient-to-r from-violet-500 to-pink-500 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:brightness-110 active:scale-95"
            >
              {done ? 'もう一度' : 'ツアーを開始'}
            </button>
          </div>
          <div data-tour="kpi" className="grid grid-cols-3 gap-2">
            {[
              ['売上', '¥2.4M', '+12%'],
              ['新規ユーザー', '1,284', '+8%'],
              ['解約率', '1.9%', '-0.4pt'],
            ].map(([l, v, d]) => (
              <div key={l} className="rounded-xl border border-white/5 bg-white/[0.03] p-2.5">
                <div className="text-[10px] text-zinc-500">{l}</div>
                <div className="text-base font-bold text-white">{v}</div>
                <div className="text-[10px] text-emerald-400">{d}</div>
              </div>
            ))}
          </div>
          <div className="flex h-16 items-end gap-1 rounded-xl border border-white/5 bg-white/[0.03] p-2.5">
            {[40, 65, 50, 80, 60, 92, 74, 88, 70, 96, 84, 100].map((h, i) => (
              <div key={i} className="flex-1 rounded-sm bg-gradient-to-t from-violet-600/40 to-violet-400" style={{ height: `${h}%` }} />
            ))}
          </div>
          <button
            data-tour="ai"
            className="absolute right-3 bottom-3 grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-pink-500 text-white shadow-lg shadow-pink-500/30"
          >
            <Sparkles size={17} />
          </button>
        </main>
      </div>
    </div>
  )
}
