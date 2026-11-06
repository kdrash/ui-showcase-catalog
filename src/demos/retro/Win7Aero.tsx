import css7 from '7.css/dist/7.scoped.css?inline'
import { AnimatePresence, motion, useDragControls } from 'motion/react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { ShadowScope } from '../../catalog/helpers'

/**
 * Windows 7 Aero 風ガラスウィンドウ。
 * - 7.css の scoped 版(.win7 配下だけに効く)を ShadowScope 内で使用
 * - .window.glass.active で半透明ガラス枠、--w7-w-bg 変数でガラスの色を変更
 * - タブ(menu[role=tablist] > button)、[role=progressbar]、button.default、[role=tooltip] バルーン
 * - タイトルバーを Motion の dragControls でドラッグ移動、下部に自作のガラスタスクバー
 */

type Tab = 'color' | 'sound' | 'perf'

const TINTS = [
  { name: 'Sky', c: '#4580c4' },
  { name: 'Twilight', c: '#5b4fc4' },
  { name: 'Sea Foam', c: '#2aa198' },
  { name: 'Leaf', c: '#5aa43a' },
  { name: 'Ruby', c: '#c4455d' },
  { name: 'Slate', c: '#55606e' },
]

const EXTRA_CSS = `
.w7-desk { position: relative; height: 100%; width: 100%; overflow: hidden; font: 9pt "Segoe UI", "Noto Sans JP", sans-serif; color: #000;
  background:
    radial-gradient(ellipse 60% 40% at 50% 115%, rgba(120,220,255,.65), transparent 70%),
    radial-gradient(ellipse 35% 60% at 15% 20%, rgba(80,160,255,.45), transparent 70%),
    linear-gradient(160deg, #0b2a6b 0%, #1458b8 45%, #0f3d8f 70%, #071d4a 100%); }
.beam { position: absolute; width: 140%; height: 70px; left: -20%; border-radius: 50%; filter: blur(18px); opacity: .5;
  background: linear-gradient(90deg, transparent, rgba(160,230,255,.8), transparent); }
.stage { position: absolute; inset: 0 0 40px 0; }
.stage > .window { position: absolute; width: 360px; max-width: calc(100% - 16px); }
.title-bar { cursor: default; touch-action: none; }
.swatches { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; margin: 8px 0; }
.sw { height: 30px; border-radius: 4px; border: 1px solid rgba(0,0,0,.35); cursor: pointer; box-shadow: inset 0 0 0 1px rgba(255,255,255,.6), inset 0 12px 10px -6px rgba(255,255,255,.55); }
.sw.on { outline: 2px solid #3c7fb1; outline-offset: 1px; }
[role=tabpanel] { height: 120px; box-sizing: border-box; }
.row { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
.footer { display: flex; justify-content: flex-end; gap: 6px; margin-top: 8px; }
.taskbar { position: absolute; left: 0; right: 0; bottom: 0; height: 40px; display: flex; align-items: center; gap: 6px; padding: 0 6px;
  background: linear-gradient(rgba(255,255,255,.28), rgba(255,255,255,.08) 50%, rgba(0,0,0,.2) 51%, rgba(0,0,0,.35)), rgba(16,40,80,.55);
  border-top: 1px solid rgba(255,255,255,.35); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
.orb { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; color: #fff; font-size: 15px; cursor: pointer;
  background: radial-gradient(circle at 50% 30%, rgba(255,255,255,.9), rgba(120,200,255,.6) 30%, #1b5fc0 60%, #0a2a66 100%);
  box-shadow: 0 0 10px rgba(120,200,255,.8), inset 0 -3px 6px rgba(0,0,0,.4); border: 1px solid rgba(0,0,0,.5); transition: box-shadow .2s; }
.orb:hover { box-shadow: 0 0 18px rgba(160,230,255,1), inset 0 -3px 6px rgba(0,0,0,.4); }
.pin { width: 44px; height: 32px; border-radius: 4px; display: grid; place-items: center; font-size: 17px; border: 1px solid rgba(255,255,255,.25);
  background: linear-gradient(rgba(255,255,255,.25), rgba(255,255,255,.05) 50%, rgba(255,255,255,.1)); box-shadow: inset 0 0 0 1px rgba(255,255,255,.1); }
.pin.on { background: linear-gradient(rgba(255,255,255,.45), rgba(255,255,255,.15) 50%, rgba(160,220,255,.3)); }
.clock { margin-left: auto; color: #fff; text-align: center; font-size: 11px; line-height: 1.25; padding: 0 8px; text-shadow: 0 0 4px rgba(0,0,0,.6); }
.tip { position: absolute; right: 10px; bottom: 50px; width: 210px; z-index: 30; }
`

