import css98 from '98.css/dist/98.css?inline'
import { AnimatePresence, motion, useDragControls, useMotionValue } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { ShadowScope } from '../../catalog/helpers'

/**
 * Windows 98 風デスクトップ。
 * - 見た目は 98.css(.window / .title-bar / .window-body / .status-bar など)
 * - 98.css は button や input をグローバルに上書きするので ShadowScope(Shadow DOM)に閉じ込める
 * - ウィンドウ移動は Motion の drag + useDragControls(タイトルバーだけをつまめる)+ dragConstraints
 * - スタートメニュー、タスクバー、時計、最小化/最大化/閉じる、アイコンのダブルクリック起動
 */

type WinId = 'welcome' | 'notepad' | 'computer' | 'recycle'

interface WinState {
  open: boolean
  minimized: boolean
  maximized: boolean
  z: number
  x: number
  y: number
}

/* ---------- pixel icons (SVG, crispEdges) ---------- */
const px = { shapeRendering: 'crispEdges' as const }

function ComputerIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" {...px}>
      <rect x="4" y="3" width="24" height="19" fill="#c0c0c0" />
      <rect x="4" y="3" width="24" height="1" fill="#fff" />
      <rect x="4" y="3" width="1" height="19" fill="#fff" />
      <rect x="27" y="3" width="1" height="19" fill="#404040" />
      <rect x="4" y="21" width="24" height="1" fill="#404040" />
      <rect x="7" y="6" width="18" height="13" fill="#000" />
      <rect x="8" y="7" width="16" height="11" fill="#008080" />
      <rect x="9" y="8" width="5" height="1" fill="#7fffff" />
      <rect x="13" y="22" width="6" height="3" fill="#808080" />
      <rect x="6" y="25" width="20" height="4" fill="#c0c0c0" />
      <rect x="6" y="25" width="20" height="1" fill="#fff" />
      <rect x="6" y="28" width="20" height="1" fill="#404040" />
      <rect x="20" y="26" width="4" height="1" fill="#00a000" />
    </svg>
  )
}

function NotepadIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" {...px}>
      <rect x="7" y="4" width="19" height="25" fill="#000" />
      <rect x="8" y="5" width="17" height="23" fill="#fff" />
      <rect x="8" y="5" width="17" height="3" fill="#000080" />
      {[11, 14, 17, 20, 23].map((y) => (
        <rect key={y} x="10" y={y} width={y === 23 ? 8 : 13} height="1" fill="#808080" />
      ))}
      {[10, 14, 18, 22].map((x) => (
        <rect key={x} x={x} y="3" width="2" height="4" fill="#c0c0c0" />
      ))}
    </svg>
  )
}

function RecycleIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" {...px}>
      <rect x="7" y="6" width="18" height="3" fill="#808080" />
      <rect x="7" y="6" width="18" height="1" fill="#dfdfdf" />
      <path d="M9 10h14l-2 18H11z" fill="#c0c0c0" />
      <path d="M9 10h14l-.2 2H9.2z" fill="#808080" />
      {[12, 15, 18].map((x) => (
        <rect key={x} x={x} y="13" width="1" height="13" fill="#808080" />
      ))}
      <rect x="11" y="27" width="10" height="1" fill="#404040" />
    </svg>
  )
}

function FolderIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" {...px}>
      <path d="M3 8h9l2 2h15v17H3z" fill="#808000" />
      <path d="M4 9h7l2 2h15v15H4z" fill="#ffff80" />
      <path d="M4 13h24v13H4z" fill="#e0c050" />
    </svg>
  )
}

function DriveIcon({ label }: { label: string }) {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" {...px}>
      <rect x="3" y="11" width="26" height="12" fill="#c0c0c0" />
      <rect x="3" y="11" width="26" height="1" fill="#fff" />
      <rect x="3" y="22" width="26" height="1" fill="#404040" />
      <rect x="6" y="16" width={label === 'A' ? 10 : 14} height="2" fill="#404040" />
      <rect x="23" y="18" width="3" height="2" fill="#00c000" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" {...px}>
      <circle cx="16" cy="16" r="13" fill="#000" />
      <circle cx="16" cy="16" r="12" fill="#fff" />
      <rect x="14" y="8" width="4" height="4" fill="#0000ff" />
      <rect x="14" y="14" width="4" height="10" fill="#0000ff" />
      <rect x="12" y="14" width="2" height="2" fill="#0000ff" />
      <rect x="12" y="22" width="8" height="2" fill="#0000ff" />
    </svg>
  )
}

