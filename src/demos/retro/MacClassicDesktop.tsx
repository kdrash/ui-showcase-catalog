import systemCss from '@sakun/system.css/dist/system.css?inline'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ShadowScope } from '../../catalog/helpers'

/**
 * クラシック Mac(System 6/7)風デスクトップ。
 * - 見た目は system.css(.window / .title-bar / .window-pane / .standard-dialog / .btn / ul[role=menu-bar])
 * - system.css は input や select をグローバルに書き換えるので ShadowScope(Shadow DOM)に閉じ込める
 * - ウィンドウはタイトルバーを Pointer Events でドラッグ、クリックで最前面化
 * - メニューは system.css の :focus-within で開く(li に tabIndex)
 */

type WinId = 'disk' | 'note' | 'panel'
interface Win {
  open: boolean
  x: number
  y: number
  z: number
}

const EXTRA_CSS = `
:host { font-family: Chicago_12, Chicago, monospace; }
* { box-sizing: border-box; }
.desk { position: relative; width: 100%; height: 100%; overflow: hidden; user-select: none; color: #000;
  background-color: #fff;
  background-image: linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%),
    linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%);
  background-size: 4px 4px; background-position: 0 0, 2px 2px; }
.desk > .menubar { position: absolute; inset: 0 0 auto 0; z-index: 900; display: flex; align-items: center;
  background: #fff; border-bottom: 2px solid #000; border-radius: 8px 8px 0 0; }
.menubar ul[role=menu-bar] { flex: 1; }
.menubar ul[role=menu-bar] > [role=menu-item] { padding: 3px 10px; font-size: 15px; }
.menubar ul[role=menu] { font-size: 15px; min-width: 210px; }
.menubar ul[role=menu] > [role=menu-item] > button { padding: 3px 16px; }
.menubar ul[role=menu] > [role=menu-item].disabled > button { color: #9a9a9a; pointer-events: none; }
.clock { padding: 0 12px; font-size: 15px; }
.logo { display: inline-block; width: 16px; height: 16px; vertical-align: -2px; }
.window { position: absolute; margin: 0 !important; min-width: 0 !important; display: flex; box-shadow: 2px 2px 0 #000; }
.window .title-bar { cursor: grab; touch-action: none; }
.window .title-bar .title { font-size: 15px; }
.window .title-bar button { height: 34px; width: 34px; margin: 0 -4px; }
.window-pane { font-size: 15px !important; padding: 10px 14px !important; }
.details-bar { font-size: 13px !important; padding: 2px 8px !important; }
.icons { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px 6px; padding: 4px; }
.icon { display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: 13px; cursor: default; }
.icon .lbl { padding: 0 3px; }
.icon.sel .lbl { background: #000; color: #fff; }
.icon.sel svg { filter: invert(1); }
.dicons { position: absolute; right: 12px; top: 40px; display: flex; flex-direction: column; gap: 16px; z-index: 1; }
.dicons .icon .lbl { background: #fff; }
.dicons .icon.sel .lbl { background: #000; }
textarea { width: 100%; height: 100%; border: none; resize: none; font-family: Monaco, monospace; font-size: 13px; outline: none; padding: 0; background: #fff; color: #000; }
.field-row { font-size: 14px !important; }
.field-row label { font-size: 14px; }
input[type=checkbox], input[type=radio] { position: absolute !important; }
select { font-size: 14px !important; width: 9rem !important; }
.btn, .btn-default { font-size: 15px !important; }
.dialog-wrap { position: absolute; inset: 0; z-index: 950; display: grid; place-items: center; background: rgba(255,255,255,.0); }
.standard-dialog { width: 330px; font-size: 14px; }
.standard-dialog .row { display: flex; gap: 12px; align-items: flex-start; }
.standard-dialog .btns { display: flex; justify-content: flex-end; gap: 12px; margin-top: 14px; }
.heading { font-size: 15px; margin: 0 0 6px; }
.meter { height: 14px; border: 1.5px solid #000; margin-top: 8px; position: relative; }
.meter > i { position: absolute; inset: 0 auto 0 0; background: repeating-linear-gradient(45deg,#000 0 2px,#fff 2px 4px); }
`