export function Win7Aero() {
  const stageRef = useRef<HTMLDivElement>(null)
  const controls = useDragControls()
  const [tab, setTab] = useState<Tab>('color')
  const [tint, setTint] = useState(TINTS[0].c)
  const [volume, setVolume] = useState(60)
  const [glass, setGlass] = useState(true)
  const [tip, setTip] = useState(true)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!tip) return
    const t = setTimeout(() => setTip(false), 6000)
    return () => clearTimeout(t)
  }, [tip])

  return (
    <div className="relative h-full w-full overflow-hidden">
      <ShadowScope css={[css7, EXTRA_CSS]} className="h-full w-full">
        <div className="win7 w7-desk">
          <div className="beam" style={{ top: '18%', transform: 'rotate(-12deg)' }} />
          <div className="beam" style={{ top: '48%', transform: 'rotate(8deg)', opacity: 0.35 }} />
          <div className="stage" ref={stageRef}>
            <motion.div
              className={`window active${glass ? ' glass' : ''}`}
              drag
              dragControls={controls}
              dragListener={false}
              dragMomentum={false}
              dragElastic={0.08}
              dragConstraints={stageRef}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ left: 16, top: 14, ['--w7-w-bg' as string]: tint } as CSSProperties}
            >
              <div className="title-bar" onPointerDown={(e) => !(e.target as HTMLElement).closest('button') && controls.start(e)}>
                <div className="title-bar-text">個人設定 - ウィンドウの色</div>
                <div className="title-bar-controls">
                  <button aria-label="Minimize" />
                  <button aria-label="Maximize" />
                  <button aria-label="Close" />
                </div>
              </div>
              <div className="window-body has-space">
                <menu role="tablist" aria-label="settings">
                  {(
                    [
                      ['color', 'ウィンドウの色'],
                      ['sound', 'サウンド'],
                      ['perf', 'パフォーマンス'],
                    ] as const
                  ).map(([id, label]) => (
                    <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
                      {label}
                    </button>
                  ))}
                </menu>
                <article role="tabpanel">
                  {tab === 'color' && (
                    <>
                      <div>ガラスの色を選択してください:</div>
                      <div className="swatches">
                        {TINTS.map((t) => (
                          <div
                            key={t.c}
                            title={t.name}
                            className={`sw${tint === t.c ? ' on' : ''}`}
                            style={{ background: t.c }}
                            onClick={() => setTint(t.c)}
                          />
                        ))}
                      </div>
                      <div className="row">
                        <input type="checkbox" id="w7-glass" checked={glass} onChange={(e) => setGlass(e.target.checked)} />
                        <label htmlFor="w7-glass">透明感を有効にする (Aero Glass)</label>
                      </div>
                    </>
                  )}
                  {tab === 'sound' && (
                    <>
                      <div className="row">
                        <label htmlFor="w7-vol" style={{ width: 48 }}>
                          音量
                        </label>
                        <input id="w7-vol" type="range" min={0} max={100} value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
                        <span>{volume}</span>
                      </div>
                      <div role="progressbar" aria-valuenow={volume} aria-valuemin={0} aria-valuemax={100}>
                        <div style={{ width: `${volume}%` }} />
                      </div>
                      <div className="row">
                        <input type="radio" id="w7-s1" name="w7-scheme" defaultChecked />
                        <label htmlFor="w7-s1">標準</label>
                        <input type="radio" id="w7-s2" name="w7-scheme" />
                        <label htmlFor="w7-s2">サウンドなし</label>
                      </div>
                    </>
                  )}
                  {tab === 'perf' && (
                    <>
                      <div>システムの評価を実行しています...</div>
                      <div role="progressbar" className="animate" aria-valuenow={68}>
                        <div style={{ width: '68%' }} />
                      </div>
                      <div style={{ marginTop: 10 }}>不確定 (marquee):</div>
                      <div role="progressbar" className="marquee" />
                    </>
                  )}
                </article>
                <div className="footer">
                  <button className="default" onClick={() => setTip(true)}>
                    変更の保存
                  </button>
                  <button onClick={() => setTint(TINTS[0].c)}>キャンセル</button>
                </div>
              </div>
            </motion.div>
          </div>

          <AnimatePresence>
            {tip && (
              <motion.div
                className="tip"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                onClick={() => setTip(false)}
              >
                <div role="tooltip" className="is-top is-left">
                  <b>Aero Glass</b>
                  <br />
                  タイトルバーをドラッグして移動、色を変えてみてください。
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="taskbar">
            <div className="orb" onClick={() => setTip((t) => !t)}>
              ✦
            </div>
            <div className="pin on">🗔</div>
            <div className="pin">📁</div>
            <div className="pin">🎵</div>
            <div className="pin">🌐</div>
            <div className="clock">
              {now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
              <br />
              {now.toLocaleDateString('ja-JP')}
            </div>
          </div>
        </div>
      </ShadowScope>
    </div>
  )
}
