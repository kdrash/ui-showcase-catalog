import { art } from '../_shared/art'

/**
 * JavaScript なしの CSS Scroll-driven Animations。
 * - 名前付きスクロールタイムライン(scroll-timeline: --sd-scroller)+ timeline-scope で外側の進捗バーを駆動
 * - animation-timeline: view() + animation-range で要素が見えたときにフェード・スライド・拡大・回転
 * 非対応ブラウザでは @supports で通常表示にフォールバック。
 */

const CSS = `
.sd-root { timeline-scope: --sd-scroller; }
.sd-scroller { scroll-timeline: --sd-scroller block; }
@keyframes sd-grow { from { transform: scaleX(0) } to { transform: scaleX(1) } }
@keyframes sd-reveal { from { opacity: 0; transform: translateY(40px) scale(.96); filter: blur(6px) } to { opacity: 1; transform: none; filter: none } }
@keyframes sd-zoom { from { transform: scale(.55) rotate(-8deg); border-radius: 48px } to { transform: scale(1) rotate(0); border-radius: 16px } }
@keyframes sd-slide-l { from { transform: translateX(-30%) } to { transform: translateX(0) } }
@keyframes sd-slide-r { from { transform: translateX(30%) } to { transform: translateX(-10%) } }
@keyframes sd-spin { to { transform: rotate(360deg) } }
@keyframes sd-hue { from { filter: hue-rotate(0deg) } to { filter: hue-rotate(160deg) } }
@supports (animation-timeline: view()) {
  .sd-bar { animation: sd-grow linear both; animation-timeline: --sd-scroller; }
  .sd-badge { animation: sd-spin linear both; animation-timeline: --sd-scroller; }
  .sd-reveal { animation: sd-reveal ease-out both; animation-timeline: view(); animation-range: entry 0% cover 35%; }
  .sd-zoom { animation: sd-zoom linear both; animation-timeline: view(); animation-range: entry 10% cover 50%; }
  .sd-l { animation: sd-slide-l linear both; animation-timeline: view(); }
  .sd-r { animation: sd-slide-r linear both; animation-timeline: view(); }
  .sd-hue { animation: sd-hue linear both; animation-timeline: --sd-scroller; }
  .sd-fallback { display: none; }
}
`

const CARDS = [
  { t: 'view()', d: '要素がスクロールポートに入ってから出るまでを 0→100% として扱う。' },
  { t: 'scroll()', d: 'スクロールコンテナ全体の進捗をタイムラインに。進捗バーに最適。' },
  { t: 'animation-range', d: 'entry / cover / contain / exit で再生区間を指定できる。' },
]

export function CssScrollDriven() {
  return (
    <div className="sd-root relative h-full w-full overflow-hidden bg-[#f6f3ee] text-zinc-900">
      <style>{CSS}</style>
      <div className="sd-scroller thin-scroll absolute inset-0 overflow-y-auto">
        <header className="flex h-[260px] flex-col justify-center px-8">
          <p className="font-mono text-[11px] tracking-[0.25em] text-orange-600">NO JAVASCRIPT</p>
          <h2 className="mt-2 font-['Space_Grotesk'] text-[clamp(30px,7cqw,56px)] leading-[0.95] font-bold tracking-tight">
            CSS だけで
            <br />
            スクロール連動。
          </h2>
          <p className="mt-3 text-xs text-zinc-500">↓ スクロール</p>
          <p className="sd-fallback mt-2 text-[11px] text-red-500">※ このブラウザは animation-timeline 非対応のため静止表示です</p>
        </header>

        <div className="overflow-hidden py-4 font-['Space_Grotesk'] text-5xl font-bold whitespace-nowrap">
          <div className="sd-l text-zinc-900">SCROLL · DRIVEN · ANIMATIONS ·</div>
          <div className="sd-r text-transparent [-webkit-text-stroke:1.5px_#ea580c]">animation-timeline: view();</div>
        </div>

        <div className="px-8 py-6">
          <div className="sd-zoom mx-auto aspect-[16/9] w-full max-w-lg overflow-hidden shadow-2xl shadow-orange-900/20">
            <div className="sd-hue h-full w-full bg-cover bg-center" style={{ backgroundImage: `url("${art('landscape', 3, 960, 540)}")` }} />
          </div>
        </div>

        <div className="grid gap-3 px-8 py-6">
          {CARDS.map((c, i) => (
            <div key={c.t} className="sd-reveal rounded-2xl border border-zinc-900/10 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-orange-500 font-mono text-xs font-bold text-white">{i + 1}</span>
                <code className="font-mono text-sm font-semibold">{c.t}</code>
              </div>
              <p className="mt-2 text-[13px] text-zinc-600">{c.d}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 px-8 py-6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="sd-reveal aspect-square rounded-xl bg-cover" style={{ backgroundImage: `url("${art('geometric', i + 1, 300, 300)}")` }} />
          ))}
        </div>
        <p className="px-8 pt-4 pb-16 text-center text-xs text-zinc-400">— fin —</p>
      </div>

      {/* 外側(スクロールしない領域)に置いた進捗バー:timeline-scope で名前付きタイムラインを参照 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-orange-500/10">
        <div className="sd-bar h-full origin-left bg-orange-500" />
      </div>
      <div className="sd-badge pointer-events-none absolute right-4 bottom-4 grid h-14 w-14 place-items-center rounded-full border-2 border-dashed border-orange-500 font-mono text-[9px] font-bold text-orange-600">
        CSS
      </div>
    </div>
  )
}