function FlagLogo() {
  return (
    <svg width="16" height="14" viewBox="0 0 16 14" {...px}>
      <rect x="1" y="1" width="6" height="5" fill="#ff0000" />
      <rect x="8" y="1" width="6" height="5" fill="#00a000" />
      <rect x="1" y="7" width="6" height="5" fill="#0000ff" />
      <rect x="8" y="7" width="6" height="5" fill="#ffd000" />
    </svg>
  )
}

const ICONS: Record<WinId, (p: { size?: number }) => ReactNode> = {
  welcome: () => <InfoIcon />,
  notepad: NotepadIcon,
  computer: ComputerIcon,
  recycle: RecycleIcon,
}

const TITLES: Record<WinId, string> = {
  welcome: 'Welcome',
  notepad: 'Untitled - Notepad',
  computer: 'My Computer',
  recycle: 'Recycle Bin',
}

/* ---------- draggable window ---------- */
function Win98Window({
  id,
  state,
  active,
  width,
  height,
  constraints,
  onFocus,
  onClose,
  onMinimize,
  onMaximize,
  onMove,
  status,
  children,
}: {
  id: WinId
  state: WinState
  active: boolean
  width: number
  height?: number
  constraints: RefObject<HTMLDivElement | null>
  onFocus: () => void
  onClose: () => void
  onMinimize: () => void
  onMaximize: () => void
  onMove: (x: number, y: number) => void
  status?: ReactNode
  children: ReactNode
}) {
  const controls = useDragControls()
  const x = useMotionValue(state.x)
  const y = useMotionValue(state.y)

  useEffect(() => {
    if (state.maximized) {
      x.set(0)
      y.set(0)
    } else {
      x.set(state.x)
      y.set(state.y)
    }
  }, [state.maximized, state.x, state.y, x, y])

  const Icon = ICONS[id]
  return (
    <motion.div
      className="window"
      drag={!state.maximized}
      dragControls={controls}
      dragListener={false}
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={constraints}
      onDragEnd={() => onMove(x.get(), y.get())}
      onPointerDown={onFocus}
      initial={{ scale: 0.92, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.92, opacity: 0 }}
      transition={{ duration: 0.12 }}
      style={{
        x,
        y,
        position: 'absolute',
        left: 0,
        top: 0,
        zIndex: state.z,
        width: state.maximized ? '100%' : width,
        height: state.maximized ? '100%' : height,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}
    >
      <div
        className={`title-bar${active ? '' : ' inactive'}`}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) return
          controls.start(e)
        }}
        onDoubleClick={onMaximize}
        style={{ touchAction: 'none' }}
      >
        <div className="title-bar-text" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ display: 'inline-flex', width: 16, height: 16, overflow: 'hidden' }}>
            <Icon size={16} />
          </span>
          {TITLES[id]}
        </div>
        <div className="title-bar-controls">
          <button aria-label="Minimize" onClick={onMinimize} />
          <button aria-label={state.maximized ? 'Restore' : 'Maximize'} onClick={onMaximize} />
          <button aria-label="Close" onClick={onClose} />
        </div>
      </div>
      <div className="window-body" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
      {status}
    </motion.div>
  )
}

/* ---------- main ---------- */
const INITIAL: Record<WinId, WinState> = {
  welcome: { open: true, minimized: false, maximized: false, z: 4, x: 190, y: 70 },
  notepad: { open: true, minimized: false, maximized: false, z: 2, x: 96, y: 18 },
  computer: { open: false, minimized: false, maximized: false, z: 1, x: 300, y: 40 },
  recycle: { open: false, minimized: false, maximized: false, z: 1, x: 240, y: 120 },
}