/* ---------- 1bit ピクセルアイコン(文字列で定義) ---------- */
function Pix({ rows, size = 32 }: { rows: string[]; size?: number }) {
  const w = rows[0].length
  return (
    <svg width={size} height={size} viewBox={`0 0 ${w} ${rows.length}`} shapeRendering="crispEdges">
      {rows.flatMap((r, y) =>
        [...r].map((c, x) =>
          c === '.' ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={c === '#' ? '#000' : '#fff'} />,
        ),
      )}
    </svg>
  )
}
const DISK = [
  '................',
  '.##############.',
  '.#oooooooooooo#.',
  '.#oooooooooooo#.',
  '.#o##########o#.',
  '.#oooooooooooo#.',
  '.##############.',
  '.#oooooooooooo#.',
  '.#oo##oooooooo#.',
  '.#oooooooooooo#.',
  '.##############.',
  '................',
]
const TRASH = [
  '.....####.....',
  '.############.',
  '.#oooooooooo#.',
  '.############.',
  '..#oooooooo#..',
  '..#o#o##o#o#..',
  '..#o#o##o#o#..',
  '..#o#o##o#o#..',
  '..#o#o##o#o#..',
  '..#o#o##o#o#..',
  '..#oooooooo#..',
  '...########...',
]
const FOLDER = [
  '..............',
  '.#####........',
  '#ooooo#######.',
  '#oooooooooooo#',
  '##############',
  '#oooooooooooo#',
  '#oooooooooooo#',
  '#oooooooooooo#',
  '#oooooooooooo#',
  '##############',
]
const DOC = [
  '.########...',
  '.#oooooo##..',
  '.#oooooo#o#.',
  '.#oooooo####',
  '.#o#####ooo#',
  '.#oooooooo#.',
  '.#o######o#.',
  '.#oooooooo#.',
  '.#o#####oo#.',
  '.#oooooooo#.',
  '.##########.',
]
const APP = [
  '....####....',
  '..##oooo##..',
  '.#oooooooo#.',
  '.#oo#oo#oo#.',
  '#oooooooooo#',
  '#oo#oooo#oo#',
  '#ooo####ooo#',
  '.#oooooooo#.',
  '.#oooooooo#.',
  '..##oooo##..',
  '....####....',
]
const LOGO = ['..##..', '.####.', '######', '##..##', '######', '.#..#.']

