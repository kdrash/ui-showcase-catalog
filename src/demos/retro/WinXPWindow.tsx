import xpCss from 'xp.css/dist/XP.css?inline'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { ShadowScope } from '../../catalog/helpers'

/**
 * Windows XP (Luna) 風のセットアップウィザード。
 * - ウィンドウ・ボタン・ラジオ・チェックボックス・<progress> は XP.css
 * - 草原と青空の壁紙、緑の「start」ボタンと青いタスクバーは自作CSS
 * - ステップ遷移(ようこそ → 使用許諾 → コンポーネント選択 → インストール中 → 完了)
 * - 完了後に通知領域からバルーンが Motion でポップ
 */

type Step = 0 | 1 | 2 | 3 | 4

const COMPONENTS = ['Three.js', 'Motion', 'GSAP', 'Swiper', 'Recharts']
const FILES = ['three.module.js', 'motion.mjs', 'gsap.min.js', 'swiper-bundle.mjs', 'recharts.js', 'catalog.tsx']

const EXTRA_CSS = `
.xp-desk { position: relative; height: 100%; width: 100%; overflow: hidden; color: #000;
  font-family: Tahoma, "Pixelated MS Sans Serif", "Noto Sans JP", sans-serif; font-size: 11px;
  background:
    radial-gradient(ellipse 70% 42% at 28% 104%, #7cc443 0%, #4e9a26 58%, transparent 60%),
    radial-gradient(ellipse 90% 38% at 88% 108%, #6ab83a 0%, #3c8a1d 58%, transparent 60%),
    radial-gradient(ellipse 22% 7% at 22% 24%, rgba(255,255,255,.95), transparent 70%),
    radial-gradient(ellipse 16% 5% at 30% 30%, rgba(255,255,255,.7), transparent 70%),
    radial-gradient(ellipse 20% 6% at 74% 16%, rgba(255,255,255,.85), transparent 70%),
    linear-gradient(#245edb 0%, #5b9cf0 50%, #a7cdf6 78%, #cfe5f8 100%); }
.stage { position: absolute; inset: 0 0 30px 0; display: grid; place-items: center; padding: 8px; }
.window { width: 100%; max-width: 440px; }
.wiz { display: flex; height: 210px; background: #fff; margin: -8px -8px 0; }
.wiz-side { width: 112px; flex-shrink: 0; background: linear-gradient(160deg, #0a246a, #3a6ea5 60%, #a6caf0); color: #fff;
  display: flex; flex-direction: column; justify-content: flex-end; padding: 10px; box-sizing: border-box; }
.wiz-side b { font-size: 13px; line-height: 1.2; }
.wiz-main { flex: 1; padding: 14px 16px; overflow: hidden; }
.wiz-main h4 { margin: 0 0 8px; font-size: 13px; color: #0a246a; }
.wiz-main p { margin: 0 0 8px; line-height: 1.5; }
.wiz-head { background: #fff; border-bottom: 1px solid #aca899; padding: 8px 14px; margin: -8px -8px 0; }
.wiz-head b { display: block; }
.license { width: 100%; height: 82px; resize: none; box-sizing: border-box; font-size: 10px; }
.footer { display: flex; justify-content: flex-end; gap: 6px; border-top: 1px solid #aca899; box-shadow: 0 1px #fff inset; padding-top: 8px; margin-top: 8px; }
.field-row { margin: 4px 0; }
progress { width: 100%; }
.taskbar { position: absolute; left: 0; right: 0; bottom: 0; height: 30px; display: flex; align-items: center; z-index: 10;
  background: linear-gradient(#3168d5 0%, #4993e6 6%, #2157d7 18%, #2663e0 85%, #1941a5 100%); }
.start { height: 30px; padding: 0 18px 0 10px; display: flex; align-items: center; gap: 6px; color: #fff; font-style: italic;
  font-weight: bold; font-size: 17px; font-family: "Trebuchet MS", Tahoma, sans-serif; text-shadow: 1px 1px 2px rgba(0,0,0,.5);
  border-radius: 0 12px 12px 0; cursor: pointer; box-shadow: inset -2px 0 4px rgba(0,0,0,.25);
  background: linear-gradient(#3c9c3c 0%, #5fcb54 12%, #3f9f39 45%, #36922f 85%, #2b7a25 100%); }
.start:hover { filter: brightness(1.1); }
.orb { width: 18px; height: 18px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #fff, #ffe680 35%, #f39c12 80%); box-shadow: 0 0 2px rgba(0,0,0,.4); }
.task { margin-left: 8px; height: 22px; width: 150px; border-radius: 3px; display: flex; align-items: center; gap: 6px; padding: 0 8px;
  color: #fff; background: linear-gradient(#1e52b7, #2e6be6); box-shadow: inset 1px 1px rgba(0,0,0,.35), inset -1px -1px rgba(255,255,255,.15); white-space: nowrap; overflow: hidden; }
.tray { margin-left: auto; height: 30px; display: flex; align-items: center; gap: 8px; padding: 0 12px; color: #fff;
  background: linear-gradient(#0c59b9, #139ee9 8%, #18b9ed 15%, #0f8be6 85%, #0b6bc9); border-left: 1px solid #0b3f9b; box-shadow: inset 1px 0 #47b0ee; }
.balloon { position: absolute; right: 8px; bottom: 38px; width: 220px; background: #ffffe1; border: 1px solid #000; border-radius: 8px;
  padding: 8px 10px; box-shadow: 2px 2px 6px rgba(0,0,0,.3); z-index: 20; }
.balloon:after { content: ""; position: absolute; right: 26px; bottom: -10px; border: 10px solid transparent; border-top-color: #ffffe1; border-bottom: 0; }
.balloon b { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
`

