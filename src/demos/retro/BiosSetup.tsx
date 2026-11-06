import { useEffect, useRef, useState } from 'react'

/**
 * BIOS セットアップユーティリティ風 TUI。
 * - 青/灰の画面、上部タブ(←→)、項目選択(↑↓)、値の変更(+/- または Enter で選択肢ポップアップ)
 * - 右側に「Item Specific Help」、下部にキー凡例、F10 で保存確認ダイアログ → 再起動(POST画面)
 * - マウスでも全操作可能。キー操作はデモにフォーカスがあるときだけ
 */

type Item = { label: string; opts?: string[]; value?: number; info?: string; help: string }
const TABS = ['Main', 'Advanced', 'Boot', 'Security', 'Exit'] as const

const INIT: Record<(typeof TABS)[number], Item[]> = {
  Main: [
    { label: 'System Time', info: 'time', help: 'Use [ENTER], [TAB] or [SHIFT-TAB] to select a field. Use [+] or [-] to configure system time.' },
    { label: 'System Date', info: 'date', help: 'Use [+] or [-] to configure system date.' },
    { label: 'Legacy Diskette A', opts: ['Disabled', '1.44/1.25 MB 3½"', '720 KB 3½"'], value: 1, help: 'Selects floppy type. Note that 1.25 MB 3½" references a 1024 byte/sector Japanese media format.' },
    { label: 'Primary Master', opts: ['[ST340016A]', 'Auto', 'None'], value: 0, help: 'Press [Enter] to select the type of IDE drive.' },
    { label: 'Installed Memory', info: '524288 KB', help: 'Displays the amount of conventional and extended memory detected during boot.' },
    { label: 'Language', opts: ['English', '日本語'], value: 0, help: 'Select the language of the setup utility.' },
  ],
  Advanced: [
    { label: 'CPU Speed', opts: ['866 MHz', '933 MHz', '1000 MHz'], value: 2, help: 'Select the CPU clock speed. Over-clocking may cause the system to be unstable.' },
    { label: 'Cache Memory', opts: ['Enabled', 'Disabled'], value: 0, help: 'Enables or disables the internal L1/L2 cache.' },
    { label: 'Plug & Play O/S', opts: ['No', 'Yes'], value: 1, help: 'Select Yes if you are using a Plug and Play capable operating system.' },
    { label: 'Onboard Audio', opts: ['Auto', 'Disabled'], value: 0, help: 'Enables or disables the onboard AC97 audio controller.' },
    { label: 'USB Legacy Support', opts: ['Disabled', 'Enabled'], value: 1, help: 'Enables support for USB keyboard and mouse under DOS.' },
  ],
  Boot: [
    { label: '1st Boot Device', opts: ['Floppy', 'CD-ROM', 'Hard Disk', 'Network'], value: 2, help: 'Specifies the boot sequence from the available devices.' },
    { label: '2nd Boot Device', opts: ['Floppy', 'CD-ROM', 'Hard Disk', 'Network'], value: 1, help: 'Specifies the boot sequence from the available devices.' },
    { label: '3rd Boot Device', opts: ['Floppy', 'CD-ROM', 'Hard Disk', 'Network'], value: 0, help: 'Specifies the boot sequence from the available devices.' },
    { label: 'Quick Boot', opts: ['Enabled', 'Disabled'], value: 0, help: 'Allows the system to skip certain tests while booting.' },
    { label: 'Boot Up NumLock', opts: ['On', 'Off'], value: 0, help: 'Selects power-on state for NumLock.' },
  ],
  Security: [
    { label: 'Supervisor Password', info: 'Not Installed', help: 'Supervisor password controls access to the setup utility.' },
    { label: 'User Password', info: 'Not Installed', help: 'User password controls access to the system at boot.' },
    { label: 'Virus Warning', opts: ['Disabled', 'Enabled'], value: 1, help: 'Warns when any program attempts to write to the boot sector.' },
  ],
  Exit: [
    { label: 'Exit Saving Changes', info: 'action', help: 'Exit System Setup and save your changes to CMOS.' },
    { label: 'Exit Discarding Changes', info: 'action', help: 'Exit utility without saving Setup data to CMOS.' },
    { label: 'Load Setup Defaults', info: 'action', help: 'Load default values for all Setup items.' },
  ],
}

type Dlg = null | { kind: 'save' | 'discard' | 'defaults' } | { kind: 'pick'; idx: number; cur: number }