export function MacClassicDesktop() {
  const deskRef = useRef<HTMLDivElement>(null)
  const zTop = useRef(10)
  const [wins, setWins] = useState<Record<WinId, Win>>({
    disk: { open: true, x: 28, y: 52, z: 3 },
    note: { open: true, x: 330, y: 120, z: 4 },
    panel: { open: false, x: 120, y: 90, z: 2 },
  })
  const [dialog, setDialog] = useState<null | 'about' | 'shutdown' | 'trash'>(null)
  const [sel, setSel] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())
  const [note, setNote] = useState('ここはメモ帳です。\n\nタイトルバーをドラッグして\nウィンドウを動かせます。\n\n— Monaco 9pt で書いています')
  const [opts, setOpts] = useState({ sound: true, blink: false, speed: 'Slow' })

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10_000)
    return () => clearInterval(t)
  }, [])

  const front = (id: WinId) => setWins((w) => ({ ...w, [id]: { ...w[id], z: ++zTop.current } }))
  const openWin = (id: WinId) => setWins((w) => ({ ...w, [id]: { ...w[id], open: true, z: ++zTop.current } }))
  const closeWin = (id: WinId) => setWins((w) => ({ ...w, [id]: { ...w[id], open: false } }))

  const startDrag = (id: WinId, e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    front(id)
    const desk = deskRef.current!.getBoundingClientRect()
    const sx = e.clientX
    const sy = e.clientY
    const { x: ox, y: oy } = wins[id]
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)
    const move = (ev: PointerEvent) => {
      const nx = Math.min(Math.max(ox + ev.clientX - sx, -150), desk.width - 80)
      const ny = Math.min(Math.max(oy + ev.clientY - sy, 28), desk.height - 30)
      setWins((w) => ({ ...w, [id]: { ...w[id], x: nx, y: ny } }))
    }
    const up = () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
  }

  const menuAction = (fn: () => void) => () => {
    fn()
    // メニューは :focus-within で開いているので、フォーカスを外して閉じる
    const root = deskRef.current?.getRootNode() as ShadowRoot | Document | undefined
    ;(root?.activeElement as HTMLElement | null)?.blur()
  }

  const frame = (id: WinId, title: string, w: number, h: number, body: ReactNode, footer?: ReactNode) => {
    const s = wins[id]
    if (!s.open) return null
    const active = Math.max(...Object.values(wins).filter((v) => v.open).map((v) => v.z)) === s.z
    return (
      <div className="window" style={{ left: s.x, top: s.y, width: w, height: h, zIndex: s.z }} onPointerDown={() => front(id)}>
        <div className={active ? 'title-bar' : 'inactive-title-bar'} onPointerDown={(e) => startDrag(id, e)}>
          <button aria-label="Close" className="close" style={{ visibility: active ? 'visible' : 'hidden' }} onClick={() => closeWin(id)} />
          <h1 className="title">{title}</h1>
          <button aria-label="Resize" className="resize" style={{ visibility: active ? 'visible' : 'hidden' }} />
        </div>
        {footer}
        <div className="separator" />
        <div className="window-pane" style={{ flex: 1 }}>
          {body}
        </div>
      </div>
    )
  }

  const icon = (key: string, rows: string[], label: string, onOpen?: () => void) => (
    <div
      key={key}
      className={`icon ${sel === key ? 'sel' : ''}`}
      onPointerDown={(e) => {
        e.stopPropagation()
        setSel(key)
      }}
      onDoubleClick={onOpen}
    >
      <Pix rows={rows} />
      <span className="lbl">{label}</span>
    </div>
  )

  const hh = now.getHours()
  const time = `${hh % 12 || 12}:${String(now.getMinutes()).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`

  return (
    <div className="relative h-full w-full overflow-hidden bg-black p-0">
      <ShadowScope css={[systemCss, EXTRA_CSS]} className="h-full w-full">
        <div className="desk" ref={deskRef} onPointerDown={() => setSel(null)}>
          <div className="menubar">
            <ul role="menu-bar">
              <li role="menu-item" tabIndex={0} aria-haspopup="true">
                <span className="logo">
                  <Pix rows={LOGO} size={16} />
                </span>
                <ul role="menu">
                  <li role="menu-item">
                    <button onClick={menuAction(() => setDialog('about'))}>このコンピュータについて…</button>
                  </li>
                  <li role="menu-item" className="divider" />
                  <li role="menu-item">
                    <button onClick={menuAction(() => openWin('panel'))}>コントロールパネル</button>
                  </li>
                </ul>
              </li>
              <li role="menu-item" tabIndex={0} aria-haspopup="true">
                File
                <ul role="menu">
                  <li role="menu-item">
                    <button onClick={menuAction(() => openWin('disk'))}>Open Disk ⌘O</button>
                  </li>
                  <li role="menu-item">
                    <button onClick={menuAction(() => openWin('note'))}>New Note ⌘N</button>
                  </li>
                  <li role="menu-item" className="divider" />
                  <li role="menu-item" className="disabled">
                    <button>Print… ⌘P</button>
                  </li>
                </ul>
              </li>
              <li role="menu-item" tabIndex={0} aria-haspopup="true">
                Edit
                <ul role="menu">
                  <li role="menu-item" className="disabled">
                    <button>Undo ⌘Z</button>
                  </li>
                  <li role="menu-item" className="divider" />
                  <li role="menu-item">
                    <button onClick={menuAction(() => setNote(''))}>Clear Note</button>
                  </li>
                </ul>
              </li>
              <li role="menu-item" tabIndex={0} aria-haspopup="true">
                Special
                <ul role="menu">
                  <li role="menu-item">
                    <button onClick={menuAction(() => setDialog('trash'))}>Empty Trash…</button>
                  </li>
                  <li role="menu-item" className="divider" />
                  <li role="menu-item">
                    <button onClick={menuAction(() => setDialog('shutdown'))}>Shut Down</button>
                  </li>
                </ul>
              </li>
            </ul>
            <span className="clock">{time}</span>
          </div>

          <div className="dicons">
            {icon('hd', DISK, 'System HD', () => openWin('disk'))}
            {icon('trash', TRASH, 'Trash', () => setDialog('trash'))}
          </div>

          {frame(
            'disk',
            'System HD',
            290,
            236,
            <div className="icons">
              {icon('f1', FOLDER, 'System')}
              {icon('f2', FOLDER, 'Apps')}
              {icon('f3', APP, 'Paint')}
              {icon('n1', DOC, 'Note', () => openWin('note'))}
              {icon('f4', FOLDER, 'Games')}
              {icon('n2', DOC, 'ReadMe')}
              {icon('a2', APP, 'Calc')}
              {icon('f5', FOLDER, 'Utils')}
            </div>,
            <div className="details-bar">
              <span>8 items</span>
              <span>3.2 MB in disk</span>
              <span>1.4 MB free</span>
            </div>,
          )}

          {frame(
            'note',
            'Note Pad',
            250,
            200,
            <textarea value={note} onChange={(e) => setNote(e.target.value)} spellCheck={false} />,
          )}

          {frame(
            'panel',
            'Control Panel',
            300,
            214,
            <div>
              <div className="field-row">
                <input id="mc-sound" type="checkbox" checked={opts.sound} onChange={(e) => setOpts({ ...opts, sound: e.target.checked })} />
                <label htmlFor="mc-sound">システム警告音</label>
              </div>
              <div className="field-row">
                <input id="mc-blink" type="checkbox" checked={opts.blink} onChange={(e) => setOpts({ ...opts, blink: e.target.checked })} />
                <label htmlFor="mc-blink">メニューを点滅</label>
              </div>
              <div className="field-row" style={{ marginTop: 10 }}>
                {['Slow', 'Fast'].map((v) => (
                  <span key={v}>
                    <input id={`mc-sp-${v}`} type="radio" name="mc-speed" checked={opts.speed === v} onChange={() => setOpts({ ...opts, speed: v })} />
                    <label htmlFor={`mc-sp-${v}`}>{v}</label>
                  </span>
                ))}
              </div>
              <div className="field-row" style={{ marginTop: 10 }}>
                <label>Desktop:</label>
                <select defaultValue="gray">
                  <option value="gray">50% Gray</option>
                  <option value="dots">Dots</option>
                </select>
              </div>
            </div>,
          )}

          {dialog && (
            <div className="dialog-wrap" onPointerDown={(e) => e.stopPropagation()}>
              <div className="standard-dialog">
                {dialog === 'about' && (
                  <>
                    <h1 className="heading">このコンピュータについて</h1>
                    <div className="row">
                      <Pix rows={APP} />
                      <div>
                        System Software 6.0.8
                        <br />
                        Total Memory: 4,096K
                        <div className="meter">
                          <i style={{ width: '62%' }} />
                        </div>
                      </div>
                    </div>
                    <div className="btns">
                      <button className="btn-default" onClick={() => setDialog(null)}>
                        OK
                      </button>
                    </div>
                  </>
                )}
                {dialog === 'trash' && (
                  <>
                    <div className="row">
                      <Pix rows={TRASH} />
                      <div>ゴミ箱には 3 項目(12K)あります。完全に削除しますか?</div>
                    </div>
                    <div className="btns">
                      <button className="btn" onClick={() => setDialog(null)}>
                        Cancel
                      </button>
                      <button className="btn-default" onClick={() => setDialog(null)}>
                        OK
                      </button>
                    </div>
                  </>
                )}
                {dialog === 'shutdown' && (
                  <>
                    <div className="row">
                      <Pix rows={LOGO} />
                      <div>電源を切っても安全です。</div>
                    </div>
                    <div className="btns">
                      <button className="btn-default" onClick={() => setDialog(null)}>
                        Restart
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </ShadowScope>
    </div>
  )
}