export function WinXPWindow() {
  const [step, setStep] = useState<Step>(0)
  const [agree, setAgree] = useState(false)
  const [picked, setPicked] = useState<string[]>(['Three.js', 'Motion', 'GSAP'])
  const [progress, setProgress] = useState(0)
  const [balloon, setBalloon] = useState(false)
  const [time, setTime] = useState(() => new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 10_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (step !== 3) return
    setProgress(0)
    const t = setInterval(() => setProgress((p) => Math.min(100, p + 2)), 70)
    return () => clearInterval(t)
  }, [step])

  useEffect(() => {
    if (step !== 3 || progress < 100) return
    const t = setTimeout(() => setStep(4), 300)
    return () => clearTimeout(t)
  }, [step, progress])

  useEffect(() => {
    if (!balloon) return
    const t = setTimeout(() => setBalloon(false), 4500)
    return () => clearTimeout(t)
  }, [balloon])

  const next = () => {
    if (step === 4) {
      setBalloon(true)
      setStep(0)
      setAgree(false)
      return
    }
    setStep((s) => (s + 1) as Step)
  }
  const back = () => setStep((s) => (s > 0 ? ((s - 1) as Step) : s))
  const canNext = step === 1 ? agree : step === 2 ? picked.length > 0 : step !== 3

  const sideLayout = step === 0 || step === 4

  return (
    <div className="relative h-full w-full overflow-hidden">
      <ShadowScope css={[xpCss, EXTRA_CSS]} className="h-full w-full">
        <div className="xp-desk">
          <div className="stage">
            <div className="window">
              <div className="title-bar">
                <div className="title-bar-text">UI Catalog セットアップ</div>
                <div className="title-bar-controls">
                  <button aria-label="Minimize" />
                  <button aria-label="Maximize" disabled />
                  <button aria-label="Close" onClick={() => setStep(0)} />
                </div>
              </div>
              <div className="window-body">
                {sideLayout ? (
                  <div className="wiz">
                    <div className="wiz-side">
                      <b>UI Catalog</b>
                      <span>Setup Wizard</span>
                    </div>
                    <div className="wiz-main">
                      {step === 0 ? (
                        <>
                          <h4>セットアップ ウィザードへようこそ</h4>
                          <p>このウィザードは UI Showcase Catalog をコンピュータにインストールします。</p>
                          <p>続行する前に、ほかのすべてのアプリケーションを終了することをお勧めします。</p>
                          <p>続行するには [次へ] をクリックしてください。</p>
                        </>
                      ) : (
                        <>
                          <h4>セットアップの完了</h4>
                          <p>{picked.join(', ')} がインストールされました。</p>
                          <div className="field-row">
                            <input type="checkbox" id="xp-launch" defaultChecked />
                            <label htmlFor="xp-launch">UI Catalog を今すぐ起動する</label>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="wiz-head">
                      <b>{['', '使用許諾契約', 'コンポーネントの選択', 'インストールしています'][step]}</b>
                      <span>
                        {['', '以下の契約をお読みください。', 'インストールする機能を選んでください。', 'しばらくお待ちください...'][step]}
                      </span>
                    </div>
                    <div style={{ height: 160, paddingTop: 10, boxSizing: 'border-box' }}>
                      {step === 1 && (
                        <>
                          <textarea
                            className="license"
                            readOnly
                            value={
                              'UI SHOWCASE CATALOG 使用許諾契約書\n\n1. 本ソフトウェアは UI のアイデア集として自由に参照できます。\n2. 各ライブラリはそれぞれのライセンスに従います。\n3. 楽しんで作ってください。'
                            }
                          />
                          <div className="field-row">
                            <input type="radio" id="xp-agree" name="xp-lic" checked={agree} onChange={() => setAgree(true)} />
                            <label htmlFor="xp-agree">同意する</label>
                          </div>
                          <div className="field-row">
                            <input type="radio" id="xp-disagree" name="xp-lic" checked={!agree} onChange={() => setAgree(false)} />
                            <label htmlFor="xp-disagree">同意しない</label>
                          </div>
                        </>
                      )}
                      {step === 2 && (
                        <fieldset>
                          <legend>コンポーネント</legend>
                          {COMPONENTS.map((c) => (
                            <div className="field-row" key={c}>
                              <input
                                type="checkbox"
                                id={`xp-${c}`}
                                checked={picked.includes(c)}
                                onChange={() =>
                                  setPicked((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]))
                                }
                              />
                              <label htmlFor={`xp-${c}`}>{c}</label>
                            </div>
                          ))}
                          <p style={{ margin: '6px 0 0', color: '#555' }}>必要な領域: {picked.length * 2.4} MB</p>
                        </fieldset>
                      )}
                      {step === 3 && (
                        <div style={{ paddingTop: 20 }}>
                          <p style={{ margin: '0 0 6px' }}>
                            ファイルをコピーしています: {FILES[Math.min(FILES.length - 1, Math.floor(progress / (100 / FILES.length)))]}
                          </p>
                          <progress max={100} value={progress} />
                          <p style={{ margin: '6px 0 0', color: '#555' }}>{progress}% 完了</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
                <div className="footer">
                  <button onClick={back} disabled={step === 0 || step >= 3}>
                    &lt; 戻る(B)
                  </button>
                  <button onClick={next} disabled={!canNext}>
                    {step === 4 ? '完了' : '次へ(N) >'}
                  </button>
                  <button onClick={() => setStep(0)} disabled={step === 4}>
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {balloon && (
              <motion.div
                className="balloon"
                initial={{ opacity: 0, y: 12, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ type: 'spring', stiffness: 380, damping: 24 }}
                onClick={() => setBalloon(false)}
              >
                <b>ℹ️ インストール完了</b>
                新しいソフトウェアがインストールされ、使用する準備ができました。
              </motion.div>
            )}
          </AnimatePresence>

          <div className="taskbar">
            <div className="start">
              <span className="orb" /> start
            </div>
            <div className="task">🗔 UI Catalog セットアップ</div>
            <div className="tray">
              <span>🔈</span>
              <span>{time.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>
      </ShadowScope>
    </div>
  )
}