const EXTRA_CSS = `
.desk { position: relative; isolation: isolate; height: 100%; width: 100%; overflow: hidden; background: #008080; color: #000;
  font-family: "Pixelated MS Sans Serif", Arial, sans-serif; font-size: 11px; -webkit-font-smoothing: none; user-select: none; }
.area { position: absolute; left: 0; top: 0; right: 0; bottom: 28px; }
.icons { position: absolute; left: 6px; top: 8px; display: flex; flex-direction: column; gap: 10px; }
.icon { width: 72px; display: flex; flex-direction: column; align-items: center; gap: 3px; color: #fff; text-align: center; cursor: default; }
.icon span { padding: 0 2px; line-height: 13px; }
.icon.sel span { background: #000080; outline: 1px dotted #fff; }
.icon.sel svg { filter: brightness(0.55) sepia(1) hue-rotate(185deg) saturate(5); }
.taskbar { position: absolute; left: 0; right: 0; bottom: 0; height: 28px; background: #c0c0c0; box-shadow: inset 0 1px #dfdfdf, inset 0 2px #fff;
  display: flex; align-items: center; gap: 3px; padding: 2px 2px 0; box-sizing: border-box; z-index: 1000; }
.taskbar button { min-width: 0; min-height: 0; height: 22px; padding: 0 5px; display: flex; align-items: center; gap: 4px; }
.start { font-weight: bold; }
.task { width: 132px; justify-content: flex-start; overflow: hidden; white-space: nowrap; }
.task > span:last-child { overflow: hidden; text-overflow: ellipsis; }
.pressed { box-shadow: inset -1px -1px #fff, inset 1px 1px #0a0a0a, inset -2px -2px #dfdfdf, inset 2px 2px #808080 !important;
  background: repeating-conic-gradient(#c0c0c0 0 25%, #fff 0 50%) 0 0 / 2px 2px !important; font-weight: bold; }
.tray { margin-left: auto; height: 22px; padding: 0 8px; display: flex; align-items: center; gap: 6px;
  box-shadow: inset -1px -1px #fff, inset 1px 1px #808080; }
.sep { width: 2px; height: 20px; box-shadow: inset 1px 0 #808080, inset -1px 0 #fff; margin: 0 2px; }
.startmenu { position: absolute; left: 2px; bottom: 26px; width: 190px; display: flex; background: #c0c0c0; z-index: 1001;
  box-shadow: inset -1px -1px #0a0a0a, inset 1px 1px #dfdfdf, inset -2px -2px #808080, inset 2px 2px #fff; padding: 3px; }
.banner { width: 22px; background: linear-gradient(0deg, #000080, #1084d0); color: #c0c0c0; font-weight: bold; font-size: 15px;
  writing-mode: vertical-rl; transform: rotate(180deg); padding: 6px 0; letter-spacing: 1px; }
.banner b { color: #fff; }
.menu { flex: 1; display: flex; flex-direction: column; }
.mi { display: flex; align-items: center; gap: 8px; height: 30px; padding: 0 6px; position: relative; }
.mi:hover { background: #000080; color: #fff; }
.mi .arrow { margin-left: auto; font-size: 8px; }
.mi .sub { display: none; position: absolute; left: 100%; top: 0; width: 150px; background: #c0c0c0; color: #000; padding: 3px;
  box-shadow: inset -1px -1px #0a0a0a, inset 1px 1px #dfdfdf, inset -2px -2px #808080, inset 2px 2px #fff; }
.mi:hover .sub { display: block; }
.sub .mi { height: 24px; }
.hr { height: 2px; margin: 3px 2px; box-shadow: inset 0 1px #808080, inset 0 -1px #fff; }
.menubar { display: flex; gap: 10px; padding: 0 2px 4px; }
.menubar u { text-decoration: underline; }
.drives { display: flex; gap: 14px; padding: 8px; background: #fff; flex: 1;
  box-shadow: inset -1px -1px #fff, inset 1px 1px grey, inset -2px -2px #dfdfdf, inset 2px 2px #0a0a0a; align-content: flex-start; flex-wrap: wrap; }
.drive { width: 64px; display: flex; flex-direction: column; align-items: center; gap: 2px; text-align: center; }
.shutdown { position: absolute; inset: 0; background: #000; display: grid; place-items: center; z-index: 2000; color: #ff8c00;
  font-family: "Pixelated MS Sans Serif", Arial, sans-serif; font-size: 16px; text-align: center; cursor: pointer; }
.shutdown small { display: block; margin-top: 12px; color: #888; font-size: 11px; }
`

