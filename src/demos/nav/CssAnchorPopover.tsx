import { useId } from 'react'
import { Bell, Bold, CircleHelp, Italic, Link2, MoreHorizontal, Underline } from 'lucide-react'

/**
 * JavaScript のイベント処理は一切なし。
 * - ツールチップ: :hover / :focus-visible + CSS Anchor Positioning(position-anchor / position-area)
 * - メニュー/ヘルプ: HTML の popover 属性 + popovertarget(開閉・外側クリックで閉じる・Esc はブラウザ標準)
 * - はみ出し時の反転: position-try-fallbacks: flip-block / flip-inline
 * - 出現アニメ: @starting-style + transition-behavior: allow-discrete
 */
const css = (u: string) => `
.ap-root .tb-btn{anchor-name:var(--a)}
.ap-root .tip{position:absolute;position-anchor:var(--a);position-area:top;margin-bottom:8px;position-try-fallbacks:flip-block;
  opacity:0;translate:0 4px;pointer-events:none;transition:opacity .15s,translate .15s}
.ap-root .tb-btn:hover + .tip,.ap-root .tb-btn:focus-visible + .tip{opacity:1;translate:0 0}
.ap-root [popover]{position:fixed;inset:auto;margin:0;position-try-fallbacks:flip-block,flip-inline;
  opacity:0;scale:.96;transition:opacity .16s,scale .16s,overlay .16s allow-discrete,display .16s allow-discrete}
.ap-root [popover]:popover-open{opacity:1;scale:1}
@starting-style{.ap-root [popover]:popover-open{opacity:0;scale:.96}}
.ap-root #ap-menu-${u}{position-anchor:--ap-menu-btn-${u};position-area:bottom span-left;margin-top:8px}
.ap-root #ap-help-${u}{position-anchor:--ap-help-btn-${u};position-area:right;margin-left:10px}
.ap-root #ap-notif-${u}{position-anchor:--ap-notif-btn-${u};position-area:bottom span-right;margin-top:8px}
.ap-root .unsupported{display:none}
@supports not (anchor-name: --x){.ap-root .unsupported{display:block}}
`

const TOOLS = [
  { icon: Bold, label: '太字', key: '⌘B' },
  { icon: Italic, label: '斜体', key: '⌘I' },
  { icon: Underline, label: '下線', key: '⌘U' },
  { icon: Link2, label: 'リンクを挿入', key: '⌘K' },
]

export function CssAnchorPopover() {
  const u = useId().replace(/[^a-zA-Z0-9]/g, '')
  return (
    <div className="ap-root relative h-full w-full overflow-hidden bg-gradient-to-br from-stone-100 to-stone-200 p-5 font-sans text-stone-800">
      <style>{css(u)}</style>
      <div className="mb-4 flex items-center gap-2">
        <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-semibold text-white">JavaScript 0行</span>
        <span className="text-xs text-stone-500">popover 属性 + CSS Anchor Positioning だけで動作</span>
      </div>

      <div className="mx-auto max-w-md rounded-2xl border border-stone-300 bg-white shadow-sm">
        <div className="flex items-center gap-1 border-b border-stone-200 p-2">
          {TOOLS.map((t, i) => {
            const I = t.icon
            return (
              <span key={t.label} className="contents">
                <button
                  type="button"
                  className="tb-btn grid h-8 w-8 place-items-center rounded-md text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                  style={{ ['--a' as string]: `--ap-t${i}-${u}` }}
                  aria-label={t.label}
                >
                  <I size={16} />
                </button>
                <span
                  className="tip z-10 rounded-md bg-stone-900 px-2 py-1 text-[11px] whitespace-nowrap text-white shadow-lg"
                  style={{ ['--a' as string]: `--ap-t${i}-${u}` }}
                >
                  {t.label} <span className="ml-1 font-mono text-stone-400">{t.key}</span>
                </span>
              </span>
            )
          })}
          <div className="mx-1 h-5 w-px bg-stone-200" />
          <button
            type="button"
            popoverTarget={`ap-notif-${u}`}
            className="relative grid h-8 w-8 place-items-center rounded-md text-stone-600 hover:bg-stone-100"
            style={{ anchorName: `--ap-notif-btn-${u}` } as React.CSSProperties}
            aria-label="通知"
          >
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>
          <button
            type="button"
            popoverTarget={`ap-menu-${u}`}
            className="ml-auto grid h-8 w-8 place-items-center rounded-md text-stone-600 hover:bg-stone-100"
            style={{ anchorName: `--ap-menu-btn-${u}` } as React.CSSProperties}
            aria-label="その他"
          >
            <MoreHorizontal size={16} />
          </button>
        </div>
        <div className="p-4 text-sm leading-relaxed text-stone-600">
          ツールバーのアイコンにホバーするとツールチップ、
          <button
            type="button"
            popoverTarget={`ap-help-${u}`}
            className="mx-1 inline-flex translate-y-0.5 items-center text-sky-600"
            style={{ anchorName: `--ap-help-btn-${u}` } as React.CSSProperties}
            aria-label="ヘルプ"
          >
            <CircleHelp size={15} />
          </button>
          をクリックすると説明ポップオーバーが開きます。外側クリックや Esc で閉じるのもブラウザ標準の機能です。
        </div>
      </div>

      <p className="unsupported mt-3 text-center text-xs text-rose-600">
        ※ このブラウザは CSS Anchor Positioning 未対応のため位置がずれます(Chrome 125+ / Safari 26+ 推奨)
      </p>

      {/* ポップオーバー本体(トップレイヤーに表示) */}
      <div id={`ap-menu-${u}`} popover="auto" className="w-48 rounded-xl border border-stone-200 bg-white p-1 text-sm text-stone-700 shadow-xl">
        {['複製', 'テンプレートとして保存', 'バージョン履歴', 'PDF に書き出し'].map((l) => (
          <button key={l} type="button" popoverTarget={`ap-menu-${u}`} popoverTargetAction="hide" className="block w-full rounded-md px-3 py-1.5 text-left hover:bg-stone-100">
            {l}
          </button>
        ))}
        <div className="my-1 h-px bg-stone-200" />
        <button type="button" popoverTarget={`ap-menu-${u}`} popoverTargetAction="hide" className="block w-full rounded-md px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50">
          削除
        </button>
      </div>
      <div id={`ap-help-${u}`} popover="auto" className="w-56 rounded-xl bg-sky-600 p-3 text-xs leading-relaxed text-white shadow-xl">
        <div className="mb-1 font-semibold">popover 属性とは?</div>
        HTML だけでトップレイヤーに表示されるポップアップ。CSS の position-area でボタンの右に配置し、はみ出すと自動で反転します。
      </div>
      <div id={`ap-notif-${u}`} popover="auto" className="w-60 rounded-xl border border-stone-200 bg-white p-2 text-xs text-stone-700 shadow-xl">
        <div className="px-2 py-1 font-semibold">通知</div>
        {['佐藤さんがコメントしました', '「企画書」が共有されました', '新しいバージョンがあります'].map((l, i) => (
          <div key={l} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-stone-100">
            <span className={`h-1.5 w-1.5 rounded-full ${i === 0 ? 'bg-rose-500' : 'bg-stone-300'}`} />
            {l}
          </div>
        ))}
      </div>
    </div>
  )
}