export function BiosSetup() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState(0)
  const [row, setRow] = useState(0)
  const [data, setData] = useState(INIT)
  const [dirty, setDirty] = useState(false)
  const [dlg, setDlg] = useState<Dlg>(null)
  const [boot, setBoot] = useState<null | number>(null)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  // 再起動アニメ(POST の行を順に表示 → セットアップに戻る)
  useEffect(() => {
    if (boot === null) return
    const t = setTimeout(() => (boot >= 7 ? setBoot(null) : setBoot(boot + 1)), boot === 0 ? 500 : 420)
    return () => clearTimeout(t)
  }, [boot])

  const name = TABS[tab]
  const items = data[name]
  const item = items[row]

  const change = (idx: number, delta: number) => {
    const it = data[name][idx]
    if (!it.opts) return
    setData((d) => ({ ...d, [name]: d[name].map((x, i) => (i === idx ? { ...x, value: (x.value! + delta + x.opts!.length) % x.opts!.length } : x)) }))
    setDirty(true)
  }
  const activate = (idx: number) => {
    const it = items[idx]
    if (it.opts) setDlg({ kind: 'pick', idx, cur: it.value! })
    else if (it.info === 'action') setDlg({ kind: idx === 0 ? 'save' : idx === 1 ? 'discard' : 'defaults' })
  }
  const confirm = (yes: boolean) => {
    if (!dlg) return
    if (dlg.kind === 'pick') {
      if (yes) {
        setData((d) => ({ ...d, [name]: d[name].map((x, i) => (i === dlg.idx ? { ...x, value: dlg.cur } : x)) }))
        setDirty(true)
      }
    } else if (yes && dlg.kind === 'defaults') {
      setData(INIT)
      setDirty(false)
    } else if (yes) {
      setDirty(false)
      setBoot(0)
      setTab(0)
      setRow(0)
    }
    setDlg(null)
  }

  const onKey = (e: React.KeyboardEvent) => {
    const k = e.key
    const handled = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape', 'F10', '+', '-', 'F9', 'y', 'n', 'Y', 'N'].includes(k)
    if (!handled || boot !== null) return
    e.preventDefault()
    if (dlg) {
      if (dlg.kind === 'pick') {
        const n = items[dlg.idx].opts!.length
        if (k === 'ArrowUp') setDlg({ ...dlg, cur: (dlg.cur + n - 1) % n })
        if (k === 'ArrowDown') setDlg({ ...dlg, cur: (dlg.cur + 1) % n })
        if (k === 'Enter') confirm(true)
        if (k === 'Escape') confirm(false)
      } else {
        if (k === 'Enter' || k === 'y' || k === 'Y') confirm(true)
        if (k === 'Escape' || k === 'n' || k === 'N') confirm(false)
      }
      return
    }
    if (k === 'ArrowLeft') (setTab((t) => (t + TABS.length - 1) % TABS.length), setRow(0))
    if (k === 'ArrowRight') (setTab((t) => (t + 1) % TABS.length), setRow(0))
    if (k === 'ArrowUp') setRow((r) => (r + items.length - 1) % items.length)
    if (k === 'ArrowDown') setRow((r) => (r + 1) % items.length)
    if (k === '+') change(row, 1)
    if (k === '-') change(row, -1)
    if (k === 'Enter') activate(row)
    if (k === 'F10') setDlg({ kind: 'save' })
    if (k === 'F9') setDlg({ kind: 'defaults' })
    if (k === 'Escape') setDlg({ kind: 'discard' })
  }

  const p = (n: number) => String(n).padStart(2, '0')
  const value = (it: Item) =>
    it.opts ? `[${it.opts[it.value!]}]` : it.info === 'time' ? `[${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}]` : it.info === 'date' ? `[${p(now.getMonth() + 1)}/${p(now.getDate())}/2002]` : it.info === 'action' ? '' : it.info

  const POST = [
    'Retro Modular BIOS v6.00PG',
    'Copyright (C) 1984-2002, Demo Software, Inc.',
    '',
    'Main Processor : 1000MHz (133x7.5)',
    'Memory Testing : 524288K OK',
    'Detecting IDE Primary Master ... ST340016A',
    'Detecting IDE Primary Slave  ... None',
    'Verifying DMI Pool Data ........',
  ]

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      onKeyDown={onKey}
      onPointerDown={() => rootRef.current?.focus()}
      className="relative flex h-full w-full flex-col overflow-hidden bg-[#0000aa] text-[17px] leading-[20px] text-[#aaaaaa] outline-none select-none"
      style={{ fontFamily: 'VT323, "JetBrains Mono", monospace' }}
    >
      {boot !== null ? (
        <div className="h-full bg-black p-3 text-[#aaaaaa]">
          {POST.slice(0, boot + 1).map((l, i) => (
            <div key={i}>{l || ' '}</div>
          ))}
          <div className="mt-2 animate-pulse">_</div>
        </div>
      ) : (
        <>
          <div className="bg-[#00aaaa] text-center text-black">SYSTEM SETUP UTILITY  —  Version 4.51PG</div>
          <div className="flex bg-[#00aaaa] text-black">
            {TABS.map((t, i) => (
              <button
                key={t}
                onClick={() => {
                  setTab(i)
                  setRow(0)
                }}
                className={`px-4 ${i === tab ? 'bg-[#0000aa] text-white' : ''}`}
              >
                {t}
              </button>
            ))}
            {dirty && <span className="ml-auto px-3 text-[#aa0000]">*changed*</span>}
          </div>
          <div className="flex min-h-0 flex-1 border-2 border-double border-[#aaaaaa] bg-[#aaaaaa] text-[#0000aa]">
            <div className="flex-1 overflow-auto border-r-2 border-double border-[#0000aa] px-2 py-1">
              {items.map((it, i) => (
                <div
                  key={it.label}
                  onClick={() => setRow(i)}
                  onDoubleClick={() => activate(i)}
                  className={`flex cursor-default whitespace-nowrap ${i === row ? 'bg-[#0000aa] text-white' : ''}`}
                >
                  <span className="w-[48%] truncate pl-1">{it.info === 'action' ? '' : '  '}{it.label}</span>
                  <span className={`${it.opts ? (i === row ? 'text-[#ffff55]' : 'text-[#000088]') : i === row ? 'text-white' : 'text-[#555555]'}`}>{value(it)}</span>
                  {it.opts && i === row && (
                    <span className="ml-auto flex gap-1 pr-1">
                      <button onClick={() => change(i, -1)} className="px-1 hover:bg-white/20">
                        -
                      </button>
                      <button onClick={() => change(i, 1)} className="px-1 hover:bg-white/20">
                        +
                      </button>
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="w-[34%] min-w-[150px] px-2 py-1">
              <div className="border-b border-[#0000aa] text-center">Item Specific Help</div>
              <p className="mt-1 text-[16px] leading-[18px]">{item.help}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 bg-[#00aaaa] px-2 text-black">
            <span>
              <b className="text-white">F1</b> Help
            </span>
            <span>
              <b className="text-white">↑↓</b> Select Item
            </span>
            <span>
              <b className="text-white">←→</b> Select Menu
            </span>
            <span>
              <b className="text-white">+/-</b> Change Values
            </span>
            <button onClick={() => setDlg({ kind: 'defaults' })}>
              <b className="text-white">F9</b> Setup Defaults
            </button>
            <button onClick={() => setDlg({ kind: 'save' })}>
              <b className="text-white">F10</b> Save and Exit
            </button>
          </div>

          {dlg && (
            <div className="absolute inset-0 grid place-items-center">
              <div className="min-w-[280px] border-2 border-double border-white bg-[#aa0000] px-4 py-2 text-white shadow-[8px_8px_0_rgba(0,0,0,.6)]">
                {dlg.kind === 'pick' ? (
                  <>
                    <div className="mb-1 text-center text-[#ffff55]">{items[dlg.idx].label}</div>
                    {items[dlg.idx].opts!.map((o, i) => (
                      <div
                        key={o}
                        onClick={() => setDlg({ ...dlg, cur: i })}
                        onDoubleClick={() => confirm(true)}
                        className={`cursor-default px-2 ${i === dlg.cur ? 'bg-white text-[#aa0000]' : ''}`}
                      >
                        {o}
                      </div>
                    ))}
                    <div className="mt-1 text-center text-[14px] text-[#ffaaaa]">↑↓:Move  ENTER:Accept  ESC:Abort</div>
                  </>
                ) : (
                  <>
                    <div className="text-center text-[#ffff55]">{dlg.kind === 'save' ? 'Setup Confirmation' : dlg.kind === 'discard' ? 'Exit Without Saving' : 'Load Defaults'}</div>
                    <div className="my-2 text-center">
                      {dlg.kind === 'save' ? 'Save configuration changes and exit now?' : dlg.kind === 'discard' ? 'Quit without saving?' : 'Load default configuration now?'}
                    </div>
                    <div className="flex justify-center gap-6">
                      <button onClick={() => confirm(true)} className="bg-white px-3 text-[#aa0000]">
                        [Yes]
                      </button>
                      <button onClick={() => confirm(false)} className="px-3">
                        [No]
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