export function Win98Desktop() {
  const { t } = useTranslation('demoControls', { keyPrefix: 'win98' })
  const areaRef = useRef<HTMLDivElement>(null)
  const zTop = useRef(10)
  const [wins, setWins] = useState<Record<WinId, WinState>>(INITIAL)
  const [active, setActive] = useState<WinId | null>('welcome')
  const [selected, setSelected] = useState<string | null>(null)
  const [startOpen, setStartOpen] = useState(false)
  const [power, setPower] = useState<'on' | 'off' | 'booting'>('on')
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (power !== 'booting') return
    const t = setTimeout(() => {
      setWins(INITIAL)
      setActive('welcome')
      setPower('on')
    }, 1400)
    return () => clearTimeout(t)
  }, [power])

  const patch = (id: WinId, p: Partial<WinState>) => setWins((w) => ({ ...w, [id]: { ...w[id], ...p } }))
  const focus = (id: WinId) => {
    zTop.current += 1
    patch(id, { z: zTop.current, minimized: false })
    setActive(id)
  }
  const open = (id: WinId) => {
    zTop.current += 1
    patch(id, { open: true, minimized: false, z: zTop.current })
    setActive(id)
    setStartOpen(false)
  }
  const close = (id: WinId) => {
    patch(id, { open: false, maximized: false })
    setActive(null)
  }
  const minimize = (id: WinId) => {
    patch(id, { minimized: true })
    setActive(null)
  }

  const openWins = (Object.keys(wins) as WinId[]).filter((id) => wins[id].open)
  const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  const winProps = (id: WinId) => ({
    id,
    state: wins[id],
    active: active === id,
    constraints: areaRef,
    onFocus: () => active !== id && focus(id),
    onClose: () => close(id),
    onMinimize: () => minimize(id),
    onMaximize: () => patch(id, { maximized: !wins[id].maximized }),
    onMove: (x: number, y: number) => patch(id, { x, y }),
  })

  const statusBar = (text: string, right?: string) => (
    <div className="status-bar">
      <p className="status-bar-field">{text}</p>
      {right && <p className="status-bar-field">{right}</p>}
    </div>
  )

  return (
    <div className="relative h-full w-full overflow-hidden">
      <ShadowScope css={[css98, EXTRA_CSS]} className="h-full w-full">
        <div
          className="desk"
          onPointerDown={(e) => {
            const t = e.target as HTMLElement
            if (!t.closest('.startmenu') && !t.closest('.start')) setStartOpen(false)
            if (!t.closest('.icon')) setSelected(null)
          }}
        >
          <div className="area" ref={areaRef}>
            <div className="icons">
              {(
                [
                  ['computer', 'My Computer', <ComputerIcon key="c" />],
                  ['notepad', 'Notepad', <NotepadIcon key="n" />],
                  ['recycle', 'Recycle Bin', <RecycleIcon key="r" />],
                  ['welcome', 'Welcome', <FolderIcon key="f" />],
                ] as const
              ).map(([id, label, icon]) => (
                <div
                  key={id}
                  className={`icon${selected === id ? ' sel' : ''}`}
                  onPointerDown={() => setSelected(id)}
                  onDoubleClick={() => open(id)}
                >
                  {icon}
                  <span>{label}</span>
                </div>
              ))}
            </div>

            <AnimatePresence>
              {wins.notepad.open && !wins.notepad.minimized && (
                <Win98Window key="notepad" {...winProps('notepad')} width={300} height={210}>
                  <div className="menubar">
                    {['File', 'Edit', 'Search', 'Help'].map((m) => (
                      <span key={m}>
                        <u>{m[0]}</u>
                        {m.slice(1)}
                      </span>
                    ))}
                  </div>
                  <textarea
                    style={{ flex: 1, resize: 'none', width: '100%' }}
                    defaultValue={t('note')}
                  />
                </Win98Window>
              )}
              {wins.computer.open && !wins.computer.minimized && (
                <Win98Window key="computer" {...winProps('computer')} width={270} height={190} status={statusBar('3 object(s)', 'My Computer')}>
                  <div className="drives">
                    {[
                      ['A', '3½ Floppy (A:)'],
                      ['C', '(C:)'],
                      ['D', 'CD-ROM (D:)'],
                    ].map(([d, label]) => (
                      <div key={d} className="drive">
                        <DriveIcon label={d} />
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                </Win98Window>
              )}
              {wins.recycle.open && !wins.recycle.minimized && (
                <Win98Window key="recycle" {...winProps('recycle')} width={240} height={160} status={statusBar('0 object(s)', '0 bytes')}>
                  <div className="drives" style={{ alignItems: 'center', justifyContent: 'center', color: '#808080' }}>
                    (empty)
                  </div>
                </Win98Window>
              )}
              {wins.welcome.open && !wins.welcome.minimized && (
                <Win98Window key="welcome" {...winProps('welcome')} width={290}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '4px 2px 10px' }}>
                    <InfoIcon />
                    <p style={{ margin: 0, lineHeight: 1.5 }}>
                      {t('welcome')}
                      <br />
                      {t('instructions')}
                    </p>
                  </div>
                  <div className="field-row" style={{ justifyContent: 'space-between' }}>
                    <span className="field-row">
                      <input type="checkbox" id="w98-startup" defaultChecked />
                      <label htmlFor="w98-startup">Show at startup</label>
                    </span>
                    <button className="default" onClick={() => close('welcome')}>
                      OK
                    </button>
                  </div>
                </Win98Window>
              )}
            </AnimatePresence>
          </div>

          {startOpen && (
            <div className="startmenu">
              <div className="banner">
                <b>UI Catalog</b> 98
              </div>
              <div className="menu">
                <div className="mi">
                  <FolderIcon size={22} /> Programs <span className="arrow">▶</span>
                  <div className="sub">
                    <div className="mi" onClick={() => open('notepad')}>
                      <NotepadIcon size={16} /> Notepad
                    </div>
                    <div className="mi" onClick={() => open('computer')}>
                      <ComputerIcon size={16} /> My Computer
                    </div>
                  </div>
                </div>
                <div className="mi">
                  <FolderIcon size={22} /> Documents <span className="arrow">▶</span>
                </div>
                <div className="mi" onClick={() => open('welcome')}>
                  <InfoIcon /> Help
                </div>
                <div className="hr" />
                <div
                  className="mi"
                  onClick={() => {
                    setStartOpen(false)
                    setPower('off')
                  }}
                >
                  <ComputerIcon size={22} /> Shut Down...
                </div>
              </div>
            </div>
          )}

          <div className="taskbar">
            <button className={`start${startOpen ? ' pressed' : ''}`} onClick={() => setStartOpen((o) => !o)}>
              <FlagLogo /> Start
            </button>
            <div className="sep" />
            {openWins.map((id) => {
              const Icon = ICONS[id]
              const isActive = active === id && !wins[id].minimized
              return (
                <button
                  key={id}
                  className={`task${isActive ? ' pressed' : ''}`}
                  onClick={() => (isActive ? minimize(id) : focus(id))}
                >
                  <span style={{ display: 'inline-flex', width: 16, height: 16, overflow: 'hidden', flexShrink: 0 }}>
                    <Icon size={16} />
                  </span>
                  <span>{TITLES[id]}</span>
                </button>
              )
            })}
            <div className="tray">
              <span title="Volume">🔊</span>
              {time}
            </div>
          </div>

          {power !== 'on' && (
            <div className="shutdown" onClick={() => power === 'off' && setPower('booting')}>
              {power === 'off' ? (
                <div>
                  It's now safe to turn off
                  <br />
                  your computer.
                  <small>{t('restart')}</small>
                </div>
              ) : (
                <div style={{ color: '#c0c0c0' }}>Starting UI Catalog 98...</div>
              )}
            </div>
          )}
        </div>
      </ShadowScope>
    </div>
  )
}
