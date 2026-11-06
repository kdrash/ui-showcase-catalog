import css98 from '98.css/dist/98.css?inline'
import { useEffect, useState } from 'react'
import { ShadowScope } from '../../catalog/helpers'

/**
 * 98.css のフォーム部品ショーケース(プロパティダイアログ風)。
 * - タブ: menu[role=tablist] > li[role=tab][aria-selected]
 * - チェックボックス/ラジオ/スライダー/セレクト/テキスト入力/fieldset
 * - ツリービュー: ul.tree-view + details/summary
 * - プログレス: .progress-indicator.segmented、テーブル: .sunken-panel > table.interactive
 * - ShadowScope(Shadow DOM)で 98.css をこのデモ内だけに適用
 */

type Tab = 'general' | 'tree' | 'progress'

const FILES = [
  ['three.module.js', '1.2 MB', 'JS File'],
  ['motion.mjs', '312 KB', 'JS File'],
  ['98.css', '26 KB', 'Stylesheet'],
  ['catalog.tsx', '8 KB', 'TSX File'],
  ['readme.txt', '2 KB', 'Text Document'],
]

const EXTRA_CSS = `
.bg { height: 100%; width: 100%; box-sizing: border-box; background: #008080; display: grid; place-items: center; padding: 10px;
  font-family: "Pixelated MS Sans Serif", Arial, sans-serif; font-size: 11px; -webkit-font-smoothing: none; color: #000; }
.window { width: 100%; max-width: 380px; }
.tabs-body { height: 222px; overflow: hidden; }
.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
fieldset { margin: 0 0 8px; }
.footer { display: flex; justify-content: flex-end; gap: 6px; margin-top: 8px; }
.sunken-panel { height: 92px; }
table { width: 100%; }
.muted { color: #404040; }
`

