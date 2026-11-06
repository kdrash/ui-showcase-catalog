import { useState } from 'react'

/**
 * 2000年代初頭の「Aqua」風デスクトップを CSS だけで再現。
 * - ジェル状のボタン(デフォルトボタンは青く脈打つ)、ピンストライプのウィンドウ、信号機ボタン
 * - ブラッシュドメタルのツールバー、タイトルバーから垂れ下がるシート、Dock 風の棚(ホバーで拡大・クリックで跳ねる)
 */

const CSS = `
.aq { font-family: 'Lucida Grande', 'Helvetica Neue', Inter, 'Noto Sans JP', sans-serif; font-size: 12px; color: #111; }
.aq-wall { background:
  radial-gradient(120% 70% at 20% 110%, #9fd6ff 0%, transparent 55%),
  radial-gradient(80% 60% at 85% 0%, #3a7bd5 0%, transparent 60%),
  radial-gradient(140% 90% at 60% 60%, #0b58c4 0%, #052f7a 70%); }
.aq-swoosh { position:absolute; inset:-20%; background:
  radial-gradient(60% 18% at 50% 50%, rgba(255,255,255,.35), transparent 70%); transform: rotate(-18deg); filter: blur(6px); }
.aq-menubar { background: linear-gradient(#fdfdfd, #e4e4e4 60%, #d6d6d6); border-bottom: 1px solid #8a8a8a;
  box-shadow: 0 1px 3px rgba(0,0,0,.25); }
.aq-win { background: repeating-linear-gradient(#ececec 0 2px, #f7f7f7 2px 4px); border-radius: 7px 7px 4px 4px;
  box-shadow: 0 14px 36px rgba(0,0,0,.45), 0 0 0 1px rgba(0,0,0,.35); overflow: hidden; }
.aq-metal { background:
  repeating-linear-gradient(90deg, rgba(255,255,255,.08) 0 1px, rgba(0,0,0,.04) 1px 2px, rgba(255,255,255,.05) 2px 4px),
  linear-gradient(#d9d9d9, #b6b6b6 55%, #a9a9a9); border-bottom: 1px solid #6f6f6f; }
.aq-title { text-shadow: 0 1px 0 rgba(255,255,255,.8); font-weight: 600; color: #222; }
.aq-light { width: 13px; height: 13px; border-radius: 50%; position: relative; box-shadow: inset 0 1px 2px rgba(0,0,0,.45), 0 1px 0 rgba(255,255,255,.6);
  display: grid; place-items: center; font-size: 9px; font-weight: 900; color: transparent; line-height: 1; }
.aq-light::after { content:''; position:absolute; left: 3px; right: 3px; top: 1px; height: 5px; border-radius: 50%;
  background: linear-gradient(rgba(255,255,255,.95), rgba(255,255,255,.1)); }
.aq-lights:hover .aq-light { color: rgba(60,0,0,.6); }
.aq-r { background: radial-gradient(circle at 50% 75%, #ffb3a8, #e0361f 55%, #a01204); }
.aq-y { background: radial-gradient(circle at 50% 75%, #ffeaa0, #f2a81a 55%, #a86400); }
.aq-g { background: radial-gradient(circle at 50% 75%, #c7f7a8, #3fb81d 55%, #1f6e06); }
.aq-btn { position: relative; border-radius: 999px; padding: 3px 18px; min-width: 70px; border: 1px solid #6b6b6b;
  background: linear-gradient(#ffffff, #eaeaea 50%, #d6d6d6 51%, #f1f1f1); box-shadow: 0 1px 2px rgba(0,0,0,.35), inset 0 1px 0 #fff;
  font-size: 12px; cursor: pointer; }
.aq-btn:active { background: linear-gradient(#c7c7c7, #dedede); }
.aq-btn.def { color: #001; border-color: #1d4a8a;
  background: linear-gradient(#cfe6ff, #6fb0ff 50%, #2f86f5 51%, #93ceff); animation: aqPulse 1.6s ease-in-out infinite; }
.aq-btn.def::before { content:''; position:absolute; left: 8px; right: 8px; top: 1px; height: 45%; border-radius: 999px;
  background: linear-gradient(rgba(255,255,255,.9), rgba(255,255,255,.15)); }
@keyframes aqPulse { 50% { filter: brightness(1.18) saturate(1.2); box-shadow: 0 1px 6px rgba(40,120,255,.6), inset 0 1px 0 #fff; } }
.aq-seg { display:flex; border-radius: 999px; overflow: hidden; border: 1px solid #6b6b6b; box-shadow: 0 1px 2px rgba(0,0,0,.25); }
.aq-seg button { padding: 2px 12px; background: linear-gradient(#fff, #e6e6e6 50%, #d3d3d3 51%, #efefef); border-right: 1px solid #8d8d8d; font-size: 11px; }
.aq-seg button:last-child { border-right: 0; }
.aq-seg button.on { background: linear-gradient(#b7d9ff, #4f9cf9 50%, #2a7ef0 51%, #84c2ff); color:#001; }
.aq-bar { height: 14px; border-radius: 999px; border: 1px solid #5f7fa8; overflow: hidden; background: linear-gradient(#e9eef5, #fff); }
.aq-bar > i { display:block; height: 100%; border-radius: 999px;
  background: repeating-linear-gradient(-45deg, rgba(255,255,255,.55) 0 7px, transparent 7px 14px), linear-gradient(#cfe5ff, #4c97f5 50%, #2878e8 51%, #7bbcff);
  background-size: 20px 100%, 100% 100%; animation: aqBarber .7s linear infinite; }
@keyframes aqBarber { to { background-position: 20px 0, 0 0; } }
.aq-check { width: 14px; height: 14px; border-radius: 3px; border: 1px solid #777; display: inline-grid; place-items: center;
  background: linear-gradient(#fff, #ddd); box-shadow: inset 0 1px 0 #fff; font-size: 11px; color: #fff; }
.aq-check.on { background: linear-gradient(#cfe6ff, #5aa2f8 50%, #2f86f5 51%, #93ceff); border-color: #1d4a8a; }
.aq-sheet-clip { position: absolute; left: 0; right: 0; top: 62px; bottom: 0; overflow: hidden; pointer-events: none; z-index: 5; }
.aq-sheet { pointer-events: auto; position: absolute; left: 50%; top: 0; width: 78%; transform: translate(-50%, -105%); transition: transform .35s cubic-bezier(.2,.9,.3,1);
  background: rgba(240,240,240,.94); border: 1px solid #7a7a7a; border-top: 0; border-radius: 0 0 6px 6px; box-shadow: 0 10px 24px rgba(0,0,0,.35); z-index: 5; }
.aq-sheet.open { transform: translate(-50%, 0); }
.aq-shelf { background: linear-gradient(rgba(255,255,255,.55), rgba(255,255,255,.18)); border: 1px solid rgba(255,255,255,.6);
  border-radius: 10px 10px 0 0; box-shadow: inset 0 1px 0 rgba(255,255,255,.8), 0 -2px 12px rgba(0,0,0,.25); backdrop-filter: blur(6px); }
.aq-dock-i { width: 40px; height: 40px; border-radius: 10px; transition: transform .18s ease; transform-origin: bottom center; position: relative;
  box-shadow: 0 3px 6px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.7); display:grid; place-items:center; font-size: 20px; cursor: pointer; }
.aq-dock-i::before { content:''; position:absolute; left: 4px; right: 4px; top: 2px; height: 45%; border-radius: 8px 8px 50% 50%;
  background: linear-gradient(rgba(255,255,255,.75), rgba(255,255,255,0)); }
.aq-dock-i:hover { transform: scale(1.45); }
.aq-dock-i:hover + .aq-dock-i, .aq-dock-wrap:has(+ .aq-dock-wrap .aq-dock-i:hover) .aq-dock-i { transform: scale(1.18); }
.aq-dock-i.bounce { animation: aqBounce .5s ease 2; }
@keyframes aqBounce { 40% { transform: translateY(-16px); } }
.aq-dot { width: 4px; height: 4px; border-radius: 50%; background: #fff; box-shadow: 0 0 4px #9cf; margin: 2px auto 0; }
.aq-list > div:nth-child(odd) { background: #edf3fe; }
.aq-list > div.sel { background: linear-gradient(#6ea9f7, #2c6fe0); color: #fff; }
`