export function Win98Controls() {
  const [tab, setTab] = useState<Tab>('general')
  const [dirty, setDirty] = useState(false)
  const [speed, setSpeed] = useState(6)
  const [progress, setProgress] = useState(0)
  const [row, setRow] = useState(1)

  useEffect(() => {
    if (tab !== 'progress') return
    const t = setInterval(() => setProgress((p) => (p >= 100 ? 0 : p + 4)), 160)
    return () => clearInterval(t)
  }, [tab])

  const change = () => setDirty(true)
  const fileIdx = Math.min(FILES.length - 1, Math.floor((progress / 100) * FILES.length))

  return (
    <div className="relative h-full w-full overflow-hidden">
      <ShadowScope css={[css98, EXTRA_CSS]} className="h-full w-full">
        <div className="bg">
          <div className="window">
            <div className="title-bar">
              <div className="title-bar-text">Display Properties</div>
              <div className="title-bar-controls">
                <button aria-label="Help" />
                <button aria-label="Close" />
              </div>
            </div>
            <div className="window-body">
              <menu role="tablist">
                {(
                  [
                    ['general', 'General'],
                    ['tree', 'Tree View'],
                    ['progress', 'Progress'],
                  ] as const
                ).map(([id, label]) => (
                  <li key={id} role="tab" aria-selected={tab === id}>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        setTab(id)
                      }}
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </menu>
              <div className="window" role="tabpanel">
                <div className="window-body tabs-body">
                  {tab === 'general' && (
                    <>
                      <div className="row2">
                        <fieldset>
                          <legend>Icons</legend>
                          <div className="field-row">
                            <input id="w98c-r1" type="radio" name="w98c-icons" defaultChecked onChange={change} />
                            <label htmlFor="w98c-r1">Large icons</label>
                          </div>
                          <div className="field-row">
                            <input id="w98c-r2" type="radio" name="w98c-icons" onChange={change} />
                            <label htmlFor="w98c-r2">Small icons</label>
                          </div>
                        </fieldset>
                        <fieldset>
                          <legend>Effects</legend>
                          <div className="field-row">
                            <input id="w98c-c1" type="checkbox" defaultChecked onChange={change} />
                            <label htmlFor="w98c-c1">Smooth fonts</label>
                          </div>
                          <div className="field-row">
                            <input id="w98c-c2" type="checkbox" onChange={change} />
                            <label htmlFor="w98c-c2">Drag contents</label>
                          </div>
                          <div className="field-row">
                            <input id="w98c-c3" type="checkbox" disabled />
                            <label htmlFor="w98c-c3">Disabled</label>
                          </div>
                        </fieldset>
                      </div>
                      <div className="field-row" style={{ marginBottom: 8 }}>
                        <label htmlFor="w98c-speed">Speed:</label>
                        <span className="muted">Slow</span>
                        <input
                          id="w98c-speed"
                          type="range"
                          min={1}
                          max={11}
                          value={speed}
                          onChange={(e) => {
                            setSpeed(Number(e.target.value))
                            change()
                          }}
                        />
                        <span className="muted">Fast ({speed})</span>
                      </div>
                      <div className="field-row" style={{ marginBottom: 8 }}>
                        <label htmlFor="w98c-theme">Scheme:</label>
                        <select id="w98c-theme" onChange={change}>
                          <option>Windows Standard</option>
                          <option>Teal Dream</option>
                          <option>High Contrast</option>
                          <option>Rainy Day</option>
                        </select>
                      </div>
                      <div className="field-row">
                        <label htmlFor="w98c-name">Name:</label>
                        <input id="w98c-name" type="text" defaultValue="UI Catalog" onChange={change} />
                      </div>
                    </>
                  )}

                  {tab === 'tree' && (
                    <ul className="tree-view" style={{ height: '100%', boxSizing: 'border-box', overflow: 'auto' }}>
                      <li>📁 Desktop</li>
                      <li>
                        <details open>
                          <summary>💻 My Computer</summary>
                          <ul>
                            <li>💾 3½ Floppy (A:)</li>
                            <li>
                              <details open>
                                <summary>🖴 Local Disk (C:)</summary>
                                <ul>
                                  <li>
                                    <details>
                                      <summary>📁 Program Files</summary>
                                      <ul>
                                        <li>📁 Accessories</li>
                                        <li>📁 UI Catalog</li>
                                      </ul>
                                    </details>
                                  </li>
                                  <li>📁 My Documents</li>
                                  <li>📁 Windows</li>
                                </ul>
                              </details>
                            </li>
                            <li>💿 CD-ROM (D:)</li>
                          </ul>
                        </details>
                      </li>
                      <li>🗑️ Recycle Bin</li>
                    </ul>
                  )}

                  {tab === 'progress' && (
                    <>
                      <p style={{ margin: '0 0 4px' }}>
                        Copying <b>{FILES[fileIdx][0]}</b> to C:\UI Catalog\
                      </p>
                      <div className="progress-indicator segmented" style={{ marginBottom: 4 }}>
                        <span className="progress-indicator-bar" style={{ width: `${progress}%` }} />
                      </div>
                      <p className="muted" style={{ margin: '0 0 8px' }}>
                        {Math.max(0, Math.ceil((100 - progress) / 12))} seconds remaining
                      </p>
                      <div className="sunken-panel">
                        <table className="interactive">
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Size</th>
                              <th>Type</th>
                            </tr>
                          </thead>
                          <tbody>
                            {FILES.map(([name, size, type], i) => (
                              <tr key={name} className={row === i ? 'highlighted' : ''} onClick={() => setRow(i)}>
                                <td>{name}</td>
                                <td>{size}</td>
                                <td>{type}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="footer">
                <button className="default" onClick={() => setDirty(false)}>
                  OK
                </button>
                <button onClick={() => setDirty(false)}>Cancel</button>
                <button disabled={!dirty} onClick={() => setDirty(false)}>
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      </ShadowScope>
    </div>
  )
}