const DOCK = [
  { e: '🗂️', bg: 'linear-gradient(#9fd3ff,#2a7de1)', n: 'Finder' },
  { e: '🌐', bg: 'linear-gradient(#bfe8ff,#1f8fd8)', n: 'Browser' },
  { e: '✉️', bg: 'linear-gradient(#f3f7ff,#9fb9de)', n: 'Mail' },
  { e: '🎵', bg: 'linear-gradient(#e0d0ff,#7b5cd6)', n: 'Music' },
  { e: '📷', bg: 'linear-gradient(#ffe7c2,#e08b2a)', n: 'Photos' },
  { e: '⚙️', bg: 'linear-gradient(#e6e6e6,#8f8f8f)', n: 'Prefs' },
]

export function AquaDesktop() {
  const [sheet, setSheet] = useState(false)
  const [tab, setTab] = useState(0)
  const [checks, setChecks] = useState([true, false, true])
  const [sel, setSel] = useState(1)
  const [bouncing, setBouncing] = useState<number | null>(null)
  const [saved, setSaved] = useState(false)

  const files = ['Vacation.jpg', 'Project Notes.rtf', 'Mixtape.m3u', 'Budget 2002.xls', 'Resume.pdf']

  return (
    <div className="aq aq-wall relative h-full w-full overflow-hidden">
      <style>{CSS}</style>
      <div className="aq-swoosh pointer-events-none" />

      {/* menu bar */}
      <div className="aq-menubar absolute inset-x-0 top-0 z-10 flex h-[22px] items-center gap-4 px-3 text-[12px]">
        <span className="text-[14px] text-[#2a6fe0]">◉</span>
        <b>Finder</b>
        <span>ファイル</span>
        <span>編集</span>
        <span>表示</span>
        <span>移動</span>
        <span>ウインドウ</span>
        <span className="ml-auto">{saved ? '✓ 保存しました' : '月 21:43'}</span>
      </div>

      {/* window */}
      <div className="aq-win absolute left-1/2 top-[34px] w-[min(470px,88%)] -translate-x-1/2" style={{ height: 'calc(100% - 112px)', minHeight: 230 }}>
        <div className="aq-metal relative flex flex-col items-stretch px-2 pt-1.5 pb-2">
          <div className="relative flex items-center">
            <div className="aq-lights flex gap-[7px]">
              <span className="aq-light aq-r">×</span>
              <span className="aq-light aq-y">–</span>
              <span className="aq-light aq-g">+</span>
            </div>
            <div className="aq-title absolute inset-x-0 text-center">環境設定 — デスクトップ</div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div className="aq-seg">
              {['一般', 'デスクトップ', 'サウンド'].map((t, i) => (
                <button key={t} className={tab === i ? 'on' : ''} onClick={() => setTab(i)}>
                  {t}
                </button>
              ))}
            </div>
            <div className="rounded-full border border-[#777] bg-white px-2 py-[1px] text-[11px] text-[#888] shadow-inner">🔍 検索</div>
          </div>
        </div>

        {/* sheet */}
        <div className="aq-sheet-clip"><div className={`aq-sheet ${sheet ? 'open' : ''}`}>
          <div className="p-4">
            <div className="mb-2 font-semibold">変更内容を保存しますか?</div>
            <div className="mb-3 text-[11px] text-[#555]">保存しないと、行った変更はすべて失われます。</div>
            <div className="mb-3 flex items-center gap-2">
              <span>名前:</span>
              <div className="flex-1 rounded-[3px] border border-[#888] bg-white px-1.5 py-[2px] shadow-inner">デスクトップ設定.plist</div>
            </div>
            <div className="flex justify-end gap-2">
              <button className="aq-btn" onClick={() => setSheet(false)}>
                キャンセル
              </button>
              <button
                className="aq-btn def"
                onClick={() => {
                  setSheet(false)
                  setSaved(true)
                  setTimeout(() => setSaved(false), 2200)
                }}
              >
                保存
              </button>
            </div>
          </div>
        </div></div>

        <div className="flex h-[calc(100%-62px)] gap-3 p-3">
          <div className="aq-list w-[44%] overflow-auto rounded border border-[#9a9a9a] bg-white text-[11px] shadow-inner">
            {files.map((f, i) => (
              <div key={f} className={`cursor-default px-2 py-[3px] ${sel === i ? 'sel' : ''}`} onClick={() => setSel(i)}>
                📄 {f}
              </div>
            ))}
          </div>
          <div className="flex flex-1 flex-col gap-2.5">
            {['ドックを自動的に隠す', 'ウインドウをジニーで最小化', '起動中のアプリにランプを表示'].map((l, i) => (
              <label key={l} className="flex cursor-pointer items-center gap-2" onClick={() => setChecks((c) => c.map((v, j) => (j === i ? !v : v)))}>
                <span className={`aq-check ${checks[i] ? 'on' : ''}`}>{checks[i] ? '✓' : ''}</span>
                {l}
              </label>
            ))}
            <div>
              <div className="mb-1 text-[11px] text-[#444]">ディスクを最適化中…</div>
              <div className="aq-bar">
                <i style={{ width: '64%' }} />
              </div>
            </div>
            <div className="mt-auto flex justify-end gap-2">
              <button className="aq-btn" onClick={() => setChecks([false, false, false])}>
                元に戻す
              </button>
              <button className="aq-btn def" onClick={() => setSheet(true)}>
                保存…
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* dock shelf */}
      <div className="absolute inset-x-0 bottom-0 flex justify-center">
        <div className="aq-shelf flex items-end gap-2 px-3 pt-2 pb-1">
          {DOCK.map((d, i) => (
            <div key={d.n} className="aq-dock-wrap" title={d.n}>
              <div
                className={`aq-dock-i ${bouncing === i ? 'bounce' : ''}`}
                style={{ background: d.bg }}
                onClick={() => {
                  setBouncing(i)
                  setTimeout(() => setBouncing(null), 1000)
                }}
              >
                <span className="relative">{d.e}</span>
              </div>
              <div className="aq-dot" style={{ opacity: i < 3 ? 1 : 0 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
